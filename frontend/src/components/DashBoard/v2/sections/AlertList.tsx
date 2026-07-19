/**
 * Dashboards v2 — AlertList (KIMI-DASHBOARDS §2.4). Server-sorted; ≤maxVisible rows + "View all {n}".
 */
import styled from 'styled-components';
import type { AlertRow } from '../types';
import { EmptyState } from './EmptyState';

export interface AlertListProps {
  alerts: AlertRow[];
  maxVisible?: number;
}

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;
const Item = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: var(--dash-target, 44px);
  padding: 8px 4px;
  border-bottom: 1px solid var(--dash-line);
`;
const Dot = styled.span<{ $sev: AlertRow['severity'] }>`
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.$sev === 'critical' ? 'var(--dash-bad)' : p.$sev === 'warn' ? 'var(--dash-warn)' : 'var(--dash-ink-2)')};
`;
const Title = styled.span`
  flex: 1 1 auto;
  color: var(--dash-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const Age = styled.span`
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--dash-ink-2);
`;
const Act = styled.a`
  flex: 0 0 auto;
  min-height: var(--dash-target, 44px);
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  color: var(--dash-accent);
  text-decoration: none;
`;
const More = styled.a`
  min-height: var(--dash-target, 44px);
  display: inline-flex;
  align-items: center;
  color: var(--dash-accent);
  text-decoration: none;
`;

export function AlertList({ alerts, maxVisible = 5 }: AlertListProps) {
  if (alerts.length === 0) {
    return <EmptyState icon="prism" title="All clear" body="No alerts need attention right now." />;
  }
  const visible = alerts.slice(0, maxVisible);
  const overflow = alerts.length - visible.length;
  return (
    <div>
      <List>
        {visible.map((a) => (
          <Item key={a.id}>
            <Dot $sev={a.severity} aria-label={a.severity} />
            <Title>{a.title}</Title>
            <Age>{a.ageLabel}</Age>
            {a.action ? <Act href={a.action.href}>{a.action.label}</Act> : null}
          </Item>
        ))}
      </List>
      {overflow > 0 ? <More href="/admin/alerts">View all {alerts.length}</More> : null}
    </div>
  );
}
