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
}
export declare function getConfig(): AppConfig;
export declare function resetConfig(): void;
