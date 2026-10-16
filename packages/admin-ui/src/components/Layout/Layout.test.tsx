import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../test/test-utils';
import { Layout } from './Layout';

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
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
  });

  const renderLayout = () => {
    return render(<Layout />);
  };

  it('renders sidebar navigation and brand', () => {
    renderLayout();
    expect(screen.getByRole('img', { name: 'Zygo CMS' })).toBeDefined();
    expect(screen.getByText('v0.1')).toBeDefined();
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Content')).toBeDefined();
    expect(screen.getByText('Design')).toBeDefined();
    expect(screen.getByText('Admin')).toBeDefined();
    expect(screen.getByText('Dashboard')).toBeDefined();
    expect(screen.getByText('Posts')).toBeDefined();
    expect(screen.getByText('Pages')).toBeDefined();
    expect(screen.getByText('Page Templates')).toBeDefined();
    expect(screen.getByText('Posts Template')).toBeDefined();
    expect(screen.getByText('Docs Template')).toBeDefined();
    expect(screen.getByText('Media Library')).toBeDefined();
    expect(screen.getByText('Users')).toBeDefined();
    expect(screen.getByText('Theme')).toBeDefined();
    expect(screen.queryByText('Content Types')).toBeNull();
  });

  it('hides section header text labels when sidebar is collapsed while keeping navigation links accessible', () => {
    renderLayout();

    // Verify all 4 section headers are rendered initially
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Content')).toBeDefined();
    expect(screen.getByText('Design')).toBeDefined();
    expect(screen.getByText('Admin')).toBeDefined();

    // Click collapse button
    const collapseButton = screen.getByRole('button', { name: 'Collapse sidebar' });
    fireEvent.click(collapseButton);

    // Verify section header text labels are hidden
    expect(screen.queryByText('Overview')).toBeNull();
    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.queryByText('Design')).toBeNull();
    expect(screen.queryByText('Admin')).toBeNull();

    // Verify navigation links remain accessible by title
    expect(screen.getByTitle('Dashboard')).toBeDefined();
    expect(screen.getByTitle('Analytics')).toBeDefined();
    expect(screen.getByTitle('Pages')).toBeDefined();
    expect(screen.getByTitle('Posts')).toBeDefined();
    expect(screen.getByTitle('Media Library')).toBeDefined();
    expect(screen.getByTitle('Site Navigation')).toBeDefined();
    expect(screen.getByTitle('Page Templates')).toBeDefined();
    expect(screen.getByTitle('Posts Template')).toBeDefined();
    expect(screen.getByTitle('Docs Template')).toBeDefined();
    expect(screen.getByTitle('Theme')).toBeDefined();
    expect(screen.getByTitle('Users')).toBeDefined();
    expect(screen.getByTitle('Settings')).toBeDefined();
  });

  it('applies subtle gray background highlight on hover for inactive nav items', () => {
    renderLayout();

    const pagesText = screen.getByText('Pages');
    const pagesLink = pagesText.closest('a')!;
    const pagesFlex = pagesLink.firstElementChild as HTMLElement;

    expect(pagesFlex.style.backgroundColor).toBe('transparent');

    fireEvent.mouseEnter(pagesLink);
    expect(pagesFlex.style.backgroundColor).toBe('var(--gray-a3)');

    fireEvent.mouseLeave(pagesLink);
    expect(pagesFlex.style.backgroundColor).toBe('transparent');
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

  it('renders "View Live Site" link with default "/" when VITE_PUBLIC_SITE_URL is not set', () => {
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
    renderLayout();
    const liveSiteLink = screen.getByTestId('view-live-site-link');
    expect(liveSiteLink).toBeDefined();
    expect(liveSiteLink.getAttribute('href')).toBe('/');
    expect(liveSiteLink.getAttribute('target')).toBe('_blank');
  });

  it('renders "View Live Site" link pointing to public site URL when VITE_PUBLIC_SITE_URL is configured', () => {
    import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com';
    renderLayout();
    const liveSiteLink = screen.getByTestId('view-live-site-link');
    expect(liveSiteLink).toBeDefined();
    expect(liveSiteLink.getAttribute('href')).toBe('https://zygodactylstudios.com/');
    expect(liveSiteLink.getAttribute('target')).toBe('_blank');
  });
});
