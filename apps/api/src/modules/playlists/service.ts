import type { Cifra, Playlist, PlaylistItem, Prisma } from '@prisma/client';
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

async function uniquePlaylistSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || 'playlist';
  let candidate = root;
  let n = 2;
  for (;;) {
    const existing = await prisma.playlist.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${n}`;
    n += 1;
  }
}

type PlaylistWithOwner = Playlist & {
  owner?: { id: string; name: string };
  _count?: { items: number };
};

type ItemWithCifra = PlaylistItem & {
  cifra: Cifra & { author?: { id: string; name: string } };
};

function publicCifraSummary(cifra: Cifra & { author?: { id: string; name: string } }) {
  return {
    id: cifra.id,
    slug: cifra.slug,
    title: cifra.title,
    artist: cifra.artist,
    key: cifra.key,
    status: cifra.status,
    views: cifra.views,
    authorId: cifra.authorId,
    authorName: cifra.author?.name,
  };
}

function publicPlaylist(
  playlist: PlaylistWithOwner,
  items?: ItemWithCifra[],
) {
  return {
    id: playlist.id,
    slug: playlist.slug,
    title: playlist.title,
    description: playlist.description,
    visibility: playlist.visibility,
    ownerId: playlist.ownerId,
    ownerName: playlist.owner?.name,
    itemCount: playlist._count?.items ?? items?.length ?? 0,
    items: items?.map((item) => ({
      id: item.id,
      position: item.position,
      cifraId: item.cifraId,
      cifra: publicCifraSummary(item.cifra),
      createdAt: item.createdAt,
    })),
    createdAt: playlist.createdAt,
    updatedAt: playlist.updatedAt,
  };
}

const ownerSelect = { id: true, name: true } as const;
const cifraInclude = {
  author: { select: { id: true, name: true } },
} as const;

export async function searchPublic(q: string, page: number, pageSize: number) {
  const where: Prisma.PlaylistWhereInput = {
    visibility: 'PUBLIC',
    ...(q.trim()
      ? {
          OR: [
            { title: { contains: q.trim(), mode: 'insensitive' } },
            { description: { contains: q.trim(), mode: 'insensitive' } },
            { owner: { name: { contains: q.trim(), mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.playlist.count({ where }),
    prisma.playlist.findMany({
      where,
      include: {
        owner: { select: ownerSelect },
        _count: { select: { items: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items: items.map((p) => publicPlaylist(p)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPublicBySlug(slug: string) {
  const playlist = await prisma.playlist.findFirst({
    where: { slug, visibility: 'PUBLIC' },
    include: {
      owner: { select: ownerSelect },
      _count: { select: { items: true } },
      items: {
        orderBy: { position: 'asc' },
        include: { cifra: { include: cifraInclude } },
      },
    },
  });
  if (!playlist) throw new AppError(404, 'Playlist não encontrada');

  const publishedItems = playlist.items.filter((i) => i.cifra.status === 'PUBLISHED');
  return publicPlaylist(playlist, publishedItems);
}

export async function listMine(ownerId: string) {
  const items = await prisma.playlist.findMany({
    where: { ownerId },
    include: {
      owner: { select: ownerSelect },
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return items.map((p) => publicPlaylist(p));
}

export async function getMineById(ownerId: string, id: string) {
  const playlist = await prisma.playlist.findFirst({
    where: { id, ownerId },
    include: {
      owner: { select: ownerSelect },
      _count: { select: { items: true } },
      items: {
        orderBy: { position: 'asc' },
        include: { cifra: { include: cifraInclude } },
      },
    },
  });
  if (!playlist) throw new AppError(404, 'Playlist não encontrada');
  return publicPlaylist(playlist, playlist.items);
}

export async function create(
  ownerId: string,
  data: {
    title: string;
    description?: string | null;
    visibility: 'PUBLIC' | 'PRIVATE';
  },
) {
  const slug = await uniquePlaylistSlug(data.title);
  const playlist = await prisma.playlist.create({
    data: {
      slug,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      visibility: data.visibility,
      ownerId,
    },
    include: {
      owner: { select: ownerSelect },
      _count: { select: { items: true } },
    },
  });
  return publicPlaylist(playlist, []);
}

export async function update(
  ownerId: string,
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    visibility: 'PUBLIC' | 'PRIVATE';
  }>,
) {
  const existing = await prisma.playlist.findFirst({ where: { id, ownerId } });
  if (!existing) throw new AppError(404, 'Playlist não encontrada');

  let slug = existing.slug;
  if (data.title && data.title.trim() !== existing.title) {
    slug = await uniquePlaylistSlug(data.title, existing.id);
  }

  const playlist = await prisma.playlist.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim(), slug } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
    },
    include: {
      owner: { select: ownerSelect },
      _count: { select: { items: true } },
      items: {
        orderBy: { position: 'asc' },
        include: { cifra: { include: cifraInclude } },
      },
    },
  });
  return publicPlaylist(playlist, playlist.items);
}

export async function remove(ownerId: string, id: string) {
  const existing = await prisma.playlist.findFirst({ where: { id, ownerId } });
  if (!existing) throw new AppError(404, 'Playlist não encontrada');
  await prisma.playlist.delete({ where: { id } });
}

export async function addItem(ownerId: string, playlistId: string, cifraId: string) {
  const playlist = await prisma.playlist.findFirst({ where: { id: playlistId, ownerId } });
  if (!playlist) throw new AppError(404, 'Playlist não encontrada');

  const cifra = await prisma.cifra.findFirst({
    where: { id: cifraId, status: 'PUBLISHED' },
  });
  if (!cifra) throw new AppError(404, 'Cifra publicada não encontrada');

  const existing = await prisma.playlistItem.findUnique({
    where: { playlistId_cifraId: { playlistId, cifraId } },
  });
  if (existing) throw new AppError(409, 'Esta cifra já está na playlist');

  const agg = await prisma.playlistItem.aggregate({
    where: { playlistId },
    _max: { position: true },
  });
  const position = (agg._max.position ?? -1) + 1;

  await prisma.playlistItem.create({
    data: { playlistId, cifraId, position },
  });

  return getMineById(ownerId, playlistId);
}

export async function removeItem(ownerId: string, playlistId: string, itemId: string) {
  const playlist = await prisma.playlist.findFirst({ where: { id: playlistId, ownerId } });
  if (!playlist) throw new AppError(404, 'Playlist não encontrada');

  const item = await prisma.playlistItem.findFirst({
    where: { id: itemId, playlistId },
  });
  if (!item) throw new AppError(404, 'Item não encontrado na playlist');

  await prisma.playlistItem.delete({ where: { id: itemId } });

  const remaining = await prisma.playlistItem.findMany({
    where: { playlistId },
    orderBy: { position: 'asc' },
  });
  await prisma.$transaction(
    remaining.map((row, index) =>
      prisma.playlistItem.update({
        where: { id: row.id },
        data: { position: index },
      }),
    ),
  );

  return getMineById(ownerId, playlistId);
}

export async function reorderItems(ownerId: string, playlistId: string, itemIds: string[]) {
  const playlist = await prisma.playlist.findFirst({ where: { id: playlistId, ownerId } });
  if (!playlist) throw new AppError(404, 'Playlist não encontrada');

  const current = await prisma.playlistItem.findMany({ where: { playlistId } });
  const currentIds = new Set(current.map((i) => i.id));
  if (itemIds.length !== current.length || itemIds.some((id) => !currentIds.has(id))) {
    throw new AppError(400, 'Lista de itens inválida para reordenar');
  }

  await prisma.$transaction(
    itemIds.map((id, index) =>
      prisma.playlistItem.update({
        where: { id },
        data: { position: index },
      }),
    ),
  );

  return getMineById(ownerId, playlistId);
}
