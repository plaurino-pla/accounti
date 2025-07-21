# Document AI Setup Instructions

## Step 1: Create Document AI Processor

1. **Go to Google Cloud Console Document AI:**
   https://console.cloud.google.com/ai/document-ai?project=accounti-4698b

2. **Create a New Processor:**
   - Click "Create Processor"
   - Choose "Invoice Parser" (or "Document OCR" if Invoice Parser is not available)
   - Name: "Invoice Processing"
   - Region: "us (multiple regions)"
   - Click "Create"

3. **Copy the Processor ID:**
   - After creation, you'll see a processor ID (looks like: `1234567890abcdef`)
   - Copy this ID

## Step 2: Configure Firebase Functions

Run this command with your actual processor ID:

```bash
firebase functions:config:set google.document_ai_processor_id="YOUR_PROCESSOR_ID"
firebase deploy --only functions
```

## Step 3: Test the Enhanced Extraction

The system will now use Document AI for better data extraction:
- Vendor names
- Invoice dates
- Due dates
- Amounts
- Invoice numbers
- Tax amounts

## Alternative: Improve Text-Based Extraction

If Document AI is not available, we can improve the regex-based extraction as a fallback. 