import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isRasterImage,
  normalizeToWebpFilename,
  prepareMediaUpload,
} from './imageOptimization';

describe('imageOptimization', () => {
  afterEach(() => {
    delete (globalThis as any).createImageBitmap;
    vi.restoreAllMocks();
  });
  describe('isRasterImage', () => {
    it('returns true for raster image types', () => {
      expect(isRasterImage(new File([], 'photo.jpg', { type: 'image/jpeg' }))).toBe(true);
      expect(isRasterImage(new File([], 'photo.jpeg', { type: 'image/jpeg' }))).toBe(true);
      expect(isRasterImage(new File([], 'photo.png', { type: 'image/png' }))).toBe(true);
      expect(isRasterImage(new File([], 'photo.webp', { type: 'image/webp' }))).toBe(true);
      expect(isRasterImage(new File([], 'photo.avif', { type: 'image/avif' }))).toBe(true);
    });

    it('identifies raster image by extension when MIME type is missing', () => {
      expect(isRasterImage(new File([], 'photo.JPG'))).toBe(true);
      expect(isRasterImage(new File([], 'photo.png'))).toBe(true);
    });

    it('returns false for SVGs, GIFs, and videos', () => {
      expect(isRasterImage(new File([], 'vector.svg', { type: 'image/svg+xml' }))).toBe(false);
      expect(isRasterImage(new File([], 'animation.gif', { type: 'image/gif' }))).toBe(false);
      expect(isRasterImage(new File([], 'clip.mp4', { type: 'video/mp4' }))).toBe(false);
      expect(isRasterImage(new File([], 'document.pdf', { type: 'application/pdf' }))).toBe(false);
    });
  });

  describe('normalizeToWebpFilename', () => {
    it('replaces extension with .webp', () => {
      expect(normalizeToWebpFilename('my-photo.jpg')).toBe('my-photo.webp');
      expect(normalizeToWebpFilename('my-photo.PNG')).toBe('my-photo.webp');
      expect(normalizeToWebpFilename('already.webp')).toBe('already.webp');
      expect(normalizeToWebpFilename('complex.name.with.dots.jpeg')).toBe('complex.name.with.dots.webp');
    });

    it('appends .webp if no extension exists', () => {
      expect(normalizeToWebpFilename('noextension')).toBe('noextension.webp');
    });
  });

  describe('prepareMediaUpload', () => {
    it('returns untouched file for non-raster assets without canvas processing', async () => {
      const svgFile = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' });
      const result = await prepareMediaUpload(svgFile);

      expect(result.file).toBe(svgFile);
      expect(result.thumb).toBeUndefined();
      expect(result.md).toBeUndefined();
    });

    it('processes raster images and generates WebP tiers with normalized filename', async () => {
      const fakeBitmap = {
        width: 3000,
        height: 2000,
        close: vi.fn(),
      };
      (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue(fakeBitmap);

      const fakeBlob = new Blob(['fake-webp-data'], { type: 'image/webp' });
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
        }),
        toBlob: vi.fn().mockImplementation((cb: (b: Blob) => void) => cb(fakeBlob)),
      };
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas as any;
        return document.createElement(tag);
      });

      const jpgFile = new File(['raw'], 'high-res.jpg', { type: 'image/jpeg' });
      const result = await prepareMediaUpload(jpgFile);

      expect(result.file.name).toBe('high-res.webp');
      expect(result.file.type).toBe('image/webp');
      expect(result.thumb).toBeDefined();
      expect(result.md).toBeDefined();
      expect(fakeBitmap.close).toHaveBeenCalled();
    });

    it('skips thumb and md tiers when image native resolution is small', async () => {
      const fakeBitmap = {
        width: 350,
        height: 200,
        close: vi.fn(),
      };
      (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue(fakeBitmap);

      const fakeBlob = new Blob(['fake-webp-data'], { type: 'image/webp' });
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn(),
        }),
        toBlob: vi.fn().mockImplementation((cb: (b: Blob) => void) => cb(fakeBlob)),
      };
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'canvas') return mockCanvas as any;
        return document.createElement(tag);
      });

      const smallFile = new File(['raw'], 'small.png', { type: 'image/png' });
      const result = await prepareMediaUpload(smallFile);

      expect(result.file.name).toBe('small.webp');
      expect(result.thumb).toBeUndefined();
      expect(result.md).toBeUndefined();
    });
  });
});
