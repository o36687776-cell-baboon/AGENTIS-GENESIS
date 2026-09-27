import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
export interface BedrockMessage {
    role: "user" | "assistant";
    content: Array<{
        text: string;
    }>;
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
    system?: Array<{
        text: string;
    }>;
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
export declare function getBedrockClient(): BedrockRuntimeClient;
export declare function getBedrockApiKey(): Promise<string | null>;
export declare function converse(options: BedrockConverseOptions): Promise<BedrockConverseResponse>;
export declare function converseStream(options: BedrockConverseOptions): Promise<import("@aws-sdk/client-bedrock-runtime").ConverseStreamCommandOutput>;
//# sourceMappingURL=bedrock.d.ts.map