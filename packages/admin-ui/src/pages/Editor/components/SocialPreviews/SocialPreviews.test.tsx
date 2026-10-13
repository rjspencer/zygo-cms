import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { SocialPreviews } from './SocialPreviews';
import { renderWithForm } from '../../testUtils/renderWithForm';

describe('SocialPreviews', () => {
  it('renders the header box and fallbacks when form values are empty', () => {
    renderWithForm(<SocialPreviews entryType="page" />);

    expect(screen.getByText('Search & Social Previews')).toBeDefined();
    expect(
      screen.getByText('Visual preview of how your content appears when shared across platforms.')
    ).toBeDefined();

    expect(screen.getByText('Google Search Result')).toBeDefined();
    expect(screen.getByText('Slack Link Preview')).toBeDefined();
    expect(screen.getByText('iMessage Preview')).toBeDefined();

    expect(screen.getByText('https://example.com › slug')).toBeDefined();
    expect(screen.getByText('Untitled | Zygo CMS')).toBeDefined();
    expect(screen.getByText('No description provided.')).toBeDefined();
  });

  it('renders all three previews with values from the form context', () => {
    renderWithForm(
      <SocialPreviews entryType="post" />,
      {
        title: 'Hello World',
        slug: 'hello-world',
        description: 'A great post about things',
        coverImage: 'https://example.com/featured.png',
      }
    );

    expect(screen.getByText('Google Search Result')).toBeDefined();
    expect(screen.getByText('https://example.com › post › hello-world')).toBeDefined();
    expect(screen.getByText('Hello World | Zygo CMS')).toBeDefined();
    expect(screen.getAllByText('A great post about things')).toHaveLength(2);

    expect(screen.getByText('Slack Link Preview')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Preview thumbnail' })).toBeDefined();

    expect(screen.getByText('iMessage Preview')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Cover preview' })).toBeDefined();
  });

  it('renders doc entryType URL format correctly', () => {
    renderWithForm(
      <SocialPreviews entryType="doc" />,
      {
        slug: 'getting-started',
        title: 'Getting Started',
      }
    );

    expect(screen.getByText('https://example.com › docs › getting-started')).toBeDefined();
    expect(screen.getByText('Getting Started | Zygo CMS')).toBeDefined();
  });
});
