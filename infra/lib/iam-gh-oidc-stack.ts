import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface IamGhOidcStackProps extends cdk.StackProps {
  envName: string;
  roleName: string;
  githubOrg: string;
  githubRepo: string;
}

/**
 * IamGhOidcStack creates an IAM role that GitHub Actions can assume via OIDC.
 * It configures the AWS OIDC provider and sets a trust policy restricting
 * access to the specified GitHub repository. The inline policy grants
 * permissions for CloudFormation, ECS, ECR and other necessary services.
 */
export class IamGhOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IamGhOidcStackProps) {
    super(scope, id, props);

    // Create a federated OIDC provider for GitHub if one does not exist
    const provider = new iam.OpenIdConnectProvider(this, 'GitHubOIDC', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com']
    });

    // IAM role that GitHub Actions will assume
    const role = new iam.Role(this, 'GhActionsDeploy', {
      roleName: `${props.envName}-${props.roleName}`,
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
        },
        StringLike: {
          // Restrict to the specific repository. Wildcards allow any branch or workflow.
          'token.actions.githubusercontent.com:sub': `repo:${props.githubOrg}/${props.githubRepo}:*`
        }
      }),
      inlinePolicies: {
        DeployPermissions: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                'cloudformation:*',
                'ecr:*',
                'ecs:*',
                'logs:*',
                'ssm:*',
                'iam:PassRole'
              ],
              resources: ['*'],
              effect: iam.Effect.ALLOW
            })
          ]
        })
      }
    });

    new cdk.CfnOutput(this, 'RoleArn', { value: role.roleArn });
  }
}