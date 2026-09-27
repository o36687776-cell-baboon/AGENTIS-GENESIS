import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand, Tool, ToolConfiguration, ToolChoice } from "@aws-sdk/client-bedrock-runtime";
import { getConfig } from "../config";
import { getSecretValue } from "./secrets";

export interface BedrockMessage {
  role: "user" | "assistant";
  content: Array<{ text: string }>;
}

export interface BedrockToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface BedrockTool {
  toolSpec: BedrockToolSpec;
}

export interface BedrockConverseOptions {
  messages: BedrockMessage[];
  system?: Array<{ text: string }>;
  tools?: BedrockTool[];
  inferenceConfig?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  };
}

export interface BedrockConverseResponse {
  output: {
    message: BedrockMessage;
  };
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metrics: {
    latencyMs: number;
  };
}

function toBedrockTool(tool: BedrockTool): Tool {
  return {
    toolSpec: {
      name: tool.toolSpec.name,
      description: tool.toolSpec.description,
      inputSchema: { json: tool.toolSpec.inputSchema },
    },
  };
}

function toToolConfiguration(tools?: BedrockTool[]): ToolConfiguration | undefined {
  if (!tools || tools.length === 0) return undefined;
  return { tools: tools.map(toBedrockTool) };
}

let bedrockClient: BedrockRuntimeClient | null = null;

export function getBedrockClient(): BedrockRuntimeClient {
  if (bedrockClient) {
    return bedrockClient;
  }

  const config = getConfig();
  bedrockClient = new BedrockRuntimeClient({ region: config.awsRegion });
  return bedrockClient;
}

export async function getBedrockApiKey(): Promise<string | null> {
  const config = getConfig();

  if (config.mockAi || config.nodeEnv === "development") {
    return "mock-api-key";
  }

  if (!config.bedrockApiKeySecretArn) {
    return null;
  }

  return getSecretValue(config.bedrockApiKeySecretArn, "apiKey");
}

export async function converse(options: BedrockConverseOptions): Promise<BedrockConverseResponse> {
  const config = getConfig();
  const client = getBedrockClient();

  const command = new ConverseCommand({
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
    output: { message: response.output?.message as BedrockMessage },
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

export async function converseStream(options: BedrockConverseOptions) {
  const config = getConfig();
  const client = getBedrockClient();

  const command = new ConverseStreamCommand({
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