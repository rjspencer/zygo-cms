import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { AiContextInstructions } from './AiContextInstructions';

describe('AiContextInstructions', () => {
  it('renders Developer Context button and opens popover with markdown instructions', async () => {
    const instructions = 'Instructions for **developer** context.';
    render(
      <Theme>
        <AiContextInstructions instructions={instructions} />
      </Theme>
    );

    const button = screen.getByRole('button', { name: /Developer Context/i });
    expect(button).toBeDefined();

    await userEvent.click(button);

    expect(screen.getByText('Developer Context')).toBeDefined();
    expect(screen.getByText(/Instructions for/i)).toBeDefined();
  });
});
