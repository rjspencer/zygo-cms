import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it, vi } from 'vitest';
import type { SectionTemplate } from '../../../../../../../../types/sectionTemplate';
import { AddSectionSelect } from './AddSectionSelect';

const mockTemplates: SectionTemplate[] = [
  { id: 'hero', name: 'Hero Banner', schema_json: '[]' },
  { id: 'features', name: 'Features Grid', schema_json: '[]' },
];

describe('AddSectionSelect', () => {
  it('renders trigger with "Add Section..." placeholder', () => {
    const onAdd = vi.fn();
    render(
      <Theme>
        <AddSectionSelect sectionTemplates={mockTemplates} onAddSection={onAdd} />
      </Theme>
    );

    expect(screen.getByText('Add Section...')).toBeDefined();
  });
});
