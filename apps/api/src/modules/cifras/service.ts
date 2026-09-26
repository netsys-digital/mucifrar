import type { Cifra, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || 'cifra';
  let candidate = root;
  let n = 2;
  for (;;) {
    const existing = await prisma.cifra.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
}

function publicCifra(cifra: Cifra & { author?: { id: string; name: string } }) {
  return {
    id: cifra.id,
    slug: cifra.slug,
    title: cifra.title,
    artist: cifra.artist,
    key: cifra.key,
    content: cifra.content,
    status: cifra.status,
    views: cifra.views,
    authorId: cifra.authorId,
    authorName: cifra.author?.name,
    createdAt: cifra.createdAt,
    updatedAt: cifra.updatedAt,
  };
}

export async function searchPublished(
  q: string,
  page: number,
  pageSize: number,
  sort: 'popular' | 'recent' = 'popular',
) {
  const where: Prisma.CifraWhereInput = {
    status: 'PUBLISHED',
    ...(q.trim()
      ? {
          OR: [
            { title: { contains: q.trim(), mode: 'insensitive' } },
            { artist: { contains: q.trim(), mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.CifraOrderByWithRelationInput[] =
    sort === 'recent'
      ? [{ createdAt: 'desc' }, { title: 'asc' }]
      : [{ views: 'desc' }, { title: 'asc' }];

  const [total, items] = await Promise.all([
    prisma.cifra.count({ where }),
    prisma.cifra.findMany({
      where,
      include: { author: { select: { id: true, name: true } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: items.map(publicCifra),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPublishedBySlug(slug: string) {
  const cifra = await prisma.cifra.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!cifra) throw new AppError(404, 'Cifra não encontrada');

  const updated = await prisma.cifra.update({
    where: { id: cifra.id },
    data: { views: { increment: 1 } },
    include: { author: { select: { id: true, name: true } } },
  });

  return publicCifra(updated);
}

export async function listMine(authorId: string) {
  const items = await prisma.cifra.findMany({
    where: { authorId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  });
  return items.map(publicCifra);
}

export async function getMineById(authorId: string, id: string) {
  const cifra = await prisma.cifra.findFirst({
    where: { id, authorId },
    include: { author: { select: { id: true, name: true } } },
  });
  if (!cifra) throw new AppError(404, 'Cifra não encontrada');
  return publicCifra(cifra);
}

export async function create(
  authorId: string,
  data: {
    title: string;
    artist: string;
    key: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED';
  },
) {
  const slug = await uniqueSlug(`${data.title}-${data.artist}`);
  const cifra = await prisma.cifra.create({
    data: {
      slug,
      title: data.title.trim(),
      artist: data.artist.trim(),
      key: data.key.trim(),
      content: data.content,
      status: data.status,
      authorId,
    },
    include: { author: { select: { id: true, name: true } } },
  });
  return publicCifra(cifra);
}

export async function update(
  authorId: string,
  id: string,
  data: Partial<{
    title: string;
    artist: string;
    key: string;
    content: string;
    status: 'DRAFT' | 'PUBLISHED';
  }>,
) {
  const existing = await prisma.cifra.findFirst({ where: { id, authorId } });
  if (!existing) throw new AppError(404, 'Cifra não encontrada');

  let slug = existing.slug;
  if (data.title || data.artist) {
    slug = await uniqueSlug(
      `${data.title ?? existing.title}-${data.artist ?? existing.artist}`,
      existing.id,
    );
  }

  const cifra = await prisma.cifra.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.artist !== undefined ? { artist: data.artist.trim() } : {}),
      ...(data.key !== undefined ? { key: data.key.trim() } : {}),
      ...(data.content !== undefined ? { content: data.content } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      slug,
    },
    include: { author: { select: { id: true, name: true } } },
  });
  return publicCifra(cifra);
}

export async function remove(authorId: string, id: string) {
  const existing = await prisma.cifra.findFirst({ where: { id, authorId } });
  if (!existing) throw new AppError(404, 'Cifra não encontrada');
  await prisma.cifra.delete({ where: { id } });
}

export async function getPreference(userId: string, cifraId: string) {
  const pref = await prisma.cifraPreference.findUnique({
    where: { userId_cifraId: { userId, cifraId } },
  });
  return pref
    ? { semitones: pref.semitones, capo: pref.capo }
    : null;
}

export async function getPreferenceBySlug(userId: string, slug: string) {
  const cifra = await prisma.cifra.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!cifra) throw new AppError(404, 'Cifra não encontrada');
  return getPreference(userId, cifra.id);
}

export async function upsertPreference(
  userId: string,
  cifraId: string,
  data: { semitones: number; capo: number },
) {
  const cifra = await prisma.cifra.findFirst({
    where: { id: cifraId, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!cifra) throw new AppError(404, 'Cifra não encontrada');

  const pref = await prisma.cifraPreference.upsert({
    where: { userId_cifraId: { userId, cifraId } },
    create: {
      userId,
      cifraId,
      semitones: data.semitones,
      capo: data.capo,
    },
    update: {
      semitones: data.semitones,
      capo: data.capo,
    },
  });
  return { semitones: pref.semitones, capo: pref.capo };
}

export async function upsertPreferenceBySlug(
  userId: string,
  slug: string,
  data: { semitones: number; capo: number },
) {
  const cifra = await prisma.cifra.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!cifra) throw new AppError(404, 'Cifra não encontrada');
  return upsertPreference(userId, cifra.id, data);
}
