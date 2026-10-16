import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Dropdown } from './Dropdown';

describe('Dropdown component', () => {
  it('toggles dropdown menu on click with Account settings, Support, and License', async () => {
    render(<Dropdown />);

    expect(screen.queryByTestId('dropdown-menu')).toBeNull();

    const button = screen.getByRole('button', { name: /Options/i });
    await userEvent.click(button);

    const menu = screen.getByTestId('dropdown-menu');
    expect(menu).toBeDefined();
    expect(screen.getByText('Account settings')).toBeDefined();
    expect(screen.getByText('Support')).toBeDefined();
    expect(screen.getByText('License')).toBeDefined();

    // Clicking again closes it
    await userEvent.click(button);
    expect(screen.queryByTestId('dropdown-menu')).toBeNull();
  });
});
