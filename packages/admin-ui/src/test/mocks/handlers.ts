import { http, HttpResponse } from 'msw';

export const mockDashboardMetrics = {
  post_count: 10,
  page_count: 5,
  author_count: 2,
  auth_url: '/cdn-cgi/access/logout?custom=true',
};

export const mockEntries = [
  {
    id: 1,
    title: 'First Blog Post',
    slug: 'first-blog-post',
    type: 'post',
    status: 'published',
    body_html: '<p>Welcome to Zygo CMS</p>',
    body_json: '{}',
    published_at: '2026-10-01 10:00:00',
    created_at: '2026-10-01 10:00:00',
    updated_at: '2026-10-01 10:00:00',
  },
  {
    id: 2,
    title: 'About Zygo',
    slug: 'about-zygo',
    type: 'page',
    status: 'published',
    body_html: '<p>About page content</p>',
    body_json: '{}',
    published_at: '2026-10-01 11:00:00',
    created_at: '2026-10-01 11:00:00',
    updated_at: '2026-10-01 11:00:00',
  },
  {
    id: 3,
    title: 'Draft Announcement',
    slug: 'draft-announcement',
    type: 'post',
    status: 'draft',
    body_html: '<p>Draft post content</p>',
    body_json: '{}',
    published_at: null,
    created_at: '2026-10-01 12:00:00',
    updated_at: '2026-10-01 12:00:00',
  },
];

export const mockCurrentUser = {
  id: 1,
  email: 'admin@zygodactyl.io',
  display_name: 'Admin User',
  role: 'admin',
};

export const mockUsers = [
  {
    id: 1,
    email: 'admin@zygodactyl.io',
    display_name: 'Admin User',
    role: 'admin',
    created_at: '2026-01-01 00:00:00',
  },
  {
    id: 2,
    email: 'editor@zygodactyl.io',
    display_name: 'Content Editor',
    role: 'editor',
    created_at: '2026-01-02 00:00:00',
  },
];

export const mockMedia = [
  {
    key: 'hero.png',
    filename: 'hero.png',
    size: 20480,
    uploaded_at: '2026-10-01 09:00:00',
    url: '/media/hero.png',
  },
];

export const handlers = [
  // Dashboard metrics
  http.get('*/api/admin/dashboard', () => {
    return HttpResponse.json(mockDashboardMetrics);
  }),

  // Entries
  http.get('*/api/entries', () => {
    return HttpResponse.json(mockEntries);
  }),

  // Current user info
  http.get('*/api/me', () => {
    return HttpResponse.json(mockCurrentUser);
  }),

  // Users management
  http.get('*/api/admin/users', () => {
    return HttpResponse.json(mockUsers);
  }),

  // Media
  http.get('*/api/media', () => {
    return HttpResponse.json(mockMedia);
  }),
];
