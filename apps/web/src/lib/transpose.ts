/** Escala cromática — preferência de acidentes conforme o tom. */
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const ENHARMONIC: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'A#': 'Bb',
};

/** Token de acorde completo (raiz + qualidade + baixo opcional). */
const CHORD_TOKEN =
  /([A-G](?:#|b)?)((?:maj|min|dim|aug|sus|add|m|M|°|ø|\+)?\d*(?:\([^)]*\))?(?:(?:maj|min|dim|aug|sus|add)\d*)*)(\/[A-G](?:#|b)?)?/g;

function noteIndex(note: string): number {
  const n = note[0]!.toUpperCase() + note.slice(1);
  const sharpIdx = SHARPS.indexOf(n as (typeof SHARPS)[number]);
  if (sharpIdx >= 0) return sharpIdx;
  const flatIdx = FLATS.indexOf(n as (typeof FLATS)[number]);
  if (flatIdx >= 0) return flatIdx;
  const enh = ENHARMONIC[n];
  if (enh) {
    const i = SHARPS.indexOf(enh as (typeof SHARPS)[number]);
    if (i >= 0) return i;
    return FLATS.indexOf(enh as (typeof FLATS)[number]);
  }
  return -1;
}

function preferFlats(keyRoot: string): boolean {
  const flatsKeys = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm']);
  return flatsKeys.has(keyRoot) || keyRoot.includes('b');
}

function transposeNote(note: string, semitones: number, useFlats: boolean): string {
  const idx = noteIndex(note);
  if (idx < 0) return note;
  const next = (idx + semitones + 120) % 12;
  return useFlats ? FLATS[next]! : SHARPS[next]!;
}

export function normalizeSemitones(n: number): number {
  const m = ((n % 12) + 12) % 12;
  return m > 6 ? m - 12 : m;
}

export function transposeKey(key: string, semitones: number): string {
  const trimmed = key.trim();
  if (!trimmed || semitones === 0) return trimmed;

  const match = /^([A-G](?:#|b)?)(.*)$/.exec(trimmed);
  if (!match) return trimmed;

  const root = match[1]!;
  const rest = match[2] ?? '';
  const useFlats = preferFlats(trimmed) || preferFlats(root);
  return `${transposeNote(root, semitones, useFlats)}${rest}`;
}

function transposeChordToken(token: string, semitones: number, useFlats: boolean): string {
  CHORD_TOKEN.lastIndex = 0;
  const m = CHORD_TOKEN.exec(token);
  if (!m || m[0] !== token) return token;

  const root = m[1]!;
  const quality = m[2] ?? '';
  const bass = m[3]; // "/E"
  const newRoot = transposeNote(root, semitones, useFlats);
  const newBass = bass
    ? `/${transposeNote(bass.slice(1), semitones, useFlats)}`
    : '';
  return `${newRoot}${quality}${newBass}`;
}

function isChordHeavyLine(line: string): boolean {
  const withoutSections = line.replace(/\[[^\]]*]/g, '').trim();
  if (!withoutSections) return false;

  // Linhas só com espaços / pontuação leve não contam
  if (!/[A-Ga-z]/.test(withoutSections)) return false;

  let chordChars = 0;
  let otherLetters = 0;
  const re = new RegExp(CHORD_TOKEN.source, 'g');
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutSections)) !== null) {
    const between = withoutSections.slice(last, match.index);
    otherLetters += (between.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;
    chordChars += match[0].length;
    last = match.index + match[0].length;
  }
  const tail = withoutSections.slice(last);
  otherLetters += (tail.match(/[A-Za-zÀ-ÿ]/g) ?? []).length;

  if (chordChars === 0) return false;
  // Acordes dominam a linha (ou quase não sobram letras de letra)
  return otherLetters === 0 || chordChars >= otherLetters * 2;
}

export type CifraSegment = { type: 'text' | 'chord' | 'section'; value: string };

const SECTION_RE = /\[([^\]]+)\]/g;

/** Quebra uma linha em trechos de texto, seções e acordes. */
export function splitCifraLine(line: string): CifraSegment[] {
  const withSections: CifraSegment[] = [];
  let cursor = 0;
  SECTION_RE.lastIndex = 0;
  let sec: RegExpExecArray | null;
  while ((sec = SECTION_RE.exec(line)) !== null) {
    if (sec.index > cursor) {
      withSections.push({ type: 'text', value: line.slice(cursor, sec.index) });
    }
    withSections.push({ type: 'section', value: sec[0] });
    cursor = sec.index + sec[0].length;
  }
  if (cursor < line.length) {
    withSections.push({ type: 'text', value: line.slice(cursor) });
  }
  if (withSections.length === 0) withSections.push({ type: 'text', value: line });

  if (!isChordHeavyLine(line)) return withSections;

  const parts: CifraSegment[] = [];
  for (const segment of withSections) {
    if (segment.type !== 'text') {
      parts.push(segment);
      continue;
    }
    const re = new RegExp(CHORD_TOKEN.source, 'g');
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(segment.value)) !== null) {
      if (match.index > last) {
        parts.push({ type: 'text', value: segment.value.slice(last, match.index) });
      }
      parts.push({ type: 'chord', value: match[0] });
      last = match.index + match[0].length;
    }
    if (last < segment.value.length) {
      parts.push({ type: 'text', value: segment.value.slice(last) });
    }
  }
  return parts.length > 0 ? parts : [{ type: 'text', value: line }];
}

/** Agrupa linhas em blocos por seção (para break-inside nas colunas). */
export function splitCifraBlocks(content: string): string[][] {
  const lines = content.split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    const isSection = /^\s*\[[^\]]+\]/.test(line);
    if (isSection && current.length > 0) {
      blocks.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

/**
 * Divide o conteúdo em N colunas com base no número de linhas.
 * Cada coluna recebe floor(total/N) ou ceil(total/N) linhas (diferença no máximo 1).
 */
export function distributeLinesToColumns(content: string, columnCount: number): string[][] {
  const n = Math.max(1, Math.min(4, Math.floor(columnCount)));
  const lines = content.split('\n');
  if (n <= 1 || lines.length === 0) return [lines];

  const total = lines.length;
  const base = Math.floor(total / n);
  const remainder = total % n;
  const columns: string[][] = [];
  let offset = 0;

  for (let i = 0; i < n; i += 1) {
    const size = base + (i < remainder ? 1 : 0);
    if (size <= 0) continue;
    columns.push(lines.slice(offset, offset + size));
    offset += size;
  }

  return columns.length > 0 ? columns : [lines];
}

/** @deprecated Preferir distributeLinesToColumns — mantido para compatibilidade. */
export function distributeBlocksToColumns(blocks: string[][], columnCount: number): string[][][] {
  const flat = blocks.flatMap((block, idx) =>
    idx === 0 ? block : ['', ...block],
  );
  const content = flat.join('\n');
  return distributeLinesToColumns(content, columnCount).map((lines) => splitCifraBlocks(lines.join('\n')));
}

export function listUniqueChords(content: string): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const line of content.split('\n')) {
    if (!isChordHeavyLine(line)) continue;
    const re = new RegExp(CHORD_TOKEN.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      const chord = match[0];
      if (!seen.has(chord)) {
        seen.add(chord);
        order.push(chord);
      }
    }
  }
  return order;
}

export function rootOfKey(key: string): string | null {
  const match = /^([A-G](?:#|b)?)/.exec(key.trim());
  return match?.[1] ?? null;
}

export function semitonesBetweenKeys(fromKey: string, toKey: string): number | null {
  const a = rootOfKey(fromKey);
  const b = rootOfKey(toKey);
  if (!a || !b) return null;
  const ia = noteIndex(a);
  const ib = noteIndex(b);
  if (ia < 0 || ib < 0) return null;
  return normalizeSemitones(ib - ia);
}

export function transposeContent(content: string, semitones: number, originalKey = 'C'): string {
  if (!semitones) return content;
  const useFlats = preferFlats(originalKey) || preferFlats(transposeKey(originalKey, semitones));

  return content
    .split('\n')
    .map((line) => {
      if (!isChordHeavyLine(line)) return line;
      return line.replace(new RegExp(CHORD_TOKEN.source, 'g'), (token) =>
        transposeChordToken(token, semitones, useFlats),
      );
    })
    .join('\n');
}

export function formatTransposeLabel(semitones: number): string {
  const n = normalizeSemitones(semitones);
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `${n}`;
}
