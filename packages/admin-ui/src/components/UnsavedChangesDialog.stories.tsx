import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within, expect, waitFor } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import type { Blocker } from 'react-router-dom';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

const proceed = fn();
const reset = fn();

const blockedBlocker: Blocker = {
  state: 'blocked',
  location: { pathname: '/other', search: '', hash: '', state: null, key: 'k' },
  proceed,
  reset,
};

const meta = {
  title: 'Components/UnsavedChangesDialog',
  component: UnsavedChangesDialog,
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
} satisfies Meta<typeof UnsavedChangesDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Blocked: Story = {
  args: { blocker: blockedBlocker },
  play: async () => {
    const body = within(document.body);
    const title = await body.findByText('Unsaved changes');
    await waitFor(() => expect(title).toBeVisible());
    await userEvent.click(body.getByRole('button', { name: 'Stay' }));
    await expect(reset).toHaveBeenCalled();
  },
};

export const LeaveWithoutSaving: Story = {
  args: { blocker: blockedBlocker },
  play: async () => {
    const body = within(document.body);
    await userEvent.click(await body.findByRole('button', { name: 'Leave without saving' }));
    await expect(proceed).toHaveBeenCalled();
  },
};

export const Idle: Story = {
  args: { blocker: { state: 'unblocked', location: undefined, proceed: undefined, reset: undefined } },
};
