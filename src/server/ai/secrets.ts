import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { getConfig } from "../config";

export async function getSecretValue(secretArn: string, key?: string): Promise<string | null> {
  const config = getConfig();

  if (config.mockAi || config.nodeEnv === "development") {
    if (secretArn.includes("bedrock")) {
      return "mock-bedrock-api-key";
    }
    if (secretArn.includes("database")) {
      return key === "password" ? "dev_password" : "genesis_admin";
    }
    return "mock-secret-value";
  }

  const client = new SecretsManagerClient({ region: config.awsRegion });
  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await client.send(command);

  if (!response.SecretString) {
    return null;
  }

  const secret = JSON.parse(response.SecretString);
  return key ? secret[key] : response.SecretString;
}