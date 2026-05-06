/**
 * CommandRouteAction.tsx
 * ======================
 * Converts safe internal command-result routes into compact action links for
 * Swan Coach result cards.
 */
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { ArrowRight } from 'lucide-react';

const ActionWrap = styled.div`
  margin-top: 12px;
`;

const RouteLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.35);
  background: rgba(96, 192, 240, 0.14);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.22);
    box-shadow: 0 0 14px rgba(139, 92, 246, 0.28);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }
`;

function safeInternalRoute(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const route = value.trim();
  if (!route.startsWith('/dashboard/')) return null;
  if (/[\r\n\t]/.test(route)) return null;
  return route;
}

function labelForCommand(command: string): string {
  return command.includes('plaud') ? 'Open PLAUD Workspace' : 'Open Workspace';
}

interface CommandRouteActionProps {
  command: string;
  result: Record<string, unknown> | null;
}

export function CommandRouteAction({ command, result }: CommandRouteActionProps) {
  const route = result
    ? safeInternalRoute(result.reviewRoute) ||
      safeInternalRoute(result.targetRoute) ||
      safeInternalRoute(result.queueRoute)
    : null;

  if (!route) return null;

  const label = labelForCommand(command);
  return (
    <ActionWrap>
      <RouteLink to={route} aria-label={label}>
        {label}
        <ArrowRight size={15} aria-hidden="true" />
      </RouteLink>
    </ActionWrap>
  );
}
