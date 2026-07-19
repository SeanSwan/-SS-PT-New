/**
 * Dashboards v2 — route wrapper (KIMI-DASHBOARDS §6.3 seam, adapted to real routing).
 *
 * Reality vs blueprint: the app mounts ONE `dashboard/*` catch-all (UniversalDashboardLayout detects
 * role internally), not four role routes. So the seam wraps that single element; this wrapper derives
 * the density role from the URL segment (`/dashboard/{role}/…`) — the same URL the V1 layout keys off.
 * Density selection is visual only; real authorization stays with ProtectedRoute + the backend.
 * When the flag is off (default) the gate renders V1 regardless of role.
 */
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardGate } from './DashboardGate';
import type { Role } from './types';

const ROLES: readonly Role[] = ['admin', 'trainer', 'client', 'user'];

function roleFromPath(pathname: string): Role {
  const seg = pathname.split('/').filter(Boolean)[1]; // ['dashboard', '{role}', …]
  return (ROLES as readonly string[]).includes(seg) ? (seg as Role) : 'client';
}

export function DashboardV2RouteGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <DashboardGate role={roleFromPath(pathname)}>{children}</DashboardGate>;
}

export default DashboardV2RouteGate;
