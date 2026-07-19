/**
 * Dashboards v2 — server-shaped types (KIMI-DASHBOARDS §2.3 + CORRECTED edits).
 * All values arrive pre-formatted from the server (`// fmt:server`); the client formats nothing.
 * Corrected vs original: `Base` drops `worldKey` (sent only on the crystallize POST via useWorldKey);
 * `StatDef.accent` is a semantic slot (→ theme tokens), not a color name; `revenue_today` is an
 * admin stat key present ONLY when the finance flag is on (server omits, client never stubs).
 */
export type Role = 'admin' | 'trainer' | 'client' | 'user';

/** Lane-A motion-tier key (DOTTED) — for resolveMotionTier / useCrystallizeTransition ONLY.
 *  Distinct from the kebab manifest surfaceId ('dashboard-admin') used for the lens frame. */
export type MotionSurfaceId = 'dashboard.admin' | 'dashboard.trainer' | 'dashboard.client' | 'dashboard.user';

export interface StatDef {
  key: string;
  label: string;
  value: string; // fmt:server
  delta?: { text: string; direction: 'up' | 'down' | 'flat'; tone: 'good' | 'bad' | 'neutral' };
  spark?: number[]; // 7 points, normalized server-side
  accent: 'lens' | 'action' | 'good' | 'warn' | 'bad'; // semantic slot → §3.1 tokens
}

export interface SessionRow {
  id: string;
  clientRef: string; // masked (C-1042)
  trainerRef: string; // masked (T-07)
  startLabel: string;
  endLabel: string;
  status: 'upcoming' | 'active' | 'done' | 'missed';
}

export interface AlertRow {
  id: string;
  severity: 'info' | 'warn' | 'critical';
  title: string;
  ageLabel: string;
  action: { label: string; href: string } | null;
}

export interface Milestone {
  id: string;
  tier: 'facet' | 'prism' | 'crown';
  title: string;
  earnedLabel: string | null;
  crystallized: boolean;
}

export interface NextBestAction {
  key: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
}

export interface ChartSeries {
  labels: string[];
  values: number[];
  unit: string;
}

interface Base {
  role: Role;
  generatedAt: string;
}

export interface AdminSummary extends Base {
  role: 'admin';
  stats: StatDef[]; // may include key 'revenue_today' ONLY when the finance flag is on
  alerts: AlertRow[];
  sessionsToday: SessionRow[];
  trainerLoad: ChartSeries;
  weeklySessions: ChartSeries;
}
export interface TrainerSummary extends Base {
  role: 'trainer';
  now: SessionRow | null;
  next: SessionRow | null;
  minutesUntilNext: number | null;
  roster: { clientRef: string; lastSessionLabel: string; adherencePct: number }[];
  today: SessionRow[];
  clientProgress: ChartSeries;
}
export interface ClientSummary extends Base {
  role: 'client';
  adherencePct: number;
  planWeek: { dayLabel: string; done: boolean; today: boolean }[];
  nextBestAction: NextBestAction;
  progress: ChartSeries;
  milestones: Milestone[];
}
export interface UserSummary extends Base {
  role: 'user';
  stats: StatDef[];
  progress: ChartSeries;
  milestones: Milestone[];
  nextBestAction: NextBestAction;
  community: { ref: string; actionLabel: string; ageLabel: string }[];
}
export type DashboardSummary = AdminSummary | TrainerSummary | ClientSummary | UserSummary;
