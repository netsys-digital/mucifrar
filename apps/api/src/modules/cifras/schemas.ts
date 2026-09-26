import { z } from 'zod';

export const searchCifrasSchema = z.object({
  q: z.string().optional().default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(['popular', 'recent']).optional().default('popular'),
});

export const createCifraSchema = z.object({
  title: z.string().min(2).max(200),
  artist: z.string().min(1).max(200),
  key: z.string().min(1).max(12).default('C'),
  content: z.string().min(1).max(50_000),
  status: z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
});

export const updateCifraSchema = createCifraSchema.partial();

export const importCifraClubSchema = z.object({
  url: z
    .string()
    .trim()
    .url('Informe uma URL válida')
    .max(500)
    .refine(
      (value) => {
        try {
          const host = new URL(value).hostname.toLowerCase();
          return host === 'cifraclub.com.br' || host === 'www.cifraclub.com.br';
        } catch {
          return false;
        }
      },
      { message: 'A URL precisa ser do site cifraclub.com.br' },
    ),
});

export const cifraPreferenceSchema = z.object({
  semitones: z.number().int().min(-6).max(6).default(0),
  capo: z.number().int().min(0).max(12).default(0),
});
