import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type Playlist } from '../lib/api';

export function PlaylistManagePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE');
  const [note, setNote] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<Playlist>(`/api/playlists/${id}`);
      setPlaylist(res);
      setTitle(res.title);
      setDescription(res.description ?? '');
      setVisibility(res.visibility);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await api<Playlist>(`/api/playlists/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          visibility,
        }),
      });
      setPlaylist(updated);
      setNote('Playlist atualizada');
      window.setTimeout(() => setNote(null), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar');
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    if (!confirm('Remover esta cifra da playlist?')) return;
    const updated = await api<Playlist>(`/api/playlists/${id}/itens/${itemId}`, {
      method: 'DELETE',
    });
    setPlaylist(updated);
  }

  async function moveItem(itemId: string, direction: -1 | 1) {
    if (!playlist?.items) return;
    const ids = playlist.items.map((i) => i.id);
    const index = ids.indexOf(itemId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    const updated = await api<Playlist>(`/api/playlists/${id}/itens/ordem`, {
      method: 'PUT',
      body: JSON.stringify({ itemIds: next }),
    });
    setPlaylist(updated);
  }

  async function removePlaylist() {
    if (!confirm('Excluir esta playlist permanentemente?')) return;
    await api(`/api/playlists/${id}`, { method: 'DELETE' });
    navigate('/minhas-playlists');
  }

  if (loading) return <p className="page muted">Carregando…</p>;
  if (error && !playlist) {
    return (
      <div className="page">
        <p className="error-text">{error}</p>
        <Link to="/minhas-playlists" className="btn btn-ghost">
          Voltar
        </Link>
      </div>
    );
  }
  if (!playlist) return null;

  const items = playlist.items ?? [];

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>Gerenciar playlist</h1>
          <p className="muted">{playlist.title}</p>
        </div>
        <div className="mine-actions">
          {playlist.visibility === 'PUBLIC' ? (
            <Link to={`/playlist/${playlist.slug}`} className="btn btn-ghost">
              Ver pública
            </Link>
          ) : null}
          <Link to="/minhas-playlists" className="btn btn-ghost">
            ← Minhas playlists
          </Link>
        </div>
      </div>

      <form className="cifra-form" onSubmit={(e) => void onSave(e)}>
        {error ? <p className="error-text">{error}</p> : null}
        {note ? <p className="ok-text">{note}</p> : null}
        <div className="form-grid">
          <label>
            Nome
            <input required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Visibilidade
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'PRIVATE')}
            >
              <option value="PRIVATE">Privada (só você)</option>
              <option value="PUBLIC">Pública (todo o portal)</option>
            </select>
          </label>
        </div>
        <label>
          Descrição
          <textarea
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="form-actions" style={{ justifyContent: 'space-between' }}>
          <button type="button" className="btn btn-danger" onClick={() => void removePlaylist()}>
            Excluir playlist
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      <section className="section" style={{ marginTop: '1.5rem' }}>
        <div className="section-head">
          <div>
            <h2>Cifras na playlist</h2>
            <p className="muted">
              Use as setas ↑ ↓ para definir a ordem. Essa ordem vale na navegação ao tocar.
            </p>
          </div>
          <p className="muted">{items.length} item{items.length === 1 ? '' : 's'}</p>
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <p>Nenhuma cifra ainda. Abra uma cifra publicada e use “Adicionar à playlist”.</p>
            <Link to="/" className="btn btn-primary">
              Explorar cifras
            </Link>
          </div>
        ) : (
          <ol className="playlist-tracklist">
            {items.map((item, index) => (
              <li key={item.id} className="playlist-track">
                <div className="playlist-order-controls">
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact playlist-order-btn"
                    disabled={index === 0}
                    onClick={() => void moveItem(item.id, -1)}
                    aria-label="Subir na ordem"
                    title="Subir"
                  >
                    ↑
                  </button>
                  <span className="playlist-track-num">{index + 1}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact playlist-order-btn"
                    disabled={index === items.length - 1}
                    onClick={() => void moveItem(item.id, 1)}
                    aria-label="Descer na ordem"
                    title="Descer"
                  >
                    ↓
                  </button>
                </div>
                <div className="playlist-track-info">
                  <Link
                    to={`/cifra/${item.cifra.slug}?playlist=${encodeURIComponent(playlist.slug)}&playlistId=${encodeURIComponent(playlist.id)}`}
                    className="playlist-track-title"
                  >
                    {item.cifra.title}
                  </Link>
                  <p className="muted">
                    {item.cifra.artist} · Tom {item.cifra.key}
                    {item.cifra.status !== 'PUBLISHED' ? ' · (rascunho)' : ''}
                  </p>
                </div>
                <div className="mine-actions">
                  <button
                    type="button"
                    className="btn btn-danger btn-compact"
                    onClick={() => void removeItem(item.id)}
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
