import React, { useMemo } from 'react';
import { Box, Card, Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useTemplatesData, useTemplatesFilters } from './hooks';
import {
  TemplatesHeader,
  TemplatesSearchBar,
  TemplatesTable,
} from './components';

export const TemplatesList: React.FC = () => {
  const {
    templates,
    isAdmin,
    isDesigner,
    isLoading,
    fetchError,
    actionError,
    toggleLock,
    isTogglingLock,
    deleteTemplate,
    isDeleting,
  } = useTemplatesData();

  const { search, setSearch } = useTemplatesFilters();

  const filteredTemplates = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return templates;
    return templates.filter((t) => {
      return (
        t.name.toLowerCase().includes(term) ||
        t.id.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term))
      );
    });
  }, [templates, search]);

  return (
    <Box>
      <TemplatesHeader />

      {actionError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{actionError}</Callout.Text>
        </Callout.Root>
      )}

      {fetchError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {fetchError instanceof Error ? fetchError.message : 'Error loading templates'}
          </Callout.Text>
        </Callout.Root>
      )}

      <Card size="2">
        <TemplatesSearchBar value={search} onChange={setSearch} />
        <TemplatesTable
          templates={filteredTemplates}
          isAdmin={isAdmin}
          isDesigner={isDesigner}
          isLoading={isLoading}
          isTogglingLock={isTogglingLock}
          isDeleting={isDeleting}
          onToggleLock={toggleLock}
          onDelete={deleteTemplate}
        />
      </Card>
    </Box>
  );
};

export default TemplatesList;
