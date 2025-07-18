import { Request, Response } from 'express';
export declare const userController: {
    getProfile: (req: Request, res: Response) => Promise<void>;
    updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    getConfiguration: (req: Request, res: Response) => Promise<void>;
    updateConfiguration: (req: Request, res: Response) => Promise<void>;
};
//# sourceMappingURL=userController.d.ts.map