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

export function createResponse<T>(statusCode: number, body: ApiResponseBody<T>): ApiResult {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

export function ok<T>(data: T): ApiResponseBody<T> {
  return { success: true, data };
}

export function fail(
  code: string,
  message: string,
  requestId: string
): ApiResponseBody<never> {
  return { success: false, error: { code, message, requestId } };
}

export function statusForError(code: string): number {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    default:
      return 500;
  }
}

export function parseBody(event: EventLike): unknown {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

export function readPathParam(
  event: EventLike,
  name: string,
  pattern: RegExp
): string | undefined {
  const fromParams = event.pathParameters?.[name];
  if (fromParams) return fromParams;

  // The gateway declares explicit route templates, so pathParameters carries
  // the captured segment. The pattern match is a fallback for invocations that
  // reach the function without them, such as a direct function invoke, and it
  // must be kept consistent with the route the router matched on.
  const path = event.requestContext?.http?.path || "";
  const match = path.match(pattern);
  return match?.[1];
}
