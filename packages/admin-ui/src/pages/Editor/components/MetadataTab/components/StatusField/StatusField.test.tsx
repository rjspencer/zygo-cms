import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import { StatusField } from './StatusField';

describe('StatusField', () => {
  it('renders status label and draft/published buttons', () => {
    renderWithForm(<StatusField />, { status: 'draft' });

    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Draft' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Published' })).toBeDefined();
  });

  it('allows toggling status between draft and published', () => {
    renderWithForm(<StatusField />, { status: 'draft' });

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    const publishedBtn = screen.getByRole('button', { name: 'Published' });

    // Draft is initially solid, Published is soft
    expect(draftBtn.className).toContain('rt-variant-solid');
    expect(publishedBtn.className).toContain('rt-variant-soft');

    // Click Published
    fireEvent.click(publishedBtn);
    expect(draftBtn.className).toContain('rt-variant-soft');
    expect(publishedBtn.className).toContain('rt-variant-solid');

    // Click Draft
    fireEvent.click(draftBtn);
    expect(draftBtn.className).toContain('rt-variant-solid');
    expect(publishedBtn.className).toContain('rt-variant-soft');
  });
});
