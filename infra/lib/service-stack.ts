import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';

export interface ServiceStackProps extends cdk.StackProps {
  envName: string;
  appName: string;
  vpc: ec2.IVpc;
  publicSubnets: ec2.ISubnet[];
  privateSubnets: ec2.ISubnet[];
  repository: ecr.IRepository;
  containerPort: number;
  desiredCount: number;
  cpu: number;
  memoryMiB: number;
  healthPath: string;
  certificateArn?: string;
  imageTag: string;
}

/**
 * ServiceStack provisions an ECS Fargate service backed by an Application
 * Load Balancer. It automatically configures health checks, log groups,
 * autoscaling, and optional HTTPS support via ACM certificates. The image
 * deployed is pulled from the provided ECR repository and tagged with
 * the supplied `imageTag` context parameter.
 */
export class ServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ServiceStackProps) {
    super(scope, id, props);

    // ECS cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: props.vpc,
      containerInsights: true,
      clusterName: `${props.envName}-${props.appName}-cluster`
    });

    // Log group for ECS tasks
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/ecs/${props.envName}/${props.appName}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Define the container image from ECR and tag
    const containerImage = ecs.ContainerImage.fromEcrRepository(props.repository, props.imageTag);

    // Create the Fargate service behind an ALB using the high-level pattern
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
      cluster,
      publicLoadBalancer: true,
      cpu: props.cpu,
      memoryLimitMiB: props.memoryMiB,
      desiredCount: props.desiredCount,
      listenerPort: props.certificateArn ? 443 : 80,
      taskSubnets: { subnets: props.privateSubnets },
      assignPublicIp: false,
      taskImageOptions: {
        containerName: props.appName,
        image: containerImage,
        containerPort: props.containerPort,
        environment: {
          PORT: props.containerPort.toString(),
          NODE_ENV: 'production'
        },
        logDriver: ecs.LogDriver.awsLogs({ logGroup, streamPrefix: 'ecs' })
      }
    });

    // Configure health checks on the target group
    service.targetGroup.configureHealthCheck({
      path: props.healthPath,
      healthyHttpCodes: '200-399'
    });

    // If a certificate ARN is provided, create an HTTPS listener and redirect HTTP
    if (props.certificateArn) {
      const cert = certificatemanager.Certificate.fromCertificateArn(this, 'Cert', props.certificateArn);
      const httpsListener = service.loadBalancer.addListener('Https', {
        port: 443,
        certificates: [cert],
        open: true
      });
      httpsListener.addTargets('Ecs', {
        port: props.containerPort,
        targets: [service.service],
        healthCheck: { path: props.healthPath, healthyHttpCodes: '200-399' }
      });
      // Redirect HTTP 80 to HTTPS 443
      const http = service.listener;
      http.addAction('RedirectHttpToHttps', {
        action: elbv2.ListenerAction.redirect({ protocol: 'HTTPS', port: '443' })
      });
    }

    // Autoscaling based on CPU utilization
    const scalable = service.service.autoScaleTaskCount({
      minCapacity: props.desiredCount,
      maxCapacity: Math.max(6, props.desiredCount)
    });
    scalable.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 55,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60)
    });

    // Outputs for later use (e.g. in GitHub Actions)
    new cdk.CfnOutput(this, 'LoadBalancerDNS', { value: service.loadBalancer.loadBalancerDnsName });
    new cdk.CfnOutput(this, 'ClusterName', { value: cluster.clusterName });
    new cdk.CfnOutput(this, 'ServiceName', { value: service.service.serviceName });
    new cdk.CfnOutput(this, 'TaskFamily', { value: service.taskDefinition.family });
  }
}