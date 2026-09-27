import * as cdk from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sfn_tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface GenesisStepFunctionsStackProps extends cdk.StackProps {
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
}

export class GenesisStepFunctionsStack extends cdk.Stack {
  public readonly stateMachine: sfn.StateMachine;
  public readonly plannerFunction: lambda.Function;
  public readonly agentWorkerFunction: lambda.Function;
  public readonly verificationFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: GenesisStepFunctionsStackProps) {
    super(scope, id, props);

    const { envName, appName, vpcId, lambdaSecurityGroupId, dbSecretArn, dbProxyEndpoint, dbInstanceIdentifier, artifactBucketName, artifactBucketArn, bedrockApiKeySecretArn, privateSubnetIds, isolatedSubnetIds } = props;

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

    const stepFunctionsRole = new iam.Role(this, "StepFunctionsRole", {
      roleName: `${appName}-stepfunctions-role-${envName}`,
      assumedBy: new iam.ServicePrincipal("states.amazonaws.com"),
    });

    stepFunctionsRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["lambda:InvokeFunction"],
        resources: [`arn:aws:lambda:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:function:${appName}-*`],
      })
    );

    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.minutes(10),
      memorySize: isProduction ? 1024 : 512,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
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
      },
    };

    const workerRole = new iam.Role(this, "WorkerRole", {
      roleName: `${appName}-worker-role-${envName}`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess"),
      ],
    });

    dbSecret.grantRead(workerRole);
    bedrockApiKeySecret.grantRead(workerRole);
    artifactBucket.grantReadWrite(workerRole);

    workerRole.addToPolicy(
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

    workerRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["rds-db:connect"],
        resources: [`arn:aws:rds-db:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:dbuser:${dbInstanceIdentifier}/*`],
      })
    );

    // Create log groups
    const plannerLogGroup = new logs.LogGroup(this, "PlannerLogGroup", {
      logGroupName: `/aws/lambda/${appName}-planner-${envName}`,
      retention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const agentWorkerLogGroup = new logs.LogGroup(this, "AgentWorkerLogGroup", {
      logGroupName: `/aws/lambda/${appName}-agent-worker-${envName}`,
      retention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const verificationLogGroup = new logs.LogGroup(this, "VerificationLogGroup", {
      logGroupName: `/aws/lambda/${appName}-verification-${envName}`,
      retention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    this.plannerFunction = new lambda.Function(this, "PlannerFunction", {
      functionName: `${appName}-planner-${envName}`,
      handler: "dist/planner.handler",
      code: lambda.Code.fromAsset("../dist/server"),
      role: workerRole,
      logGroup: plannerLogGroup,
      reservedConcurrentExecutions: 10,
      ...commonLambdaProps,
    });

    this.agentWorkerFunction = new lambda.Function(this, "AgentWorkerFunction", {
      functionName: `${appName}-agent-worker-${envName}`,
      handler: "dist/agent-worker.handler",
      code: lambda.Code.fromAsset("../dist/server"),
      role: workerRole,
      logGroup: agentWorkerLogGroup,
      reservedConcurrentExecutions: 10,
      ...commonLambdaProps,
    });

    this.verificationFunction = new lambda.Function(this, "VerificationFunction", {
      functionName: `${appName}-verification-${envName}`,
      handler: "dist/verification.handler",
      code: lambda.Code.fromAsset("../dist/server"),
      role: workerRole,
      logGroup: verificationLogGroup,
      reservedConcurrentExecutions: 5,
      ...commonLambdaProps,
    });

    // Define retry policy for Lambda invocations
    const lambdaRetryPolicy = {
      maxAttempts: 3,
      interval: cdk.Duration.seconds(2),
      backoffRate: 2,
      maxDelay: cdk.Duration.seconds(30),
      jitterStrategy: sfn.JitterType.FULL,
    };

    const loadWorkTree = new sfn_tasks.LambdaInvoke(this, "Load Work Tree", {
      lambdaFunction: this.agentWorkerFunction,
      payload: sfn.TaskInput.fromObject({
        action: "loadWorkTree",
        workTreeId: sfn.JsonPath.stringAt("$.workTreeId"),
      }),
      resultPath: "$.workTree",
      ...lambdaRetryPolicy,
    });

    const generatePlan = new sfn_tasks.LambdaInvoke(this, "Generate Plan", {
      lambdaFunction: this.plannerFunction,
      payload: sfn.TaskInput.fromObject({
        action: "generatePlan",
        workTree: sfn.JsonPath.stringAt("$.workTree"),
        objective: sfn.JsonPath.stringAt("$.objective"),
      }),
      resultPath: "$.plan",
      ...lambdaRetryPolicy,
    });

    const createTasks = new sfn_tasks.LambdaInvoke(this, "Create Tasks", {
      lambdaFunction: this.agentWorkerFunction,
      payload: sfn.TaskInput.fromObject({
        action: "createTasks",
        workTreeId: sfn.JsonPath.stringAt("$.workTree.id"),
        plan: sfn.JsonPath.stringAt("$.plan"),
      }),
      resultPath: "$.tasks",
      ...lambdaRetryPolicy,
    });

    const executeAgents = new sfn.Map(this, "Execute Agents", {
      itemsPath: sfn.JsonPath.stringAt("$.tasks"),
      maxConcurrency: 3,
      resultPath: "$.executionResults",
    }).iterator(
      new sfn_tasks.LambdaInvoke(this, "Execute Agent Task", {
        lambdaFunction: this.agentWorkerFunction,
        payload: sfn.TaskInput.fromObject({
          action: "executeTask",
          task: sfn.JsonPath.stringAt("$"),
          workTreeId: sfn.JsonPath.stringAt("$.workTreeId"),
        }),
        resultPath: "$.result",
        ...lambdaRetryPolicy,
      })
    );

    const storeResults = new sfn_tasks.LambdaInvoke(this, "Store Results", {
      lambdaFunction: this.agentWorkerFunction,
      payload: sfn.TaskInput.fromObject({
        action: "storeResults",
        workTreeId: sfn.JsonPath.stringAt("$.workTreeId"),
        executionResults: sfn.JsonPath.stringAt("$.executionResults"),
      }),
      resultPath: "$.storedResults",
      ...lambdaRetryPolicy,
    });

    const verifyResults = new sfn_tasks.LambdaInvoke(this, "Verify Results", {
      lambdaFunction: this.verificationFunction,
      payload: sfn.TaskInput.fromObject({
        action: "verify",
        workTreeId: sfn.JsonPath.stringAt("$.workTreeId"),
        results: sfn.JsonPath.stringAt("$.storedResults"),
      }),
      resultPath: "$.verification",
      ...lambdaRetryPolicy,
    });

    const finalize = new sfn_tasks.LambdaInvoke(this, "Finalize", {
      lambdaFunction: this.agentWorkerFunction,
      payload: sfn.TaskInput.fromObject({
        action: "finalize",
        workTreeId: sfn.JsonPath.stringAt("$.workTreeId"),
        results: sfn.JsonPath.stringAt("$.storedResults"),
        verification: sfn.JsonPath.stringAt("$.verification"),
      }),
      resultPath: "$.outcome",
      ...lambdaRetryPolicy,
    });

    const approvalRequired = new sfn.Choice(this, "Approval Required?")
      .when(
        sfn.Condition.booleanEquals("$.verification.Payload.requiresApproval", true),
        new sfn.Wait(this, "Wait for Approval", {
          time: sfn.WaitTime.timestampPath("$.verification.Payload.approvalDeadline"),
        }).next(
          new sfn_tasks.LambdaInvoke(this, "Check Approval", {
            lambdaFunction: this.agentWorkerFunction,
            payload: sfn.TaskInput.fromObject({
              action: "checkApproval",
              workTreeId: sfn.JsonPath.stringAt("$.workTreeId"),
            }),
            resultPath: "$.approvalResult",
            ...lambdaRetryPolicy,
          }).next(
            new sfn.Choice(this, "Approval Granted?")
              .when(
                sfn.Condition.booleanEquals("$.approvalResult.Payload.approved", true),
                new sfn.Pass(this, "Continue After Approval").next(finalize)
              )
              .otherwise(new sfn.Fail(this, "Approval Rejected", { cause: "Approval rejected by user", error: "APPROVAL_REJECTED" }))
          )
        )
      )
      .otherwise(new sfn.Pass(this, "No Approval Required").next(finalize));

    const definition = loadWorkTree
      .next(generatePlan)
      .next(createTasks)
      .next(executeAgents)
      .next(storeResults)
      .next(verifyResults)
      .next(approvalRequired);

    this.stateMachine = new sfn.StateMachine(this, "GenesisWorkflow", {
      stateMachineName: `${appName}-workflow-${envName}`,
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      role: stepFunctionsRole,
      timeout: cdk.Duration.hours(2),
      tracingEnabled: true,
      logs: {
        destination: new logs.LogGroup(this, "StateMachineLogGroup", {
          logGroupName: `/aws/vendedlogs/states/${appName}-workflow-${envName}`,
          retention: isProduction ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.ONE_WEEK,
          removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
        }),
        level: sfn.LogLevel.ALL,
      },
    });

    new cdk.CfnOutput(this, "StateMachineArn", {
      value: this.stateMachine.stateMachineArn,
      exportName: `${appName}-state-machine-arn-${envName}`,
    });

    new cdk.CfnOutput(this, "StateMachineName", {
      value: this.stateMachine.stateMachineName,
      exportName: `${appName}-state-machine-name-${envName}`,
    });

    new cdk.CfnOutput(this, "PlannerFunctionName", {
      value: this.plannerFunction.functionName,
      exportName: `${appName}-planner-function-name-${envName}`,
    });

    new cdk.CfnOutput(this, "AgentWorkerFunctionName", {
      value: this.agentWorkerFunction.functionName,
      exportName: `${appName}-agent-worker-function-name-${envName}`,
    });

    new cdk.CfnOutput(this, "VerificationFunctionName", {
      value: this.verificationFunction.functionName,
      exportName: `${appName}-verification-function-name-${envName}`,
    });
  }
}