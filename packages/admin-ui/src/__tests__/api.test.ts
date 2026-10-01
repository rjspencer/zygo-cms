import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, getApiUrl } from '../utils/api';

describe('api fetch helper', () => {

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    import.meta.env.VITE_API_BASE_URL = '';
  });

  describe('getApiUrl', () => {
    it('returns relative path when VITE_API_BASE_URL is not set or empty', () => {
      import.meta.env.VITE_API_BASE_URL = '';
      expect(getApiUrl('/api/entries')).toBe('/api/entries');
    });

    it('prepends VITE_API_BASE_URL when set without trailing slash', () => {
      import.meta.env.VITE_API_BASE_URL = 'https://api.zygodactylstudios.com';
      expect(getApiUrl('/api/entries')).toBe('https://api.zygodactylstudios.com/api/entries');
    });

    it('handles trailing slash on base URL and leading slash on path cleanly', () => {
      import.meta.env.VITE_API_BASE_URL = 'https://api.zygodactylstudios.com/';
      expect(getApiUrl('/api/entries')).toBe('https://api.zygodactylstudios.com/api/entries');
      expect(getApiUrl('api/entries')).toBe('https://api.zygodactylstudios.com/api/entries');
    });

    it('preserves query strings and parameters', () => {
      import.meta.env.VITE_API_BASE_URL = 'https://api.zygodactylstudios.com';
      expect(getApiUrl('/api/media?filename=photo.png')).toBe(
        'https://api.zygodactylstudios.com/api/media?filename=photo.png'
      );
    });

    it('returns absolute URLs untouched', () => {
      import.meta.env.VITE_API_BASE_URL = 'https://api.zygodactylstudios.com';
      expect(getApiUrl('https://other.com/api')).toBe('https://other.com/api');
      expect(getApiUrl('http://localhost:8787/api')).toBe('http://localhost:8787/api');
    });
  });

  describe('apiFetch', () => {
    it('automatically includes credentials: "include"', async () => {
      import.meta.env.VITE_API_BASE_URL = '';
      await apiFetch('/api/entries');

      expect(fetch).toHaveBeenCalledWith('/api/entries', {
        credentials: 'include',
      });
    });

    it('prepends base URL and passes credentials: "include"', async () => {
      import.meta.env.VITE_API_BASE_URL = 'https://api.zygodactylstudios.com';
      await apiFetch('/api/entries');

      expect(fetch).toHaveBeenCalledWith('https://api.zygodactylstudios.com/api/entries', {
        credentials: 'include',
      });
    });

    it('merges custom options (method, headers, body) while preserving credentials', async () => {
      import.meta.env.VITE_API_BASE_URL = '';
      await apiFetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      });

      expect(fetch).toHaveBeenCalledWith('/api/entries', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      });
    });
  });
});
