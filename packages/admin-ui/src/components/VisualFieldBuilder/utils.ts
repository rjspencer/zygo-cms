export const slugify = (label: string): string => {
  if (!label) return '';
  return label
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '');
};
