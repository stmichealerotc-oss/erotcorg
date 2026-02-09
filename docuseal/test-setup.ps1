# Test DocuSeal Email Setup
Write-Host "Testing DocuSeal Email Setup..." -ForegroundColor Cyan
Write-Host ""

# Check container
Write-Host "1. Checking DocuSeal container..." -ForegroundColor Yellow
$container = docker ps --filter "name=docuseal" --format "table {{.Names}}\t{{.Status}}"
Write-Host $container -ForegroundColor Gray

# Test HTTP
Write-Host "2. Testing HTTP connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method Head -TimeoutSec 5
    Write-Host "DocuSeal is responding: HTTP $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "DocuSeal connection failed" -ForegroundColor Red
}

# Check SMTP config
Write-Host "3. SMTP configuration loaded:" -ForegroundColor Yellow
docker exec docuseal env | Select-String "SMTP_ADDRESS"
docker exec docuseal env | Select-String "SMTP_PORT"
docker exec docuseal env | Select-String "SMTP_USER_NAME"

Write-Host ""
Write-Host "READY FOR TESTING!" -ForegroundColor Green
Write-Host "Go to: http://localhost:3001" -ForegroundColor Cyan