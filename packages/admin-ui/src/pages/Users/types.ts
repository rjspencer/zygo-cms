export interface UserItem {
  id: number;
  auth_provider_id?: string;
  email: string | null;
  display_name: string | null;
  role: string;
  bio?: string | null;
  website?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export type UserRole = 'admin' | 'editor' | 'author';

export interface InviteUserPayload {
  email: string;
  display_name?: string;
  role: string;
}

export interface EditUserPayload {
  role: string;
  display_name: string | null;
  bio: string | null;
  website: string | null;
  avatar_url: string | null;
}

export interface InvitedUserForEmail {
  email: string;
  displayName?: string;
  role: string;
}
