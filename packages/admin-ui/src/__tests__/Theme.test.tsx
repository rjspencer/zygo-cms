import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeEditor, cleanGoogleFontUrl } from '../components/ThemeEditor';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../utils/api';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const ThemeWithRouter = () => {
  const [router] = useState(() =>
    createMemoryRouter([{ path: '*', element: <ThemeEditor /> }])
  );
  return <RouterProvider router={router} />;
};

describe('ThemeEditor component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cleanGoogleFontUrl extracts URL from <link> tag correctly', () => {
    const rawTag =
      '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap" rel="stylesheet">';
    expect(cleanGoogleFontUrl(rawTag)).toBe(
      'https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap'
    );

    const directUrl =
      'https://fonts.googleapis.com/css2?family=Lora&display=swap';
    expect(cleanGoogleFontUrl(directUrl)).toBe(directUrl);
  });

  it('fetches existing theme settings and populates fields', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        theme_font_url: 'https://fonts.googleapis.com/css2?family=Cinzel&display=swap',
        theme_font_headline: "'Cinzel', serif",
        theme_font_body: "'Lora', serif",
        theme_color_bg: '#fcfcfc',
        theme_color_text: '#111111',
        theme_color_accent: '#b91c1c',
        theme_header_layout: 'split',
        theme_header_border_style: 'solid',
        theme_header_title_size: '2.5rem',
        theme_header_tagline: 'Custom Editorial Journal',
      }),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('https://fonts.googleapis.com/css2?family=Cinzel&display=swap')
      ).toBeTruthy();
      expect(screen.getByDisplayValue("'Cinzel', serif")).toBeTruthy();
      expect(screen.getAllByDisplayValue('#b91c1c').length).toBe(2);
      expect(screen.getByDisplayValue('2.5rem')).toBeTruthy();
      expect(screen.getByDisplayValue('Custom Editorial Journal')).toBeTruthy();
    });
  });

  it('applies a curated font preset when clicked', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    // Look for preset card
    const presetCard = await screen.findByText(/Playfair Display & Source Sans/i);
    fireEvent.click(presetCard);

    expect(
      screen.getByDisplayValue("'Playfair Display', Georgia, serif")
    ).toBeTruthy();
  });

  it('allows switching header layout and updates preview dynamically', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    // Initially centered header layout is active by default in Modern Editorial
    expect(await screen.findByTestId('preview-header-centered')).toBeTruthy();

    // Click Split Bar layout option
    const splitOption = screen.getByText('Split Bar');
    fireEvent.click(splitOption);

    // The live preview should switch to the split header
    expect(screen.getByTestId('preview-header-split')).toBeTruthy();

    // Click Stacked Minimal layout option
    const stackedOption = screen.getByText('Stacked Minimal');
    fireEvent.click(stackedOption);

    // The live preview should switch to stacked header
    expect(screen.getByTestId('preview-header-stacked')).toBeTruthy();
  });

  it('allows customizing header border style and navigation lettering', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    // Click "Single Solid" border option
    const solidBorder = await screen.findByText('Single Solid');
    fireEvent.click(solidBorder);

    // Toggle navigation lettering to Normal Case
    const normalCaseBtn = screen.getByRole('button', { name: 'Normal Case' });
    fireEvent.click(normalCaseBtn);

    const saveButton = screen.getByRole('button', { name: /^Save$/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);
  });

  it('saves updated theme tokens to a custom theme or switches active live theme via /api/settings', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        theme_color_accent: '#991b1b',
        theme_header_layout: 'centered',
        theme_active_name: 'Modern Editorial',
      }),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('#991b1b').length).toBe(2);
    });

    const saveButton = screen.getByRole('button', { name: /^Save$/i }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    // Switch to Split layout
    const splitOption = screen.getByText('Split Bar');
    fireEvent.click(splitOption);

    expect(saveButton.disabled).toBe(false);

    // Clicking Save on a modified built-in theme opens the Save As dialog prefilled with "Modern Editorial Custom"
    await user.click(saveButton);

    const nameInput = await screen.findByLabelText(/Theme Name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Modern Editorial Custom');

    const confirmSaveBtn = screen.getByRole('button', { name: /Save Custom Theme/i });
    await user.click(confirmSaveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Modern Editorial Custom'),
        })
      );
    });
  });

  it('switches between Modern Editorial and Bento-Brutalism in preview without affecting live site, and switches live site on Switch to click', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        theme_active_name: 'Modern Editorial',
      }),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    const activeIndicator = await screen.findByTestId('active-theme-indicator');
    expect(activeIndicator.textContent).toContain('Active theme: Modern Editorial');

    const switchToBtn = screen.getByRole('button', { name: /Switch to:/i }) as HTMLButtonElement;
    expect(switchToBtn.disabled).toBe(true);
    expect(switchToBtn.textContent).toContain('Switch to: Modern Editorial');

    // Open Theme Picker dropdown and pick Bento-Brutalism
    const pickerTrigger = screen.getByRole('combobox', { name: /Theme Picker/i });
    fireEvent.keyDown(pickerTrigger, { key: ' ' });
    const bentoOption = await screen.findByRole('option', { name: 'Bento-Brutalism' });
    fireEvent.click(bentoOption);

    // Verify Bento-Brutalism tokens loaded into preview without calling POST /api/settings
    await waitFor(() => {
      expect(screen.getAllByDisplayValue('#007799').length).toBe(2);
    });
    expect(apiFetch).not.toHaveBeenCalledWith(
      '/api/settings',
      expect.objectContaining({ method: 'POST' })
    );

    // Active theme is still Modern Editorial, while Switch to button now targets Bento-Brutalism
    expect(screen.getByTestId('active-theme-indicator').textContent).toContain(
      'Active theme: Modern Editorial'
    );
    expect(switchToBtn.disabled).toBe(false);
    expect(switchToBtn.textContent).toContain('Switch to: Bento-Brutalism');

    // Click "Switch to: Bento-Brutalism" to activate it on the live site
    await user.click(switchToBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"theme_active_name":"Bento-Brutalism"'),
        })
      );
    });
  });

  it('warns user with an Are you sure popup when switching themes with unsaved changes', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await screen.findByText('The Zygo Review');

    // Make an unsaved modification
    const splitOption = screen.getByText('Split Bar');
    fireEvent.click(splitOption);

    // Try picking Bento-Brutalism from the Theme Picker dropdown
    const pickerTrigger = screen.getByRole('combobox', { name: /Theme Picker/i });
    fireEvent.keyDown(pickerTrigger, { key: ' ' });
    const bentoOption = await screen.findByRole('option', { name: 'Bento-Brutalism' });
    fireEvent.click(bentoOption);

    // Unsaved changes warning dialog should appear
    expect(
      await screen.findByText(/Are you sure you want to switch themes\?/i)
    ).toBeTruthy();

    // Clicking Cancel keeps our unsaved changes on Modern Editorial
    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    await user.click(cancelBtn);
    expect(screen.getAllByDisplayValue('#991b1b').length).toBe(2);

    // Try switching again and confirm Discard Changes & Switch
    fireEvent.keyDown(pickerTrigger, { key: ' ' });
    const bentoOptionAgain = await screen.findByRole('option', { name: 'Bento-Brutalism' });
    fireEvent.click(bentoOptionAgain);

    const discardBtn = await screen.findByRole('button', {
      name: /Discard Changes & Switch/i,
    });
    await user.click(discardBtn);

    // Now Bento-Brutalism is loaded (#007799 cyan accent)
    await waitFor(() => {
      expect(screen.getAllByDisplayValue('#007799').length).toBe(2);
    });
  });

  it('prefills "<base-theme> Custom" in Save As dialog and lists saved custom theme in dropdown', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    await screen.findByText('The Zygo Review');

    // Switch to Bento-Brutalism first
    const pickerTrigger = screen.getByRole('combobox', { name: /Theme Picker/i });
    fireEvent.keyDown(pickerTrigger, { key: ' ' });
    const bentoOption = await screen.findByRole('option', { name: 'Bento-Brutalism' });
    fireEvent.click(bentoOption);

    // Click "Save As..." button
    const saveAsBtn = screen.getByRole('button', { name: /Save As\.\.\./i });
    await user.click(saveAsBtn);

    const nameInput = (await screen.findByLabelText(/Theme Name/i)) as HTMLInputElement;
    expect(nameInput.value).toBe('Bento-Brutalism Custom');

    const confirmBtn = screen.getByRole('button', { name: /Save Custom Theme/i });
    await user.click(confirmBtn);

    // Verify the custom theme now appears as the selected value in the Theme Picker
    await waitFor(() => {
      expect(pickerTrigger.textContent).toContain('Bento-Brutalism Custom');
    });
  });

  it('toggles between Editorial / Bento and Docs Layout in the Live Preview', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const user = userEvent.setup();
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    expect(await screen.findByTestId('editorial-preview-container')).toBeTruthy();

    const docsModeBtn = screen.getByRole('button', { name: /Docs Layout/i });
    await user.click(docsModeBtn);

    expect(await screen.findByTestId('preview-mode-docs')).toBeTruthy();
    expect(screen.getByText('Edge Caching & Invalidation')).toBeTruthy();
  });

  it('renders Google Fonts link and instructions', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Browse Google Fonts')).toBeTruthy();
    const googleLink = screen.getByRole('link', { name: /Open Google Fonts/i });
    expect(googleLink.getAttribute('href')).toBe('https://fonts.google.com');
    expect(screen.getByText(/How to copy fonts back to Zygo:/i)).toBeTruthy();
  });

  it('renders the Live Editorial Preview with live styled elements', async () => {
    (apiFetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Theme>
          <ThemeWithRouter />
        </Theme>
      </QueryClientProvider>
    );

    expect(await screen.findByText('The Zygo Review')).toBeTruthy();
    expect(
      screen.getByText('The Architecture of the Modern Digital Essay')
    ).toBeTruthy();
    expect(screen.getByTestId('editorial-preview-container')).toBeTruthy();
  });
});

