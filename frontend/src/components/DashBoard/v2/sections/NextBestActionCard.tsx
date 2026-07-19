/**
 * Dashboards v2 — NextBestActionCard (KIMI-DASHBOARDS §2.4). Primary CTA 48px. Accent slot.
 */
import styled from 'styled-components';
import type { NextBestAction } from '../types';

export interface NextBestActionCardProps {
  action: NextBestAction;
  accent?: 'lens' | 'action';
}

const Card = styled.section<{ $accent: string }>`
  --nba-accent: ${(p) => p.$accent};
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 96px;
  padding: 20px;
  background: var(--dash-panel);
  border: 1px solid var(--dash-line);
  border-left: 3px solid var(--nba-accent);
  border-radius: var(--dash-r-panel);
  box-shadow: var(--dash-elev-1);
`;
const Title = styled.h3`
  margin: 0;
  font-size: 18px;
  line-height: 26px;
  color: var(--dash-ink);
`;
const Body = styled.p`
  margin: 0;
  color: var(--dash-ink-2);
`;
const Cta = styled.a`
  align-self: flex-start;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  padding: 0 18px;
  margin-top: 4px;
  border-radius: var(--dash-r-panel);
  background: var(--nba-accent);
  color: var(--dash-bg);
  text-decoration: none;
  font-weight: 600;
`;

export function NextBestActionCard({ action, accent = 'lens' }: NextBestActionCardProps) {
  const tone = accent === 'action' ? 'var(--dash-action)' : 'var(--dash-accent)';
  return (
    <Card $accent={tone} data-testid="dash-nba">
      <Title>{action.title}</Title>
      <Body>{action.body}</Body>
      <Cta href={action.cta.href}>{action.cta.label}</Cta>
    </Card>
  );
}
