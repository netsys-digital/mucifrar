import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { buildBookmarkletHref } from '../lib/importPayload';
import { useAuth } from '../auth/AuthContext';

export function ImportadorPage() {
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const bookmarklet = useMemo(
    () => buildBookmarkletHref(typeof window !== 'undefined' ? window.location.origin : ''),
    [],
  );

  useEffect(() => {
    document.title = 'Importador de cifra — Chord Seven';
    return () => {
      document.title = 'Chord Seven';
    };
  }, []);

  async function copyBookmarklet() {
    try {
      await navigator.clipboard.writeText(bookmarklet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="page importador-page">
      <div className="section-head">
        <div>
          <p className="eyebrow">Chord Seven</p>
          <h1>Importador de cifra</h1>
          <p className="muted">
            Instale o atalho no celular ou use o bookmarklet no Cifra Club. A importação roda no{' '}
            <strong>seu</strong> dispositivo — assim o site não bloqueia o servidor.
          </p>
        </div>
      </div>

      <section className="importador-card">
        <h2>1. Baixar o app (PWA)</h2>
        <p className="muted">
          Adiciona o Importador à tela inicial. Abra por ele sempre que for trazer cifras.
        </p>
        <PwaInstallButton className="btn btn-gold" />
      </section>

      <section className="importador-card">
        <h2>2. Bookmarklet (Cifra Club → Chord Seven)</h2>
        <ol className="importador-steps">
          <li>
            Arraste o botão abaixo para a barra de favoritos (ou copie o link e salve como favorito).
          </li>
          <li>Abra a cifra no Cifra Club (página da música ou “imprimir”).</li>
          <li>Toque no favorito — a cifra abre em Enviar para você revisar e salvar.</li>
        </ol>

        <div className="importador-actions">
          <a
            className="btn btn-primary bookmarklet-link"
            href={bookmarklet}
            onClick={(e) => e.preventDefault()}
          >
            Importar p/ Chord Seven
          </a>
          <button type="button" className="btn btn-ghost" onClick={() => void copyBookmarklet()}>
            {copied ? 'Copiado!' : 'Copiar bookmarklet'}
          </button>
        </div>
        <p className="muted small-print">
          No celular: favoritos → editar → colar o código copiado no campo URL do favorito.
        </p>
      </section>

      <section className="importador-card">
        <h2>3. Enviar no Chord Seven</h2>
        <p className="muted">
          Depois do bookmarklet você cai em <strong>Enviar cifra</strong> com os campos preenchidos.
          Confira e salve.
        </p>
        {isAuthenticated ? (
          <Link to="/enviar" className="btn btn-ghost">
            Ir para Enviar cifra
          </Link>
        ) : (
          <Link to="/entrar" state={{ from: '/enviar' }} className="btn btn-ghost">
            Entrar para salvar cifras
          </Link>
        )}
      </section>
    </div>
  );
}
