import { z } from 'zod';

export const searchPlaylistsSchema = z.object({
  q: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const createPlaylistSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),
});

export const updatePlaylistSchema = createPlaylistSchema.partial();

export const addPlaylistItemSchema = z.object({
  cifraId: z.string().min(1),
});

export const reorderPlaylistItemsSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1),
});

export const setPlaylistTomSchema = z.object({
  semitones: z.number().int().min(-11).max(11),
});
