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
export declare class InvoiceService {
    private invoicesCollection;
    getInvoices(userId: string, filters: InvoiceFilters): Promise<{
        invoices: Invoice[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getInvoiceById(id: string, userId: string): Promise<Invoice | null>;
    processInvoices(userId: string, options: {
        historicalRange: number;
        force: boolean;
    }): Promise<{
        message: string;
        jobId: string;
        estimatedTime: string;
    }>;
    deleteInvoice(id: string, userId: string): Promise<void>;
    getStats(userId: string): Promise<InvoiceStats>;
    private calculateMonthlyStats;
    private calculateTopProviders;
}
export {};
//# sourceMappingURL=invoiceService.d.ts.map