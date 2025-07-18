# Accounti API Documentation

## Base URL
- Development: `http://localhost:5000/api`
- Production: `https://your-domain.com/api`

## Authentication

All API endpoints (except auth endpoints) require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Authentication

#### GET /auth/google
Get Google OAuth URL for authentication.

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/oauth/authorize?..."
}
```

#### GET /auth/google/callback
Handle Google OAuth callback.

**Query Parameters:**
- `code` (string, required): Authorization code from Google

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "picture": "profile_url",
    "subscription": "free"
  },
  "token": "jwt_token"
}
```

#### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

**Response:**
```json
{
  "accessToken": "new_access_token",
  "expiryDate": 1640995200000
}
```

#### POST /auth/logout
Logout user.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### User Management

#### GET /user/profile
Get user profile information.

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "profile_url",
  "subscription": "free",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### PUT /user/profile
Update user profile.

**Request Body:**
```json
{
  "name": "Updated Name",
  "picture": "new_picture_url"
}
```

#### GET /user/configuration
Get user configuration settings.

**Response:**
```json
{
  "folderTemplate": "{Proveedor}_{Fecha}_{NºFactura}_{Monto}",
  "rootFolder": "Facturas",
  "historicalRange": 30,
  "syncFrequency": "daily",
  "googleDriveFolderId": "drive_folder_id",
  "googleSheetId": "sheet_id"
}
```

#### PUT /user/configuration
Update user configuration.

**Request Body:**
```json
{
  "folderTemplate": "{Proveedor}_{Fecha}_{NºFactura}_{Monto}",
  "rootFolder": "Facturas",
  "historicalRange": 60,
  "syncFrequency": "daily"
}
```

### Invoice Management

#### GET /invoice
Get user's invoices with pagination.

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `status` (string, optional): Filter by status (processed, pending, error)
- `provider` (string, optional): Filter by provider
- `startDate` (string, optional): Filter by start date (YYYY-MM-DD)
- `endDate` (string, optional): Filter by end date (YYYY-MM-DD)

**Response:**
```json
{
  "invoices": [
    {
      "id": "invoice_id",
      "fileName": "Provider_2024-01-15_INV-001_1500.00.pdf",
      "fileId": "google_drive_file_id",
      "checksum": "md5_checksum",
      "metadata": {
        "provider": "Provider Name",
        "date": "2024-01-15",
        "invoiceNumber": "INV-001",
        "amount": 1500.00,
        "currency": "USD"
      },
      "status": "processed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### GET /invoice/:id
Get specific invoice details.

**Response:**
```json
{
  "id": "invoice_id",
  "userId": "user_id",
  "messageId": "gmail_message_id",
  "fileName": "Provider_2024-01-15_INV-001_1500.00.pdf",
  "fileId": "google_drive_file_id",
  "checksum": "md5_checksum",
  "metadata": {
    "provider": "Provider Name",
    "date": "2024-01-15",
    "invoiceNumber": "INV-001",
    "amount": 1500.00,
    "currency": "USD"
  },
  "status": "processed",
  "processingLog": [
    {
      "step": "email_fetch",
      "status": "success",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### POST /invoice/process
Manually trigger invoice processing.

**Request Body:**
```json
{
  "historicalRange": 30,
  "force": false
}
```

**Response:**
```json
{
  "message": "Processing started",
  "jobId": "job_id",
  "estimatedTime": "5 minutes"
}
```

#### DELETE /invoice/:id
Delete invoice.

**Response:**
```json
{
  "message": "Invoice deleted successfully"
}
```

#### GET /invoice/stats/summary
Get invoice statistics.

**Response:**
```json
{
  "total": 150,
  "processed": 140,
  "pending": 5,
  "error": 5,
  "totalAmount": 45000.00,
  "currency": "USD",
  "monthlyStats": [
    {
      "month": "2024-01",
      "count": 45,
      "amount": 13500.00
    }
  ],
  "topProviders": [
    {
      "provider": "Provider A",
      "count": 25,
      "amount": 7500.00
    }
  ]
}
```

### Subscription Management

#### GET /subscription/plans
Get available subscription plans.

**Response:**
```json
{
  "plans": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "currency": "USD",
      "billingCycle": "monthly",
      "features": [
        "20 invoices per month",
        "Daily sync",
        "Basic OCR"
      ],
      "limits": {
        "monthlyInvoices": 20,
        "syncFrequency": "daily"
      }
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 29,
      "currency": "USD",
      "billingCycle": "monthly",
      "features": [
        "1,000 invoices per month",
        "Every 6 hours sync",
        "Advanced OCR",
        "CSV Export"
      ],
      "limits": {
        "monthlyInvoices": 1000,
        "syncFrequency": "6h"
      }
    },
    {
      "id": "premium",
      "name": "Premium",
      "price": 99,
      "currency": "USD",
      "billingCycle": "monthly",
      "features": [
        "Unlimited invoices",
        "Hourly sync",
        "Priority OCR",
        "Priority support",
        "API access"
      ],
      "limits": {
        "monthlyInvoices": -1,
        "syncFrequency": "hourly"
      }
    }
  ]
}
```

#### POST /subscription/create-checkout-session
Create Stripe checkout session.

**Request Body:**
```json
{
  "planId": "pro",
  "successUrl": "https://your-domain.com/success",
  "cancelUrl": "https://your-domain.com/cancel"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### POST /subscription/create-portal-session
Create Stripe customer portal session.

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

#### GET /subscription/current
Get current subscription status.

**Response:**
```json
{
  "planId": "pro",
  "status": "active",
  "currentPeriodStart": "2024-01-01T00:00:00Z",
  "currentPeriodEnd": "2024-02-01T00:00:00Z",
  "cancelAtPeriodEnd": false,
  "usage": {
    "invoicesThisMonth": 45,
    "monthlyLimit": 1000
  }
}
```

### Webhooks

#### POST /webhook/gmail
Handle Gmail push notifications.

**Request Body:**
```json
{
  "message": {
    "data": "base64_encoded_message_data"
  }
}
```

#### POST /webhook/stripe
Handle Stripe webhooks.

**Headers:**
- `Stripe-Signature`: Webhook signature

**Request Body:**
```json
{
  "id": "evt_...",
  "object": "event",
  "type": "invoice.payment_succeeded",
  "data": {
    "object": {
      "id": "in_...",
      "customer": "cus_...",
      "subscription": "sub_..."
    }
  }
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": {
    "message": "Validation error",
    "details": {
      "field": "error description"
    }
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "Resource not found"
  }
}
```

### 429 Too Many Requests
```json
{
  "error": {
    "message": "Rate limit exceeded",
    "retryAfter": 60
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "Internal server error"
  }
}
```

## Rate Limiting

- **Authentication endpoints**: 10 requests per minute
- **API endpoints**: 100 requests per 15 minutes
- **Webhook endpoints**: 1000 requests per hour

## Data Models

### User
```typescript
interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  picture?: string;
  subscription: 'free' | 'pro' | 'premium';
  configuration: UserConfiguration;
  createdAt: Date;
  updatedAt: Date;
}
```

### UserConfiguration
```typescript
interface UserConfiguration {
  folderTemplate: string;
  rootFolder: string;
  historicalRange: number;
  syncFrequency: 'daily' | '6h' | 'hourly';
  googleDriveFolderId?: string;
  googleSheetId?: string;
}
```

### Invoice
```typescript
interface Invoice {
  id: string;
  userId: string;
  messageId: string;
  fileName: string;
  fileId: string;
  checksum: string;
  metadata: InvoiceMetadata;
  status: 'pending' | 'processed' | 'error';
  processingLog: ProcessingLog[];
  createdAt: Date;
  updatedAt: Date;
}
```

### InvoiceMetadata
```typescript
interface InvoiceMetadata {
  provider: string;
  date: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
}
```

### ProcessingLog
```typescript
interface ProcessingLog {
  step: string;
  status: 'success' | 'error';
  message?: string;
  timestamp: Date;
}
``` 