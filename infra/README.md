# AGENTIS GENESIS Infrastructure

AWS CDK (TypeScript) infrastructure for the AGENTIS GENESIS agentic operating environment.

## Stacks

```
infra/
├── bin/
│   └── genesis.ts              # CDK App entry point
├── lib/
│   ├── genesis-vpc-stack.ts           # VPC, Subnets, Security Groups
│   ├── genesis-database-stack.ts      # RDS MariaDB, RDS Proxy
│   ├── genesis-storage-stack.ts       # S3 Artifact Bucket
│   ├── genesis-secrets-stack.ts       # Secrets Manager
│   ├── genesis-api-stack.ts           # API Gateway, Lambda
│   ├── genesis-stepfunctions-stack.ts # Step Functions, Worker Lambdas
│   └── genesis-monitoring-stack.ts    # CloudWatch Dashboard, Alarms
├── migrations/
│   └── 001_initial_schema.sql  # MariaDB schema
├── package.json
└── tsconfig.json
```

## Quick Start

```bash
cd infra
npm install
npm run build
npm run infra:synth
ENVIRONMENT=development npm run infra:deploy
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Deployment environment | `development` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `CDK_DEFAULT_ACCOUNT` | AWS account ID | (from CLI) |

## Stack Dependencies

```
VpcStack
  ├─ DatabaseStack (needs VPC, SGs)
  ├─ StorageStack (independent)
  ├─ SecretsStack (needs Database, Storage)
  ├─ ApiStack (needs VPC, SG, Database, Storage, Secrets)
  ├─ StepFunctionsStack (needs VPC, SG, Database, Storage, Secrets, Api)
  └─ MonitoringStack (needs all above)
```

## Outputs

Each stack exports CloudFormation outputs for cross-stack references:

- VPC ID, Subnet IDs, Security Group IDs
- Database endpoint, secret ARN, proxy endpoint
- S3 bucket name/ARN
- API Gateway URL
- State Machine ARN
- Lambda function names/ARNs
- Secrets ARNs

## Database Migrations

Migrations are in `infra/migrations/` and run separately:

```bash
# From project root
DATABASE_HOST=<proxy-endpoint> DATABASE_USER=genesis_admin DATABASE_PASSWORD=<from-secret> npm run db:migrate
```

## Security Groups

| SG | Purpose | Rules |
|----|---------|-------|
| `GenesisLambdaSG` | Lambda functions | Outbound: all; Inbound: from API Gateway |
| `GenesisDBSG` | RDS MariaDB | Inbound: 3306 from Lambda SG only |
| `GenesisRDSProxySG` | RDS Proxy | Inbound: 3306 from Lambda SG |

## IAM Roles

| Role | Purpose | Key Permissions |
|------|---------|-----------------|
| `GenesisApiHandlerRole` | API Lambda | Bedrock, Secrets, S3, RDS Proxy, Step Functions |
| `GenesisWorkerRole` | Worker Lambdas | Bedrock, Secrets, S3, RDS Proxy |
| `GenesisStepFunctionsRole` | State Machine | Lambda invoke |

## Monitoring

CloudWatch Dashboard includes:
- API Gateway: Error rate, latency
- Lambda: Errors, duration, invocations
- RDS: Connections, CPU, storage
- Step Functions: Executions, duration, failures
- S3: Bucket size

Alarms:
- API 5xx errors > 10/5min
- Lambda errors > 5/5min
- RDS CPU > 80% for 15min
- Step Functions failures > 0

## Cleanup

```bash
# Development
ENVIRONMENT=development npm run infra:destroy

# Production - requires manual steps:
# 1. Disable RDS deletion protection
# 2. Empty S3 bucket
# 3. cdk destroy
```