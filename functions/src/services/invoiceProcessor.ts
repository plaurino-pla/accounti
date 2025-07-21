import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import pdfParse from 'pdf-parse';
import * as admin from 'firebase-admin';
import { DriveService } from './driveService';
import { SheetsService, SheetRow } from './sheetsService';

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
      // Check if buffer is valid
      if (!buffer || buffer.length === 0) {
        console.log('Empty or invalid buffer provided');
        return '';
      }

      console.log(`Processing buffer of size: ${buffer.length} bytes`);

      // Try PDF parsing first
      try {
        console.log('Attempting PDF parsing...');
        const pdfData = await pdfParse(buffer);
        console.log('PDF parsing successful, text length:', pdfData.text?.length || 0);
        return pdfData.text || '';
      } catch (pdfError) {
        console.log('PDF parsing failed, trying Document AI:', (pdfError as Error).message);
        // If PDF parsing fails, try Document AI
        try {
          return await this.extractTextWithDocumentAI(buffer);
        } catch (docAiError) {
          console.log('Document AI also failed:', (docAiError as Error).message);
          return '';
        }
      }
    } catch (error) {
      console.error('Error extracting text from buffer:', error);
      return '';
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
        confidence: 0.8 // Default confidence for Document AI processing
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
    
    console.log('Extracting data from text, length:', text.length);
    
    // Vendor/Company name patterns - look for common company indicators
    const vendorPatterns = [
      /from\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /bill\s*to\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /vendor\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /company\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:LLC|Inc|Corp|Ltd|Co|Company|Corporation))(?:\n|$)/i
    ];
    
    for (const pattern of vendorPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 2) {
        data.vendorName = match[1].trim();
        console.log('Found vendor:', data.vendorName);
        break;
      }
    }
    
    // Invoice number patterns - more comprehensive
    const invoiceNumberPatterns = [
      /invoice\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /invoice\s*number\s*:?\s*([A-Z0-9\-_]+)/i,
      /inv\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /factura\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /bill\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /#\s*([A-Z0-9\-_]{3,})/i
    ];
    
    for (const pattern of invoiceNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.invoiceNumber = match[1].trim();
        console.log('Found invoice number:', data.invoiceNumber);
        break;
      }
    }
    
    // Amount patterns - more comprehensive
    const amountPatterns = [
      /total\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /amount\s*due\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /balance\s*due\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /grand\s*total\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*amount\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /\$\s*([0-9,]+\.?[0-9]{2})/g // Find all dollar amounts
    ];
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.amount = this.parseAmount(match[1]);
        console.log('Found amount:', data.amount);
        break;
      }
    }
    
    // Date patterns - more comprehensive
    const datePatterns = [
      /invoice\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /issued\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/g, // Any date pattern
      /(\w+\s+\d{1,2},?\s+\d{4})/g // Month DD, YYYY format
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsedDate = this.parseDate(match[1]);
        if (parsedDate) {
          data.issueDate = parsedDate;
          console.log('Found date:', data.issueDate);
          break;
        }
      }
    }
    
    // Due date patterns
    const dueDatePatterns = [
      /due\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /payment\s*due\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
    ];
    
    for (const pattern of dueDatePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const parsedDate = this.parseDate(match[1]);
        if (parsedDate) {
          data.dueDate = parsedDate;
          console.log('Found due date:', data.dueDate);
          break;
        }
      }
    }
    
    console.log('Extracted data:', data);
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

  // Process and save invoice with Drive and Sheets integration
  async processAndSaveInvoice(
    userId: string,
    emailId: string,
    attachmentId: string,
    filename: string,
    buffer: Buffer,
    accessToken: string
  ): Promise<ProcessedInvoice> {
    try {
      // Process the invoice
      const extractedData = await this.processInvoiceWithDocumentAI(buffer);
      
      // Initialize services
      const driveService = new DriveService(accessToken);
      const sheetsService = new SheetsService(accessToken);

      // Upload to Drive
      const driveFile = await driveService.uploadInvoiceFile(userId, filename, buffer);
      
      // Create invoice record
      const invoice: ProcessedInvoice = {
        id: `${userId}_${emailId}_${attachmentId}`,
        userId,
        emailId,
        attachmentId,
        originalFilename: filename,
        driveFileId: driveFile.id,
        driveLink: driveFile.webViewLink,
        confidence: extractedData.confidence || 0.5,
        processed: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        ...extractedData
      };

      // Save to database
      await this.saveInvoiceToDatabase(invoice);

      // Add to spreadsheet
      const sheetRow: SheetRow = {
        invoiceNumber: invoice.invoiceNumber || '',
        vendorName: invoice.vendorName || '',
        issueDate: invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '',
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
        amount: invoice.amount || 0,
        currency: invoice.currency || 'USD',
        driveLink: driveFile.webViewLink,
        processedDate: new Date().toLocaleDateString()
      };

      await sheetsService.addInvoiceRow(userId, sheetRow);

      return invoice;
    } catch (error) {
      console.error('Error processing and saving invoice:', error);
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