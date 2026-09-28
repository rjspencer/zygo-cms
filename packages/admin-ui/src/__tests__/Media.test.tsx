import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { Media } from '../pages/Media';

describe('Media Page Component', () => {
  const mockMediaResponse = {
    media: [
      {
        id: 1,
        key: 'photo-1.jpg',
        filename: 'photo-1.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 2048,
        size: 2048,
        url: '/media/photo-1.jpg',
        created_at: '2026-09-27 12:00:00',
      },
      {
        id: 2,
        key: 'banner.png',
        filename: 'banner.png',
        mime_type: 'image/png',
        size_bytes: 2 * 1024 * 1024,
        size: 2 * 1024 * 1024,
        url: '/media/banner.png',
        created_at: '2026-09-26 10:00:00',
      },
    ],
    pagination: { page: 1, per_page: 20, total_items: 2, total_pages: 1 },
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/media')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMediaResponse),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const renderMediaPage = () => {
    return render(
      <Theme>
        <Media />
      </Theme>
    );
  };

  it('renders heading, upload button, search input, and media items', async () => {
    renderMediaPage();

    expect(await screen.findByText('Media Library')).toBeDefined();
    expect(screen.getByRole('button', { name: /upload image/i })).toBeDefined();
    expect(screen.getByPlaceholderText('Search media by filename...')).toBeDefined();

    expect(await screen.findByText('photo-1.jpg')).toBeDefined();
    expect(screen.getByText('2 KB • image/jpeg')).toBeDefined();
    expect(screen.getByText('banner.png')).toBeDefined();

    const photoImg = screen.getByAltText('photo-1.jpg') as HTMLImageElement;
    expect(photoImg).toBeDefined();
    expect(photoImg.getAttribute('src')).toBe('/media/photo-1.jpg');

    const bannerImg = screen.getByAltText('banner.png') as HTMLImageElement;
    expect(bannerImg).toBeDefined();
    expect(bannerImg.getAttribute('src')).toBe('/media/banner.png');
  });

  it('triggers file input click when "Upload Image" button is clicked', async () => {
    const { container } = renderMediaPage();

    const uploadButton = await screen.findByRole('button', { name: /upload image/i });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(uploadButton);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('uploads a file and refreshes media items', async () => {
    const mediaList = [...mockMediaResponse.media];

    const fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/api/media')) {
        const urlObj = new URL(url, 'http://localhost');
        const filename = urlObj.searchParams.get('filename') || 'new-upload.png';
        const newMedia = {
          id: 3,
          key: `456-${filename}`,
          filename,
          mime_type: 'image/png',
          size_bytes: 4096,
          size: 4096,
          url: `/media/456-${filename}`,
          created_at: '2026-09-27 14:00:00',
        };
        mediaList.push(newMedia);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(newMedia),
        });
      }

      if (url.includes('/api/media')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ media: mediaList }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    vi.stubGlobal('fetch', fetchMock);

    renderMediaPage();
    expect(await screen.findByText('photo-1.jpg')).toBeDefined();

    const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
    const file = new File(['file-data'], 'new-upload.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('new-upload.png')).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/media?filename=new-upload.png'),
      expect.objectContaining({
        method: 'POST',
        body: file,
        headers: expect.objectContaining({
          'Content-Type': 'image/png',
        }),
      })
    );
  });

  it('shows loading state on button during upload', async () => {
    let resolvePost: (value: any) => void;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    const fetchMock = vi.fn().mockImplementation((_url: string, options?: any) => {
      if (options?.method === 'POST') {
        return postPromise;
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMediaResponse),
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    renderMediaPage();
    expect(await screen.findByText('photo-1.jpg')).toBeDefined();

    const uploadButton = screen.getByRole('button', { name: /upload image/i }) as HTMLButtonElement;
    expect(uploadButton.disabled).toBe(false);

    const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadButton.disabled).toBe(true);
    });

    resolvePost!({
      ok: true,
      json: () => Promise.resolve({ id: 10, filename: 'test.png' }),
    });

    await waitFor(() => {
      expect(uploadButton.disabled).toBe(false);
    });
  });

  it('handles delete media item', async () => {
    let deleteCalledWith = '';
    const fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        deleteCalledWith = url;
        return Promise.resolve({ ok: true });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMediaResponse),
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    renderMediaPage();
    expect(await screen.findByText('photo-1.jpg')).toBeDefined();

    const deleteButtons = screen.getAllByTitle('Delete');
    expect(deleteButtons.length).toBe(2);

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('photo-1.jpg')).toBeNull();
    });
    expect(deleteCalledWith).toContain('photo-1.jpg');
  });

  it('verifies "Sync" button is rendered in dev mode next to the upload button', async () => {
    vi.stubEnv('DEV', true as any);
    renderMediaPage();

    expect(await screen.findByText('Media Library')).toBeDefined();
    const syncButton = screen.getByRole('button', { name: /^sync$/i });
    expect(syncButton).toBeDefined();
    expect(syncButton.textContent).toContain('Sync');

    const uploadButton = screen.getByRole('button', { name: /upload image/i });
    expect(uploadButton).toBeDefined();
    expect(syncButton.parentElement).toBe(uploadButton.parentElement);
  });

  it('verifies "Sync" button disappears in prod mode', async () => {
    vi.stubEnv('DEV', false as any);
    renderMediaPage();

    expect(await screen.findByText('Media Library')).toBeDefined();
    expect(screen.queryByRole('button', { name: /^sync$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /upload image/i })).toBeDefined();
  });

  it('triggers sync when clicked, shows loading state, sends POST request to /api/media/sync, and automatically refreshes media items to show new synced images', async () => {
    const mediaList = [...mockMediaResponse.media];
    let resolveSync: (value: any) => void;
    const syncPromise = new Promise((resolve) => {
      resolveSync = resolve;
    });

    const fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/api/media/sync')) {
        mediaList.push({
          id: 3,
          key: 'synced-photo.jpg',
          filename: 'synced-photo.jpg',
          mime_type: 'image/jpeg',
          size_bytes: 3072,
          size: 3072,
          url: '/media/synced-photo.jpg',
          created_at: '2026-09-27 15:30:00',
        });
        return syncPromise;
      }

      if (url.includes('/api/media')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ media: mediaList }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    vi.stubGlobal('fetch', fetchMock);

    renderMediaPage();
    expect(await screen.findByText('photo-1.jpg')).toBeDefined();

    const syncButton = screen.getByRole('button', { name: /^sync$/i }) as HTMLButtonElement;
    const uploadButton = screen.getByRole('button', { name: /upload image/i }) as HTMLButtonElement;
    expect(syncButton.disabled).toBe(false);
    expect(uploadButton.disabled).toBe(false);

    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(syncButton.disabled).toBe(true);
      expect(uploadButton.disabled).toBe(true);
    });

    resolveSync!({
      ok: true,
      json: () => Promise.resolve({ success: true, synced: 1 }),
    });

    expect(await screen.findByText('synced-photo.jpg')).toBeDefined();

    await waitFor(() => {
      expect(syncButton.disabled).toBe(false);
      expect(uploadButton.disabled).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/media/sync'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('handles sync failure gracefully and displays error text when sync request fails', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url.includes('/api/media/sync')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Failed to sync bucket with database'),
        });
      }

      if (url.includes('/api/media')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMediaResponse),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    vi.stubGlobal('fetch', fetchMock);

    renderMediaPage();
    expect(await screen.findByText('photo-1.jpg')).toBeDefined();

    const syncButton = screen.getByRole('button', { name: /^sync$/i });
    fireEvent.click(syncButton);

    expect(await screen.findByText('Failed to sync bucket with database')).toBeDefined();
    await waitFor(() => {
      expect((syncButton as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
