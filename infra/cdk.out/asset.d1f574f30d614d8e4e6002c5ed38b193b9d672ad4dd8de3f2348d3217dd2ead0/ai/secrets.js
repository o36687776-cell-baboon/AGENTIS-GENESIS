"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecretValue = getSecretValue;
const client_secrets_manager_1 = require("@aws-sdk/client-secrets-manager");
const config_1 = require("../config");
async function getSecretValue(secretArn, key) {
    const config = (0, config_1.getConfig)();
    if (config.mockAi || config.nodeEnv === "development") {
        if (secretArn.includes("bedrock")) {
            return "mock-bedrock-api-key";
        }
        if (secretArn.includes("database")) {
            return key === "password" ? "dev_password" : "genesis_admin";
        }
        return "mock-secret-value";
    }
    const client = new client_secrets_manager_1.SecretsManagerClient({ region: config.awsRegion });
    const command = new client_secrets_manager_1.GetSecretValueCommand({ SecretId: secretArn });
    const response = await client.send(command);
    if (!response.SecretString) {
        return null;
    }
    const secret = JSON.parse(response.SecretString);
    return key ? secret[key] : response.SecretString;
}
//# sourceMappingURL=secrets.js.map