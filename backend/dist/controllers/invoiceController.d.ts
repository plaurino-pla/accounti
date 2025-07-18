import { Request, Response } from 'express';
export declare const invoiceController: {
    getInvoices: (req: Request, res: Response) => Promise<void>;
    getInvoice: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    processInvoices: (req: Request, res: Response) => Promise<void>;
    deleteInvoice: (req: Request, res: Response) => Promise<void>;
    getStats: (req: Request, res: Response) => Promise<void>;
};
//# sourceMappingURL=invoiceController.d.ts.map