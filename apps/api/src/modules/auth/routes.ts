import { Router } from 'express';
import { authenticate, getAuthUser } from '../../middleware/auth.js';
import { authRateLimit } from '../../middleware/rateLimit.js';
import * as authService from './service.js';
import { loginSchema, logoutSchema, refreshSchema, registerSchema } from './schemas.js';

export const authRouter = Router();

authRouter.post('/login', authRateLimit, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/register', authRateLimit, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const result = await authService.register(body.name, body.email, body.password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', authRateLimit, async (req, res, next) => {
  try {
    const body = refreshSchema.parse(req.body);
    const result = await authService.refresh(body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', authenticate, async (req, res, next) => {
  try {
    const body = logoutSchema.parse(req.body);
    await authService.logout(getAuthUser(req).id, body.refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.me(getAuthUser(req).id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});
