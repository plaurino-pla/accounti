import OpenAI from 'openai';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

export interface GPTExtractedData {
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

  // Process invoice with ChatGPT using base64 PDF data
  async processInvoiceWithChatGPT(buffer: Buffer, filename: string): Promise<GPTExtractedData> {
    console.log('=== CHATGPT INVOICE PROCESSING START ===');
    console.log('Filename:', filename);
    console.log('Buffer size:', buffer.length, 'bytes');

    // Check file size (max 5MB to avoid memory issues)
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSizeBytes) {
      console.log(`File too large (${buffer.length} bytes), skipping ChatGPT processing`);
      return {
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
      // Convert PDF buffer to base64
      const pdfBase64 = buffer.toString('base64');
      console.log('PDF converted to base64, length:', pdfBase64.length);
      
      console.log('Sending to ChatGPT with PDF data...');
      
      // Send to ChatGPT with PDF data
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert invoice data extraction system. Analyze the provided PDF document to extract structured data.

CRITICAL INSTRUCTIONS:
1. You will receive a PDF document as base64 data
2. Extract the most accurate data possible from the PDF
3. Return ONLY valid JSON with these exact fields:
   - vendorName: string (company/supplier name)
   - invoiceNumber: string (invoice ID/number)
   - issueDate: string (YYYY-MM-DD format)
   - dueDate: string (YYYY-MM-DD format)
   - amount: number (total amount, no currency symbol)
   - currency: string (3-letter currency code like USD, EUR, etc.)
   - taxAmount: number (tax/VAT amount if present)
   - confidence: number (0.0 to 1.0, how confident you are)

4. If a field is not found, use null
5. For amounts, extract only the number (no currency symbols)
6. For dates, use YYYY-MM-DD format
7. Handle multi-language invoices (Spanish, Portuguese, Italian, etc.)
8. ALWAYS return valid JSON, even if you can't extract much data
9. If you can't read the PDF, return a JSON with null values and low confidence`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please extract invoice data from this PDF document. The document is attached as base64 data.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`
                }
              }
            ]
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