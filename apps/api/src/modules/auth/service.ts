import type { User } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import {
  createRefreshTokenValue,
  hashToken,
  refreshExpiresAt,
  signAccessToken,
} from '../../lib/tokens.js';

function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}

async function issueTokens(user: User) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = createRefreshTokenValue();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiresAt(),
    },
  });
  return { accessToken, refreshToken, user: publicUser(user) };
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(401, 'E-mail ou senha inválidos');
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError(401, 'E-mail ou senha inválidos');
  }

  return issueTokens(user);
}

export async function register(name: string, email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    throw new AppError(409, 'E-mail já cadastrado');
  }

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalized,
      passwordHash: await hashPassword(password),
      role: 'USER',
      status: 'ACTIVE',
    },
  });

  return issueTokens(user);
}

export async function refresh(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Sessão inválida ou expirada');
  }
  if (stored.user.status !== 'ACTIVE') {
    throw new AppError(401, 'Usuário inválido ou inativo');
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(stored.user);
}

export async function logout(userId: string, refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { userId, tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status !== 'ACTIVE') {
    throw new AppError(401, 'Usuário inválido ou inativo');
  }
  return publicUser(user);
}
