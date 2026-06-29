import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiJson } from '../../api/client';

describe('apiJson', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('returns parsed JSON on success', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const data = await apiJson<{ ok: boolean }>('/api/thing');
    expect(data.ok).toBe(true);
  });

  it('throws the server error message on failure', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'nope' }), { status: 400 }),
    );
    await expect(apiJson('/api/thing')).rejects.toThrow('nope');
  });
});
