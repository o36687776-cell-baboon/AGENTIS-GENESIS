import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export interface GenesisVpcStackProps extends cdk.StackProps {
  envName: string;
  appName: string;
}

export class GenesisVpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly dbSecurityGroup: ec2.SecurityGroup;
  public readonly lambdaSecurityGroup: ec2.SecurityGroup;
  public readonly dbSubnetGroup: rds.SubnetGroup;

  constructor(scope: Construct, id: string, props: GenesisVpcStackProps) {
    super(scope, id, props);

    const { envName, appName } = props;

    this.vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `${appName}-vpc-${envName}`,
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2,
      natGateways: envName === "production" ? 2 : 1,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: "database",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });

    this.lambdaSecurityGroup = new ec2.SecurityGroup(this, "LambdaSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: `${appName}-lambda-sg-${envName}`,
      description: "Security group for Lambda functions",
      allowAllOutbound: false,
    });

    this.dbSecurityGroup = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", {
      vpc: this.vpc,
      securityGroupName: `${appName}-db-sg-${envName}`,
      description: "Security group for RDS MariaDB",
      allowAllOutbound: false,
    });

    this.dbSecurityGroup.addIngressRule(
      ec2.Peer.securityGroupId(this.lambdaSecurityGroup.securityGroupId),
      ec2.Port.tcp(3306),
      "Allow Lambda to connect to MariaDB via RDS Proxy"
    );

    this.lambdaSecurityGroup.addEgressRule(
      this.dbSecurityGroup,
      ec2.Port.tcp(3306),
      "Allow Lambda to connect to RDS Proxy"
    );

    // Allow Lambda to access internet (for Bedrock, Secrets Manager, S3 via VPC endpoints or NAT)
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "Allow HTTPS outbound for AWS APIs"
    );

    this.dbSubnetGroup = new rds.SubnetGroup(this, "DatabaseSubnetGroup", {
      vpc: this.vpc,
      description: "Subnet group for Genesis MariaDB",
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      subnetGroupName: `${appName}-db-subnet-${envName}`,
    });

    // Export VPC attributes for cross-stack references
    const privateSubnetIds = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds;
    const isolatedSubnetIds = this.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_ISOLATED }).subnetIds;

    new cdk.CfnOutput(this, "VpcId", {
      value: this.vpc.vpcId,
      exportName: `${appName}-vpc-id-${envName}`,
    });

    new cdk.CfnOutput(this, "DatabaseSecurityGroupId", {
      value: this.dbSecurityGroup.securityGroupId,
      exportName: `${appName}-db-sg-id-${envName}`,
    });

    new cdk.CfnOutput(this, "LambdaSecurityGroupId", {
      value: this.lambdaSecurityGroup.securityGroupId,
      exportName: `${appName}-lambda-sg-id-${envName}`,
    });

    new cdk.CfnOutput(this, "PrivateSubnetIds", {
      value: privateSubnetIds.join(","),
      exportName: `${appName}-private-subnet-ids-${envName}`,
    });

    new cdk.CfnOutput(this, "DatabaseSubnetIds", {
      value: isolatedSubnetIds.join(","),
      exportName: `${appName}-database-subnet-ids-${envName}`,
    });

    new cdk.CfnOutput(this, "DatabaseSubnetGroupName", {
      value: this.dbSubnetGroup.subnetGroupName,
      exportName: `${appName}-db-subnet-group-name-${envName}`,
    });

    // Export availability zones for VPC.fromVpcAttributes
    new cdk.CfnOutput(this, "AvailabilityZones", {
      value: this.vpc.availabilityZones.join(","),
      exportName: `${appName}-availability-zones-${envName}`,
    });
  }
}