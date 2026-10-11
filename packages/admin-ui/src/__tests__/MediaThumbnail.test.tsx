import { describe, it, expect } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../test/test-utils';
import { Theme } from '@radix-ui/themes';
import { MediaThumbnail } from '../components/MediaThumbnail';
import { getPublicSiteUrl } from '../utils/api';

describe('MediaThumbnail Component', () => {
  it('renders img element with correct attributes for image types', () => {
    render(
      <Theme>
        <MediaThumbnail
          src="/media/test-photo.jpg"
          alt="Test Photo"
          type="image/jpeg"
          height="140px"
        />
      </Theme>
    );

    const img = screen.getByAltText('Test Photo') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe(getPublicSiteUrl('/media/test-photo.jpg'));
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.style.objectFit).toBe('cover');
  });

  it('renders img element when type is undefined', () => {
    render(
      <Theme>
        <MediaThumbnail
          src="/media/untitled.png"
          alt="Untitled Image"
          height="100px"
        />
      </Theme>
    );

    const img = screen.getByAltText('Untitled Image') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe(getPublicSiteUrl('/media/untitled.png'));
  });

  it('loads relative media URLs from the public site when running on the admin subdomain', () => {
    const originalLocation = window.location;
    const originalPublicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL;
    try {
      import.meta.env.VITE_PUBLIC_SITE_URL = '';
      delete (window as any).location;
      (window as any).location = {
        protocol: 'https:',
        host: 'admin.zygodactylstudios.com',
        hostname: 'admin.zygodactylstudios.com',
      };

      render(
        <Theme>
          <MediaThumbnail
            src="/media/1791670334067-splat_background.webp"
            alt="Splat background"
            type="image/webp"
          />
        </Theme>
      );

      expect(screen.getByAltText('Splat background').getAttribute('src')).toBe(
        'https://zygodactylstudios.com/media/1791670334067-splat_background.webp'
      );
    } finally {
      (window as any).location = originalLocation;
      import.meta.env.VITE_PUBLIC_SITE_URL = originalPublicSiteUrl;
    }
  });

  it('preserves absolute media URLs', () => {
    render(
      <Theme>
        <MediaThumbnail
          src="https://cdn.example.com/photo.webp"
          alt="Remote photo"
          type="image/webp"
        />
      </Theme>
    );

    expect(screen.getByAltText('Remote photo').getAttribute('src')).toBe(
      'https://cdn.example.com/photo.webp'
    );
  });

  it('renders fallback icon when type is not an image', () => {
    const { container } = render(
      <Theme>
        <MediaThumbnail
          src="/media/document.pdf"
          alt="Document PDF"
          type="application/pdf"
          height="140px"
        />
      </Theme>
    );

    expect(screen.queryByAltText('Document PDF')).toBeNull();
    // Fallback svg icon should be present
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('falls back to icon when image fails to load (onError)', () => {
    const { container, rerender } = render(
      <Theme>
        <MediaThumbnail
          src="/media/broken-image.jpg"
          alt="Broken Image"
          type="image/jpeg"
        />
      </Theme>
    );

    const img = screen.getByAltText('Broken Image');
    expect(img).toBeDefined();

    // Trigger onError
    fireEvent.error(img);

    // img should now be replaced by the fallback icon
    expect(screen.queryByAltText('Broken Image')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();

    // Changing src resets error state
    rerender(
      <Theme>
        <MediaThumbnail
          src="/media/new-image.jpg"
          alt="New Image"
          type="image/jpeg"
        />
      </Theme>
    );

    expect(screen.getByAltText('New Image')).toBeDefined();
  });
});
