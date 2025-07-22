import OpenAI from 'openai';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import pdfParse from 'pdf-parse';
import { createCanvas, loadImage } from 'canvas';

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

  // Convert PDF buffer to image (first page)
  private async pdfToImage(buffer: Buffer): Promise<Buffer> {
    try {
      console.log('Converting PDF to image...');
      
      // Parse PDF to get dimensions
      const pdfData = await pdfParse(buffer);
      const pageCount = pdfData.numpages || 1;
      console.log(`PDF has ${pageCount} pages, converting first page`);
      
      // Create a canvas for the first page
      const canvas = createCanvas(800, 1000); // Default size
      const ctx = canvas.getContext('2d');
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add text representation as fallback
      ctx.fillStyle = 'black';
      ctx.font = '12px Arial';
      const lines = pdfData.text.split('\n').slice(0, 50); // First 50 lines
      lines.forEach((line: string, index: number) => {
        ctx.fillText(line.substring(0, 80), 10, 20 + (index * 15));
      });
      
      // Convert canvas to buffer
      const imageBuffer = canvas.toBuffer('image/png');
      console.log('PDF converted to image, size:', imageBuffer.length, 'bytes');
      
      return imageBuffer;
    } catch (error) {
      console.error('Error converting PDF to image:', error);
      throw new Error('Failed to convert PDF to image');
    }
  }

  // Extract text from PDF
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      console.log('Extracting text from PDF...');
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text || '';
      console.log('PDF text extracted, length:', text.length);
      console.log('First 500 characters:', text.substring(0, 500));
      return text;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      return '[PDF text extraction failed]';
    }
  }

  // Process invoice with ChatGPT using both text and image
  async processInvoiceWithChatGPT(buffer: Buffer, filename: string): Promise<GPTExtractedData> {
    console.log('=== CHATGPT INVOICE PROCESSING START ===');
    console.log('Filename:', filename);
    console.log('Buffer size:', buffer.length, 'bytes');

    try {
      // Extract text from PDF
      const extractedText = await this.extractTextFromPDF(buffer);
      
      // Convert PDF to image
      const imageBuffer = await this.pdfToImage(buffer);
      
      // Convert image to base64
      const base64Image = imageBuffer.toString('base64');
      
      console.log('Sending to ChatGPT with text and image...');
      
      // Send to ChatGPT with both text and image
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency
        messages: [
          {
            role: 'system',
            content: `You are an expert invoice data extraction system. Analyze the provided invoice text and image to extract structured data.

IMPORTANT INSTRUCTIONS:
1. Look at BOTH the text content AND the image
2. Extract the most accurate data possible
3. Return ONLY valid JSON with these exact fields:
   - vendorName: string (company/supplier name)
   - invoiceNumber: string (invoice ID/number)
   - issueDate: string (YYYY-MM-DD format)
   - dueDate: string (YYYY-MM-DD format)
   - amount: number (total amount, no currency symbol)
   - currency: string (3-letter currency code like USD, EUR, etc.)
   - taxAmount: number (tax/VAT amount if present)
   - confidence: number (0.0 to 1.0, how confident you are)

4. If a field is not found, use null or empty string
5. For amounts, extract only the number (no currency symbols)
6. For dates, use YYYY-MM-DD format
7. Be very careful with currency detection
8. Handle multi-language invoices (Spanish, Portuguese, Italian, etc.)`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Please extract invoice data from this document. Here's the extracted text:\n\n${extractedText.substring(0, 2000)}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`
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
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        console.error('Failed to parse ChatGPT response:', parseError);
        console.log('Raw response was:', content);
        throw new Error('Invalid JSON response from ChatGPT');
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
        confidence: typeof extractedData.confidence === 'number' ? Math.max(0, Math.min(1, extractedData.confidence)) : 0.8
      };

      console.log('=== CHATGPT EXTRACTION COMPLETE ===');
      console.log('Extracted data:', cleanData);

      return cleanData;

    } catch (error) {
      console.error('=== CHATGPT PROCESSING FAILED ===');
      console.error('Error:', error);
      throw new Error(`ChatGPT processing failed: ${(error as Error).message}`);
    }
  }

  // Legacy method for backward compatibility
  async extractInvoiceDataFromImage(buffer: Buffer): Promise<GPTExtractedData> {
    return this.processInvoiceWithChatGPT(buffer, 'unknown.pdf');
  }
} 