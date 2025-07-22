import OpenAI from 'openai';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

export interface GPTExtractedData {
  isInvoice: boolean;
  vendorName?: string | null;
  invoiceNumber?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  amount?: number | null;
  currency?: string | null;
  taxAmount?: number | null;
  confidence: number;
}

export class GPTVisionService {
  private openai: OpenAI;

  constructor() {
    const apiKey = functions.config().openai?.api_key;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    this.openai = new OpenAI({ apiKey });
    console.log('=== GPT SERVICE INITIALIZED ===');
  }

  // Process invoice with ChatGPT using text extraction
  async processInvoiceWithChatGPT(buffer: Buffer, filename: string): Promise<GPTExtractedData> {
    console.log('=== CHATGPT INVOICE PROCESSING START ===');
    console.log('Filename:', filename);
    console.log('Buffer size:', buffer.length, 'bytes');

    // Check file size (max 5MB to avoid memory issues)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSizeBytes) {
      console.log(`File too large (${buffer.length} bytes), skipping ChatGPT processing`);
      return {
        isInvoice: false,
        vendorName: null,
        invoiceNumber: null,
        issueDate: null,
        dueDate: null,
        amount: null,
        currency: null,
        taxAmount: null,
        confidence: 0.1
      };
    }

    try {
      // Extract text from PDF using pdf-parse
      let extractedText = '';
      try {
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';
        console.log('PDF text extracted, length:', extractedText.length);
        console.log('First 500 characters:', extractedText.substring(0, 500));
      } catch (pdfError) {
        console.error('PDF text extraction failed:', pdfError);
        extractedText = '[PDF text extraction failed]';
      }

      if (!extractedText || extractedText.trim().length === 0) {
        console.log('No text extracted from PDF');
        return {
          isInvoice: false,
          vendorName: null,
          invoiceNumber: null,
          issueDate: null,
          dueDate: null,
          amount: null,
          currency: null,
          taxAmount: null,
          confidence: 0.1
        };
      }
      
      console.log('Sending to ChatGPT with extracted text...');
      
      // Send to ChatGPT with extracted text
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert invoice detection and data extraction system. Your job is to FIRST determine if the document is an invoice, and ONLY if it is, extract the data.

CRITICAL INSTRUCTIONS:
1. FIRST: Determine if this is actually an invoice document
2. Look for clear invoice indicators:
   - Keywords: "INVOICE", "FACTURA", "FATTURA", "FATURA", "RECEIPT", "BILL"
   - Invoice numbers: INV-, #, 2024-, etc.
   - Total amounts with currency
   - Vendor/supplier information
   - Due dates or payment terms

3. IF THIS IS NOT AN INVOICE:
   - Return: {"isInvoice": false, "confidence": 0.0}
   - Do NOT extract any other data
   - Do NOT process non-invoice documents

4. IF THIS IS AN INVOICE:
   - Return valid JSON with these exact fields:
     - isInvoice: true
     - vendorName: string (company/supplier name)
     - invoiceNumber: string (invoice ID/number)
     - issueDate: string (YYYY-MM-DD format)
     - dueDate: string (YYYY-MM-DD format)
     - amount: number (total amount, no currency symbol)
     - currency: string (3-letter currency code like USD, EUR, etc.)
     - taxAmount: number (tax/VAT amount if present)
     - confidence: number (0.0 to 1.0, how confident you are)

5. For amounts, extract only the number (no currency symbols)
6. For dates, use YYYY-MM-DD format
7. Handle multi-language invoices (Spanish, Portuguese, Italian, etc.)
8. If you can't extract much data but it's clearly an invoice, use low confidence (0.3-0.5)
9. ALWAYS return valid JSON`
          },
          {
            role: 'user',
            content: `Please extract invoice data from this document text:\n\n${extractedText.substring(0, 3000)}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      console.log('ChatGPT response received');
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from ChatGPT');
      }

      console.log('ChatGPT raw response:', content);

      // Parse JSON response
      let extractedData: GPTExtractedData;
      try {
        // Try to extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, create a fallback response
          console.log('No JSON found in response, creating fallback');
          extractedData = {
            isInvoice: false,
            vendorName: null,
            invoiceNumber: null,
            issueDate: null,
            dueDate: null,
            amount: null,
            currency: null,
            taxAmount: null,
            confidence: 0.1
          };
        }
      } catch (parseError) {
        console.error('Failed to parse ChatGPT response:', parseError);
        console.log('Raw response was:', content);
        // Create fallback data
        extractedData = {
          isInvoice: false,
          vendorName: null,
          invoiceNumber: null,
          issueDate: null,
          dueDate: null,
          amount: null,
          currency: null,
          taxAmount: null,
          confidence: 0.1
        };
      }

      // Validate and clean the data
      const cleanData: GPTExtractedData = {
        isInvoice: extractedData.isInvoice || false,
        vendorName: extractedData.vendorName || null,
        invoiceNumber: extractedData.invoiceNumber || null,
        issueDate: extractedData.issueDate || null,
        dueDate: extractedData.dueDate || null,
        amount: typeof extractedData.amount === 'number' ? extractedData.amount : null,
        currency: extractedData.currency || null,
        taxAmount: typeof extractedData.taxAmount === 'number' ? extractedData.taxAmount : null,
        confidence: typeof extractedData.confidence === 'number' ? Math.max(0, Math.min(1, extractedData.confidence)) : 0.1
      };

      console.log('=== CHATGPT EXTRACTION COMPLETE ===');
      console.log('Extracted data:', cleanData);

      return cleanData;

    } catch (error) {
      console.error('=== CHATGPT PROCESSING FAILED ===');
      console.error('Error:', error);
      
      // Return fallback data instead of throwing
      console.log('Returning fallback data due to error');
      return {
        isInvoice: false,
        vendorName: null,
        invoiceNumber: null,
        issueDate: null,
        dueDate: null,
        amount: null,
        currency: null,
        taxAmount: null,
        confidence: 0.1
      };
    }
  }

  // Legacy method for backward compatibility
  async extractInvoiceDataFromImage(buffer: Buffer): Promise<GPTExtractedData> {
    return this.processInvoiceWithChatGPT(buffer, 'unknown.pdf');
  }
} 