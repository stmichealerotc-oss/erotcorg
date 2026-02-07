# GitHub Secrets Setup Guide

## Required Secrets

Your GitHub Actions workflows need these secrets to deploy to Azure:

### 1. Backend Deployment Secret

**Secret Name:** `AZUREAPPSERVICE_PUBLISHPROFILE_CMS_SYSTEM`

**Where to get it:**
1. Go to Azure Portal
2. Navigate to **cms-system** (App Service)
3. Click **Get publish profile** (top menu)
4. Download the `.PublishSettings` file
5. Open it in a text editor and copy ALL the content

**How to add it:**
1. Go to: https://github.com/stmichealerotc-oss/erotcorg/settings/secrets/actions
2. Click **New repository secret**
3. Name: `AZUREAPPSERVICE_PUBLISHPROFILE_CMS_SYSTEM`
4. Value: Paste the entire publish profile content
5. Click **Add secret**

### 2. Frontend Deployment Secret

**Secret Name:** `AZURE_STATIC_WEB_APPS_API_TOKEN_AGREEABLE_PLANT_06F731700`

**Where to get it:**
1. Go to Azure Portal
2. Navigate to **agreeable-plant-06f731700** (Static Web App)
3. Click **Manage deployment token** (left menu under Settings)
4. Copy the deployment token

**How to add it:**
1. Go to: https://github.com/stmichealerotc-oss/erotcorg/settings/secrets/actions
2. Click **New repository secret**
3. Name: `AZURE_STATIC_WEB_APPS_API_TOKEN_AGREEABLE_PLANT_06F731700`
4. Value: Paste the deployment token
5. Click **Add secret**

## Verify Secrets

After adding both secrets, you should see them listed at:
https://github.com/stmichealerotc-oss/erotcorg/settings/secrets/actions

## Re-run Failed Workflows

Once secrets are added:
1. Go to: https://github.com/stmichealerotc-oss/erotcorg/actions
2. Find the failed workflow runs
3. Click **Re-run all jobs**

## Current Workflow Status

- **Backend Workflow:** `.github/workflows/main_cms_system.yml`
  - Deploys to: `cms-system.azurewebsites.net`
  - Needs: `AZUREAPPSERVICE_PUBLISHPROFILE_CMS_SYSTEM`

- **Frontend Workflow:** `.github/workflows/azure-static-web-apps-agreeable-plant-06f731700.yml`
  - Deploys to: `agreeable-plant-06f731700.2.azurestaticapps.net`
  - Needs: `AZURE_STATIC_WEB_APPS_API_TOKEN_AGREEABLE_PLANT_06F731700`
