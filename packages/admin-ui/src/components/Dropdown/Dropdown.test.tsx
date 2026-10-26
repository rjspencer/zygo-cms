import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Dropdown } from './Dropdown';

describe('Dropdown component', () => {
  it('toggles dropdown menu on click with Account settings, Support, and License', async () => {
    const user = userEvent.setup();
    render(<Dropdown />);

    expect(screen.queryByTestId('dropdown-menu')).toBeNull();

    const button = screen.getByRole('button', { name: /Options/i });
    await user.click(button);

    expect(screen.getByTestId('dropdown-menu')).not.toBeNull();
    expect(screen.getByText('Account settings')).not.toBeNull();
    expect(screen.getByText('Support')).not.toBeNull();
    expect(screen.getByText('License')).not.toBeNull();

    // Clicking again closes it
    await user.click(button);
    expect(screen.queryByTestId('dropdown-menu')).toBeNull();
  });
});

