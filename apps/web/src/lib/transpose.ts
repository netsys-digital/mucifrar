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

function isSectionLine(line: string): boolean {
  return /^\s*\[[^\]]+\]/.test(line);
}

function chordsInLine(line: string): string[] {
  if (!isChordHeavyLine(line)) return [];
  const re = new RegExp(CHORD_TOKEN.source, 'g');
  const chords: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(line)) !== null) {
    chords.push(match[0]);
  }
  return chords;
}

/**
 * Agrupa linha de acordes + letra seguinte (evita partir o par entre colunas).
 */
export function groupCifraLineUnits(lines: string[]): string[][] {
  const units: string[][] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const next = lines[i + 1];
    if (
      next != null &&
      isChordHeavyLine(line) &&
      !isChordHeavyLine(next) &&
      !isSectionLine(next)
    ) {
      units.push([line, next]);
      i += 2;
    } else {
      units.push([line]);
      i += 1;
    }
  }
  return units;
}

/**
 * Divide o conteúdo em N colunas respeitando pares acorde+letra.
 * Retorna também flags de eco da intro alinhadas a cada linha.
 */
export function distributeAnnotatedColumns(
  content: string,
  columnCount: number,
): { lines: string[]; introEcho: boolean[] }[] {
  const n = Math.max(1, Math.min(4, Math.floor(columnCount)));
  const lines = content.split('\n');
  const flags = markIntroEchoLines(content);
  const annotated = lines.map((text, i) => ({ text, introEcho: flags[i] ?? false }));

  if (n <= 1 || annotated.length === 0) {
    return [{ lines, introEcho: flags }];
  }

  const units: { text: string; introEcho: boolean }[][] = [];
  let i = 0;
  while (i < annotated.length) {
    const cur = annotated[i]!;
    const next = annotated[i + 1];
    if (
      next &&
      isChordHeavyLine(cur.text) &&
      !isChordHeavyLine(next.text) &&
      !isSectionLine(next.text)
    ) {
      units.push([cur, next]);
      i += 2;
    } else {
      units.push([cur]);
      i += 1;
    }
  }

  const total = units.length;
  const base = Math.floor(total / n);
  const remainder = total % n;
  const columns: { lines: string[]; introEcho: boolean[] }[] = [];
  let offset = 0;

  for (let c = 0; c < n; c += 1) {
    const size = base + (c < remainder ? 1 : 0);
    if (size <= 0) continue;
    const flat = units.slice(offset, offset + size).flat();
    columns.push({
      lines: flat.map((row) => row.text),
      introEcho: flat.map((row) => row.introEcho),
    });
    offset += size;
  }

  return columns.length > 0 ? columns : [{ lines, introEcho: flags }];
}

/**
 * Divide o conteúdo em N colunas respeitando pares acorde+letra.
 */
export function distributeLinesToColumns(content: string, columnCount: number): string[][] {
  return distributeAnnotatedColumns(content, columnCount).map((col) => col.lines);
}

const INTRO_SECTION_RE = /^\s*\[\s*intro[^\]]*\]/i;

function findIntroBlockRange(lines: string[]): { start: number; end: number } | null {
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (INTRO_SECTION_RE.test(lines[i]!)) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (isSectionLine(lines[i]!) && !INTRO_SECTION_RE.test(lines[i]!)) {
      end = i;
      break;
    }
  }
  return { start, end };
}

function extractIntroChordSequence(lines: string[], start: number, end: number): string[] {
  const seq: string[] = [];
  for (let i = start; i < end; i += 1) {
    seq.push(...chordsInLine(lines[i]!));
  }
  return seq;
}

function sequencesEqual(a: string[], b: string[]): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  return a.every((c, i) => c === b[i]);
}

/**
 * Marca linhas (fora do bloco [Intro]) cuja sequência de acordes
 * repete a introdução — referência visual ao voltar o tema.
 */
export function markIntroEchoLines(content: string): boolean[] {
  const lines = content.split('\n');
  const flags = lines.map(() => false);
  const range = findIntroBlockRange(lines);
  if (!range) return flags;

  const introSeq = extractIntroChordSequence(lines, range.start, range.end);
  if (introSeq.length < 2) return flags;

  type ChordLine = { idx: number; chords: string[] };
  const chordLines: ChordLine[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (i >= range.start && i < range.end) continue;
    if (!isChordHeavyLine(lines[i]!)) continue;
    const chords = chordsInLine(lines[i]!);
    if (chords.length === 0) continue;
    chordLines.push({ idx: i, chords });
  }

  for (let start = 0; start < chordLines.length; start += 1) {
    const acc: string[] = [];
    for (let end = start; end < chordLines.length; end += 1) {
      acc.push(...chordLines[end]!.chords);
      if (acc.length > introSeq.length) break;
      if (acc.length === introSeq.length && sequencesEqual(acc, introSeq)) {
        for (let k = start; k <= end; k += 1) {
          const li = chordLines[k]!.idx;
          flags[li] = true;
          const lyric = li + 1;
          if (
            lyric < lines.length &&
            !isChordHeavyLine(lines[lyric]!) &&
            !isSectionLine(lines[lyric]!)
          ) {
            flags[lyric] = true;
          }
        }
        break;
      }
    }
  }

  return flags;
}

/** @deprecated Preferir distributeLinesToColumns — mantido para compatibilidade. */
export function distributeBlocksToColumns(blocks: string[][], columnCount: number): string[][][] {
  const flat = blocks.flatMap((block, idx) =>
    idx === 0 ? block : ['', ...block],
  );
  const content = flat.join('\n');
  return distributeLinesToColumns(content, columnCount).map((col) => splitCifraBlocks(col.join('\n')));
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
