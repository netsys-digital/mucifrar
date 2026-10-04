import { type FormEvent, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { GlobalLoader, useGlobalLoading } from './GlobalLoader';
import {
  resolveSearch,
  SearchDestinationField,
  type SearchTarget,
} from './SearchDestinationField';

function TopbarSearch() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const urlQuery = location.pathname === '/' ? (params.get('q') ?? '') : null;
  const [q, setQ] = useState(urlQuery ?? '');
  const [target, setTarget] = useState<SearchTarget>('interna');

  useEffect(() => {
    if (urlQuery !== null) setQ(urlQuery);
  }, [urlQuery]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = resolveSearch(target, q);
    if (result.kind === 'external') {
      window.location.assign(result.url);
      return;
    }
    const next = new URLSearchParams();
    if (result.q) next.set('q', result.q);
    if (location.pathname === '/' && params.get('sort') === 'recent') {
      next.set('sort', 'recent');
    }
    const search = next.toString();
    navigate({ pathname: '/', search: search ? `?${search}` : '' });
  }

  return (
    <SearchDestinationField
      id="topbar-search-q"
      className="topbar-search"
      query={q}
      onQueryChange={setQ}
      target={target}
      onTargetChange={setTarget}
      onSubmit={onSubmit}
    />
  );
}

export function AppShell() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const loading = useGlobalLoading();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" end>
          <img src="/logo.png" alt="Chord Seven" className="brand-logo" />
        </NavLink>

        <nav className="nav" aria-label="Principal">
          <NavLink to="/" end className="nav-link">
            Início
          </NavLink>
          <NavLink to="/playlists" className="nav-link">
            Playlists
          </NavLink>
          <NavLink to="/importador" className="nav-link">
            Captura de cifras
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink to="/minhas" className="nav-link">
                Minhas cifras
              </NavLink>
              <NavLink to="/minhas-playlists" className="nav-link">
                Minhas playlists
              </NavLink>
              <NavLink to="/enviar" className="nav-link">
                Enviar
              </NavLink>
            </>
          ) : null}
        </nav>

        <TopbarSearch />

        <div className="topbar-actions">
          {isAuthenticated ? (
            <>
              <span className="user-chip" title={user?.email}>
                {user?.name}
              </span>
              <button type="button" className="btn btn-ghost" onClick={() => void handleLogout()}>
                Sair
              </button>
            </>
          ) : (
            <>
              <NavLink to="/entrar" className="btn btn-ghost">
                Entrar
              </NavLink>
              <NavLink to="/cadastrar" className="btn btn-primary">
                Criar conta
              </NavLink>
            </>
          )}
        </div>
      </header>

      <GlobalLoader visible={loading} />

      <main className={`main${loading ? ' is-loading' : ''}`}>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src="/logo.png" alt="Chord Seven" className="brand-logo brand-logo-footer" />
            <p>Cifras claras para tocar e cantar juntos.</p>
          </div>
          <div className="footer-cols">
            <div>
              <h3>Explorar</h3>
              <NavLink to="/">Cifras</NavLink>
              <NavLink to="/playlists">Playlists públicas</NavLink>
              <NavLink to="/enviar">Enviar cifra</NavLink>
            </div>
            <div>
              <h3>Conta</h3>
              {isAuthenticated ? (
                <>
                  <NavLink to="/minhas">Minhas cifras</NavLink>
                  <NavLink to="/minhas-playlists">Minhas playlists</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/entrar">Entrar</NavLink>
                  <NavLink to="/cadastrar">Criar conta</NavLink>
                </>
              )}
            </div>
          </div>
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} Chord Seven</p>
      </footer>
    </div>
  );
}
