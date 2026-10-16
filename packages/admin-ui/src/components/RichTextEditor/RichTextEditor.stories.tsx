import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { RichTextEditor } from './RichTextEditor';

const meta = {
  title: 'Components/RichTextEditor',
  component: RichTextEditor,
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <div style={{ maxWidth: 800, padding: 20 }}>
          <Story />
        </div>
      </Theme>
    ),
  ],
} satisfies Meta<typeof RichTextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: '<p>This is standard paragraph text inside the rich text editor.</p>',
    onChange: () => {},
  },
};

export const EmptyWithPlaceholder: Story = {
  args: {
    value: '',
    placeholder: 'Write your story here...',
    onChange: () => {},
  },
};

export const HeadingsAndLists: Story = {
  args: {
    value: '<h1>Main Title</h1><h2>Subtitle</h2><p>Here is a list:</p><ul><li>First item</li><li>Second item</li></ul><blockquote>A wise quote</blockquote>',
    onChange: () => {},
  },
};
