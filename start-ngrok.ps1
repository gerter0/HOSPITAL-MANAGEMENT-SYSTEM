# Start NGrok for Hospital Management System (Windows)
# Usage: Run this script in PowerShell

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Hospital Management System - NGrok Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

# Check if ngrok is installed
try {
  ngrok version | Out-Null
  Write-Host "`n✅ NGrok found" -ForegroundColor Green
} catch {
  Write-Host "`n❌ NGrok not found in PATH" -ForegroundColor Red
  Write-Host "Install ngrok from: https://ngrok.com/download" -ForegroundColor Yellow
  exit 1
}

# Start ngrok tunnel
Write-Host "`nℹ️  Starting ngrok tunnel on port 5001..." -ForegroundColor Cyan
Write-Host "This will forward your local backend to a public HTTPS URL" -ForegroundColor Gray

ngrok http 5001 --log=stdout

Write-Host "`n⚠️  When ngrok starts:" -ForegroundColor Yellow
Write-Host "1. Look for Forwarding line showing: https://xxxx-xxx-xxx.ngrok-free.app" -ForegroundColor Gray
Write-Host "2. Copy the HTTPS URL" -ForegroundColor Gray
Write-Host "3. Update frontend/.env.production:" -ForegroundColor Gray
Write-Host "   VITE_API_URL=https://your-ngrok-url/api/v1" -ForegroundColor Gray
Write-Host "4. Run: cd frontend; npm run build" -ForegroundColor Gray
Write-Host "5. Access from mobile: Visit the ngrok URL" -ForegroundColor Gray
