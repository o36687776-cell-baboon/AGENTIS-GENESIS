"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.resetConfig = resetConfig;
let cachedConfig = null;
function parseList(value) {
    if (!value)
        return [];
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}
function parseBool(value, fallback) {
    if (value === undefined)
        return fallback;
    return value === "true";
}
function parseIntOr(value, fallback) {
    const parsed = parseInt(value || "", 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function getConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }
    const config = {
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
function resetConfig() {
    cachedConfig = null;
}
