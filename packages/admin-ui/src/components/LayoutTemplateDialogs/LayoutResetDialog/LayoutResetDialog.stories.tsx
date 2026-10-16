import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { LayoutResetDialog } from './LayoutResetDialog';

const onOpenChange = fn();
const onConfirm = fn();

const meta = {
  title: 'LayoutTemplateDialogs/LayoutResetDialog',
  component: LayoutResetDialog,
  decorators: [
    (Story) => (
      <Theme>
        <Story />
      </Theme>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof LayoutResetDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange,
    templateName: 'Post Template',
    onConfirm,
    isSaving: false,
  },
};

export const SavingState: Story = {
  args: {
    open: true,
    onOpenChange,
    templateName: 'Post Template',
    onConfirm,
    isSaving: true,
  },
};
