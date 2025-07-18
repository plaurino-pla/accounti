"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceController = void 0;
const invoiceService_1 = require("../services/invoiceService");
const logger_1 = require("../utils/logger");
exports.invoiceController = {
    getInvoices: async (req, res) => {
        try {
            const { page = 1, limit = 20, status, provider, startDate, endDate } = req.query;
            const invoiceService = new invoiceService_1.InvoiceService();
            const result = await invoiceService.getInvoices(req.user.id, {
                page: Number(page),
                limit: Number(limit),
                status: status,
                provider: provider,
                startDate: startDate,
                endDate: endDate
            });
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error('Error getting invoices:', error);
            res.status(500).json({ error: 'Failed to get invoices' });
        }
    },
    getInvoice: async (req, res) => {
        try {
            const { id } = req.params;
            const invoiceService = new invoiceService_1.InvoiceService();
            const invoice = await invoiceService.getInvoiceById(id, req.user.id);
            if (!invoice) {
                return res.status(404).json({ error: 'Invoice not found' });
            }
            res.json(invoice);
        }
        catch (error) {
            logger_1.logger.error('Error getting invoice:', error);
            res.status(500).json({ error: 'Failed to get invoice' });
        }
    },
    processInvoices: async (req, res) => {
        try {
            const { historicalRange = 30, force = false } = req.body;
            const invoiceService = new invoiceService_1.InvoiceService();
            const result = await invoiceService.processInvoices(req.user.id, {
                historicalRange: Number(historicalRange),
                force: Boolean(force)
            });
            res.json(result);
        }
        catch (error) {
            logger_1.logger.error('Error processing invoices:', error);
            res.status(500).json({ error: 'Failed to process invoices' });
        }
    },
    deleteInvoice: async (req, res) => {
        try {
            const { id } = req.params;
            const invoiceService = new invoiceService_1.InvoiceService();
            await invoiceService.deleteInvoice(id, req.user.id);
            res.json({ message: 'Invoice deleted successfully' });
        }
        catch (error) {
            logger_1.logger.error('Error deleting invoice:', error);
            res.status(500).json({ error: 'Failed to delete invoice' });
        }
    },
    getStats: async (req, res) => {
        try {
            const invoiceService = new invoiceService_1.InvoiceService();
            const stats = await invoiceService.getStats(req.user.id);
            res.json(stats);
        }
        catch (error) {
            logger_1.logger.error('Error getting invoice stats:', error);
            res.status(500).json({ error: 'Failed to get stats' });
        }
    }
};
//# sourceMappingURL=invoiceController.js.map