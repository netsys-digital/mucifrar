import { AppError } from '../../lib/errors.js';

const CIFRACLUB_HOSTS = new Set(['cifraclub.com.br', 'www.cifraclub.com.br']);

export type CifraClubImport = {
  title: string;
  artist: string;
  key: string;
  content: string;
  sourceUrl: string;
};

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)));
}

function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/\r\n?/g, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );
}

function normalizeContent(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstMatch(html: string, pattern: RegExp): string | null {
  const match = pattern.exec(html);
  return match?.[1]?.trim() ? decodeEntities(match[1].trim()) : null;
}

function extractPreBlocks(html: string): string[] {
  const blocks: string[] = [];
  const re = /<pre\b[^>]*>([\s\S]*?)<\/pre>/gi;
  for (const match of html.matchAll(re)) {
    const text = normalizeContent(stripTags(match[1] ?? ''));
    if (text.length > 20) blocks.push(text);
  }
  return blocks;
}

function pickBestContent(html: string): string | null {
  const preferred =
    /<pre\b[^>]*(?:js-tab-content|cifra|tab_content)[^>]*>([\s\S]*?)<\/pre>/i.exec(html);
  if (preferred?.[1]) {
    const text = normalizeContent(stripTags(preferred[1]));
    if (text.length > 20) return text;
  }

  const blocks = extractPreBlocks(html);
  if (blocks.length === 0) return null;

  if (blocks.length > 1) {
    const joined = normalizeContent(blocks.join('\n\n'));
    const longest = blocks.reduce((a, b) => (a.length >= b.length ? a : b));
    if (joined.length > longest.length) return joined;
  }

  return blocks.reduce((a, b) => (a.length >= b.length ? a : b));
}

function stripEmbeddedAssets(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '');
}

function extractKey(html: string): string {
  const chordTone = firstMatch(
    html,
    /data-anchor=["']--chord-tone["'][^>]*>\s*([A-G](?:#|b)?(?:m|maj|min)?)\s*</i,
  );
  if (chordTone) return chordTone;

  const cleaned = stripEmbeddedAssets(html);
  const labeledTom = firstMatch(
    cleaned,
    /\bTom\s*[:：]\s*([A-G](?:#|b)?(?:m|maj|min)?(?:\/[A-G](?:#|b)?)?)/i,
  );
  if (labeledTom) return labeledTom;

  const legacyTom = firstMatch(cleaned, /id=["']cifra_tom["'][^>]*>([^<]+)/i);
  if (legacyTom) return legacyTom;

  return 'C';
}

function parseMeta(html: string, pageUrl: URL): { title: string; artist: string; key: string } {
  const pageTitle =
    firstMatch(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
    firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i)?.replace(/\s+/g, ' ') ??
    '';

  let title = '';
  let artist = '';

  if (pageTitle) {
    const parts = pageTitle
      .split(' - ')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !/^cifra club$/i.test(p));
    if (parts.length >= 2) {
      title = parts[0]!;
      artist = parts.slice(1).join(' - ');
    } else if (parts.length === 1) {
      title = parts[0]!;
    }
  }

  const h1 = firstMatch(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1 && (!title || title.length < 2)) {
    title = normalizeContent(stripTags(h1));
  }

  const pathParts = pageUrl.pathname.split('/').filter(Boolean);
  if (!artist && pathParts[0]) {
    artist = pathParts[0].replace(/-/g, ' ');
  }
  if (!title && pathParts[1]) {
    title = pathParts[1].replace(/-/g, ' ');
  }

  return {
    title: title || 'Cifra importada',
    artist: artist || 'Desconhecido',
    key: extractKey(html).slice(0, 12),
  };
}

export function normalizeCifraClubUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new AppError(400, 'URL inválida');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError(400, 'URL inválida');
  }

  const host = parsed.hostname.toLowerCase();
  if (!CIFRACLUB_HOSTS.has(host)) {
    throw new AppError(400, 'A URL precisa ser do site cifraclub.com.br');
  }

  parsed.hostname = 'www.cifraclub.com.br';
  parsed.hash = '';

  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new AppError(400, 'Informe o link da cifra (artista/música)');
  }

  // Remove segmentos de impressão / variantes no fim do path
  while (parts.length > 2 && /^(imprimir\.html|imprimir)$/i.test(parts[parts.length - 1]!)) {
    parts.pop();
  }

  parsed.pathname = `/${parts[0]}/${parts[1]}/`;
  return parsed;
}

function toPrintUrl(songUrl: URL): URL {
  const print = new URL(songUrl.href);
  print.search = '';
  print.pathname = `${songUrl.pathname.replace(/\/?$/, '/')}imprimir.html`;
  return print;
}

const CIFRACLUB_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 20_000;
const FETCH_MAX_ATTEMPTS = 3;

/** Statuses comuns de bloqueio / instabilidade do edge do Cifra Club */
const RETRYABLE_HTTP = new Set([403, 408, 429, 500, 502, 503, 504]);

function fetchBackoffMs(attempt: number): number {
  return 400 * 2 ** attempt;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

class CifraClubUpstreamError extends Error {
  constructor(public upstreamStatus: number | null) {
    super(
      upstreamStatus != null
        ? `Cifra Club respondeu com status ${upstreamStatus}`
        : 'Não foi possível acessar o Cifra Club',
    );
    this.name = 'CifraClubUpstreamError';
  }
}

function toFetchAppError(err: unknown): AppError {
  if (err instanceof CifraClubUpstreamError) {
    if (err.upstreamStatus === 403 || err.upstreamStatus === 429) {
      return new AppError(
        502,
        'O Cifra Club bloqueou o acesso a partir deste servidor. Cole a cifra manualmente no formulário abaixo.',
      );
    }
    return new AppError(502, err.message);
  }
  if (err instanceof Error && err.name === 'AbortError') {
    return new AppError(504, 'Tempo esgotado ao buscar a cifra no Cifra Club');
  }
  return new AppError(502, 'Não foi possível acessar o Cifra Club');
}

function isRetryableFetchError(err: unknown): boolean {
  if (err instanceof CifraClubUpstreamError) {
    return err.upstreamStatus != null && RETRYABLE_HTTP.has(err.upstreamStatus);
  }
  return err instanceof Error && err.name === 'AbortError';
}

async function fetchHtmlOnce(url: URL, referer: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url.href, {
      signal: controller.signal,
      headers: {
        'User-Agent': CIFRACLUB_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Referer: referer,
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new CifraClubUpstreamError(res.status);
    }

    return await res.text();
  } catch (err) {
    if (err instanceof CifraClubUpstreamError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw err;
    }
    throw new CifraClubUpstreamError(null);
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeChallengePage(html: string): boolean {
  const sample = html.slice(0, 4000).toLowerCase();
  return (
    sample.includes('cf-browser-verification') ||
    sample.includes('just a moment') ||
    sample.includes('attention required') ||
    sample.includes('cf-challenge') ||
    sample.includes('enable javascript and cookies')
  );
}

/**
 * Busca HTML e tenta extrair a cifra. Em 200 "vazio" / challenge, retenta a mesma URL
 * (o Cifra Club às vezes devolve shell sem <pre> ou página de proteção).
 */
async function fetchCifraContent(
  url: URL,
  referer: string,
): Promise<{ html: string; content: string } | null> {
  let lastHtml = '';

  for (let attempt = 0; attempt < FETCH_MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(fetchBackoffMs(attempt - 1));
    }

    let html: string;
    try {
      html = await fetchHtmlOnce(url, referer);
    } catch (err) {
      if (!isRetryableFetchError(err) || attempt === FETCH_MAX_ATTEMPTS - 1) {
        throw toFetchAppError(err);
      }
      continue;
    }

    lastHtml = html;
    if (looksLikeChallengePage(html)) {
      continue;
    }

    const content = pickBestContent(html);
    if (content) {
      return { html, content };
    }
  }

  return lastHtml ? { html: lastHtml, content: '' } : null;
}

export async function importFromCifraClub(rawUrl: string): Promise<CifraClubImport> {
  const songUrl = normalizeCifraClubUrl(rawUrl);
  // Página de impressão tem <pre> estático; a principal costuma ser híbrida/anti-bot.
  const songPage = new URL(songUrl.href);
  songPage.search = '';
  const candidates = [toPrintUrl(songUrl), songPage];
  const referer = 'https://www.cifraclub.com.br/';

  let lastHtml = '';
  const fetchErrors: string[] = [];

  for (const candidate of candidates) {
    let result: { html: string; content: string } | null;
    try {
      result = await fetchCifraContent(candidate, referer);
    } catch (err) {
      if (err instanceof AppError) {
        fetchErrors.push(`${candidate.pathname}: ${err.message}`);
      }
      continue;
    }

    if (!result) continue;
    lastHtml = result.html;
    if (!result.content) continue;

    const meta = parseMeta(result.html, songUrl);
    return {
      ...meta,
      content: result.content,
      sourceUrl: songUrl.href,
    };
  }

  if (!lastHtml && fetchErrors.length > 0) {
    const blocked = fetchErrors.some((m) => /status 403|status 429|bloqueou/i.test(m));
    throw new AppError(
      502,
      blocked
        ? 'O Cifra Club bloqueou o acesso a partir deste servidor. Cole a cifra manualmente no formulário abaixo.'
        : 'Não foi possível acessar o Cifra Club agora. Tente novamente ou cole a cifra manualmente.',
    );
  }

  if (lastHtml) {
    const meta = parseMeta(lastHtml, songUrl);
    throw new AppError(
      422,
      `Não encontramos o texto da cifra em "${meta.title}". Confira se o link é de uma cifra (não lista/artista).`,
    );
  }

  throw new AppError(422, 'Não foi possível extrair a cifra desta URL');
}
