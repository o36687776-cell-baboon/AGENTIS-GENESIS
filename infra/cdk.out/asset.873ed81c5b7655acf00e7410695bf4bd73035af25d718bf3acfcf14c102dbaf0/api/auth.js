"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPublicPath = isPublicPath;
exports.getHeader = getHeader;
exports.authenticate = authenticate;
exports.unauthorized = unauthorized;
exports.requireAuth = requireAuth;
exports.isAuthFailure = isAuthFailure;
exports.resolveOrigin = resolveOrigin;
const config_1 = require("../config");
const response_1 = require("./response");
const PUBLIC_PATHS = new Set(["/api/health"]);
function isPublicPath(method, path) {
    if (PUBLIC_PATHS.has(path))
        return true;
    return method === "OPTIONS";
}
function getHeader(event, name) {
    const headers = event.headers || {};
    const direct = headers[name] ?? headers[name.toLowerCase()];
    if (direct)
        return direct;
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
function authenticate(event) {
    const claims = event.requestContext?.authorizer?.jwt?.claims;
    const scopes = event.requestContext?.authorizer?.jwt?.scopes || [];
    if (!claims || !claims.sub) {
        return null;
    }
    return {
        subject: claims.sub,
        email: claims.email,
        username: claims["cognito:username"] || claims.username,
        scopes,
        tokenPresent: true,
    };
}
function unauthorized(event, requestId, reason) {
    return {
        statusCode: 401,
        response: (0, response_1.createResponse)(401, {
            success: false,
            error: {
                code: "UNAUTHORIZED",
                message: reason,
                requestId,
            },
        }),
    };
}
function requireAuth(event, requestId) {
    const config = (0, config_1.getConfig)();
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
function isAuthFailure(result) {
    return result.statusCode !== undefined;
}
function resolveOrigin(event) {
    const config = (0, config_1.getConfig)();
    if (config.allowedOrigins.length === 0) {
        return null;
    }
    const origin = getHeader(event, "origin");
    if (!origin)
        return null;
    return config.allowedOrigins.includes(origin) ? origin : null;
}
