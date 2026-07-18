/**
 * Dashboards v2 — EmptyState (KIMI-DASHBOARDS §2.4). Prism/facet geometry only (optics-not-creatures).
 */
import styled from 'styled-components';

export interface EmptyStateProps {
  icon: 'prism' | 'calendar' | 'chart' | 'roster';
  title: string;
  body: string;
  cta?: { label: string; href: string };
}

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  text-align: center;
  color: var(--dash-ink-2);
`;
const Glyph = styled.svg`
  width: 48px;
  height: 48px;
  color: var(--dash-accent);
  opacity: 0.7;
`;
const Title = styled.p`
  margin: 4px 0 0;
  color: var(--dash-ink);
  font-weight: 600;
`;
const Body = styled.p`
  margin: 0;
`;
const Cta = styled.a`
  min-height: var(--dash-target, 44px);
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  margin-top: 8px;
  border: 1px solid var(--dash-line-strong);
  border-radius: var(--dash-r-panel);
  color: var(--dash-accent);
  text-decoration: none;
`;

// A single faceted prism — refraction geometry, never a creature (house rule).
export function EmptyState({ title, body, cta }: EmptyStateProps) {
  return (
    <Wrap data-testid="dash-empty">
      <Glyph viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M24 4 44 16v16L24 44 4 32V16Z" />
        <path d="M24 4v40M4 16l40 16M44 16 4 32" opacity="0.5" />
      </Glyph>
      <Title>{title}</Title>
      <Body>{body}</Body>
      {cta ? <Cta href={cta.href}>{cta.label}</Cta> : null}
    </Wrap>
  );
}
