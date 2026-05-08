/**
 * CoachIntakeEventTrail.tsx
 * =========================
 * Compact read-only activity trail for the active Coach intake item.
 */
import React from 'react';
import styled from 'styled-components';
import { Activity, Clock3, ShieldCheck } from 'lucide-react';
import {
  listCoachIntakeEvents,
  type CoachIntakeEvent,
} from '../../../../services/coachIntakeService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const Trail = styled.section`
  margin: -2px 0 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, transparent),
      color-mix(in srgb, var(--bg-base, #030712) 76%, transparent)
    ),
    color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, transparent);
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;

  h4 {
    margin: 3px 0 2px;
    color: var(--text-primary, #E0ECF4);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    line-height: 1.3;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
    font-family: 'Sora', sans-serif;
    font-size: 12px;
    line-height: 1.45;
  }
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 9px;
  border-radius: 8px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  text-transform: uppercase;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 40%, transparent);
`;

const EventList = styled.ol`
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
`;

const EventItem = styled.li`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  padding: 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 40%, transparent);
  color: var(--text-primary, #E0ECF4);
`;

const EventBody = styled.div`
  min-width: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.45;

  strong {
    display: block;
    margin-bottom: 2px;
    color: var(--text-primary, #E0ECF4);
    font-weight: 800;
  }

  span {
    display: inline-block;
    margin-right: 8px;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 64%, transparent);
  }
`;

const Notice = styled.p`
  margin: 10px 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

function label(value: string): string {
  return value.replace(/_/g, ' ').trim() || 'event';
}

function compactTime(value: string | null): string {
  if (!value) return 'Time pending';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time pending';
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function summaryPairs(event: CoachIntakeEvent): string[] {
  return Object.entries(event.summary || {})
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`);
}

export function CoachIntakeEventTrail({ intakeId }: { intakeId: string | null }): JSX.Element | null {
  const safeIntakeId = intakeId && UUID_RE.test(intakeId) ? intakeId : null;
  const [events, setEvents] = React.useState<CoachIntakeEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!safeIntakeId) return undefined;
    let active = true;
    setIsLoading(true);
    setError(null);
    listCoachIntakeEvents({ intakeId: safeIntakeId, limit: 8 })
      .then((result) => {
        if (active) setEvents(result.events || []);
      })
      .catch(() => {
        if (active) setError('Activity trail is unavailable.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [safeIntakeId]);

  if (!safeIntakeId) return null;

  return (
    <Trail aria-label="Coach intake activity trail">
      <Header>
        <div>
          <h4>Activity trail</h4>
          <p>Recent deterministic events for this intake. Raw transcript text stays out of this panel.</p>
        </div>
        <Badge><ShieldCheck size={13} aria-hidden="true" /> Audit</Badge>
      </Header>
      {isLoading ? <Notice role="status">Loading activity...</Notice> : null}
      {error ? <Notice role="alert">{error}</Notice> : null}
      {!isLoading && !error && events.length === 0 ? <Notice>No activity recorded yet.</Notice> : null}
      {events.length > 0 ? (
        <EventList>
          {events.map((event) => (
            <EventItem key={event.id}>
              <Activity size={15} aria-hidden="true" />
              <EventBody>
                <strong>{label(event.eventType)}</strong>
                <span><Clock3 size={12} aria-hidden="true" /> {compactTime(event.createdAt)}</span>
                <span>{label(event.actorType)}</span>
                {summaryPairs(event).map((entry) => <span key={entry}>{entry}</span>)}
              </EventBody>
            </EventItem>
          ))}
        </EventList>
      ) : null}
    </Trail>
  );
}

export default CoachIntakeEventTrail;
