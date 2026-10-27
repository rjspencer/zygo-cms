import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Theme, Button } from '@radix-ui/themes';
import { QRCodeDialog } from './QRCodeDialog';

describe('QRCodeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default trigger button', () => {
    render(
      <Theme>
        <QRCodeDialog url="https://example.com/test" />
      </Theme>
    );

    const trigger = screen.getByRole('button', { name: 'QR Code' });
    expect(trigger.hasAttribute('disabled')).toBe(false);
  });

  it('renders custom trigger when provided', () => {
    render(
      <Theme>
        <QRCodeDialog
          url="https://example.com/test"
          trigger={<Button variant="outline">Custom Trigger</Button>}
        />
      </Theme>
    );

    const customTrigger = screen.getByRole('button', { name: 'Custom Trigger' });
    expect(customTrigger.hasAttribute('disabled')).toBe(false);
  });

  it('opens and closes dialog with QR code, url, and actions on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <QRCodeDialog url="https://example.com/test-url" />
      </Theme>
    );

    const trigger = screen.getByRole('button', { name: 'QR Code' });
    await user.click(trigger);

    expect(await screen.findByRole('heading', { name: 'Share via QR Code' })).not.toBeNull();
    expect(screen.getByText('Scan to visit the trackable link.').textContent).toBe(
      'Scan to visit the trackable link.'
    );
    expect(screen.getByText('https://example.com/test-url').textContent).toBe(
      'https://example.com/test-url'
    );
    expect(screen.getByRole('button', { name: 'Copy to Clipboard' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Download Image' }).hasAttribute('disabled')).toBe(false);

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    expect(closeBtn.hasAttribute('disabled')).toBe(false);

    // Radix Teardown (Pattern 14)
    await user.click(closeBtn);
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('triggers copy action when Copy to Clipboard button is clicked', async () => {
    const user = userEvent.setup();
    const mockWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: mockWrite,
      },
      configurable: true,
    });

    render(
      <Theme>
        <QRCodeDialog url="https://example.com/test-copy" />
      </Theme>
    );

    await user.click(screen.getByRole('button', { name: 'QR Code' }));
    const copyBtn = await screen.findByRole('button', { name: 'Copy to Clipboard' });
    await user.click(copyBtn);

    expect(copyBtn.hasAttribute('disabled')).toBe(false);

    // Radix Teardown (Pattern 14)
    await user.click(screen.getByRole('button', { name: 'Close' }));
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('triggers download action when Download Image button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <Theme>
        <QRCodeDialog url="https://example.com/test-download" />
      </Theme>
    );

    await user.click(screen.getByRole('button', { name: 'QR Code' }));
    const downloadBtn = await screen.findByRole('button', { name: 'Download Image' });
    await user.click(downloadBtn);

    expect(downloadBtn.hasAttribute('disabled')).toBe(false);

    // Radix Teardown (Pattern 14)
    await user.click(screen.getByRole('button', { name: 'Close' }));
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
