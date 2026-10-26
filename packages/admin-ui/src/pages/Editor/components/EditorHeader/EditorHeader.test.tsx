import { describe, expect, it, vi } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../../../test/test-utils';
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
} = {}) => {
  const queryClient = createTestQueryClient();
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

  return rtlRender(<Harness />);
};

describe('EditorHeader', () => {
  describe('Author Role', () => {
    it('renders "Save Draft" and "Submit for Review" buttons for author', () => {
      renderEditorHeader({ role: 'author', status: 'draft' });

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      expect(saveDraftBtn.hasAttribute('disabled')).toBe(false);

      const submitBtn = screen.getByRole('button', { name: /submit for review/i });
      expect(submitBtn.hasAttribute('disabled')).toBe(false);

      expect(screen.queryByRole('button', { name: /^publish$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /mark ready/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /archive/i })).toBeNull();
    });

    it('clicking "Save Draft" triggers onSaveDraft with draft status', async () => {
      const user = userEvent.setup();
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'author', status: 'draft', onSaveWithStatus });

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      await user.click(saveDraftBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('draft');
    });

    it('clicking "Submit for Review" triggers save with in_review status', async () => {
      const user = userEvent.setup();
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'author', status: 'in_review', onSaveWithStatus });

      const submitBtn = screen.getByRole('button', { name: /submit for review/i });
      await user.click(submitBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('in_review');
    });
  });

  describe('Editor / Admin Role', () => {
    it('renders all workflow status buttons for administrators and editors', () => {
      renderEditorHeader({ role: 'admin', status: 'draft' });

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      expect(saveDraftBtn.hasAttribute('disabled')).toBe(false);

      const inReviewBtn = screen.getByRole('button', { name: /in review/i });
      expect(inReviewBtn.hasAttribute('disabled')).toBe(false);

      const markReadyBtn = screen.getByRole('button', { name: /mark ready/i });
      expect(markReadyBtn.hasAttribute('disabled')).toBe(false);

      const publishBtn = screen.getByRole('button', { name: /^publish$/i });
      expect(publishBtn.hasAttribute('disabled')).toBe(false);

      const archiveBtn = screen.getByRole('button', { name: /archive/i });
      expect(archiveBtn.hasAttribute('disabled')).toBe(false);
    });

    it('clicking "In Review" sets status to in_review and saves', async () => {
      const user = userEvent.setup();
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'admin', status: 'draft', onSaveWithStatus });

      const inReviewBtn = screen.getByRole('button', { name: /in review/i });
      await user.click(inReviewBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('in_review');
    });

    it('clicking "Ready for Publish" sets status to ready_for_publish and saves', async () => {
      const user = userEvent.setup();
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'admin', status: 'in_review', onSaveWithStatus });

      const markReadyBtn = screen.getByRole('button', { name: /mark ready/i });
      await user.click(markReadyBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('ready_for_publish');
    });

    it('clicking "Publish" invokes publish with published status', async () => {
      const user = userEvent.setup();
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'editor', status: 'draft', onSaveWithStatus });

      const publishBtn = screen.getByRole('button', { name: /^publish$/i });
      await user.click(publishBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('published');
    });

    it('clicking "Archive" invokes save with archived status', async () => {
      const user = userEvent.setup();
      const onSaveWithStatus = vi.fn();
      renderEditorHeader({ role: 'editor', status: 'published', onSaveWithStatus });

      const archiveBtn = screen.getByRole('button', { name: /archive/i });
      await user.click(archiveBtn);

      expect(onSaveWithStatus).toHaveBeenCalledWith('archived');
    });

    it('disables "Archive" button when entry is already archived', () => {
      renderEditorHeader({ role: 'editor', status: 'archived' });

      const archiveBtn = screen.getByRole('button', { name: /archive/i });
      expect(archiveBtn.hasAttribute('disabled')).toBe(true);
    });
  });
});
