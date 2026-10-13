import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { SlackPreview } from './SlackPreview';

describe('SlackPreview', () => {
  it('renders fallback title and description without image when empty', () => {
    render(
      <Theme>
        <SlackPreview title="" description="" coverImage="" />
      </Theme>
    );

    expect(screen.getByText('Slack Link Preview')).toBeDefined();
    expect(screen.getByText('Zygo CMS')).toBeDefined();
    expect(screen.getByText('Untitled')).toBeDefined();
    expect(screen.getByText('No description provided.')).toBeDefined();
    expect(screen.queryByRole('img', { name: 'Preview thumbnail' })).toBeNull();
  });

  it('renders custom title, description, and cover image thumbnail', () => {
    render(
      <Theme>
        <SlackPreview
          title="Special Announcement"
          description="We are launching soon"
          coverImage="https://example.com/banner.jpg"
        />
      </Theme>
    );

    expect(screen.getByText('Special Announcement')).toBeDefined();
    expect(screen.getByText('We are launching soon')).toBeDefined();

    const img = screen.getByRole('img', { name: 'Preview thumbnail' }) as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toBe('https://example.com/banner.jpg');
  });
});
