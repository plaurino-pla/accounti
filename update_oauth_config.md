# OAuth Configuration Update Guide

## Current Configuration
- **Client ID**: `1078251169969-i6at629vkpnvveee7fkibj031pdapiob.apps.googleusercontent.com`
- **Redirect URI**: `https://us-central1-accounti-4698b.cloudfunctions.net/api/auth/callback`

## Required Updates in Google Cloud Console

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/apis/credentials?project=accounti-4698b

### 2. Find Your OAuth 2.0 Client ID
Click on the client ID: `1078251169969-i6at629vkpnvveee7fkibj031pdapiob.apps.googleusercontent.com`

### 3. Update Authorized JavaScript Origins
Add these URLs:
```
https://accounti-4698b.web.app
https://us-central1-accounti-4698b.cloudfunctions.net
```

### 4. Update Authorized Redirect URIs
Make sure these are present:
```
https://us-central1-accounti-4698b.cloudfunctions.net/api/auth/callback
https://us-central1-accounti-4698b.cloudfunctions.net/api/auth/callback/
```

### 5. Save Changes
Click "Save" at the bottom of the page.

## Alternative: Create New OAuth Client

If the above doesn't work, create a new OAuth 2.0 Client ID:

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

Then update Firebase Functions config with the new credentials:
```bash
firebase functions:config:set google.client_id="NEW_CLIENT_ID" google.client_secret="NEW_CLIENT_SECRET"
firebase deploy --only functions
``` 