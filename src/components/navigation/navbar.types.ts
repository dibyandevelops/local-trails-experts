import type { User } from '@/types';

export type NavRole = 'anonymous' | 'admin' | 'expert' | 'participant';

export type NavItem = {
  label: string;
  href: string;
  badge?: string;
  requiresAuth?: boolean;
  requiresRole?: Array<Exclude<NavRole, 'anonymous'>>;
  requiresOrgMember?: boolean;
  showFor?: NavRole[];
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type NavbarUser = User | null;

export type AlertsData = {
  unreadCount: number;
};
