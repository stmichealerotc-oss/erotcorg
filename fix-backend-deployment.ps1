Write-Host "🔧 Fixing Backend Deployment Conflict" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$resourceGroup = "stmichael-rg"
$appName = "cms-system"

Write-Host "`n📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Resource Group: $resourceGroup" -ForegroundColor White
Write-Host "   App Name: $appName" -ForegroundColor White

# Check if logged in to Azure
Write-Host "`n🔐 Checking Azure login..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (!$account) {
    Write-Host "❌ Not logged in to Azure. Please run: az login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green

# Stop the app
Write-Host "`n⏸️  Stopping App Service..." -ForegroundColor Yellow
az webapp stop --name $appName --resource-group $resourceGroup

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ App stopped" -ForegroundColor Green
} else {
    Write-Host "⚠️  Failed to stop app (it may not exist yet)" -ForegroundColor Yellow
}

# Wait a moment
Write-Host "`n⏳ Waiting 5 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start the app
Write-Host "`n▶️  Starting App Service..." -ForegroundColor Yellow
az webapp start --name $appName --resource-group $resourceGroup

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ App started" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to start app" -ForegroundColor Red
    exit 1
}

# Restart for good measure
Write-Host "`n🔄 Restarting App Service..." -ForegroundColor Yellow
az webapp restart --name $appName --resource-group $resourceGroup

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ App restarted" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to restart app" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Backend deployment conflict resolved!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "`n📍 Your backend is at:" -ForegroundColor Yellow
Write-Host "   https://${appName}.azurewebsites.net" -ForegroundColor Cyan
Write-Host "`n💡 Now you can:" -ForegroundColor Yellow
Write-Host "   1. Push your code to GitHub" -ForegroundColor White
Write-Host "   2. GitHub Actions will automatically deploy" -ForegroundColor White
Write-Host "   3. Or manually deploy using Azure CLI" -ForegroundColor White
Write-Host "`n🎉 Done!" -ForegroundColor Green
