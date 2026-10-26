import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { render, userEvent } from '../../test/test-utils';
import { Media } from './Media';
import { getPublicSiteUrl } from '../../utils/api';

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

  const renderMediaPage = (initialEntries: string[] = ['/admin/media']) => {
    return render(<Media />, {
      routerInitialEntries: initialEntries,
    });
  };

  it('renders heading, upload button, search input, and media items', async () => {
    renderMediaPage();

    await screen.findByRole('heading', { level: 1, name: /media library/i });
    const uploadButton = screen.getByRole('button', { name: /upload image/i });
    expect(uploadButton.hasAttribute('disabled')).toBe(false);

    const searchInput = screen.getByRole('textbox', { name: /search media by filename/i });
    expect(searchInput.getAttribute('value')).toBe('');

    await screen.findByText('photo-1.jpg');
    screen.getByText('2 KB • image/jpeg');
    screen.getByText('banner.png');

    const photoImg = screen.getByAltText('photo-1.jpg');
    expect(photoImg.getAttribute('src')).toBe(getPublicSiteUrl('/media/photo-1.jpg?size=thumb'));

    const bannerImg = screen.getByAltText('banner.png');
    expect(bannerImg.getAttribute('src')).toBe(getPublicSiteUrl('/media/banner.png?size=thumb'));
  });

  it('triggers file input click when "Upload Image" button is clicked', async () => {
    const user = userEvent.setup();
    renderMediaPage();

    const uploadButton = await screen.findByRole('button', { name: /upload image/i });
    const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
    expect(fileInput.getAttribute('type')).toBe('file');
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(uploadButton);
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('uploads a file and refreshes media items', async () => {
    const user = userEvent.setup();
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

    const { queryClient } = renderMediaPage();
    await screen.findByText('photo-1.jpg');

    const uploadButton = screen.getByRole('button', { name: /upload image/i });
    const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
    const file = new File(['file-data'], 'new-upload.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    await screen.findByText('new-upload.png');
    await waitFor(() => {
      expect(uploadButton.hasAttribute('disabled')).toBe(false);
    });
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });

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
    const user = userEvent.setup();
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

    const { queryClient } = renderMediaPage();
    await screen.findByText('photo-1.jpg');

    const uploadButton = screen.getByRole('button', { name: /upload image/i });
    expect(uploadButton.hasAttribute('disabled')).toBe(false);

    const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
    const file = new File(['data'], 'test.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(uploadButton.hasAttribute('disabled')).toBe(true);
    });

    resolvePost!({
      ok: true,
      json: () => Promise.resolve({ id: 10, filename: 'test.png' }),
    });

    await waitFor(() => {
      expect(uploadButton.hasAttribute('disabled')).toBe(false);
    });
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });
  });

  it('handles delete media item', async () => {
    const user = userEvent.setup();
    let deleteCalledWith = '';
    const mediaList = [...mockMediaResponse.media];
    const fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === 'DELETE') {
        deleteCalledWith = url;
        const idFromUrl = url.split('/').pop() || '';
        const idx = mediaList.findIndex(
          (m) => String(m.id) === idFromUrl || m.key === idFromUrl || url.includes(m.key)
        );
        if (idx > -1) mediaList.splice(idx, 1);
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ...mockMediaResponse, media: mediaList }),
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const { queryClient } = renderMediaPage();
    await screen.findByText('photo-1.jpg');

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    expect(deleteButtons.length).toBe(2);

    await user.click(deleteButtons[0]);

    if (screen.queryByText('photo-1.jpg')) {
      await waitForElementToBeRemoved(() => screen.queryByText('photo-1.jpg'));
    }
    expect(screen.queryByText('photo-1.jpg')).toBeNull();
    expect(deleteCalledWith).toContain('photo-1.jpg');
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });
  });

  it('verifies "Sync" button is rendered in dev mode next to the upload button', async () => {
    vi.stubEnv('DEV', true as any);
    renderMediaPage();

    await screen.findByRole('heading', { level: 1, name: /media library/i });
    const syncButton = screen.getByRole('button', { name: /^sync$/i });
    expect(syncButton.hasAttribute('disabled')).toBe(false);

    const uploadButton = screen.getByRole('button', { name: /upload image/i });
    expect(uploadButton.hasAttribute('disabled')).toBe(false);
    expect(syncButton.parentElement).toBe(uploadButton.parentElement);
  });

  it('verifies "Sync" button disappears in prod mode', async () => {
    vi.stubEnv('DEV', false as any);
    renderMediaPage();

    await screen.findByRole('heading', { level: 1, name: /media library/i });
    expect(screen.queryByRole('button', { name: /^sync$/i })).toBeNull();
    const uploadButton = screen.getByRole('button', { name: /upload image/i });
    expect(uploadButton.hasAttribute('disabled')).toBe(false);
  });

  it('triggers sync when clicked, shows loading state, sends POST request to /api/media/sync, and automatically refreshes media items to show new synced images', async () => {
    const user = userEvent.setup();
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

    const { queryClient } = renderMediaPage();
    await screen.findByText('photo-1.jpg');

    const syncButton = screen.getByRole('button', { name: /^sync$/i });
    const uploadButton = screen.getByRole('button', { name: /upload image/i });
    expect(syncButton.hasAttribute('disabled')).toBe(false);
    expect(uploadButton.hasAttribute('disabled')).toBe(false);

    await user.click(syncButton);

    await waitFor(() => {
      expect(syncButton.hasAttribute('disabled')).toBe(true);
      expect(uploadButton.hasAttribute('disabled')).toBe(true);
    });

    resolveSync!({
      ok: true,
      json: () => Promise.resolve({ success: true, synced: 1 }),
    });

    await screen.findByText('synced-photo.jpg');

    await waitFor(() => {
      expect(syncButton.hasAttribute('disabled')).toBe(false);
      expect(uploadButton.hasAttribute('disabled')).toBe(false);
    });
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/media/sync'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('handles sync failure gracefully and displays error text when sync request fails', async () => {
    const user = userEvent.setup();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

    const { queryClient } = renderMediaPage();
    await screen.findByText('photo-1.jpg');

    const syncButton = screen.getByRole('button', { name: /^sync$/i });
    await user.click(syncButton);

    const errorMessage = await screen.findByText('Failed to sync bucket with database');
    expect(errorMessage.textContent).toBe('Failed to sync bucket with database');

    await waitFor(() => {
      expect(syncButton.hasAttribute('disabled')).toBe(false);
    });
    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
    });
    errorSpy.mockRestore();
  });

  it('rejects files larger than 25MB with an error message and does not upload', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockMediaResponse) });
    vi.stubGlobal('fetch', fetchMock);

    renderMediaPage();
    await screen.findByText('photo-1.jpg');

    const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
    const oversizedFile = new File(['x'.repeat(100)], 'huge-video.mp4', { type: 'video/mp4' });
    Object.defineProperty(oversizedFile, 'size', { value: 30 * 1024 * 1024 });

    await user.upload(fileInput, oversizedFile);

    const errorAlert = await screen.findByText(/File is too large/i);
    expect(errorAlert.textContent).toContain('Maximum allowed upload size is 25 MB');
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('huge-video.mp4'),
      expect.anything()
    );
  });

  it('warns user when video exceeds 10MB and cancels if user dismisses prompt', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockMediaResponse) });
    vi.stubGlobal('fetch', fetchMock);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderMediaPage();
    await screen.findByText('photo-1.jpg');

    const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
    const largeVideo = new File(['x'.repeat(100)], 'large-bg.mp4', { type: 'video/mp4' });
    Object.defineProperty(largeVideo, 'size', { value: 15 * 1024 * 1024 });

    await user.upload(fileInput, largeVideo);

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: This video is 15.0 MB'));
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('large-bg.mp4'),
      expect.anything()
    );
    confirmSpy.mockRestore();
  });

  it('filters media items based on search input and URL search parameters', async () => {
    const user = userEvent.setup();
    renderMediaPage(['/admin/media?q=banner']);

    await screen.findByText('banner.png');
    expect(screen.queryByText('photo-1.jpg')).toBeNull();

    const searchInput = screen.getByRole('textbox', { name: /search media by filename/i });
    expect(searchInput.getAttribute('value')).toBe('banner');

    await user.clear(searchInput);
    await user.type(searchInput, 'photo');

    await screen.findByText('photo-1.jpg');
    expect(screen.queryByText('banner.png')).toBeNull();
  });
});
