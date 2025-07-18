import { db } from './firebase';
import { logger } from '../utils/logger';

export interface Invoice {
  id: string;
  userId: string;
  messageId: string;
  fileName: string;
  fileId: string;
  checksum: string;
  metadata: InvoiceMetadata;
  status: 'pending' | 'processed' | 'error';
  processingLog: ProcessingLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceMetadata {
  provider: string;
  date: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
}

export interface ProcessingLog {
  step: string;
  status: 'success' | 'error';
  message?: string;
  timestamp: Date;
}

export interface InvoiceFilters {
  page: number;
  limit: number;
  status?: string;
  provider?: string;
  startDate?: string;
  endDate?: string;
}

export interface InvoiceStats {
  total: number;
  processed: number;
  pending: number;
  error: number;
  totalAmount: number;
  currency: string;
  monthlyStats: MonthlyStat[];
  topProviders: TopProvider[];
}

interface MonthlyStat {
  month: string;
  count: number;
  amount: number;
}

interface TopProvider {
  provider: string;
  count: number;
  amount: number;
}

export class InvoiceService {
  private invoicesCollection = db.collection('invoices');

  async getInvoices(userId: string, filters: InvoiceFilters) {
    try {
      let query = this.invoicesCollection.where('userId', '==', userId);
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.provider) {
        query = query.where('metadata.provider', '==', filters.provider);
      }
      
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
      
      // Apply date filters and pagination
      let filteredInvoices = invoices;
      
      if (filters.startDate || filters.endDate) {
        filteredInvoices = invoices.filter(invoice => {
          const invoiceDate = new Date(invoice.metadata.date);
          const startDate = filters.startDate ? new Date(filters.startDate) : null;
          const endDate = filters.endDate ? new Date(filters.endDate) : null;
          
          if (startDate && invoiceDate < startDate) return false;
          if (endDate && invoiceDate > endDate) return false;
          return true;
        });
      }
      
      const total = filteredInvoices.length;
      const startIndex = (filters.page - 1) * filters.limit;
      const endIndex = startIndex + filters.limit;
      const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
      
      return {
        invoices: paginatedInvoices,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          pages: Math.ceil(total / filters.limit)
        }
      };
    } catch (error) {
      logger.error('Error getting invoices:', error);
      throw error;
    }
  }

  async getInvoiceById(id: string, userId: string): Promise<Invoice | null> {
    try {
      const doc = await this.invoicesCollection.doc(id).get();
      
      if (!doc.exists) return null;
      
      const invoice = { id: doc.id, ...doc.data() } as Invoice;
      
      if (invoice.userId !== userId) {
        return null;
      }
      
      return invoice;
    } catch (error) {
      logger.error('Error getting invoice by ID:', error);
      throw error;
    }
  }

  async processInvoices(userId: string, options: { historicalRange: number; force: boolean }) {
    try {
      // This would integrate with Gmail API and OCR processing
      // For now, return a mock response
      logger.info(`Processing invoices for user ${userId} with range ${options.historicalRange} days`);
      
      return {
        message: 'Processing started',
        jobId: `job_${Date.now()}`,
        estimatedTime: '5 minutes'
      };
    } catch (error) {
      logger.error('Error processing invoices:', error);
      throw error;
    }
  }

  async deleteInvoice(id: string, userId: string): Promise<void> {
    try {
      const invoice = await this.getInvoiceById(id, userId);
      
      if (!invoice) {
        throw new Error('Invoice not found');
      }
      
      await this.invoicesCollection.doc(id).delete();
    } catch (error) {
      logger.error('Error deleting invoice:', error);
      throw error;
    }
  }

  async getStats(userId: string): Promise<InvoiceStats> {
    try {
      const snapshot = await this.invoicesCollection.where('userId', '==', userId).get();
      const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Invoice[];
      
      const total = invoices.length;
      const processed = invoices.filter(inv => inv.status === 'processed').length;
      const pending = invoices.filter(inv => inv.status === 'pending').length;
      const error = invoices.filter(inv => inv.status === 'error').length;
      
      const totalAmount = invoices
        .filter(inv => inv.status === 'processed')
        .reduce((sum, inv) => sum + inv.metadata.amount, 0);
      
      const currency = invoices.length > 0 ? invoices[0].metadata.currency : 'USD';
      
      // Calculate monthly stats
      const monthlyStats = this.calculateMonthlyStats(invoices);
      
      // Calculate top providers
      const topProviders = this.calculateTopProviders(invoices);
      
      return {
        total,
        processed,
        pending,
        error,
        totalAmount,
        currency,
        monthlyStats,
        topProviders
      };
    } catch (error) {
      logger.error('Error getting invoice stats:', error);
      throw error;
    }
  }

  private calculateMonthlyStats(invoices: Invoice[]): MonthlyStat[] {
    const monthlyMap = new Map<string, { count: number; amount: number }>();
    
    invoices.forEach(invoice => {
      if (invoice.status === 'processed') {
        const month = invoice.metadata.date.substring(0, 7); // YYYY-MM
        const current = monthlyMap.get(month) || { count: 0, amount: 0 };
        
        monthlyMap.set(month, {
          count: current.count + 1,
          amount: current.amount + invoice.metadata.amount
        });
      }
    });
    
    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => b.month.localeCompare(a.month));
  }

  private calculateTopProviders(invoices: Invoice[]): TopProvider[] {
    const providerMap = new Map<string, { count: number; amount: number }>();
    
    invoices.forEach(invoice => {
      if (invoice.status === 'processed') {
        const provider = invoice.metadata.provider;
        const current = providerMap.get(provider) || { count: 0, amount: 0 };
        
        providerMap.set(provider, {
          count: current.count + 1,
          amount: current.amount + invoice.metadata.amount
        });
      }
    });
    
    return Array.from(providerMap.entries())
      .map(([provider, data]) => ({ provider, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }
} 