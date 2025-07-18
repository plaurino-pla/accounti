import { Request, Response } from 'express';
export declare const googleAuthController: {
    getAuthUrl: (req: Request, res: Response) => void;
    handleCallback: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    refreshToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    logout: (req: Request, res: Response) => Response<any, Record<string, any>>;
};
//# sourceMappingURL=authController.d.ts.map