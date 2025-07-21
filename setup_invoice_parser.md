# Setup Google Document AI Invoice Parser

## Why Invoice Parser?

Google's **Invoice Parser** is a pre-trained processor specifically designed to extract structured data from invoices in any format. Unlike Custom Extractors that need training, this works out-of-the-box with high accuracy.

## Setup Steps:

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Select your project: `accounti-4698b`

### 2. Navigate to Document AI
- Go to: **APIs & Services** → **Document AI**
- Or search for "Document AI" in the search bar

### 3. Create Invoice Parser Processor
- Click **"Create Processor"**
- Select **"Invoice Parser"** from the list
- Choose **Location**: `us` (United States)
- Click **"Create"**

### 4. Copy the Processor ID
- After creation, you'll see a Processor ID like: `1234567890abcdef`
- Copy this ID

### 5. Update Firebase Functions Config
Run this command in your terminal:

```bash
firebase functions:config:set google.document_ai_processor_id="YOUR_PROCESSOR_ID_HERE"
```

Replace `YOUR_PROCESSOR_ID_HERE` with the actual Processor ID you copied.

### 6. Deploy the Functions
```bash
firebase deploy --only functions
```

## What Invoice Parser Extracts:

The Invoice Parser automatically extracts these fields from any invoice format:
- **Invoice ID/Number**
- **Supplier/Vendor Name**
- **Invoice Date**
- **Due Date**
- **Total Amount**
- **Currency**
- **Tax Amount**
- **Line Items** (if needed)

## Benefits:

✅ **No training required** - works immediately
✅ **Handles any invoice format** - from different countries, companies, layouts
✅ **High accuracy** - trained on millions of invoices
✅ **Multi-language support** - works with invoices in different languages
✅ **Automatic field detection** - finds fields regardless of layout

## Testing:

After setup, try scanning your invoices again. The system will now use the Invoice Parser to extract structured data with much higher accuracy! 