import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it, vi } from 'vitest';
import type { SectionInstance, SectionTemplate } from '../../../../../../../../types/sectionTemplate';
import { SectionCard } from './SectionCard';
import { parseTemplateFields } from './parseTemplateFields';

const mockTemplate: SectionTemplate = {
  id: 'hero',
  name: 'Hero Section',
  schema_json: JSON.stringify([
    { name: 'headline', type: 'text', label: 'Headline' },
  ]),
};

const mockSection: SectionInstance = {
  type_id: 'hero',
  data: { headline: 'Welcome to Zygo' },
};

describe('parseTemplateFields', () => {
  it('returns empty array when template is null or undefined or schema_json is empty', () => {
    expect(parseTemplateFields(null)).toEqual([]);
    expect(parseTemplateFields(undefined)).toEqual([]);
    expect(parseTemplateFields({ id: '1', name: 'Test', schema_json: '' })).toEqual([]);
  });

  it('parses valid JSON string schema_json', () => {
    const fields = parseTemplateFields(mockTemplate);
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('headline');
  });

  it('handles object schema_json gracefully', () => {
    const fields = parseTemplateFields({
      id: '2',
      name: 'Test',
      schema_json: [{ name: 'title', type: 'text', label: 'Title' }] as any,
    });
    expect(fields).toHaveLength(1);
    expect(fields[0].name).toBe('title');
  });

  it('returns empty array on invalid JSON string', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fields = parseTemplateFields({
      id: '3',
      name: 'Broken',
      schema_json: '{invalid-json',
    });
    expect(fields).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('SectionCard', () => {
  const createProps = (overrides?: Partial<React.ComponentProps<typeof SectionCard>>) => ({
    section: mockSection,
    index: 0,
    totalSections: 2,
    template: mockTemplate,
    isExpanded: true,
    onToggleExpand: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onDelete: vi.fn(),
    onChangeData: vi.fn(),
    ...overrides,
  });

  it('renders template name and expand/collapse button', async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(
      <Theme>
        <SectionCard {...props} />
      </Theme>
    );

    const templateHeading = screen.getByText('Hero Section');
    expect(templateHeading.textContent).toBe('Hero Section');
    const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });
    expect(collapseBtn.getAttribute('aria-label')).toBe('Collapse section');

    await user.click(collapseBtn);
    expect(props.onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it('displays "Missing template" when template is not found', () => {
    const props = createProps({
      section: { type_id: 'unknown_tpl', data: {} },
      template: undefined,
    });

    render(
      <Theme>
        <SectionCard {...props} />
      </Theme>
    );

    const missingTitle = screen.getByText('Missing template');
    expect(missingTitle.textContent).toBe('Missing template');
    const missingTypeId = screen.getByText('(unknown_tpl)');
    expect(missingTypeId.textContent).toBe('(unknown_tpl)');
    const warningMessage = screen.getByText(
      'This section uses a template (unknown_tpl) that cannot be found. You can remove it using the delete button above.'
    );
    expect(warningMessage.textContent).toContain('cannot be found');
  });

  it('handles move up, move down, and delete actions', async () => {
    const user = userEvent.setup();
    const props = createProps({ index: 0, totalSections: 3 });
    render(
      <Theme>
        <SectionCard {...props} />
      </Theme>
    );

    const moveUpBtn = screen.getByRole('button', { name: 'Move section up' });
    const moveDownBtn = screen.getByRole('button', { name: 'Move section down' });
    const deleteBtn = screen.getByRole('button', { name: 'Delete section' });

    // Disabled at index 0
    expect(moveUpBtn.hasAttribute('disabled')).toBe(true);
    expect(moveDownBtn.hasAttribute('disabled')).toBe(false);

    await user.click(moveDownBtn);
    expect(props.onMoveDown).toHaveBeenCalledTimes(1);

    await user.click(deleteBtn);
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('disables Move Down when index is the last element', () => {
    const props = createProps({ index: 2, totalSections: 3 });
    render(
      <Theme>
        <SectionCard {...props} />
      </Theme>
    );

    const moveUpBtn = screen.getByRole('button', { name: 'Move section up' });
    const moveDownBtn = screen.getByRole('button', { name: 'Move section down' });

    expect(moveUpBtn.hasAttribute('disabled')).toBe(false);
    expect(moveDownBtn.hasAttribute('disabled')).toBe(true);
  });

  it('hides section content when isExpanded is false', () => {
    const props = createProps({ isExpanded: false });
    render(
      <Theme>
        <SectionCard {...props} />
      </Theme>
    );

    expect(screen.queryByRole('textbox', { name: 'Headline' })).toBeNull();
    const expandBtn = screen.getByRole('button', { name: 'Expand section' });
    expect(expandBtn.getAttribute('aria-label')).toBe('Expand section');
  });
});
