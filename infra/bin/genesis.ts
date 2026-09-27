#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GenesisVpcStack } from "../lib/genesis-vpc-stack";
import { GenesisDatabaseStack } from "../lib/genesis-database-stack";
import { GenesisStorageStack } from "../lib/genesis-storage-stack";
import { GenesisSecretsStack } from "../lib/genesis-secrets-stack";
import { GenesisApiStack } from "../lib/genesis-api-stack";
import { GenesisStepFunctionsStack } from "../lib/genesis-stepfunctions-stack";
import { GenesisMonitoringStack } from "../lib/genesis-monitoring-stack";

const app = new cdk.App();

// Set cross-stack reference strength to weak to allow independent stack updates
app.node.setContext("@aws-cdk/core:defaultCrossStackReferences", "weak");

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || "us-east-1",
};

const envName = process.env.ENVIRONMENT || "development";
const appName = "agentis-genesis";

const vpcStack = new GenesisVpcStack(app, `${appName}-vpc-${envName}`, {
  env,
  envName,
  appName,
});

// Import VPC stack outputs
const dbSecurityGroupId = cdk.Fn.importValue(`${appName}-db-sg-id-${envName}`);
const lambdaSecurityGroupId = cdk.Fn.importValue(`${appName}-lambda-sg-id-${envName}`);
const dbSubnetGroupName = cdk.Fn.importValue(`${appName}-db-subnet-group-name-${envName}`);
const vpcId = cdk.Fn.importValue(`${appName}-vpc-id-${envName}`);
const availabilityZones = cdk.Fn.importValue(`${appName}-availability-zones-${envName}`);
const privateSubnetIds = cdk.Fn.importValue(`${appName}-private-subnet-ids-${envName}`);
const isolatedSubnetIds = cdk.Fn.importValue(`${appName}-database-subnet-ids-${envName}`);
const privateSubnet1RouteTableId = cdk.Fn.importValue(`${appName}-private-subnet-1-route-table-id-${envName}`);
const privateSubnet2RouteTableId = cdk.Fn.importValue(`${appName}-private-subnet-2-route-table-id-${envName}`);
const databaseSubnet1RouteTableId = cdk.Fn.importValue(`${appName}-database-subnet-1-route-table-id-${envName}`);
const databaseSubnet2RouteTableId = cdk.Fn.importValue(`${appName}-database-subnet-2-route-table-id-${envName}`);

const databaseStack = new GenesisDatabaseStack(app, `${appName}-database-${envName}`, {
  env,
  envName,
  appName,
  dbSecurityGroupId,
  lambdaSecurityGroupId,
  dbSubnetGroupName,
  vpcId,
  availabilityZones,
  privateSubnetIds,
  isolatedSubnetIds,
  privateSubnet1RouteTableId,
  privateSubnet2RouteTableId,
  databaseSubnet1RouteTableId,
  databaseSubnet2RouteTableId,
});

const storageStack = new GenesisStorageStack(app, `${appName}-storage-${envName}`, {
  env,
  envName,
  appName,
});

// Import storage outputs
const artifactBucketName = cdk.Fn.importValue(`${appName}-artifact-bucket-name-${envName}`);
const artifactBucketArn = cdk.Fn.importValue(`${appName}-artifact-bucket-arn-${envName}`);

const secretsStack = new GenesisSecretsStack(app, `${appName}-secrets-${envName}`, {
  env,
  envName,
  appName,
});

// Import secrets outputs
const bedrockApiKeySecretArn = cdk.Fn.importValue(`${appName}-bedrock-api-key-secret-arn-${envName}`);
const bedrockApiKeySecretName = cdk.Fn.importValue(`${appName}-bedrock-api-key-secret-name-${envName}`);

// Import database outputs
const dbSecretArn = cdk.Fn.importValue(`${appName}-db-secret-arn-${envName}`);
const dbProxyEndpoint = cdk.Fn.importValue(`${appName}-db-proxy-endpoint-${envName}`);
const dbProxyArn = cdk.Fn.importValue(`${appName}-db-proxy-arn-${envName}`);
const dbInstanceIdentifier = cdk.Fn.importValue(`${appName}-db-instance-identifier-${envName}`);

const apiStack = new GenesisApiStack(app, `${appName}-api-${envName}`, {
  env,
  envName,
  appName,
  vpcId,
  lambdaSecurityGroupId,
  dbSecretArn,
  dbProxyEndpoint,
  dbInstanceIdentifier,
  artifactBucketName,
  artifactBucketArn,
  bedrockApiKeySecretArn,
  bedrockApiKeySecretName,
});

const stepFunctionsStack = new GenesisStepFunctionsStack(app, `${appName}-stepfunctions-${envName}`, {
  env,
  envName,
  appName,
  vpcId,
  lambdaSecurityGroupId,
  dbSecretArn,
  dbProxyEndpoint,
  dbInstanceIdentifier,
  artifactBucketName,
  artifactBucketArn,
  bedrockApiKeySecretArn,
  bedrockApiKeySecretName,
});

// Import API outputs
const apiGatewayId = cdk.Fn.importValue(`${appName}-api-gateway-id-${envName}`);
const apiGatewayUrl = cdk.Fn.importValue(`${appName}-api-gateway-url-${envName}`);
const apiHandlerFunctionName = cdk.Fn.importValue(`${appName}-api-handler-function-name-${envName}`);
const apiHandlerFunctionArn = cdk.Fn.importValue(`${appName}-api-handler-function-arn-${envName}`);

// Import StepFunctions outputs
const stateMachineArn = cdk.Fn.importValue(`${appName}-state-machine-arn-${envName}`);
const stateMachineName = cdk.Fn.importValue(`${appName}-state-machine-name-${envName}`);

new GenesisMonitoringStack(app, `${appName}-monitoring-${envName}`, {
  env,
  envName,
  appName,
  apiGatewayId,
  apiGatewayUrl,
  apiHandlerFunctionName,
  apiHandlerFunctionArn,
  dbInstanceIdentifier,
  dbProxyArn,
  stateMachineArn,
  stateMachineName,
  artifactBucketName,
  artifactBucketArn,
});