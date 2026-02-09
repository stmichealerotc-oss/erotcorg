# Deploy DocuSeal to Railway
Write-Host "🚀 Deploying DocuSeal to Railway..." -ForegroundColor Cyan
Write-Host ""

# Check if Railway CLI is installed
Write-Host "1. Checking Railway CLI..." -ForegroundColor Yellow
try {
    $railwayVersion = railway --version
    Write-Host "✅ Railway CLI found: $railwayVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Railway CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Railway CLI first:" -ForegroundColor Yellow
    Write-Host "npm install -g @railway/cli" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if logged in to Railway
Write-Host "2. Checking Railway authentication..." -ForegroundColor Yellow
try {
    railway whoami | Out-Null
    Write-Host "✅ Logged in to Railway" -ForegroundColor Green
} catch {
    Write-Host "❌ Not logged in to Railway" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please login first:" -ForegroundColor Yellow
    Write-Host "railway login" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Show environment variables that need to be set
Write-Host "3. Environment Variables Setup" -ForegroundColor Yellow
Write-Host ""
Write-Host "Make sure these environment variables are set in Railway:" -ForegroundColor White
Write-Host ""

$envVars = @(
    "SECRET_KEY_BASE",
    "RAILS_ENV=production",
    "SMTP_ADDRESS=smtp.gmail.com",
    "SMTP_PORT=587",
    "SMTP_USERNAME=debesay304@gmail.com",
    "SMTP_PASSWORD=cssv xkcd opqa qymf",
    "SMTP_FROM=debesay304@gmail.com",
    "SMTP_DOMAIN=your-app-name.railway.app",
    "SMTP_AUTHENTICATION=login",
    "SMTP_ENABLE_STARTTLS_AUTO=true",
    "FORCE_SSL=true"
)

foreach ($var in $envVars) {
    if ($var -match "PASSWORD") {
        Write-Host "  $($var.Split('=')[0])=***hidden***" -ForegroundColor Gray
    } else {
        Write-Host "  $var" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "You can set these in Railway dashboard or using CLI:" -ForegroundColor Yellow
Write-Host "railway variables set VARIABLE_NAME=value" -ForegroundColor White
Write-Host ""

# Ask if ready to deploy
$ready = Read-Host "Are you ready to deploy? (y/N)"
if ($ready -ne "y" -and $ready -ne "Y") {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Deploy
Write-Host "4. Deploying to Railway..." -ForegroundColor Yellow
try {
    railway up
    Write-Host ""
    Write-Host "✅ Deployment initiated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Check Railway dashboard for deployment status" -ForegroundColor White
    Write-Host "2. Update SMTP_DOMAIN with your actual Railway domain" -ForegroundColor White
    Write-Host "3. Test email functionality in production" -ForegroundColor White
    Write-Host "4. Create your admin account" -ForegroundColor White
    
} catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check Railway logs for more details:" -ForegroundColor Yellow
    Write-Host "railway logs" -ForegroundColor White
}

Write-Host ""