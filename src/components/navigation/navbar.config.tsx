import {
  Bike,
  Building2,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Dumbbell,
  NotebookText,
  House,
  Map,
  MapPinned,
  Mountain,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { NavGroup, NavItem } from './navbar.types';

export const navGroups: NavGroup[] = [
  {
    label: 'Explore',
    items: [
      { label: 'Events', href: '/events', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Ride with Experts', href: '/ride-with-experts', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Ride Notes', href: '/ride-notes', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Community Rides', href: '/community-rides', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Organizations', href: '/organizations', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Campaigns', href: '/campaigns', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Marketplace', href: '/marketplace', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Cycle Hubs', href: '/store-locator', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      { label: 'Services', href: '/services', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
      {
        label: 'Expert Directory',
        href: '/experts',
        showFor: ['anonymous', 'participant', 'expert', 'admin'],
      },
    ],
  },
  {
    label: 'For Experts',
    items: [
      { label: 'Create Event', href: '/events/create', showFor: ['expert', 'admin'] },
      { label: 'Organize Trainings', href: '/events/trainings/create', showFor: ['expert', 'admin'] },
      { label: 'Upload Trails', href: '/upload', showFor: ['admin', 'expert'] },
      { label: 'Create Organization', href: '/organizations/create', showFor: ['expert'] },
    ],
  },
];

export const navItems: NavItem[] = [
  { label: 'Home', href: '/home', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
  { label: 'Explore Trails', href: '/trails', showFor: ['anonymous', 'participant', 'expert', 'admin'] },
  {
    label: 'For Experts',
    href: '/experts/join',
    showFor: ['anonymous'],
  },
];

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  '/home': House,
  '/trails': Map,
  '/events': CalendarDays,
  '/ride-with-experts': Mountain,
  '/ride-notes': NotebookText,
  '/community-rides': Bike,
  '/experts': Users,
  '/organizations': Users,
  '/organizations/create': Building2,
  '/campaigns': CircleDollarSign,
  '/marketplace': ShoppingBag,
  '/store-locator': Store,
  '/services': BriefcaseBusiness,
  '/events/create': PlusCircle,
  '/events/trainings/create': Dumbbell,
  '/upload': MapPinned,
  '/experts/join': Sparkles,
  '/organizations/me': Users,
};

export function getNavIcon(href: string) {
  const Icon = NAV_ICON_MAP[href] || MapPinned;
  return <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />;
}

export const navButtonClass =
  'inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold transition-colors';
export const navButtonIdleClass = 'text-emerald-50/90 hover:bg-white/10 hover:text-white';
export const navButtonActiveClass =
  'border border-lime-300/45 bg-lime-300/15 text-lime-50 shadow-sm shadow-emerald-950/20';
export const dropdownContentClass =
  'z-50 flex w-60 flex-col gap-1 rounded-2xl border border-white/10 bg-emerald-950/95 p-2 text-sm text-white shadow-xl shadow-emerald-950/30 backdrop-blur';
export const dropdownItemClass =
  'rounded-xl px-3 py-2 text-sm font-semibold outline-none transition-colors';
export const mobileItemClass = 'rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors';
export const activeMenuItemClass = 'border border-lime-300/35 bg-lime-300/15 text-lime-50';
export const mobilePanelBaseClass =
  'mt-2 rounded-3xl border border-white/10 bg-emerald-950/95 shadow-xl shadow-emerald-950/30 backdrop-blur transition-[max-height,opacity,padding,border-color] duration-300 ease-out lg:hidden';
export const mobilePanelOpenClass =
  'max-h-[calc(100dvh-5.5rem)] touch-pan-y overflow-y-auto overscroll-contain p-3 opacity-100 [-webkit-overflow-scrolling:touch]';
export const mobilePanelClosedClass =
  'max-h-0 overflow-hidden border-transparent p-0 opacity-0';
