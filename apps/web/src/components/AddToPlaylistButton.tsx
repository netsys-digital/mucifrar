import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, type Playlist } from '../lib/api';
import { useAuth } from '../auth/AuthContext';

export function AddToPlaylistButton({ cifraId }: { cifraId: string }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api<{ items: Playlist[] }>('/api/playlists/minhas')
      .then((res) => {
        if (!cancelled) setItems(res.items);
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
  }, [open, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Link to="/entrar" className="btn btn-ghost btn-compact print-hide">
        Entrar para salvar em playlist
      </Link>
    );
  }

  async function addTo(playlistId: string) {
    setBusyId(playlistId);
    setError(null);
    setNote(null);
    try {
      await api(`/api/playlists/${playlistId}/itens`, {
        method: 'POST',
        body: JSON.stringify({ cifraId }),
      });
      setNote('Adicionada à playlist');
      window.setTimeout(() => setNote(null), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao adicionar');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="add-playlist print-hide">
      <button
        type="button"
        className={`btn btn-ghost btn-compact${open ? ' is-active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Fechar playlists' : 'Adicionar à playlist'}
      </button>

      {open ? (
        <div className="add-playlist-panel">
          {loading ? <p className="muted">Carregando suas playlists…</p> : null}
          {error ? <p className="error-text">{error}</p> : null}
          {note ? <p className="ok-text">{note}</p> : null}

          {!loading && items.length === 0 ? (
            <p className="muted">
              Nenhuma playlist.{' '}
              <Link to="/minhas-playlists">Criar uma</Link>
            </p>
          ) : null}

          <ul className="add-playlist-list">
            {items.map((playlist) => (
              <li key={playlist.id}>
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  disabled={busyId === playlist.id}
                  onClick={() => void addTo(playlist.id)}
                >
                  <span>
                    {playlist.title}
                    <small className="muted">
                      {' '}
                      · {playlist.visibility === 'PUBLIC' ? 'Pública' : 'Privada'}
                    </small>
                  </span>
                  <span>{busyId === playlist.id ? '…' : '+'}</span>
                </button>
              </li>
            ))}
          </ul>

          <Link to="/minhas-playlists" className="btn btn-ghost btn-compact">
            Gerenciar playlists
          </Link>
        </div>
      ) : null}
    </div>
  );
}
