import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider } from '../context/ThemeModeContext';
import { Layout } from '../components/Layout';

describe('Layout Component', () => {
  beforeEach(() => {
    const mockStorage = {
      getItem: vi.fn(() => null),
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
      window.matchMedia =
        window.matchMedia ||
        vi.fn().mockImplementation((query) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }));
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/admin/dashboard')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                page_count: 5,
                post_count: 10,
                author_count: 2,
                auth_url: '/cdn-cgi/access/logout?custom=true',
              }),
          });
        }
        if (url.includes('/api/me')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: 1,
                email: 'editor@zygodactyl.io',
                display_name: 'Lead Editor',
                role: 'admin',
              }),
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
  });

  const renderLayout = () => {
    return render(
      <MemoryRouter>
        <ThemeProvider>
          <Theme>
            <Layout />
          </Theme>
        </ThemeProvider>
      </MemoryRouter>
    );
  };

  it('renders sidebar navigation and brand', () => {
    renderLayout();
    expect(screen.getByText('Zygo CMS')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Posts')).toBeDefined();
    expect(screen.getByText('Pages')).toBeDefined();
    expect(screen.getByText('Media Library')).toBeDefined();
  });

  it('fetches user info and updates user email and logout link', async () => {
    renderLayout();

    // Verify user email is updated from /api/me
    expect(await screen.findByText('editor@zygodactyl.io')).toBeDefined();

    // Verify logout link points to auth_url returned by /api/admin/dashboard
    const logoutLink = screen.getByTestId('logout-link');
    expect(logoutLink).toBeDefined();
    expect(logoutLink.getAttribute('href')).toBe('/cdn-cgi/access/logout?custom=true');
  });

  it('falls back to Admin User if me API call fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/admin/dashboard')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ auth_url: '/cdn-cgi/access/logout' }),
          });
        }
        if (url.includes('/api/me')) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () => Promise.resolve({ error: 'Unauthorized' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );

    renderLayout();
    expect(await screen.findByText('Admin User')).toBeDefined();
  });
});
