import type { FormEvent } from 'react';

export type SearchTarget = 'interna' | 'cifraclub' | 'cifrasbr';

const OPTIONS: { value: SearchTarget; label: string }[] = [
  { value: 'interna', label: 'Interna' },
  { value: 'cifraclub', label: 'Cifra Club' },
  { value: 'cifrasbr', label: 'Cifras BR' },
];

export function resolveSearch(
  target: SearchTarget,
  query: string,
): { kind: 'internal'; q: string } | { kind: 'external'; url: string } {
  const trimmed = query.trim();
  if (target === 'cifraclub') {
    return {
      kind: 'external',
      url: trimmed
        ? `https://www.cifraclub.com.br/?q=${encodeURIComponent(trimmed)}`
        : 'https://www.cifraclub.com.br/',
    };
  }
  if (target === 'cifrasbr') {
    return {
      kind: 'external',
      url: trimmed
        ? `https://www.cifras.com.br/busca?q=${encodeURIComponent(trimmed)}`
        : 'https://www.cifras.com.br/',
    };
  }
  return { kind: 'internal', q: trimmed };
}

type Props = {
  id: string;
  className?: string;
  query: string;
  onQueryChange: (value: string) => void;
  target: SearchTarget;
  onTargetChange: (value: SearchTarget) => void;
  onSubmit: (event: FormEvent) => void;
};

export function SearchDestinationField({
  id,
  className,
  query,
  onQueryChange,
  target,
  onTargetChange,
  onSubmit,
}: Props) {
  return (
    <form className={className} onSubmit={onSubmit} role="search">
      <div className="search-destination">
        <label className="sr-only" htmlFor={`${id}-where`}>
          Onde buscar
        </label>
        <select
          id={`${id}-where`}
          value={target}
          onChange={(e) => onTargetChange(e.target.value as SearchTarget)}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={id}>
          Nome da música ou artista
        </label>
        <input
          id={id}
          type="search"
          placeholder="Nome da música ou artista"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="search-destination-go" aria-label="Buscar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
            <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </form>
  );
}
