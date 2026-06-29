const TOKEN_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

let inflightRefresh: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Share a single refresh promise across concurrent 401 retries so we don't
  // hit /api/auth/refresh multiple times in parallel (which would mint and
  // immediately invalidate multiple token pairs).
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return null;

    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return data.access_token as string;
  })().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

export function openAuthenticatedUrl(url: string): void {
  const token = getAccessToken();
  let finalUrl = url;
  if (token) {
    const sep = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${sep}token=${encodeURIComponent(token)}`;
  }
  window.open(finalUrl, '_blank', 'noopener,noreferrer');
}

export async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  throw new Error((body as Record<string, string>).error || fallback);
}

export async function apiJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await apiFetch(url, options);
  await throwIfNotOk(res, 'Request failed');
  return res.json() as Promise<T>;
}

export async function apiFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers });
    } else {
      window.location.href = '/login';
    }
  }

  return res;
}
