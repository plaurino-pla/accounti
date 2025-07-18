# Accounti Deployment Guide

This guide covers deploying Accounti to production using Firebase and Google Cloud Platform.

## Prerequisites

1. **Google Cloud Project**
   - Create a new project or use existing one
   - Enable required APIs:
     - Gmail API
     - Google Drive API
     - Google Sheets API
     - Document AI API
     - Cloud Functions API
     - Cloud Scheduler API

2. **Firebase Project**
   - Create Firebase project
   - Enable Firestore Database
   - Enable Authentication (Google provider)
   - Enable Hosting

3. **Stripe Account**
   - Create Stripe account
   - Set up products and pricing plans
   - Configure webhooks

## Environment Setup

### 1. Google OAuth Configuration

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`

### 2. Firebase Configuration

1. Download service account key from Firebase Console
2. Set environment variables:
   ```bash
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-service-account-email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
   ```

### 3. Stripe Configuration

1. Create products in Stripe Dashboard:
   - Free Tier (price: $0)
   - Pro Tier (price: $29/month)
   - Premium Tier (price: $99/month)

2. Set environment variables:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID_FREE=price_...
   STRIPE_PRICE_ID_PRO=price_...
   STRIPE_PRICE_ID_PREMIUM=price_...
   ```

## Deployment Steps

### 1. Backend Deployment (Firebase Functions)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init functions

# Deploy functions
firebase deploy --only functions
```

### 2. Frontend Deployment (Firebase Hosting)

```bash
# Build frontend
cd frontend
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### 3. Database Setup

1. Create Firestore collections:
   ```javascript
   // users collection
   {
     id: "user_id",
     googleId: "google_user_id",
     email: "user@example.com",
     name: "User Name",
     picture: "profile_url",
     subscription: "free",
     configuration: {
       folderTemplate: "{Proveedor}_{Fecha}_{NºFactura}_{Monto}",
       rootFolder: "Facturas",
       historicalRange: 30,
       syncFrequency: "daily"
     },
     createdAt: timestamp,
     updatedAt: timestamp
   }

   // invoices collection
   {
     id: "invoice_id",
     userId: "user_id",
     messageId: "gmail_message_id",
     fileName: "processed_filename.pdf",
     fileId: "google_drive_file_id",
     checksum: "md5_checksum",
     metadata: {
       provider: "Provider Name",
       date: "2024-01-15",
       invoiceNumber: "INV-001",
       amount: 1500.00,
       currency: "USD"
     },
     status: "processed",
     createdAt: timestamp
   }
   ```

### 4. Cloud Scheduler Setup

Create scheduled jobs for invoice processing:

```bash
# Free tier - daily at 2 AM
gcloud scheduler jobs create http free-tier-processing \
  --schedule="0 2 * * *" \
  --uri="https://your-region-your-project.cloudfunctions.net/processInvoices" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"tier":"free"}'

# Pro tier - every 6 hours
gcloud scheduler jobs create http pro-tier-processing \
  --schedule="0 */6 * * *" \
  --uri="https://your-region-your-project.cloudfunctions.net/processInvoices" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"tier":"pro"}'

# Premium tier - every hour
gcloud scheduler jobs create http premium-tier-processing \
  --schedule="0 * * * *" \
  --uri="https://your-region-your-project.cloudfunctions.net/processInvoices" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"tier":"premium"}'
```

## Security Configuration

### 1. CORS Settings

Configure CORS in Firebase Functions:

```javascript
const cors = require('cors')({
  origin: ['https://your-domain.com', 'http://localhost:3000'],
  credentials: true
});
```

### 2. Environment Variables

Set production environment variables in Firebase:

```bash
firebase functions:config:set \
  google.client_id="your_client_id" \
  google.client_secret="your_client_secret" \
  stripe.secret_key="your_stripe_secret" \
  jwt.secret="your_jwt_secret"
```

### 3. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Invoices belong to users
    match /invoices/{invoiceId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

## Monitoring and Logging

### 1. Google Cloud Logging

Enable structured logging:

```javascript
const {Logging} = require('@google-cloud/logging');
const logging = new Logging();
const log = logging.log('accounti-logs');
```

### 2. Error Tracking

Set up error monitoring with Sentry or similar service.

### 3. Performance Monitoring

Enable Firebase Performance Monitoring for frontend metrics.

## SSL and Domain Setup

1. Configure custom domain in Firebase Hosting
2. Set up SSL certificate (automatic with Firebase)
3. Update OAuth redirect URIs with custom domain

## Backup and Recovery

### 1. Database Backups

Set up automated Firestore backups:

```bash
gcloud firestore export gs://your-backup-bucket/backups/$(date +%Y%m%d) \
  --collection-ids=users,invoices
```

### 2. Configuration Backup

Store environment configuration securely:
- Use Google Secret Manager for sensitive data
- Version control non-sensitive configuration

## Scaling Considerations

### 1. Function Scaling

Configure function scaling limits:

```javascript
exports.processInvoices = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB',
    maxInstances: 10
  })
  .https.onRequest(async (req, res) => {
    // Function implementation
  });
```

### 2. Database Scaling

- Monitor Firestore usage and quotas
- Implement pagination for large datasets
- Use composite indexes for complex queries

## Maintenance

### 1. Regular Updates

- Keep dependencies updated
- Monitor security advisories
- Update Firebase SDK versions

### 2. Performance Optimization

- Monitor function execution times
- Optimize database queries
- Implement caching where appropriate

## Troubleshooting

### Common Issues

1. **OAuth Errors**
   - Check redirect URIs configuration
   - Verify client ID and secret
   - Ensure scopes are properly configured

2. **Function Timeouts**
   - Increase function timeout
   - Implement background processing
   - Use Cloud Tasks for long-running operations

3. **Database Quota Exceeded**
   - Monitor Firestore usage
   - Implement rate limiting
   - Optimize query patterns

### Support

For additional support:
- Check Firebase documentation
- Review Google Cloud logs
- Monitor application metrics 