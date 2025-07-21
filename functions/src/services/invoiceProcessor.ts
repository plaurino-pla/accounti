import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import pdfParse from 'pdf-parse';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export interface ProcessedInvoice {
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
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export class InvoiceProcessor {
  private documentAiClient: DocumentProcessorServiceClient;
  private processorId: string;
  private location: string;

  constructor() {
    this.documentAiClient = new DocumentProcessorServiceClient();
    this.processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || '';
    this.location = process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'us';
  }

  // Check if attachment is likely an invoice
  async isInvoiceAttachment(filename: string, buffer: Buffer): Promise<{ isInvoice: boolean; confidence: number }> {
    try {
      // Check filename for invoice keywords
      const filenameLower = filename.toLowerCase();
      const invoiceKeywords = [
        'invoice', 'factura', 'fatura', 'fattura', 'rechnung', 'فاتورة', '請求書',
        'bill', 'receipt', 'statement', 'quote', 'estimate'
      ];
      
      const filenameMatch = invoiceKeywords.some(keyword => filenameLower.includes(keyword));
      
      // Extract text from PDF/image
      const text = await this.extractTextFromBuffer(buffer);
      const textLower = text.toLowerCase();
      
      // Check text content for invoice indicators
      const textMatch = invoiceKeywords.some(keyword => textLower.includes(keyword));
      
      // Additional invoice indicators
      const invoiceIndicators = [
        'total', 'amount', 'due', 'payment', 'balance', 'subtotal',
        'tax', 'vat', 'gst', 'currency', 'usd', 'eur', 'gbp'
      ];
      
      const hasInvoiceIndicators = invoiceIndicators.some(indicator => textLower.includes(indicator));
      
      // Calculate confidence score
      let confidence = 0;
      if (filenameMatch) confidence += 0.3;
      if (textMatch) confidence += 0.4;
      if (hasInvoiceIndicators) confidence += 0.3;
      
      const isInvoice = confidence >= 0.5;
      
      return { isInvoice, confidence };
    } catch (error) {
      console.error('Error checking if attachment is invoice:', error);
      return { isInvoice: false, confidence: 0 };
    }
  }

  // Extract text from buffer (PDF or image)
  private async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      // Try PDF parsing first
      const pdfData = await pdfParse(buffer);
      return pdfData.text || '';
    } catch (error) {
      // If PDF parsing fails, try Document AI
      try {
        return await this.extractTextWithDocumentAI(buffer);
      } catch (docAiError) {
        console.error('Both PDF parsing and Document AI failed:', error, docAiError);
        return '';
      }
    }
  }

  // Extract text using Document AI
  private async extractTextWithDocumentAI(buffer: Buffer): Promise<string> {
    try {
      const name = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${this.location}/processors/${this.processorId}`;
      
      const request = {
        name,
        rawDocument: {
          content: buffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      };

      const [result] = await this.documentAiClient.processDocument(request);
      const { document } = result;

      return document?.text || '';
    } catch (error) {
      console.error('Document AI extraction failed:', error);
      throw error;
    }
  }

  // Process invoice with Document AI
  async processInvoiceWithDocumentAI(buffer: Buffer): Promise<Partial<ProcessedInvoice>> {
    try {
      if (!this.processorId) {
        throw new Error('Document AI processor ID not configured');
      }

      const name = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/${this.location}/processors/${this.processorId}`;
      
      const request = {
        name,
        rawDocument: {
          content: buffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      };

      const [result] = await this.documentAiClient.processDocument(request);
      const { document } = result;

      if (!document?.entities) {
        throw new Error('No entities found in document');
      }

      // Extract invoice data from Document AI entities
      const extractedData = this.extractInvoiceDataFromEntities(document.entities);
      
      return {
        ...extractedData,
        confidence: document.confidence || 0.5
      };
    } catch (error) {
      console.error('Document AI processing failed:', error);
      // Fallback to text-based extraction
      return this.extractInvoiceDataFromText(await this.extractTextFromBuffer(buffer));
    }
  }

  // Extract invoice data from Document AI entities
  private extractInvoiceDataFromEntities(entities: any[]): Partial<ProcessedInvoice> {
    const data: Partial<ProcessedInvoice> = {};
    
    for (const entity of entities) {
      const type = entity.type?.toLowerCase();
      const text = entity.mentionText;
      const confidence = entity.confidence || 0;
      
      switch (type) {
        case 'invoice_id':
        case 'invoice_number':
          data.invoiceNumber = text;
          break;
        case 'supplier_name':
        case 'vendor_name':
        case 'company_name':
          data.vendorName = text;
          break;
        case 'invoice_date':
        case 'issue_date':
          data.issueDate = this.parseDate(text);
          break;
        case 'due_date':
          data.dueDate = this.parseDate(text);
          break;
        case 'total_amount':
        case 'invoice_amount':
        case 'amount':
          data.amount = this.parseAmount(text);
          break;
        case 'currency':
          data.currency = text;
          break;
        case 'tax_amount':
        case 'vat_amount':
          data.taxAmount = this.parseAmount(text);
          break;
      }
    }
    
    return data;
  }

  // Fallback: Extract invoice data from text using regex patterns
  private extractInvoiceDataFromText(text: string): Partial<ProcessedInvoice> {
    const data: Partial<ProcessedInvoice> = {};
    
    // Invoice number patterns
    const invoiceNumberPatterns = [
      /invoice\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /invoice\s*number\s*:?\s*([A-Z0-9\-_]+)/i,
      /inv\s*#?\s*:?\s*([A-Z0-9\-_]+)/i
    ];
    
    for (const pattern of invoiceNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.invoiceNumber = match[1];
        break;
      }
    }
    
    // Amount patterns
    const amountPatterns = [
      /total\s*:?\s*\$?([0-9,]+\.?[0-9]*)/i,
      /amount\s*:?\s*\$?([0-9,]+\.?[0-9]*)/i,
      /balance\s*due\s*:?\s*\$?([0-9,]+\.?[0-9]*)/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.amount = this.parseAmount(match[1]);
        break;
      }
    }
    
    // Date patterns
    const datePatterns = [
      /date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /invoice\s*date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.issueDate = this.parseDate(match[1]);
        break;
      }
    }
    
    return data;
  }

  // Parse amount string to number
  private parseAmount(amountStr: string): number | undefined {
    if (!amountStr) return undefined;
    
    const cleaned = amountStr.replace(/[^\d.,]/g, '');
    const parsed = parseFloat(cleaned.replace(',', ''));
    
    return isNaN(parsed) ? undefined : parsed;
  }

  // Parse date string to Date object
  private parseDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }

  // Save processed invoice to Firestore
  async saveInvoiceToDatabase(invoice: ProcessedInvoice): Promise<void> {
    try {
      await db.collection('invoices').doc(invoice.id).set(invoice);
    } catch (error) {
      console.error('Error saving invoice to database:', error);
      throw error;
    }
  }

  // Check for duplicate invoices
  async checkForDuplicateInvoice(userId: string, emailId: string, attachmentId: string): Promise<boolean> {
    try {
      const snapshot = await db.collection('invoices')
        .where('userId', '==', userId)
        .where('emailId', '==', emailId)
        .where('attachmentId', '==', attachmentId)
        .limit(1)
        .get();
      
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking for duplicate invoice:', error);
      return false;
    }
  }
} 