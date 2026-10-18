import React from 'react';
import { Box, Text, TextField, IconButton } from '@radix-ui/themes';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useFormContext, useWatch } from 'react-hook-form';
import type { SitePageItem, AddMenuItemFormValues } from '../types';

interface PageSelectComboboxProps {
  sitePages: SitePageItem[];
  isDropdownOpen: boolean;
  setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onSelectPage: (page: SitePageItem) => void;
  onSelectCustom: () => void;
}

export const PageSelectCombobox: React.FC<PageSelectComboboxProps> = ({
  sitePages,
  isDropdownOpen,
  setIsDropdownOpen,
  dropdownRef,
  onSelectPage,
  onSelectCustom,
}) => {
  const { setValue, control } = useFormContext<AddMenuItemFormValues>();
  const urlSearchQuery = useWatch({ control, name: 'urlSearchQuery' }) || '';
  const isCustom = useWatch({ control, name: 'isCustom' }) || false;

  const filteredPages = sitePages.filter((p) => {
    const q = urlSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q);
  });

  return (
    <Box style={{ flex: 1, minWidth: '240px', position: 'relative' }} ref={dropdownRef}>
      <Text as="label" htmlFor="page-select-combobox-input" size="1" color="gray" weight="bold" mb="1" style={{ display: 'block' }}>
        URL
      </Text>
      <TextField.Root
        id="page-select-combobox-input"
        aria-controls="page-select-listbox"
        size="2"
        placeholder="Select or search a page..."
        value={urlSearchQuery}
        onChange={(e) => {
          setValue('urlSearchQuery', e.target.value);
          setIsDropdownOpen(true);
          if (!isCustom) {
            setValue('selectedUrl', e.target.value);
          }
        }}
        onFocus={() => setIsDropdownOpen(true)}
        role="combobox"
        aria-label="URL"
        aria-expanded={isDropdownOpen}
        aria-autocomplete="list"
      >
        <TextField.Slot side="right">
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="ghost"
            color="gray"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDropdownOpen((prev) => !prev);
            }}
            aria-label="Toggle pages dropdown"
          >
            <ChevronDownIcon width="16" height="16" />
          </IconButton>
        </TextField.Slot>
      </TextField.Root>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <Box
          id="page-select-listbox"
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            marginTop: '4px',
            background: 'var(--color-panel-solid, #fff)',
            border: '1px solid var(--gray-6, #ccc)',
            borderRadius: 'var(--radius-2, 6px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {/* Existing Site Pages */}
          {filteredPages.length > 0 ? (
            filteredPages.map((page) => (
              <Box
                key={page.id}
                role="option"
                onClick={() => onSelectPage(page)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--gray-3, #f0f0f0)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--gray-3, #f5f5f5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Text size="2" weight="medium" style={{ display: 'block' }}>
                  {page.title}
                </Text>
                <Text
                  size="1"
                  color="gray"
                  style={{ display: 'block', fontFamily: 'monospace' }}
                >
                  {page.path}
                </Text>
              </Box>
            ))
          ) : (
            <Box style={{ padding: '8px 12px' }}>
              <Text size="2" color="gray">
                No matching pages
              </Text>
            </Box>
          )}

          {/* Custom Option */}
          <Box
            role="option"
            onClick={onSelectCustom}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: 'var(--gray-2, #fafafa)',
              borderTop: '1px solid var(--gray-4, #e5e5e5)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gray-4, #eee)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gray-2, #fafafa)';
            }}
          >
            <Text size="2" weight="bold" color="cyan">
              Custom (External URL)...
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
