export interface PreparedMediaUpload {
  file: File;
  thumb?: Blob;
  md?: Blob;
}

export const RASTER_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
]);

export function isRasterImage(file: File): boolean {
  if (file.type && RASTER_MIME_TYPES.has(file.type)) {
    return true;
  }
  return /\.(jpe?g|png|webp|avif)$/i.test(file.name);
}

export function normalizeToWebpFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) {
    return `${filename}.webp`;
  }
  return `${filename.substring(0, dotIndex)}.webp`;
}

interface ImageDimensions {
  width: number;
  height: number;
}

async function getImageSourceAndDimensions(
  file: File
): Promise<{ source: CanvasImageSource; dimensions: ImageDimensions; cleanup?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        dimensions: { width: bitmap.width, height: bitmap.height },
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement
    }
  }

  // JSDOM does not load images or fire onload/onerror
  if (typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom')) {
    throw new Error('Image loading not supported in jsdom environment');
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load timeout'));
    }, 2000);

    img.onload = () => {
      clearTimeout(timer);
      resolve({
        source: img,
        dimensions: { width: img.naturalWidth, height: img.naturalHeight },
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for optimization'));
    };
    img.src = url;
  });
}

export async function renderToWebpBlob(
  source: CanvasImageSource,
  targetWidth: number,
  targetHeight: number,
  quality: number
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d canvas context');
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      },
      'image/webp',
      quality
    );
  });
}

export async function prepareMediaUpload(file: File): Promise<PreparedMediaUpload> {
  if (!isRasterImage(file)) {
    return { file };
  }

  // If canvas 2D context is unavailable in the environment, bypass optimization
  if (typeof document !== 'undefined') {
    const testCanvas = document.createElement('canvas');
    if (!testCanvas.getContext || !testCanvas.getContext('2d')) {
      return { file };
    }
  }

  try {
    const { source, dimensions, cleanup } = await getImageSourceAndDimensions(file);
    const { width, height } = dimensions;

    // Never upscale
    const lgWidth = Math.min(width, 2048);
    const lgHeight = Math.round((height / width) * lgWidth);
    const lgBlob = await renderToWebpBlob(source, lgWidth, lgHeight, 0.85);

    const normalizedName = normalizeToWebpFilename(file.name);
    const lgFile = new File([lgBlob], normalizedName, { type: 'image/webp' });

    let thumb: Blob | undefined;
    if (width > 400) {
      const thumbWidth = 400;
      const thumbHeight = Math.round((height / width) * thumbWidth);
      thumb = await renderToWebpBlob(source, thumbWidth, thumbHeight, 0.8);
    }

    let md: Blob | undefined;
    if (width > 1024) {
      const mdWidth = 1024;
      const mdHeight = Math.round((height / width) * mdWidth);
      md = await renderToWebpBlob(source, mdWidth, mdHeight, 0.82);
    }

    cleanup?.();

    return {
      file: lgFile,
      thumb,
      md,
    };
  } catch (err) {
    console.warn('Image optimization bypassed due to error:', err);
    return { file };
  }
}
