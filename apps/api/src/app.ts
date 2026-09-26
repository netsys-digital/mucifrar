import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { corsOrigins } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimit, shouldSkipGlobalApiRateLimit } from './middleware/rateLimit.js';
import { authRouter } from './modules/auth/routes.js';
import { cifrasRouter, publicoCifrasRouter } from './modules/cifras/routes.js';
import { playlistsRouter, publicoPlaylistsRouter } from './modules/playlists/routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: corsOrigins(),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    if (shouldSkipGlobalApiRateLimit(req.path)) return next();
    return apiRateLimit(req, res, next);
  });

  app.use(healthRouter);
  app.use('/api/publico/cifras', publicoCifrasRouter);
  app.use('/api/publico/playlists', publicoPlaylistsRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/cifras', cifrasRouter);
  app.use('/api/playlists', playlistsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  app.use(errorHandler);

  return app;
}
