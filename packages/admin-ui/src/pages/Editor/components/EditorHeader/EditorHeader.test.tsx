import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { EntryFormValues, EntryStatus, EntryType } from '../../types';
import { EMPTY_FORM_VALUES } from '../../utils/entryForm';
import { EditorHeader } from './EditorHeader';

const renderEditorHeader = ({
  role = 'editor',
  status = 'draft',
  entryType = 'post' as EntryType,
  isNewEntry = false,
  isSaved = true,
  onSaveDraft = vi.fn(),
  onPublish = vi.fn(),
  onSaveWithStatus,
}: {
  role?: string;
  status?: EntryStatus;
  entryType?: EntryType;
  isNewEntry?: boolean;
  isSaved?: boolean;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  onSaveWithStatus?: (status: EntryStatus) => void;
}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(['me'], { role });

  const Harness: React.FC = () => {
    const methods = useForm<EntryFormValues>({
      defaultValues: { ...EMPTY_FORM_VALUES, status },
    });
    return (
      <Theme>
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <FormProvider {...methods}>
              <EditorHeader
                entryType={entryType}
                isNewEntry={isNewEntry}
                isSaved={isSaved}
                onSaveDraft={onSaveDraft}
                onPublish={onPublish}
                onSaveWithStatus={onSaveWithStatus}
                userRole={role}
              />
            </FormProvider>
          </QueryClientProvider>
        </MemoryRouter>
      </Theme>
    );
  };

  return render(<Harness />);
};

describe('EditorHeader', () => {
  describe('Author Role', () => {
    it('renders "Save Draft" and "Submit for Review" buttons for author', () => {
      renderEditorHeader({ role: 'author', status: 'draft' });

      expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDefined();
      expect(screen.getByTestId('editor-submit-review-btn')).toBeDefined();
      expect(screen.queryByTestId('editor-publish-btn')).toBeNull();
      expect(screen.queryByTestId('editor-mark-ready-btn')).toBeNull();
      expect(screen.queryByTestId('editor-archive-btn')).toBeNull();
    });

    it('clicking "Save Draft" triggers onSaveDraft with draft status', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'author', status: 'draft', onSaveWithStatus });

      const saveDraftBtn = screen.getByRole('button', { name: 'Save Draft' });
      fireEvent.click(saveDraftBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('draft');
    });

    it('clicking "Submit for Review" triggers save with in_review status', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'author', status: 'in_review', onSaveWithStatus });

      const submitBtn = screen.getByTestId('editor-submit-review-btn');
      fireEvent.click(submitBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('in_review');
    });
  });

  describe('Editor / Admin Role', () => {
    it('renders all workflow status buttons for administrators and editors', () => {
      renderEditorHeader({ role: 'admin', status: 'draft' });

      expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDefined();
      expect(screen.getByTestId('editor-submit-review-btn')).toBeDefined();
      expect(screen.getByTestId('editor-submit-review-btn').textContent).toContain('In Review');
      expect(screen.getByTestId('editor-mark-ready-btn')).toBeDefined();
      expect(screen.getByTestId('editor-mark-ready-btn').textContent).toContain('Mark Ready');
      expect(screen.getByTestId('editor-publish-btn')).toBeDefined();
      expect(screen.getByTestId('editor-archive-btn')).toBeDefined();
    });

    it('clicking "In Review" sets status to in_review and saves', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'admin', status: 'draft', onSaveWithStatus });

      const inReviewBtn = screen.getByTestId('editor-submit-review-btn');
      fireEvent.click(inReviewBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('in_review');
    });

    it('clicking "Ready for Publish" sets status to ready_for_publish and saves', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'admin', status: 'in_review', onSaveWithStatus });

      const markReadyBtn = screen.getByTestId('editor-mark-ready-btn');
      fireEvent.click(markReadyBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('ready_for_publish');
    });

    it('clicking "Publish" invokes publish with published status', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'editor', status: 'draft', onSaveWithStatus });

      const publishBtn = screen.getByTestId('editor-publish-btn');
      fireEvent.click(publishBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('published');
    });

    it('clicking "Archive" invokes save with archived status', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'editor', status: 'published', onSaveWithStatus });

      const archiveBtn = screen.getByTestId('editor-archive-btn');
      fireEvent.click(archiveBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('archived');
    });

    it('disables "Archive" button when entry is already archived', () => {
      renderEditorHeader({ role: 'editor', status: 'archived' });

      const archiveBtn = screen.getByTestId('editor-archive-btn') as HTMLButtonElement;
      expect(archiveBtn.disabled).toBe(true);
    });
  });
});
