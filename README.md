# Accounti - Smart Invoice Organizer

A SaaS application that automates invoice capture, classification, and storage from email using OCR and Google APIs.

## Features

- 🔗 **Gmail & Google Drive Integration** - Connect and authorize accounts
- 📄 **OCR Processing** - Extract data from PDF invoices automatically
- 📁 **Smart Organization** - Organize files in configurable Drive folders
- 📊 **Google Sheets Integration** - Record metadata in customizable sheets
- ⚙️ **Flexible Configuration** - Custom naming templates and folder structures
- 💳 **Subscription Management** - Free, Pro, and Premium tiers
- 🔄 **Automated Processing** - Scheduled sync based on subscription plan

## Architecture

```
Frontend (React + TypeScript)
├── Dashboard
├── OAuth Flow
├── Configuration Panel
├── Invoice History
└── Subscription Management

Backend (Node.js + Express)
├── OAuth2 Endpoints
├── Google APIs Integration
├── OCR Processing
├── File Management
└── Subscription Logic

Database (Firestore)
├── Users Collection
├── Invoices Collection
└── Configuration Storage
```

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd accounti
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your Google OAuth credentials and other settings
   ```

3. **Run Development**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Subscription Tiers

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Monthly Invoices | 20 | 1,000 | Unlimited |
| Sync Frequency | Daily | Every 6h | Hourly |
| OCR Priority | Standard | Standard | High |
| Support | Community | Email | SLA |

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: Firestore
- **Authentication**: Google OAuth2
- **File Storage**: Google Drive
- **OCR**: Google Document AI / Tesseract
- **Payments**: Stripe
- **Deployment**: Firebase Hosting + Functions

## License

MIT License 