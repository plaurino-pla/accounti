import { Request, Response, NextFunction } from 'express';
import { mockAuth } from '../services/firebase';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    console.log('Auth middleware - token:', token);
    console.log('Auth middleware - NODE_ENV:', process.env.NODE_ENV);

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decodedToken = await mockAuth.verifyIdToken(token);
    console.log('Auth middleware - decoded token:', decodedToken);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(403).json({ error: 'Invalid token' });
  }
}; 