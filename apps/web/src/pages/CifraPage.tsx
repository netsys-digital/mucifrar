import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AddToPlaylistButton } from '../components/AddToPlaylistButton';
import { api, type Cifra, type Playlist } from '../lib/api';
import { cifraFromPlaylistHref } from '../lib/playlistNav';
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
  distributeAnnotatedColumns,
  splitCifraLine,
  transposeContent,
  transposeKey,
} from '../lib/transpose';

function ToolIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type CifraPart = ReturnType<typeof splitCifraLine>[number];

function renderCifraParts(parts: CifraPart[], keyPrefix: string) {
  return parts.map((part, partIdx) => {
    const key = `${keyPrefix}${partIdx}`;
    if (part.type === 'chord') {
      return (
        <span key={key} className="cifra-chord">
          {part.value}
        </span>
      );
    }
    if (part.type === 'section') {
      return (
        <span key={key} className="cifra-section">
          {part.value}
        </span>
      );
    }
    return <Fragment key={key}>{part.value}</Fragment>;
  });
}

function renderBlockLines(block: string[], highlights?: boolean[]) {
  return block.map((line, lineIdx) => {
    const parts = splitCifraLine(line);
    const first = parts.findIndex((p) => p.type === 'chord');
    let last = -1;
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      if (parts[i]!.type === 'chord') {
        last = i;
        break;
      }
    }
    const marked = Boolean(highlights?.[lineIdx]) && first >= 0;

    return (
      <Fragment key={lineIdx}>
        {lineIdx > 0 ? '\n' : null}
        <span className="cifra-line">
          {marked ? (
            <>
              {renderCifraParts(parts.slice(0, first), 'a')}
              <span className="cifra-intro-echo">
                {renderCifraParts(parts.slice(first, last + 1), 'b')}
              </span>
              {renderCifraParts(parts.slice(last + 1), 'c')}
            </>
          ) : (
            renderCifraParts(parts, 'p')
          )}
        </span>
      </Fragment>
    );
  });
}

function CifraSheetBody({ content, columns }: { content: string; columns: number }) {
  const annotatedColumns = useMemo(
    () => distributeAnnotatedColumns(content, columns),
    [content, columns],
  );

  return (
    <>
      {annotatedColumns.map((col, colIdx) => {
        const blocks = splitCifraBlocks(col.lines.join('\n'));
        let lineCursor = 0;
        return (
          <div key={colIdx} className="cifra-sheet-col">
            {blocks.map((block, blockIdx) => {
              const blockFlags = col.introEcho.slice(lineCursor, lineCursor + block.length);
              lineCursor += block.length;
              return (
                <div key={blockIdx} className="cifra-block">
                  {renderBlockLines(block, blockFlags)}
                </div>
              );
            })}
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
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const playlistSlugParam = searchParams.get('playlist');
  const playlistIdParam = searchParams.get('playlistId');

  const initialView = useMemo(() => loadViewPrefs(), []);
  const [cifra, setCifra] = useState<Cifra | null>(null);
  const [playlistCtx, setPlaylistCtx] = useState<Playlist | null>(null);
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
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

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
    setMobileToolsOpen(false);
    setMobilePanelOpen(false);
  }, [slug]);

  useEffect(() => {
    if (!playlistSlugParam && !playlistIdParam) {
      setPlaylistCtx(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        let pl: Playlist | null = null;
        if (playlistIdParam && isAuthenticated) {
          try {
            pl = await api<Playlist>(`/api/playlists/${playlistIdParam}`);
          } catch {
            pl = null;
          }
        }
        if (!pl && playlistSlugParam) {
          pl = await api<Playlist>(
            `/api/publico/playlists/${encodeURIComponent(playlistSlugParam)}`,
          );
        }
        if (!cancelled) setPlaylistCtx(pl);
      } catch {
        if (!cancelled) setPlaylistCtx(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [playlistSlugParam, playlistIdParam, isAuthenticated]);

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
    if (playlistSlugParam) next.set('playlist', playlistSlugParam);
    else next.delete('playlist');
    if (playlistIdParam) next.set('playlistId', playlistIdParam);
    else next.delete('playlistId');
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    semitones,
    capo,
    cifra,
    versionLoaded,
    searchParams,
    setSearchParams,
    playlistSlugParam,
    playlistIdParam,
  ]);

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

    const target: HTMLElement =
      sheet.scrollHeight > sheet.clientHeight + 2
        ? sheet
        : ((document.scrollingElement as HTMLElement | null) ?? document.documentElement);

    // scrollTop é arredondado pelo navegador; frações por frame precisam ser acumuladas.
    let pos = target.scrollTop;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (Math.abs(target.scrollTop - pos) > 2) pos = target.scrollTop;
      pos += scrollSpeed * dt;
      target.scrollTop = pos;
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - 2) {
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

  const playlistNav = useMemo(() => {
    const items = (playlistCtx?.items ?? []).filter(
      (i) => i.cifra.status === 'PUBLISHED' || i.cifra.slug === slug,
    );
    if (items.length < 2) return null;
    const index = items.findIndex((i) => i.cifra.slug === slug);
    if (index < 0) return null;
    const prev = index > 0 ? items[index - 1] : null;
    const next = index < items.length - 1 ? items[index + 1] : null;
    const ctx = {
      playlistSlug: playlistSlugParam ?? playlistCtx?.slug ?? null,
      playlistId: playlistIdParam ?? playlistCtx?.id ?? null,
    };
    return {
      title: playlistCtx!.title,
      index,
      total: items.length,
      prevHref: prev ? cifraFromPlaylistHref(prev.cifra.slug, ctx) : null,
      nextHref: next ? cifraFromPlaylistHref(next.cifra.slug, ctx) : null,
      playlistHref: playlistCtx!.visibility === 'PUBLIC'
        ? `/playlist/${playlistCtx!.slug}`
        : `/minhas-playlists/${playlistCtx!.id}`,
    };
  }, [playlistCtx, slug, playlistSlugParam, playlistIdParam]);

  useEffect(() => {
    if (!playlistNav) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowLeft' && playlistNav?.prevHref) {
        e.preventDefault();
        navigate(playlistNav.prevHref);
      }
      if (e.key === 'ArrowRight' && playlistNav?.nextHref) {
        e.preventDefault();
        navigate(playlistNav.nextHref);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [playlistNav, navigate]);

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
    <article className={`page cifra-view${mobilePanelOpen ? ' cifra-view--panel-open' : ''}`}>
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
        {playlistNav ? (
          <nav className="playlist-cifra-nav print-hide" aria-label="Navegação da playlist">
            <Link to={playlistNav.playlistHref} className="playlist-cifra-nav-back">
              ← {playlistNav.title}
            </Link>
            <div className="playlist-cifra-nav-controls">
              {playlistNav.prevHref ? (
                <Link to={playlistNav.prevHref} className="btn btn-ghost btn-compact">
                  ← Anterior
                </Link>
              ) : (
                <span className="btn btn-ghost btn-compact" aria-disabled="true">
                  ← Anterior
                </span>
              )}
              <span className="playlist-cifra-nav-pos">
                {playlistNav.index + 1} / {playlistNav.total}
              </span>
              {playlistNav.nextHref ? (
                <Link to={playlistNav.nextHref} className="btn btn-ghost btn-compact">
                  Próxima →
                </Link>
              ) : (
                <span className="btn btn-ghost btn-compact" aria-disabled="true">
                  Próxima →
                </span>
              )}
            </div>
          </nav>
        ) : null}

        <div className="cifra-mobile-bar print-hide">
          <button
            type="button"
            className={`btn btn-ghost btn-compact btn-icon${mobilePanelOpen ? ' is-active' : ''}`}
            aria-expanded={mobilePanelOpen}
            aria-label={mobilePanelOpen ? 'Ocultar ajustes' : 'Mostrar ajustes'}
            title="Ajustes"
            onClick={() => setMobilePanelOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="15" cy="6" r="2.2" fill="var(--paper, #fff)" stroke="currentColor" strokeWidth="2" />
              <circle cx="9" cy="12" r="2.2" fill="var(--paper, #fff)" stroke="currentColor" strokeWidth="2" />
              <circle cx="17" cy="18" r="2.2" fill="var(--paper, #fff)" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
          <span className="cifra-mobile-bar-key">
            Tom <strong>{displayKey}</strong>
          </span>
          <button
            type="button"
            className={`btn btn-ghost btn-compact btn-icon${scrolling ? ' is-active' : ''}`}
            aria-label={scrolling ? 'Pausar scroll' : 'Iniciar scroll'}
            title={scrolling ? 'Pausar scroll' : 'Iniciar scroll'}
            onClick={() => setScrolling((v) => !v)}
          >
            {scrolling ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        <div
          className={`cifra-toolbar print-hide${mobileToolsOpen ? ' cifra-toolbar--more-open' : ''}`}
          role="toolbar"
          aria-label="Controles da cifra"
        >
          {fullscreen ? (
            <div className="cifra-toolbar-title">
              <strong>{cifra.title}</strong>
              <span className="muted">{cifra.artist}</span>
            </div>
          ) : null}

          <div className="cifra-toolbar-primary">
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
                <button
                  type="button"
                  className="btn btn-ghost btn-compact"
                  onClick={() => setSemitones(0)}
                >
                  Original
                </button>
              ) : null}
            </div>

            <div className="cifra-toolbar-group">
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                aria-label="Diminuir texto"
                title="Diminuir texto"
                onClick={() => bumpFont(-0.05)}
              >
                A−
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                aria-label="Aumentar texto"
                title="Aumentar texto"
                onClick={() => bumpFont(0.05)}
              >
                A+
              </button>
            </div>

            <div className="cifra-toolbar-group">
              <button
                type="button"
                className={`btn btn-ghost btn-compact btn-icon${fullscreen ? ' is-active' : ''}`}
                aria-pressed={fullscreen}
                aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                title={fullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
                onClick={toggleFullscreen}
              >
                {fullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>

            <div className="cifra-toolbar-group cifra-toolbar-scroll">
              <button
                type="button"
                className={`btn btn-ghost btn-compact${scrolling ? ' is-active' : ''}`}
                onClick={() => setScrolling((v) => !v)}
                title="Espaço: play/pause"
              >
                {scrolling ? 'Pausar' : 'Scroll'}
              </button>
              <span className="cifra-toolbar-label">Vel.</span>
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                aria-label="Diminuir velocidade do scroll"
                disabled={scrollSpeed <= 1}
                onClick={() => setScrollSpeed((s) => clampSpeed(s - 1))}
              >
                −
              </button>
              <span className="cifra-key-pill" title="Velocidade do scroll">
                {scrollSpeed}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-compact"
                aria-label="Aumentar velocidade do scroll"
                disabled={scrollSpeed >= 60}
                onClick={() => setScrollSpeed((s) => clampSpeed(s + 1))}
              >
                +
              </button>
            </div>

            <button
              type="button"
              className={`btn btn-ghost btn-compact cifra-toolbar-more-toggle${mobileToolsOpen ? ' is-active' : ''}`}
              aria-expanded={mobileToolsOpen}
              aria-controls="cifra-toolbar-more"
              onClick={() => setMobileToolsOpen((v) => !v)}
            >
              {mobileToolsOpen ? 'Menos' : 'Mais'}
            </button>
          </div>

          <div id="cifra-toolbar-more" className="cifra-toolbar-more">
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
                className={`btn btn-ghost btn-compact btn-icon${darkSheet ? ' is-active' : ''}`}
                aria-pressed={darkSheet}
                aria-label="Modo escuro"
                onClick={() => setDarkSheet((v) => !v)}
                title="Modo escuro da folha (D)"
              >
                <ToolIcon d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-compact btn-icon"
                aria-label="Imprimir"
                onClick={() => window.print()}
                title="Imprimir (P)"
              >
                <ToolIcon d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-compact btn-icon"
                aria-label="Compartilhar"
                title="Compartilhar link"
                onClick={() => void shareLink()}
              >
                <ToolIcon d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-compact btn-icon"
                aria-label="Salvar versão"
                title="Salvar minha versão"
                onClick={() => void saveMyVersion()}
              >
                <ToolIcon d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 3v5h7V3M8 21v-7h8v7" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-compact btn-icon"
                aria-label="Voltar ao topo"
                title="Voltar ao topo"
                onClick={() => {
                  if (sheetRef.current) sheetRef.current.scrollTop = 0;
                  setScrolling(false);
                }}
              >
                <ToolIcon d="M5 4h14M12 20V9M6 14l6-6 6 6" />
              </button>
            </div>

            <span className="cifra-shortcuts muted" title="Atalhos">
              +/− tom · [ ] zoom · 1–4 colunas · F tela cheia · D escuro · Espaço scroll · P imprimir
            </span>
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
