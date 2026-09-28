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
}
export declare function getConfig(): AppConfig;
export declare function resetConfig(): void;
