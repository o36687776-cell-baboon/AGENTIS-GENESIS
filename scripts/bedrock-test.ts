#!/usr/bin/env node
/**
 * Bedrock Connectivity Test for AGENTIS GENESIS
 * Tests actual Bedrock inference
 */

import { getConfig } from "../src/server/config";
import { converse } from "../src/server/ai/bedrock";

async function main(): Promise<void> {
  console.log("AGENTIS GENESIS - Bedrock Connectivity Test");
  console.log("============================================\n");

  const config = getConfig();
  console.log(`Environment: ${config.environment}`);
  console.log(`Region: ${config.awsRegion}`);
  console.log(`Model: ${config.bedrockModelId}`);
  console.log(`Mock AI: ${config.mockAi}\n`);

  if (config.mockAi) {
    console.log("Running in MOCK mode - skipping real Bedrock call");
    console.log("Set MOCK_AI=false to test real Bedrock connection");
    process.exit(0);
  }

  const testPrompt = "Hello from AGENTIS GENESIS. Return a concise confirmation that the Bedrock connection is working.";

  try {
    console.log("Sending test prompt to Bedrock...");
    console.log(`Prompt: "${testPrompt}"\n`);

    const startTime = Date.now();
    const response = await converse({
      messages: [
        { role: "user", content: [{ text: testPrompt }] },
      ],
      inferenceConfig: {
        maxTokens: 100,
        temperature: 0.1,
      },
    });
    const latencyMs = Date.now() - startTime;

    const responseText = response.output.message.content[0]?.text || "(empty response)";

    console.log("Response received:");
    console.log(`  Text: ${responseText}`);
    console.log(`  Latency: ${latencyMs}ms`);
    console.log(`  Input tokens: ${response.usage.inputTokens}`);
    console.log(`  Output tokens: ${response.usage.outputTokens}`);
    console.log(`  Total tokens: ${response.usage.totalTokens}`);
    console.log(`  Stop reason: ${response.stopReason}`);

    console.log("\n============================================");
    console.log("Bedrock connection test PASSED ✓");
    process.exit(0);
  } catch (error) {
    console.error("\n============================================");
    console.error("Bedrock connection test FAILED ✗");
    console.error(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    
    const errorMessage = error instanceof Error ? error.message : "";
    if (errorMessage.includes("AccessDenied") || errorMessage.includes("Unauthorized")) {
      console.error("Code: BEDROCK_MODEL_ACCESS_FAILED");
    } else if (errorMessage.includes("Secret") || errorMessage.includes("credentials")) {
      console.error("Code: BEDROCK_SECRET_ACCESS_FAILED");
    } else {
      console.error("Code: BEDROCK_CONNECTION_FAILED");
    }
    process.exit(1);
  }
}

main();