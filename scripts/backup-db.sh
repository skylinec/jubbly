#!/bin/bash

# Get current timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
DB_FILE="./job_applications.db"
BACKUP_FILE="${BACKUP_DIR}/job_applications_${TIMESTAMP}.db"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_FILE" ]; then
    echo "Error: Database file not found at $DB_FILE"
    exit 1
fi

# Create backup using sqlite3
echo ".backup '${BACKUP_FILE}'" | sqlite3 "$DB_FILE"

if [ $? -eq 0 ]; then
    echo "Backup created successfully at ${BACKUP_FILE}"
    # Create a compressed version
    gzip -c "${BACKUP_FILE}" > "${BACKUP_FILE}.gz"
    echo "Compressed backup created at ${BACKUP_FILE}.gz"
else
    echo "Error: Backup failed"
    exit 1
fi
