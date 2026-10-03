import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, type Cifra } from '../lib/api';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function MyCifrasPage() {
  const [items, setItems] = useState<Cifra[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get('q') ?? '';

  function setQuery(value: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ items: Cifra[] }>('/api/cifras/minhas');
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

  async function remove(id: string) {
    if (!confirm('Excluir esta cifra?')) return;
    await api(`/api/cifras/${id}`, { method: 'DELETE' });
    await load();
  }

  const filtered = useMemo(() => {
    const terms = normalize(q).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return items;
    return items.filter((c) => {
      const haystack = normalize(`${c.title} ${c.artist}`);
      return terms.every((t) => haystack.includes(t));
    });
  }, [items, q]);

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>Minhas cifras</h1>
          <p className="muted">Rascunhos e publicações que você enviou.</p>
        </div>
        <Link to="/enviar" className="btn btn-primary">
          Nova cifra
        </Link>
      </div>

      {items.length > 0 ? (
        <div className="search-bar mine-search">
          <label className="sr-only" htmlFor="mine-q">
            Buscar nas minhas cifras
          </label>
          <input
            id="mine-q"
            type="search"
            placeholder="Buscar por título ou artista…"
            value={q}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      ) : null}

      {loading ? <p className="muted">Carregando…</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <div className="empty-state">
          <p>Você ainda não enviou nenhuma cifra.</p>
          <Link to="/enviar" className="btn btn-primary">
            Enviar cifra
          </Link>
        </div>
      ) : null}

      {!loading && items.length > 0 && filtered.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma cifra encontrada para “{q}”.</p>
          <button type="button" className="btn btn-ghost" onClick={() => setQuery('')}>
            Limpar busca
          </button>
        </div>
      ) : null}

      <div className="mine-list">
        {filtered.map((cifra) => (
          <article key={cifra.id} className="mine-row">
            <div>
              <h3>{cifra.title}</h3>
              <p className="muted">
                {cifra.artist} · Tom {cifra.key} ·{' '}
                <span className={cifra.status === 'PUBLISHED' ? 'badge-ok' : 'badge-draft'}>
                  {cifra.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
                </span>
              </p>
            </div>
            <div className="mine-actions">
              {cifra.status === 'PUBLISHED' ? (
                <Link to={`/cifra/${cifra.slug}`} className="btn btn-ghost">
                  Ver
                </Link>
              ) : null}
              <Link to={`/editar/${cifra.id}`} className="btn btn-ghost">
                Editar
              </Link>
              <button type="button" className="btn btn-danger" onClick={() => void remove(cifra.id)}>
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
