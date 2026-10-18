import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import type { EntryFormValues } from '../../../../types';
import { EMPTY_FORM_VALUES } from '../../../../utils/entryForm';
import { HierarchyFields } from './HierarchyFields';

const FormWithErrorHarness: React.FC<{
  errorMessage: string;
  children: React.ReactNode;
}> = ({ errorMessage, children }) => {
  const methods = useForm<EntryFormValues>({ defaultValues: EMPTY_FORM_VALUES });
  useEffect(() => {
    methods.setError('parentId', {
      type: 'validation',
      message: errorMessage,
    });
  }, [errorMessage, methods]);

  return (
    <Theme>
      <FormProvider {...methods}>{children}</FormProvider>
    </Theme>
  );
};

describe('HierarchyFields', () => {
  it('renders Parent ID and Sort Order inputs with labels and helper texts', () => {
    renderWithForm(<HierarchyFields />, { parentId: '12', sortOrder: 3 });

    expect(screen.getByText('Parent ID')).toBeDefined();
    expect(screen.getByText('ID of the parent entry')).toBeDefined();
    expect(screen.getByText('Sort Order')).toBeDefined();
    expect(screen.getByText('Order relative to siblings')).toBeDefined();

    const parentIdInput = screen.getByPlaceholderText('Leave blank for root') as HTMLInputElement;
    expect(parentIdInput.value).toBe('12');
    expect(parentIdInput.getAttribute('aria-describedby')).toBe('editor-parent-id-help');

    const sortOrderInput = screen.getByDisplayValue('3') as HTMLInputElement;
    expect(sortOrderInput).toBeDefined();
    expect(sortOrderInput.type).toBe('number');
    expect(sortOrderInput.getAttribute('aria-describedby')).toBe('editor-sort-order-help');
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

  it('renders inline error alert and aria-invalid attribute when parentId has an error', () => {
    const errorMessage = 'Parent ID must be a positive integer';
    render(
      <FormWithErrorHarness errorMessage={errorMessage}>
        <HierarchyFields />
      </FormWithErrorHarness>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toBe(errorMessage);

    const parentIdInput = document.getElementById('editor-parent-id-input');
    expect(parentIdInput).not.toBeNull();
    expect(parentIdInput?.getAttribute('aria-invalid')).toBe('true');
    expect(parentIdInput?.getAttribute('aria-describedby')).toBe('editor-parent-id-error editor-parent-id-help');
  });
});
