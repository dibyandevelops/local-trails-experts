import { render, screen } from '@testing-library/react';
import MobileNavbar from '@/components/navigation/mobile-navbar';
import {
  NotificationsDropdown,
  notificationsScrollAreaClass,
} from '@/components/navigation/notifications-dropdown';
import type { NavbarUser, NavItem } from '@/components/navigation/navbar.types';

vi.mock('@/components/theme-toggle', () => ({
  default: () => <button type="button">Theme</button>,
}));

const items: NavItem[] = [
  { label: 'Home', href: '/home' },
  { label: 'Explore trails', href: '/trails' },
];

const baseProps = {
  navItems: items,
  navGroups: [],
  user: null,
  loadingUser: false,
  accountActionLabel: 'View profile',
  hasOrganizationAccess: false,
  canSeeItem: () => true,
  isNavItemActive: () => false,
  getNavLabel: (item: NavItem) => item.label,
  closeMobileMenu: vi.fn(),
  openLogin: vi.fn(),
  openRegister: vi.fn(),
  handleViewProfile: vi.fn(),
  handleLogout: vi.fn(),
};

describe('MobileNavbar', () => {
  it('allows touch scrolling only while the menu is open', () => {
    const { rerender } = render(<MobileNavbar {...baseProps} mobileOpen />);
    const menu = document.getElementById('mobile-navigation');

    expect(menu).toHaveClass('overflow-y-auto', 'overscroll-contain', 'touch-pan-y');
    expect(menu).not.toHaveClass('overflow-hidden');

    rerender(<MobileNavbar {...baseProps} mobileOpen={false} />);

    expect(menu).toHaveClass('overflow-hidden', 'max-h-0');
    expect(menu).not.toHaveClass('overflow-y-auto');
  });

  it('does not embed notifications inside the mobile menu', () => {
    const user = { id: 'user-1', role: 'participant' } as NavbarUser;
    render(<MobileNavbar {...baseProps} user={user} mobileOpen />);

    expect(screen.queryByRole('button', { name: 'View notifications' })).not.toBeInTheDocument();
  });

  it('renders notifications as a standalone accessible icon with a scrollable list', () => {
    render(
      <NotificationsDropdown
        data={{
          unreadCount: 3,
          notifications: [
            {
              id: 'notification-1',
              type: 'trail_update',
              title: 'Trail update',
              description: 'A recent trail condition was posted.',
              href: '/trails/example',
              createdAt: new Date().toISOString(),
              tone: 'info',
            },
          ],
        }}
      />
    );

    const trigger = screen.getByRole('button', { name: 'View notifications' });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    expect(notificationsScrollAreaClass).toContain('overflow-y-auto');
    expect(notificationsScrollAreaClass).toContain('overscroll-contain');
    expect(notificationsScrollAreaClass).toContain('touch-pan-y');
    expect(notificationsScrollAreaClass).toContain('100dvh');
  });
});
