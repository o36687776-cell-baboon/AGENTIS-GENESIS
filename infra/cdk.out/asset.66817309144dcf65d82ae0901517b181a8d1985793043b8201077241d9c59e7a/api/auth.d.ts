import { createResponse, EventLike } from "./response";
export interface AuthenticatedCaller {
    subject: string;
    email?: string;
    username?: string;
    scopes: string[];
    tokenPresent: boolean;
}
export type LambdaEventLike = EventLike;
export interface AuthFailure {
    statusCode: number;
    response: ReturnType<typeof createResponse>;
}
export declare function isPublicPath(method: string, path: string): boolean;
export declare function getHeader(event: LambdaEventLike, name: string): string | undefined;
/**
 * Identity is read from the API Gateway JWT authorizer context, which is only
 * populated when a valid token was verified by the gateway. We never parse or
 * trust a bearer token inside the Lambda: the gateway is the verifier, this is
 * a defence-in-depth check that an unauthenticated request never reaches a
 * handler.
 */
export declare function authenticate(event: LambdaEventLike): AuthenticatedCaller | null;
export declare function unauthorized(event: LambdaEventLike, requestId: string, reason: string): AuthFailure;
export declare function requireAuth(event: LambdaEventLike, requestId: string): {
    caller: AuthenticatedCaller;
} | AuthFailure;
export declare function isAuthFailure(result: {
    caller: AuthenticatedCaller;
} | AuthFailure): result is AuthFailure;
export declare function resolveOrigin(event: LambdaEventLike): string | null;
