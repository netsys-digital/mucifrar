import { Router } from 'express';
import { authenticate, getAuthUser } from '../../middleware/auth.js';
import { playlistLiveRateLimit, publicRateLimit } from '../../middleware/rateLimit.js';
import { pipePlaylistEvents } from './live.js';
import * as playlistsService from './service.js';
import {
  addPlaylistItemSchema,
  createPlaylistSchema,
  reorderPlaylistItemsSchema,
  searchPlaylistsSchema,
  setPlaylistTomSchema,
  updatePlaylistSchema,
} from './schemas.js';

export const publicoPlaylistsRouter = Router();

publicoPlaylistsRouter.get('/', publicRateLimit, async (req, res, next) => {
  try {
    const query = searchPlaylistsSchema.parse(req.query);
    const result = await playlistsService.searchPublic(query.q, query.page, query.pageSize);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

publicoPlaylistsRouter.get('/:slug/eventos', playlistLiveRateLimit, async (req, res, next) => {
  try {
    const slug = String(req.params.slug ?? '');
    const playlistId = await playlistsService.getPublicPlaylistId(slug);
    pipePlaylistEvents(req, res, playlistId);
  } catch (err) {
    next(err);
  }
});

publicoPlaylistsRouter.put('/:slug/itens/:itemId/tom', playlistLiveRateLimit, async (req, res, next) => {
  try {
    const slug = String(req.params.slug ?? '');
    const itemId = String(req.params.itemId ?? '');
    const body = setPlaylistTomSchema.parse(req.body);
    const playlistId = await playlistsService.getPublicPlaylistId(slug);
    const event = await playlistsService.setItemSemitones(playlistId, itemId, body.semitones);
    res.json(event);
  } catch (err) {
    next(err);
  }
});

publicoPlaylistsRouter.get('/:slug', publicRateLimit, async (req, res, next) => {
  try {
    const slug = String(req.params.slug ?? '');
    const playlist = await playlistsService.getPublicBySlug(slug);
    res.json(playlist);
  } catch (err) {
    next(err);
  }
});

export const playlistsRouter = Router();

playlistsRouter.use(authenticate);

playlistsRouter.get('/minhas', async (req, res, next) => {
  try {
    const items = await playlistsService.listMine(getAuthUser(req).id);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

playlistsRouter.post('/', async (req, res, next) => {
  try {
    const body = createPlaylistSchema.parse(req.body);
    const playlist = await playlistsService.create(getAuthUser(req).id, body);
    res.status(201).json(playlist);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.get('/:id/eventos', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    await playlistsService.assertOwner(getAuthUser(req).id, id);
    pipePlaylistEvents(req, res, id);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.put('/:id/itens/:itemId/tom', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    const itemId = String(req.params.itemId ?? '');
    const body = setPlaylistTomSchema.parse(req.body);
    await playlistsService.assertOwner(getAuthUser(req).id, id);
    const event = await playlistsService.setItemSemitones(id, itemId, body.semitones);
    res.json(event);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    const playlist = await playlistsService.getMineById(getAuthUser(req).id, id);
    res.json(playlist);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.put('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    const body = updatePlaylistSchema.parse(req.body);
    const playlist = await playlistsService.update(getAuthUser(req).id, id, body);
    res.json(playlist);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    await playlistsService.remove(getAuthUser(req).id, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

playlistsRouter.post('/:id/itens', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    const body = addPlaylistItemSchema.parse(req.body);
    const playlist = await playlistsService.addItem(getAuthUser(req).id, id, body.cifraId);
    res.status(201).json(playlist);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.put('/:id/itens/ordem', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    const body = reorderPlaylistItemsSchema.parse(req.body);
    const playlist = await playlistsService.reorderItems(getAuthUser(req).id, id, body.itemIds);
    res.json(playlist);
  } catch (err) {
    next(err);
  }
});

playlistsRouter.delete('/:id/itens/:itemId', async (req, res, next) => {
  try {
    const id = String(req.params.id ?? '');
    const itemId = String(req.params.itemId ?? '');
    const playlist = await playlistsService.removeItem(getAuthUser(req).id, id, itemId);
    res.json(playlist);
  } catch (err) {
    next(err);
  }
});
