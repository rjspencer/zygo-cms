import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import type { MenuItem, SitePageItem, AddMenuItemFormValues } from '../types';

export const isAbsoluteUrl = (url: string) => {
  if (!url.trim()) return true;
  return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url.trim());
};

const defaultValues: AddMenuItemFormValues = {
  title: '',
  urlSearchQuery: '',
  selectedUrl: '',
  isCustom: false,
  customUrl: '',
};

export function useAddMenuItemForm(onAdd: (item: MenuItem) => void) {
  const methods = useForm<AddMenuItemFormValues>({
    defaultValues,
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPage = useCallback(
    (page: SitePageItem) => {
      methods.setValue('isCustom', false);
      methods.setValue('selectedUrl', page.path);
      methods.setValue('urlSearchQuery', `${page.title} (${page.path})`);
      setIsDropdownOpen(false);

      const currentTitle = methods.getValues('title');
      if (!currentTitle.trim()) {
        methods.setValue('title', page.title);
      }
    },
    [methods]
  );

  const handleSelectCustom = useCallback(() => {
    methods.setValue('isCustom', true);
    methods.setValue('selectedUrl', '');
    methods.setValue('urlSearchQuery', 'Custom URL');
    setIsDropdownOpen(false);
  }, [methods]);

  const onSubmit = methods.handleSubmit((values) => {
    const finalUrl = values.isCustom
      ? values.customUrl.trim()
      : values.selectedUrl.trim() || values.urlSearchQuery.trim();

    if (!values.title.trim() || !finalUrl) return;

    const newItem: MenuItem = {
      title: values.title.trim(),
      url: finalUrl,
      target: '_self',
      children: [],
    };

    onAdd(newItem);
    methods.reset(defaultValues);
  });

  return {
    methods,
    onSubmit,
    isDropdownOpen,
    setIsDropdownOpen,
    dropdownRef,
    handleSelectPage,
    handleSelectCustom,
  };
}
