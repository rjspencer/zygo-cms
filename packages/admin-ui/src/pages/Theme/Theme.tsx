import React from 'react';
import { ThemeEditor } from '../../components/ThemeEditor';
import type { ThemePageProps } from './types';

export const ThemePage: React.FC<ThemePageProps> = () => {
  return <ThemeEditor />;
};

export default ThemePage;
