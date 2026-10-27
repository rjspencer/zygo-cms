import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    expect(screen.getByText('ID of the parent entry').textContent).toBe('ID of the parent entry');
    expect(screen.getByText('Order relative to siblings').textContent).toBe('Order relative to siblings');

    const parentIdInput = screen.getByLabelText('Parent ID') as HTMLInputElement;
    expect(parentIdInput.value).toBe('12');
    expect(parentIdInput.getAttribute('placeholder')).toBe('Leave blank for root');
    expect(parentIdInput.getAttribute('aria-describedby')).toBe('editor-parent-id-help');
    expect(parentIdInput.getAttribute('aria-invalid')).toBe('false');

    const sortOrderInput = screen.getByLabelText('Sort Order') as HTMLInputElement;
    expect(sortOrderInput.value).toBe('3');
    expect(sortOrderInput.type).toBe('number');
    expect(sortOrderInput.getAttribute('aria-describedby')).toBe('editor-sort-order-help');
  });

  it('updates Parent ID input value on change', async () => {
    const user = userEvent.setup();
    renderWithForm(<HierarchyFields />, { parentId: '' });

    const parentIdInput = screen.getByLabelText('Parent ID') as HTMLInputElement;
    await user.type(parentIdInput, '99');

    expect(parentIdInput.value).toBe('99');
  });

  it('updates Sort Order input value on change', async () => {
    const user = userEvent.setup();
    renderWithForm(<HierarchyFields />, { sortOrder: 0 });

    const sortOrderInput = screen.getByLabelText('Sort Order') as HTMLInputElement;
    await user.clear(sortOrderInput);
    await user.type(sortOrderInput, '5');

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
    expect(alert.textContent).toBe(errorMessage);

    const parentIdInput = screen.getByLabelText('Parent ID');
    expect(parentIdInput.getAttribute('aria-invalid')).toBe('true');
    expect(parentIdInput.getAttribute('aria-describedby')).toBe('editor-parent-id-error editor-parent-id-help');
  });
});
