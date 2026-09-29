"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createResponse = createResponse;
exports.ok = ok;
exports.fail = fail;
exports.statusForError = statusForError;
exports.parseBody = parseBody;
exports.readPathParam = readPathParam;
function createResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
        },
        body: JSON.stringify(body),
    };
}
function ok(data) {
    return { success: true, data };
}
function fail(code, message, requestId) {
    return { success: false, error: { code, message, requestId } };
}
function statusForError(code) {
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
function parseBody(event) {
    if (!event.body)
        return null;
    try {
        return JSON.parse(event.body);
    }
    catch {
        return null;
    }
}
function readPathParam(event, name, pattern) {
    const fromParams = event.pathParameters?.[name];
    if (fromParams)
        return fromParams;
    // The HTTP API is configured with a catch-all proxy route, so path parameters
    // are not guaranteed to be populated. Derive the value from the path itself
    // as a fallback, using the same expression the router matched on.
    const path = event.requestContext?.http?.path || "";
    const match = path.match(pattern);
    return match?.[1];
}
