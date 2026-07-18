/**
 * Dashboards v2 — shell nav (KIMI-DASHBOARDS §2.1/§5). TopBar always; Rail on desk/wall,
 * bottom TabBar on hand/lap (44px+). Refresh in TopBar (mobile) / Rail (desk). Tokens only.
 */
import styled from 'styled-components';
import type { LensViewport } from '../lensBindings';
import type { Role } from '../types';

export interface DashboardNavProps {
  role: Role;
  viewport: LensViewport;
  onRefresh(): void;
  isRefetching: boolean;
}

const NAV_ITEMS: { role: Role; label: string; href: string; glyph: string }[] = [
  { role: 'admin', label: 'Admin', href: '/admin/dashboard', glyph: '◆' },
  { role: 'trainer', label: 'Trainer', href: '/trainer/dashboard', glyph: '▲' },
  { role: 'client', label: 'Client', href: '/client/dashboard', glyph: '●' },
  { role: 'user', label: 'You', href: '/dashboard', glyph: '✦' },
];
const TITLE: Record<Role, string> = { admin: 'Studio overview', trainer: 'Floor', client: 'Your plan', user: 'Your progress' };

const Bar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 56px;
  padding: 0 var(--dash-pad, 20px);
  border-bottom: 1px solid var(--dash-line);
`;
const Title = styled.h1`
  margin: 0;
  font: 600 18px/26px 'Plus Jakarta Sans', sans-serif;
  color: var(--dash-ink);
`;
const IconBtn = styled.button`
  min-width: var(--dash-target, 44px);
  min-height: var(--dash-target, 44px);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-panel);
  background: var(--dash-glass);
  color: var(--dash-accent);
  cursor: pointer;
  &[data-busy='true'] {
    opacity: 0.6;
  }
`;
const Rail = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 8px;
  border-right: 1px solid var(--dash-line);
`;
const TabBar = styled.nav`
  position: sticky;
  bottom: 0;
  z-index: var(--dash-z-sticky);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding-bottom: env(safe-area-inset-bottom, 0);
  background: var(--dash-panel);
  border-top: 1px solid var(--dash-line);
`;
const NavLink = styled.a<{ $active: boolean }>`
  min-height: var(--dash-target, 44px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px;
  text-decoration: none;
  font-size: 12px;
  color: ${(p) => (p.$active ? 'var(--dash-accent)' : 'var(--dash-ink-2)')};
`;

export function DashboardTopBar({ role, onRefresh, isRefetching }: Omit<DashboardNavProps, 'viewport'>) {
  return (
    <Bar>
      <Title>{TITLE[role]}</Title>
      <IconBtn type="button" onClick={onRefresh} data-busy={isRefetching} aria-label="Refresh dashboard">
        ⟳
      </IconBtn>
    </Bar>
  );
}

export function DashboardNav({ role, viewport }: Pick<DashboardNavProps, 'role' | 'viewport'>) {
  const Container = viewport === 'hand' || viewport === 'lap' ? TabBar : Rail;
  return (
    <Container aria-label="Dashboard sections">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.role} href={item.href} $active={item.role === role} aria-current={item.role === role ? 'page' : undefined}>
          <span aria-hidden="true">{item.glyph}</span>
          {item.label}
        </NavLink>
      ))}
    </Container>
  );
}
