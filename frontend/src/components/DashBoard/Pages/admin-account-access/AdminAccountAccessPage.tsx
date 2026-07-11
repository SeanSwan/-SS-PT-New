/**
 * AdminAccountAccessPage.tsx — Admin "skeleton key" home (Crystalline Swan)
 * ================================================================
 * Restores a discoverable, permanent home on the ADMIN DASHBOARD for the
 * account-access / impersonation module. Sean's own June commits
 * (50155c018, 0d5ecce19) scoped AdminAccountSwitcher to the Coach Command
 * Center ops-rail toggle — findable only 3 clicks deep. This page adds a
 * first-class admin route (/dashboard/admin/account-access) that renders the
 * SAME owner-gated switcher, so "log in as any client/trainer" (audited),
 * plus block/deactivate/reactivate/force-logout, is one sidebar click away.
 *
 * Additive on purpose: this does NOT remove the Coach Command Center mount
 * (which is locked by AdminImpersonation.source.test.ts) — it is a second,
 * clearer entry point. The write-capable switcher here is distinct from the
 * read-only "View As Client" surface (/client-management/view-as/:userId).
 *
 * Security note: all gating is server-side (adminOnly + owner allowlist).
 * This page is display-only; the switcher itself calls the audited endpoints.
 */

import React from 'react';
import styled from 'styled-components';
import { ShieldCheck } from 'lucide-react';
import AdminAccountSwitcher from '../../../Admin/AdminAccountSwitcher';

const AdminAccountAccessPage: React.FC = () => (
  <PageShell aria-label="Admin account access">
    <PageHeader>
      <HeaderIcon aria-hidden="true">
        <ShieldCheck size={22} />
      </HeaderIcon>
      <div>
        <PageTitle>Account Access</PageTitle>
        <PageSubtitle>
          Log in as any client or trainer for an audited support session, or run
          block, deactivate, reactivate, and force-logout commands. Access is
          owner-gated and every session is logged. This is separate from the
          read-only “View As Client” profile view.
        </PageSubtitle>
      </div>
    </PageHeader>

    <AdminAccountSwitcher />
  </PageShell>
);

// ── Styled (dark-first, token-with-fallback per rule 6) ──────────────────────

const PageShell = styled.section`
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  @media (max-width: 640px) {
    padding: 1rem 0.75rem 2.5rem;
  }
`;

const PageHeader = styled.header`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const HeaderIcon = styled.div`
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: var(--accent-primary, #60c0f0);
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid var(--chrome-edge, rgba(96, 192, 240, 0.28));
`;

const PageTitle = styled.h1`
  font-family: 'Plus Jakarta Sans', 'Source Sans 3', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
  color: var(--text-primary, #e0ecf4);
`;

const PageSubtitle = styled.p`
  font-family: 'Source Sans 3', 'Source Sans Pro', sans-serif;
  font-size: 0.95rem;
  line-height: 1.55;
  margin: 0;
  max-width: 68ch;
  color: var(--text-secondary, #8aa8b8);
`;

export default AdminAccountAccessPage;
