import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export interface EcrStackProps extends cdk.StackProps {
  /** Environment name (dev, stg, prod) used to namespace the repository */
  envName: string;
  /** Repository name (without environment prefix) */
  repoName: string;
}

/**
 * EcrStack provisions a private ECR repository for storing the Docker images.
 * It enables image scanning on push, encrypts images at rest, and adds a
 * lifecycle rule to prune untagged images after 14 days.
 */
export class EcrStack extends cdk.Stack {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: EcrStackProps) {
    super(scope, id, props);

    this.repository = new ecr.Repository(this, 'Repo', {
      repositoryName: `${props.envName}/${props.repoName}`,
      imageScanOnPush: true,
      encryption: ecr.RepositoryEncryption.AES_256,
      lifecycleRules: [
        {
          description: 'Expire untagged images after 14 days',
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageAge: cdk.Duration.days(14)
        }
      ]
    });

    new cdk.CfnOutput(this, 'EcrRepoUri', { value: this.repository.repositoryUri });
  }
}