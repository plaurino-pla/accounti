# Create New OAuth 2.0 Client - Step by Step Guide

## Step 1: Delete Old OAuth Client
1. Go to: https://console.cloud.google.com/apis/credentials?project=accounti-4698b
2. Find the OAuth 2.0 Client ID: `1078251169969-i6at629vkpnvveee7fkibj031pdapiob.apps.googleusercontent.com`
3. Click on it to edit
4. Click "Delete" at the bottom
5. Confirm deletion

## Step 2: Create New OAuth 2.0 Client
1. Click "Create Credentials" → "OAuth 2.0 Client IDs"
2. Choose "Web application"
3. Name: "Accounti Web Client"
4. Authorized JavaScript origins:
   ```
   https://accounti-4698b.web.app
   https://us-central1-accounti-4698b.cloudfunctions.net
   ```
5. Authorized redirect URIs:
   ```
   https://us-central1-accounti-4698b.cloudfunctions.net/api/auth/callback
   ```
6. Click "Create"

## Step 3: Copy New Credentials
After creation, you'll see:
- Client ID: (copy this)
- Client Secret: (copy this)

## Step 4: Update Firebase Functions Config
Run these commands with your new credentials:

```bash
firebase functions:config:set google.client_id="YOUR_NEW_CLIENT_ID"
firebase functions:config:set google.client_secret="YOUR_NEW_CLIENT_SECRET"
firebase deploy --only functions
```

## Step 5: Test the OAuth Flow
1. Go to: https://accounti-4698b.web.app
2. Try signing in with Google
3. Should work without redirect_uri_mismatch errors 