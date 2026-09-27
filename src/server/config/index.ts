export interface AppConfig {
  nodeEnv: string;
  awsRegion: string;
  environment: string;
  databaseSecretArn: string;
  databaseProxyEndpoint: string;
  databaseName: string;
  databasePort: number;
  artifactBucketName: string;
  bedrockApiKeySecretArn: string;
  bedrockModelId: string;
  mockAi: boolean;
  apiBaseUrl: string;
}

let cachedConfig: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const config: AppConfig = {
    nodeEnv: process.env.NODE_ENV || "development",
    awsRegion: process.env.AWS_REGION || "us-east-1",
    environment: process.env.ENVIRONMENT || "development",
    databaseSecretArn: process.env.DATABASE_SECRET_ARN || "",
    databaseProxyEndpoint: process.env.DATABASE_PROXY_ENDPOINT || "",
    databaseName: process.env.DATABASE_NAME || "genesis",
    databasePort: parseInt(process.env.DATABASE_PORT || "3306", 10),
    artifactBucketName: process.env.ARTIFACT_BUCKET_NAME || "",
    bedrockApiKeySecretArn: process.env.BEDROCK_API_KEY_SECRET_ARN || "",
    bedrockModelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0",
    mockAi: process.env.MOCK_AI === "true",
    apiBaseUrl: process.env.API_BASE_URL || "",
  };

  cachedConfig = config;
  return config;
}

export function resetConfig(): void {
  cachedConfig = null;
}