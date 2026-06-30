import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, apiJson, setPlayerCode, clearPlayerCode } from '../../api/client';

describe('api client', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
    clearPlayerCode();
  });

  it('returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const data = await apiJson<{ ok: boolean }>('/api/thing');
    expect(data.ok).toBe(true);
  });

  it('throws the server error message on failure', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: 'nope' }), { status: 400 }));
    await expect(apiJson('/api/thing')).rejects.toThrow('nope');
  });

  it('attaches the player code as a bearer token when present', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
    setPlayerCode('ABCD-1234');

    await apiFetch('/api/players/me');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer ABCD-1234');
  });

  it('omits the Authorization header when no code is stored', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await apiFetch('/api/players');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has('Authorization')).toBe(false);
  });
});
