# PowerShell script to capture OCR text from server console
# Usage: Run this, then reload the page in browser

Write-Host "Waiting for OCR text... (reload the page now)" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# This will read from the running process output
# You'll need to pipe the npm dev output to this script
