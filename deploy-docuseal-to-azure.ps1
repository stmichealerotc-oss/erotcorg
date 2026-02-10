Write-Host "🚀 Deploying DocuSeal to Azure" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Configuration
$resourceGroup = "stmichael-rg"
$location = "australiaeast"
$appName = "docuseal-stmichael"
$acrName = "stmichaelacr"  # Azure Container Registry
$imageName = "docuseal"
$imageTag = "latest"

Write-Host "`n📋 Deployment Configuration:" -ForegroundColor Yellow
Write-Host "   Resource Group: $resourceGroup" -ForegroundColor White
Write-Host "   Location: $location" -ForegroundColor White
Write-Host "   App Name: $appName" -ForegroundColor White
Write-Host "   Container Registry: $acrName" -ForegroundColor White

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

# Create Azure Container Registry if it doesn't exist
Write-Host "`n🐳 Setting up Azure Container Registry..." -ForegroundColor Yellow
$acrExists = az acr show --name $acrName --resource-group $resourceGroup 2>$null
if (!$acrExists) {
    Write-Host "⚠️  Creating Azure Container Registry..." -ForegroundColor Yellow
    az acr create `
        --resource-group $resourceGroup `
        --name $acrName `
        --sku Basic `
        --location $location `
        --admin-enabled true
    Write-Host "✅ Container Registry created" -ForegroundColor Green
} else {
    Write-Host "✅ Container Registry exists" -ForegroundColor Green
}

# Get ACR credentials
Write-Host "`n🔑 Getting ACR credentials..." -ForegroundColor Yellow
$acrCreds = az acr credential show --name $acrName --resource-group $resourceGroup | ConvertFrom-Json
$acrLoginServer = az acr show --name $acrName --resource-group $resourceGroup --query loginServer -o tsv

Write-Host "✅ ACR Login Server: $acrLoginServer" -ForegroundColor Green

# Build and push Docker image to ACR
Write-Host "`n🏗️  Building and pushing Docker image..." -ForegroundColor Yellow
Write-Host "   This may take a few minutes..." -ForegroundColor White

Push-Location st-michael-church/docuseal

# Build using ACR (recommended for Azure)
az acr build `
    --registry $acrName `
    --image "${imageName}:${imageTag}" `
    --file Dockerfile `
    .

Pop-Location

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build and push image" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Image built and pushed to ACR" -ForegroundColor Green

# Create App Service Plan for Linux containers
Write-Host "`n📊 Setting up App Service Plan..." -ForegroundColor Yellow
$planName = "docuseal-plan"
$planExists = az appservice plan show --name $planName --resource-group $resourceGroup 2>$null
if (!$planExists) {
    Write-Host "⚠️  Creating App Service Plan..." -ForegroundColor Yellow
    az appservice plan create `
        --name $planName `
        --resource-group $resourceGroup `
        --location $location `
        --is-linux `
        --sku B1
    Write-Host "✅ App Service Plan created" -ForegroundColor Green
} else {
    Write-Host "✅ App Service Plan exists" -ForegroundColor Green
}

# Create Web App with Docker container
Write-Host "`n🌐 Creating Web App..." -ForegroundColor Yellow
$webAppExists = az webapp show --name $appName --resource-group $resourceGroup 2>$null
if (!$webAppExists) {
    az webapp create `
        --resource-group $resourceGroup `
        --plan $planName `
        --name $appName `
        --deployment-container-image-name "${acrLoginServer}/${imageName}:${imageTag}"
    Write-Host "✅ Web App created" -ForegroundColor Green
} else {
    Write-Host "✅ Web App exists, updating..." -ForegroundColor Yellow
    az webapp config container set `
        --name $appName `
        --resource-group $resourceGroup `
        --docker-custom-image-name "${acrLoginServer}/${imageName}:${imageTag}" `
        --docker-registry-server-url "https://${acrLoginServer}" `
        --docker-registry-server-user $acrCreds.username `
        --docker-registry-server-password $acrCreds.passwords[0].value
}

# Configure Web App settings
Write-Host "`n⚙️  Configuring Web App settings..." -ForegroundColor Yellow

# Generate a random SECRET_KEY_BASE if not set
$secretKeyBase = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

az webapp config appsettings set `
    --resource-group $resourceGroup `
    --name $appName `
    --settings `
        SECRET_KEY_BASE=$secretKeyBase `
        RAILS_ENV=production `
        HOST="${appName}.azurewebsites.net" `
        WEBSITES_PORT=3000 `
        DOCKER_REGISTRY_SERVER_URL="https://${acrLoginServer}" `
        DOCKER_REGISTRY_SERVER_USERNAME=$acrCreds.username `
        DOCKER_REGISTRY_SERVER_PASSWORD=$acrCreds.passwords[0].value

Write-Host "✅ Web App configured" -ForegroundColor Green

# Enable continuous deployment
Write-Host "`n🔄 Enabling continuous deployment..." -ForegroundColor Yellow
az webapp deployment container config `
    --name $appName `
    --resource-group $resourceGroup `
    --enable-cd true

Write-Host "✅ Continuous deployment enabled" -ForegroundColor Green

# Get the Web App URL
$webAppUrl = "https://${appName}.azurewebsites.net"

Write-Host "`n✅ DocuSeal Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host "`n📍 Your DocuSeal app is available at:" -ForegroundColor Yellow
Write-Host "   $webAppUrl" -ForegroundColor Cyan
Write-Host "`n⚠️  IMPORTANT: Configure email settings in Azure Portal:" -ForegroundColor Yellow
Write-Host "   1. Go to: https://portal.azure.com" -ForegroundColor White
Write-Host "   2. Navigate to: $appName > Configuration > Application settings" -ForegroundColor White
Write-Host "   3. Add these settings:" -ForegroundColor White
Write-Host "      - SMTP_ADDRESS" -ForegroundColor Gray
Write-Host "      - SMTP_PORT" -ForegroundColor Gray
Write-Host "      - SMTP_USER_NAME" -ForegroundColor Gray
Write-Host "      - SMTP_PASSWORD" -ForegroundColor Gray
Write-Host "      - SMTP_FROM" -ForegroundColor Gray
Write-Host "`n🎉 Done!" -ForegroundColor Green
