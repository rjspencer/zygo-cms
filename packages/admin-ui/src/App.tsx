import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import PagesList from './pages/PagesList';
import Editor from './pages/Editor';
import Media from './pages/Media';
import Users from './pages/Users';
import Navigation from './pages/Navigation';
import ContentTypes from './pages/ContentTypes';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="posts" element={<Posts />} />
        <Route path="pages" element={<PagesList />} />
        <Route path="editor" element={<Editor />} />
        <Route path="editor/:id" element={<Editor />} />
        <Route path="media" element={<Media />} />
        <Route path="users" element={<Users />} />
        <Route path="navigation" element={<Navigation />} />
        <Route path="content-types" element={<ContentTypes />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="admin" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
