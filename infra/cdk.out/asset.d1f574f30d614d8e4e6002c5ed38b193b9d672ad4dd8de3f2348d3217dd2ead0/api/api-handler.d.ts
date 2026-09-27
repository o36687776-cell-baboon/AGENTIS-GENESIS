interface ApiEvent {
    headers: Record<string, string>;
    requestContext: {
        requestId: string;
        http: {
            method: string;
            path: string;
        };
    };
    pathParameters?: Record<string, string>;
    body?: string;
}
interface ApiResult {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}
export declare function handler(event: ApiEvent): Promise<ApiResult>;
export {};
//# sourceMappingURL=api-handler.d.ts.map