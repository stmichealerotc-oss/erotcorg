Write-Host "Configuring DocuSeal Email Settings" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$resourceGroup = "DefaultResourceGroup-EAU"
$appName = "stmichael-sign"

# Email credentials
$smtpAddress = "smtp.gmail.com"
$smtpPort = "587"
$smtpUsername = "chairman@erotc.org"
$smtpPassword = "afdt srwr xhtc fhlh"  # Gmail App Password (spaces will be removed)
$smtpFrom = "St Michael Church <chairman@erotc.org>"

Write-Host "`nConfiguration:" -ForegroundColor Yellow
Write-Host "   Resource Group: $resourceGroup" -ForegroundColor White
Write-Host "   App Name: $appName" -ForegroundColor White
Write-Host "   SMTP Server: $smtpAddress" -ForegroundColor White
Write-Host "   SMTP Username: $smtpUsername" -ForegroundColor White

Write-Host "`nAdding SMTP settings to Azure App Service..." -ForegroundColor Yellow
Write-Host "This will enable email notifications in DocuSeal" -ForegroundColor Gray

# Remove spaces from app password
$smtpPasswordClean = $smtpPassword -replace '\s', ''

# Add SMTP settings
az webapp config appsettings set `
    --resource-group $resourceGroup `
    --name $appName `
    --settings `
        SMTP_ADDRESS=$smtpAddress `
        SMTP_PORT=$smtpPort `
        SMTP_USERNAME=$smtpUsername `
        SMTP_PASSWORD=$smtpPasswordClean `
        SMTP_FROM=$smtpFrom `
        SMTP_DOMAIN="gmail.com" `
        SMTP_AUTHENTICATION="plain" `
        SMTP_ENABLE_STARTTLS_AUTO="true" `
        SMTP_OPENSSL_VERIFY_MODE="none"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSMTP settings added successfully!" -ForegroundColor Green
    
    Write-Host "`nRestarting DocuSeal to apply changes..." -ForegroundColor Yellow
    az webapp restart --resource-group $resourceGroup --name $appName
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "DocuSeal restarted successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to restart DocuSeal" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`nFailed to add SMTP settings" -ForegroundColor Red
    Write-Host "Please add them manually in Azure Portal:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://portal.azure.com" -ForegroundColor White
    Write-Host "2. Navigate to: App Services -> stmichael-sign" -ForegroundColor White
    Write-Host "3. Click: Configuration -> Application settings" -ForegroundColor White
    Write-Host "4. Add the SMTP settings shown above" -ForegroundColor White
    exit 1
}

Write-Host "`nEmail configuration complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "`nDocuSeal is now configured with email:" -ForegroundColor Yellow
Write-Host "   URL: https://sign.erotc.org" -ForegroundColor Cyan
Write-Host "   Email: $smtpUsername" -ForegroundColor Cyan
Write-Host "`nTest email notifications:" -ForegroundColor Yellow
Write-Host "   1. Go to https://sign.erotc.org" -ForegroundColor White
Write-Host "   2. Create a new document" -ForegroundColor White
Write-Host "   3. Send it to someone" -ForegroundColor White
Write-Host "   4. They should receive an email notification" -ForegroundColor White
Write-Host "`nDone!" -ForegroundColor Green
