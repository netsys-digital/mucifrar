import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type CifraListResponse, type PlaylistListResponse } from '../lib/api';
import { CifraCard } from '../components/CifraCard';
import { PlaylistCard } from '../components/PlaylistCard';
import { useAuth } from '../auth/AuthContext';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1800&q=80';

export function HomePage() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const sort = (params.get('sort') === 'recent' ? 'recent' : 'popular') as 'popular' | 'recent';
  const [q, setQ] = useState(initialQ);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CifraListResponse | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistListResponse | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const pushedQ = useRef(initialQ);
  const searching = q.trim() !== '';

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed === pushedQ.current) return;
    const timer = window.setTimeout(() => {
      pushedQ.current = trimmed;
      const next = new URLSearchParams(params);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      next.delete('page');
      setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q, params, setParams]);

  useEffect(() => {
    const query = params.get('q') ?? '';
    const page = Number(params.get('page') ?? '1');
    const sortParam = params.get('sort') === 'recent' ? 'recent' : 'popular';
    if (query !== pushedQ.current) {
      pushedQ.current = query;
      setQ(query);
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (query) qs.set('q', query);
    qs.set('page', String(page));
    qs.set('sort', sortParam);
    qs.set('pageSize', '12');

    void api<CifraListResponse>(`/api/publico/cifras?${qs}`)
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

  useEffect(() => {
    let cancelled = false;
    void api<PlaylistListResponse>('/api/publico/playlists?pageSize=4')
      .then((res) => {
        if (!cancelled) setPlaylists(res);
      })
      .catch(() => {
        if (!cancelled) setPlaylists(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    pushedQ.current = q.trim();
    if (q.trim()) next.set('q', q.trim());
    if (sort === 'recent') next.set('sort', 'recent');
    setParams(next);
  }

  function setSort(nextSort: 'popular' | 'recent') {
    const next = new URLSearchParams(params);
    if (nextSort === 'recent') next.set('sort', 'recent');
    else next.delete('sort');
    next.delete('page');
    setParams(next);
  }

  return (
    <div className="page home-page">
      <section className={`portal-hero${searching ? ' portal-hero--compact' : ''}`}>
        <div
          className="portal-hero-media"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden
        />
        <div className="portal-hero-scrim" aria-hidden />
        <div className="portal-hero-content">
          <img src="/logo.png" alt="Chord Seven" className="brand-logo brand-logo-hero" />
          <h1 className="portal-hero-title">Toque e cante com louvor</h1>
          <p className="portal-hero-lede">
            Cifras claras para violão, teclado e voz — busque, organize em playlists e toque junto.
          </p>
          <form className="portal-search" onSubmit={onSearch}>
            <label className="sr-only" htmlFor="search-q">
              Buscar cifra
            </label>
            <input
              id="search-q"
              type="search"
              placeholder="Pesquise por música ou artista…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoComplete="off"
            />
            <button type="submit" className="btn btn-gold" aria-label="Buscar">
              Buscar
            </button>
          </form>
        </div>
      </section>

      {!searching ? (
      <section className="portal-shortcuts" aria-label="Atalhos">
        <Link to="/playlists" className="portal-shortcut">
          <span className="portal-shortcut-icon" aria-hidden>
            ♫
          </span>
          <strong>Playlists</strong>
          <span>Coleções públicas da comunidade</span>
        </Link>
        <button type="button" className="portal-shortcut" onClick={() => setSort('popular')}>
          <span className="portal-shortcut-icon" aria-hidden>
            ★
          </span>
          <strong>Cifras populares</strong>
          <span>Mais acessadas do portal</span>
        </button>
        <button type="button" className="portal-shortcut" onClick={() => setSort('recent')}>
          <span className="portal-shortcut-icon" aria-hidden>
            ▶
          </span>
          <strong>Novos lançamentos</strong>
          <span>Músicas recém-publicadas</span>
        </button>
      </section>
      ) : null}

      <section className="section portal-section" id="destaques">
        <div className="portal-section-title">
          <span />
          <h2>
            {params.get('q')
              ? `Resultados para “${params.get('q')}”`
              : sort === 'recent'
                ? 'Novos lançamentos'
                : 'Cifras em destaque'}
          </h2>
          <span />
        </div>

        {!searching ? (
        <div className="portal-sort-tabs">
          <button
            type="button"
            className={`portal-sort-tab${sort === 'popular' ? ' is-active' : ''}`}
            onClick={() => setSort('popular')}
          >
            Populares
          </button>
          <button
            type="button"
            className={`portal-sort-tab${sort === 'recent' ? ' is-active' : ''}`}
            onClick={() => setSort('recent')}
          >
            Recentes
          </button>
        </div>
        ) : null}

        {loading ? <p className="muted">Carregando…</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && data?.items.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma cifra encontrada.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/enviar')}>
              Enviar a primeira
            </button>
          </div>
        ) : null}

        <div className="cifra-grid">
          {data?.items.map((cifra) => (
            <CifraCard key={cifra.id} cifra={cifra} />
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
      </section>

      {!searching ? (
      <section className="portal-split section">
        <div className="portal-split-col">
          <div className="portal-section-title compact">
            <span />
            <h2>Playlists públicas</h2>
            <span />
          </div>
          {playlists && playlists.items.length > 0 ? (
            <div className="playlist-grid playlist-grid-home">
              {playlists.items.slice(0, 4).map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Ainda não há playlists públicas.</p>
              {isAuthenticated ? (
                <Link to="/minhas-playlists" className="btn btn-primary">
                  Criar playlist
                </Link>
              ) : (
                <Link to="/playlists" className="btn btn-ghost">
                  Ver playlists
                </Link>
              )}
            </div>
          )}
          <div className="portal-split-action">
            <Link to="/playlists" className="btn btn-ghost">
              Ver todas as playlists
            </Link>
          </div>
        </div>

        <div className="portal-split-col">
          <div className="portal-section-title compact">
            <span />
            <h2>Comece por aqui</h2>
            <span />
          </div>
          <ul className="portal-tips">
            <li>
              <span className="portal-tip-thumb" aria-hidden>
                1
              </span>
              <div>
                <strong>Captura de cifras</strong>
                <p>Traga cifras do Cifra Club com um clique e revise antes de salvar.</p>
                <Link to="/importador">Como configurar →</Link>
              </div>
            </li>
            <li>
              <span className="portal-tip-thumb" aria-hidden>
                2
              </span>
              <div>
                <strong>Ajuste tom e capo</strong>
                <p>Na tela da cifra, mude o tom e salve sua versão.</p>
                <Link to="/">Explorar cifras →</Link>
              </div>
            </li>
            <li>
              <span className="portal-tip-thumb" aria-hidden>
                3
              </span>
              <div>
                <strong>Monte playlists</strong>
                <p>Públicas para o portal ou privadas só para você.</p>
                <Link to={isAuthenticated ? '/minhas-playlists' : '/playlists'}>
                  Ir para playlists →
                </Link>
              </div>
            </li>
          </ul>
        </div>
      </section>
      ) : null}
    </div>
  );
}
