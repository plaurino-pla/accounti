import { Request, Response } from 'express';
import { InvoiceService } from '../services/invoiceService';
import { logger } from '../utils/logger';

export const invoiceController = {
  getInvoices: async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 20, status, provider, startDate, endDate } = req.query;
      const invoiceService = new InvoiceService();
      
      const result = await invoiceService.getInvoices(req.user.id, {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        provider: provider as string,
        startDate: startDate as string,
        endDate: endDate as string
      });
      
      res.json(result);
    } catch (error) {
      logger.error('Error getting invoices:', error);
      res.status(500).json({ error: 'Failed to get invoices' });
    }
  },

  getInvoice: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invoiceService = new InvoiceService();
      
      const invoice = await invoiceService.getInvoiceById(id, req.user.id);
      
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }
      
      res.json(invoice);
    } catch (error) {
      logger.error('Error getting invoice:', error);
      res.status(500).json({ error: 'Failed to get invoice' });
    }
  },

  processInvoices: async (req: Request, res: Response) => {
    try {
      const { historicalRange = 30, force = false } = req.body;
      const invoiceService = new InvoiceService();
      
      const result = await invoiceService.processInvoices(req.user.id, {
        historicalRange: Number(historicalRange),
        force: Boolean(force)
      });
      
      res.json(result);
    } catch (error) {
      logger.error('Error processing invoices:', error);
      res.status(500).json({ error: 'Failed to process invoices' });
    }
  },

  deleteInvoice: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const invoiceService = new InvoiceService();
      
      await invoiceService.deleteInvoice(id, req.user.id);
      
      res.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      logger.error('Error deleting invoice:', error);
      res.status(500).json({ error: 'Failed to delete invoice' });
    }
  },

  getStats: async (req: Request, res: Response) => {
    try {
      const invoiceService = new InvoiceService();
      
      const stats = await invoiceService.getStats(req.user.id);
      
      res.json(stats);
    } catch (error) {
      logger.error('Error getting invoice stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  }
}; 