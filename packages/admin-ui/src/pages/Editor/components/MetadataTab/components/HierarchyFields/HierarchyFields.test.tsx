import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import { HierarchyFields } from './HierarchyFields';

describe('HierarchyFields', () => {
  it('renders Parent ID and Sort Order inputs with labels and helper texts', () => {
    renderWithForm(<HierarchyFields />, { parentId: '12', sortOrder: 3 });

    expect(screen.getByText('Parent ID')).toBeDefined();
    expect(screen.getByText('ID of the parent entry')).toBeDefined();
    expect(screen.getByText('Sort Order')).toBeDefined();
    expect(screen.getByText('Order relative to siblings')).toBeDefined();

    const parentIdInput = screen.getByPlaceholderText('Leave blank for root') as HTMLInputElement;
    expect(parentIdInput.value).toBe('12');

    const sortOrderInput = screen.getByDisplayValue('3') as HTMLInputElement;
    expect(sortOrderInput).toBeDefined();
    expect(sortOrderInput.type).toBe('number');
  });

  it('updates Parent ID input value on change', () => {
    renderWithForm(<HierarchyFields />, { parentId: '' });

    const parentIdInput = screen.getByPlaceholderText('Leave blank for root') as HTMLInputElement;
    fireEvent.change(parentIdInput, { target: { value: '99' } });

    expect(parentIdInput.value).toBe('99');
  });

  it('updates Sort Order input value on change', () => {
    renderWithForm(<HierarchyFields />, { sortOrder: 0 });

    const sortOrderInput = screen.getByDisplayValue('0') as HTMLInputElement;
    fireEvent.change(sortOrderInput, { target: { value: '5' } });

    expect(sortOrderInput.value).toBe('5');
  });
});
