import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { IMessagePreview } from './IMessagePreview';

describe('IMessagePreview', () => {
  it('renders fallback title and domain without cover image when empty', () => {
    render(
      <Theme>
        <IMessagePreview title="" coverImage="" />
      </Theme>
    );

    expect(screen.getByText('iMessage Preview')).toBeDefined();
    expect(screen.getByText('Untitled')).toBeDefined();
    expect(screen.getByText('example.com')).toBeDefined();
    expect(screen.queryByRole('img', { name: 'Cover preview' })).toBeNull();
  });

  it('renders custom title and cover image', () => {
    render(
      <Theme>
        <IMessagePreview title="Feature Update" coverImage="https://example.com/cover.png" />
      </Theme>
    );

    expect(screen.getByText('Feature Update')).toBeDefined();
    expect(screen.getByText('example.com')).toBeDefined();

    const img = screen.getByRole('img', { name: 'Cover preview' }) as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toBe('https://example.com/cover.png');
  });
});
