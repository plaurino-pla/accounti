# Setup Google Document AI OCR

## Why Document OCR?

Google's **Document OCR** extracts clean, high-quality text from any document format and language. Combined with our enhanced multi-language text extraction patterns, this provides superior accuracy for international invoices.

## Setup Steps:

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Select your project: `accounti-4698b`

### 2. Navigate to Document AI
- Go to: **APIs & Services** → **Document AI**
- Or search for "Document AI" in the search bar

### 3. Create Document OCR Processor
- Click **"Create Processor"**
- Select **"Document OCR"** from the list
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

## What Document OCR + Multi-Language Extraction Provides:

Our enhanced system extracts these fields from invoices in any language:
- **Invoice ID/Number** (English, Spanish, Portuguese, Italian, French)
- **Supplier/Vendor Name** (with company type detection: S.L., S.A., LDA, etc.)
- **Invoice Date** (multiple date formats and languages)
- **Due Date** (payment terms in multiple languages)
- **Total Amount** (with currency detection: €, $, £)
- **Currency** (automatic detection)
- **Tax Amount** (VAT, IVA, etc.)

## Benefits:

✅ **No training required** - works immediately
✅ **Multi-language support** - English, Spanish, Portuguese, Italian, French
✅ **High accuracy** - Document AI OCR + enhanced text extraction
✅ **Currency detection** - automatically detects €, $, £
✅ **Company type recognition** - S.L., S.A., LDA, LLC, Inc, etc.
✅ **Flexible date formats** - handles various date patterns
✅ **International invoices** - works with any country's invoice format

## Testing:

After setup, try scanning your invoices again. The system will now use Document OCR to extract clean text and apply our multi-language patterns for much higher accuracy with international invoices! 