# 📄 Accounti - Intelligent Invoice Processing App

## 🧠 Project Summary
Accounti is an intelligent document processing app that connects with a user's Google account (Gmail, Google Drive, and Google Sheets), fetches invoices from their inbox using Google Cloud Document AI, and builds a smart, centralized invoice dashboard. It automatically stores invoices in Google Drive, extracts structured data, updates a database, and generates a spreadsheet and dashboard for financial visibility.

## 🔧 Tech Stack
- **Frontend/UI**: React with TypeScript, Firebase Hosting, Tailwind CSS
- **Backend**: Firebase Functions (Node.js/TypeScript)
- **Auth & DB**: Firebase Auth + Firestore
- **Document Parsing**: Google Cloud Document AI
- **Storage**: Google Drive API
- **Email Parsing**: Gmail API
- **Sheets**: Google Sheets API
- **Scheduler**: Firebase scheduled functions

## 🔐 OAuth Scopes & Permissions
```
https://www.googleapis.com/auth/gmail.readonly – to read emails and metadata
https://www.googleapis.com/auth/drive.file – to create & manage Drive files
https://www.googleapis.com/auth/spreadsheets – to create and update sheets
https://www.googleapis.com/auth/userinfo.email – for basic user identity
```

## 🏗️ Project Structure Plan

```
accounti/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .firebaserc
├── functions/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── src/
│       ├── index.ts
│       ├── services/
│       │   ├── auth.ts
│       │   ├── gmail.ts
│       │   ├── drive.ts
│       │   ├── sheets.ts
│       │   ├── documentAI.ts
│       │   └── scheduler.ts
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── invoices.ts
│       │   └── account.ts
│       └── utils/
│           ├── logger.ts
│           └── helpers.ts
└── src/
    ├── components/
    │   ├── Dashboard.tsx
    │   ├── InvoiceTable.tsx
    │   ├── AuthComponent.tsx
    │   └── AccountManager.tsx
    ├── services/
    │   └── api.ts
    ├── hooks/
    │   └── useAuth.ts
    ├── types/
    │   └── invoice.ts
    ├── App.tsx
    └── index.tsx
```

## 🔄 Development Phases

### Phase 1: Foundation & Authentication
**Goal**: Set up basic project structure and Google OAuth

**Tasks**:
1. ✅ Initialize Firebase project
2. ⏳ Set up React frontend with TypeScript
3. ⏳ Configure Firebase Functions backend
4. ⏳ Implement Google OAuth with all required scopes
5. ⏳ Create user authentication flow
6. ⏳ Set up Firestore user collections

**Deliverables**:
- Working authentication system
- User can sign in with Google
- Basic React app structure

### Phase 2: Gmail Integration & Email Processing
**Goal**: Connect to Gmail API and process emails

**Tasks**:
1. ⏳ Implement Gmail API service
2. ⏳ Create email fetching logic (incremental from last timestamp)
3. ⏳ Download email attachments
4. ⏳ Filter for PDF/image attachments
5. ⏳ Store processing timestamps in Firestore

**Deliverables**:
- Can fetch emails with attachments
- Downloads and processes attachments
- Tracks processing progress

### Phase 3: Document AI Integration
**Goal**: Identify and extract data from invoices

**Tasks**:
1. ⏳ Set up Google Cloud Document AI
2. ⏳ Implement invoice detection logic (multilingual keywords)
3. ⏳ Create Document AI processing service
4. ⏳ Extract structured invoice data:
   - Invoice Number
   - Vendor Name
   - Issue Date
   - Due Date
   - Amount
   - Currency
   - Tax/VAT breakdown
5. ⏳ Store extracted data in Firestore

**Deliverables**:
- Automatic invoice detection
- Structured data extraction
- Multilingual support

### Phase 4: Google Drive Integration
**Goal**: Store invoices in user's Google Drive

**Tasks**:
1. ⏳ Implement Google Drive API service
2. ⏳ Create dedicated "Accounti Invoices" folder
3. ⏳ Upload invoice files to Drive
4. ⏳ Generate shareable links
5. ⏳ Store Drive file metadata in Firestore

**Deliverables**:
- Automatic Drive folder creation
- Invoice file storage
- File linking system

### Phase 5: Google Sheets Integration
**Goal**: Generate and maintain invoice spreadsheet

**Tasks**:
1. ⏳ Implement Google Sheets API service
2. ⏳ Create user's invoice spreadsheet
3. ⏳ Set up column headers: Invoice #, Vendor, Date, Currency, Amount, Drive Link
4. ⏳ Append new invoices automatically
5. ⏳ Update existing entries if needed

**Deliverables**:
- Auto-generated spreadsheet
- Real-time updates
- Proper formatting

### Phase 6: Dashboard & Frontend
**Goal**: Create beautiful, functional user interface

**Tasks**:
1. ⏳ Design dashboard layout
2. ⏳ Create invoice table component
3. ⏳ Implement "Fetch New Invoices" button
4. ⏳ Add invoice statistics (total amount, count, etc.)
5. ⏳ Create responsive design
6. ⏳ Add loading states and error handling

**Deliverables**:
- Complete dashboard UI
- Invoice management interface
- Responsive design

### Phase 7: Account Management
**Goal**: User account features and data management

**Tasks**:
1. ⏳ Implement "Clear All Data" functionality:
   - Delete Drive folder content
   - Clear Firestore collections
   - Remove Sheets
2. ⏳ Account disconnect feature
3. ⏳ Token refresh mechanism
4. ⏳ User settings management

**Deliverables**:
- Complete account management
- Data cleanup functionality
- Token management

### Phase 8: Automation & Scheduling
**Goal**: Automated invoice processing

**Tasks**:
1. ⏳ Set up Firebase scheduled functions
2. ⏳ Implement 6-hour automatic scanning
3. ⏳ Error handling and retry logic
4. ⏳ User notification system
5. ⏳ Performance optimization

**Deliverables**:
- Automatic background processing
- Reliable scheduling system
- Error recovery

## 📊 Data Models

### User Document (Firestore)
```typescript
interface User {
  uid: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  refreshToken: string;
  driveFolder?: string;
  spreadsheetId?: string;
  lastProcessedTimestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Invoice Document (Firestore)
```typescript
interface Invoice {
  id: string;
  userId: string;
  emailId: string;
  attachmentId: string;
  
  // Extracted Data
  invoiceNumber?: string;
  vendorName?: string;
  issueDate?: Date;
  dueDate?: Date;
  amount?: number;
  currency?: string;
  taxAmount?: number;
  
  // File Info
  originalFilename: string;
  driveFileId?: string;
  driveLink?: string;
  
  // Processing Info
  confidence: number;
  processed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Processing Log (Firestore)
```typescript
interface ProcessingLog {
  id: string;
  userId: string;
  emailsScanned: number;
  attachmentsProcessed: number;
  invoicesFound: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  triggerType: 'manual' | 'scheduled';
}
```

## 🔒 Security Considerations

1. **Token Security**: Store OAuth tokens encrypted in Firestore
2. **Scope Limitation**: Request minimal required scopes
3. **Data Privacy**: Process documents in memory, don't log sensitive data
4. **User Consent**: Clear explanation of permissions and data usage
5. **Error Handling**: Don't expose internal errors to users

## 🚀 Deployment Strategy

1. **Environment Setup**:
   - Development: Local Firebase emulators
   - Staging: Firebase test project
   - Production: Main Firebase project

2. **CI/CD Pipeline**:
   - GitHub Actions for automated testing
   - Automatic deployment to staging on PR
   - Manual approval for production deployment

3. **Monitoring**:
   - Firebase Performance Monitoring
   - Cloud Functions logs
   - Error tracking with Sentry

## 📋 Success Metrics

1. **Functionality**:
   - ✅ User can authenticate with Google
   - ✅ Emails are processed correctly
   - ✅ Invoices are detected and extracted
   - ✅ Files are stored in Drive
   - ✅ Spreadsheet is updated
   - ✅ Dashboard displays data

2. **Performance**:
   - Email processing < 30 seconds per batch
   - UI responsiveness < 2 seconds
   - 99.9% uptime for scheduled functions

3. **User Experience**:
   - Intuitive onboarding flow
   - Clear error messages
   - Responsive design on all devices

## 🏁 Getting Started

**Next Steps**:
1. Start with Phase 1: Foundation & Authentication
2. Set up React frontend with TypeScript
3. Configure Firebase Functions
4. Implement Google OAuth flow

**Ready to begin development!** 🚀 