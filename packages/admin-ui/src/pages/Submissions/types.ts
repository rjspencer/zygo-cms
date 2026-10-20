export type SubmissionStatus = 'unread' | 'read' | 'archived';

export interface FormSubmission {
  id: number;
  form_name: string;
  page_path: string | null;
  sender_name: string | null;
  sender_email: string;
  subject: string | null;
  message: string;
  metadata_json: string | null;
  status: SubmissionStatus;
  created_at: string;
}

export interface SubmissionStats {
  total_count: number;
  unread_count: number;
  read_count: number;
  archived_count: number;
}

export type SubmissionsTab = 'all' | 'unread' | 'read' | 'archived';

export interface SubmissionsQueryParams {
  status?: SubmissionStatus | 'all';
  form_name?: string;
  q?: string;
  page?: number;
  per_page?: number;
}

export interface SubmissionsListResponse {
  submissions: FormSubmission[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
