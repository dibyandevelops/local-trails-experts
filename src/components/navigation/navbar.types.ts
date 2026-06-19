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

export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
  createdAt: string;
  tone: NotificationTone;
};

export type NotificationsData = {
  unreadCount: number;
  notifications: NotificationItem[];
};
