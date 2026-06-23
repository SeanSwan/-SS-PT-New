import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { ShieldCheck, Undo2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getAdminImpersonationState,
  restoreAdminSessionFromImpersonation,
  type AdminImpersonationState,
} from '../../utils/adminImpersonationSession';

const AdminImpersonationBanner: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<AdminImpersonationState | null>(() => getAdminImpersonationState());

  useEffect(() => {
    const syncState = () => setState(getAdminImpersonationState());
    window.addEventListener('storage', syncState);
    window.addEventListener('focus', syncState);
    return () => {
      window.removeEventListener('storage', syncState);
      window.removeEventListener('focus', syncState);
    };
  }, []);

  if (!state) return null;

  const restoreAdmin = () => {
    const restored = restoreAdminSessionFromImpersonation();
    window.location.assign(restored?.redirectPath || '/dashboard/admin/overview');
  };

  return (
    <Banner role="status" aria-live="polite">
      <BannerCopy>
        <ShieldCheck size={18} aria-hidden="true" focusable="false" />
        <span>
          Testing as <strong>{state.target.displayName}</strong> ({user?.role || state.target.role})
        </span>
      </BannerCopy>
      <RestoreButton type="button" onClick={restoreAdmin}>
        <Undo2 size={17} aria-hidden="true" focusable="false" />
        Return to Admin
      </RestoreButton>
    </Banner>
  );
};

const Banner = styled.div`
  position: sticky;
  top: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 54px;
  padding: 0.5rem clamp(1rem, 3vw, 2rem);
  border-bottom: 1px solid var(--border-accent, rgba(96, 192, 240, 0.32));
  background: linear-gradient(90deg, var(--surface-primary, #002060), var(--surface-secondary, #1a1a24));
  color: var(--text-primary, #e0ecf4);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const BannerCopy = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  font-size: 0.92rem;

  svg { color: var(--accent-primary, #60c0f0); flex: 0 0 auto; }
  strong { color: var(--text-primary, #ffffff); }
`;

const RestoreButton = styled.button`
  min-height: 44px;
  border: 1px solid var(--accent-secondary, #8b5cf6);
  border-radius: 8px;
  background: var(--button-primary, #002060);
  color: var(--text-on-accent, #ffffff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.95rem;
  font-weight: 800;
  cursor: pointer;

  &:focus-visible { outline: 2px solid var(--accent-primary, #60c0f0); outline-offset: 3px; }
`;

export default AdminImpersonationBanner;
