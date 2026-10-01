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
  stateMachineArn: string;
  cognitoIssuer: string;
  cognitoAudience: string;
  authRequired: boolean;
  allowedOrigins: string[];
  artifactUrlTtlSeconds: number;
  maxTasksPerExecution: number;
  maxOutputChars: number;
  /**
   * Secrets Manager ARN holding the Google marketing credential used by
   * ROCKERFELLER providers. Unset means every provider reports UNAVAILABLE,
   * which is the correct state when no credential has been provisioned.
   */
  googleMarketingSecretArn: string;
}

let cachedConfig: AppConfig | null = null;

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "true";
}

function parseIntOr(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
    databasePort: parseIntOr(process.env.DATABASE_PORT, 3306),
    artifactBucketName: process.env.ARTIFACT_BUCKET_NAME || "",
    bedrockApiKeySecretArn: process.env.BEDROCK_API_KEY_SECRET_ARN || "",
    bedrockModelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0",
    mockAi: process.env.MOCK_AI === "true",
    apiBaseUrl: process.env.API_BASE_URL || "",
    stateMachineArn: process.env.STATE_MACHINE_ARN || "",
    cognitoIssuer: process.env.COGNITO_ISSUER || "",
    cognitoAudience: process.env.COGNITO_AUDIENCE || process.env.COGNITO_CLIENT_ID || "",
    authRequired: parseBool(process.env.AUTH_REQUIRED, true),
    allowedOrigins: parseList(process.env.ALLOWED_ORIGINS),
    artifactUrlTtlSeconds: parseIntOr(process.env.ARTIFACT_URL_TTL_SECONDS, 900),
    maxTasksPerExecution: parseIntOr(process.env.MAX_TASKS_PER_EXECUTION, 25),
    maxOutputChars: parseIntOr(process.env.MAX_OUTPUT_CHARS, 20000),
    googleMarketingSecretArn: process.env.GOOGLE_MARKETING_SECRET_ARN || "",
  };

  cachedConfig = config;
  return config;
}

export function resetConfig(): void {
  cachedConfig = null;
}
