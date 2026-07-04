import {
  ChartColumnBig,
  CreditCard,
  MapPinned,
  ScanLine,
  Sparkles,
  Ticket,
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
