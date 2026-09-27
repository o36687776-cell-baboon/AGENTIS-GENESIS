import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as rds from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export interface GenesisMonitoringStackProps extends cdk.StackProps {
  envName: string;
  appName: string;
  apiGatewayId: string;
  apiHandlerFunctionArn: string;
  dbInstanceIdentifier: string;
  stateMachineArn: string;
  artifactBucketName: string;
}

export class GenesisMonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GenesisMonitoringStackProps) {
    super(scope, id, props);

    const { envName, appName, apiGatewayId, apiHandlerFunctionArn, dbInstanceIdentifier, stateMachineArn, artifactBucketName } = props;

    // Import resources for metrics
    const apiHandlerFunction = lambda.Function.fromFunctionArn(this, "ImportedApiHandlerFunction", apiHandlerFunctionArn);

    const database = rds.DatabaseInstance.fromDatabaseInstanceAttributes(this, "ImportedDatabase", {
      instanceIdentifier: dbInstanceIdentifier,
      instanceEndpointAddress: "placeholder", // Not used for metrics
      port: 3306,
      securityGroups: [],
    });

    const dashboard = new cloudwatch.Dashboard(this, "GenesisDashboard", {
      dashboardName: `${appName}-dashboard-${envName}`,
    });

    const apiErrorRate = new cloudwatch.GraphWidget({
      title: "API Gateway Error Rate",
      left: [
        new cloudwatch.Metric({
          namespace: "AWS/ApiGateway",
          metricName: "5XXError",
          dimensionsMap: { ApiId: apiGatewayId },
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "AWS/ApiGateway",
          metricName: "4XXError",
          dimensionsMap: { ApiId: apiGatewayId },
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    const apiLatency = new cloudwatch.GraphWidget({
      title: "API Gateway Latency (p50, p95, p99)",
      left: [
        new cloudwatch.Metric({
          namespace: "AWS/ApiGateway",
          metricName: "Latency",
          dimensionsMap: { ApiId: apiGatewayId },
          period: cdk.Duration.minutes(5),
          statistic: "p50",
        }),
        new cloudwatch.Metric({
          namespace: "AWS/ApiGateway",
          metricName: "Latency",
          dimensionsMap: { ApiId: apiGatewayId },
          period: cdk.Duration.minutes(5),
          statistic: "p95",
        }),
        new cloudwatch.Metric({
          namespace: "AWS/ApiGateway",
          metricName: "Latency",
          dimensionsMap: { ApiId: apiGatewayId },
          period: cdk.Duration.minutes(5),
          statistic: "p99",
        }),
      ],
      width: 12,
      height: 6,
    });

    const lambdaErrors = new cloudwatch.GraphWidget({
      title: "Lambda Errors",
      left: [apiHandlerFunction.metricErrors({ period: cdk.Duration.minutes(5) })],
      width: 12,
      height: 6,
    });

    const lambdaDuration = new cloudwatch.GraphWidget({
      title: "Lambda Duration",
      left: [
        apiHandlerFunction.metricDuration({ period: cdk.Duration.minutes(5), statistic: "p50" }),
        apiHandlerFunction.metricDuration({ period: cdk.Duration.minutes(5), statistic: "p95" }),
        apiHandlerFunction.metricDuration({ period: cdk.Duration.minutes(5), statistic: "p99" }),
      ],
      width: 12,
      height: 6,
    });

    const dbConnections = new cloudwatch.GraphWidget({
      title: "Database Connections",
      left: [database.metricDatabaseConnections({ period: cdk.Duration.minutes(5) })],
      width: 12,
      height: 6,
    });

    const dbCpu = new cloudwatch.GraphWidget({
      title: "Database CPU Utilization",
      left: [database.metricCPUUtilization({ period: cdk.Duration.minutes(5) })],
      width: 12,
      height: 6,
    });

    const dbStorage = new cloudwatch.GraphWidget({
      title: "Database Free Storage",
      left: [database.metricFreeStorageSpace({ period: cdk.Duration.minutes(5) })],
      width: 12,
      height: 6,
    });

    const stepFunctionsExecutions = new cloudwatch.GraphWidget({
      title: "Step Functions Executions",
      left: [
        new cloudwatch.Metric({
          namespace: "AWS/States",
          metricName: "ExecutionsStarted",
          dimensionsMap: { StateMachineArn: stateMachineArn },
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "AWS/States",
          metricName: "ExecutionsSucceeded",
          dimensionsMap: { StateMachineArn: stateMachineArn },
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "AWS/States",
          metricName: "ExecutionsFailed",
          dimensionsMap: { StateMachineArn: stateMachineArn },
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
        new cloudwatch.Metric({
          namespace: "AWS/States",
          metricName: "ExecutionsTimedOut",
          dimensionsMap: { StateMachineArn: stateMachineArn },
          period: cdk.Duration.minutes(5),
          statistic: "Sum",
        }),
      ],
      width: 12,
      height: 6,
    });

    const stepFunctionsDuration = new cloudwatch.GraphWidget({
      title: "Step Functions Execution Duration",
      left: [
        new cloudwatch.Metric({
          namespace: "AWS/States",
          metricName: "ExecutionTime",
          dimensionsMap: { StateMachineArn: stateMachineArn },
          period: cdk.Duration.minutes(5),
          statistic: "p50",
        }),
        new cloudwatch.Metric({
          namespace: "AWS/States",
          metricName: "ExecutionTime",
          dimensionsMap: { StateMachineArn: stateMachineArn },
          period: cdk.Duration.minutes(5),
          statistic: "p95",
        }),
      ],
      width: 12,
      height: 6,
    });

    const s3Storage = new cloudwatch.GraphWidget({
      title: "S3 Bucket Size",
      left: [
        new cloudwatch.Metric({
          namespace: "AWS/S3",
          metricName: "BucketSizeBytes",
          dimensionsMap: { BucketName: artifactBucketName, StorageType: "StandardStorage" },
          period: cdk.Duration.hours(24),
          statistic: "Average",
        }),
      ],
      width: 12,
      height: 6,
    });

    dashboard.addWidgets(apiErrorRate, apiLatency);
    dashboard.addWidgets(lambdaErrors, lambdaDuration);
    dashboard.addWidgets(dbConnections, dbCpu);
    dashboard.addWidgets(dbStorage, s3Storage);
    dashboard.addWidgets(stepFunctionsExecutions, stepFunctionsDuration);

    void new cloudwatch.Alarm(this, "ApiErrorRateAlarm", {
      alarmName: `${appName}-api-error-rate-${envName}`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/ApiGateway",
        metricName: "5XXError",
        dimensionsMap: { ApiId: apiGatewayId },
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    void new cloudwatch.Alarm(this, "LambdaErrorAlarm", {
      alarmName: `${appName}-lambda-error-rate-${envName}`,
      metric: apiHandlerFunction.metricErrors({ period: cdk.Duration.minutes(5) }),
      threshold: 5,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    void new cloudwatch.Alarm(this, "DatabaseCpuAlarm", {
      alarmName: `${appName}-database-cpu-${envName}`,
      metric: database.metricCPUUtilization({ period: cdk.Duration.minutes(5) }),
      threshold: 80,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    void new cloudwatch.Alarm(this, "StepFunctionsFailureAlarm", {
      alarmName: `${appName}-stepfunctions-failure-${envName}`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/States",
        metricName: "ExecutionsFailed",
        dimensionsMap: { StateMachineArn: stateMachineArn },
        period: cdk.Duration.minutes(5),
        statistic: "Sum",
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cdk.CfnOutput(this, "DashboardUrl", {
      value: `https://${cdk.Aws.REGION}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards:name=${appName}-dashboard-${envName}`,
      exportName: `${appName}-dashboard-url-${envName}`,
    });
  }
}