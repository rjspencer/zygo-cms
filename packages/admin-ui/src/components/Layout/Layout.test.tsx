import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders sidebar navigation and brand', async () => {
    renderLayout();
    expect(await screen.findByText('editor@zygodactyl.io')).not.toBeNull();
    const logoImg = screen.getByRole('img', { name: 'Zygo CMS' });
    expect(logoImg.getAttribute('alt')).toBe('Zygo CMS');
    expect(screen.getByText('v0.1').textContent).toBe('v0.1');
    expect(screen.getByText('Overview').textContent).toBe('Overview');
    expect(screen.getByText('Content').textContent).toBe('Content');
    expect(screen.getByText('Design').textContent).toBe('Design');
    expect(screen.getByText('Admin').textContent).toBe('Admin');
    expect(screen.getByText('Dashboard').textContent).toBe('Dashboard');
    expect(screen.getByText('Posts').textContent).toBe('Posts');
    expect(screen.getByText('Pages').textContent).toBe('Pages');
    expect(screen.getByText('Page Templates').textContent).toBe('Page Templates');
    expect(screen.getByText('Posts Template').textContent).toBe('Posts Template');
    expect(screen.getByText('Docs Template').textContent).toBe('Docs Template');
    expect(screen.getByText('Submissions').textContent).toBe('Submissions');
    expect(screen.getByText('Media Library').textContent).toBe('Media Library');
    expect(screen.getByText('Users').textContent).toBe('Users');
    expect(screen.getByText('Theme').textContent).toBe('Theme');
    expect(screen.queryByText('Content Types')).toBeNull();
  });

  it('hides section header text labels when sidebar is collapsed while keeping navigation links accessible', async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(await screen.findByText('editor@zygodactyl.io')).not.toBeNull();

    // Verify all 4 section headers are rendered initially
    expect(screen.getByText('Overview').textContent).toBe('Overview');
    expect(screen.getByText('Content').textContent).toBe('Content');
    expect(screen.getByText('Design').textContent).toBe('Design');
    expect(screen.getByText('Admin').textContent).toBe('Admin');

    // Click collapse button
    const collapseButton = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(collapseButton.hasAttribute('disabled')).toBe(false);
    await user.click(collapseButton);

    // Verify section header text labels are hidden
    expect(screen.queryByText('Overview')).toBeNull();
    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.queryByText('Design')).toBeNull();
    expect(screen.queryByText('Admin')).toBeNull();

    // Verify navigation links remain accessible by title
    expect(screen.getByTitle('Dashboard').getAttribute('href')).toBe('/');
    expect(screen.getByTitle('Analytics').getAttribute('href')).toBe('/analytics');
    expect(screen.getByTitle('Pages').getAttribute('href')).toBe('/pages');
    expect(screen.getByTitle('Posts').getAttribute('href')).toBe('/posts');
    expect(screen.getByTitle('Submissions').getAttribute('href')).toBe('/submissions');
    expect(screen.getByTitle('Media Library').getAttribute('href')).toBe('/media');
    expect(screen.getByTitle('Site Navigation').getAttribute('href')).toBe('/navigation');
    expect(screen.getByTitle('Page Templates').getAttribute('href')).toBe('/templates');
    expect(screen.getByTitle('Posts Template').getAttribute('href')).toBe('/templates/posts');
    expect(screen.getByTitle('Docs Template').getAttribute('href')).toBe('/templates/docs');
    expect(screen.getByTitle('Theme').getAttribute('href')).toBe('/theme');
    expect(screen.getByTitle('Users').getAttribute('href')).toBe('/users');
    expect(screen.getByTitle('Settings').getAttribute('href')).toBe('/settings');
  });

  it('applies subtle gray background highlight on hover for inactive nav items', async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(await screen.findByText('editor@zygodactyl.io')).not.toBeNull();

    const pagesText = screen.getByText('Pages');
    const pagesLink = pagesText.closest('a')!;
    const pagesFlex = pagesLink.firstElementChild as HTMLElement;

    expect(pagesFlex.style.backgroundColor).toBe('transparent');

    await user.hover(pagesLink);
    expect(pagesFlex.style.backgroundColor).toBe('var(--gray-a3)');

    await user.unhover(pagesLink);
    expect(pagesFlex.style.backgroundColor).toBe('transparent');
  });

  it('fetches user info and updates user email and logout link', async () => {
    renderLayout();

    // Verify user email is updated from /api/me
    const emailEl = await screen.findByText('editor@zygodactyl.io');
    expect(emailEl.textContent).toBe('editor@zygodactyl.io');

    // Verify logout link points to auth_url returned by /api/admin/dashboard
    const logoutLink = screen.getByTestId('logout-link');
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
    const adminUser = await screen.findByText('Admin User');
    expect(adminUser.textContent).toBe('Admin User');
  });

  it('renders "View Live Site" link with default "/" when VITE_PUBLIC_SITE_URL is not set', () => {
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
    renderLayout();
    const liveSiteLink = screen.getByTestId('view-live-site-link');
    expect(liveSiteLink.getAttribute('href')).toBe('/');
    expect(liveSiteLink.getAttribute('target')).toBe('_blank');
  });

  it('renders "View Live Site" link pointing to public site URL when VITE_PUBLIC_SITE_URL is configured', () => {
    import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com';
    renderLayout();
    const liveSiteLink = screen.getByTestId('view-live-site-link');
    expect(liveSiteLink.getAttribute('href')).toBe('https://zygodactylstudios.com/');
    expect(liveSiteLink.getAttribute('target')).toBe('_blank');
  });

  it('renders unread submissions count badge in navigation when unread submissions exist', async () => {
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
        if (url.includes('/api/submissions/stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ unread_count: 7 }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );

    renderLayout();
    const badge = await screen.findByText('7');
    expect(badge.textContent).toBe('7');
  });
});
