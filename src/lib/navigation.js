import {
  ChartColumnBig,
  CreditCard,
  FileImage,
  MapPinned,
  NotebookTabs,
  Store,
  Receipt,
  ScanLine,
  Sparkles,
  Ticket,
  Users,
  UserPlus,
} from 'lucide-react'

export const primaryNavigation = [
  {
    title: 'Dashboard',
    description: 'Overview, revenue, and live activity',
    icon: ChartColumnBig,
    href: '/dashboard',
  },
  {
    title: 'Orders & Payments',
    description: 'Track payments, refunds, and statuses',
    icon: CreditCard,
    href: '/dashboard/orders',
  },
  {
    title: 'Office Sales',
    description: 'Cash tickets, QR passes, and print',
    icon: Receipt,
    href: '/dashboard/office-sales',
  },
  {
    title: 'Expenses',
    description: 'Track costs, receipts, and categories',
    icon: NotebookTabs,
    href: '/dashboard/expenses',
  },
  {
    title: 'Past Events',
    description: 'Archive posters, dates, and video links',
    icon: FileImage,
    href: '/dashboard/past-events',
  },
  {
    title: 'Events & Tickets',
    description: 'Manage events, pricing, and inventory',
    icon: Ticket,
    href: '/dashboard/events',
  },
  {
    title: 'Locations',
    description: 'Countries, cities, and sub-events',
    icon: MapPinned,
    href: '/dashboard/locations',
  },
  {
    title: 'Stall Requests',
    description: 'Website leads and vendor applications',
    icon: Store,
    href: '/dashboard/stalls',
  },
  {
    title: 'Volunteers',
    description: 'Volunteer applications and follow-up',
    icon: UserPlus,
    href: '/dashboard/volunteers',
  },
  {
    title: 'Team / Users',
    description: 'Create and manage staff accounts',
    icon: Users,
    href: '/dashboard/users',
  },
  {
    title: 'Scan Reports',
    description: 'Scanner activity and entry analytics',
    icon: ScanLine,
    href: '/dashboard/scans',
  },
  {
    title: 'Website Media',
    description: 'Manage banners, sliders, and visuals',
    icon: Sparkles,
    href: '/dashboard/featured',
  },
]
