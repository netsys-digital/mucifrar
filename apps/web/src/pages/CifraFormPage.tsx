import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type Cifra } from '../lib/api';
import { consumePendingImport, clearPendingImport } from '../lib/importPayload';

const EMPTY = {
  title: '',
  artist: '',
  key: 'C',
  content: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
};

export function CifraFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => {
    if (mode !== 'create') return EMPTY;
    const pending = consumePendingImport();
    if (!pending) return EMPTY;
    return {
      ...EMPTY,
      title: pending.title,
      artist: pending.artist,
      key: pending.key,
      content: pending.content,
    };
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [importNote] = useState<string | null>(() =>
    mode === 'create' && Boolean(consumePendingImport()?.content)
      ? 'Cifra trazida pela Captura de cifras. Revise e salve quando estiver ok.'
      : null,
  );

  useEffect(() => {
    if (mode !== 'edit') return;
    let cancelled = false;
    void api<Cifra>(`/api/cifras/${id}`)
      .then((cifra) => {
        if (cancelled) return;
        setForm({
          title: cifra.title,
          artist: cifra.artist,
          key: cifra.key,
          content: cifra.content,
          status: cifra.status,
        });
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
  }, [mode, id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        await api<Cifra>('/api/cifras', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        clearPendingImport();
      } else {
        await api<Cifra>(`/api/cifras/${id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      }
      navigate('/minhas');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="page muted">Carregando…</p>;

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>{mode === 'create' ? 'Enviar cifra' : 'Editar cifra'}</h1>
          <p className="muted">Use acordes acima das letras, como no padrão de cifra.</p>
        </div>
        <Link to="/minhas" className="btn btn-ghost">
          Cancelar
        </Link>
      </div>

      {mode === 'create' ? (
        <div className="enviar-import-grid">
          <div className="cifra-import enviar-import-card">
            <h2>Já uso a Captura de cifras</h2>
            <p className="muted">
              Abra a música no Cifra Club, use o favorito <strong>Capturar p/ Chord Seven</strong> e
              volte aqui com a cifra preenchida.
            </p>
            <a className="btn btn-gold" href="https://www.cifraclub.com.br/">
              Abrir Cifra Club
            </a>
            {importNote ? <p className="ok-text">{importNote}</p> : null}
          </div>

          <div className="cifra-import enviar-import-card enviar-import-card--side">
            <h2>Ainda não configurei</h2>
            <p className="muted">
              É preciso criar um favorito especial uma vez. Veja o passo a passo simples.
            </p>
            <Link to="/importador" className="btn btn-ghost">
              Ver instruções
            </Link>
          </div>
        </div>
      ) : null}

      <form className="cifra-form" onSubmit={(e) => void onSubmit(e)}>
        {error ? <p className="error-text">{error}</p> : null}

        <div className="form-grid">
          <label>
            Título
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>
          <label>
            Artista / compositor
            <input
              required
              value={form.artist}
              onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
            />
          </label>
          <label>
            Tom
            <input
              required
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: e.target.value as 'DRAFT' | 'PUBLISHED',
                }))
              }
            >
              <option value="DRAFT">Rascunho</option>
              <option value="PUBLISHED">Publicar agora</option>
            </select>
          </label>
        </div>

        <label>
          Conteúdo da cifra
          <textarea
            required
            rows={18}
            spellCheck={false}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder={`Intro: C  G  Am  F\n\n[Verso]\nC                G\n  Letra da música…`}
          />
        </label>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar cifra'}
          </button>
        </div>
      </form>
    </div>
  );
}
