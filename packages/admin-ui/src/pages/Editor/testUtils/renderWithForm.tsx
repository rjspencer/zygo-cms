import React from 'react';
import { render } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import type { EntryFormValues } from '../types';
import { EMPTY_FORM_VALUES } from '../utils/entryForm';

interface FormHarnessProps {
  defaultValues: EntryFormValues;
  children: React.ReactNode;
}

const FormHarness: React.FC<FormHarnessProps> = ({ defaultValues, children }) => {
  const methods = useForm<EntryFormValues>({ defaultValues });
  return <FormProvider {...methods}>{children}</FormProvider>;
};

/** Renders `ui` inside Radix <Theme> and a react-hook-form <FormProvider> seeded with `values`. */
export const renderWithForm = (ui: React.ReactElement, values: Partial<EntryFormValues> = {}) =>
  render(
    <Theme>
      <FormHarness defaultValues={{ ...EMPTY_FORM_VALUES, ...values }}>{ui}</FormHarness>
    </Theme>
  );
