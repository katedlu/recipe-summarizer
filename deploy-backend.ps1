$appServicePlanName = 'recipe-summarizer-app-service'
$backendAppName = 'recipe-summarizer-backend'
$resourceGroup = 'recipe-summarizer-rg'

# Create a directory for database backups if it doesn't exist
if (-not (Test-Path -Path "$scriptPath\database_backups")) {
    New-Item -Path "$scriptPath\database_backups" -ItemType Directory
}

# Backup the database before deployment if it exists
if (Test-Path -Path "$scriptPath\backend\database\recipe_app.db") {
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "$scriptPath\database_backups\recipe_app_$timestamp.db"
    Copy-Item -Path "$scriptPath\backend\database\recipe_app.db" -Destination $backupPath
    Write-Host "Database backed up to $backupPath"
}

# Compress the backend folder for deployment
Write-Host "Compressing backend files for deployment..."
Compress-Archive -Path "$scriptPath\backend\*" -DestinationPath $deployZipPath -Force

# Deploy the updated backend code
Write-Host "Deploying backend to Azure App Service..."
az webapp deployment source config-zip `
  --resource-group $resourceGroup `
  --name $backendAppName `
  --src $deployZipPath

# Configure startup command
Write-Host "Setting startup command..."
az webapp config set `
  --resource-group $resourceGroup `
  --name $backendAppName `
  --startup-file "gunicorn --bind=0.0.0.0 --timeout 600 startup:app"

# Enable application logs
Write-Host "Enabling diagnostic logs..."
az webapp log config `
  --resource-group $resourceGroup `
  --name $backendAppName `
  --application-logging filesystem `
  --detailed-error-messages true `
  --failed-request-tracing true `
  --web-server-logging filesystem

Write-Host "Deployment complete. Checking status..."
az webapp show `
  --resource-group $resourceGroup `
  --name $backendAppName `
  --query "state" `
  --output tsv

Write-Host "View logs at: https://$backendAppName.scm.azurewebsites.net/api/logs/docker"

# Return to the original location
Set-Location -Path $originalLocation