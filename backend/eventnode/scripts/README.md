# Database Migration Tools

This toolset is a collection of scripts used to migrate data from an OLD database to a NEW database.

## Prerequisites

- Node.js and npm/yarn must be installed.
- PostgreSQL client tools (psql) must be installed.
- Python 3 must be installed.
- TypeScript and ts-node must be installed.

## Installation

1. Install required packages:

```bash
npm install
# or
yarn
```

2. Configure `.env` file:

Create a `.env` file in the project root directory and configure it as follows:

```
# OLD Database Configuration
OLD_AWS_RDS_DB_HOST=old-db-host
OLD_AWS_RDS_DB_PORT=5432
OLD_AWS_RDS_DB_USER=username
OLD_AWS_RDS_DB_PASSWORD=password
OLD_AWS_RDS_DB_NAME=callput_common    

# NEW Database Configuration
AWS_RDS_DB_HOST=new-db-host
AWS_RDS_DB_PORT=5432
AWS_RDS_DB_USER=username
AWS_RDS_DB_PASSWORD=password
AWS_RDS_DB_NAME=callput_common
```

## Usage

### Single Entity Migration (Recommended)

To migrate entities one by one, use the following command:

```bash
bash scripts/migrate-entity.sh
```

This command runs in interactive mode, allowing you to select the entity and batch size for migration.

Alternatively, you can specify the entity and batch size directly:

```bash
bash scripts/migrate-entity.sh position 500
```

The single entity migration follows these steps:

1. Display list of available entities.
2. Select the entity to migrate.
3. Configure the batch size.
4. Execute schema comparison to verify entity structure (automatic).
5. Review schema comparison results and choose whether to proceed.
6. Execute the migration for the selected entity.

**Improved Features:**
- Schema comparison is performed automatically to identify issues before migration.
- Provides an option to cancel with a warning message if critical issues are found.
- Automatically suggests workarounds if connection to the OLD database fails.

### Full Migration

To migrate all entities at once:

```bash
bash scripts/migrate-old-to-new.sh
```

This script provides the following steps:

1. **Schema Comparison**: Compares the schemas of the OLD and NEW databases and analyzes differences.
2. **TypeORM Migration**: Uses TypeORM to migrate data.
3. **PostgreSQL Direct Migration**: Uses PostgreSQL commands to migrate data.
4. **All Steps**: Executes all of the above steps in order.

### Recommended Execution Order

Considering schema dependencies, it is recommended to proceed with migration in the following order:

1. `synced-block`
2. `synced-request-index`
3. `position`
4. `position-history`
5. Other entities

## Script Descriptions

### schema-compare.ts

Compares the schemas of two databases and analyzes differences. It is recommended to run this script before migration to check for differences in tables and columns.

```bash
npx ts-node scripts/schema-compare.ts
```

### typeorm-migrate-single.ts

Uses TypeORM to migrate data for a single entity. Takes the entity key and optionally the batch size as arguments. This script automatically performs schema comparison.

```bash
npx ts-node scripts/typeorm-migrate-single.ts position 500
```

### typeorm-migrate.ts

Uses TypeORM to migrate data for all entities.

```bash
npx ts-node scripts/typeorm-migrate.ts
```

### migrate-db.sh

Uses PostgreSQL commands directly to migrate data. This method is good for migrating large amounts of data quickly.

```bash
bash scripts/migrate-db.sh
```

## Logs

All migration tasks generate log files in the `logs` directory. Refer to these log files to check migration progress and errors.

## Troubleshooting

### OLD Database Connection Failure

- Verify if the OLD database host is accessible.
- For AWS RDS, ensure your current IP is allowed in the security group settings.
- If using an internal VPC IP, try setting up an SSH tunnel:
  ```bash
  ssh -L 5433:internal-IP:5432 user@accessible-EC2-instance -N
  ```
  Then set `OLD_AWS_RDS_DB_HOST=localhost` and `OLD_AWS_RDS_DB_PORT=5433` in the `.env` file.

## Precautions

1. Always create backups of both OLD and NEW databases before migration.
2. Proceed with caution if there are schema differences, as data loss is possible.
3. For large tables, adjust the batch size appropriately to prevent memory issues.
4. It is recommended to temporarily pause write operations to the database during migration.