export interface Redirect {
  id: number;
  source_path: string;
  target_url: string;
  status_code: number;
  notes: string | null;
  hit_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRedirectInput {
  source_path: string;
  target_url: string;
  status_code: number;
  notes?: string;
}

export interface UpdateRedirectInput {
  source_path?: string;
  target_url?: string;
  status_code?: number;
  notes?: string;
}
