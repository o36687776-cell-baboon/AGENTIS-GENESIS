import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface GenesisStorageStackProps extends cdk.StackProps {
  envName: string;
  appName: string;
}

export class GenesisStorageStack extends cdk.Stack {
  public readonly artifactBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: GenesisStorageStackProps) {
    super(scope, id, props);

    const { envName, appName } = props;

    this.artifactBucket = new s3.Bucket(this, "ArtifactBucket", {
      bucketName: `${appName}-artifacts-${envName}-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      lifecycleRules: [
        {
          id: "delete-incomplete-multipart-uploads",
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
        {
          id: "transition-to-ia",
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: envName === "production" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: envName !== "production",
      cors: [
        {
          allowedHeaders: ["*"],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD],
          allowedOrigins: ["*"],
          maxAge: 3600,
        },
      ],
    });

    new cdk.CfnOutput(this, "ArtifactBucketName", {
      value: this.artifactBucket.bucketName,
      exportName: `${appName}-artifact-bucket-name-${envName}`,
    });

    new cdk.CfnOutput(this, "ArtifactBucketArn", {
      value: this.artifactBucket.bucketArn,
      exportName: `${appName}-artifact-bucket-arn-${envName}`,
    });
  }
}