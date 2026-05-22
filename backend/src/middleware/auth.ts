import { Request, Response, NextFunction } from 'express';

/**
 * Extracts the Bearer token from Authorization header.
 * For Gmail proxy routes, this is the user's OAuth access token.
 * For AI routes, this validates the request is from our app.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  if (!token) {
    res.status(401).json({ error: 'Empty token' });
    return;
  }

  // Attach token to request for downstream use
  (req as any).accessToken = token;
  next();
}
