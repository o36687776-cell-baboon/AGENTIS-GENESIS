"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBedrockClient = getBedrockClient;
exports.getBedrockApiKey = getBedrockApiKey;
exports.converse = converse;
exports.converseStream = converseStream;
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const config_1 = require("../config");
const secrets_1 = require("./secrets");
function toBedrockTool(tool) {
    return {
        toolSpec: {
            name: tool.toolSpec.name,
            description: tool.toolSpec.description,
            inputSchema: { json: tool.toolSpec.inputSchema },
        },
    };
}
function toToolConfiguration(tools) {
    if (!tools || tools.length === 0)
        return undefined;
    return { tools: tools.map(toBedrockTool) };
}
let bedrockClient = null;
function getBedrockClient() {
    if (bedrockClient) {
        return bedrockClient;
    }
    const config = (0, config_1.getConfig)();
    bedrockClient = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: config.awsRegion });
    return bedrockClient;
}
async function getBedrockApiKey() {
    const config = (0, config_1.getConfig)();
    if (config.mockAi || config.nodeEnv === "development") {
        return "mock-api-key";
    }
    if (!config.bedrockApiKeySecretArn) {
        return null;
    }
    return (0, secrets_1.getSecretValue)(config.bedrockApiKeySecretArn, "apiKey");
}
async function converse(options) {
    const config = (0, config_1.getConfig)();
    const client = getBedrockClient();
    const command = new client_bedrock_runtime_1.ConverseCommand({
        modelId: config.bedrockModelId,
        messages: options.messages,
        system: options.system,
        toolConfig: toToolConfiguration(options.tools),
        inferenceConfig: options.inferenceConfig || {
            maxTokens: 4096,
            temperature: 0.3,
            topP: 0.9,
        },
    });
    const response = await client.send(command);
    return {
        output: { message: response.output?.message },
        stopReason: response.stopReason || "end_turn",
        usage: {
            inputTokens: response.usage?.inputTokens || 0,
            outputTokens: response.usage?.outputTokens || 0,
            totalTokens: (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0),
        },
        metrics: {
            latencyMs: response.metrics?.latencyMs || 0,
        },
    };
}
async function converseStream(options) {
    const config = (0, config_1.getConfig)();
    const client = getBedrockClient();
    const command = new client_bedrock_runtime_1.ConverseStreamCommand({
        modelId: config.bedrockModelId,
        messages: options.messages,
        system: options.system,
        toolConfig: toToolConfiguration(options.tools),
        inferenceConfig: options.inferenceConfig || {
            maxTokens: 4096,
            temperature: 0.3,
            topP: 0.9,
        },
    });
    return client.send(command);
}
//# sourceMappingURL=bedrock.js.map