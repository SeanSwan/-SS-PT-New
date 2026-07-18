/**
 * Dashboards v2 — SectionHeader (KIMI-DASHBOARDS §2.4). kicker + title + optional action.
 * Tokens only; 44px action target; display font from --dash-font-display.
 */
import styled from 'styled-components';

export interface SectionHeaderProps {
  kicker: string;
  title: string;
  action?: { label: string; onClick(): void };
}

const Row = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
`;
const Kicker = styled.span`
  display: block;
  font-size: 12px;
  line-height: 18px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dash-ink-2);
`;
const Title = styled.h2`
  margin: 0;
  font: var(--dash-font-display, 700 22px/28px 'Plus Jakarta Sans', sans-serif);
  color: var(--dash-ink);
`;
const Action = styled.button`
  min-height: var(--dash-target, 44px);
  padding: 0 14px;
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-panel);
  background: var(--dash-glass);
  color: var(--dash-accent);
  cursor: pointer;
  &:hover {
    border-color: var(--dash-line-strong);
  }
`;

export function SectionHeader({ kicker, title, action }: SectionHeaderProps) {
  return (
    <Row>
      <div>
        <Kicker>{kicker}</Kicker>
        <Title>{title}</Title>
      </div>
      {action ? (
        <Action type="button" onClick={action.onClick}>
          {action.label}
        </Action>
      ) : null}
    </Row>
  );
}
