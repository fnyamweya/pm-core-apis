import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export interface NetworkStackProps extends cdk.StackProps {
  /** Short name of the environment, e.g. dev, stg, prod */
  envName: string;
}

/**
 * NetworkStack provisions a VPC with public and private subnets across two
 * Availability Zones, plus a NAT gateway. The outputs expose the VPC and
 * subnet IDs for other stacks to import.
 */
export class NetworkStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly publicSubnets: ec2.ISubnet[];
  public readonly privateSubnets: ec2.ISubnet[];

  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'Vpc', {
      vpcName: `${props.envName}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: `${props.envName}-public`,
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        },
        {
          name: `${props.envName}-private`,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24
        }
      ]
    });

    // Save subnet references
    this.publicSubnets = this.vpc.publicSubnets;
    this.privateSubnets = this.vpc.privateSubnets;

    // Stack outputs for cross-stack references
    new cdk.CfnOutput(this, 'VpcId', { value: this.vpc.vpcId });
    new cdk.CfnOutput(this, 'PublicSubnets', { value: this.publicSubnets.map(s => s.subnetId).join(',') });
    new cdk.CfnOutput(this, 'PrivateSubnets', { value: this.privateSubnets.map(s => s.subnetId).join(',') });
  }
}