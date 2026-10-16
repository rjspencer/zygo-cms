import type React from 'react';

export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}
