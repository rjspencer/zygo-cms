import type { UserItem, InvitedUserForEmail } from './types';

export function getRoleBadgeColor(role: string): 'cyan' | 'crimson' | 'amber' | 'gray' {
  switch (role?.toLowerCase()) {
    case 'admin':
      return 'cyan';
    case 'editor':
      return 'crimson';
    case 'author':
      return 'amber';
    default:
      return 'gray';
  }
}

export function getInitials(user: Pick<UserItem, 'display_name' | 'email'>): string {
  if (user.display_name && user.display_name.trim().length > 0) {
    const parts = user.display_name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return user.display_name.slice(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

export function generateInviteEmailTemplate(invited: InvitedUserForEmail): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `Subject: You've been invited to Zygo CMS

Hi ${invited.displayName || 'there'},

You have been invited to join the admin team on Zygo CMS with the "${invited.role}" role.

You can access the admin dashboard here:
${origin}/admin

Please sign in using your email: ${invited.email}

Welcome aboard!`;
}
