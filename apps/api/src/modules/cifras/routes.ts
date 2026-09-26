import { Router } from 'express';
import { authenticate, getAuthUser } from '../../middleware/auth.js';
import { publicRateLimit } from '../../middleware/rateLimit.js';
import { importFromCifraClub } from './cifraclub.js';
import * as cifrasService from './service.js';
import {
  createCifraSchema,
  cifraPreferenceSchema,
  importCifraClubSchema,
  searchCifrasSchema,
  updateCifraSchema,
} from './schemas.js';

/** Rotas públicas de consulta */
export const publicoCifrasRouter = Router();

publicoCifrasRouter.get('/', publicRateLimit, async (req, res, next) => {
  try {
    const query = searchCifrasSchema.parse(req.query);
    const result = await cifrasService.searchPublished(
      query.q,
      query.page,
      query.pageSize,
      query.sort,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

publicoCifrasRouter.get('/:slug', publicRateLimit, async (req, res, next) => {
  try {
    const slug = String(req.params.slug ?? '');
    const cifra = await cifrasService.getPublishedBySlug(slug);
    res.json(cifra);
  } catch (err) {
    next(err);
  }
});

/** Rotas autenticadas — minhas cifras */
export const cifrasRouter = Router();

cifrasRouter.use(authenticate);

cifrasRouter.get('/minhas', async (req, res, next) => {
  try {
    const items = await cifrasService.listMine(getAuthUser(req).id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

cifrasRouter.post('/import/cifraclub', async (req, res, next) => {
  try {
    const body = importCifraClubSchema.parse(req.body);
    const imported = await importFromCifraClub(body.url);
    res.json(imported);
  } catch (err) {
    next(err);
  }
});

cifrasRouter.get('/preferencia/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug ?? '');
    const pref = await cifrasService.getPreferenceBySlug(getAuthUser(req).id, slug);
    res.json({ preference: pref });
  } catch (err) {
    next(err);
  }
});

cifrasRouter.put('/preferencia/:slug', async (req, res, next) => {
  try {
    const slug = String(req.params.slug ?? '');
    const body = cifraPreferenceSchema.parse(req.body);
    const preference = await cifrasService.upsertPreferenceBySlug(
      getAuthUser(req).id,
      slug,
      body,
    );
    res.json({ preference });
  } catch (err) {
    next(err);
  }
});

cifrasRouter.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    const cifra = await cifrasService.getMineById(getAuthUser(req).id, id);
    res.json(cifra);
  } catch (err) {
    next(err);
  }
});

cifrasRouter.post('/', async (req, res, next) => {
  try {
    const body = createCifraSchema.parse(req.body);
    const cifra = await cifrasService.create(getAuthUser(req).id, body);
    res.status(201).json(cifra);
  } catch (err) {
    next(err);
  }
});

cifrasRouter.put('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    const body = updateCifraSchema.parse(req.body);
    const cifra = await cifrasService.update(getAuthUser(req).id, id, body);
    res.json(cifra);
  } catch (err) {
    next(err);
  }
});

cifrasRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    await cifrasService.remove(getAuthUser(req).id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
