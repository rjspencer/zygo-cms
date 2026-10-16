import type { Meta, StoryObj } from '@storybook/react';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { AiContextInstructions } from './AiContextInstructions';

const meta = {
  title: 'Components/AiContextInstructions',
  component: AiContextInstructions,
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
} satisfies Meta<typeof AiContextInstructions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    instructions: '## Developer Guidelines\n\n- Write modular code\n- Follow **1+2+4 Protocol**',
  },
};
