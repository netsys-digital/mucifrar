import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type PlaylistListResponse } from '../lib/api';
import { PlaylistCard } from '../components/PlaylistCard';
import { useAuth } from '../auth/AuthContext';

export function PlaylistsPage() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [q, setQ] = useState(initialQ);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlaylistListResponse | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const query = params.get('q') ?? '';
    const page = Number(params.get('page') ?? '1');
    setQ(query);
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (query) qs.set('q', query);
    qs.set('page', String(page));

    void api<PlaylistListResponse>(`/api/publico/playlists?${qs}`)
      .then((res) => {
        if (!cancelled) setData(res);
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
  }, [params]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    setParams(next);
  }

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>Playlists públicas</h1>
          <p className="muted">Coleções de cifras compartilhadas pela comunidade.</p>
        </div>
        {isAuthenticated ? (
          <Link to="/minhas-playlists" className="btn btn-primary">
            Minhas playlists
          </Link>
        ) : (
          <Link to="/entrar" className="btn btn-ghost">
            Entrar para criar
          </Link>
        )}
      </div>

      <form className="search-bar playlist-search" onSubmit={onSearch}>
        <label className="sr-only" htmlFor="playlist-q">
          Buscar playlist
        </label>
        <input
          id="playlist-q"
          type="search"
          placeholder="Nome, descrição ou autor…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Buscar
        </button>
      </form>

      {loading ? <p className="muted">Carregando…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && data?.items.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma playlist pública ainda.</p>
          {isAuthenticated ? (
            <button type="button" className="btn btn-primary" onClick={() => navigate('/minhas-playlists')}>
              Criar a primeira
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="playlist-grid">
        {data?.items.map((playlist) => (
          <PlaylistCard key={playlist.id} playlist={playlist} />
        ))}
      </div>

      {data && data.totalPages > 1 ? (
        <div className="pager">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={data.page <= 1}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('page', String(data.page - 1));
              setParams(next);
            }}
          >
            Anterior
          </button>
          <span className="muted">
            Página {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={data.page >= data.totalPages}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('page', String(data.page + 1));
              setParams(next);
            }}
          >
            Próxima
          </button>
        </div>
      ) : null}
    </div>
  );
}
