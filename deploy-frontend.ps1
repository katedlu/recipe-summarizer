$resourceGroup = "recipe-summarizer-rg"
$storageAccountName = "recipesummarizer"

# Store the original location and navigate to the repository root
$originalLocation = Get-Location
# Get the script directory path
$scriptPath = $PSScriptRoot
# Navigate to frontend directory
Set-Location -Path "$scriptPath\frontend"

# Build the frontend
Write-Host "Building the frontend..."
npm run build

# Get the storage account key
Write-Host "Getting storage account key..."
$storageKey = az storage account keys list `
  --resource-group $resourceGroup `
  --account-name $storageAccountName `
  --query "[0].value" `
  --output tsv

# Upload the frontend files
Write-Host "Uploading frontend files to Azure Storage..."
az storage blob upload-batch `
  --account-name $storageAccountName `
  --account-key $storageKey `
  --source ".\dist" `
  --destination '$web' `
  --overwrite

# Get the frontend URL
$frontendUrl = az storage account show `
  --name $storageAccountName `
  --resource-group $resourceGroup `
  --query "primaryEndpoints.web" `
  --output tsv

Write-Host "Frontend redeployed to: $frontendUrl"

# Return to the original location
Set-Location -Path $originalLocation