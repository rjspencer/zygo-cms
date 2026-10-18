import React from 'react';
import { Box, Heading, Flex, Text, TextField, Button } from '@radix-ui/themes';
import { PlusIcon } from '@radix-ui/react-icons';
import { FormProvider, useWatch, Controller } from 'react-hook-form';
import { PageSelectCombobox } from './PageSelectCombobox';
import { useAddMenuItemForm, isAbsoluteUrl } from '../hooks/useAddMenuItemForm';
import type { AddMenuItemFormProps } from '../types';

export const AddMenuItemForm: React.FC<AddMenuItemFormProps> = ({
  sitePages,
  onAdd,
}) => {
  const {
    methods,
    onSubmit,
    isDropdownOpen,
    setIsDropdownOpen,
    dropdownRef,
    handleSelectPage,
    handleSelectCustom,
  } = useAddMenuItemForm(onAdd);

  const { control } = methods;
  const isCustom = useWatch({ control, name: 'isCustom' }) || false;
  const customUrl = useWatch({ control, name: 'customUrl' }) || '';
  const hasWarning = !isAbsoluteUrl(customUrl) && customUrl.trim() !== '';

  return (
    <FormProvider {...methods}>
      <Box
        style={{
          backgroundColor: 'var(--color-panel-solid)',
          border: '1px solid var(--gray-5)',
          borderRadius: 'var(--radius-3)',
          padding: 'var(--space-4)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Heading size="2" mb="3">
          Add Menu Item
        </Heading>
        <Flex
          asChild
          gap="3"
          align="start"
          wrap="wrap"
        >
          <form onSubmit={onSubmit}>
            {/* 1. URL Field (FIRST) */}
            <PageSelectCombobox
              sitePages={sitePages}
              isDropdownOpen={isDropdownOpen}
              setIsDropdownOpen={setIsDropdownOpen}
              dropdownRef={dropdownRef}
              onSelectPage={handleSelectPage}
              onSelectCustom={handleSelectCustom}
            />

            {/* 2. Custom URL Field (revealed when custom option is selected) */}
            {isCustom && (
              <Box style={{ flex: 1, minWidth: '240px' }}>
                <Text
                  as="label"
                  htmlFor="custom-url-input"
                  size="1"
                  color="gray"
                  weight="bold"
                  mb="1"
                  style={{ display: 'block' }}
                >
                  External URL
                </Text>
                <Controller
                  control={control}
                  name="customUrl"
                  render={({ field }) => (
                    <TextField.Root
                      id="custom-url-input"
                      size="2"
                      placeholder="https://example.com"
                      value={field.value}
                      onChange={field.onChange}
                      aria-label="External URL"
                      aria-invalid={hasWarning}
                      aria-describedby={hasWarning ? 'custom-url-warning' : undefined}
                    />
                  )}
                />
                {hasWarning && (
                  <Text
                    id="custom-url-warning"
                    role="alert"
                    size="1"
                    color="amber"
                    weight="medium"
                    style={{ display: 'block', marginTop: '4px' }}
                  >
                    Warning: External URLs should be absolute (e.g. https://example.com)
                  </Text>
                )}
              </Box>
            )}

            {/* 3. Label Field (SECOND) */}
            <Box style={{ flex: 1, minWidth: '200px' }}>
              <Text
                as="label"
                htmlFor="menu-item-label-input"
                size="1"
                color="gray"
                weight="bold"
                mb="1"
                style={{ display: 'block' }}
              >
                Label
              </Text>
              <Controller
                control={control}
                name="title"
                render={({ field }) => (
                  <TextField.Root
                    id="menu-item-label-input"
                    size="2"
                    placeholder="e.g. Documentation"
                    value={field.value}
                    onChange={field.onChange}
                    aria-label="Label"
                  />
                )}
              />
            </Box>

            {/* 4. Add Link Button */}
            <Box style={{ alignSelf: 'flex-start', marginTop: '22px' }}>
              <Button size="2" variant="soft" color="cyan" type="submit">
                <PlusIcon width="18" height="18" />
                Add Link
              </Button>
            </Box>
          </form>
        </Flex>
      </Box>
    </FormProvider>
  );
};
