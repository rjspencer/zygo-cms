import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Theme, Box, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebMCPProvider } from '../providers/WebMCPProvider';
import { SubmissionsTable } from '../pages/Submissions/components/SubmissionsTable';
import { SubmissionDetailDialog } from '../pages/Submissions/components/SubmissionDetailDialog';
import type { FormSubmission } from '../pages/Submissions/types';

export const mockSubmissions: FormSubmission[] = [
  {
    id: 1,
    form_name: 'contact',
    page_path: '/contact',
    sender_name: 'Alex Morgan',
    sender_email: 'alex.morgan@example.com',
    subject: 'Enterprise Plan Quotation',
    message:
      'Hello Zygo team,\n\nWe are looking to migrate 15 client sites to Zygo CMS with D1 and Turnstile protection. Could we schedule a demo call this Thursday?\n\nBest regards,\nAlex',
    metadata_json: JSON.stringify(
      { company: 'Acme Digital', estimated_traffic: '500k/mo', budget: '$10k+' },
      null,
      2
    ),
    status: 'unread',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: 2,
    form_name: 'newsletter',
    page_path: '/',
    sender_name: null,
    sender_email: 'developer@technews.io',
    subject: null,
    message: 'Subscribing to Zygo CMS changelog and release notes.',
    metadata_json: null,
    status: 'read',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 3,
    form_name: 'contact',
    page_path: '/pricing',
    sender_name: 'Samantha Vance',
    sender_email: 'samantha@vance-media.com',
    subject: 'Question on Cloudflare Zero Trust',
    message: 'Does Zygo CMS support custom Cloudflare Access policies per worker endpoint?',
    metadata_json: JSON.stringify({ priority: 'normal', source: 'pricing_footer' }, null, 2),
    status: 'archived',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

interface SubmissionsDemoProps {
  initialSubmissions?: FormSubmission[];
  isLoading?: boolean;
  initialDialogOpen?: boolean;
}

const SubmissionsDemoComponent: React.FC<SubmissionsDemoProps> = ({
  initialSubmissions = mockSubmissions,
  isLoading = false,
  initialDialogOpen = false,
}) => {
  const [submissions, setSubmissions] = useState<FormSubmission[]>(initialSubmissions);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(
    initialDialogOpen && initialSubmissions.length > 0 ? initialSubmissions[0] : null
  );
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(initialDialogOpen);

  const handleToggleRead = (id: number) => {
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'unread' ? 'read' : 'unread' } : s
      )
    );
  };

  const handleDelete = (id: number) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSelect = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setIsDialogOpen(true);
    if (submission.status === 'unread') {
      handleToggleRead(submission.id);
    }
  };

  return (
    <Box p="4" style={{ maxWidth: 1000, margin: '0 auto' }}>
      <Flex direction="column" gap="4">
        <Box>
          <Heading size="5" mb="1">
            Submissions Inbox
          </Heading>
          <Text size="2" color="gray">
            Form submissions collected from native contact and newsletter sections.
          </Text>
        </Box>

        <Card variant="surface">
          <SubmissionsTable
            submissions={submissions}
            isLoading={isLoading}
            onSelectSubmission={handleSelect}
            onToggleRead={handleToggleRead}
            onDelete={handleDelete}
          />
        </Card>
      </Flex>

      <SubmissionDetailDialog
        submission={selectedSubmission}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onStatusChange={(id, status) => {
          setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
          if (selectedSubmission) {
            setSelectedSubmission({ ...selectedSubmission, status });
          }
        }}
        onDelete={(id) => {
          handleDelete(id);
          setIsDialogOpen(false);
        }}
      />
    </Box>
  );
};

const meta: Meta<typeof SubmissionsDemoComponent> = {
  title: 'Admin/Submissions',
  component: SubmissionsDemoComponent,
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      return (
        <Theme appearance="light">
          <QueryClientProvider client={queryClient}>
            <WebMCPProvider>
              <MemoryRouter>
                <Story />
              </MemoryRouter>
            </WebMCPProvider>
          </QueryClientProvider>
        </Theme>
      );
    },
  ],
};

export default meta;
type Story = StoryObj<typeof SubmissionsDemoComponent>;

/**
 * Empty state: No submissions collected yet.
 */
export const EmptyState: Story = {
  args: {
    initialSubmissions: [],
    isLoading: false,
    initialDialogOpen: false,
  },
};

/**
 * Populated table: Showing unread, read, and archived submissions.
 */
export const PopulatedTable: Story = {
  args: {
    initialSubmissions: mockSubmissions,
    isLoading: false,
    initialDialogOpen: false,
  },
};

/**
 * Detail dialog open: Displaying submission content, headers, and metadata modal.
 */
export const DetailDialogOpen: Story = {
  args: {
    initialSubmissions: mockSubmissions,
    isLoading: false,
    initialDialogOpen: true,
  },
};

/**
 * Loading state: Skeleton/loading indicator while fetching submissions.
 */
export const LoadingState: Story = {
  args: {
    initialSubmissions: [],
    isLoading: true,
    initialDialogOpen: false,
  },
};
