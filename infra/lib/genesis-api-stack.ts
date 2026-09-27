import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigateway_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export interface GenesisApiStackProps extends cdk.StackProps {
  envName: string;
  appName: string;
  vpc: ec2.Vpc;
  lambdaSecurityGroup: ec2.SecurityGroup;
  database: rds.DatabaseInstance;
  dbSecret: secretsmanager.Secret;
  dbProxyEndpoint: string;
  artifactBucket: s3.Bucket;
  bedrockApiKeySecret: secretsmanager.Secret;
}

export class GenesisApiStack extends cdk.Stack {
  public readonly apiHandlerFunction: lambda.Function;
  public readonly apiGateway: apigateway.HttpApi;

  constructor(scope: Construct, id: string, props: GenesisApiStackProps) {
    super(scope, id, props);

    const { envName, appName, vpc, lambdaSecurityGroup, database, dbSecret, dbProxyEndpoint, artifactBucket, bedrockApiKeySecret } = props;

    const isProduction = envName === "production";

    const apiHandlerRole = new iam.Role(this, "ApiHandlerRole", {
      roleName: `${appName}-api-handler-role-${envName}`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess"),
      ],
    });

    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:Converse",
          "bedrock:ConverseStream",
          "bedrock:ListFoundationModels",
        ],
        resources: ["*"],
      })
    );

    dbSecret.grantRead(apiHandlerRole);

    bedrockApiKeySecret.grantRead(apiHandlerRole);

    artifactBucket.grantReadWrite(apiHandlerRole);

    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "rds-db:connect",
        ],
        resources: [
          `arn:aws:rds-db:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:dbuser:${database.instanceIdentifier}/*`,
        ],
      })
    );

    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "secretsmanager:GetSecretValue",
        ],
        resources: [
          `arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:${appName}/*`,
        ],
      })
    );

    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "states:StartExecution",
          "states:DescribeExecution",
          "states:ListExecutions",
          "states:StopExecution",
        ],
        resources: [
          `arn:aws:states:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:stateMachine:${appName}-workflow-*`,
        ],
      })
    );

    this.apiHandlerFunction = new lambda.Function(this, "ApiHandlerFunction", {
      functionName: `${appName}-api-handler-${envName}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "dist/api-handler.handler",
      code: lambda.Code.fromAsset("../dist/server"),
      timeout: cdk.Duration.seconds(30),
      memorySize: isProduction ? 1024 : 512,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      role: apiHandlerRole,
      environment: {
        NODE_ENV: envName,
        AWS_REGION: cdk.Aws.REGION,
        ENVIRONMENT: envName,
        DATABASE_SECRET_ARN: dbSecret.secretArn,
        DATABASE_PROXY_ENDPOINT: dbProxyEndpoint,
        DATABASE_NAME: "genesis",
        DATABASE_PORT: "3306",
        ARTIFACT_BUCKET_NAME: artifactBucket.bucketName,
        BEDROCK_API_KEY_SECRET_ARN: bedrockApiKeySecret.secretArn,
        BEDROCK_MODEL_ID: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        MOCK_AI: envName === "development" ? "true" : "false",
        API_BASE_URL: `https://${appName}-${envName}.api.${cdk.Aws.REGION}.amazonaws.com`,
      },
      logRetention: isProduction ? cdk.aws_logs.RetentionDays.ONE_MONTH : cdk.aws_logs.RetentionDays.ONE_WEEK,
    });

    this.apiGateway = new apigateway.HttpApi(this, "ApiGateway", {
      apiName: `${appName}-api-${envName}`,
      description: "AGENTIS GENESIS API Gateway",
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigateway.CorsHttpMethod.GET, apigateway.CorsHttpMethod.POST, apigateway.CorsHttpMethod.PUT, apigateway.CorsHttpMethod.DELETE, apigateway.CorsHttpMethod.OPTIONS],
        allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
        maxAge: cdk.Duration.days(1),
      },
      defaultIntegration: new apigateway_integrations.HttpLambdaIntegration("ApiIntegration", this.apiHandlerFunction),
    });

    new cdk.CfnOutput(this, "ApiGatewayUrl", {
      value: this.apiGateway.apiEndpoint,
      exportName: `${appName}-api-gateway-url-${envName}`,
    });

    new cdk.CfnOutput(this, "ApiGatewayId", {
      value: this.apiGateway.apiId,
      exportName: `${appName}-api-gateway-id-${envName}`,
    });

    new cdk.CfnOutput(this, "ApiHandlerFunctionName", {
      value: this.apiHandlerFunction.functionName,
      exportName: `${appName}-api-handler-function-name-${envName}`,
    });

    new cdk.CfnOutput(this, "ApiHandlerFunctionArn", {
      value: this.apiHandlerFunction.functionArn,
      exportName: `${appName}-api-handler-function-arn-${envName}`,
    });
  }
}