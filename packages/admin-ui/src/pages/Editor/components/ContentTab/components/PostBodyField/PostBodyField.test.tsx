import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import { PostBodyField } from './PostBodyField';

describe('PostBodyField', () => {
  it('renders Body Content label and Post Body editor for post entryType', () => {
    const onEditorReady = vi.fn();
    renderWithForm(
      <PostBodyField entryType="post" onEditorReady={onEditorReady} />,
      { content: '<p>Initial post content</p>' }
    );

    const bodyContentLabel = screen.getByText('Body Content');
    expect(bodyContentLabel).toBeDefined();
    expect(bodyContentLabel.getAttribute('id')).toBe('post-body-content-label');
    expect(screen.getByRole('textbox', { name: 'Post Body' })).toBeDefined();
    expect(screen.getByText('Initial post content')).toBeDefined();
    expect(onEditorReady).toHaveBeenCalled();
  });

  it('renders Doc Body editor for doc entryType', () => {
    renderWithForm(
      <PostBodyField entryType="doc" />,
      { content: '<p>Initial doc content</p>' }
    );

    expect(screen.getByRole('textbox', { name: 'Doc Body' })).toBeDefined();
  });
});
