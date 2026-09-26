export type ColumnCount = 1 | 2 | 3 | 4;

export type CifraViewPrefs = {
  fontScale: number;
  columnCount: ColumnCount;
  darkSheet: boolean;
  scrollSpeed: number;
};

export type CifraVersionPrefs = {
  semitones: number;
  capo: number;
};

const GLOBAL_KEY = 'mucifrar_cifra_view_prefs';
const versionKey = (slug: string, userId?: string | null) =>
  `mucifrar_cifra_version:${userId ?? 'anon'}:${slug}`;

const DEFAULT_VIEW: CifraViewPrefs = {
  fontScale: 1,
  columnCount: 1,
  darkSheet: false,
  scrollSpeed: 16,
};

function clampFontScale(n: number): number {
  return Math.min(1.8, Math.max(0.7, Math.round(n * 20) / 20));
}

function clampSpeed(n: number): number {
  // 1–60 px/s com passo fino (antes 8–140 era grosso demais)
  return Math.min(60, Math.max(1, Math.round(n)));
}

function clampColumns(n: number, max: ColumnCount = 4): ColumnCount {
  const v = Math.min(max, Math.max(1, Math.round(n)));
  return v as ColumnCount;
}

export function loadViewPrefs(): CifraViewPrefs {
  try {
    const raw = localStorage.getItem(GLOBAL_KEY);
    if (!raw) return { ...DEFAULT_VIEW };
    const parsed = JSON.parse(raw) as Partial<CifraViewPrefs>;
    return {
      fontScale: clampFontScale(Number(parsed.fontScale) || 1),
      columnCount: clampColumns(Number(parsed.columnCount) || 1),
      darkSheet: Boolean(parsed.darkSheet),
      scrollSpeed: clampSpeed(Number(parsed.scrollSpeed) || 40),
    };
  } catch {
    return { ...DEFAULT_VIEW };
  }
}

export function saveViewPrefs(prefs: CifraViewPrefs): void {
  localStorage.setItem(
    GLOBAL_KEY,
    JSON.stringify({
      ...prefs,
      fontScale: clampFontScale(prefs.fontScale),
      columnCount: clampColumns(prefs.columnCount),
      scrollSpeed: clampSpeed(prefs.scrollSpeed),
    }),
  );
}

export function loadVersionPrefs(slug: string, userId?: string | null): CifraVersionPrefs | null {
  try {
    const raw = localStorage.getItem(versionKey(slug, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CifraVersionPrefs>;
    return {
      semitones: Number(parsed.semitones) || 0,
      capo: Math.min(12, Math.max(0, Number(parsed.capo) || 0)),
    };
  } catch {
    return null;
  }
}

export function saveVersionPrefs(
  slug: string,
  prefs: CifraVersionPrefs,
  userId?: string | null,
): void {
  localStorage.setItem(
    versionKey(slug, userId),
    JSON.stringify({
      semitones: prefs.semitones,
      capo: Math.min(12, Math.max(0, prefs.capo)),
    }),
  );
}

export { clampFontScale, clampSpeed, clampColumns, DEFAULT_VIEW };
