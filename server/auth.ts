import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'barsha_lodge_tarapith_secret_key_2026';
const TOKEN_EXPIRY = '12h';

export interface AuthRequest extends Request {
  admin?: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
}

// Simple in-memory rate limiter for login
const loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

export function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  // Reset window after 15 minutes
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  if (record.count >= 6) {
    return false; // Rate limited
  }
  record.count += 1;
  record.lastAttempt = now;
  return true;
}

export function resetLoginRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

export function signAdminToken(admin: { id: number; username: string; name: string; role: string }) {
  return jwt.sign(admin, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function signUserToken(user: { id: number; email: string; name: string; role: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin authentication token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.admin = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
}

export function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Guest login token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication session.' });
  }
}
