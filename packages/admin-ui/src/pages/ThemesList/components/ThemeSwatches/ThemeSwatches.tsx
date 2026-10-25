import React from 'react';
import { Flex, Box } from '@radix-ui/themes';
import type { ThemeSwatchesProps } from '../../types';

export const ThemeSwatches: React.FC<ThemeSwatchesProps> = ({ tokens }) => {
  if (!tokens) {
    return <Box style={{ color: 'var(--gray-8)', fontSize: '0.85rem' }}>—</Box>;
  }

  const swatches = [
    { label: 'Background', color: tokens.colorBg || '#ffffff' },
    { label: 'Surface', color: tokens.colorSurface || '#ffffff' },
    { label: 'Text', color: tokens.colorText || '#000000' },
    { label: 'Accent', color: tokens.colorAccent || '#007799' },
  ];

  return (
    <Flex gap="1" align="center" aria-label="Theme color swatches">
      {swatches.map((s) => (
        <Box
          key={s.label}
          title={`${s.label}: ${s.color}`}
          aria-label={`${s.label}: ${s.color}`}
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            backgroundColor: s.color,
            border: '1px solid var(--gray-6)',
            boxShadow: 'inset 0 0 1px rgba(0,0,0,0.15)',
            flexShrink: 0,
          }}
        />
      ))}
    </Flex>
  );
};

export default ThemeSwatches;
