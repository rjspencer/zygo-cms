import React, { useState, useMemo } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  TextField,
  Tabs,
  Badge,
  Callout,
} from '@radix-ui/themes';
import {
  MagnifyingGlassIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoCircledIcon,
} from '@radix-ui/react-icons';
import { useRegisterWebMCPTools } from '../../providers/WebMCPProvider';
import { createGlobalSubmissionTools } from '../../lib/webmcp/submissionTools';
import {
  useSubmissions,
  useSubmissionStats,
  useUpdateSubmissionStatus,
  useDeleteSubmission,
} from './hooks/useSubmissions';
import { SubmissionsTable } from './components/SubmissionsTable';
import { SubmissionDetailDialog } from './components/SubmissionDetailDialog';
import { exportSubmissionsToCsv } from './utils/csvExport';
import type { FormSubmission, SubmissionsTab, SubmissionStatus } from './types';

export const Submissions: React.FC = () => {
  const [statusTab, setStatusTab] = useState<SubmissionsTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Register in-browser WebMCP tools for Submissions
  const submissionTools = useMemo(() => createGlobalSubmissionTools(), []);
  useRegisterWebMCPTools(submissionTools);

  // Query submissions and stats
  const {
    data: submissionsData,
    isLoading,
    error: queryError,
  } = useSubmissions({
    status: statusTab === 'all' ? undefined : statusTab,
    q: searchQuery,
    page,
    per_page: perPage,
  });

  const { data: stats } = useSubmissionStats();

  const updateStatusMutation = useUpdateSubmissionStatus();
  const deleteMutation = useDeleteSubmission();

  const submissions = submissionsData?.submissions || [];
  const totalItems = submissionsData?.total || 0;
  const totalPages = submissionsData?.total_pages || 1;

  const handleTabChange = (val: string) => {
    setStatusTab(val as SubmissionsTab);
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleOpenDetail = (submission: FormSubmission) => {
    setSelectedSubmission(submission);
    setIsDetailOpen(true);
    // If opening an unread submission, automatically mark as read
    if (submission.status === 'unread') {
      updateStatusMutation.mutate({ id: submission.id, status: 'read' });
    }
  };

  const handleToggleRead = (id: number, currentStatus: SubmissionStatus) => {
    const nextStatus: SubmissionStatus = currentStatus === 'unread' ? 'read' : 'unread';
    updateStatusMutation.mutate(
      { id, status: nextStatus },
      {
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : String(err));
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this submission?')) {
      deleteMutation.mutate(id, {
        onError: (err) => {
          setErrorMessage(err instanceof Error ? err.message : String(err));
        },
      });
    }
  };

  const handleExportCsv = () => {
    exportSubmissionsToCsv(submissions, `submissions-${statusTab}-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <Box data-testid="submissions-page" pb="6">
      {/* Page Header */}
      <Flex justify="between" align="center" mb="4">
        <Box>
          <Flex align="center" gap="2">
            <Heading size="6">Submissions Inbox</Heading>
            {stats && stats.unread_count > 0 && (
              <Badge color="red" variant="solid" radius="full">
                {stats.unread_count} unread
              </Badge>
            )}
          </Flex>
          <Text size="2" color="gray">
            View and manage inquiries, contact form submissions, and newsletter leads.
          </Text>
        </Box>

        <Button
          variant="outline"
          color="gray"
          aria-label="Export submissions as CSV"
          data-testid="submissions-export-btn"
          onClick={handleExportCsv}
          disabled={submissions.length === 0}
        >
          <DownloadIcon width="16" height="16" /> Export CSV
        </Button>
      </Flex>

      {/* Error Callout */}
      {(errorMessage || queryError) && (
        <Callout.Root color="red" mb="4" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            {errorMessage || (queryError instanceof Error ? queryError.message : 'Error fetching submissions')}
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Controls: Tabs & Search */}
      <Flex justify="between" align="center" wrap="wrap" gap="3" mb="4">
        <Tabs.Root value={statusTab} onValueChange={handleTabChange}>
          <Tabs.List>
            <Tabs.Trigger value="all" data-testid="submissions-tab-all">
              All {stats?.total_count != null ? `(${stats.total_count})` : ''}
            </Tabs.Trigger>
            <Tabs.Trigger value="unread" data-testid="submissions-tab-unread">
              Unread {stats?.unread_count != null ? `(${stats.unread_count})` : ''}
            </Tabs.Trigger>
            <Tabs.Trigger value="read" data-testid="submissions-tab-read">
              Read {stats?.read_count != null ? `(${stats.read_count})` : ''}
            </Tabs.Trigger>
            <Tabs.Trigger value="archived" data-testid="submissions-tab-archived">
              Archived {stats?.archived_count != null ? `(${stats.archived_count})` : ''}
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <TextField.Root
          placeholder="Search submissions..."
          value={searchQuery}
          onChange={handleSearchChange}
          aria-label="Search submissions"
          data-testid="submissions-search-input"
          style={{ width: '280px' }}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </Flex>

      {/* Table */}
      <SubmissionsTable
        submissions={submissions}
        isLoading={isLoading}
        onSelectSubmission={handleOpenDetail}
        onToggleRead={handleToggleRead}
        onDelete={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Flex justify="between" align="center" mt="4">
          <Text size="2" color="gray">
            Showing {(page - 1) * perPage + 1} - {Math.min(page * perPage, totalItems)} of {totalItems}
          </Text>
          <Flex gap="2">
            <Button
              variant="soft"
              color="gray"
              size="1"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeftIcon /> Previous
            </Button>
            <Button
              variant="soft"
              color="gray"
              size="1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRightIcon />
            </Button>
          </Flex>
        </Flex>
      )}

      {/* Detail Dialog */}
      <SubmissionDetailDialog
        submission={selectedSubmission}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onStatusChange={(id, status) => {
          updateStatusMutation.mutate({ id, status });
          if (selectedSubmission && selectedSubmission.id === id) {
            setSelectedSubmission({ ...selectedSubmission, status });
          }
        }}
        onDelete={(id) => {
          deleteMutation.mutate(id);
          setIsDetailOpen(false);
        }}
      />
    </Box>
  );
};

export default Submissions;
