import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import pdfParse from 'pdf-parse';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { DriveService } from './driveService';
import { SheetsService, SheetRow } from './sheetsService';
import { GPTVisionService, GPTExtractedData } from './gptVisionService';

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
      // First, try GPT-4 Vision for multi-lingual support
      try {
        console.log('=== ATTEMPTING GPT-4 VISION ===');
        console.log('Buffer size:', buffer.length, 'bytes');
        const gptService = new GPTVisionService();
        const gptData = await gptService.extractInvoiceDataFromImage(buffer);
        
        console.log('=== GPT-4 VISION SUCCESS ===');
        console.log('Extracted data:', gptData);
        return {
          vendorName: gptData.vendorName,
          invoiceNumber: gptData.invoiceNumber,
          issueDate: gptData.issueDate ? new Date(gptData.issueDate) : undefined,
          dueDate: gptData.dueDate ? new Date(gptData.dueDate) : undefined,
          amount: gptData.amount,
          currency: gptData.currency,
          taxAmount: gptData.taxAmount,
          confidence: gptData.confidence
        };
      } catch (gptError) {
        console.log('=== GPT-4 VISION FAILED ===');
        console.log('Error message:', (gptError as Error).message);
        console.log('Falling back to Document AI...');
      }

      // Fallback to Document AI if GPT-4 Vision fails
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

      if (!document) {
        console.log('No document returned, falling back to text extraction');
        return this.extractInvoiceDataFromText(await this.extractTextFromBuffer(buffer));
      }

      console.log('Document AI processing completed');
      console.log('Document entities found:', document.entities?.length || 0);

      // If we have entities (Invoice Parser), use them
      if (document.entities && document.entities.length > 0) {
        console.log('Using Document AI Invoice Parser entities');
        const extractedData = this.extractInvoiceDataFromEntities(document.entities);
        return {
          ...extractedData,
          confidence: 0.8 // Good confidence for Invoice Parser
        };
      }

      // If we have text but no entities (OCR), use text extraction
      if (document.text) {
        console.log('Using Document AI OCR text extraction');
        const extractedData = this.extractInvoiceDataFromText(document.text);
        return {
          ...extractedData,
          confidence: 0.6 // Medium confidence for OCR + regex
        };
      }

      // Fallback to PDF parsing
      console.log('Falling back to PDF text extraction');
      return this.extractInvoiceDataFromText(await this.extractTextFromBuffer(buffer));
    } catch (error) {
      console.error('Document AI processing failed:', error);
      // Fallback to PDF text extraction
      return this.extractInvoiceDataFromText(await this.extractTextFromBuffer(buffer));
    }
  }

  // Extract invoice data from Document AI entities
  private extractInvoiceDataFromEntities(entities: any[]): Partial<ProcessedInvoice> {
    const data: Partial<ProcessedInvoice> = {};
    
    console.log('=== PROCESSING DOCUMENT AI ENTITIES ===');
    console.log('Total entities found:', entities.length);
    
    for (const entity of entities) {
      const type = entity.type?.toLowerCase();
      const text = entity.mentionText;
      const confidence = entity.confidence || 0;
      
      console.log(`Entity: ${type} = "${text}" (confidence: ${confidence})`);
      
      // Google's Invoice Parser uses these standard entity types
      switch (type) {
        // Invoice Number
        case 'invoice_id':
        case 'invoice_number':
        case 'inv_number':
        case 'bill_number':
        case 'document_id':
        case 'reference_number':
          if (!data.invoiceNumber) {
            data.invoiceNumber = text;
            console.log('✅ Found invoice number:', text);
          }
          break;
          
        // Vendor/Supplier Name
        case 'supplier_name':
        case 'vendor_name':
        case 'company_name':
        case 'business_name':
        case 'seller_name':
        case 'from':
        case 'bill_from':
        case 'supplier':
        case 'vendor':
        case 'merchant_name':
        case 'issuer_name':
          if (!data.vendorName) {
            data.vendorName = text;
            console.log('✅ Found vendor name:', text);
          }
          break;
          
        // Invoice Date
        case 'invoice_date':
        case 'issue_date':
        case 'date':
        case 'billing_date':
        case 'created_date':
        case 'document_date':
        case 'issue_date':
          if (!data.issueDate) {
            data.issueDate = this.parseDate(text);
            console.log('✅ Found issue date:', data.issueDate);
          }
          break;
          
        // Due Date
        case 'due_date':
        case 'payment_due_date':
        case 'due':
        case 'due_date':
        case 'payment_date':
        case 'expiry_date':
          if (!data.dueDate) {
            data.dueDate = this.parseDate(text);
            console.log('✅ Found due date:', data.dueDate);
          }
          break;
          
        // Total Amount
        case 'total_amount':
        case 'invoice_amount':
        case 'amount':
        case 'total':
        case 'grand_total':
        case 'balance_due':
        case 'amount_due':
        case 'net_amount':
        case 'final_amount':
          if (!data.amount) {
            data.amount = this.parseAmount(text);
            console.log('✅ Found amount:', data.amount);
          }
          break;
          
        // Currency
        case 'currency':
        case 'currency_code':
        case 'currency_type':
        case 'currency_symbol':
          if (!data.currency) {
            data.currency = text.toUpperCase();
            console.log('✅ Found currency:', data.currency);
          }
          break;
          
        // Tax Amount
        case 'tax_amount':
        case 'vat_amount':
        case 'tax':
        case 'gst':
        case 'hst':
        case 'tax_total':
        case 'vat_total':
          if (!data.taxAmount) {
            data.taxAmount = this.parseAmount(text);
            console.log('✅ Found tax amount:', data.taxAmount);
          }
          break;
          
        // Subtotal
        case 'subtotal':
        case 'sub_total':
        case 'base_amount':
          // Only use subtotal if we don't have a total amount
          if (!data.amount) {
            data.amount = this.parseAmount(text);
            console.log('✅ Found subtotal as amount:', data.amount);
          }
          break;
      }
    }
    
    console.log('=== ENTITY EXTRACTION SUMMARY ===');
    console.log('Vendor Name:', data.vendorName || 'NOT FOUND');
    console.log('Invoice Number:', data.invoiceNumber || 'NOT FOUND');
    console.log('Amount:', data.amount || 'NOT FOUND');
    console.log('Currency:', data.currency || 'NOT FOUND');
    console.log('Issue Date:', data.issueDate || 'NOT FOUND');
    console.log('Due Date:', data.dueDate || 'NOT FOUND');
    console.log('Tax Amount:', data.taxAmount || 'NOT FOUND');
    console.log('================================');
    
    return data;
  }

  // Enhanced multi-language invoice data extraction from text
  private extractInvoiceDataFromText(text: string): Partial<ProcessedInvoice> {
    const data: Partial<ProcessedInvoice> = {};
    
    console.log('=== EXTRACTING INVOICE DATA ===');
    console.log('Text length:', text.length);
    console.log('First 500 characters:', text.substring(0, 500));
    
    // Multi-language vendor/company name patterns (enhanced)
    const vendorPatterns = [
      // English patterns
      /from\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /vendor\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /company\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /supplier\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /bill\s*from\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /invoice\s*from\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:LLC|Inc|Corp|Ltd|Co|Company|Corporation|S\.L\.|S\.A\.|LDA))(?:\n|$)/i,
      
      // Spanish patterns
      /empresa\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /proveedor\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /remitente\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /factura\s*de\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:S\.L\.|S\.A\.|S\.L\.U\.|C\.B\.))(?:\n|$)/i,
      
      // Portuguese patterns
      /fornecedor\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /empresa\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /fatura\s*de\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:LDA|Ltda|S\.A\.|S\.L\.))(?:\n|$)/i,
      
      // Italian patterns
      /fornitore\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /società\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /fattura\s*di\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:S\.r\.l\.|S\.p\.A\.|S\.n\.c\.))(?:\n|$)/i,
      
      // French patterns
      /fournisseur\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /société\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /facture\s*de\s*:?\s*([A-Za-z0-9\s&.,'-]+?)(?:\n|$)/i,
      /([A-Za-z0-9\s&.,'-]+(?:S\.A\.|S\.A\.S\.|S\.A\.R\.L\.))(?:\n|$)/i,
      
      // Generic company name detection (look for all caps company names)
      /([A-Z][A-Z\s&.,'-]{3,}(?:S\.L\.|S\.A\.|LDA|Ltda|LLC|Inc|Corp|Ltd|Co|Company|Corporation))(?:\n|$)/i,
      
      // Look for company names in header area (first 1000 characters)
      /^([A-Z][A-Za-z0-9\s&.,'-]{5,}(?:S\.L\.|S\.A\.|LDA|Ltda|LLC|Inc|Corp|Ltd|Co|Company|Corporation))/m
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
    
    // Multi-language amount patterns with currency support (enhanced)
    const amountPatterns = [
      // English patterns
      /total\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /amount\s*due\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /balance\s*due\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /grand\s*total\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*amount\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /subtotal\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      /net\s*amount\s*:?\s*\$?\s*([0-9,]+\.?[0-9]*)/i,
      
      // Spanish patterns
      /total\s*factura\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /importe\s*total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /subtotal\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /importe\s*neto\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      
      // Portuguese patterns
      /total\s*fatura\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /valor\s*total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /subtotal\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /valor\s*líquido\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      
      // Italian patterns
      /totale\s*fattura\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /importo\s*totale\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /totale\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /subtotale\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /importo\s*netto\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      
      // French patterns
      /total\s*facture\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /montant\s*total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /sous-total\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      /montant\s*net\s*:?\s*€?\s*([0-9,]+\.?[0-9]*)/i,
      
      // Currency patterns (more flexible)
      /\$\s*([0-9,]+\.?[0-9]{2})/g, // Dollar amounts
      /€\s*([0-9,]+\.?[0-9]{2})/g, // Euro amounts
      /£\s*([0-9,]+\.?[0-9]{2})/g, // Pound amounts
      
      // Generic amount patterns (look for any number with currency symbol)
      /([0-9,]+\.?[0-9]{2})\s*€/g, // Euro after amount
      /([0-9,]+\.?[0-9]{2})\s*\$/g, // Dollar after amount
      /([0-9,]+\.?[0-9]{2})\s*£/g, // Pound after amount
      
      // Look for the largest amount in the document (often the total)
      /([0-9,]+\.?[0-9]{2,})/g
    ];
    
    // Enhanced amount extraction - try to find the best match
    let bestAmount: number | undefined;
    let bestPattern = '';
    
    for (const pattern of amountPatterns) {
      // For matchAll, we need to ensure the pattern has the global flag
      const globalPattern = pattern.global ? pattern : new RegExp(pattern.source, pattern.flags + 'g');
      const matches = text.matchAll(globalPattern);
      for (const match of matches) {
        if (match && match[1]) {
          const amount = this.parseAmount(match[1]);
          if (amount && amount > 0) {
            // Prefer amounts that are likely totals (larger amounts)
            if (!bestAmount || amount > bestAmount) {
              bestAmount = amount;
              bestPattern = pattern.source;
            }
          }
        }
      }
    }
    
    if (bestAmount) {
      data.amount = bestAmount;
      console.log('Found amount:', bestAmount, 'using pattern:', bestPattern);
    }
    
    // Multi-language date patterns (enhanced)
    const datePatterns = [
      // English patterns
      /invoice\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /issued\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /billing\s*date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /created\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Spanish patterns
      /fecha\s*factura\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /fecha\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /emitida\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Portuguese patterns
      /data\s*fatura\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /data\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /emitida\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Italian patterns
      /data\s*fattura\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /data\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /emessa\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // French patterns
      /date\s*facture\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /date\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /émise\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      
      // Generic patterns
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/g, // Any date pattern
      /(\w+\s+\d{1,2},?\s+\d{4})/g, // Month DD, YYYY format
      /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g // YYYY-MM-DD format
    ];
    
    for (const pattern of datePatterns) {
      // For patterns that might have multiple matches, use matchAll
      if (pattern.global) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match && match[1]) {
            const parsedDate = this.parseDate(match[1]);
            if (parsedDate) {
              data.issueDate = parsedDate;
              console.log('Found date:', data.issueDate);
              break;
            }
          }
        }
      } else {
        // For non-global patterns, use regular match
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
      // For patterns that might have multiple matches, use matchAll
      if (pattern.global) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match && match[1]) {
            const parsedDate = this.parseDate(match[1]);
            if (parsedDate) {
              data.dueDate = parsedDate;
              console.log('Found due date:', data.dueDate);
              break;
            }
          }
        }
      } else {
        // For non-global patterns, use regular match
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
    }
    
    // Enhanced currency detection
    const currencyPatterns = [
      { symbol: '€', code: 'EUR', keywords: ['EUR', 'EURO', 'EUROS'] },
      { symbol: '$', code: 'USD', keywords: ['USD', 'DOLLAR', 'DOLLARS'] },
      { symbol: '£', code: 'GBP', keywords: ['GBP', 'POUND', 'POUNDS'] },
      { symbol: '¥', code: 'JPY', keywords: ['JPY', 'YEN'] },
      { symbol: '₹', code: 'INR', keywords: ['INR', 'RUPEE', 'RUPEE'] }
    ];
    
    for (const currency of currencyPatterns) {
      if (text.includes(currency.symbol) || currency.keywords.some(keyword => text.toUpperCase().includes(keyword))) {
        data.currency = currency.code;
        console.log('Found currency:', currency.code);
        break;
      }
    }
    
    // If no currency found but we have an amount, try to infer from context
    if (!data.currency && data.amount) {
      // Look for currency symbols near the amount
      const amountStr = data.amount.toString();
      const amountIndex = text.indexOf(amountStr);
      if (amountIndex !== -1) {
        const context = text.substring(Math.max(0, amountIndex - 10), amountIndex + amountStr.length + 10);
        for (const currency of currencyPatterns) {
          if (context.includes(currency.symbol)) {
            data.currency = currency.code;
            console.log('Inferred currency from context:', currency.code);
            break;
          }
        }
      }
    }
    
    console.log('=== EXTRACTION SUMMARY ===');
    console.log('Vendor Name:', data.vendorName || 'NOT FOUND');
    console.log('Invoice Number:', data.invoiceNumber || 'NOT FOUND');
    console.log('Amount:', data.amount || 'NOT FOUND');
    console.log('Currency:', data.currency || 'NOT FOUND');
    console.log('Issue Date:', data.issueDate || 'NOT FOUND');
    console.log('Due Date:', data.dueDate || 'NOT FOUND');
    console.log('========================');
    
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