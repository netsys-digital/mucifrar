import { useEffect, useRef } from 'react';
import { ApiError, apiFetch, type Playlist } from './api';
import { transposeKey } from './transpose';

export type PlaylistTomEvent = {
  itemId: string;
  cifraId: string;
  cifraSlug: string;
  semitones: number;
};

type LivePlaylist = Pick<Playlist, 'id' | 'slug' | 'visibility'>;

export function describePlaylistKey(originalKey: string, semitones = 0) {
  const current = transposeKey(originalKey, semitones || 0);
  const shifted = (semitones || 0) !== 0 && current !== originalKey;
  return { current, shifted };
}

function eventsPath(playlist: LivePlaylist) {
  if (playlist.visibility === 'PUBLIC') {
    return `/api/publico/playlists/${encodeURIComponent(playlist.slug)}/eventos`;
  }
  return `/api/playlists/${playlist.id}/eventos`;
}

function tomPath(playlist: LivePlaylist, itemId: string) {
  if (playlist.visibility === 'PUBLIC') {
    return `/api/publico/playlists/${encodeURIComponent(playlist.slug)}/itens/${itemId}/tom`;
  }
  return `/api/playlists/${playlist.id}/itens/${itemId}/tom`;
}

export async function savePlaylistItemTom(
  playlist: LivePlaylist,
  itemId: string,
  semitones: number,
): Promise<PlaylistTomEvent> {
  const res = await apiFetch(tomPath(playlist, itemId), {
    method: 'PUT',
    body: JSON.stringify({ semitones }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Não foi possível sincronizar o tom');
  }
  return data as PlaylistTomEvent;
}

export function usePlaylistTomEvents(
  playlist: LivePlaylist | null,
  onEvent: (event: PlaylistTomEvent) => void,
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const playlistId = playlist?.id ?? null;
  const playlistSlug = playlist?.slug ?? null;
  const visibility = playlist?.visibility ?? null;

  useEffect(() => {
    if (!playlistId || !playlistSlug || !visibility) return;

    const path = eventsPath({ id: playlistId, slug: playlistSlug, visibility });
    let cancelled = false;
    let abort: AbortController | null = null;
    let timer = 0;

    const connect = async () => {
      if (cancelled) return;
      abort = new AbortController();
      try {
        const res = await apiFetch(path, {
          headers: { Accept: 'text/event-stream' },
          signal: abort.signal,
        });
        if (!res.ok || !res.body) throw new Error('stream');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            const dataLine = part
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .join('\n');
            if (!dataLine) continue;
            try {
              const event = JSON.parse(dataLine) as PlaylistTomEvent;
              if (event?.itemId) onEventRef.current(event);
            } catch {
              /* evento incompleto */
            }
          }
        }
      } catch {
        /* reconecta abaixo */
      }
      if (!cancelled) {
        timer = window.setTimeout(() => {
          void connect();
        }, 1500);
      }
    };

    void connect();

    return () => {
      cancelled = true;
      abort?.abort();
      window.clearTimeout(timer);
    };
  }, [playlistId, playlistSlug, visibility]);
}
