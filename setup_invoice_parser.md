# Setting up Google Document AI Invoice Parser

## Overview
We're switching from Document OCR to the **Invoice Parser** processor, which is specifically designed to understand and extract structured data from invoices.

## Why Invoice Parser?
- **Pre-trained for invoices**: Understands invoice layouts and field types
- **Extracts structured data**: Vendor name, amounts, dates, invoice numbers, etc.
- **Multi-language support**: Works with invoices in different languages
- **Much more accurate**: Better than OCR + regex patterns

## Setup Steps

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Select your project: `accounti-4698b`

### 2. Navigate to Document AI
- Go to **APIs & Services** → **Document AI**
- Or search for "Document AI" in the search bar

### 3. Create Invoice Parser Processor
- Click **"Create Processor"**
- Select **"Invoice Parser"** from the processor types
- Choose **"Invoice Parser"** (not "Invoice Parser (US)" or other variants)
- Set **Location** to `us` (United States)
- Click **"Create"**

### 4. Get Processor ID
- After creation, copy the **Processor ID** (looks like: `12345678901234567890`)
- This will be used in our configuration

### 5. Update Configuration
Run this command to update the processor ID:

```bash
firebase functions:config:set google.document_ai_processor_id="YOUR_PROCESSOR_ID"
```

Replace `YOUR_PROCESSOR_ID` with the actual processor ID you copied.

### 6. Deploy Functions
```bash
firebase deploy --only functions
```

## How It Works

### Before (OCR + Regex)
1. Extract text from PDF
2. Apply regex patterns to find data
3. Often fails due to different invoice formats

### After (Invoice Parser)
1. Send PDF to Document AI
2. AI understands the document structure
3. Returns structured entities (vendor, amount, date, etc.)
4. Much more reliable extraction

## Expected Results

The Invoice Parser will extract:
- ✅ **Vendor/Supplier Name**
- ✅ **Invoice Number**
- ✅ **Total Amount**
- ✅ **Currency**
- ✅ **Issue Date**
- ✅ **Due Date**
- ✅ **Tax Amount**

## Testing

After setup:
1. Go to https://accounti-4698b.web.app
2. Sign in
3. Click "Fetch New Invoices"
4. Check the console logs - you should see:
   - "Using Document AI Invoice Parser entities"
   - "✅ Found vendor name: [Company Name]"
   - "✅ Found amount: [Amount]"
   - etc.

## Benefits

- **Higher accuracy**: AI understands invoice semantics
- **Better handling**: Works with different invoice formats
- **Structured output**: Clean, reliable data extraction
- **Multi-language**: Handles invoices in various languages 