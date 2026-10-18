import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, DropdownMenu } from '@radix-ui/themes';
import { PlusIcon, FileTextIcon, LayersIcon, ImageIcon } from '@radix-ui/react-icons';

export interface QuickCreateMenuProps {
  isCollapsed?: boolean;
}

export const QuickCreateMenu: React.FC<QuickCreateMenuProps> = ({ isCollapsed = false }) => {
  const navigate = useNavigate();

  return (
    <Box mb="4" style={{ display: 'flex', justifyContent: 'center' }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button
            size={isCollapsed ? '1' : '2'}
            variant="solid"
            color="cyan"
            aria-label="New Content"
            style={{ width: isCollapsed ? 'auto' : '100%', padding: isCollapsed ? '8px' : undefined }}
          >
            <PlusIcon width="16" height="16" />
            {!isCollapsed && 'New Content'}
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onClick={() => navigate('/posts/editor/new')}>
            <FileTextIcon width="16" height="16" />
            New Post
          </DropdownMenu.Item>
          <DropdownMenu.Item onClick={() => navigate('/pages/editor/new')}>
            <LayersIcon width="16" height="16" />
            New Page
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onClick={() => navigate('/media')}>
            <ImageIcon width="16" height="16" />
            Upload Media
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Box>
  );
};

export default QuickCreateMenu;
