@echo off
REM Automated Apartment Database Update Script (Windows)
REM
REM This script rebuilds the apartment database from MOLIT API
REM Run this monthly to keep the apartment list up-to-date
REM
REM Usage:
REM   scripts\update-apartment-database.bat
REM
REM Or schedule it with Windows Task Scheduler

setlocal enabledelayedexpansion

echo 🔄 Starting apartment database update...
echo Timestamp: %date% %time%
echo.

cd /d "%~dp0\.."

REM Check if .env.local exists
if not exist .env.local (
    echo ❌ Error: .env.local file not found
    echo Please create .env.local with MOLIT_API_KEY
    exit /b 1
)

REM Backup existing database
if exist scripts\apartment-database.json (
    set BACKUP_FILE=scripts\apartment-database.backup.%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.json
    set BACKUP_FILE=!BACKUP_FILE: =0!
    echo 📦 Creating backup: !BACKUP_FILE!
    copy scripts\apartment-database.json "!BACKUP_FILE!" >nul
)

REM Run the database builder
echo 🏗️  Building apartment database...
call npx tsx scripts/build-apartment-database.ts

if exist scripts\apartment-database.json (
    echo.
    echo ✅ Database update complete!
    echo    File: scripts\apartment-database.json
    echo.
    echo ✅ Update process complete!
) else (
    echo ❌ Error: Database file was not created
    exit /b 1
)

endlocal
