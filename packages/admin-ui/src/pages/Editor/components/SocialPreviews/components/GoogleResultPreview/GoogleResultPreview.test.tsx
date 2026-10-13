import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { GoogleResultPreview } from './GoogleResultPreview';

describe('GoogleResultPreview', () => {
  it('renders Google Search Result heading and fallback values', () => {
    render(
      <Theme>
        <GoogleResultPreview entryType="post" slug="" title="" description="" />
      </Theme>
    );

    expect(screen.getByText('Google Search Result')).toBeDefined();
    expect(screen.getByText('https://example.com › post › slug')).toBeDefined();
    expect(screen.getByText('Untitled | Zygo CMS')).toBeDefined();
    expect(
      screen.getByText('Add a meta description to see how this page will appear in search results...')
    ).toBeDefined();
  });

  it('renders page entryType URL correctly', () => {
    render(
      <Theme>
        <GoogleResultPreview
          entryType="page"
          slug="about-us"
          title="About Us"
          description="About page description"
        />
      </Theme>
    );

    expect(screen.getByText('https://example.com › about-us')).toBeDefined();
    expect(screen.getByText('About Us | Zygo CMS')).toBeDefined();
    expect(screen.getByText('About page description')).toBeDefined();
  });

  it('renders doc entryType URL correctly', () => {
    render(
      <Theme>
        <GoogleResultPreview
          entryType="doc"
          slug="intro"
          title="Introduction"
          description="Docs introduction"
        />
      </Theme>
    );

    expect(screen.getByText('https://example.com › docs › intro')).toBeDefined();
    expect(screen.getByText('Introduction | Zygo CMS')).toBeDefined();
  });

  it('renders post entryType URL correctly', () => {
    render(
      <Theme>
        <GoogleResultPreview
          entryType="post"
          slug="my-first-post"
          title="My First Post"
          description="A blog post"
        />
      </Theme>
    );

    expect(screen.getByText('https://example.com › post › my-first-post')).toBeDefined();
    expect(screen.getByText('My First Post | Zygo CMS')).toBeDefined();
    expect(screen.getByText('A blog post')).toBeDefined();
  });
});
