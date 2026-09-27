import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function AppShell() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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

      <main className="main">
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
