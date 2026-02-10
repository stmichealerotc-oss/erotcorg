Write-Host "🚀 DocuSeal Azure Deployment" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

Write-Host "`nChoose deployment option:" -ForegroundColor Yellow
Write-Host "1. Azure Container Instances (Simple, ~$30-40/month)" -ForegroundColor White
Write-Host "   - Quick setup" -ForegroundColor Gray
Write-Host "   - HTTP only (need Front Door for HTTPS)" -ForegroundColor Gray
Write-Host "   - URL: http://docuseal-stmichael.australiaeast.azurecontainer.io:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Azure App Service (Production, ~$60/month)" -ForegroundColor White
Write-Host "   - Built-in HTTPS" -ForegroundColor Gray
Write-Host "   - Custom domain support" -ForegroundColor Gray
Write-Host "   - URL: https://docuseal-stmichael.azurewebsites.net" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter your choice (1 or 2)"

switch ($choice) {
    "1" {
        Write-Host "`n🐳 Deploying to Azure Container Instances..." -ForegroundColor Cyan
        .\deploy-docuseal-aci.ps1
    }
    "2" {
        Write-Host "`n🌐 Deploying to Azure App Service..." -ForegroundColor Cyan
        .\deploy-docuseal-to-azure.ps1
    }
    default {
        Write-Host "`n❌ Invalid choice. Please run again and select 1 or 2." -ForegroundColor Red
        exit 1
    }
}
