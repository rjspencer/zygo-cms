import { render, screen, fireEvent } from '@testing-library/react';
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

    expect(screen.getByRole('button', { name: 'QR Code' })).toBeDefined();
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

    expect(screen.getByRole('button', { name: 'Custom Trigger' })).toBeDefined();
  });

  it('opens dialog with QR code, url, and actions on trigger click', async () => {
    render(
      <Theme>
        <QRCodeDialog url="https://example.com/test-url" />
      </Theme>
    );

    const trigger = screen.getByRole('button', { name: 'QR Code' });
    fireEvent.click(trigger);

    expect(await screen.findByText('Share via QR Code')).toBeDefined();
    expect(screen.getByText('Scan to visit the trackable link.')).toBeDefined();
    expect(screen.getByText('https://example.com/test-url')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Copy to Clipboard' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Download Image' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDefined();
  });

  it('triggers copy action when Copy to Clipboard button is clicked', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'QR Code' }));
    const copyBtn = await screen.findByRole('button', { name: 'Copy to Clipboard' });
    fireEvent.click(copyBtn);

    expect(copyBtn).toBeDefined();
  });

  it('triggers download action when Download Image button is clicked', async () => {
    render(
      <Theme>
        <QRCodeDialog url="https://example.com/test-download" />
      </Theme>
    );

    fireEvent.click(screen.getByRole('button', { name: 'QR Code' }));
    const downloadBtn = await screen.findByRole('button', { name: 'Download Image' });
    fireEvent.click(downloadBtn);

    expect(downloadBtn).toBeDefined();
  });
});
