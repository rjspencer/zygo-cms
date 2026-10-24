import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EntryFormValues, EntryStatus, EntryType } from '../../types';
import { EMPTY_FORM_VALUES } from '../../utils/entryForm';
import { EditorUIStateProvider } from '../../context/EditorUIStateContext';
import { EditorHeader } from './EditorHeader';

const renderEditorHeader = ({
  status = 'draft',
  role = 'editor',
  entryType = 'post',
  isNewEntry = false,
  isSaved = false,
  onSaveDraft = vi.fn(),
  onPublish = vi.fn(),
  onSaveWithStatus = vi.fn(),
}: {
  status?: EntryStatus;
  role?: string;
  entryType?: EntryType;
  isNewEntry?: boolean;
  isSaved?: boolean;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  onSaveWithStatus?: (status: EntryStatus) => void;
} = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(['me'], { role });

  const Harness: React.FC = () => {
    const methods = useForm<EntryFormValues>({
      defaultValues: { ...EMPTY_FORM_VALUES, status, title: 'Test Entry' },
    });

    return (
      <MemoryRouter>
        <Theme>
          <QueryClientProvider client={queryClient}>
            <FormProvider {...methods}>
              <EditorUIStateProvider initialTitleEditing={false}>
                <EditorHeader
                  entryType={entryType}
                  isNewEntry={isNewEntry}
                  isSaved={isSaved}
                  onSaveDraft={onSaveDraft}
                  onPublish={onPublish}
                  onSaveWithStatus={onSaveWithStatus}
                  userRole={role}
                />
              </EditorUIStateProvider>
            </FormProvider>
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    );
  };

  return render(<Harness />);
};

describe('EditorHeader', () => {
  describe('Author Role', () => {
    it('renders "Save Draft" and "Submit for Review" buttons only', () => {
      renderEditorHeader({ role: 'author', status: 'draft' });

      expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDefined();
      const submitBtn = screen.getByTestId('editor-submit-review-btn');
      expect(submitBtn).toBeDefined();
      expect(submitBtn.textContent).toContain('Submit for Review');

      expect(screen.queryByTestId('editor-publish-btn')).toBeNull();
      expect(screen.queryByTestId('editor-mark-ready-btn')).toBeNull();
      expect(screen.queryByTestId('editor-archive-btn')).toBeNull();
    });

    it('clicking "Submit for Review" sets status to in_review and invokes save', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'author', status: 'draft', onSaveWithStatus });

      const submitBtn = screen.getByTestId('editor-submit-review-btn');
      fireEvent.click(submitBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('in_review');
    });

    it('clicking "Save Draft" sets status to draft and invokes save', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'author', status: 'in_review', onSaveWithStatus });

      const draftBtn = screen.getByRole('button', { name: 'Save Draft' });
      fireEvent.click(draftBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('draft');
    });
  });

  describe('Editor / Admin Role', () => {
    it('renders "Save Draft", "Publish", and "Archive" buttons for draft entries', () => {
      renderEditorHeader({ role: 'editor', status: 'draft' });

      expect(screen.getByRole('button', { name: 'Save Draft' })).toBeDefined();
      expect(screen.getByTestId('editor-publish-btn')).toBeDefined();
      expect(screen.getByTestId('editor-archive-btn')).toBeDefined();
      expect(screen.queryByTestId('editor-submit-review-btn')).toBeNull();
      expect(screen.queryByTestId('editor-mark-ready-btn')).toBeNull();
    });

    it('renders "Mark Ready" button when entry status is in_review', () => {
      renderEditorHeader({ role: 'editor', status: 'in_review' });

      const markReadyBtn = screen.getByTestId('editor-mark-ready-btn');
      expect(markReadyBtn).toBeDefined();
      expect(markReadyBtn.textContent).toContain('Mark Ready');
      expect(screen.getByTestId('editor-publish-btn')).toBeDefined();
    });

    it('clicking "Mark Ready" sets status to ready_for_publish and saves', () => {
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'editor', status: 'in_review', onSaveWithStatus });

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
