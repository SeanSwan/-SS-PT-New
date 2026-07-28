import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, Bell, CalendarCheck, CalendarX, ClipboardCheck, CreditCard, ShieldAlert } from 'lucide-react';
import {
  SignalBar,
  SignalCta,
  SignalEyebrow,
  SignalIntro,
  SignalLink,
  SignalLinkBody,
  SignalRail,
  SignalSummary,
  SignalTitle,
} from './AdminOverviewCommandSurface.styles';
type SignalTone = 'urgent' | 'ops' | 'community' | 'system';
interface SignalItem {
  href: string;
  label: string;
  detail: string;
  tone: SignalTone;
  icon: LucideIcon;
}
const signalItems: SignalItem[] = [
  {
    href: '#admin-mission-critical',
    label: 'Mission queues',
    detail: 'Intakes, waivers, payments',
    tone: 'urgent',
    icon: ClipboardCheck,
  },
  {
    href: '#admin-mission-critical',
    label: 'Lead alerts',
    detail: 'Contact submissions',
    tone: 'urgent',
    icon: Bell,
  },
  {
    href: '#admin-operations',
    label: 'Client ops',
    detail: 'Compliance and check-ins',
    tone: 'ops',
    icon: CalendarCheck,
  },
  {
    href: '#admin-operations',
    label: 'Session review',
    detail: 'Cancellations and tracking',
    tone: 'ops',
    icon: CalendarX,
  },
  {
    href: '#admin-community-safety',
    label: 'Safety reports',
    detail: 'Moderation and posts',
    tone: 'community',
    icon: ShieldAlert,
  },
  {
    href: '#admin-platform-pulse',
    label: 'Platform pulse',
    detail: 'Signups and system health',
    tone: 'system',
    icon: Activity,
  },
  {
    href: '#admin-business-lens',
    label: 'Business lens',
    detail: 'Revenue after action queues',
    tone: 'system',
    icon: CreditCard,
  },
];
const AdminSignalBar: React.FC = () => (
  <SignalBar aria-label="Admin signal shortcuts">
    <SignalIntro>
      <SignalEyebrow>Admin Signal Bar</SignalEyebrow>
      <SignalTitle>What needs attention first</SignalTitle>
      <SignalSummary>
        Shortcuts point to real dashboard queues. Counts stay inside the live widgets so this bar never invents operational data.
      </SignalSummary>
    </SignalIntro>
    <SignalRail>
      {signalItems.map(({ href, label, detail, tone, icon: Icon }) => (
        <SignalLink key={`${href}-${label}`} href={href} data-tone={tone}>
          <Icon size={18} aria-hidden="true" />
          <SignalLinkBody>
            <strong>{label}</strong>
            <small>{detail}</small>
          </SignalLinkBody>
          <SignalCta>Open</SignalCta>
        </SignalLink>
      ))}
    </SignalRail>
  </SignalBar>
);
export default AdminSignalBar;
