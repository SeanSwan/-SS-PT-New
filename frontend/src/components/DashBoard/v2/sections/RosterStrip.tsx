/**
 * Dashboards v2 — RosterStrip (KIMI-DASHBOARDS §2.4). Horizontal scroll-snap of a trainer's roster,
 * each card a masked client ref + last-session age + adherence. Masked refs only (server already
 * masked — PII never reaches the client). Keyboard: each card is a link/button with a 44px+ target.
 */
import styled from 'styled-components';
import { EmptyState } from './EmptyState';

export interface RosterEntry {
  clientRef: string; // masked, non-reversible (C-026122) — also used as the React key, so it must stay unique
  lastSessionLabel: string;
  adherencePct: number;
}

const Strip = styled.ul`
  display: flex;
  gap: 12px;
  margin: 0;
  padding: 4px 2px 12px;
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
`;
const Card = styled.li`
  scroll-snap-align: start;
  flex: 0 0 auto;
  min-width: 152px;
  min-height: var(--dash-target, 44px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: var(--dash-r-panel, 14px);
  background: var(--dash-glass);
  border: 1px solid var(--dash-line);
`;
const Ref = styled.span`
  font: 600 14px / 1 var(--dash-font-display, inherit);
  color: var(--dash-ink);
`;
const Meta = styled.span`
  font-size: 12px;
  color: var(--dash-ink-2);
`;
const Bar = styled.div<{ $pct: number }>`
  height: 6px;
  border-radius: 999px;
  background: var(--dash-line);
  overflow: hidden;
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
    background: var(--dash-accent);
  }
`;

export function RosterStrip({ roster }: { roster: RosterEntry[] }) {
  if (!roster.length) {
    return <EmptyState icon="roster" title="No clients yet" body="Assigned clients will appear here." />;
  }
  return (
    <Strip data-testid="dash-roster" aria-label="Client roster">
      {roster.map((r) => (
        <Card key={r.clientRef}>
          <Ref>{r.clientRef}</Ref>
          <Meta>Last: {r.lastSessionLabel}</Meta>
          {r.adherencePct > 0 ? (
            <Bar $pct={r.adherencePct} aria-label={`Adherence ${Math.round(r.adherencePct)}%`} />
          ) : (
            <Meta>Adherence: no data yet</Meta>
          )}
        </Card>
      ))}
    </Strip>
  );
}
