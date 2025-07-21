# Setting up Multi-Lingual Invoice Processing

## Overview
We've implemented a **hybrid approach** for multi-lingual invoice processing that combines:
1. **GPT-4 Vision** (primary) - Handles any language/format
2. **Document AI OCR** (fallback) - For when GPT-4 Vision fails
3. **Enhanced regex patterns** (final fallback) - For basic extraction

## Why This Approach?

### **Problem with Invoice Parser:**
- ❌ Trained only on English/American invoices
- ❌ Poor performance with international invoices
- ❌ Doesn't handle Spanish, Portuguese, Italian, etc.

### **Our Solution:**
- ✅ **GPT-4 Vision** understands any language/format
- ✅ **Multi-lingual prompts** for accurate extraction
- ✅ **Fallback system** ensures reliability
- ✅ **Cost-effective** - only uses GPT-4 when needed

## Setup Steps

### 1. Get OpenAI API Key
- Go to: https://platform.openai.com/api-keys
- Create a new API key
- Copy the key (starts with `sk-`)

### 2. Configure OpenAI API Key
Run this command to set the API key:

```bash
firebase functions:config:set openai.api_key="YOUR_OPENAI_API_KEY"
```

Replace `YOUR_OPENAI_API_KEY` with your actual OpenAI API key.

### 3. Install Dependencies
```bash
cd functions
npm install
```

### 4. Deploy Functions
```bash
firebase deploy --only functions
```

## How It Works

### **Primary: GPT-4 Vision**
1. **Send invoice image** to GPT-4 Vision
2. **Multi-lingual prompt** asks for structured data
3. **Returns JSON** with vendor, amount, dates, etc.
4. **Handles any language** (Spanish, Portuguese, Italian, French, etc.)

### **Fallback: Document AI OCR**
1. **If GPT-4 fails**, use Document AI OCR
2. **Extract clean text** from PDF
3. **Apply enhanced regex patterns**
4. **Multi-language support** with patterns

### **Final Fallback: Basic Extraction**
1. **If all else fails**, use basic PDF parsing
2. **Simple regex patterns** for basic data
3. **Ensures something is always extracted**

## Expected Results

The system will now extract from invoices in:
- ✅ **Spanish** (Facturas)
- ✅ **Portuguese** (Faturas)
- ✅ **Italian** (Fatture)
- ✅ **French** (Factures)
- ✅ **English** (Invoices)
- ✅ **Any other language**

## Testing

After setup:
1. Go to https://accounti-4698b.web.app
2. Sign in
3. Click "Fetch New Invoices"
4. Check the console logs - you should see:
   - "Attempting GPT-4 Vision processing for multi-lingual support"
   - "GPT-4 Vision processing successful"
   - Extracted data in any language

## Cost Considerations

- **GPT-4 Vision**: ~$0.01-0.03 per invoice (high accuracy)
- **Document AI**: ~$0.001 per invoice (fallback)
- **Total cost**: Very reasonable for business use

## Benefits

- **True multi-lingual support**: Works with any language
- **High accuracy**: GPT-4 Vision understands context
- **Reliable fallbacks**: Multiple processing methods
- **Cost-effective**: Only uses expensive AI when needed
- **Future-proof**: Can handle new invoice formats

## Example Prompts

The system uses prompts like:
```
"Extract vendor name from Spanish invoice 'Factura de: [Company]'"
"Find amount in Portuguese format 'Total: €1.234,56'"
"Identify invoice number in Italian 'Fattura Nº 2025-001'"
```

This approach gives you the best of both worlds: **high accuracy with multi-lingual support**! 🌍 