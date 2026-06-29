import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAccessToken,
  setTokens,
  clearTokens,
  apiFetch,
  openAuthenticatedUrl,
} from '../../api/client'

beforeEach(() => {
  localStorage.clear()
  vi.mocked(fetch).mockReset()
})

describe('token management', () => {
  it('returns null when no token is stored', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('stores and retrieves tokens', () => {
    setTokens('access-123', 'refresh-456')
    expect(getAccessToken()).toBe('access-123')
  })

  it('clears tokens', () => {
    setTokens('access-123', 'refresh-456')
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('overwrites existing tokens', () => {
    setTokens('old-access', 'old-refresh')
    setTokens('new-access', 'new-refresh')
    expect(getAccessToken()).toBe('new-access')
  })
})

describe('apiFetch', () => {
  it('adds Authorization header when token exists', async () => {
    setTokens('my-token', 'my-refresh')
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/api/items')

    const call = vi.mocked(fetch).mock.calls[0]
    const headers = call[1]?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer my-token')
  })

  it('does not add Authorization header when no token', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/api/items')

    const call = vi.mocked(fetch).mock.calls[0]
    const headers = call[1]?.headers as Headers
    expect(headers.has('Authorization')).toBe(false)
  })

  it('sets Content-Type for JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/api/items', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    })

    const call = vi.mocked(fetch).mock.calls[0]
    const headers = call[1]?.headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('does not set Content-Type for FormData body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/api/items/import', {
      method: 'POST',
      body: new FormData(),
    })

    const call = vi.mocked(fetch).mock.calls[0]
    const headers = call[1]?.headers as Headers
    expect(headers.has('Content-Type')).toBe(false)
  })

  it('attempts token refresh on 401', async () => {
    setTokens('expired-token', 'valid-refresh')

    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'new-access',
            refresh_token: 'new-refresh',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))

    const res = await apiFetch('/api/items')
    expect(res.status).toBe(200)
    expect(getAccessToken()).toBe('new-access')
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3)
  })

  it('deduplicates concurrent refresh calls on parallel 401s', async () => {
    setTokens('expired-token', 'valid-refresh')

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/api/auth/refresh')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              access_token: 'new-access',
              refresh_token: 'new-refresh',
            }),
            { status: 200 },
          ),
        )
      }
      const auth = (fetchMock.mock.calls.at(-1)?.[1]?.headers as Headers | undefined)?.get(
        'Authorization',
      )
      if (auth === 'Bearer expired-token') {
        return Promise.resolve(new Response('{}', { status: 401 }))
      }
      return Promise.resolve(new Response('{"ok":true}', { status: 200 }))
    })

    const [r1, r2] = await Promise.all([apiFetch('/api/a'), apiFetch('/api/b')])
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)

    const refreshCalls = fetchMock.mock.calls.filter((c) => {
      const u = typeof c[0] === 'string' ? c[0] : c[0].toString()
      return u.endsWith('/api/auth/refresh')
    })
    expect(refreshCalls).toHaveLength(1)
  })

  it('does not retry on 401 when no token was set', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 401 }))

    const res = await apiFetch('/api/items')
    expect(res.status).toBe(401)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('passes through non-401 errors without retry', async () => {
    setTokens('my-token', 'my-refresh')
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 500 }))

    const res = await apiFetch('/api/items')
    expect(res.status).toBe(500)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('preserves custom headers', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }))

    await apiFetch('/api/items', {
      headers: { 'X-Custom': 'value' },
    })

    const call = vi.mocked(fetch).mock.calls[0]
    const headers = call[1]?.headers as Headers
    expect(headers.get('X-Custom')).toBe('value')
  })
})

describe('openAuthenticatedUrl', () => {
  it('opens url with token query param', () => {
    setTokens('my-token', 'my-refresh')
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null)

    openAuthenticatedUrl('/api/docs/1')

    expect(spy).toHaveBeenCalledWith('/api/docs/1?token=my-token', '_blank')
    spy.mockRestore()
  })

  it('appends token with & when url has existing params', () => {
    setTokens('my-token', 'my-refresh')
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null)

    openAuthenticatedUrl('/api/docs/1?format=pdf')

    expect(spy).toHaveBeenCalledWith('/api/docs/1?format=pdf&token=my-token', '_blank')
    spy.mockRestore()
  })

  it('opens url without token when not authenticated', () => {
    const spy = vi.spyOn(window, 'open').mockImplementation(() => null)

    openAuthenticatedUrl('/api/docs/1')

    expect(spy).toHaveBeenCalledWith('/api/docs/1', '_blank')
    spy.mockRestore()
  })
})
