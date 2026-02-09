# Start DocuSeal locally for testing
Write-Host "Starting DocuSeal for local testing..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker Desktop is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version
    Write-Host "Docker is available: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "Docker is not available" -ForegroundColor Red
    Write-Host "Please start Docker Desktop manually and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Stop any existing containers
Write-Host "Stopping any existing DocuSeal containers..." -ForegroundColor Yellow
try {
    docker compose down 2>$null
    Write-Host "Stopped existing containers" -ForegroundColor Green
} catch {
    Write-Host "No existing containers to stop" -ForegroundColor Gray
}

Write-Host ""

# Start DocuSeal
Write-Host "Starting DocuSeal with your email configuration..." -ForegroundColor Yellow
try {
    docker compose up -d
    Write-Host "DocuSeal started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "DocuSeal is now running at: http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps for email testing:" -ForegroundColor Yellow
    Write-Host "1. Open http://localhost:3001 in your browser" -ForegroundColor White
    Write-Host "2. Create a document and add a signer" -ForegroundColor White
    Write-Host "3. Try to send the document - this will test your email config" -ForegroundColor White
    Write-Host ""
    Write-Host "To view logs: docker compose logs -f" -ForegroundColor Gray
    Write-Host "To stop: docker compose down" -ForegroundColor Gray
    
} catch {
    Write-Host "Failed to start DocuSeal" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Make sure Docker Desktop is running" -ForegroundColor White
    Write-Host "2. Check if port 3001 is available" -ForegroundColor White
    Write-Host "3. Try running: docker compose up" -ForegroundColor White
}

Write-Host ""