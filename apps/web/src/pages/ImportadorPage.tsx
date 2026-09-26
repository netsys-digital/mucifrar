import { useEffect, useMemo, useState, type DragEvent } from 'react';
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

  /** React bloqueia href="javascript:…"; no drag enviamos a URL real. */
  function onBookmarkDragStart(e: DragEvent<HTMLButtonElement>) {
    e.dataTransfer.setData('text/uri-list', bookmarklet);
    e.dataTransfer.setData('text/plain', bookmarklet);
    e.dataTransfer.setData(
      'text/html',
      `<a href="${bookmarklet.replace(/"/g, '&quot;')}">Importar p/ Chord Seven</a>`,
    );
    e.dataTransfer.effectAllowed = 'copyLink';
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
            Clique em <strong>Copiar bookmarklet</strong> (recomendado) ou arraste o botão azul para a
            barra de favoritos.
          </li>
          <li>
            Se for copiar: Favoritos → Adicionar favorito → no campo URL cole o código (começa com{' '}
            <code>javascript:</code>).
          </li>
          <li>Abra a cifra no Cifra Club e clique no favorito.</li>
        </ol>

        <div className="importador-actions">
          <button
            type="button"
            className="btn btn-primary bookmarklet-link"
            draggable
            onDragStart={onBookmarkDragStart}
            title="Arraste para a barra de favoritos"
          >
            Importar p/ Chord Seven
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void copyBookmarklet()}>
            {copied ? 'Copiado!' : 'Copiar bookmarklet'}
          </button>
        </div>
        <p className="muted small-print">
          Se o favorito antigo mostrar erro do React, apague-o e crie de novo com{' '}
          <strong>Copiar bookmarklet</strong>. No celular: edite o favorito e cole no campo URL.
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
