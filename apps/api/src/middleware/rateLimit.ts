import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../lib/tokens.js';

const rateLimitMessage = { error: 'Muitas requisições. Tente novamente mais tarde.' };
const windowMs = 15 * 60 * 1000;

function ipKey(req: Request): string {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return ipKeyGenerator(ip);
}

function userOrIpKey(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(header.slice(7));
      return `user:${payload.sub}`;
    } catch {
      /* token inválido — cai no IP */
    }
  }
  return ipKey(req);
}

export const apiRateLimit = rateLimit({
  windowMs,
  max: env.RATE_LIMIT_API_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  keyGenerator: userOrIpKey,
});

export const authRateLimit = rateLimit({
  windowMs,
  max: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  keyGenerator: ipKey,
  skipSuccessfulRequests: true,
});

export const publicRateLimit = rateLimit({
  windowMs,
  max: env.RATE_LIMIT_PUBLIC_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage,
  keyGenerator: ipKey,
});

export function shouldSkipGlobalApiRateLimit(path: string): boolean {
  return (
    path === '/health' ||
    path.startsWith('/api/publico') ||
    path.startsWith('/api/auth')
  );
}
