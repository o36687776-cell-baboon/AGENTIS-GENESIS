import * as cdk from "aws-cdk-lib";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface GenesisSecretsStackProps extends cdk.StackProps {
  envName: string;
  appName: string;
}

export class GenesisSecretsStack extends cdk.Stack {
  public readonly bedrockApiKeySecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: GenesisSecretsStackProps) {
    super(scope, id, props);

    const { envName, appName } = props;

    this.bedrockApiKeySecret = new secretsmanager.Secret(this, "BedrockApiKeySecret", {
      secretName: `${appName}/bedrock/api-key-${envName}`,
      description: "Amazon Bedrock API key for Genesis AI service",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ keyType: "bedrock-api-key" }),
        generateStringKey: "apiKey",
        excludeCharacters: '"@/\\',
        passwordLength: 64,
      },
    });

    new cdk.CfnOutput(this, "BedrockApiKeySecretArn", {
      value: this.bedrockApiKeySecret.secretArn,
      exportName: `${appName}-bedrock-api-key-secret-arn-${envName}`,
    });

    new cdk.CfnOutput(this, "BedrockApiKeySecretName", {
      value: this.bedrockApiKeySecret.secretName,
      exportName: `${appName}-bedrock-api-key-secret-name-${envName}`,
    });
  }
}