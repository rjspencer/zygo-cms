import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { ThemeEditor } from '../../components/ThemeEditor';
import type { ThemeEditorPageProps } from './types';

export const ThemeEditorPage: React.FC<ThemeEditorPageProps> = (props) => {
  const params = useParams<{ id?: string }>();
  const themeId = props.id || params.id;

  if (!themeId) {
    return <Navigate to="/theme" replace />;
  }

  return <ThemeEditor themeId={themeId} />;
};

export default ThemeEditorPage;
