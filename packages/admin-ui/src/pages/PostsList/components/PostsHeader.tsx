import React from 'react';
import { Flex, Box, Heading, Text, Button } from '@radix-ui/themes';
import { PlusIcon, Pencil1Icon } from '@radix-ui/react-icons';
import { useNavigate } from 'react-router-dom';

export interface PostsHeaderProps {
  onCreatePost?: () => void;
  onEditTemplate?: () => void;
}

export const PostsHeader: React.FC<PostsHeaderProps> = ({
  onCreatePost,
  onEditTemplate,
}) => {
  const navigate = useNavigate();

  const handleCreate = () => {
    if (onCreatePost) {
      onCreatePost();
    } else {
      navigate('/posts/editor/new');
    }
  };

  const handleEditTemplate = () => {
    if (onEditTemplate) {
      onEditTemplate();
    } else {
      navigate('/templates/posts');
    }
  };

  return (
    <Flex justify="between" align="center" mb="5">
      <Box>
        <Heading size="6" weight="bold">
          Posts
        </Heading>
        <Text size="2" color="gray">
          Manage your blog posts and articles
        </Text>
      </Box>
      <Flex gap="2">
        <Button
          variant="outline"
          color="gray"
          onClick={handleEditTemplate}
          data-testid="edit-posts-template-btn"
        >
          <Pencil1Icon width="16" height="16" />
          Edit Template &amp; Styles
        </Button>
        <Button variant="solid" color="cyan" onClick={handleCreate}>
          <PlusIcon width="18" height="18" />
          Create Post
        </Button>
      </Flex>
    </Flex>
  );
};

export default PostsHeader;
