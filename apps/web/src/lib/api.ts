const ACCESS_KEY = 'mucifrar_access';
const REFRESH_KEY = 'mucifrar_refresh';
const USER_KEY = 'mucifrar_user';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: string;
  mustChangePassword?: boolean;
  createdAt?: string;
};

type Tokens = { accessToken: string; refreshToken: string };

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveSession(tokens: Tokens, user: AuthUser) {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearSession();
    return false;
  }

  const data = (await res.json()) as Tokens & { user: AuthUser };
  saveSession({ accessToken: data.accessToken, refreshToken: data.refreshToken }, data.user);
  return true;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const access = getAccessToken();
  if (access) headers.set('Authorization', `Bearer ${access}`);

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401 && retry && !path.includes('/auth/login') && !path.includes('/auth/register')) {
    refreshPromise ??= tryRefresh().finally(() => {
      refreshPromise = null;
    });
    const ok = await refreshPromise;
    if (ok) return api<T>(path, options, false);
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? 'Erro na requisição', data);
  }

  return data as T;
}

export type Cifra = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  key: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED';
  views: number;
  authorId: string;
  authorName?: string;
  createdAt: string;
  updatedAt: string;
};

export type CifraListResponse = {
  items: Cifra[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PlaylistCifraSummary = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  key: string;
  status: 'DRAFT' | 'PUBLISHED';
  views: number;
  authorId: string;
  authorName?: string;
};

export type PlaylistItem = {
  id: string;
  position: number;
  cifraId: string;
  cifra: PlaylistCifraSummary;
  createdAt: string;
};

export type Playlist = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  ownerId: string;
  ownerName?: string;
  itemCount: number;
  items?: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
};

export type PlaylistListResponse = {
  items: Playlist[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
