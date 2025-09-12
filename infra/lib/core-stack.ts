import {
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
  CfnOutput,
  SecretValue,
  aws_ec2 as ec2,
  aws_ecr as ecr,
  aws_ecs as ecs,
  aws_ecs_patterns as ecs_patterns,
  aws_logs as logs,
  aws_rds as rds,
  aws_secretsmanager as secrets,
  aws_applicationautoscaling as appscaling,
  aws_elasticache as elasticache,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { resolve } from 'path';

export interface CoreStackProps extends StackProps {
  appName: string;
  envName: 'dev' | 'prod';
  containerPort: number;
  cpu: number;
  memoryMiB: number;
  desiredCount: number;
  minCapacity: number;
  maxCapacity: number;
  enableFargateSpot?: boolean;
  buildFromPath?: string;
  ecrRepositoryName?: string;
  imageTag?: string;
  appConfig?: Record<string, string>;
  appSecrets?: Record<string, string>;
}

export class CoreStack extends Stack {
  constructor(scope: Construct, id: string, props: CoreStackProps) {
    super(scope, id, props);

    const name = `${props.appName}-${props.envName}`;
    const isProd = props.envName === 'prod';

    const vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${name}-vpc`,
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 },
      ],
    });

    const albSg = new ec2.SecurityGroup(this, 'AlbSg', { vpc, allowAllOutbound: true });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    const serviceSg = new ec2.SecurityGroup(this, 'ServiceSg', { vpc, allowAllOutbound: true });

    const dbSg = new ec2.SecurityGroup(this, 'DbSg', { vpc, allowAllOutbound: false });
    dbSg.addIngressRule(serviceSg, ec2.Port.tcp(5432));

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.of('16.3', '16'),
    });

    const pgParams = new rds.ParameterGroup(this, 'PgParams', {
      engine,
      parameters: {
        'rds.force_ssl': '1',
      },
    });

    const instanceType = ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO);

    const db = new rds.DatabaseInstance(this, 'Postgres', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      engine,
      parameterGroup: pgParams,
      instanceType,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageType: rds.StorageType.GP3,
      publiclyAccessible: false,
      multiAz: false,
      iamAuthentication: false,
      backupRetention: Duration.days(isProd ? 7 : 1),
      deletionProtection: isProd,
      removalPolicy: isProd ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY,
      deleteAutomatedBackups: !isProd,
      credentials: rds.Credentials.fromGeneratedSecret('postgres', {
        secretName: `${name}/db-credentials`,
      }),
      databaseName: 'app',
    });

    const secretFields: Record<string, SecretValue> = {};
    Object.entries(props.appSecrets ?? {}).forEach(([k, v]) => {
      if (v !== undefined) secretFields[k] = SecretValue.unsafePlainText(v);
    });

    const appSecrets =
      Object.keys(secretFields).length > 0
        ? new secrets.Secret(this, 'AppSecrets', {
            secretName: `${name}/app-secrets`,
            secretObjectValue: secretFields,
          })
        : undefined;

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `${name}-cluster`,
      containerInsights: true,
    });

    const logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: `/ecs/${props.appName}/${props.envName}`,
      retention: logs.RetentionDays.ONE_MONTH,
    });

    let image: ecs.ContainerImage;
    let repo: ecr.IRepository | undefined;

    if (props.buildFromPath && props.buildFromPath.trim()) {
      const assetPath = resolve(process.cwd(), props.buildFromPath);
      image = ecs.ContainerImage.fromAsset(assetPath, {
        file: 'Dockerfile',
        exclude: [
          'infra',
          'infra/**',
          'cdk.out',
          '**/cdk.out/**',
          '.git',
          '.github',
          'node_modules',
          '**/node_modules/**',
          '*.md',
          'README*',
          'LICENSE*',
        ],
      });
    } else {
      const repoName = props.ecrRepositoryName ?? `${props.appName}-${props.envName}`;
      repo = ecr.Repository.fromRepositoryName(this, 'ImageRepo', repoName);
      image = ecs.ContainerImage.fromEcrRepository(repo, props.imageTag ?? 'latest');
    }

    const redisSg = new ec2.SecurityGroup(this, 'RedisSg', { vpc, allowAllOutbound: true });
    redisSg.addIngressRule(serviceSg, ec2.Port.tcp(6379));

    const redisSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      cacheSubnetGroupName: `${name}-redis-subnets`,
      description: `${name} redis subnets`,
      subnetIds: redisSubnets.subnetIds,
    });

    const redis = new elasticache.CfnReplicationGroup(this, 'Redis', {
      engine: 'redis',
      engineVersion: '7.1',
      cacheNodeType: 'cache.t4g.micro',
      replicationGroupDescription: `${name} redis`,
      numNodeGroups: 1,
      replicasPerNodeGroup: 0,
      automaticFailoverEnabled: false,
      multiAzEnabled: false,
      cacheSubnetGroupName: redisSubnetGroup.cacheSubnetGroupName!,
      securityGroupIds: [redisSg.securityGroupId],
      atRestEncryptionEnabled: false,
      transitEncryptionEnabled: false,
    });
    redis.addDependency(redisSubnetGroup);
    if (!isProd) redis.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const redisHost = redis.attrPrimaryEndPointAddress;
    const redisPort = redis.attrPrimaryEndPointPort || '6379';

    const baseEnv: Record<string, string> = {
      NODE_ENV: props.envName,
      PORT: String(props.containerPort),

      DB_HOST: db.instanceEndpoint.hostname,
      DB_PORT: '5432',
      DB_NAME: 'app',
      DB_USER: 'postgres',

      DB_SSL: 'true',
      DB_SSL_REJECT_UNAUTHORIZED: isProd ? 'true' : 'false',

      REDIS_ENABLED: 'true',
      REDIS_HOST: redisHost,
      REDIS_PORT: redisPort,
    };

    const mergedEnv = { ...baseEnv, ...(props.appConfig ?? {}) };

    const svc = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      serviceName: `${name}-svc`,
      publicLoadBalancer: true,
      assignPublicIp: true,
      listenerPort: 80,
      cpu: props.cpu,
      memoryLimitMiB: props.memoryMiB,
      desiredCount: props.desiredCount,
      enableExecuteCommand: true,
      taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      capacityProviderStrategies: props.enableFargateSpot
        ? [
            { capacityProvider: 'FARGATE_SPOT', weight: 1 },
            { capacityProvider: 'FARGATE', weight: 1 },
          ]
        : undefined,
      securityGroups: [serviceSg],
      taskImageOptions: {
        image,
        containerName: props.appName,
        containerPort: props.containerPort,
        enableLogging: true,
        logDriver: ecs.LogDriver.awsLogs({ logGroup, streamPrefix: props.appName }),
        environment: mergedEnv,
        secrets: {
          DB_PASSWORD: ecs.Secret.fromSecretsManager(db.secret!, 'password'),
          ...(appSecrets
            ? Object.fromEntries(
                Object.keys(props.appSecrets ?? {}).map((k) => [
                  k,
                  ecs.Secret.fromSecretsManager(appSecrets!, k),
                ]),
              )
            : {}),
        },
      },
    });

    svc.loadBalancer.addSecurityGroup(albSg);
    db.connections.allowDefaultPortFrom(svc.service);

    svc.targetGroup.configureHealthCheck({
      path: '/health',
      healthyHttpCodes: '200',
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
      interval: Duration.seconds(20),
      timeout: Duration.seconds(5),
    });

    if (repo) {
      repo.grantPull(svc.taskDefinition.obtainExecutionRole());
      repo.grantPull(svc.taskDefinition.taskRole);
    }

    const scaling = svc.service.autoScaleTaskCount({
      minCapacity: props.minCapacity,
      maxCapacity: props.maxCapacity,
    });

    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: isProd ? 60 : 50,
    });

    if (!isProd) {
      scaling.scaleOnSchedule('NightDown', {
        schedule: appscaling.Schedule.cron({ minute: '0', hour: '20' }),
        minCapacity: 0,
        maxCapacity: Math.max(0, props.minCapacity),
      });
      scaling.scaleOnSchedule('MorningUp', {
        schedule: appscaling.Schedule.cron({ minute: '0', hour: '6' }),
        minCapacity: Math.max(1, props.desiredCount),
        maxCapacity: props.maxCapacity,
      });
    }

    new CfnOutput(this, 'AlbDnsName', { value: svc.loadBalancer.loadBalancerDnsName });
    new CfnOutput(this, 'DbEndpoint', { value: db.instanceEndpoint.socketAddress });
    new CfnOutput(this, 'DbSecretName', { value: db.secret!.secretName });
    new CfnOutput(this, 'RedisEndpoint', { value: `${redisHost}:${redisPort}` });
    if (appSecrets) new CfnOutput(this, 'AppSecretsName', { value: appSecrets.secretName });
  }
}
