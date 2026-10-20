import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme, Box } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import { AiCrawlSettingsCard } from './AiCrawlSettingsCard';
import type { SettingsFormValues } from '../types';

const defaultValues: SettingsFormValues = {
  siteTitle: 'My Awesome Site',
  canonicalOrigin: 'https://example.com',
  description: 'Example site',
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

const FormWrapper: React.FC<{ initialValues?: Partial<SettingsFormValues>; configured?: boolean }> = ({
  initialValues,
  configured = true,
}) => {
  const methods = useForm<SettingsFormValues>({
    defaultValues: { ...defaultValues, ...initialValues },
  });

  return (
    <Theme appearance="light" accentColor="cyan" radius="medium">
      <FormProvider {...methods}>
        <Box style={{ maxWidth: '800px', margin: '20px auto' }}>
          <AiCrawlSettingsCard configured={configured} />
        </Box>
      </FormProvider>
    </Theme>
  );
};

const meta = {
  title: 'Settings/AiCrawlSettingsCard',
  component: AiCrawlSettingsCard,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AiCrawlSettingsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConfiguredAllowed: Story = {
  render: () => <FormWrapper configured={true} />,
};

export const ConfiguredBlocked: Story = {
  render: () => (
    <FormWrapper
      configured={true}
      initialValues={{
        aiBotsProtection: 'block',
        aiSearch: 'block',
        aiTraining: 'block',
        aiUser: 'block',
      }}
    />
  ),
};

export const AllowSearchBlockTraining: Story = {
  render: () => (
    <FormWrapper
      configured={true}
      initialValues={{
        aiBotsProtection: 'disabled',
        aiSearch: 'disabled',
        aiTraining: 'block',
        aiUser: 'disabled',
      }}
    />
  ),
};

export const UnconfiguredCredentials: Story = {
  render: () => <FormWrapper configured={false} />,
};
