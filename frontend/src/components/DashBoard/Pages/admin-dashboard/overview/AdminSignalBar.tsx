import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Activity, Bell, CalendarCheck, ClipboardCheck, CreditCard, Gauge, ShieldAlert, Timer } from 'lucide-react';
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
// SWA-138 S5: item order MIRRORS the page scroll order — anchor N always
// jumps DOWN the page, never backwards (broken-wayfinding fix, Kimi accepted).
const signalItems: SignalItem[] = [
  {
    href: '#admin-alerts',
    label: 'Alerts',
    detail: 'Dismissible intelligence',
    tone: 'urgent',
    icon: Bell,
  },
  {
    href: '#admin-queues',
    label: 'Work queues',
    detail: 'Intakes, waivers, payments',
    tone: 'urgent',
    icon: ClipboardCheck,
  },
  {
    href: '#admin-business-lens',
    label: 'Business lens',
    detail: 'Server-truth revenue',
    tone: 'system',
    icon: CreditCard,
  },
  {
    href: '#admin-revenue-integrity',
    label: 'Revenue integrity',
    detail: 'Lead speed, sessions owed',
    tone: 'urgent',
    icon: Timer,
  },
  {
    href: '#admin-operations',
    label: 'Client ops',
    detail: 'Compliance, sessions, signups',
    tone: 'ops',
    icon: CalendarCheck,
  },
  {
    href: '#admin-ops-intelligence',
    label: 'Ops intelligence',
    detail: 'Capacity, leakage, activation',
    tone: 'ops',
    icon: Gauge,
  },
  {
    href: '#admin-community-safety',
    label: 'Community safety',
    detail: 'Moderation and reports',
    tone: 'community',
    icon: ShieldAlert,
  },
  {
    href: '#admin-telemetry',
    label: 'Telemetry',
    detail: 'Geo, health, Oracle',
    tone: 'system',
    icon: Activity,
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
