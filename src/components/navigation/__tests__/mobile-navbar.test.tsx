import { fireEvent, render, screen } from '@testing-library/react';
import MobileNavbar from '@/components/navigation/mobile-navbar';
import {
  MobileNotificationsPanel,
  NotificationIconButton,
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

  it('renders notifications in a matching scrollable mobile panel', () => {
    const data = {
      unreadCount: 3,
      notifications: [
        {
          id: 'notification-1',
          type: 'trail_update',
          title: 'Trail update',
          description: 'A recent trail condition was posted.',
          href: '/trails/example',
          createdAt: new Date().toISOString(),
          tone: 'info' as const,
        },
      ],
    };
    const { rerender } = render(
      <>
        <NotificationIconButton
          data={data}
          expanded
          controls="mobile-notifications"
        />
        <MobileNotificationsPanel open data={data} onNavigate={vi.fn()} />
      </>
    );

    const trigger = screen.getByRole('button', { name: 'View notifications' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-notifications');
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Trail update')).toBeInTheDocument();

    const panel = document.getElementById('mobile-notifications');
    expect(panel).toHaveClass('overflow-y-auto', 'overscroll-contain', 'touch-pan-y');
    expect(panel).not.toHaveClass('overflow-hidden');

    rerender(
      <>
        <NotificationIconButton
          data={data}
          expanded={false}
          controls="mobile-notifications"
        />
        <MobileNotificationsPanel open={false} data={data} onNavigate={vi.fn()} />
      </>
    );

    expect(panel).toHaveClass('overflow-hidden', 'max-h-0');
    expect(screen.queryByText('Trail update')).not.toBeInTheDocument();
  });

  it('forwards dropdown trigger props to the notification button', () => {
    const handlePointerDown = vi.fn();
    render(
      <NotificationIconButton
        aria-haspopup="menu"
        data-state="closed"
        onPointerDown={handlePointerDown}
      />
    );

    const trigger = screen.getByRole('button', { name: 'View notifications' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('data-state', 'closed');

    fireEvent.pointerDown(trigger);
    expect(handlePointerDown).toHaveBeenCalledTimes(1);
  });
});
