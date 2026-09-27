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

const dbSecurityGroupId = cdk.Fn.importValue(`${appName}-db-sg-id-${envName}`);
const lambdaSecurityGroupId = cdk.Fn.importValue(`${appName}-lambda-sg-id-${envName}`);
const dbSubnetGroupName = cdk.Fn.importValue(`${appName}-db-subnet-group-name-${envName}`);
const vpcId = cdk.Fn.importValue(`${appName}-vpc-id-${envName}`);

const databaseStack = new GenesisDatabaseStack(app, `${appName}-database-${envName}`, {
  env,
  envName,
  appName,
  dbSecurityGroupId,
  lambdaSecurityGroupId,
  dbSubnetGroupName,
  vpcId,
});

const storageStack = new GenesisStorageStack(app, `${appName}-storage-${envName}`, {
  env,
  envName,
  appName,
});

const secretsStack = new GenesisSecretsStack(app, `${appName}-secrets-${envName}`, {
  env,
  envName,
  appName,
  database: databaseStack.database,
  artifactBucket: storageStack.artifactBucket,
});

const apiStack = new GenesisApiStack(app, `${appName}-api-${envName}`, {
  env,
  envName,
  appName,
  vpc: vpcStack.vpc,
  lambdaSecurityGroup: vpcStack.lambdaSecurityGroup,
  database: databaseStack.database,
  dbSecret: databaseStack.dbSecret,
  dbProxyEndpoint: databaseStack.dbProxyEndpoint,
  artifactBucket: storageStack.artifactBucket,
  bedrockApiKeySecret: secretsStack.bedrockApiKeySecret,
});

const stepFunctionsStack = new GenesisStepFunctionsStack(app, `${appName}-stepfunctions-${envName}`, {
  env,
  envName,
  appName,
  vpc: vpcStack.vpc,
  lambdaSecurityGroup: vpcStack.lambdaSecurityGroup,
  database: databaseStack.database,
  dbSecret: databaseStack.dbSecret,
  dbProxyEndpoint: databaseStack.dbProxyEndpoint,
  artifactBucket: storageStack.artifactBucket,
  bedrockApiKeySecret: secretsStack.bedrockApiKeySecret,
});

new GenesisMonitoringStack(app, `${appName}-monitoring-${envName}`, {
  env,
  envName,
  appName,
  apiGateway: apiStack.apiGateway,
  apiHandlerFunction: apiStack.apiHandlerFunction,
  database: databaseStack.database,
  dbProxy: databaseStack.dbProxy,
  stepFunctionsStateMachine: stepFunctionsStack.stateMachine,
  artifactBucket: storageStack.artifactBucket,
});