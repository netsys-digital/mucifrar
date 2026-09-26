import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError, type Playlist } from '../lib/api';

const EMPTY = {
  title: '',
  description: '',
  visibility: 'PRIVATE' as 'PUBLIC' | 'PRIVATE',
};

export function MyPlaylistsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: Playlist[] }>('/api/playlists/minhas');
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<Playlist>('/api/playlists', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          visibility: form.visibility,
        }),
      });
      setForm(EMPTY);
      setShowForm(false);
      navigate(`/minhas-playlists/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar playlist');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta playlist?')) return;
    await api(`/api/playlists/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>Minhas playlists</h1>
          <p className="muted">Crie quantas quiser — públicas ou só suas.</p>
        </div>
        <div className="mine-actions">
          <Link to="/playlists" className="btn btn-ghost">
            Ver públicas
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancelar' : 'Nova playlist'}
          </button>
        </div>
      </div>

      {showForm ? (
        <form className="cifra-form" onSubmit={(e) => void onCreate(e)}>
          <div className="form-grid">
            <label>
              Nome
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex.: Culto domingo"
              />
            </label>
            <label>
              Visibilidade
              <select
                value={form.visibility}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    visibility: e.target.value as 'PUBLIC' | 'PRIVATE',
                  }))
                }
              >
                <option value="PRIVATE">Privada (só você)</option>
                <option value="PUBLIC">Pública (todo o portal)</option>
              </select>
            </label>
          </div>
          <label>
            Descrição (opcional)
            <textarea
              rows={3}
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Para que serve esta playlist…"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Criando…' : 'Criar playlist'}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p className="muted">Carregando…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && items.length === 0 && !showForm ? (
        <div className="empty-state">
          <p>Você ainda não criou nenhuma playlist.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            Criar playlist
          </button>
        </div>
      ) : null}

      <div className="mine-list">
        {items.map((playlist) => (
          <article key={playlist.id} className="mine-row">
            <div>
              <h3>{playlist.title}</h3>
              <p className="muted">
                <span className={playlist.visibility === 'PUBLIC' ? 'badge-ok' : 'badge-draft'}>
                  {playlist.visibility === 'PUBLIC' ? 'Pública' : 'Privada'}
                </span>
                {` · ${playlist.itemCount} cifra${playlist.itemCount === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="mine-actions">
              {playlist.visibility === 'PUBLIC' ? (
                <Link to={`/playlist/${playlist.slug}`} className="btn btn-ghost">
                  Ver
                </Link>
              ) : null}
              <Link to={`/minhas-playlists/${playlist.id}`} className="btn btn-ghost">
                Gerenciar
              </Link>
              <button type="button" className="btn btn-danger" onClick={() => void remove(playlist.id)}>
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
