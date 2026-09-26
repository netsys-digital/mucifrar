import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Playlist } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

export function PlaylistPage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api<Playlist>(`/api/publico/playlists/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!cancelled) setPlaylist(res);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <p className="page muted">Carregando playlist…</p>;
  if (error || !playlist) {
    return (
      <div className="page">
        <p className="error-text">{error ?? 'Playlist não encontrada'}</p>
        <Link to="/playlists" className="btn btn-ghost">
          Ver playlists
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === playlist.ownerId;
  const items = playlist.items ?? [];

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Playlist pública</p>
          <h1>{playlist.title}</h1>
          {playlist.description ? <p className="muted">{playlist.description}</p> : null}
          <p className="muted">
            {playlist.ownerName ? `por ${playlist.ownerName} · ` : ''}
            {items.length} cifra{items.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="mine-actions">
          <Link to="/playlists" className="btn btn-ghost">
            ← Playlists
          </Link>
          {isOwner ? (
            <Link to={`/minhas-playlists/${playlist.id}`} className="btn btn-primary">
              Gerenciar
            </Link>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>Esta playlist ainda não tem cifras.</p>
        </div>
      ) : (
        <ol className="playlist-tracklist">
          {items.map((item, index) => (
            <li key={item.id} className="playlist-track">
              <span className="playlist-track-num">{index + 1}</span>
              <div className="playlist-track-info">
                <Link
                  to={`/cifra/${item.cifra.slug}?playlist=${encodeURIComponent(playlist.slug)}`}
                  className="playlist-track-title"
                >
                  {item.cifra.title}
                </Link>
                <p className="muted">
                  {item.cifra.artist} · Tom {item.cifra.key}
                </p>
              </div>
              <Link
                to={`/cifra/${item.cifra.slug}?playlist=${encodeURIComponent(playlist.slug)}`}
                className="btn btn-ghost btn-compact"
              >
                Abrir
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
