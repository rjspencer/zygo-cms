import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import { AiCrawlSettingsCard } from './AiCrawlSettingsCard';
import type { SettingsFormValues } from '../types';

const defaultValues: SettingsFormValues = {
  siteTitle: 'My Test Site',
  canonicalOrigin: 'https://example.com',
  description: 'Test',
  analyticsEnabled: false,
  docsModeEnabled: false,
  docsPath: '/docs',
  siteLogo: '',
  siteLogoDark: '',
  siteFavicon: '',
  defaultOgImage: '',
  footerText: '',
  aiBotsProtection: 'disabled',
  aiSearch: 'disabled',
  aiTraining: 'disabled',
  aiUser: 'disabled',
};

const TestWrapper: React.FC<{ initialValues?: Partial<SettingsFormValues>; configured?: boolean }> = ({
  initialValues,
  configured = true,
}) => {
  const methods = useForm<SettingsFormValues>({
    defaultValues: { ...defaultValues, ...initialValues },
  });

  return (
    <Theme>
      <FormProvider {...methods}>
        <AiCrawlSettingsCard configured={configured} />
      </FormProvider>
    </Theme>
  );
};

describe('AiCrawlSettingsCard', () => {
  it('renders heading, description, and live edge badge when configured', () => {
    render(<TestWrapper configured={true} />);

    expect(screen.getByText('Cloudflare AI Crawl Control')).toBeDefined();
    expect(screen.getByText('Live Edge Sync')).toBeDefined();
    expect(screen.getByText('Block AI Scrapers and Crawlers')).toBeDefined();
    expect(screen.getByText('AI Search Bots')).toBeDefined();
    expect(screen.getByText('AI Model Training Bots')).toBeDefined();
    expect(screen.getByText('AI User Agents')).toBeDefined();
  });

  it('renders warning callout when unconfigured', () => {
    render(<TestWrapper configured={false} />);

    expect(screen.getByText('Unconfigured')).toBeDefined();
    expect(screen.getByText('CF_API_TOKEN')).toBeDefined();
    expect(screen.getByText('CF_ZONE_ID')).toBeDefined();
  });

  it('toggles master switch to block and back to disabled', async () => {
    render(<TestWrapper configured={true} />);

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');

    await userEvent.click(masterSwitch);
    expect(masterSwitch.getAttribute('aria-checked')).toBe('true');

    await userEvent.click(masterSwitch);
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('applies Block All preset properly', async () => {
    render(<TestWrapper configured={true} />);

    const blockAllBtn = screen.getByRole('button', { name: /block all/i });
    await userEvent.click(blockAllBtn);

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('applies Allow Search Only preset', async () => {
    render(
      <TestWrapper
        configured={true}
        initialValues={{
          aiBotsProtection: 'block',
          aiSearch: 'block',
          aiTraining: 'block',
          aiUser: 'block',
        }}
      />
    );

    const allowSearchBtn = screen.getByRole('button', { name: /allow search only/i });
    await userEvent.click(allowSearchBtn);

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('associates accessibility labels with IDs and aria-describedby', () => {
    render(<TestWrapper configured={true} />);

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('id')).toBe('settings-ai-bots-switch');
    expect(masterSwitch.getAttribute('aria-describedby')).toBe('settings-ai-bots-description');
  });
});
