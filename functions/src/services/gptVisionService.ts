import OpenAI from 'openai';
import * as functions from 'firebase-functions';

export interface GPTExtractedData {
  vendorName?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  amount?: number;
  currency?: string;
  taxAmount?: number;
  confidence: number;
}

export class GPTVisionService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || functions.config().openai?.api_key;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async extractInvoiceDataFromImage(imageBuffer: Buffer): Promise<GPTExtractedData> {
    try {
      console.log('=== GPT-4 VISION PROCESSING START ===');
      console.log('Image buffer size:', imageBuffer.length, 'bytes');
      
      const base64Image = imageBuffer.toString('base64');
      console.log('Base64 image length:', base64Image.length);
      
      const prompt = `
You are an expert invoice data extractor. Analyze this invoice and extract the following information in JSON format:

{
  "vendorName": "Company or vendor name",
  "invoiceNumber": "Invoice number or ID",
  "issueDate": "Date when invoice was issued (YYYY-MM-DD format)",
  "dueDate": "Payment due date (YYYY-MM-DD format)",
  "amount": "Total amount as a number (without currency symbol)",
  "currency": "Currency code (EUR, USD, GBP, etc.)",
  "taxAmount": "Tax amount as a number (if available)"
}

Important guidelines:
- Extract vendor/supplier name from the header or "from" section
- Look for invoice numbers in formats like: INV-123, #123, 2025-001, etc.
- Convert all dates to YYYY-MM-DD format
- Extract the total/final amount (not subtotal)
- Identify currency from symbols (€, $, £) or text (EUR, USD, GBP)
- If a field is not found, use null
- Handle invoices in any language (Spanish, Portuguese, Italian, French, etc.)
- Be very precise with the JSON format

Return ONLY the JSON object, no additional text.
`;

      console.log('Sending request to OpenAI GPT-4 Vision...');
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });
      console.log('OpenAI response received');

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from GPT-4 Vision');
      }

      console.log('GPT-4 Vision response:', content);

      // Parse the JSON response
      const extractedData = this.parseGPTResponse(content);
      
      console.log('Parsed GPT data:', extractedData);
      
      return {
        ...extractedData,
        confidence: 0.9 // High confidence for GPT-4 Vision
      };

    } catch (error) {
      console.error('=== GPT-4 VISION PROCESSING FAILED ===');
      console.error('Error type:', typeof error);
      console.error('Error message:', (error as Error).message);
      console.error('Error stack:', (error as Error).stack);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  private parseGPTResponse(content: string): Partial<GPTExtractedData> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const data = JSON.parse(jsonStr);

      // Convert and validate the data
      const result: Partial<GPTExtractedData> = {};

      if (data.vendorName && data.vendorName !== 'null') {
        result.vendorName = data.vendorName.trim();
      }

      if (data.invoiceNumber && data.invoiceNumber !== 'null') {
        result.invoiceNumber = data.invoiceNumber.trim();
      }

      if (data.issueDate && data.issueDate !== 'null') {
        result.issueDate = this.parseDate(data.issueDate);
      }

      if (data.dueDate && data.dueDate !== 'null') {
        result.dueDate = this.parseDate(data.dueDate);
      }

      if (data.amount && data.amount !== 'null') {
        result.amount = this.parseAmount(data.amount);
      }

      if (data.currency && data.currency !== 'null') {
        result.currency = data.currency.toUpperCase().trim();
      }

      if (data.taxAmount && data.taxAmount !== 'null') {
        result.taxAmount = this.parseAmount(data.taxAmount);
      }

      return result;

    } catch (error) {
      console.error('Error parsing GPT response:', error);
      console.error('Raw content:', content);
      throw new Error('Failed to parse GPT response');
    }
  }

  private parseAmount(amount: any): number | undefined {
    if (typeof amount === 'number') return amount;
    if (typeof amount === 'string') {
      const cleaned = amount.replace(/[^\d.,]/g, '');
      const parsed = parseFloat(cleaned.replace(',', '.'));
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private parseDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return undefined;
    }
  }
} 