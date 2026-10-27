import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { render, userEvent, createTestQueryClient } from '../../test/test-utils';
import { MediaPickerModal } from './MediaPickerModal';
import { getPublicSiteUrl } from '../../utils/api';

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
    const renderResult = render(<MediaPickerModal {...defaultProps} />, {
      queryClient: testQueryClient,
    });
    return {
      ...renderResult,
      rerenderModal: (updatedProps: Partial<typeof defaultProps> = {}) => {
        const nextProps = { ...defaultProps, ...updatedProps };
        return renderResult.rerender(<MediaPickerModal {...nextProps} />);
      },
      queryClient: testQueryClient,
      props: defaultProps,
    };
  };

  it('does not render content when open is false', () => {
    renderModal({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Select Media')).toBeNull();
  });

  it('renders title, search input, and media items when open is true', async () => {
    renderModal();

    await screen.findByRole('heading', { level: 1, name: 'Select Media' });
    const searchInput = screen.getByRole('textbox', { name: /search media by filename/i });
    expect(searchInput.getAttribute('value')).toBe('');

    await screen.findByText('photo-1.jpg');
    screen.getByText('2 KB');
    screen.getByText('banner.png');
    screen.getByText('2.00 MB');

    const photoImg = screen.getByAltText('photo-1.jpg');
    expect(photoImg.getAttribute('src')).toBe(getPublicSiteUrl('/media/photo-1.jpg?size=thumb'));

    const bannerImg = screen.getByAltText('banner.png');
    expect(bannerImg.getAttribute('src')).toBe(getPublicSiteUrl('/media/banner.png?size=thumb'));
  });

  it('calls onSelect and onClose when Select button is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { rerenderModal } = renderModal({ onSelect, onClose });

    await screen.findByText('photo-1.jpg');

    const selectButton = screen.getByRole('button', { name: /select photo-1\.jpg/i });
    await user.click(selectButton);

    expect(onSelect).toHaveBeenCalledWith('/media/photo-1.jpg', 'photo-1.jpg');
    expect(onClose).toHaveBeenCalledTimes(1);

    // Radix Teardown (Pattern 14)
    rerenderModal({ open: false });
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onSelect and onClose when the media card itself is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { rerenderModal } = renderModal({ onSelect, onClose });

    const bannerImg = await screen.findByAltText('banner.png');
    await user.click(bannerImg);

    expect(onSelect).toHaveBeenCalledWith('/media/banner.png', 'banner.png');
    expect(onClose).toHaveBeenCalledTimes(1);

    // Radix Teardown (Pattern 14)
    rerenderModal({ open: false });
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerenderModal } = renderModal({ onClose });

    await screen.findByText('photo-1.jpg');
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();

    // Radix Teardown (Pattern 14)
    rerenderModal({ open: false });
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onClose when Close icon button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerenderModal } = renderModal({ onClose });

    await screen.findByRole('dialog', { name: /select media/i });
    const closeIconButton = screen.getByRole('button', { name: /^close$/i });
    await user.click(closeIconButton);

    expect(onClose).toHaveBeenCalled();

    // Radix Teardown (Pattern 14)
    rerenderModal({ open: false });
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('filters items by filename query', async () => {
    const user = userEvent.setup();
    renderModal();

    await screen.findByText('photo-1.jpg');
    screen.getByText('banner.png');

    const searchInput = screen.getByRole('textbox', { name: /search media by filename/i });
    await user.type(searchInput, 'banner');

    expect(screen.queryByText('photo-1.jpg')).toBeNull();
    screen.getByText('banner.png');

    await user.clear(searchInput);
    await user.type(searchInput, 'xyz');
    expect(screen.queryByText('banner.png')).toBeNull();
    await screen.findByText('No matching media');
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

    const emptyText = await screen.findByText('No media found');
    expect(emptyText.textContent).toBe('No media found');
  });

  describe('Upload Flow', () => {
    it('renders "Upload Image" button and hidden file input with correct attributes', async () => {
      renderModal();

      await screen.findByText('photo-1.jpg');
      const uploadButton = screen.getByRole('button', { name: /upload image/i });
      expect(uploadButton.hasAttribute('disabled')).toBe(false);

      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      expect(fileInput.getAttribute('type')).toBe('file');
      expect(fileInput.getAttribute('accept')).toBe('image/*,video/mp4,video/webm,video/ogg');
      expect(fileInput.style.display).toBe('none');
    });

    it('triggers file input click when "Upload Image" button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await screen.findByText('photo-1.jpg');
      const uploadButton = screen.getByRole('button', { name: /upload image/i });
      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      await user.click(uploadButton);
      expect(clickSpy).toHaveBeenCalledTimes(1);
    });

    it('uploads a selected file to /api/media and refreshes media list on success', async () => {
      const user = userEvent.setup();
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

      const { queryClient } = renderModal();
      await screen.findByText('photo-1.jpg');

      const uploadButton = screen.getByRole('button', { name: /upload image/i });
      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const file = new File(['image-bytes'], 'uploaded-photo.png', { type: 'image/png' });

      await user.upload(fileInput, file);

      // Verify newly uploaded image appears after refresh
      await screen.findByText('uploaded-photo.png');

      await waitFor(() => {
        expect(uploadButton.hasAttribute('disabled')).toBe(false);
      });
      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

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
      const user = userEvent.setup();
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

      const { queryClient } = renderModal();
      await screen.findByText('photo-1.jpg');

      const uploadButton = screen.getByRole('button', { name: /upload image/i });
      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const file = new File(['dummy'], 'auth-test.png', { type: 'image/png' });
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(postOptions).not.toBeNull();
      });

      expect(postOptions.credentials).toBe('include');
      expect(postOptions.headers?.['Authorization']).toBeUndefined();

      await waitFor(() => {
        expect(uploadButton.hasAttribute('disabled')).toBe(false);
      });
      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });
    });

    it('shows loading state on the Upload button while upload is in progress', async () => {
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

      const { queryClient } = renderModal();
      await screen.findByText('photo-1.jpg');

      const uploadButton = screen.getByRole('button', { name: /upload image/i });
      expect(uploadButton.hasAttribute('disabled')).toBe(false);

      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const file = new File(['dummy'], 'in-flight.png', { type: 'image/png' });
      await user.upload(fileInput, file);

      // While upload is in flight, the button should be disabled
      await waitFor(() => {
        expect(uploadButton.hasAttribute('disabled')).toBe(true);
      });

      // Complete upload
      resolvePost!({
        ok: true,
        json: () => Promise.resolve({ id: 10, filename: 'in-flight.png' }),
      });

      // After upload finishes, the button should no longer be disabled
      await waitFor(() => {
        expect(uploadButton.hasAttribute('disabled')).toBe(false);
      });
      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });
    });

    it('displays error message when upload fails', async () => {
      const user = userEvent.setup();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
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

      const { queryClient } = renderModal();
      await screen.findByText('photo-1.jpg');

      const fileInput = screen.getByTestId('media-file-input') as HTMLInputElement;
      const file = new File([''], 'empty.png', { type: 'image/png' });
      await user.upload(fileInput, file);

      const errorMessage = await screen.findByText('File body cannot be empty');
      expect(errorMessage.textContent).toBe('File body cannot be empty');

      // Verify the button returns to enabled state
      const uploadButton = screen.getByRole('button', { name: /upload image/i });
      await waitFor(() => {
        expect(uploadButton.hasAttribute('disabled')).toBe(false);
      });
      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });
      errorSpy.mockRestore();
    });
  });
});
