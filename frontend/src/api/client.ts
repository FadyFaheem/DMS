// Minimal fetch wrapper. The player's "code" is a low-security bearer token
// stored on the device; it's attached to every request when present.

const CODE_KEY = 'player_code';

export function getPlayerCode(): string | null {
  return localStorage.getItem(CODE_KEY);
}

export function setPlayerCode(code: string): void {
  localStorage.setItem(CODE_KEY, code);
}

export function clearPlayerCode(): void {
  localStorage.removeItem(CODE_KEY);
}

export async function throwIfNotOk(res: Response, fallback: string): Promise<void> {
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  throw new Error((body as Record<string, string>).error || fallback);
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const code = getPlayerCode();
  if (code) headers.set('Authorization', `Bearer ${code}`);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData))
    headers.set('Content-Type', 'application/json');
  return fetch(url, { ...options, headers });
}

export async function apiJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(url, options);
  await throwIfNotOk(res, 'Request failed');
  return res.json() as Promise<T>;
}
