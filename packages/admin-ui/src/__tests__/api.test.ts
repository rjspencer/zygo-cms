import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, getApiUrl, getPublicSiteUrl } from '../utils/api';

describe('api fetch helper', () => {

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }))));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    import.meta.env.VITE_API_BASE_URL = '';
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
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

    it('falls back to api.* subdomain when running on admin.* and VITE_API_BASE_URL is not set', () => {
      import.meta.env.VITE_API_BASE_URL = '';
      const originalLocation = window.location;
      try {
        delete (window as any).location;
        (window as any).location = {
          protocol: 'https:',
          host: 'admin.zygodactylstudios.com',
          hostname: 'admin.zygodactylstudios.com',
        };
        expect(getApiUrl('/api/entries')).toBe('https://api.zygodactylstudios.com/api/entries');
      } finally {
        (window as any).location = originalLocation;
      }
    });
  });

  describe('getPublicSiteUrl', () => {
    describe('when VITE_PUBLIC_SITE_URL is not set or empty', () => {
      beforeEach(() => {
        import.meta.env.VITE_PUBLIC_SITE_URL = '';
      });

      it('returns "/" when called with no arguments', () => {
        expect(getPublicSiteUrl()).toBe('/');
      });

      it('returns "/" when called with empty string or "/"', () => {
        expect(getPublicSiteUrl('')).toBe('/');
        expect(getPublicSiteUrl('/')).toBe('/');
      });

      it('returns normalized relative path when path has leading slash', () => {
        expect(getPublicSiteUrl('/about')).toBe('/about');
        expect(getPublicSiteUrl('/post/my-post')).toBe('/post/my-post');
      });

      it('returns normalized relative path when path does not have leading slash', () => {
        expect(getPublicSiteUrl('about')).toBe('/about');
        expect(getPublicSiteUrl('post/my-post')).toBe('/post/my-post');
      });
    });

    describe('when VITE_PUBLIC_SITE_URL is set without trailing slash', () => {
      beforeEach(() => {
        import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com';
      });

      it('returns base URL with trailing slash when called with no arguments, empty string, or "/"', () => {
        expect(getPublicSiteUrl()).toBe('https://zygodactylstudios.com/');
        expect(getPublicSiteUrl('')).toBe('https://zygodactylstudios.com/');
        expect(getPublicSiteUrl('/')).toBe('https://zygodactylstudios.com/');
      });

      it('appends path without double slashes when path has leading slash', () => {
        expect(getPublicSiteUrl('/about')).toBe('https://zygodactylstudios.com/about');
        expect(getPublicSiteUrl('/post/my-post')).toBe('https://zygodactylstudios.com/post/my-post');
      });

      it('appends path without double slashes when path does not have leading slash', () => {
        expect(getPublicSiteUrl('about')).toBe('https://zygodactylstudios.com/about');
        expect(getPublicSiteUrl('post/my-post')).toBe('https://zygodactylstudios.com/post/my-post');
      });
    });

    describe('when VITE_PUBLIC_SITE_URL is set with trailing slash', () => {
      beforeEach(() => {
        import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com/';
      });

      it('returns base URL with single trailing slash when called with no arguments, empty string, or "/"', () => {
        expect(getPublicSiteUrl()).toBe('https://zygodactylstudios.com/');
        expect(getPublicSiteUrl('')).toBe('https://zygodactylstudios.com/');
        expect(getPublicSiteUrl('/')).toBe('https://zygodactylstudios.com/');
      });

      it('handles trailing slash on base URL cleanly without duplicate slashes', () => {
        expect(getPublicSiteUrl('/about')).toBe('https://zygodactylstudios.com/about');
        expect(getPublicSiteUrl('about')).toBe('https://zygodactylstudios.com/about');
        expect(getPublicSiteUrl('/post/my-post')).toBe('https://zygodactylstudios.com/post/my-post');
      });

      it('handles multiple trailing slashes on base URL', () => {
        import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com///';
        expect(getPublicSiteUrl()).toBe('https://zygodactylstudios.com/');
        expect(getPublicSiteUrl('/about')).toBe('https://zygodactylstudios.com/about');
        expect(getPublicSiteUrl('about')).toBe('https://zygodactylstudios.com/about');
      });
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
