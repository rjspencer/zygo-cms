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
  analyticsSiteTag: '',
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

    const heading = screen.getByRole('heading', { name: 'Cloudflare AI Crawl Control' });
    expect(heading.textContent).toBe('Cloudflare AI Crawl Control');
    expect(screen.getByText('Live Edge Sync').textContent).toBe('Live Edge Sync');
    expect(
      screen.getByText('Manage edge blocking and indexing policies for AI scrapers, search crawlers, and LLM training bots.')
    ).not.toBeNull();

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');

    expect(screen.getByRole('button', { name: 'Block All' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Allow Search Only' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Allow All' }).hasAttribute('disabled')).toBe(false);

    expect(screen.getByText('AI Search Bots').textContent).toBe('AI Search Bots');
    expect(screen.getByText('AI Model Training Bots').textContent).toBe('AI Model Training Bots');
    expect(screen.getByText('AI User Agents').textContent).toBe('AI User Agents');
  });

  it('renders warning callout when unconfigured', () => {
    render(<TestWrapper configured={false} />);

    expect(screen.getByText('Unconfigured').textContent).toBe('Unconfigured');
    expect(screen.getByText(/CF_API_TOKEN/).textContent).toContain('CF_API_TOKEN');
    expect(screen.getByText(/CF_ZONE_ID/).textContent).toContain('CF_ZONE_ID');
    expect(screen.queryByRole('button', { name: 'Block All' })).toBeNull();
  });

  it('toggles master switch to block and back to disabled', async () => {
    const user = userEvent.setup();
    render(<TestWrapper configured={true} />);

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');

    await user.click(masterSwitch);
    expect(masterSwitch.getAttribute('aria-checked')).toBe('true');

    await user.click(masterSwitch);
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('applies Block All preset properly', async () => {
    const user = userEvent.setup();
    render(<TestWrapper configured={true} />);

    const blockAllBtn = screen.getByRole('button', { name: /block all/i });
    await user.click(blockAllBtn);

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('true');
  });

  it('applies Allow Search Only preset', async () => {
    const user = userEvent.setup();
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
    await user.click(allowSearchBtn);

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('associates accessibility labels with IDs and aria-describedby', () => {
    render(<TestWrapper configured={true} />);

    const masterSwitch = screen.getByRole('switch', { name: /block ai scrapers and crawlers/i });
    expect(masterSwitch.getAttribute('id')).toBe('settings-ai-bots-switch');
    expect(masterSwitch.getAttribute('aria-describedby')).toBe('settings-ai-bots-description');
    const description = document.getElementById('settings-ai-bots-description');
    expect(description?.textContent).toContain('Master switch to block recognized AI crawlers');
  });
});
