"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.resetConfig = resetConfig;
let cachedConfig = null;
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
function resetConfig() {
    cachedConfig = null;
}
