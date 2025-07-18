"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const firebase_1 = require("./firebase");
const logger_1 = require("../utils/logger");
class InvoiceService {
    constructor() {
        this.invoicesCollection = firebase_1.db.collection('invoices');
    }
    async getInvoices(userId, filters) {
        try {
            let query = this.invoicesCollection.where('userId', '==', userId);
            if (filters.status) {
                query = query.where('status', '==', filters.status);
            }
            if (filters.provider) {
                query = query.where('metadata.provider', '==', filters.provider);
            }
            const snapshot = await query.orderBy('createdAt', 'desc').get();
            const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            let filteredInvoices = invoices;
            if (filters.startDate || filters.endDate) {
                filteredInvoices = invoices.filter(invoice => {
                    const invoiceDate = new Date(invoice.metadata.date);
                    const startDate = filters.startDate ? new Date(filters.startDate) : null;
                    const endDate = filters.endDate ? new Date(filters.endDate) : null;
                    if (startDate && invoiceDate < startDate)
                        return false;
                    if (endDate && invoiceDate > endDate)
                        return false;
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
        }
        catch (error) {
            logger_1.logger.error('Error getting invoices:', error);
            throw error;
        }
    }
    async getInvoiceById(id, userId) {
        try {
            const doc = await this.invoicesCollection.doc(id).get();
            if (!doc.exists)
                return null;
            const invoice = { id: doc.id, ...doc.data() };
            if (invoice.userId !== userId) {
                return null;
            }
            return invoice;
        }
        catch (error) {
            logger_1.logger.error('Error getting invoice by ID:', error);
            throw error;
        }
    }
    async processInvoices(userId, options) {
        try {
            logger_1.logger.info(`Processing invoices for user ${userId} with range ${options.historicalRange} days`);
            return {
                message: 'Processing started',
                jobId: `job_${Date.now()}`,
                estimatedTime: '5 minutes'
            };
        }
        catch (error) {
            logger_1.logger.error('Error processing invoices:', error);
            throw error;
        }
    }
    async deleteInvoice(id, userId) {
        try {
            const invoice = await this.getInvoiceById(id, userId);
            if (!invoice) {
                throw new Error('Invoice not found');
            }
            await this.invoicesCollection.doc(id).delete();
        }
        catch (error) {
            logger_1.logger.error('Error deleting invoice:', error);
            throw error;
        }
    }
    async getStats(userId) {
        try {
            const snapshot = await this.invoicesCollection.where('userId', '==', userId).get();
            const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const total = invoices.length;
            const processed = invoices.filter(inv => inv.status === 'processed').length;
            const pending = invoices.filter(inv => inv.status === 'pending').length;
            const error = invoices.filter(inv => inv.status === 'error').length;
            const totalAmount = invoices
                .filter(inv => inv.status === 'processed')
                .reduce((sum, inv) => sum + inv.metadata.amount, 0);
            const currency = invoices.length > 0 ? invoices[0].metadata.currency : 'USD';
            const monthlyStats = this.calculateMonthlyStats(invoices);
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
        }
        catch (error) {
            logger_1.logger.error('Error getting invoice stats:', error);
            throw error;
        }
    }
    calculateMonthlyStats(invoices) {
        const monthlyMap = new Map();
        invoices.forEach(invoice => {
            if (invoice.status === 'processed') {
                const month = invoice.metadata.date.substring(0, 7);
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
    calculateTopProviders(invoices) {
        const providerMap = new Map();
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
exports.InvoiceService = InvoiceService;
//# sourceMappingURL=invoiceService.js.map