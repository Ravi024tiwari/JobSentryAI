import { Request, Response, NextFunction } from 'express';
import { decrypt } from '../lib/session';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    let token = req.cookies?.token;

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (token) {
      const session = await decrypt(token);
      if (session && session.userId) {
        req.userId = session.userId as string;
        return next();
      }
    }

    // Allow x-user-id from headers if present (e.g. from authenticated client or extension)
    const fallbackUserId = req.headers['x-user-id'] as string;
    if (fallbackUserId && fallbackUserId !== 'undefined' && fallbackUserId !== 'null') {
      req.userId = fallbackUserId;
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to track and manage job applications.',
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please sign in again.',
    });
  }
}
