#!/usr/bin/env node
/**
 * AWS Health Check Script for AGENTIS GENESIS
 * Verifies connectivity to all AWS services
 */

import { getConfig } from "../src/server/config";
import { healthCheck as dbHealthCheck } from "../src/server/database";
import { getBedrockApiKey } from "../src/server/ai/secrets";
import { BedrockRuntimeClient, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function checkDatabase(): Promise<{ ok: boolean; error?: string }> {
  try {
    const healthy = await dbHealthCheck();
    return { ok: healthy };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function checkSecretsManager(): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  if (!config.bedrockApiKeySecretArn) {
    return { ok: false, error: "BEDROCK_API_KEY_SECRET_ARN not configured" };
  }
  try {
    const client = new SecretsManagerClient({ region: config.awsRegion });
    await client.send(new GetSecretValueCommand({ SecretId: config.bedrockApiKeySecretArn }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function checkBedrock(): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  if (config.mockAi) {
    return { ok: true, error: "Running in mock mode" };
  }
  try {
    const client = new BedrockRuntimeClient({ region: config.awsRegion });
    await client.send(new ListFoundationModelsCommand({}));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function checkS3(): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  if (!config.artifactBucketName) {
    return { ok: false, error: "ARTIFACT_BUCKET_NAME not configured" };
  }
  try {
    const client = new S3Client({ region: config.awsRegion });
    await client.send(new HeadBucketCommand({ Bucket: config.artifactBucketName }));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function main(): Promise<void> {
  console.log("AGENTIS GENESIS - AWS Health Check");
  console.log("===================================\n");

  const config = getConfig();
  console.log(`Environment: ${config.environment}`);
  console.log(`Region: ${config.awsRegion}`);
  console.log(`Mock AI: ${config.mockAi}\n`);

  const checks = [
    { name: "Database (MariaDB)", check: checkDatabase },
    { name: "Secrets Manager", check: checkSecretsManager },
    { name: "Amazon Bedrock", check: checkBedrock },
    { name: "Amazon S3", check: checkS3 },
  ];

  let allPassed = true;

  for (const { name, check } of checks) {
    process.stdout.write(`Checking ${name}... `);
    const result = await check();
    if (result.ok) {
      console.log("✓ OK");
    } else {
      console.log("✗ FAILED");
      console.log(`  Error: ${result.error}`);
      allPassed = false;
    }
  }

  console.log("\n===================================");
  if (allPassed) {
    console.log("All checks passed ✓");
    process.exit(0);
  } else {
    console.log("Some checks failed ✗");
    process.exit(1);
  }
}

main();