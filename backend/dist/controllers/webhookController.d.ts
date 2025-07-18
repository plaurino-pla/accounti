import { Request, Response } from 'express';
export declare const webhookController: {
    handleGmailWebhook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    handleStripeWebhook: (req: Request, res: Response) => Promise<any>;
};
//# sourceMappingURL=webhookController.d.ts.map