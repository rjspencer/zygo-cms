import { describe, it, expect } from 'vitest';
import viteConfigFn from '../../vite.config';

describe('Vite Proxy Configuration', () => {
  it('defines proxy rules for /api, ^/media/.*, ^/preview/.*, /style.css, and ^/fonts/.* without breaking existing rules', () => {
    // Invoke config function with development mode
    const rawConfig = typeof viteConfigFn === 'function' ? viteConfigFn({ mode: 'development', command: 'serve' }) : viteConfigFn;
    const config = rawConfig as any;

    expect(config.server).toBeDefined();
    expect(config.server?.proxy).toBeDefined();

    const proxy = config.server?.proxy;

    // Existing /api rule must remain intact
    expect(proxy['/api']).toBeDefined();
    expect(proxy['/api'].target).toBe('http://127.0.0.1:8787');
    expect(proxy['/api'].changeOrigin).toBe(true);

    // New media proxy rule must be present
    expect(proxy['^/media/.*']).toBeDefined();
    expect(proxy['^/media/.*'].target).toContain(':8788');
    expect(proxy['^/media/.*'].changeOrigin).toBe(true);

    // New preview proxy rule must be present
    expect(proxy['^/preview/.*']).toBeDefined();
    expect(proxy['^/preview/.*'].target).toContain(':8788');
    expect(proxy['^/preview/.*'].changeOrigin).toBe(true);

    // Style.css proxy rule must be present
    expect(proxy['/style.css']).toBeDefined();
    expect(proxy['/style.css'].target).toContain(':8788');
    expect(proxy['/style.css'].changeOrigin).toBe(true);

    // Fonts proxy rule must be present
    expect(proxy['^/fonts/.*']).toBeDefined();
    expect(proxy['^/fonts/.*'].target).toContain(':8788');
    expect(proxy['^/fonts/.*'].changeOrigin).toBe(true);
  });

  it('correctly matches /media/:key assets while not matching /media SPA page route', () => {
    const mediaRegex = new RegExp('^/media/.*');

    // Should match media assets
    expect(mediaRegex.test('/media/photo.jpg')).toBe(true);
    expect(mediaRegex.test('/media/1726700000000-banner.png')).toBe(true);
    expect(mediaRegex.test('/media/nested/dir/asset.webp')).toBe(true);

    // Should NOT match /media route for SPA navigation
    expect(mediaRegex.test('/media')).toBe(false);
  });

  it('correctly matches /preview/:token routes while not matching /preview', () => {
    const previewRegex = new RegExp('^/preview/.*');

    // Should match preview routes
    expect(previewRegex.test('/preview/tok-12345')).toBe(true);
    expect(previewRegex.test('/preview/abc-def')).toBe(true);

    // Should NOT match /preview route
    expect(previewRegex.test('/preview')).toBe(false);
  });

  it('correctly matches /style.css static asset route', () => {
    // Exact path prefix matching for /style.css
    expect('/style.css'.startsWith('/style.css')).toBe(true);
    expect('/style.css?v=123'.startsWith('/style.css')).toBe(true);
    expect('/style.css/other'.startsWith('/style.css')).toBe(true);
    expect('/style'.startsWith('/style.css')).toBe(false);
  });

  it('correctly matches /fonts/:file assets while not matching /fonts', () => {
    const fontsRegex = new RegExp('^/fonts/.*');

    expect(fontsRegex.test('/fonts/custom.woff2')).toBe(true);
    expect(fontsRegex.test('/fonts/space-mono.woff2')).toBe(true);
    expect(fontsRegex.test('/fonts')).toBe(false);
  });
});

