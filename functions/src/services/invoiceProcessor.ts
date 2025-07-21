import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import pdfParse from 'pdf-parse';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
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
    this.processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID || functions.config().google?.document_ai_processor_id || '';
    this.location = process.env.GOOGLE_DOCUMENT_AI_LOCATION || functions.config().google?.document_ai_location || 'us';
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
        console.log('Document AI processor ID not configured, using text extraction');
        return this.extractInvoiceDataFromText(await this.extractTextFromBuffer(buffer));
      }

      console.log('Using Document AI OCR processor:', this.processorId);
      const projectId = functions.config().google?.project_id || 'accounti-4698b';
      const name = `projects/${projectId}/locations/${this.location}/processors/${this.processorId}`;
      
      const request = {
        name,
        rawDocument: {
          content: buffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      };

      const [result] = await this.documentAiClient.processDocument(request);
      const { document } = result;

      if (!document?.text) {
        console.log('No text extracted, falling back to PDF parsing');
        return this.extractInvoiceDataFromText(await this.extractTextFromBuffer(buffer));
      }

      console.log('Document AI OCR extracted text length:', document.text.length);

      // For Document OCR, we get clean text and apply our enhanced multi-language extraction
      const extractedData = this.extractInvoiceDataFromText(document.text);
      
      return {
        ...extractedData,
        confidence: 0.85 // High confidence for Document AI OCR + our extraction
      };
    } catch (error) {
      console.error('Document AI processing failed:', error);
      // Fallback to PDF text extraction
      return this.extractInvoiceDataFromText(await this.extractTextFromBuffer(buffer));
    }
  }

  // Extract invoice data from Document AI entities
  private extractInvoiceDataFromEntities(entities: any[]): Partial<ProcessedInvoice> {
    const data: Partial<ProcessedInvoice> = {};
    
    console.log('Processing entities:', entities.length);
    
    for (const entity of entities) {
      const type = entity.type?.toLowerCase();
      const text = entity.mentionText;
      const confidence = entity.confidence || 0;
      
      console.log(`Entity: ${type} = "${text}" (confidence: ${confidence})`);
      
      // Google's Invoice Parser uses these standard entity types
      switch (type) {
        case 'invoice_id':
        case 'invoice_number':
        case 'invoice_number':
        case 'inv_number':
        case 'bill_number':
        case 'invoice_id':
          data.invoiceNumber = text;
          break;
        case 'supplier_name':
        case 'vendor_name':
        case 'company_name':
        case 'business_name':
        case 'seller_name':
        case 'from':
        case 'bill_from':
        case 'supplier':
        case 'vendor':
          data.vendorName = text;
          break;
        case 'invoice_date':
        case 'issue_date':
        case 'date':
        case 'billing_date':
        case 'created_date':
        case 'invoice_date':
          data.issueDate = this.parseDate(text);
          break;
        case 'due_date':
        case 'payment_due_date':
        case 'due':
        case 'due_date':
          data.dueDate = this.parseDate(text);
          break;
        case 'total_amount':
        case 'invoice_amount':
        case 'amount':
        case 'total':
        case 'grand_total':
        case 'balance_due':
        case 'amount_due':
        case 'total_amount':
        case 'invoice_amount':
          data.amount = this.parseAmount(text);
          break;
        case 'currency':
        case 'currency_code':
        case 'currency':
          data.currency = text;
          break;
        case 'tax_amount':
        case 'vat_amount':
        case 'tax':
        case 'gst':
        case 'hst':
        case 'tax_amount':
          data.taxAmount = this.parseAmount(text);
          break;
      }
    }
    
    console.log('Extracted data from entities:', data);
    return data;
  }

  // Enhanced multi-language invoice data extraction from text
  private extractInvoiceDataFromText(text: string): Partial<ProcessedInvoice> {
    const data: Partial<ProcessedInvoice> = {};
    
    console.log('Extracting data from text, length:', text.length);
    
    // Multi-language vendor/company name patterns
    const vendorPatterns = [
      // English patterns
      /from\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /vendor\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /company\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /supplier\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:LLC|Inc|Corp|Ltd|Co|Company|Corporation|S\.L\.|S\.A\.|LDA))(?:\n|$)/i,
      
      // Spanish patterns
      /empresa\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /proveedor\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /remitente\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:S\.L\.|S\.A\.|S\.L\.U\.|C\.B\.))(?:\n|$)/i,
      
      // Portuguese patterns
      /fornecedor\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /empresa\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:LDA|Ltda|S\.A\.|S\.L\.))(?:\n|$)/i,
      
      // Italian patterns
      /fornitore\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /società\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:S\.r\.l\.|S\.p\.A\.|S\.n\.c\.))(?:\n|$)/i,
      
      // French patterns
      /fournisseur\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /société\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:S\.A\.|S\.A\.S\.|S\.A\.R\.L\.))(?:\n|$)/i,
      
      // Generic company name detection (look for all caps company names)
      /([A-Z][A-Z\s&.,'-]{3,}(?:S\.L\.|S\.A\.|LDA|Ltda|LLC|Inc|Corp|Ltd|Co|Company|Corporation))(?:\n|$)/i
    ];
    
    for (const pattern of vendorPatterns) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim().length > 3) {
        data.vendorName = match[1].trim();
        console.log('Found vendor:', data.vendorName);
        break;
      }
    }
    
    // Multi-language invoice number patterns
    const invoiceNumberPatterns = [
      // English patterns
      /invoice\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /invoice\s*number\s*:?\s*([A-Z0-9\-_]+)/i,
      /inv\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /bill\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      
      // Spanish patterns
      /factura\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /nº?\s*factura\s*:?\s*([A-Z0-9\-_]+)/i,
      /número\s*factura\s*:?\s*([A-Z0-9\-_]+)/i,
      
      // Portuguese patterns
      /fatura\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /nº?\s*fatura\s*:?\s*([A-Z0-9\-_]+)/i,
      /número\s*fatura\s*:?\s*([A-Z0-9\-_]+)/i,
      
      // Italian patterns
      /fattura\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /nº?\s*fattura\s*:?\s*([A-Z0-9\-_]+)/i,
      /numero\s*fattura\s*:?\s*([A-Z0-9\-_]+)/i,
      
      // French patterns
      /facture\s*#?\s*:?\s*([A-Z0-9\-_]+)/i,
      /nº?\s*facture\s*:?\s*([A-Z0-9\-_]+)/i,
      /numéro\s*facture\s*:?\s*([A-Z0-9\-_]+)/i,
      
      // Generic patterns
      /#\s*([A-Z0-9\-_]{3,})/i,
      /nº\s*([A-Z0-9\-_]+)/i
    ];
    
    for (const pattern of invoiceNumberPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.invoiceNumber = match[1].trim();
        console.log('Found invoice number:', data.invoiceNumber);
        break;
      }
    }
    
    // Multi-language amount patterns with currency support
    const amountPatterns = [
      // English patterns
      /total\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /amount\s*due\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /balance\s*due\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /grand\s*total\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*amount\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      
      // Spanish patterns
      /total\s*factura\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /importe\s*total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      
      // Portuguese patterns
      /total\s*fatura\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /valor\s*total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      
      // Italian patterns
      /totale\s*fattura\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /importo\s*totale\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /totale\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      
      // French patterns
      /total\s*facture\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /montant\s*total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      
      // Currency patterns
      /\$\s*([0-9,]+\.?[0-9]{2})/g, // Dollar amounts
      /€\s*([0-9,]+\.?[0-9]{2})/g, // Euro amounts
      /£\s*([0-9,]+\.?[0-9]{2})/g  // Pound amounts
    ];
    
    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        data.amount = this.parseAmount(match[1]);
        console.log('Found amount:', data.amount);
        break;
      }
    }
    
    // Multi-language date patterns
    const datePatterns = [
      // English patterns
      /invoice\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /issued\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Spanish patterns
      /fecha\s*factura\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /fecha\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Portuguese patterns
      /data\s*fatura\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /data\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Italian patterns
      /data\s*fattura\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /data\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // French patterns
      /date\s*facture\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Generic patterns
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
    
    // Multi-language due date patterns
    const dueDatePatterns = [
      // English patterns
      /due\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /payment\s*due\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Spanish patterns
      /fecha\s*vencimiento\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /vencimiento\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Portuguese patterns
      /data\s*vencimento\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /vencimento\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Italian patterns
      /data\s*scadenza\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /scadenza\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // French patterns
      /date\s*échéance\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /échéance\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
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
    
    // Currency detection
    if (text.includes('€') || text.includes('EUR')) {
      data.currency = 'EUR';
    } else if (text.includes('$') || text.includes('USD')) {
      data.currency = 'USD';
    } else if (text.includes('£') || text.includes('GBP')) {
      data.currency = 'GBP';
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