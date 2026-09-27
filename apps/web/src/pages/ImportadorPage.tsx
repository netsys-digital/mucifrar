import { useEffect, useMemo, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { PwaInstallButton } from '../components/PwaInstallButton';
import { buildBookmarkletHref } from '../lib/importPayload';
import { useAuth } from '../auth/AuthContext';

type Device = 'pc' | 'mobile';

const BOOKMARK_NAME = 'Capturar p/ Chord Seven';

function detectDevice(): Device {
  if (typeof window === 'undefined') return 'pc';
  return window.matchMedia('(pointer: coarse)').matches ? 'mobile' : 'pc';
}

function StepVideo({ src, label }: { src: string; label: string }) {
  return (
    <figure className="importador-video">
      <video src={src} controls muted loop playsInline autoPlay preload="metadata" aria-label={label} />
      <figcaption className="muted">{label}</figcaption>
    </figure>
  );
}

export function ImportadorPage() {
  const { isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [device, setDevice] = useState<Device>(detectDevice);
  const bookmarklet = useMemo(
    () => buildBookmarkletHref(typeof window !== 'undefined' ? window.location.origin : ''),
    [],
  );

  useEffect(() => {
    document.title = 'Captura de cifras — Chord Seven';
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

  function onBookmarkDragStart(e: DragEvent<HTMLButtonElement>) {
    e.dataTransfer.setData('text/uri-list', bookmarklet);
    e.dataTransfer.setData('text/plain', bookmarklet);
    e.dataTransfer.setData(
      'text/html',
      `<a href="${bookmarklet.replace(/"/g, '&quot;')}">${BOOKMARK_NAME}</a>`,
    );
    e.dataTransfer.effectAllowed = 'copyLink';
  }

  return (
    <div className="page importador-page">
      <div className="section-head">
        <div>
          <h1>Captura de cifras</h1>
          <p className="muted">Traga músicas do Cifra Club ou do Cifras.com.br para o Chord Seven com um clique.</p>
        </div>
      </div>

      <section className="importador-card importador-step">
        <div className="importador-step-body">
        <h2>1. Crie o favorito (só uma vez)</h2>

        <div className="importador-tabs" role="tablist" aria-label="Dispositivo">
          <button
            type="button"
            role="tab"
            aria-selected={device === 'pc'}
            className={`portal-sort-tab${device === 'pc' ? ' is-active' : ''}`}
            onClick={() => setDevice('pc')}
          >
            Computador
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={device === 'mobile'}
            className={`portal-sort-tab${device === 'mobile' ? ' is-active' : ''}`}
            onClick={() => setDevice('mobile')}
          >
            Celular
          </button>
        </div>

        {device === 'pc' ? (
          <ol className="importador-steps">
            <li>
              Aperte <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> para mostrar a barra de
              favoritos.
            </li>
            <li>
              <strong>Arraste</strong> o botão azul abaixo até essa barra.
            </li>
          </ol>
        ) : (
          <ol className="importador-steps">
            <li>
              Toque em <strong>Copiar favorito</strong>.
            </li>
            <li>
              Adicione esta página aos favoritos (estrela) e edite: nome{' '}
              <strong>{BOOKMARK_NAME}</strong>, e no endereço <strong>cole</strong> o que copiou.
            </li>
          </ol>
        )}

        <div className="importador-actions">
          {device === 'pc' ? (
            <button
              type="button"
              className="btn btn-primary bookmarklet-link"
              draggable
              onDragStart={onBookmarkDragStart}
              title="Arraste para a barra de favoritos"
            >
              {BOOKMARK_NAME}
            </button>
          ) : null}
          <button
            type="button"
            className={device === 'pc' ? 'btn btn-ghost' : 'btn btn-primary'}
            onClick={() => void copyBookmarklet()}
          >
            {copied ? 'Copiado!' : 'Copiar favorito'}
          </button>
        </div>
        </div>
        <StepVideo src="/videos/arrastando.mp4" label="Arrastando o botão para a barra de favoritos" />
      </section>

      <section className="importador-card importador-card--highlight importador-step">
        <div className="importador-step-body">
        <h2>2. Use no site de cifras</h2>
        <p className="muted">
          Abra a música no Cifra Club ou no Cifras.com.br e clique no favorito{' '}
          <strong>{BOOKMARK_NAME}</strong>. A cifra chega aqui preenchida — é só revisar e salvar.
        </p>
        <div className="importador-actions">
          <a className="btn btn-gold" href="https://www.cifraclub.com.br/">
            Abrir Cifra Club
          </a>
          <a className="btn btn-ghost" href="https://www.cifras.com.br/">
            Abrir Cifras.com.br
          </a>
          {!isAuthenticated ? (
            <Link to="/entrar" state={{ from: '/enviar' }} className="btn btn-ghost">
              Entrar para salvar
            </Link>
          ) : null}
        </div>
        </div>
        <StepVideo src="/videos/capturando.mp4" label="Capturando uma cifra com o favorito" />
      </section>

      <details className="importador-more">
        <summary>Dúvidas e outras opções</summary>
        <ul className="importador-steps">
          <li>
            Se o favorito mostrar erro, apague-o e crie de novo com <strong>Copiar favorito</strong>.
          </li>
          <li>
            Prefere sem favorito?{' '}
            {isAuthenticated ? <Link to="/enviar">Cole a cifra manualmente</Link> : 'Cole a cifra manualmente'}{' '}
            na página Enviar cifra.
          </li>
          <li>
            Quer um ícone na tela inicial do celular? <PwaInstallButton className="btn btn-ghost btn-compact" />
          </li>
        </ul>
      </details>
    </div>
  );
}
