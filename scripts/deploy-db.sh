#!/bin/bash

# Create backup
./scripts/backup-db.sh

if [ $? -ne 0 ]; then
    echo "Backup failed, aborting deployment"
    exit 1
fi

# Get latest backup file
LATEST_BACKUP=$(ls -t ./backups/job_applications_*.db.gz | head -n1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "No backup file found"
    exit 1
fi

# Deploy to production (modify these variables for your environment)
PROD_SERVER="user@your-production-server"
PROD_PATH="/path/to/jubbly"

# Copy to production
scp "$LATEST_BACKUP" "${PROD_SERVER}:${PROD_PATH}/backups/"

# SSH into production and restore
ssh "$PROD_SERVER" "cd ${PROD_PATH} && \
    gunzip backups/$(basename "$LATEST_BACKUP") && \
    ./scripts/restore-db.sh backups/$(basename "$LATEST_BACKUP" .gz)"
