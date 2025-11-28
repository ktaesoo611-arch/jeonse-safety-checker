#!/bin/bash
#
# Automated Apartment Database Update Script
#
# This script rebuilds the apartment database from MOLIT API
# Run this monthly to keep the apartment list up-to-date
#
# Usage:
#   bash scripts/update-apartment-database.sh
#
# Or schedule it with cron:
#   0 0 1 * * cd /path/to/jeonse-safety-checker && bash scripts/update-apartment-database.sh
#

set -e

echo "🔄 Starting apartment database update..."
echo "Timestamp: $(date)"
echo ""

# Navigate to project directory
cd "$(dirname "$0")/.."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found"
    echo "Please create .env.local with MOLIT_API_KEY"
    exit 1
fi

# Check if MOLIT_API_KEY is set
if ! grep -q "MOLIT_API_KEY" .env.local; then
    echo "❌ Error: MOLIT_API_KEY not found in .env.local"
    exit 1
fi

# Backup existing database
if [ -f scripts/apartment-database.json ]; then
    BACKUP_FILE="scripts/apartment-database.backup.$(date +%Y%m%d_%H%M%S).json"
    echo "📦 Creating backup: $BACKUP_FILE"
    cp scripts/apartment-database.json "$BACKUP_FILE"
fi

# Run the database builder
echo "🏗️  Building apartment database..."
npx tsx scripts/build-apartment-database.ts

# Check if new database was created successfully
if [ -f scripts/apartment-database.json ]; then
    APARTMENT_COUNT=$(grep -o '"name":' scripts/apartment-database.json | wc -l)
    echo ""
    echo "✅ Database update complete!"
    echo "   Apartments in database: $APARTMENT_COUNT"
    echo "   File: scripts/apartment-database.json"
    echo ""

    # Clean up old backups (keep last 5)
    echo "🧹 Cleaning up old backups (keeping last 5)..."
    ls -t scripts/apartment-database.backup.*.json 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

    echo "✅ Update process complete!"
else
    echo "❌ Error: Database file was not created"
    exit 1
fi
