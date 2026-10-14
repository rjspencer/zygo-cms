import React from 'react';
import { Card, Flex, Text, Badge, Code } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';

export const DocsTemplateGuidance: React.FC = () => {
  return (
    <Card mb="4" variant="surface">
      <Flex gap="3" align="start">
        <InfoCircledIcon width="20" height="20" color="var(--accent-9)" style={{ marginTop: 2, flexShrink: 0 }} />
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            Docs Layout & Navigation Architecture
          </Text>
          <Text size="2" color="gray">
            <strong>Fixed Navigation Tree:</strong> The docs sidebar tree <Code size="1">{'{{ docs_tree_html|safe }}'}</Code>{' '}
            and table of contents are generated semantically by the worker to preserve hierarchical indentation and
            keyboard accessibility.
          </Text>
          <Text size="2" color="gray">
            <strong>Full CSS Customization:</strong> All documentation UI is stylable in the CSS tab via{' '}
            <Badge size="1" color="indigo" variant="soft">.docs-layout</Badge>,{' '}
            <Badge size="1" color="indigo" variant="soft">.docs-sidebar</Badge>,{' '}
            <Badge size="1" color="indigo" variant="soft">.docs-nav</Badge>,{' '}
            <Badge size="1" color="indigo" variant="soft">.docs-toc</Badge>, and{' '}
            <Badge size="1" color="indigo" variant="soft">.docs-content</Badge>.
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};
