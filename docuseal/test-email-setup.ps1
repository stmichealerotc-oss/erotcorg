# Test DocuSeal Email Setup
Write-Host "🔍 Testing DocuSeal Email Setup..." -ForegroundColor Cyan
Write-Host ""

# Check if container is running
Write-Host "1. Checking DocuSeal container..." -ForegroundColor Yellow
$container = docker ps --filter "name=docuseal" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
if ($container -match "docuseal") {
    Write-Host "✅ DocuSeal container is running" -ForegroundColor Green
    Write-Host $container -ForegroundColor Gray
} else {
    Write-Host "❌ DocuSeal container is not running" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Check if application responds
Write-Host "2. Testing HTTP connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -Method Head -TimeoutSec 10
    Write-Host "✅ DocuSeal is responding: HTTP $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ DocuSeal is not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Check SMTP environment variables
Write-Host "3. Verifying SMTP configuration..." -ForegroundColor Yellow
$smtpVars = docker exec docuseal env | Select-String "SMTP"
if ($smtpVars.Count -gt 0) {
    Write-Host "✅ SMTP variables are loaded:" -ForegroundColor Green
    foreach ($var in $smtpVars) {
        if ($var -match "PASSWORD") {
            Write-Host "  SMTP_PASSWORD=***hidden***" -ForegroundColor Gray
        } else {
            Write-Host "  $var" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "❌ No SMTP variables found" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Setup Status: READY FOR TESTING!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:3001 in your browser" -ForegroundColor White
Write-Host "2. Create/upload a document" -ForegroundColor White
Write-Host "3. Send it to test email delivery" -ForegroundColor White
Write-Host "4. Monitor logs for email activity" -ForegroundColor White
Write-Host ""