import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within, expect } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { StagedDiffModal } from './StagedDiffModal';

const onAccept = fn();
const onReject = fn();

const meta = {
  title: 'Assistant/StagedDiffModal',
  component: StagedDiffModal,
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
} satisfies Meta<typeof StagedDiffModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    title: 'Update Site Tagline',
    description: 'The assistant proposes updating the publication tagline.',
    fieldLabel: 'Tagline',
    beforeText: 'An Editorial Review & Journal',
    afterText: 'A Modern Architecture & Design Review',
    onAccept,
    onReject,
  },
  play: async () => {
    const body = within(document.body);
    const acceptBtn = await body.findByRole('button', { name: 'Accept Changes' });
    await userEvent.click(acceptBtn);
    await expect(onAccept).toHaveBeenCalled();
  },
};

export const RejectFlow: Story = {
  args: {
    open: true,
    title: 'Modify Section Template HTML',
    description: 'Proposed modification to replace placeholder markup with responsive card grid.',
    fieldLabel: 'template_html',
    beforeText: '<section>\n  <h1>{{ headline }}</h1>\n</section>',
    afterText: '<section class="grid">\n  <h1>{{ headline }}</h1>\n  <p>{{ subheadline }}</p>\n</section>',
    onAccept,
    onReject,
  },
  play: async () => {
    const body = within(document.body);
    const rejectBtn = await body.findByRole('button', { name: 'Reject Changes' });
    await userEvent.click(rejectBtn);
    await expect(onReject).toHaveBeenCalled();
  },
};

export const WithoutDescription: Story = {
  args: {
    open: true,
    title: 'Update Category Name',
    fieldLabel: 'category',
    beforeText: 'Technology',
    afterText: 'Tech & AI',
    onAccept,
    onReject,
  },
};
