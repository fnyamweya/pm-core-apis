import * as cdk from 'aws-cdk-lib';
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
  aws_lambda as lambda,
  aws_iam as iam,
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
  runMigrationsOnDeploy?: boolean;
}

export class CoreStack extends Stack {
  constructor(scope: Construct, id: string, props: CoreStackProps) {
    super(scope, id, props);

    const name = `${props.appName}-${props.envName}`;
    const isProd = props.envName === 'prod';
    const runMigrations = props.runMigrationsOnDeploy ?? true;
    const region = Stack.of(this).region;
    const ensuredDesired = Math.max(1, props.desiredCount ?? 1);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${name}-vpc`,
      natGateways: 0,
      maxAzs: 2,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'isolated', subnetType: ec2.SubnetType.PRIVATE_ISOLATED, cidrMask: 24 }
      ]
    });

    const albSg = new ec2.SecurityGroup(this, 'AlbSg', { vpc, allowAllOutbound: true });
    albSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    const serviceSg = new ec2.SecurityGroup(this, 'ServiceSg', { vpc, allowAllOutbound: true });
    const dbSg = new ec2.SecurityGroup(this, 'DbSg', { vpc, allowAllOutbound: false });
    dbSg.addIngressRule(serviceSg, ec2.Port.tcp(5432));

    const engine = rds.DatabaseInstanceEngine.postgres({
      version: rds.PostgresEngineVersion.of('16.3', '16')
    });
    const instanceType = ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO);

    const db = new rds.DatabaseInstance(this, 'Postgres', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSg],
      engine,
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
        secretName: `${name}/db-credentials`
      }),
      databaseName: 'app'
    });

    const secretFields: Record<string, SecretValue> = {};
    Object.entries(props.appSecrets ?? {}).forEach(([k, v]) => {
      if (v !== undefined) secretFields[k] = SecretValue.unsafePlainText(v);
    });

    const appSecrets =
      Object.keys(secretFields).length > 0
        ? new secrets.Secret(this, 'AppSecrets', {
            secretName: `${name}/app-secrets`,
            secretObjectValue: secretFields
          })
        : undefined;

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: `${name}-cluster`,
      containerInsights: true
    });

    const logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: `/ecs/${props.appName}/${props.envName}`,
      retention: logs.RetentionDays.ONE_MONTH
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
          'LICENSE*'
        ]
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
      subnetIds: redisSubnets.subnetIds
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
      transitEncryptionEnabled: false
    });
    redis.addDependency(redisSubnetGroup);

    const redisHost = redis.attrPrimaryEndPointAddress;
    const redisPort = redis.attrPrimaryEndPointPort || '6379';

    const baseEnv: Record<string, string> = {
      NODE_ENV: props.envName,
      PORT: String(props.containerPort),
      DB_HOST: db.instanceEndpoint.hostname,
      DB_PORT: '5432',
      DB_NAME: 'app',
      DB_USER: 'postgres',
      REDIS_ENABLED: 'true',
      REDIS_HOST: redisHost,
      REDIS_PORT: redisPort,
      AWS_REGION: region
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
      desiredCount: ensuredDesired,
      enableExecuteCommand: true,
      taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      capacityProviderStrategies: props.enableFargateSpot
        ? [
            { capacityProvider: 'FARGATE_SPOT', weight: 1 },
            { capacityProvider: 'FARGATE', weight: 1 }
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
                Object.keys(props.appSecrets ?? {}).map((k) => [k, ecs.Secret.fromSecretsManager(appSecrets!, k)])
              )
            : {})
        }
      }
    });

    svc.targetGroup.configureHealthCheck({
      path: '/api/v1/health',
      healthyHttpCodes: '200',
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
      interval: Duration.seconds(20),
      timeout: Duration.seconds(5)
    });

    svc.loadBalancer.addSecurityGroup(albSg);
    db.connections.allowDefaultPortFrom(svc.service);

    if (repo) {
      repo.grantPull(svc.taskDefinition.obtainExecutionRole());
      repo.grantPull(svc.taskDefinition.taskRole);
    }

    const scaling = svc.service.autoScaleTaskCount({
      minCapacity: 0,
      maxCapacity: props.maxCapacity
    });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: isProd ? 60 : 50
    });
    if (!isProd) {
      scaling.scaleOnSchedule('NightDown', {
        schedule: appscaling.Schedule.cron({ minute: '0', hour: '20' }),
        minCapacity: 0,
        maxCapacity: Math.max(0, props.minCapacity)
      });
      scaling.scaleOnSchedule('MorningUp', {
        schedule: appscaling.Schedule.cron({ minute: '0', hour: '6' }),
        minCapacity: Math.max(1, props.desiredCount),
        maxCapacity: props.maxCapacity
      });
    }

    const migrationTask = new ecs.FargateTaskDefinition(this, 'MigrationTaskDef', {
      cpu: props.cpu,
      memoryLimitMiB: props.memoryMiB
    });

    const migrationLogGroup = new logs.LogGroup(this, 'MigrationLogs', {
      logGroupName: `/ecs/${props.appName}/${props.envName}/migrations`,
      retention: logs.RetentionDays.ONE_WEEK
    });

    migrationTask.addContainer('migrations', {
      image,
      logging: ecs.LogDriver.awsLogs({ logGroup: migrationLogGroup, streamPrefix: 'migrations' }),
      environment: mergedEnv,
      secrets: {
        DB_PASSWORD: ecs.Secret.fromSecretsManager(db.secret!, 'password'),
        ...(appSecrets
          ? Object.fromEntries(
              Object.keys(props.appSecrets ?? {}).map((k) => [k, ecs.Secret.fromSecretsManager(appSecrets!, k)])
            )
          : {})
      },
      command: ['node', 'dist/src/scripts/migrationRunner.js', 'run']
    });

    if (repo) {
      repo.grantPull(migrationTask.obtainExecutionRole());
      repo.grantPull(migrationTask.taskRole);
    }

    const taskExecutionRoleArn = migrationTask.obtainExecutionRole().roleArn;
    const taskRoleArn = migrationTask.taskRole.roleArn;

    const scaleServiceFn = new lambda.Function(this, 'ScaleServiceFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      timeout: Duration.minutes(5),
      code: lambda.Code.fromInline(`
import boto3
ecs = boto3.client('ecs')
aas = boto3.client('application-autoscaling')
def handler(event, context):
    if event.get('RequestType','Create') == 'Delete':
        return {'PhysicalResourceId': 'scale-service'}
    p = event['ResourceProperties']
    ecs.update_service(cluster=p['clusterArn'], service=p['serviceName'], desiredCount=int(p['desiredCount']))
    aas.register_scalable_target(
        ServiceNamespace='ecs',
        ResourceId=f"service/{p['clusterName']}/{p['serviceName']}",
        ScalableDimension='ecs:service:DesiredCount',
        MinCapacity=int(p['minCapacity']),
        MaxCapacity=int(p['maxCapacity']),
        SuspendedState={'DynamicScalingInSuspended': False, 'DynamicScalingOutSuspended': False, 'ScheduledScalingSuspended': False}
    )
    return {'PhysicalResourceId': 'scale-service'}
      `)
    });

    scaleServiceFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['ecs:UpdateService'], resources: ['*'] }));
    scaleServiceFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['application-autoscaling:RegisterScalableTarget'], resources: ['*'] }));

    const runMigrationsFn = new lambda.Function(this, 'RunMigrationsFn', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'index.handler',
      timeout: Duration.minutes(14),
      code: lambda.Code.fromInline(`
import boto3, json, time
ecs = boto3.client('ecs')
def handler(event, context):
    req_type = event.get('RequestType','Create')
    if req_type == 'Delete':
        return {'PhysicalResourceId': event.get('PhysicalResourceId','migrate-once')}
    p = event['ResourceProperties']
    resp = ecs.run_task(
        cluster=p['clusterArn'],
        taskDefinition=p['taskDefinitionArn'],
        count=1,
        launchType='FARGATE',
        networkConfiguration={
            'awsvpcConfiguration':{
                'subnets': p['subnets'],
                'securityGroups': p['securityGroups'],
                'assignPublicIp': p.get('assignPublicIp','ENABLED')
            }
        }
    )
    tasks = resp.get('tasks', [])
    if not tasks or 'taskArn' not in tasks[0]:
        raise Exception('Failed to start migration task: ' + json.dumps(resp, default=str))
    task_arn = tasks[0]['taskArn']
    physical_id = task_arn
    while True:
        d = ecs.describe_tasks(cluster=p['clusterArn'], tasks=[task_arn])
        tlist = d.get('tasks') or []
        if tlist and tlist[0].get('lastStatus') == 'STOPPED':
            containers = tlist[0].get('containers') or []
            exit_code = containers[0].get('exitCode', 0) if containers else 0
            if exit_code != 0:
                raise Exception(f'Migration task failed with exit code {exit_code}')
            break
        time.sleep(10)
    return {'PhysicalResourceId': physical_id}
      `)
    });

    runMigrationsFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['ecs:RunTask', 'ecs:DescribeTasks'], resources: ['*'] }));
    runMigrationsFn.addToRolePolicy(new iam.PolicyStatement({ actions: ['iam:PassRole'], resources: [taskExecutionRoleArn, taskRoleArn] }));

    const runSubnets = vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC });
    const runSecurityGroups = [serviceSg.securityGroupId];

    const scaleToZeroCR = runMigrations
      ? new cdk.CustomResource(this, 'ScaleServiceToZero', {
          serviceToken: scaleServiceFn.functionArn,
          properties: {
            clusterArn: cluster.clusterArn,
            clusterName: cluster.clusterName,
            serviceName: svc.service.serviceName,
            desiredCount: 0,
            minCapacity: 0,
            maxCapacity: props.maxCapacity
          },
          resourceType: 'Custom::ScaleServiceToZero'
        })
      : undefined;

    if (scaleToZeroCR) {
      scaleToZeroCR.node.addDependency(svc.service);
    }

    const runMigrationsCR = runMigrations
      ? new cdk.CustomResource(this, 'RunMigrations', {
          serviceToken: runMigrationsFn.functionArn,
          properties: {
            clusterArn: cluster.clusterArn,
            taskDefinitionArn: migrationTask.taskDefinitionArn,
            subnets: runSubnets.subnetIds,
            securityGroups: runSecurityGroups,
            assignPublicIp: 'ENABLED'
          },
          resourceType: 'Custom::RunDbMigrations'
        })
      : undefined;

    if (runMigrationsCR) {
      runMigrationsCR.node.addDependency(db);
      runMigrationsCR.node.addDependency(redis);
      if (scaleToZeroCR) runMigrationsCR.node.addDependency(scaleToZeroCR);
    }

    const scaleUpCR = runMigrations
      ? new cdk.CustomResource(this, 'ScaleUpAfterMigrations', {
          serviceToken: scaleServiceFn.functionArn,
          properties: {
            clusterArn: cluster.clusterArn,
            clusterName: cluster.clusterName,
            serviceName: svc.service.serviceName,
            desiredCount: props.desiredCount,
            minCapacity: props.minCapacity,
            maxCapacity: props.maxCapacity
          },
          resourceType: 'Custom::ScaleUpService'
        })
      : undefined;

    if (scaleUpCR && runMigrationsCR) {
      scaleUpCR.node.addDependency(runMigrationsCR);
    }

    new CfnOutput(this, 'AlbDnsName', { value: svc.loadBalancer.loadBalancerDnsName });
    new CfnOutput(this, 'DbEndpoint', { value: db.instanceEndpoint.socketAddress });
    new CfnOutput(this, 'DbSecretName', { value: db.secret!.secretName });
    new CfnOutput(this, 'RedisEndpoint', { value: `${redisHost}:${redisPort}` });
    if (appSecrets) new CfnOutput(this, 'AppSecretsName', { value: appSecrets.secretName });
  }
}
