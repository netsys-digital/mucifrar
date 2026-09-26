/** Monta URL da cifra preservando contexto de playlist. */
export function cifraFromPlaylistHref(
  cifraSlug: string,
  ctx: { playlistSlug?: string | null; playlistId?: string | null },
  extra?: URLSearchParams | Record<string, string>,
): string {
  const q = new URLSearchParams();
  if (ctx.playlistSlug) q.set('playlist', ctx.playlistSlug);
  if (ctx.playlistId) q.set('playlistId', ctx.playlistId);
  if (extra) {
    const entries = extra instanceof URLSearchParams ? extra.entries() : Object.entries(extra);
    for (const [k, v] of entries) {
      if (v) q.set(k, v);
    }
  }
  const qs = q.toString();
  return `/cifra/${encodeURIComponent(cifraSlug)}${qs ? `?${qs}` : ''}`;
}
