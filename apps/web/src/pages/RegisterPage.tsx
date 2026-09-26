import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../lib/api';

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/minhas" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register(name, email, password);
      navigate('/enviar', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha no cadastro');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-panel" onSubmit={(e) => void onSubmit(e)}>
        <img src="/logo.png" alt="Chord Seven" className="brand-logo brand-logo-auth" />
        <h1>Criar conta</h1>
        <p className="muted">Publique suas cifras e compartilhe com a comunidade.</p>

        {error ? <p className="error-text">{error}</p> : null}

        <label>
          Nome
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>
        <label>
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Criando…' : 'Criar conta'}
        </button>

        <p className="auth-switch">
          Já tem conta? <Link to="/entrar">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
