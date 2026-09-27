# AGENTIS GENESIS - AWS Architecture Documentation

## Overview

This document describes the AWS infrastructure architecture for AGENTIS GENESIS, an operating environment for intelligent work.

## Architecture Diagram

```
                     USER
                       │
                       ▼
              AGENTIS GENESIS UI (Next.js/React)
                       │
                       ▼
              Amazon CloudFront (Frontend Hosting)
                       │
                       ▼
                Amazon API Gateway (HTTP API)
                       │
                       ▼
                Genesis API Lambda (Node.js 20)
                 /   |   \
                /    |    \
               ▼     ▼     ▼
         Bedrock  MariaDB  S3
            │        │
            │        │
      Secrets Mgr   RDS Proxy
            │
            ▼
     Bedrock API Key
```

## AWS Services

### Compute
- **AWS Lambda**: Serverless compute for API, Planner, Agent Workers, Verification
- **AWS Step Functions**: Workflow orchestration for multi-stage agent execution

### Networking
- **Amazon VPC**: Isolated network with public, private, and database subnets
- **Security Groups**: Separate SGs for Lambda, RDS Proxy, and MariaDB
- **NAT Gateway**: Outbound internet access for private subnets (Bedrock API)

### Database
- **Amazon RDS for MariaDB 10.11**: Primary application database (InnoDB)
- **RDS Proxy**: Connection pooling for Lambda-to-MariaDB connections
- **Secrets Manager**: Database credentials management

### Storage
- **Amazon S3**: Artifact storage (reports, documents, generated files)
- **S3 Lifecycle**: Transition to IA/Glacier for cost optimization

### AI/ML
- **Amazon Bedrock**: Foundation model access (Claude 3.5 Sonnet, GPT-4.5, etc.)
- **Bedrock API Key**: Stored in Secrets Manager, accessed only by backend

### API & Integration
- **API Gateway HTTP API**: RESTful API with CORS support
- **Lambda Proxy Integration**: Direct Lambda invocation

### Observability
- **CloudWatch Logs**: Structured logging with request correlation
- **CloudWatch Metrics**: Custom dashboards and alarms
- **X-Ray Tracing**: Distributed tracing for Step Functions

### Security
- **IAM Roles**: Least-privilege roles per service
- **Secrets Manager**: All credentials stored securely
- **VPC Isolation**: Database in private isolated subnets
- **TLS Everywhere**: Encryption in transit and at rest

## Infrastructure as Code

### CDK Stacks (TypeScript)

| Stack | Resources |
|-------|-----------|
| `GenesisVpcStack` | VPC, Subnets, Security Groups, NAT Gateways |
| `GenesisDatabaseStack` | RDS MariaDB, RDS Proxy, DB Subnet Group, Secrets |
| `GenesisStorageStack` | S3 Bucket with lifecycle policies |
| `GenesisSecretsStack` | Bedrock API Key secret |
| `GenesisApiStack` | API Gateway, API Lambda, IAM Roles |
| `GenesisStepFunctionsStack` | State Machine, Planner/Agent/Verification Lambdas |
| `GenesisMonitoringStack` | CloudWatch Dashboard, Alarms, Log Groups |

### Deployment Commands

```bash
# Install infrastructure dependencies
cd infra && npm install

# Synthesize CloudFormation templates
npm run infra:synth

# Deploy to development
ENVIRONMENT=development npm run infra:deploy

# Deploy to production
ENVIRONMENT=production npm run infra:deploy

# View differences
npm run infra:diff

# Destroy (development only)
ENVIRONMENT=development npm run infra:destroy
```

## Database Schema

### Core Tables

- **work_trees**: Work tree definitions with objectives and status
- **agents**: Agent definitions with capabilities and status
- **tasks**: Task queue with priorities and dependencies
- **artifacts**: S3-backed artifact metadata
- **approvals**: Human approval workflow state
- **activity_events**: Append-only audit trail
- **memories**: Persistent memory with confidence levels
- **knowledge_items**: Structured knowledge base
- **agent_runs**: Agent execution records
- **tool_runs**: Tool invocation records
- **audit_events**: Security audit log
- **work_tree_plans**: Planner output storage

### Migration Management

```bash
# Run migrations
npm run db:migrate

# Set required environment variables:
# DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
```

## API Endpoints

### Health
- `GET /api/health` - Service health check

### Work Trees
- `GET /api/work-trees` - List all work trees
- `POST /api/work-trees` - Create work tree
- `GET /api/work-trees/{id}` - Get work tree with full context
- `POST /api/work-trees/{id}/plan` - Generate execution plan
- `POST /api/work-trees/{id}/run` - Start execution
- `POST /api/work-trees/{id}/pause` - Pause execution
- `POST /api/work-trees/{id}/resume` - Resume execution
- `GET /api/work-trees/{id}/activity` - Get activity feed

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/{id}` - Get agent details

### Tasks
- `GET /api/tasks` - List all tasks

### Approvals
- `POST /api/approvals/{id}/approve` - Approve request
- `POST /api/approvals/{id}/reject` - Reject request

### AI
- `POST /api/ai/chat` - Chat with Genesis AI

## Bedrock Integration

### Configuration

Required environment variables:
- `BEDROCK_MODEL_ID`: Model identifier (e.g., `anthropic.claude-3-5-sonnet-20241022-v2:0`)
- `BEDROCK_API_KEY_SECRET_ARN`: Secrets Manager ARN for API key

### Security Rules

1. **NEVER** expose Bedrock credentials to frontend
2. **ALWAYS** route through API Gateway → Lambda → Bedrock
3. API key stored in Secrets Manager, retrieved at runtime
4. Use Converse API for structured conversations

### Model Selection

Supported models (region-dependent):
- `anthropic.claude-3-5-sonnet-20241022-v2:0`
- `anthropic.claude-3-haiku-20240307-v1:0`
- `amazon.nova-pro-v1:0`
- `meta.llama3-1-70b-instruct-v1:0`

## Local Development

### Prerequisites

- Node.js 20+
- AWS CLI configured
- Docker (for local MariaDB)

### Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### Mock Mode

Set `MOCK_AI=true` for deterministic responses without Bedrock:
- Planner returns structured mock plans
- Agent workers simulate execution
- Verification always passes

### Running Locally

```bash
# Start MariaDB (Docker)
docker run -d --name mariadb \
  -e MYSQL_ROOT_PASSWORD=dev_password \
  -e MYSQL_DATABASE=genesis \
  -e MYSQL_USER=genesis_admin \
  -e MYSQL_PASSWORD=dev_password \
  -p 3306:3306 \
  mariadb:10.11

# Run migrations
DATABASE_HOST=localhost DATABASE_USER=genesis_admin DATABASE_PASSWORD=dev_password npm run db:migrate

# Start frontend
npm run dev
```

## Bedrock Setup

### Prerequisites

1. **Select AWS Region**: Ensure desired model is available in region
2. **Request Model Access**: Enable model in Bedrock console
3. **Create API Key**: Generate Bedrock API key
4. **Store in Secrets Manager**: Create secret `genesis/bedrock/api-key`

### Deployment Steps

1. Configure `BEDROCK_MODEL_ID` in environment
2. Deploy infrastructure: `npm run infra:deploy`
3. Run connectivity test: `npm run bedrock:test`

### Troubleshooting

| Error | Cause | Resolution |
|-------|-------|------------|
| `BEDROCK_NOT_CONFIGURED` | Missing secret ARN | Set `BEDROCK_API_KEY_SECRET_ARN` |
| `BEDROCK_SECRET_ACCESS_FAILED` | IAM permissions | Grant `secretsmanager:GetSecretValue` |
| `BEDROCK_MODEL_ACCESS_FAILED` | Model not enabled | Enable model in Bedrock console |
| `ValidationException` | Invalid model ID | Check model ID for region |

## Cost Optimization

### Development
- Single NAT Gateway
- db.t4g.medium RDS instance
- 7-day backup retention
- No deletion protection
- S3 auto-delete on stack destroy

### Production
- Multi-AZ NAT Gateways
- db.r6g.xlarge RDS instance
- 30-day backup retention
- Deletion protection enabled
- Performance Insights enabled
- Enhanced monitoring

## Security Checklist

- [ ] No hardcoded credentials in source
- [ ] All secrets in Secrets Manager
- [ ] Database in private isolated subnets
- [ ] RDS Proxy for connection pooling
- [ ] Least-privilege IAM roles
- [ ] CloudWatch log retention configured
- [ ] API Gateway CORS restricted to known origins
- [ ] S3 bucket encryption enabled
- [ ] S3 public access blocked
- [ ] TLS 1.2+ enforced everywhere

## Teardown

```bash
# Development
ENVIRONMENT=development npm run infra:destroy

# Production (manual steps required)
# 1. Disable deletion protection on RDS
# 2. Empty S3 bucket
# 3. Run cdk destroy
```

## Support

For issues with this infrastructure, check:
1. CloudWatch Logs for Lambda errors
2. CloudWatch Metrics for service health
3. Step Functions execution history for workflow failures
4. RDS Performance Insights for database issues