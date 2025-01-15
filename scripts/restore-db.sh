#!/bin/bash

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file>"
    echo "Available backups:"
    ls -1 ./backups/*.db
    exit 1
fi

BACKUP_FILE=$1
TARGET_DB="./job_applications.db"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found at $BACKUP_FILE"
    exit 1
fi

# Create backup of current database if it exists
if [ -f "$TARGET_DB" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    SAFETY_BACKUP="./backups/pre_restore_${TIMESTAMP}.db"
    echo ".backup '${SAFETY_BACKUP}'" | sqlite3 "$TARGET_DB"
    echo "Created safety backup at ${SAFETY_BACKUP}"
fi

# Restore the database
echo ".restore '${BACKUP_FILE}'" | sqlite3 "$TARGET_DB"

if [ $? -eq 0 ]; then
    echo "Database restored successfully from ${BACKUP_FILE}"
else
    echo "Error: Database restore failed"
    exit 1
fi
