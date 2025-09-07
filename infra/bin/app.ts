import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack';
import { EcrStack } from '../lib/ecr-stack';
import { ServiceStack } from '../lib/service-stack';
import { IamGhOidcStack } from '../lib/iam-gh-oidc-stack';

/**
 * Entry point for the CDK application. Pulls values from context and creates
 * three stacks: network (VPC), ECR repository, and ECS service. Optionally
 * creates an IAM OIDC role for GitHub Actions if `createOidc` context is true.
 */
const app = new cdk.App();

// Read context values. You can override these using `-c key=value` when
// running `cdk synth` or `cdk deploy`. Defaults ensure a usable dev environment.
const envName    = app.node.tryGetContext('env')      ?? 'dev';
const appName    = app.node.tryGetContext('appName')  ?? 'backend';
const region     = app.node.tryGetContext('region')   ?? process.env.CDK_DEFAULT_REGION ?? 'us-east-1';
const createOidc = app.node.tryGetContext('createOidc') === 'true';
const certificateArn = app.node.tryGetContext('certificateArn') ?? '';
const imageTag   = app.node.tryGetContext('imageTag') ?? 'latest';

// Environment (account and region) for all stacks. If you need cross-region
// deployments, you can specify env on each stack individually.
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region
};

// Create network stack (VPC, subnets)
const network = new NetworkStack(app, `${envName}-${appName}-network`, {
  env,
  envName
});

// ECR repository stack
const ecr = new EcrStack(app, `${envName}-${appName}-ecr`, {
  env,
  envName,
  repoName: appName
});

// ECS service stack
new ServiceStack(app, `${envName}-${appName}-svc`, {
  env,
  envName,
  appName,
  vpc: network.vpc,
  publicSubnets: network.publicSubnets,
  privateSubnets: network.privateSubnets,
  repository: ecr.repository,
  containerPort: 3000,
  desiredCount: 2,
  cpu: 512,
  memoryMiB: 1024,
  healthPath: '/api/v1/health',
  certificateArn: certificateArn || undefined,
  imageTag
});

// Optional: IAM OIDC role for GitHub Actions deployments
if (createOidc) {
  new IamGhOidcStack(app, `${envName}-${appName}-gh-oidc`, {
    env,
    envName,
    roleName: 'gh-oidc-deploy',
    githubOrg: app.node.tryGetContext('githubOrg') ?? 'my-org',
    githubRepo: app.node.tryGetContext('githubRepo') ?? 'my-repo'
  });
}