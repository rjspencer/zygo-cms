import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { LinksTab } from './LinksTab';

vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../utils/api';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderLinksTab = (props: React.ComponentProps<typeof LinksTab>) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Theme>
        <LinksTab {...props} />
      </Theme>
    </QueryClientProvider>
  );
};

describe('LinksTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unsaved warning when entry is not saved', () => {
    renderLinksTab({
      entryId: '1',
      baseCanonicalUrl: 'https://example.com/post-1',
      isSaved: false,
    });

    expect(
      screen.getByText('Please save the entry first before generating trackable links.')
    ).toBeDefined();
  });

  it('renders unsaved warning when entryId is "new"', () => {
    renderLinksTab({
      entryId: 'new',
      baseCanonicalUrl: 'https://example.com/post-1',
      isSaved: true,
    });

    expect(
      screen.getByText('Please save the entry first before generating trackable links.')
    ).toBeDefined();
  });

  it('renders canonical URL and trackable links table when saved', async () => {
    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url === '/api/settings') {
        return {
          ok: true,
          json: async () => ({ canonical_origin: 'https://zygodactylstudios.com' }),
        };
      }
      if (url === '/api/entries/1/links') {
        return {
          ok: true,
          json: async () => [
            {
              id: 1,
              entry_id: 1,
              name: 'Spring Launch',
              url_params: 'utm_source=twitter&utm_medium=social',
              created_at: '2026-03-01T00:00:00Z',
            },
          ],
        };
      }
      return { ok: false, status: 404 };
    });

    renderLinksTab({
      entryId: '1',
      baseCanonicalUrl: '/my-post',
      isSaved: true,
    });

    expect(await screen.findByDisplayValue('https://zygodactylstudios.com/my-post')).toBeDefined();
    expect(await screen.findByText('Spring Launch')).toBeDefined();
    expect(screen.getByText('?utm_source=twitter&utm_medium=social')).toBeDefined();
  });

  it('displays empty state when no trackable links exist', async () => {
    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url === '/api/settings') {
        return {
          ok: true,
          json: async () => ({ canonical_origin: 'https://zygodactylstudios.com' }),
        };
      }
      if (url === '/api/entries/1/links') {
        return {
          ok: true,
          json: async () => [],
        };
      }
      return { ok: false, status: 404 };
    });

    renderLinksTab({
      entryId: '1',
      baseCanonicalUrl: 'https://example.com/my-post',
      isSaved: true,
    });

    expect(await screen.findByText('No trackable links created yet.')).toBeDefined();
  });

  it('opens create dialog, fills react-hook-form inputs, and submits new link', async () => {
    const user = userEvent.setup();

    (apiFetch as any).mockImplementation(async (url: string, opts?: RequestInit) => {
      if (url === '/api/settings') {
        return {
          ok: true,
          json: async () => ({ canonical_origin: 'https://zygodactylstudios.com' }),
        };
      }
      if (url === '/api/entries/1/links' && (!opts || opts.method !== 'POST')) {
        return {
          ok: true,
          json: async () => [],
        };
      }
      if (url === '/api/entries/1/links' && opts?.method === 'POST') {
        return {
          ok: true,
          json: async () => ({
            id: 2,
            entry_id: 1,
            name: 'Fall Newsletter',
            url_params: 'utm_source=email&utm_medium=newsletter&utm_campaign=fall_sale&ref=home',
            created_at: '2026-10-16T00:00:00Z',
          }),
        };
      }
      return { ok: false, status: 404 };
    });

    renderLinksTab({
      entryId: '1',
      baseCanonicalUrl: 'https://zygodactylstudios.com/my-post',
      isSaved: true,
    });

    const createNewBtn = await screen.findByRole('button', { name: 'Create New' });
    await user.click(createNewBtn);

    expect(await screen.findByText('Create Trackable Link')).toBeDefined();

    const nameInput = screen.getByPlaceholderText('e.g. Fall Newsletter');
    const sourceInput = screen.getByPlaceholderText('e.g. newsletter, twitter');
    const mediumInput = screen.getByPlaceholderText('e.g. email, social');
    const campaignInput = screen.getByPlaceholderText('e.g. fall_sale');
    const customInput = screen.getByPlaceholderText('e.g. affiliate_id=123&ref=home');

    await user.type(nameInput, 'Fall Newsletter');
    await user.type(sourceInput, 'email');
    await user.type(mediumInput, 'newsletter');
    await user.type(campaignInput, 'fall_sale');
    await user.type(customInput, 'ref=home');

    const submitBtn = screen.getByRole('button', { name: 'Create Link' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/entries/1/links',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Fall Newsletter',
            url_params: 'utm_source=email&utm_medium=newsletter&utm_campaign=fall_sale&ref=home',
          }),
        })
      );
    });
  });

  it('deletes trackable link when delete button is confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    (apiFetch as any).mockImplementation(async (url: string, opts?: RequestInit) => {
      if (url === '/api/settings') {
        return {
          ok: true,
          json: async () => ({}),
        };
      }
      if (url === '/api/entries/1/links') {
        return {
          ok: true,
          json: async () => [
            {
              id: 99,
              entry_id: 1,
              name: 'Link to Delete',
              url_params: 'utm_source=test',
              created_at: '2026-10-16T00:00:00Z',
            },
          ],
        };
      }
      if (url === '/api/links/99' && opts?.method === 'DELETE') {
        return {
          ok: true,
          json: async () => ({ success: true }),
        };
      }
      return { ok: false, status: 404 };
    });

    renderLinksTab({
      entryId: '1',
      baseCanonicalUrl: 'https://example.com/post',
      isSaved: true,
    });

    const deleteBtn = await screen.findByLabelText('Delete link Link to Delete');
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/links/99',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('associates Canonical URL label with the text input via htmlFor and id', async () => {
    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url === '/api/settings') {
        return {
          ok: true,
          json: async () => ({ canonical_origin: 'https://zygodactylstudios.com' }),
        };
      }
      if (url === '/api/entries/1/links') {
        return {
          ok: true,
          json: async () => [],
        };
      }
      return { ok: false, status: 404 };
    });

    renderLinksTab({
      entryId: '1',
      baseCanonicalUrl: '/my-post',
      isSaved: true,
    });

    const label = await screen.findByText('Canonical URL');
    expect(label.getAttribute('for')).toBe('canonical-url-input');

    const input = screen.getByLabelText('Canonical URL');
    expect(input.getAttribute('id')).toBe('canonical-url-input');
    expect(input.getAttribute('aria-label')).toBe('Canonical URL');
  });

  it('associates all form field labels with their respective inputs in CreateLinkDialog', async () => {
    const user = userEvent.setup();

    (apiFetch as any).mockImplementation(async (url: string) => {
      if (url === '/api/settings') {
        return {
          ok: true,
          json: async () => ({ canonical_origin: 'https://zygodactylstudios.com' }),
        };
      }
      if (url === '/api/entries/1/links') {
        return {
          ok: true,
          json: async () => [],
        };
      }
      return { ok: false, status: 404 };
    });

    renderLinksTab({
      entryId: '1',
      baseCanonicalUrl: 'https://zygodactylstudios.com/my-post',
      isSaved: true,
    });

    const createNewBtn = await screen.findByRole('button', { name: 'Create New' });
    await user.click(createNewBtn);

    expect(await screen.findByText('Create Trackable Link')).toBeDefined();

    const fields = [
      { labelText: 'Campaign Name (Internal)', expectedId: 'link-field-name' },
      { labelText: 'utm_source', expectedId: 'link-field-utm-source' },
      { labelText: 'utm_medium', expectedId: 'link-field-utm-medium' },
      { labelText: 'utm_campaign', expectedId: 'link-field-utm-campaign' },
      { labelText: 'Custom Parameters', expectedId: 'link-field-custom-params' },
    ];

    for (const { labelText, expectedId } of fields) {
      const label = screen.getByText(labelText);
      expect(label.getAttribute('for')).toBe(expectedId);
      const input = screen.getByLabelText(labelText);
      expect(input.getAttribute('id')).toBe(expectedId);
    }
  });
});
