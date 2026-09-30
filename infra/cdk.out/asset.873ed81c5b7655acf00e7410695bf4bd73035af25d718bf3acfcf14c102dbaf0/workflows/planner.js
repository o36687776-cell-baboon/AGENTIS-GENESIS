"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const ai = __importStar(require("../ai"));
const config_1 = require("../config");
const retry_1 = require("../execution/retry");
async function handler(event) {
    const config = (0, config_1.getConfig)();
    try {
        switch (event.action) {
            case "generatePlan": {
                const objective = event.objective || event.workTree?.objective;
                if (!objective) {
                    throw Object.assign(new Error("objective is required"), { name: "ValidationError" });
                }
                const plan = await ai.generatePlan({
                    objective,
                    context: event.workTree?.context,
                    existingWorkTreeId: event.workTree?.id,
                });
                const truncated = plan.tasks.slice(0, config.maxTasksPerExecution);
                // Returned as a plain business object. Step Functions stores this
                // directly on the execution state, so no API Gateway response envelope
                // is wrapped around it.
                return {
                    ...plan,
                    tasks: truncated,
                    correlationId: event.correlationId,
                    taskCount: truncated.length,
                };
            }
            default:
                throw Object.assign(new Error(`Unknown action: ${event.action}`), {
                    name: "ValidationError",
                });
        }
    }
    catch (error) {
        const classified = (0, retry_1.classifyFailure)(error);
        // Rethrow so the state machine task fails and the configured retry policy
        // decides whether it is retried. A fatal failure fails on the first pass.
        throw Object.assign(new Error(JSON.stringify({
            message: classified.message,
            name: classified.name,
            class: classified.class,
        })), { name: classified.name });
    }
}
