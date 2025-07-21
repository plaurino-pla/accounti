#!/bin/bash

echo "=== OAuth Configuration Update Script ==="
echo ""

# Check if credentials are provided
if [ $# -ne 2 ]; then
    echo "Usage: $0 <NEW_CLIENT_ID> <NEW_CLIENT_SECRET>"
    echo ""
    echo "Example:"
    echo "  $0 123456789-abcdef.apps.googleusercontent.com GOCSPX-YourNewSecret"
    exit 1
fi

NEW_CLIENT_ID=$1
NEW_CLIENT_SECRET=$2

echo "Updating Firebase Functions configuration..."
echo "Client ID: $NEW_CLIENT_ID"
echo "Client Secret: $NEW_CLIENT_SECRET"
echo ""

# Update Firebase Functions config
firebase functions:config:set google.client_id="$NEW_CLIENT_ID"
firebase functions:config:set google.client_secret="$NEW_CLIENT_SECRET"

echo ""
echo "Deploying updated functions..."
firebase deploy --only functions

echo ""
echo "Configuration updated successfully!"
echo "You can now test the OAuth flow at: https://accounti-4698b.web.app" 