import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { env } from '../config/env.js';

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: err.flatten(),
    });
    return;
  }

  console.error('[api] erro não tratado:', err);
  res.status(500).json({
    error: env.NODE_ENV === 'production' ? 'Erro interno' : String(err),
  });
}
