import { getConfig } from "../config";
import { createResponse, EventLike } from "./response";

export interface AuthenticatedCaller {
  subject: string;
  email?: string;
  username?: string;
  scopes: string[];
  tokenPresent: boolean;
}

type JwtClaims = {
  sub?: string;
  email?: string;
  username?: string;
  "cognito:username"?: string;
};

export type LambdaEventLike = EventLike;

export interface AuthFailure {
  statusCode: number;
  response: ReturnType<typeof createResponse>;
}

const PUBLIC_PATHS = new Set(["/api/health"]);

export function isPublicPath(method: string, path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  return method === "OPTIONS";
}

export function getHeader(event: LambdaEventLike, name: string): string | undefined {
  const headers = event.headers || {};
  const direct = headers[name] ?? headers[name.toLowerCase()];
  if (direct) return direct;
  const match = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  return match ? headers[match] : undefined;
}

/**
 * Identity is read from the API Gateway JWT authorizer context, which is only
 * populated when a valid token was verified by the gateway. We never parse or
 * trust a bearer token inside the Lambda: the gateway is the verifier, this is
 * a defence-in-depth check that an unauthenticated request never reaches a
 * handler.
 */
export function authenticate(event: LambdaEventLike): AuthenticatedCaller | null {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const scopes = event.requestContext?.authorizer?.jwt?.scopes || [];

  if (!claims || !claims.sub) {
    return null;
  }

  return {
    subject: claims.sub,
    email: claims.email,
    username: (claims["cognito:username"] as string) || claims.username,
    scopes,
    tokenPresent: true,
  };
}

export function unauthorized(
  event: LambdaEventLike,
  requestId: string,
  reason: string
): AuthFailure {
  return {
    statusCode: 401,
    response: createResponse(401, {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: reason,
        requestId,
      },
    }),
  };
}

export function requireAuth(
  event: LambdaEventLike,
  requestId: string
): { caller: AuthenticatedCaller } | AuthFailure {
  const config = getConfig();
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  if (isPublicPath(method, path)) {
    return { caller: { subject: "anonymous", scopes: [], tokenPresent: false } };
  }

  if (!config.authRequired) {
    return {
      caller: {
        subject: getHeader(event, "x-genesis-actor") || "local-development",
        scopes: [],
        tokenPresent: false,
      },
    };
  }

  const caller = authenticate(event);
  if (!caller) {
    return unauthorized(event, requestId, "A valid access token is required");
  }

  return { caller };
}

export function isAuthFailure(
  result: { caller: AuthenticatedCaller } | AuthFailure
): result is AuthFailure {
  return (result as AuthFailure).statusCode !== undefined;
}

export function resolveOrigin(event: LambdaEventLike): string | null {
  const config = getConfig();
  if (config.allowedOrigins.length === 0) {
    return null;
  }
  const origin = getHeader(event, "origin");
  if (!origin) return null;
  return config.allowedOrigins.includes(origin) ? origin : null;
}
