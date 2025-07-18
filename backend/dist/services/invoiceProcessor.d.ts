export interface ProcessedInvoice {
    vendor?: string;
    amount?: number;
    date?: Date;
    invoiceNumber?: string;
    items?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }>;
    confidence: number;
}
export declare const processInvoice: (invoiceId: string, fileUrl: string, userId: string) => Promise<void>;
//# sourceMappingURL=invoiceProcessor.d.ts.map