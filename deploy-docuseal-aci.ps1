Write-Host "🚀 Deploying DocuSeal to Azure Container Instances" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Configuration
$resourceGroup = "stmichael-rg"
$location = "australiaeast"
$containerName = "docuseal-stmichael"
$dnsName = "docuseal-stmichael"  # Will be: docuseal-stmichael.australiaeast.azurecontainer.io

Write-Host "`n📋 Deployment Configuration:" -ForegroundColor Yellow
Write-Host "   Resource Group: $resourceGroup" -ForegroundColor White
Write-Host "   Location: $location" -ForegroundColor White
Write-Host "   Container Name: $containerName" -ForegroundColor White
Write-Host "   DNS Name: $dnsName" -ForegroundColor White

# Check if logged in to Azure
Write-Host "`n🔐 Checking Azure login..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (!$account) {
    Write-Host "❌ Not logged in to Azure. Please run: az login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in as: $($account.user.name)" -ForegroundColor Green

# Check if resource group exists
Write-Host "`n📦 Checking resource group..." -ForegroundColor Yellow
$rgExists = az group exists --name $resourceGroup
if ($rgExists -eq "false") {
    Write-Host "⚠️  Resource group doesn't exist. Creating..." -ForegroundColor Yellow
    az group create --name $resourceGroup --location $location
    Write-Host "✅ Resource group created" -ForegroundColor Green
} else {
    Write-Host "✅ Resource group exists" -ForegroundColor Green
}

# Generate a random SECRET_KEY_BASE
Write-Host "`n🔑 Generating SECRET_KEY_BASE..." -ForegroundColor Yellow
$secretKeyBase = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "✅ Secret key generated" -ForegroundColor Green

# Deploy container
Write-Host "`n🐳 Deploying DocuSeal container..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes..." -ForegroundColor White

az container create `
    --resource-group $resourceGroup `
    --name $containerName `
    --image docuseal/docuseal:1.7.2 `
    --dns-name-label $dnsName `
    --ports 3000 `
    --cpu 1 `
    --memory 1.5 `
    --environment-variables `
        SECRET_KEY_BASE=$secretKeyBase `
        RAILS_ENV=production `
        HOST="${dnsName}.${location}.azurecontainer.io" `
    --restart-policy Always

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to deploy container" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Container deployed successfully" -ForegroundColor Green

# Get container details
Write-Host "`n📊 Getting container details..." -ForegroundColor Yellow
$containerInfo = az container show `
    --resource-group $resourceGroup `
    --name $containerName `
    --query "{FQDN:ipAddress.fqdn,ProvisioningState:provisioningState}" `
    --output json | ConvertFrom-Json

$docusealUrl = "http://$($containerInfo.FQDN):3000"

Write-Host "`n✅ DocuSeal Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host "`n📍 Your DocuSeal app is available at:" -ForegroundColor Yellow
Write-Host "   $docusealUrl" -ForegroundColor Cyan
Write-Host "`n⚠️  IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Wait 2-3 minutes for the container to fully start" -ForegroundColor White
Write-Host "   2. Access the URL above to create your admin account" -ForegroundColor White
Write-Host "   3. Configure email settings in DocuSeal admin panel" -ForegroundColor White
Write-Host "`n💡 To add SMTP settings, update the container:" -ForegroundColor Yellow
Write-Host "   az container create --resource-group $resourceGroup --name $containerName \" -ForegroundColor Gray
Write-Host "     --image docuseal/docuseal:1.7.2 --dns-name-label $dnsName \" -ForegroundColor Gray
Write-Host "     --ports 3000 --cpu 1 --memory 1.5 \" -ForegroundColor Gray
Write-Host "     --environment-variables SECRET_KEY_BASE=$secretKeyBase \" -ForegroundColor Gray
Write-Host "       SMTP_ADDRESS=smtp.gmail.com SMTP_PORT=587 \" -ForegroundColor Gray
Write-Host "       SMTP_USER_NAME=your-email@gmail.com \" -ForegroundColor Gray
Write-Host "       SMTP_PASSWORD=your-app-password" -ForegroundColor Gray
Write-Host "`n📝 To view logs:" -ForegroundColor Yellow
Write-Host "   az container logs --resource-group $resourceGroup --name $containerName" -ForegroundColor Gray
Write-Host "`n🗑️  To delete:" -ForegroundColor Yellow
Write-Host "   az container delete --resource-group $resourceGroup --name $containerName --yes" -ForegroundColor Gray
Write-Host "`n🎉 Done!" -ForegroundColor Green
