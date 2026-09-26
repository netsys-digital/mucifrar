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
          <h1>Como trazer cifras do Cifra Club</h1>
          <p className="muted">
            O Chord Seven <strong>não busca</strong> a cifra sozinho no servidor. Você configura um
            favorito no navegador <strong>uma vez</strong>; depois, em qualquer cifra do Cifra Club,
            basta clicar nesse favorito e a música vem para cá já preenchida.
          </p>
        </div>
      </div>

      <section className="importador-card importador-card--highlight">
        <h2>Em poucas palavras</h2>
        <ol className="importador-steps">
          <li>Crie o favorito especial (passos abaixo).</li>
          <li>Abra a música no site do Cifra Club.</li>
          <li>Clique no favorito — a cifra abre no Chord Seven para você salvar.</li>
        </ol>
      </section>

      <section className="importador-card">
        <h2>Passo 1 — Deixe o site à mão (opcional)</h2>
        <p className="muted">
          No celular, você pode adicionar esta página à tela inicial, como um ícone de aplicativo.
          Assim fica mais fácil voltar nas instruções.
        </p>
        <PwaInstallButton className="btn btn-gold" />
      </section>

      <section className="importador-card">
        <h2>Passo 2 — Criar o favorito “Importar p/ Chord Seven”</h2>
        <p className="muted">
          Esse favorito é um atalho inteligente: ele lê a cifra na página do Cifra Club e traz para o
          Chord Seven. Faça isso só uma vez.
        </p>

        <h3 className="importador-sub">No computador (Chrome)</h3>
        <ol className="importador-steps">
          <li>
            Mostre a barra de favoritos: pressione <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd>
            .
          </li>
          <li>
            Clique em <strong>Copiar favorito</strong> abaixo (ou arraste o botão azul até a barra).
          </li>
          <li>
            Menu ⋮ → Favoritos → <strong>Gerenciador de favoritos</strong> → adicionar favorito.
          </li>
          <li>
            Nome: <strong>Importar p/ Chord Seven</strong>
          </li>
          <li>
            No campo da <strong>URL</strong>, apague tudo e <strong>cole</strong> o que foi
            copiado. Tem que começar com <code>javascript:</code>.
          </li>
          <li>Salve. O favorito deve aparecer na barra.</li>
        </ol>

        <h3 className="importador-sub">No celular (Chrome Android)</h3>
        <ol className="importador-steps">
          <li>
            Toque em <strong>Copiar favorito</strong> abaixo.
          </li>
          <li>
            Toque na estrela (ou ⋮ → <strong>Adicionar aos favoritos</strong>).
          </li>
          <li>
            Edite o favorito: nome <strong>Importar p/ Chord Seven</strong>.
          </li>
          <li>
            No campo do endereço/URL, apague o que estiver lá e <strong>cole</strong> o código
            copiado.
          </li>
          <li>Salve.</li>
        </ol>

        <div className="importador-actions">
          <button
            type="button"
            className="btn btn-primary bookmarklet-link"
            draggable
            onDragStart={onBookmarkDragStart}
            title="Arraste para a barra de favoritos (computador)"
          >
            Importar p/ Chord Seven
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void copyBookmarklet()}>
            {copied ? 'Copiado! Agora cole no favorito' : 'Copiar favorito'}
          </button>
        </div>
        <p className="muted small-print">
          Se o favorito mostrar erro falando de “React”, apague-o e crie de novo com{' '}
          <strong>Copiar favorito</strong>.
        </p>
      </section>

      <section className="importador-card">
        <h2>Passo 3 — Usar no dia a dia</h2>
        <ol className="importador-steps">
          <li>
            Abra a cifra no{' '}
            <a href="https://www.cifraclub.com.br/" target="_blank" rel="noreferrer">
              Cifra Club
            </a>{' '}
            (página da música).
          </li>
          <li>
            Clique no favorito <strong>Importar p/ Chord Seven</strong>.
          </li>
          <li>
            Você volta ao Chord Seven com título, artista, tom e cifra preenchidos — revise e
            salve.
          </li>
        </ol>
        <div className="importador-actions">
          <a
            className="btn btn-gold"
            href="https://www.cifraclub.com.br/"
            target="_blank"
            rel="noreferrer"
          >
            Abrir Cifra Club
          </a>
          {isAuthenticated ? (
            <Link to="/enviar" className="btn btn-ghost">
              Ir para Enviar cifra
            </Link>
          ) : (
            <Link to="/entrar" state={{ from: '/enviar' }} className="btn btn-ghost">
              Entrar para salvar
            </Link>
          )}
        </div>
      </section>

      <section className="importador-card">
        <h2>Não quer usar o favorito?</h2>
        <p className="muted">
          Sem problema: na página <strong>Enviar cifra</strong> você pode digitar ou colar a cifra
          manualmente nos campos do formulário.
        </p>
        {isAuthenticated ? (
          <Link to="/enviar" className="btn btn-ghost">
            Preencher na mão
          </Link>
        ) : null}
      </section>
    </div>
  );
}
