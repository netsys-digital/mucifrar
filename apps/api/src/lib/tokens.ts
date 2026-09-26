import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env.js';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 48 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
}

export function createRefreshTokenValue(): string {
  return randomBytes(48).toString('hex');
}

export function createPasswordResetTokenValue(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function refreshExpiresAt(): Date {
  return new Date(Date.now() + REFRESH_TTL_MS);
}

export function passwordResetExpiresAt(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MS);
}
