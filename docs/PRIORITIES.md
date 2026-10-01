# Persistent priorities

These items stay open until they are verified complete. Do not let new work
close them implicitly.

```text
P0 — AWS deployment access
P0 — Deployment IAM role / least-privilege deployment identity
P0 — Remaining shell / deployment processes
P0 — CDK bootstrap / diff / deployment
P0 — ROCKERFELLER live validation

P1 — TELEMETRY / OBSERVABILITY AUDIT
P2 — ATLAS live validation
```

## AWS deployment access (P0)

BLOCKED. Single root cause: no AWS credentials in this container.

- No `~/.aws`, no `AWS_*` variables, no AWS CLI, `genesis-kilo` does not resolve.
- `cdk diff` fails with "Unable to resolve AWS account to use".
- `eu-north-1` is not a CDK-default region and needs an explicit bootstrap.

## Telemetry / observability audit (P1)

NOT COMPLETE. Static audit performed; live proof impossible without deployment.

Required traceable chain, and its actual state:

| Stage | Identifier | Status |
|---|---|---|
| API | correlationId | Present, 13 references |
| Work Tree | workTreeId | Present |
| Task | taskId | Present |
| Agent | agentRunId | Present (agent_runs table) |
| Step Functions | executionArn | Present |
| Bedrock / Google | correlationId | Present in activity metadata |

Identifier gaps found:

- `executionId` is not a first-class field. The Step Functions execution ARN is
  stored as `work_trees.execution_arn`; there is no separate numeric execution
  identifier carried through the worker stages.
- `agentExecutionId` does not exist as a named identifier. `agentRunId` serves
  the same role and appears only in activity-event metadata, not in the
  artifacts or task outputs.
- Neither the ATLAS nor the ROCKERFELLER pass reads correlationId directly; they
  receive it from the worker and write it only into their JSON manifests.

Metric coverage gaps in `infra/lib/genesis-monitoring-stack.ts`:

- Present: `AWS/ApiGateway` (6 metrics), `AWS/States` (7), `AWS/S3` (1).
- Absent: `AWS/Lambda`, `AWS/RDS` / `AWS/RDSProxy`, `AWS/SQS` (no DLQ alarm),
  and any Bedrock metric.
- 4 alarms total. The execution DLQ is documented in the Step Functions stack
  as alarming when messages queue, but no `AWS/SQS` metric or alarm exists in
  the monitoring stack, so that claim is currently unbacked.
- X-Ray is active on the API handler and the state machine
  (`tracingEnabled: true`), but the planner, agent worker and verification
  Lambdas have no tracing configuration.

Telemetry captured but not aggregated:

- Bedrock token counts are persisted per agent run (`agent_runs.input_tokens`,
  `output_tokens`).
- Bedrock latency is never measured. `withRetry` records no timing.
- Provider latency is measured per call and written into the JSON evidence
  manifest, but never into the database, so it is not queryable across runs.
- Throttling is classified (`FailureClass.throttled`) and the classification is
  written to activity metadata, but retry counts are not persisted as a metric.

Not implemented at all:

- Loop and stagnation detection (`Genesis.Atlas.LoopDetected`,
  `Genesis.Atlas.Stagnant`, or any equivalent). Nothing in the server detects a
  repeated identical operation or a stalled execution.

## Validation rule

Nothing in this file may be reported as verified on the basis of static
inspection. A stage moves to COMPLETE only when a deployed end-to-end trace
proves it.