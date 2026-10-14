import React from 'react';
import { Card, Tabs, Box, Text } from '@radix-ui/themes';
import { VisualFieldBuilder } from '../../../../components/VisualFieldBuilder';
import { CodeEditor } from '../../../../components/CodeEditor';
import type { TemplateCodeTabsProps } from '../../types';

export const TemplateCodeTabs: React.FC<TemplateCodeTabsProps> = ({
  activeTab,
  onActiveTabChange,
  fields,
  onFieldsChange,
  formTemplateHtml,
  onHtmlChange,
  formTemplateCss,
  onCssChange,
  isLockedForDesigner,
}) => {
  return (
    <Card size="2" style={{ flexGrow: 1, flexShrink: 0 }}>
      <Tabs.Root value={activeTab} onValueChange={onActiveTabChange}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="schema">Schema</Tabs.Trigger>
          <Tabs.Trigger value="html">HTML (MiniJinja)</Tabs.Trigger>
          <Tabs.Trigger value="css">CSS</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="schema" forceMount hidden={activeTab !== 'schema'}>
          <Box mb="2" id="editor-schema" data-panel="schema">
            <Text as="div" size="2" weight="bold" mb="1">Schema Definition</Text>
            <VisualFieldBuilder fields={fields} onChange={onFieldsChange} disabled={isLockedForDesigner} />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="html" forceMount hidden={activeTab !== 'html'}>
          <Box mb="2" id="editor-html" data-panel="html">
            <Text as="div" size="2" weight="bold" mb="1">HTML Template (MiniJinja)</Text>
            <CodeEditor
              value={formTemplateHtml}
              onChange={onHtmlChange}
              language="html"
              disabled={isLockedForDesigner}
              formatOnBlur
              ariaLabel="HTML Template (MiniJinja)"
              dataTestId="code-editor-html"
            />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="css" forceMount hidden={activeTab !== 'css'}>
          <Box mb="2" id="editor-css" data-panel="css">
            <Text as="div" size="2" weight="bold" mb="1">CSS Stylesheet</Text>
            <CodeEditor
              value={formTemplateCss}
              onChange={onCssChange}
              language="css"
              disabled={isLockedForDesigner}
              formatOnBlur
              ariaLabel="CSS Stylesheet"
              dataTestId="code-editor-css"
            />
          </Box>
        </Tabs.Content>
      </Tabs.Root>
    </Card>
  );
};
