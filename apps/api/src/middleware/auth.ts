import type { NextFunction, Request, Response } from 'express';
import type { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

export function getAuthUser(req: Request): AuthUser {
  const user = (req as AuthenticatedRequest).user;
  if (!user) {
    throw new AppError(401, 'Não autenticado');
  }
  return user;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'Token de acesso ausente');
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError(401, 'Usuário inválido ou inativo');
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
      return;
    }
    next(new AppError(401, 'Token inválido ou expirado'));
  }
}
