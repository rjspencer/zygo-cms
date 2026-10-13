import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { VisualFieldBuilder } from './VisualFieldBuilder';
import { VisualFieldBuilderProps } from './types';
import { SectionTemplateField } from '../../types/sectionTemplate';

const meta = {
  title: 'Components/VisualFieldBuilder',
  component: VisualFieldBuilder,
  parameters: {
    layout: 'padded',
  },
  args: {
    fields: [],
    onChange: () => {},
  },
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <Story />
        </div>
      </Theme>
    ),
  ],
} satisfies Meta<typeof VisualFieldBuilder>;

export default meta;
type Story = StoryObj<typeof meta>;

const StatefulWrapper = ({
  fields: initialFields = [],
  disabled = false,
  onChange,
}: VisualFieldBuilderProps) => {
  const [fields, setFields] = useState<SectionTemplateField[]>(initialFields);
  return (
    <VisualFieldBuilder
      fields={fields}
      onChange={(next) => {
        setFields(next);
        onChange?.(next);
      }}
      disabled={disabled}
    />
  );
};

export const Empty: Story = {
  args: {
    fields: [],
  },
  render: (args) => <StatefulWrapper {...args} />,
};

export const BasicFields: Story = {
  args: {
    fields: [
      {
        name: 'headline',
        type: 'text',
        label: 'Headline',
        required: true,
      },
      {
        name: 'subheading',
        type: 'textarea',
        label: 'Subheading',
        required: false,
      },
    ],
  },
  render: (args) => <StatefulWrapper {...args} />,
};

export const ComplexWithSelectAndList: Story = {
  args: {
    fields: [
      {
        name: 'layout_style',
        type: 'select',
        label: 'Layout Style',
        options: ['Standard', 'Wide', 'Split'],
        required: true,
      },
      {
        name: 'navigation_links',
        type: 'list',
        label: 'Navigation Links',
        required: false,
        fields: [
          {
            name: 'link_text',
            type: 'text',
            label: 'Link Text',
            required: true,
          },
          {
            name: 'link_url',
            type: 'url',
            label: 'Link URL',
            required: true,
          },
          {
            name: 'target_type',
            type: 'select',
            label: 'Target Type',
            options: ['_self', '_blank'],
          },
        ],
      },
    ],
  },
  render: (args) => <StatefulWrapper {...args} />,
};

export const DisabledState: Story = {
  args: {
    disabled: true,
    fields: [
      {
        name: 'hero_title',
        type: 'text',
        label: 'Hero Title',
        required: true,
      },
      {
        name: 'alignment',
        type: 'select',
        label: 'Alignment',
        options: ['Left', 'Center', 'Right'],
      },
    ],
  },
  render: (args) => <StatefulWrapper {...args} />,
};

