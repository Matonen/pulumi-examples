# Pulumi examples

This repository contains examples for creating Azure resources using [Azure NextGen](https://www.pulumi.com/docs/reference/pkg/azure-nextgen/) provider.

## What is Pulumi?

- https://www.pulumi.com
- Infrastructure as code tool for managing cloud infrastructure.
- Use your favorite programming languages and tools
  - TypeScript
  - Python
  - Go
  - C#
- Pulumi is cloud agnostic.
  - Core providers
    - Azure
    - AWS
    - Google Cloud
  - Other providers (cloud, database, etc.)
    - Alibaba Cloud
    - Digital Ocean
    - MySQL
    - PostgreSQL
    - ...

### Key concepts

- Project
  - Is directory which contains source code.
  - Create new project: `pulumi new`
- Program
  - The code, like TypeScript code (`ìndex.ts`) where you define Azure resources what should be created.
- Stack
  - Is deployment environment, example
    - Dev
    - QA
    - Prod
  - List stacks: `pulumi stack ls`
  - Create new stack: `pulumi stack init`
  - Select stack: `pulumi stack select <stack_name>`
  - Deploy stack: `pulumi up`
  - Preview stack: `pulumi preview`
  - Remove resources: `pulumi destroy`
- State
  - Current state of the infrastructure.
  - Each stack has own state.
  - States are stored to backend:
    - Service backend (app.pulumi.com): `pulumi login `
    - local filesystem: `pulumi login --local`
    - AWS S3: `pulumi login s3://my-pulumi-state-bucket`
    - Azure Blob Storage: `pulumi login gs://my-pulumi-state-bucket`
    - Google Cloud Storage: `pulumi login azblob://my-pulumi-state-bucket`

### Configuration

- Create new configuration: `pulumi config set <key> [value]`
- Get configuration value: `pulumi config get <key>`
- Create secret:`pulumi config set --secret <key> [value]`
  - Secrets are encrypted automatically
  - Each stack has own key
  - Supported encryption providers
    - Pulumi Service
    - password
    - awskms: AWS Key Management Service (KMS)
    - azurekeyvault: Azure Key Vault
    - gcpkms: Google Cloud Key Management Service (KMS)
    - hashivault: HashiCorp Vault Transit Secrets Engine
