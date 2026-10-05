import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Navigation } from '../pages/Navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';

import { apiFetch } from '../utils/api';
vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const mockMenus = {
  header: {
    items_json: JSON.stringify([{ title: 'Home', url: '/', target: '_self', children: [] }]),
  },
  footer: {
    items_json: JSON.stringify([{ title: 'Privacy', url: '/privacy', target: '_self', children: [] }]),
  },
};

const mockPages = [
  { id: 1, title: 'About Us', slug: 'about', type: 'page', status: 'published' },
  { id: 2, title: 'Contact', slug: 'contact', type: 'page', status: 'published' },
];

describe('Navigation component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMockApi = () => {
    (apiFetch as any).mockImplementation((url: string) => {
      if (url === '/api/menus') {
        return Promise.resolve({
          ok: true,
          json: async () => mockMenus,
        });
      }
      if (url === '/api/entries') {
        return Promise.resolve({
          ok: true,
          json: async () => mockPages,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true }),
      });
    });
  };

  it('fetches menus and displays them', async () => {
    setupMockApi();

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <Navigation />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });

    const footerTab = screen.getByRole('tab', { name: /Footer Menu/i });
    await userEvent.click(footerTab);

    await waitFor(() => {
      expect(screen.getByText('Privacy')).toBeTruthy();
    });
  });

  it('selects a page from dropdown and auto-fills label if label is empty', async () => {
    setupMockApi();

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <Navigation />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });

    const urlInput = screen.getByRole('combobox', { name: /URL/i });
    await userEvent.click(urlInput);

    // Click on 'About Us' option in dropdown
    const aboutOption = await screen.findByText('About Us');
    await userEvent.click(aboutOption);

    // Label should be auto-filled with 'About Us'
    const labelInput = screen.getByLabelText(/Label/i) as HTMLInputElement;
    expect(labelInput.value).toBe('About Us');

    // Add link
    const addButton = screen.getByRole('button', { name: /Add Link/i });
    await userEvent.click(addButton);

    // Newly added item should appear in the table
    const tableItems = screen.getAllByText('About Us');
    expect(tableItems.length).toBeGreaterThan(0);
    expect(screen.getByText('/about')).toBeTruthy();

    // Save changes
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/menus/header',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('/about'),
        })
      );
    });
  });

  it('does not overwrite existing label when page is selected', async () => {
    setupMockApi();

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <Navigation />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });

    // Enter a custom label first
    const labelInput = screen.getByLabelText(/Label/i) as HTMLInputElement;
    await userEvent.type(labelInput, 'Company Overview');

    // Now select a page
    const urlInput = screen.getByRole('combobox', { name: /URL/i });
    await userEvent.click(urlInput);
    const aboutOption = await screen.findByText('About Us');
    await userEvent.click(aboutOption);

    // Label should NOT be overwritten
    expect(labelInput.value).toBe('Company Overview');
  });

  it('selects custom option, reveals external URL field, and warns if not absolute', async () => {
    setupMockApi();

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <Navigation />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Home')).toBeTruthy();
    });

    // Click on URL field to open dropdown
    const urlInput = screen.getByRole('combobox', { name: /URL/i });
    await userEvent.click(urlInput);

    // Select custom option
    const customOption = await screen.findByText(/Custom \(External URL\)/i);
    await userEvent.click(customOption);

    // External URL text field should be revealed
    const externalUrlInput = screen.getByLabelText(/External URL/i);
    expect(externalUrlInput).toBeTruthy();

    // Type non-absolute URL
    await userEvent.type(externalUrlInput, 'google.com');

    // Warning should be displayed
    expect(
      screen.getByText(/Warning: External URLs should be absolute/i)
    ).toBeTruthy();

    // Fix to absolute URL
    await userEvent.clear(externalUrlInput);
    await userEvent.type(externalUrlInput, 'https://google.com');

    // Warning should disappear
    expect(
      screen.queryByText(/Warning: External URLs should be absolute/i)
    ).toBeNull();

    // Fill label and add
    const labelInput = screen.getByLabelText(/Label/i);
    await userEvent.type(labelInput, 'Google');

    const addButton = screen.getByRole('button', { name: /Add Link/i });
    await userEvent.click(addButton);

    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.getByText('https://google.com')).toBeTruthy();
  });
});
