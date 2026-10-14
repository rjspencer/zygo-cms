import React from 'react';
import { Card, Flex, Text, Badge, Code } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';

export const PostsTemplateGuidance: React.FC = () => {
  return (
    <Card mb="4" variant="surface">
      <Flex gap="3" align="start">
        <InfoCircledIcon width="20" height="20" color="var(--accent-9)" style={{ marginTop: 2, flexShrink: 0 }} />
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Posts Layout & Styling Architecture
          </Text>
          <Text size="2" color="gray">
            <strong>Single Post HTML:</strong> Customize the markup structure using variables such as{' '}
            <Code size="1">{'{{ post.title }}'}</Code>, <Code size="1">{'{{ post.display_date }}'}</Code>,{' '}
            <Code size="1">{'{{ post.body_html|safe }}'}</Code>, and <Code size="1">{'{{ sections_html|safe }}'}</Code>.
          </Text>
          <Text size="2" color="gray">
            <strong>Fixed Posts List HTML:</strong> The automatic <Code size="1">/posts</Code> archive markup is fixed to
            guarantee accessible semantics and SEO, but is 100% styleable in the CSS tab via{' '}
            <Badge size="1" color="indigo" variant="soft">.posts-list</Badge>,{' '}
            <Badge size="1" color="indigo" variant="soft">.post-summary</Badge>,{' '}
            <Badge size="1" color="indigo" variant="soft">.taxonomy-header</Badge>, and{' '}
            <Badge size="1" color="indigo" variant="soft">.pagination</Badge>.
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};
