import * as cdk from "aws-cdk-lib";
import * as rds from "aws-cdk-lib/aws-rds";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface GenesisDatabaseStackProps extends cdk.StackProps {
  envName: string;
  appName: string;
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
  lambdaSecurityGroup: ec2.SecurityGroup;
}

export class GenesisDatabaseStack extends cdk.Stack {
  public readonly database: rds.DatabaseInstance;
  public readonly dbSecret: secretsmanager.Secret;
  public readonly dbProxy: rds.DatabaseProxy;
  public readonly dbProxyEndpoint: string;

  constructor(scope: Construct, id: string, props: GenesisDatabaseStackProps) {
    super(scope, id, props);

    const { envName, appName, vpc, dbSecurityGroup, lambdaSecurityGroup } = props;

    this.dbSecret = new secretsmanager.Secret(this, "DatabaseSecret", {
      secretName: `${appName}/database/mariadb-${envName}`,
      description: "MariaDB credentials for Genesis",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "genesis_admin" }),
        generateStringKey: "password",
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });

    const dbSubnetGroup = new rds.SubnetGroup(this, "DatabaseSubnetGroup", {
      vpc,
      description: "Subnet group for Genesis MariaDB",
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      subnetGroupName: `${appName}-db-subnet-${envName}`,
    });

    const isProduction = envName === "production";

    this.database = new rds.DatabaseInstance(this, "Database", {
      instanceIdentifier: `${appName}-mariadb-${envName}`,
      engine: rds.DatabaseInstanceEngine.mariaDb({
        version: rds.MariaDbEngineVersion.VER_10_11,
      }),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      subnetGroup: dbSubnetGroup,
      instanceType: isProduction
        ? ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.XLARGE)
        : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM),
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      databaseName: "genesis",
      allocatedStorage: isProduction ? 100 : 20,
      maxAllocatedStorage: isProduction ? 500 : 100,
      storageType: rds.StorageType.GP3,
      storageEncrypted: true,
      deletionProtection: isProduction,
      backupRetention: isProduction ? cdk.Duration.days(30) : cdk.Duration.days(7),
      preferredBackupWindow: "03:00-04:00",
      preferredMaintenanceWindow: "sun:04:00-sun:05:00",
      enablePerformanceInsights: isProduction,
      monitoringInterval: isProduction ? cdk.Duration.seconds(60) : undefined,
      autoMinorVersionUpgrade: true,
      publiclyAccessible: false,
      cloudwatchLogsExports: ["audit", "error", "general", "slowquery"],
    });

    this.dbProxy = new rds.DatabaseProxy(this, "DatabaseProxy", {
      proxyTarget: rds.ProxyTarget.fromInstance(this.database),
      secrets: [this.dbSecret],
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      dbProxyName: `${appName}-db-proxy-${envName}`,
      requireTLS: true,
      idleClientTimeout: cdk.Duration.minutes(5),
      maxConnectionsPercent: 90,
      maxIdleConnectionsPercent: 50,
      connectionBorrowTimeout: cdk.Duration.seconds(30),
    });

    this.dbProxyEndpoint = this.dbProxy.endpoint;

    this.dbSecret.grantRead(this.database.grantPrincipal);

    new cdk.CfnOutput(this, "DatabaseEndpoint", {
      value: this.database.dbInstanceEndpointAddress,
      exportName: `${appName}-db-endpoint-${envName}`,
    });

    new cdk.CfnOutput(this, "DatabasePort", {
      value: String(this.database.dbInstanceEndpointPort),
      exportName: `${appName}-db-port-${envName}`,
    });

    new cdk.CfnOutput(this, "DatabaseSecretArn", {
      value: this.dbSecret.secretArn,
      exportName: `${appName}-db-secret-arn-${envName}`,
    });

    new cdk.CfnOutput(this, "DatabaseProxyEndpoint", {
      value: this.dbProxyEndpoint,
      exportName: `${appName}-db-proxy-endpoint-${envName}`,
    });

    new cdk.CfnOutput(this, "DatabaseProxyArn", {
      value: this.dbProxy.dbProxyArn,
      exportName: `${appName}-db-proxy-arn-${envName}`,
    });
  }
}