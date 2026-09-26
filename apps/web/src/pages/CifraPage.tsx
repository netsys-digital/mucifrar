import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AddToPlaylistButton } from '../components/AddToPlaylistButton';
import { api, type Cifra } from '../lib/api';
import {
  clampColumns,
  clampFontScale,
  clampSpeed,
  loadVersionPrefs,
  loadViewPrefs,
  saveVersionPrefs,
  saveViewPrefs,
  type ColumnCount,
} from '../lib/cifraPrefs';
import {
  formatTransposeLabel,
  listUniqueChords,
  normalizeSemitones,
  semitonesBetweenKeys,
  splitCifraBlocks,
  distributeLinesToColumns,
  splitCifraLine,
  transposeContent,
  transposeKey,
} from '../lib/transpose';

function renderBlockLines(block: string[]) {
  return block.map((line, lineIdx) => (
    <Fragment key={lineIdx}>
      {lineIdx > 0 ? '\n' : null}
      {splitCifraLine(line).map((part, partIdx) => {
        if (part.type === 'chord') {
          return (
            <span key={partIdx} className="cifra-chord">
              {part.value}
            </span>
          );
        }
        if (part.type === 'section') {
          return (
            <span key={partIdx} className="cifra-section">
              {part.value}
            </span>
          );
        }
        return <Fragment key={partIdx}>{part.value}</Fragment>;
      })}
    </Fragment>
  ));
}

function CifraSheetBody({ content, columns }: { content: string; columns: number }) {
  const columnLines = useMemo(
    () => distributeLinesToColumns(content, columns),
    [content, columns],
  );

  return (
    <>
      {columnLines.map((lines, colIdx) => {
        const blocks = splitCifraBlocks(lines.join('\n'));
        return (
          <div key={colIdx} className="cifra-sheet-col">
            {blocks.map((block, blockIdx) => (
              <div key={blockIdx} className="cifra-block">
                {renderBlockLines(block)}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

function parseTomParam(raw: string | null, originalKey: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^[+-]?\d+$/.test(trimmed)) return normalizeSemitones(Number(trimmed));
  const delta = semitonesBetweenKeys(originalKey, trimmed);
  return delta;
}

export function CifraPage() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const initialView = useMemo(() => loadViewPrefs(), []);
  const [cifra, setCifra] = useState<Cifra | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [columnCount, setColumnCount] = useState<ColumnCount>(initialView.columnCount);
  const [semitones, setSemitones] = useState(0);
  const [capo, setCapo] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [fontScale, setFontScale] = useState(initialView.fontScale);
  const [darkSheet, setDarkSheet] = useState(initialView.darkSheet);
  const [scrollSpeed, setScrollSpeed] = useState(initialView.scrollSpeed);
  const [scrolling, setScrolling] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [versionLoaded, setVersionLoaded] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollRaf = useRef<number | null>(null);

  const maxColumns: ColumnCount = fullscreen ? 4 : 2;
  const columnOptions = (fullscreen ? [1, 2, 3, 4] : [1, 2]) as ColumnCount[];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFullscreen(false);
    setScrolling(false);
    setVersionLoaded(false);
    setShareNote(null);
    setSaveNote(null);

    void api<Cifra>(`/api/publico/cifras/${encodeURIComponent(slug)}`)
      .then(async (res) => {
        if (cancelled) return;
        setCifra(res);

        const tomQ = parseTomParam(searchParams.get('tom') ?? searchParams.get('key'), res.key);
        const capoQ = searchParams.get('capo');
        let nextSemis = tomQ ?? 0;
        let nextCapo = capoQ != null && /^\d+$/.test(capoQ) ? Math.min(12, Number(capoQ)) : 0;

        if (tomQ == null && capoQ == null) {
          let saved = loadVersionPrefs(slug, user?.id);
          if (isAuthenticated) {
            try {
              const remote = await api<{ preference: { semitones: number; capo: number } | null }>(
                `/api/cifras/preferencia/${encodeURIComponent(slug)}`,
              );
              if (remote.preference) saved = remote.preference;
            } catch {
              /* sem preferência remota */
            }
          }
          if (saved) {
            nextSemis = normalizeSemitones(saved.semitones);
            nextCapo = Math.min(12, Math.max(0, saved.capo));
          }
        }

        if (!cancelled) {
          setSemitones(nextSemis);
          setCapo(nextCapo);
          setVersionLoaded(true);
        }
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
    // URL params lidos só no load da cifra
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuthenticated, user?.id]);

  useEffect(() => {
    if (columnCount > maxColumns) setColumnCount(maxColumns);
  }, [columnCount, maxColumns]);

  useEffect(() => {
    saveViewPrefs({ fontScale, columnCount, darkSheet, scrollSpeed });
  }, [fontScale, columnCount, darkSheet, scrollSpeed]);

  useEffect(() => {
    if (!cifra || !versionLoaded) return;
    const next = new URLSearchParams(searchParams);
    if (semitones !== 0) next.set('tom', formatTransposeLabel(semitones));
    else next.delete('tom');
    next.delete('key');
    if (capo > 0) next.set('capo', String(capo));
    else next.delete('capo');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [semitones, capo, cifra, versionLoaded, searchParams, setSearchParams]);

  const exitFullscreen = useCallback(() => {
    setFullscreen(false);
    setColumnCount((c) => (c > 2 ? 2 : c) as ColumnCount);
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const enterFullscreen = useCallback(() => {
    setFullscreen(true);
    const el = stageRef.current;
    if (el?.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (fullscreen) exitFullscreen();
    else enterFullscreen();
  }, [fullscreen, enterFullscreen, exitFullscreen]);

  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) {
        setFullscreen(false);
        setColumnCount((c) => (c > 2 ? 2 : c) as ColumnCount);
      }
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('cifra-fs-active', fullscreen);
    return () => document.documentElement.classList.remove('cifra-fs-active');
  }, [fullscreen]);

  useEffect(() => {
    document.documentElement.classList.toggle('cifra-dark-sheet', darkSheet);
    return () => document.documentElement.classList.remove('cifra-dark-sheet');
  }, [darkSheet]);

  useEffect(() => {
    if (!scrolling) {
      if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current);
      scrollRaf.current = null;
      return;
    }

    const sheet = sheetRef.current;
    if (!sheet) return;

    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const el = sheetRef.current;
      if (!el) return;
      el.scrollTop += scrollSpeed * dt;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
        setScrolling(false);
        return;
      }
      scrollRaf.current = requestAnimationFrame(tick);
    };
    scrollRaf.current = requestAnimationFrame(tick);
    return () => {
      if (scrollRaf.current != null) cancelAnimationFrame(scrollRaf.current);
    };
  }, [scrolling, scrollSpeed]);

  const bumpFont = useCallback((delta: number) => {
    setFontScale((s) => clampFontScale(s + delta));
  }, []);

  const shareLink = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareNote('Link copiado!');
    } catch {
      setShareNote(url);
    }
    window.setTimeout(() => setShareNote(null), 2500);
  }, []);

  const saveMyVersion = useCallback(async () => {
    if (!cifra) return;
    const payload = { semitones, capo };
    saveVersionPrefs(slug, payload, user?.id);
    if (isAuthenticated) {
      try {
        await api(`/api/cifras/preferencia/${encodeURIComponent(slug)}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setSaveNote('Versão salva na sua conta');
      } catch {
        setSaveNote('Versão salva neste aparelho');
      }
    } else {
      setSaveNote('Versão salva neste aparelho (entre para sincronizar)');
    }
    window.setTimeout(() => setSaveNote(null), 2500);
  }, [cifra, semitones, capo, slug, user?.id, isAuthenticated]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'Escape' && fullscreen) {
        e.preventDefault();
        exitFullscreen();
        return;
      }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setScrolling((v) => !v);
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setSemitones((s) => normalizeSemitones(s + 1));
        return;
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setSemitones((s) => normalizeSemitones(s - 1));
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        bumpFont(-0.05);
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        bumpFont(0.05);
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setDarkSheet((v) => !v);
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        window.print();
        return;
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        const n = Number(e.key) as ColumnCount;
        if (n <= maxColumns) {
          e.preventDefault();
          setColumnCount(n);
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen, exitFullscreen, toggleFullscreen, bumpFont, maxColumns]);

  const displayKey = useMemo(
    () => (cifra ? transposeKey(cifra.key, semitones) : ''),
    [cifra, semitones],
  );

  const soundingKey = useMemo(
    () => (displayKey ? transposeKey(displayKey, capo) : ''),
    [displayKey, capo],
  );

  const displayContent = useMemo(
    () => (cifra ? transposeContent(cifra.content, semitones, cifra.key) : ''),
    [cifra, semitones],
  );

  const uniqueChords = useMemo(() => listUniqueChords(displayContent), [displayContent]);

  if (loading) {
    return (
      <div className="page cifra-view">
        <div className="cifra-skeleton" aria-busy="true" aria-label="Carregando cifra">
          <div className="cifra-skeleton-line w-40" />
          <div className="cifra-skeleton-line w-70" />
          <div className="cifra-skeleton-line w-55" />
          <div className="cifra-skeleton-sheet">
            <div className="cifra-skeleton-line" />
            <div className="cifra-skeleton-line w-80" />
            <div className="cifra-skeleton-line w-60" />
            <div className="cifra-skeleton-line" />
            <div className="cifra-skeleton-line w-75" />
            <div className="cifra-skeleton-line w-50" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !cifra) {
    return (
      <div className="page">
        <p className="error-text">{error ?? 'Cifra não encontrada'}</p>
        <Link to="/" className="btn btn-ghost">
          Voltar
        </Link>
      </div>
    );
  }

  const stageClass = [
    'cifra-stage',
    fullscreen ? 'cifra-stage--fullscreen' : '',
    darkSheet ? 'cifra-stage--dark' : '',
    columnCount > 1 ? `cifra-stage--cols-${columnCount}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const fontSize = `${(0.98 * fontScale).toFixed(3)}rem`;

  return (
    <article className="page cifra-view">
      {!fullscreen ? (
        <header className="cifra-view-head">
          <div>
            <p className="eyebrow">{cifra.artist}</p>
            <h1>{cifra.title}</h1>
            <p className="muted">
              Tom original <strong>{cifra.key}</strong>
              {cifra.authorName ? ` · por ${cifra.authorName}` : ''}
              {` · ${cifra.views} visualizações`}
            </p>
          </div>
          <div className="cifra-view-actions print-hide">
            <AddToPlaylistButton cifraId={cifra.id} />
            <Link to="/" className="btn btn-ghost">
              ← Explorar
            </Link>
          </div>
        </header>
      ) : null}

      <div className="cifra-print-meta" hidden>
        <h1>
          {cifra.title} — {cifra.artist}
        </h1>
        <p>
          Tom {displayKey}
          {capo > 0 ? ` · Capo ${capo} (soa ${soundingKey})` : ''}
        </p>
      </div>

      <div ref={stageRef} className={stageClass}>
        <div className="cifra-toolbar print-hide" role="toolbar" aria-label="Controles da cifra">
          {fullscreen ? (
            <div className="cifra-toolbar-title">
              <strong>{cifra.title}</strong>
              <span className="muted">{cifra.artist}</span>
            </div>
          ) : null}

          <div className="cifra-toolbar-group">
            <span className="cifra-toolbar-label">Tom</span>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              aria-label="Diminuir meio tom"
              onClick={() => setSemitones((s) => normalizeSemitones(s - 1))}
            >
              −
            </button>
            <span className="cifra-key-pill" title={`Deslocamento ${formatTransposeLabel(semitones)}`}>
              {displayKey}
              {semitones !== 0 ? <small>{formatTransposeLabel(semitones)}</small> : null}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              aria-label="Aumentar meio tom"
              onClick={() => setSemitones((s) => normalizeSemitones(s + 1))}
            >
              +
            </button>
            {semitones !== 0 ? (
              <button type="button" className="btn btn-ghost btn-compact" onClick={() => setSemitones(0)}>
                Original
              </button>
            ) : null}
          </div>

          <div className="cifra-toolbar-group">
            <span className="cifra-toolbar-label">Capo</span>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              aria-label="Diminuir capo"
              disabled={capo <= 0}
              onClick={() => setCapo((c) => Math.max(0, c - 1))}
            >
              −
            </button>
            <span className="cifra-key-pill" title={capo > 0 ? `Soa ${soundingKey}` : 'Sem capo'}>
              {capo === 0 ? '0' : capo}
              {capo > 0 ? <small>soa {soundingKey}</small> : null}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-compact"
              aria-label="Aumentar capo"
              disabled={capo >= 12}
              onClick={() => setCapo((c) => Math.min(12, c + 1))}
            >
              +
            </button>
          </div>

          <div className="cifra-toolbar-group">
            <span className="cifra-toolbar-label">Texto</span>
            <button type="button" className="btn btn-ghost btn-compact" onClick={() => bumpFont(-0.05)}>
              A−
            </button>
            <button type="button" className="btn btn-ghost btn-compact" onClick={() => bumpFont(0.05)}>
              A+
            </button>
          </div>

          <div className="cifra-toolbar-group">
            <span className="cifra-toolbar-label">Colunas</span>
            <div className="cifra-col-picker" role="group" aria-label="Número de colunas">
              {columnOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn btn-ghost btn-compact${columnCount === n ? ' is-active' : ''}`}
                  aria-pressed={columnCount === n}
                  onClick={() => setColumnCount(clampColumns(n, maxColumns))}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="cifra-toolbar-group">
            <button
              type="button"
              className={`btn btn-ghost btn-compact${darkSheet ? ' is-active' : ''}`}
              aria-pressed={darkSheet}
              onClick={() => setDarkSheet((v) => !v)}
              title="Modo escuro da folha (D)"
            >
              Escuro
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-compact${fullscreen ? ' is-active' : ''}`}
              aria-pressed={fullscreen}
              onClick={toggleFullscreen}
              title="Tela cheia (F)"
            >
              {fullscreen ? 'Sair tela cheia' : 'Tela cheia'}
            </button>
            <button type="button" className="btn btn-ghost btn-compact" onClick={() => window.print()} title="Imprimir (P)">
              Imprimir
            </button>
            <button type="button" className="btn btn-ghost btn-compact" onClick={() => void shareLink()}>
              Compartilhar
            </button>
            <button type="button" className="btn btn-ghost btn-compact" onClick={() => void saveMyVersion()}>
              Salvar versão
            </button>
          </div>
        </div>

        {(shareNote || saveNote) && (
          <p className="ok-text print-hide">{shareNote ?? saveNote}</p>
        )}

        {uniqueChords.length > 0 ? (
          <div className="cifra-chord-list print-hide" aria-label="Acordes usados">
            {uniqueChords.map((chord) => (
              <span key={chord} className="cifra-chord-chip">
                {chord}
              </span>
            ))}
          </div>
        ) : null}

        <div className="cifra-scroll-bar print-hide">
          <button
            type="button"
            className={`btn btn-ghost btn-compact${scrolling ? ' is-active' : ''}`}
            onClick={() => setScrolling((v) => !v)}
            title="Espaço: play/pause"
          >
            {scrolling ? 'Pausar scroll' : 'Auto-scroll'}
          </button>
          <label className="cifra-speed">
            Velocidade
            <input
              type="range"
              min={8}
              max={140}
              value={scrollSpeed}
              onChange={(e) => setScrollSpeed(clampSpeed(Number(e.target.value)))}
            />
            <span>{scrollSpeed}</span>
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-compact"
            onClick={() => {
              if (sheetRef.current) sheetRef.current.scrollTop = 0;
              setScrolling(false);
            }}
          >
            Topo
          </button>
          <span className="cifra-shortcuts muted" title="Atalhos">
            +/− tom · [ ] zoom · 1–4 colunas · F tela cheia · D escuro · Espaço scroll · P imprimir
          </span>
        </div>

        <div
          ref={sheetRef}
          className={`cifra-sheet${columnCount > 1 ? ` cifra-sheet--grid-${columnCount}` : ''}`}
          style={{ fontSize }}
        >
          <CifraSheetBody content={displayContent} columns={columnCount} />
        </div>
      </div>
    </article>
  );
}
