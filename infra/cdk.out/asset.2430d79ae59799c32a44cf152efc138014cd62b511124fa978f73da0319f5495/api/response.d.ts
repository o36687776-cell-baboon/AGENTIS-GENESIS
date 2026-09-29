export interface ApiErrorBody {
    code: string;
    message: string;
    requestId: string;
}
export interface ApiResponseBody<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiErrorBody;
}
export interface ApiResult {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
}
export interface EventLike {
    headers: Record<string, string>;
    requestContext: {
        requestId: string;
        authorizer?: {
            jwt?: {
                claims?: {
                    sub?: string;
                    email?: string;
                    username?: string;
                    "cognito:username"?: string;
                };
                scopes?: string[];
            };
        };
        http: {
            method: string;
            path: string;
        };
    };
    pathParameters?: Record<string, string>;
    body?: string;
}
export declare function createResponse<T>(statusCode: number, body: ApiResponseBody<T>): ApiResult;
export declare function ok<T>(data: T): ApiResponseBody<T>;
export declare function fail(code: string, message: string, requestId: string): ApiResponseBody<never>;
export declare function statusForError(code: string): number;
export declare function parseBody(event: EventLike): unknown;
export declare function readPathParam(event: EventLike, name: string, pattern: RegExp): string | undefined;
