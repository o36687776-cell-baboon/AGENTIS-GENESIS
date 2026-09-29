import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import * as apigateway_authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as apigateway_integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface GenesisApiStackProps extends cdk.StackProps {
  envName: string;
  appName: string;
  vpcId: string;
  lambdaSecurityGroupId: string;
  dbSecretArn: string;
  dbProxyEndpoint: string;
  dbInstanceIdentifier: string;
  artifactBucketName: string;
  artifactBucketArn: string;
  bedrockApiKeySecretArn: string;
  privateSubnetIds: string;
  isolatedSubnetIds: string;
  stateMachineArn: string;
  allowedOrigins: string[];
}

export class GenesisApiStack extends cdk.Stack {
  public readonly apiHandlerFunction: lambda.Function;
  public readonly apiGateway: apigateway.HttpApi;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: GenesisApiStackProps) {
    super(scope, id, props);

    const {
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
      privateSubnetIds,
      isolatedSubnetIds,
      stateMachineArn,
      allowedOrigins,
    } = props;

    const isProduction = envName === "production";

    // Import VPC and security group
    const vpc = ec2.Vpc.fromVpcAttributes(this, "ImportedVpc", {
      vpcId,
      availabilityZones: cdk.Fn.getAzs(),
      privateSubnetIds: privateSubnetIds.split(","),
      isolatedSubnetIds: isolatedSubnetIds.split(","),
    });

    const lambdaSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, "ImportedLambdaSecurityGroup", lambdaSecurityGroupId);

    // Import secrets
    const dbSecret = secretsmanager.Secret.fromSecretCompleteArn(this, "ImportedDbSecret", dbSecretArn);
    const bedrockApiKeySecret = secretsmanager.Secret.fromSecretCompleteArn(this, "ImportedBedrockApiKeySecret", bedrockApiKeySecretArn);

    // Import S3 bucket
    const artifactBucket = s3.Bucket.fromBucketAttributes(this, "ImportedArtifactBucket", {
      bucketName: artifactBucketName,
      bucketArn: artifactBucketArn,
    });

    // ---------------------------------------------------------------------
    // Identity. The API is not publicly readable or writable: every route
    // other than the health probe requires a token issued by this pool and
    // verified by the gateway's JWT authorizer.
    // ---------------------------------------------------------------------
    this.userPool = new cognito.UserPool(this, "GenesisUserPool", {
      userPoolName: `${appName}-users-${envName}`,
      selfSignUpEnabled: !isProduction,
      signInAliases: { email: true, username: true },
      standardAttributes: { email: { required: true, mutable: false } },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // The browser signs in through the Cognito hosted UI using the
    // authorization code flow with PKCE. That flow needs at least one callback
    // URL, so the hosted UI is provisioned only when origins are configured.
    // With no ALLOWED_ORIGINS there is no browser origin to serve, the pool
    // still exists for SRP sign-in, and the client is a server-side client
    // with no OAuth grant.
    const hasBrowserOrigins = allowedOrigins.length > 0;
    const cognitoDomainPrefix = `${appName}-${envName}`.slice(0, 63);

    this.userPoolClient = this.userPool.addClient(`${appName}-web-${envName}`, {
      userPoolClientName: `${appName}-web-client-${envName}`,
      // Public client using the authorization code flow with PKCE. No client
      // secret is embedded anywhere, including in the browser.
      generateSecret: false,
      authFlows: { userSrp: true, user: true },
      ...(hasBrowserOrigins
        ? {
            oAuth: {
              flows: { authorizationCodeGrant: true },
              scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
              callbackUrls: allowedOrigins.map((origin) => `${origin.replace(/\/$/, "")}/auth/callback`),
            },
          }
        : {}),
      preventUserExistenceErrors: true,
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
    });

    // The hosted UI domain is what the browser's authorize and token requests
    // target, so the resource has to actually exist rather than be a string.
    if (hasBrowserOrigins) {
      this.userPool.addDomain("GenesisHostedUi", {
        cognitoDomain: { domainPrefix: cognitoDomainPrefix },
      });
    }

    // The JWT authorizer verifies against the issuer, which is the pool's
    // regional endpoint path rather than a construct property.
    const cognitoIssuer = `https://cognito-idp.${cdk.Aws.REGION}.amazonaws.com/${this.userPool.userPoolId}`;
    const cognitoDomain = `${cognitoDomainPrefix}.auth.${cdk.Aws.REGION}.amazoncognito.com`;

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
        actions: ["rds-db:connect"],
        resources: [`arn:aws:rds-db:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:dbuser:${dbInstanceIdentifier}/*`],
      })
    );

    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue"],
        resources: [`arn:aws:secretsmanager:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:secret:${appName}/*`],
      })
    );

    // Scoped to the one state machine this environment owns, so the API cannot
    // start an arbitrary workflow in the account.
    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["states:StartExecution"],
        resources: [stateMachineArn],
      })
    );

    apiHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["states:DescribeExecution", "states:ListExecutions", "states:GetExecutionHistory"],
        resources: [stateMachineArn, `${stateMachineArn.replace(/:stateMachine[^:]*:/, ":execution:")}*`],
      })
    );

    // Create log group for Lambda
    const apiHandlerLogGroup = new logs.LogGroup(this, "ApiHandlerLogGroup", {
      logGroupName: `/aws/lambda/${appName}-api-handler-${envName}`,
      retention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.apiHandlerFunction = new lambda.Function(this, "ApiHandlerFunction", {
      functionName: `${appName}-api-handler-${envName}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      handler: "api/api-handler.handler",
      code: lambda.Code.fromAsset("../dist/server"),
      timeout: cdk.Duration.seconds(30),
      memorySize: isProduction ? 1024 : 512,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      role: apiHandlerRole,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        NODE_ENV: envName,
        ENVIRONMENT: envName,
        DATABASE_SECRET_ARN: dbSecretArn,
        DATABASE_PROXY_ENDPOINT: dbProxyEndpoint,
        DATABASE_NAME: "genesis",
        DATABASE_PORT: "3306",
        ARTIFACT_BUCKET_NAME: artifactBucketName,
        BEDROCK_API_KEY_SECRET_ARN: bedrockApiKeySecretArn,
        BEDROCK_MODEL_ID: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        MOCK_AI: envName === "development" ? "true" : "false",
        API_BASE_URL: `https://${appName}-${envName}.api.${cdk.Aws.REGION}.amazonaws.com`,
        STATE_MACHINE_ARN: stateMachineArn,
        COGNITO_ISSUER: cognitoIssuer,
        COGNITO_AUDIENCE: this.userPoolClient.userPoolClientId,
        AUTH_REQUIRED: "true",
        ALLOWED_ORIGINS: allowedOrigins.join(","),
        ARTIFACT_URL_TTL_SECONDS: "900",
        MAX_TASKS_PER_EXECUTION: "25",
        MAX_OUTPUT_CHARS: "20000",
      },
      logGroup: apiHandlerLogGroup,
      reservedConcurrentExecutions: 20,
    });

    // CORS is restricted to the configured origins. An empty list means no
    // browser origin is allowed, which is the correct default for a private
    // API rather than a wildcard.
    const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : [];

    this.apiGateway = new apigateway.HttpApi(this, "ApiGateway", {
      apiName: `${appName}-api-${envName}`,
      description: "AGENTIS GENESIS API Gateway",
      corsPreflight: {
        allowOrigins: corsOrigins,
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization", "X-Request-ID", "X-Genesis-Actor"],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
    });

    // The gateway verifies the token signature and expiry against the user
    // pool issuer. The Lambda then re-checks that the authorizer context is
    // present, so an unauthenticated request cannot reach a handler even if a
    // route is ever misconfigured.
    const authorizer = new apigateway_authorizers.HttpJwtAuthorizer(
      "GenesisJwtAuthorizer",
      cognitoIssuer,
      {
        authorizerName: `${appName}-jwt-${envName}`,
        jwtAudience: [this.userPoolClient.userPoolClientId],
        identitySource: ["$request.header.Authorization"],
      }
    );

    const integration = new apigateway_integrations.HttpLambdaIntegration(
      "ApiIntegration",
      this.apiHandlerFunction
    );

    // Explicit routes instead of a $default proxy. The proxy route was what
    // left path parameters unpopulated, and it also meant an unauthenticated
    // catch-all. Declaring each path gives both a reliable identifier and a
    // per-route authorization decision.
    this.apiGateway.addRoutes({
      path: "/api/health",
      methods: [apigateway.HttpMethod.GET],
      integration,
      authorizer: undefined,
    });

    const securedRoutes: Array<{ path: string; methods: apigateway.HttpMethod[] }> = [
      { path: "/api/work-trees", methods: [apigateway.HttpMethod.GET, apigateway.HttpMethod.POST] },
      { path: "/api/work-trees/{id}", methods: [apigateway.HttpMethod.GET] },
      { path: "/api/work-trees/{id}/plan", methods: [apigateway.HttpMethod.POST] },
      { path: "/api/work-trees/{id}/run", methods: [apigateway.HttpMethod.POST] },
      { path: "/api/work-trees/{id}/pause", methods: [apigateway.HttpMethod.POST] },
      { path: "/api/work-trees/{id}/resume", methods: [apigateway.HttpMethod.POST] },
      { path: "/api/work-trees/{id}/activity", methods: [apigateway.HttpMethod.GET] },
      { path: "/api/work-trees/{id}/artifacts", methods: [apigateway.HttpMethod.GET] },
      { path: "/api/work-trees/{id}/execution", methods: [apigateway.HttpMethod.GET] },
      { path: "/api/agents", methods: [apigateway.HttpMethod.GET] },
      { path: "/api/agents/{id}", methods: [apigateway.HttpMethod.GET] },
      { path: "/api/tasks", methods: [apigateway.HttpMethod.GET] },
      { path: "/api/artifacts/{id}/url", methods: [apigateway.HttpMethod.GET] },
      { path: "/api/approvals/{id}/approve", methods: [apigateway.HttpMethod.POST] },
      { path: "/api/approvals/{id}/reject", methods: [apigateway.HttpMethod.POST] },
      { path: "/api/ai/chat", methods: [apigateway.HttpMethod.POST] },
    ];

    for (const route of securedRoutes) {
      this.apiGateway.addRoutes({
        path: route.path,
        methods: route.methods,
        integration,
        authorizer,
        authorizationScopes: ["email"],
      });
    }

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

    new cdk.CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
      exportName: `${appName}-user-pool-id-${envName}`,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      exportName: `${appName}-user-pool-client-id-${envName}`,
    });

    new cdk.CfnOutput(this, "UserPoolDomain", {
      value: hasBrowserOrigins ? cognitoDomain : "not-configured",
      exportName: `${appName}-user-pool-domain-${envName}`,
    });

    new cdk.CfnOutput(this, "CognitoIssuer", {
      value: cognitoIssuer,
      exportName: `${appName}-cognito-issuer-${envName}`,
    });
  }
}
