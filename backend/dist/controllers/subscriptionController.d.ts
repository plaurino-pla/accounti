import { Request, Response } from 'express';
export declare const subscriptionController: {
    getPlans: (req: Request, res: Response) => Promise<void>;
    createCheckoutSession: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    createPortalSession: (req: Request, res: Response) => Promise<void>;
    getCurrentSubscription: (req: Request, res: Response) => Promise<void>;
    handleWebhook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=subscriptionController.d.ts.map