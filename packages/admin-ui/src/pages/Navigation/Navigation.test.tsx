import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Navigation } from './Navigation';
import { render } from '../../test/test-utils';

import { apiFetch } from '../../utils/api';
vi.mock('../../utils/api', () => ({
  apiFetch: vi.fn(),
}));

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

  const renderNavigation = (initialEntries = ['/navigation']) => {
    return render(<Navigation />, {
      routerInitialEntries: initialEntries,
    });
  };

  it('fetches menus and displays them', async () => {
    const user = userEvent.setup();
    setupMockApi();
    renderNavigation();

    const homeItem = await screen.findByText('Home');
    expect(homeItem.textContent).toBe('Home');

    const footerTab = screen.getByRole('tab', { name: /Footer Menu/i });
    expect(footerTab.getAttribute('aria-selected')).toBe('false');
    await user.click(footerTab);
    expect(footerTab.getAttribute('aria-selected')).toBe('true');

    const privacyItem = await screen.findByText('Privacy');
    expect(privacyItem.textContent).toBe('Privacy');
  });

  it('initializes to footer menu tab when tab search param is present', async () => {
    setupMockApi();
    renderNavigation(['/navigation?tab=footer']);

    const privacyItem = await screen.findByText('Privacy');
    expect(privacyItem.textContent).toBe('Privacy');

    const footerTab = screen.getByRole('tab', { name: /Footer Menu/i });
    expect(footerTab.getAttribute('aria-selected')).toBe('true');
  });

  it('selects a page from dropdown and auto-fills label if label is empty', async () => {
    const user = userEvent.setup();
    setupMockApi();
    renderNavigation();

    await screen.findByText('Home');

    const urlInput = screen.getByRole('combobox', { name: /URL/i });
    expect(urlInput.getAttribute('id')).toBe('page-select-combobox-input');
    expect(urlInput.getAttribute('aria-controls')).toBe('page-select-listbox');
    expect(urlInput.getAttribute('aria-expanded')).toBe('false');
    await user.click(urlInput);
    expect(urlInput.getAttribute('aria-expanded')).toBe('true');

    // Click on 'About Us' option in dropdown
    const aboutOption = await screen.findByText('About Us');
    await user.click(aboutOption);

    // Listbox dropdown unmounts
    expect(screen.queryByRole('listbox')).toBeNull();

    // Label should be auto-filled with 'About Us'
    const labelInput = screen.getByLabelText(/Label/i) as HTMLInputElement;
    expect(labelInput.getAttribute('id')).toBe('menu-item-label-input');
    expect(labelInput.value).toBe('About Us');

    // Add link
    const addButton = screen.getByRole('button', { name: /Add Link/i });
    await user.click(addButton);

    // Newly added item should appear in the table
    const tableItems = screen.getAllByText('About Us');
    expect(tableItems.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('/about').textContent).toBe('/about');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    await screen.findByRole('button', { name: /Saved!/i });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/menus/header',
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('/about'),
      })
    );
  });

  it('does not overwrite existing label when page is selected', async () => {
    const user = userEvent.setup();
    setupMockApi();
    renderNavigation();

    await screen.findByText('Home');

    // Enter a custom label first
    const labelInput = screen.getByLabelText(/Label/i) as HTMLInputElement;
    await user.type(labelInput, 'Company Overview');
    expect(labelInput.value).toBe('Company Overview');

    // Now select a page
    const urlInput = screen.getByRole('combobox', { name: /URL/i });
    await user.click(urlInput);
    const aboutOption = await screen.findByText('About Us');
    await user.click(aboutOption);

    expect(screen.queryByRole('listbox')).toBeNull();

    // Label should NOT be overwritten
    expect(labelInput.value).toBe('Company Overview');
  });

  it('selects custom option, reveals external URL field, and warns if not absolute', async () => {
    const user = userEvent.setup();
    setupMockApi();
    renderNavigation();

    await screen.findByText('Home');

    // Click on URL field to open dropdown
    const urlInput = screen.getByRole('combobox', { name: /URL/i });
    expect(urlInput.getAttribute('id')).toBe('page-select-combobox-input');
    expect(urlInput.getAttribute('aria-controls')).toBe('page-select-listbox');
    expect(urlInput.getAttribute('aria-expanded')).toBe('false');
    await user.click(urlInput);

    // Listbox should be visible
    expect(screen.getByRole('listbox')).not.toBeNull();

    // Select custom option
    const customOption = await screen.findByText(/Custom \(External URL\)/i);
    await user.click(customOption);

    expect(screen.queryByRole('listbox')).toBeNull();

    // External URL text field should be revealed
    const externalUrlInput = screen.getByLabelText(/External URL/i);
    expect(externalUrlInput.getAttribute('id')).toBe('custom-url-input');

    // Type non-absolute URL
    await user.type(externalUrlInput, 'google.com');

    // Warning should be displayed
    const warning = screen.getByRole('alert');
    expect(warning.textContent).toContain('Warning: External URLs should be absolute');
    expect(warning.getAttribute('id')).toBe('custom-url-warning');
    expect(externalUrlInput.getAttribute('aria-invalid')).toBe('true');
    expect(externalUrlInput.getAttribute('aria-describedby')).toBe('custom-url-warning');

    // Fix to absolute URL
    await user.clear(externalUrlInput);
    await user.type(externalUrlInput, 'https://google.com');

    // Warning should disappear
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen.queryByText(/Warning: External URLs should be absolute/i)
    ).toBeNull();
    expect(externalUrlInput.getAttribute('aria-invalid')).toBe('false');
    expect(externalUrlInput.getAttribute('aria-describedby')).toBeNull();

    // Fill label and add
    const labelInput = screen.getByLabelText(/Label/i);
    expect(labelInput.getAttribute('id')).toBe('menu-item-label-input');
    await user.type(labelInput, 'Google');
    expect((labelInput as HTMLInputElement).value).toBe('Google');

    const addButton = screen.getByRole('button', { name: /Add Link/i });
    await user.click(addButton);

    expect(screen.getByText('Google').textContent).toBe('Google');
    expect(screen.getByText('https://google.com').textContent).toBe('https://google.com');
  });

  it('deletes an item from the menu list', async () => {
    const user = userEvent.setup();
    setupMockApi();
    renderNavigation();

    await screen.findByText('Home');

    const removeBtn = screen.getByRole('button', { name: /Remove Home/i });
    await user.click(removeBtn);

    expect(screen.queryByText('Home')).toBeNull();
    expect(screen.getByText('No items in this menu.').textContent).toBe('No items in this menu.');
  });
});
