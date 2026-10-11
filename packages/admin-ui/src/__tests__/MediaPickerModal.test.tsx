import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { MediaPickerModal } from '../components/MediaPickerModal';
import { getPublicSiteUrl } from '../utils/api';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('MediaPickerModal Component', () => {
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
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.clear();
        window.sessionStorage?.clear();
      } catch {
        // Ignore
      }
    }
  });

  const renderModal = (props: {
    open?: boolean;
    onClose?: () => void;
    onSelect?: (url: string, altText: string) => void;
  } = {}) => {
    const defaultProps = {
      open: true,
      onClose: vi.fn(),
      onSelect: vi.fn(),
      ...props,
    };
    const testQueryClient = createTestQueryClient();
    return {
      ...render(
        <QueryClientProvider client={testQueryClient}>
          <Theme>
            <MediaPickerModal {...defaultProps} />
          </Theme>
        </QueryClientProvider>
      ),
      props: defaultProps,
    };
  };

  it('does not render content when open is false', () => {
    renderModal({ open: false });
    expect(screen.queryByText('Select Media')).toBeNull();
  });

  it('renders title, search input, and media items when open is true', async () => {
    renderModal();

    expect(await screen.findByText('Select Media')).toBeDefined();
    expect(screen.getByPlaceholderText('Search media by filename...')).toBeDefined();

    expect(await screen.findByText('photo-1.jpg')).toBeDefined();
    expect(screen.getByText('2 KB')).toBeDefined();
    expect(screen.getByText('banner.png')).toBeDefined();
    expect(screen.getByText('2.00 MB')).toBeDefined();

    const photoImg = screen.getByAltText('photo-1.jpg') as HTMLImageElement;
    expect(photoImg).toBeDefined();
    expect(photoImg.getAttribute('src')).toBe(getPublicSiteUrl('/media/photo-1.jpg'));

    const bannerImg = screen.getByAltText('banner.png') as HTMLImageElement;
    expect(bannerImg).toBeDefined();
    expect(bannerImg.getAttribute('src')).toBe(getPublicSiteUrl('/media/banner.png'));
  });

  it('calls onSelect and onClose when Select button is clicked', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSelect, onClose });

    expect(await screen.findByText('photo-1.jpg')).toBeDefined();

    const selectButton = screen.getByRole('button', { name: /select photo-1\.jpg/i });
    fireEvent.click(selectButton);

    expect(onSelect).toHaveBeenCalledWith('/media/photo-1.jpg', 'photo-1.jpg');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onSelect and onClose when the media card itself is clicked', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    renderModal({ onSelect, onClose });

    const itemName = await screen.findByText('banner.png');
    // Click parent card
    const card = itemName.closest('.rt-Card');
    expect(card).toBeDefined();
    if (card) {
      fireEvent.click(card);
    }

    expect(onSelect).toHaveBeenCalledWith('/media/banner.png', 'banner.png');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    expect(await screen.findByText('Select Media')).toBeDefined();
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('filters items by filename query', async () => {
    renderModal();

    expect(await screen.findByText('photo-1.jpg')).toBeDefined();
    expect(screen.getByText('banner.png')).toBeDefined();

    const searchInput = screen.getByPlaceholderText('Search media by filename...');
    fireEvent.change(searchInput, { target: { value: 'banner' } });

    expect(screen.queryByText('photo-1.jpg')).toBeNull();
    expect(screen.getByText('banner.png')).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'xyz' } });
    expect(screen.queryByText('banner.png')).toBeNull();
    expect(screen.getByText('No matching media')).toBeDefined();
  });

  it('displays empty state when media list is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ media: [] }),
      })
    );

    renderModal();

    expect(await screen.findByText('No media found')).toBeDefined();
  });

  describe('Upload Flow', () => {
    it('renders "Upload Image" button and hidden file input with correct attributes', async () => {
      renderModal();

      expect(await screen.findByRole('button', { name: /upload image/i })).toBeDefined();

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      expect(fileInput.accept).toBe('image/*');
      expect(fileInput.style.display).toBe('none');
    });

    it('triggers file input click when "Upload Image" button is clicked', async () => {
      renderModal();

      const uploadButton = await screen.findByRole('button', { name: /upload image/i });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(uploadButton);
      expect(clickSpy).toHaveBeenCalled();
    });

    it('uploads a selected file to /api/media and refreshes media list on success', async () => {
      const mediaList = [...mockMediaResponse.media];

      const fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
        if (options?.method === 'POST' && url.includes('/api/media')) {
          const urlObj = new URL(url, 'http://localhost');
          const filename = urlObj.searchParams.get('filename') || 'uploaded.png';
          const newMedia = {
            id: 3,
            key: `123-${filename}`,
            filename,
            mime_type: 'image/png',
            size_bytes: 512,
            size: 512,
            url: `/media/123-${filename}`,
            created_at: '2026-09-27 13:00:00',
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

      renderModal();
      expect(await screen.findByText('photo-1.jpg')).toBeDefined();

      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const file = new File(['image-bytes'], 'uploaded-photo.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [file] } });

      // Verify newly uploaded image appears after refresh
      expect(await screen.findByText('uploaded-photo.png')).toBeDefined();

      // Verify POST was called with filename in query string and Content-Type header
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/media?filename=uploaded-photo.png'),
        expect.objectContaining({
          method: 'POST',
          body: file,
          headers: expect.objectContaining({
            'Content-Type': 'image/png',
          }),
        })
      );
    });

    it('sends credentials: "include" and does not send Authorization header', async () => {
      const mockStorage = {
        getItem: vi.fn((key: string) => (key === 'token' ? 'test-jwt-bearer-token' : null)),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      vi.stubGlobal('localStorage', mockStorage);
      if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'localStorage', {
          value: mockStorage,
          configurable: true,
          writable: true,
        });
      }

      let postOptions: any = null;
      const fetchMock = vi.fn().mockImplementation((_url: string, options?: any) => {
        if (options?.method === 'POST') {
          postOptions = options;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 99, filename: 'auth-test.png' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMediaResponse),
        });
      });

      vi.stubGlobal('fetch', fetchMock);

      renderModal();
      expect(await screen.findByText('photo-1.jpg')).toBeDefined();

      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const file = new File(['dummy'], 'auth-test.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(postOptions).not.toBeNull();
      });

      expect(postOptions.credentials).toBe('include');
      expect(postOptions.headers?.['Authorization']).toBeUndefined();
    });

    it('shows loading state on the Upload button while upload is in progress', async () => {
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

      renderModal();
      expect(await screen.findByText('photo-1.jpg')).toBeDefined();

      const uploadButton = screen.getByRole('button', { name: /upload image/i }) as HTMLButtonElement;
      expect(uploadButton.disabled).toBe(false);

      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const file = new File(['dummy'], 'in-flight.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      // While upload is in flight, the button should be disabled
      await waitFor(() => {
        expect(uploadButton.disabled).toBe(true);
      });

      // Complete upload
      resolvePost!({
        ok: true,
        json: () => Promise.resolve({ id: 10, filename: 'in-flight.png' }),
      });

      // After upload finishes, the button should no longer be disabled
      await waitFor(() => {
        expect(uploadButton.disabled).toBe(false);
      });
    });

    it('displays error message when upload fails', async () => {
      const fetchMock = vi.fn().mockImplementation((_url: string, options?: any) => {
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: () => Promise.resolve('File body cannot be empty'),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMediaResponse),
        });
      });

      vi.stubGlobal('fetch', fetchMock);

      renderModal();
      expect(await screen.findByText('photo-1.jpg')).toBeDefined();

      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const file = new File([''], 'empty.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(await screen.findByText('File body cannot be empty')).toBeDefined();

      // Verify the button returns to enabled state
      const uploadButton = screen.getByRole('button', { name: /upload image/i }) as HTMLButtonElement;
      await waitFor(() => {
        expect(uploadButton.disabled).toBe(false);
      });
    });
  });
});
