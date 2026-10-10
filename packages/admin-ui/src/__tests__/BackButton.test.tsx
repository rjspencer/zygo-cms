import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { BackButton } from '../components/BackButton';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('BackButton component', () => {
  it('renders default "Back" text and calls navigate(-1) on click', async () => {
    mockNavigate.mockClear();
    render(
      <MemoryRouter>
        <Theme>
          <BackButton />
        </Theme>
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Back/i });
    expect(button).toBeTruthy();

    await userEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('navigates to specific route when `to` prop is provided', async () => {
    mockNavigate.mockClear();
    render(
      <MemoryRouter>
        <Theme>
          <BackButton to="/templates" />
        </Theme>
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Back/i });
    await userEvent.click(button);
    expect(mockNavigate).toHaveBeenCalledWith('/templates');
  });

  it('calls custom `onClick` handler when provided', async () => {
    mockNavigate.mockClear();
    const handleClick = vi.fn();
    render(
      <MemoryRouter>
        <Theme>
          <BackButton onClick={handleClick} label="Return" />
        </Theme>
      </MemoryRouter>
    );

    const button = screen.getByRole('button', { name: /Return/i });
    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
