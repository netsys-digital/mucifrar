import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type Cifra } from '../lib/api';

const EMPTY = {
  title: '',
  artist: '',
  key: 'C',
  content: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
};

type CifraClubImport = {
  title: string;
  artist: string;
  key: string;
  content: string;
  sourceUrl: string;
};

export function CifraFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState<string | null>(null);

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

  async function onImport(e: FormEvent) {
    e.preventDefault();
    setImporting(true);
    setError(null);
    setImportNote(null);
    try {
      const imported = await api<CifraClubImport>('/api/cifras/import/cifraclub', {
        method: 'POST',
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      setForm((f) => ({
        ...f,
        title: imported.title,
        artist: imported.artist,
        key: imported.key,
        content: imported.content,
      }));
      setImportNote('Cifra importada do Cifra Club. Revise e salve quando estiver ok.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao importar do Cifra Club');
    } finally {
      setImporting(false);
    }
  }

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

      <form className="cifra-import" onSubmit={(e) => void onImport(e)}>
        <div>
          <h2>Importar do Cifra Club</h2>
          <p className="muted">
            Cole o link da cifra para preencher o formulário. Se o site bloquear o servidor, cole o
            texto manualmente abaixo.
          </p>
        </div>
        <div className="cifra-import-row">
          <input
            type="url"
            inputMode="url"
            placeholder="https://www.cifraclub.com.br/artista/musica/"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-ghost" disabled={importing || !importUrl.trim()}>
            {importing ? 'Importando…' : 'Importar'}
          </button>
        </div>
        {importNote ? <p className="ok-text">{importNote}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </form>

      <form className="cifra-form" onSubmit={(e) => void onSubmit(e)}>
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
