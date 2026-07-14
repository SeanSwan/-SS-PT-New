import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock3, LogIn, Search, ShieldCheck, ShieldOff, UserRound, X } from 'lucide-react';
import apiService from '../../services/api.service';
import { useAuth } from '../../context/AuthContext';
import AdminAccountCommandPanel, { type AdminCommandTarget } from './AdminAccountCommandPanel';
import AdminPasswordSetupLinkPanel from './AdminPasswordSetupLinkPanel';
import {
  getDashboardPathForImpersonatedRole,
  isAdminImpersonationActive,
  startAdminImpersonationSession,
  type AdminImpersonationRole,
} from '../../utils/adminImpersonationSession';
import {
  ClearSearchButton,
  ControlGrid,
  Field,
  FieldLabel,
  HeaderIcon,
  HeaderIdentity,
  HeaderText,
  NativeSelect,
  RoleButton,
  RoleSegment,
  SearchBox,
  StartButton,
  SwitcherHeader,
  SwitcherShell,
  TrustPill,
  TrustStrip,
} from './AdminAccountSwitcher.styles';
import {
  EmptyPreview,
  MetaChip,
  MetaGrid,
  RoleBadge,
  StatusLine,
  TargetAvatar,
  TargetMeta,
  TargetPreview,
  TargetTitle,
} from './AdminAccountSwitcherPreview.styles';

interface ImpersonationTarget extends AdminCommandTarget {
  id: string | number;
  displayName: string;
  username?: string | null;
  email?: string | null;
  role: AdminImpersonationRole;
  subscriptionTier?: string;
  accountDeactivatedAt?: string | null;
  accountRetentionUntil?: string | null;
}

interface AccountControlAccess {
  configured?: boolean;
  ownerAllowed?: boolean;
  canListTargets?: boolean;
  canRunCommands?: boolean;
  code?: string;
}

interface AccountControlState {
  ready: boolean;
  enabled: boolean;
  error: boolean;
  message: string;
}

const roles: Array<{ label: string; value: 'all' | AdminImpersonationRole }> = [
  { label: 'All', value: 'all' },
  { label: 'Clients', value: 'client' },
  { label: 'Trainers', value: 'trainer' },
  { label: 'Users', value: 'user' },
];

const identityFor = (target: ImpersonationTarget) => target.email || target.username || `ID ${target.id}`;
const dashboardLabelFor = (role: AdminImpersonationRole) => (role === 'trainer' ? 'Trainer dashboard' : 'Client dashboard');
const initialsFor = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SS';
const statusLabelFor = (target: ImpersonationTarget) => {
  if (target.isActive === false) return 'inactive';
  if (target.isLocked) return 'locked';
  return target.accountStatus || 'active';
};

const AdminAccountSwitcher: React.FC = () => {
  const { user } = useAuth();
  const requestSeqRef = useRef(0);
  const [role, setRole] = useState<'all' | AdminImpersonationRole>('all');
  const [search, setSearch] = useState('');
  const [targets, setTargets] = useState<ImpersonationTarget[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [accountControl, setAccountControl] = useState<AccountControlState>({
    ready: false,
    enabled: false,
    error: false,
    message: 'Checking owner account controls...',
  });

  const visible = user?.role === 'admin' && !isAdminImpersonationActive();
  const selectedTarget = useMemo(
    () => targets.find((target) => String(target.id) === selectedId) || null,
    [selectedId, targets]
  );

  useEffect(() => {
    if (!visible) {
      setAccountControl({ ready: false, enabled: false, error: false, message: 'Checking owner account controls...' });
      return;
    }

    let mounted = true;
    setAccountControl({ ready: false, enabled: false, error: false, message: 'Checking owner account controls...' });
    apiService.get<{ accountControl?: AccountControlAccess }>('/api/auth/admin/accounts/access')
      .then((response) => {
        if (!mounted) return;
        const control = response.data?.accountControl;
        const enabled = control?.canListTargets === true && control?.canRunCommands === true;
        const message = enabled
          ? 'Owner account controls are ready for audited test sessions and lifecycle commands.'
          : control?.code === 'OWNER_GATE_NOT_CONFIGURED'
            ? 'Backend owner allowlist is missing. Set OWNER_ADMIN_EMAILS or OWNER_ADMIN_IDS on the Render backend.'
            : 'This admin is not on the owner allowlist for account controls.';
        setAccountControl({ ready: true, enabled, error: !enabled, message });
        if (!enabled) {
          setTargets([]);
          setSelectedId('');
        }
      })
      .catch(() => {
        if (!mounted) return;
        setAccountControl({
          ready: true,
          enabled: false,
          error: true,
          message: 'Unable to verify owner account controls. Check the backend route and Render env before using this module.',
        });
        setTargets([]);
        setSelectedId('');
      });

    return () => { mounted = false; };
  }, [visible]);

  useEffect(() => {
    if (!visible || !accountControl.ready || !accountControl.enabled) return;

    const requestId = requestSeqRef.current + 1;
    requestSeqRef.current = requestId;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '50', status: 'all' });
        if (role !== 'all') params.set('role', role);
        if (search.trim()) params.set('search', search.trim());
        const response = await apiService.get<{ targets: ImpersonationTarget[] }>(
          `/api/auth/admin/accounts/targets?${params.toString()}`
        );
        if (requestSeqRef.current !== requestId) return;
        const nextTargets = response.data?.targets || [];
        setTargets(nextTargets);
        setSelectedId((current) => (
          current && nextTargets.some((target) => String(target.id) === current)
            ? current
            : String(nextTargets[0]?.id || '')
        ));
      } catch (err: any) {
        if (requestSeqRef.current !== requestId) return;
        setError(err?.response?.data?.message || 'Unable to load account controls.');
        setTargets([]);
        setSelectedId('');
      } finally {
        if (requestSeqRef.current === requestId) setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [role, search, visible, accountControl.ready, accountControl.enabled, refreshKey]);

  if (!visible) return null;

  const startTesting = async () => {
    if (!selectedTarget || !selectedTarget.canImpersonate || starting) return;
    setStarting(true);
    setError(null);
    try {
      const response = await apiService.post('/api/auth/admin/impersonation/start', {
        targetUserId: selectedTarget.id,
      });
      startAdminImpersonationSession(response.data);
      window.location.assign(getDashboardPathForImpersonatedRole(selectedTarget.role));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to start account testing session.');
    } finally {
      setStarting(false);
    }
  };

  const controlsAvailable = accountControl.ready && accountControl.enabled;
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && controlsAvailable && !loading && !starting && selectedTarget?.canImpersonate) { event.preventDefault(); void startTesting(); }
  };
  const statusText = !accountControl.ready || !accountControl.enabled
    ? accountControl.message
    : loading
      ? 'Refreshing owner account list...'
      : selectedTarget
        ? `${targets.length} matching account${targets.length === 1 ? '' : 's'} available. ${selectedTarget.canImpersonate ? `Temporary access opens as ${selectedTarget.displayName}.` : 'Account controls are available, but dashboard testing is disabled until the account is active and unlocked.'}`
        : 'Change the role or search term to find an account.';

  return (
    <SwitcherShell aria-label="Admin account testing switcher" data-owner-account-controls="true">
      <SwitcherHeader>
        <HeaderIdentity>
          <HeaderIcon><ShieldCheck size={20} aria-hidden="true" focusable="false" /></HeaderIcon>
          <HeaderText>
            <strong>Test accounts and lifecycle controls</strong>
            <span>Use audited dashboard access or force logout, block, deactivate, and reactivate commands.</span>
          </HeaderText>
        </HeaderIdentity>
        <TrustStrip aria-label="Account testing safeguards">
          <TrustPill><ShieldCheck size={14} aria-hidden="true" /> Owner gated</TrustPill>
          <TrustPill><Clock3 size={14} aria-hidden="true" /> Temporary token</TrustPill>
          <TrustPill><ShieldOff size={14} aria-hidden="true" /> No refresh token</TrustPill>
        </TrustStrip>
      </SwitcherHeader>

      <ControlGrid>
        <Field>
          <FieldLabel as="span">Role</FieldLabel>
          <RoleSegment role="group" aria-label="Filter test accounts by role">
            {roles.map((item) => (
              <RoleButton key={item.value} type="button" $active={role === item.value} aria-pressed={role === item.value} disabled={!controlsAvailable} onClick={() => setRole(item.value)}>
                {item.label}
              </RoleButton>
            ))}
          </RoleSegment>
        </Field>
        <Field>
          <FieldLabel htmlFor="admin-account-test-search">Find</FieldLabel>
          <SearchBox>
            <Search size={17} aria-hidden="true" focusable="false" />
            <input id="admin-account-test-search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={handleSearchKeyDown} placeholder="Name, username, email" title="Press Enter to open the selected account" disabled={!controlsAvailable} />
            {search && (
              <ClearSearchButton type="button" onClick={() => setSearch('')} aria-label="Clear account search" disabled={!controlsAvailable}>
                <X size={17} aria-hidden="true" focusable="false" />
              </ClearSearchButton>
            )}
          </SearchBox>
        </Field>
        <Field>
          <FieldLabel htmlFor="admin-account-test-select">Account</FieldLabel>
          <NativeSelect id="admin-account-test-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={!controlsAvailable || loading || targets.length === 0}>
            {targets.map((target) => <option key={target.id} value={String(target.id)}>{target.displayName} ({target.role}, {statusLabelFor(target)})</option>)}
          </NativeSelect>
        </Field>
        <StartButton type="button" onClick={startTesting} disabled={!controlsAvailable || !selectedTarget || !selectedTarget.canImpersonate || starting || loading} aria-label={selectedTarget ? `Start test session as ${selectedTarget.displayName}` : 'Select an account to test'}>
          <LogIn size={18} aria-hidden="true" focusable="false" />
          {starting ? 'Opening...' : 'Open Dashboard'}
          <ArrowRight size={17} aria-hidden="true" focusable="false" />
        </StartButton>
      </ControlGrid>

      <TargetPreview $empty={!selectedTarget} aria-live="polite">
        {selectedTarget ? (
          <>
            <TargetAvatar aria-hidden="true">{initialsFor(selectedTarget.displayName)}</TargetAvatar>
            <TargetMeta>
              <TargetTitle><strong>{selectedTarget.displayName}</strong><RoleBadge>{selectedTarget.role}</RoleBadge></TargetTitle>
              <MetaGrid>
                <MetaChip>{identityFor(selectedTarget)}</MetaChip>
                <MetaChip>{dashboardLabelFor(selectedTarget.role)}</MetaChip>
                <MetaChip>{statusLabelFor(selectedTarget)}</MetaChip>
                <MetaChip>{selectedTarget.subscriptionTier || 'free'} tier</MetaChip>
              </MetaGrid>
            </TargetMeta>
          </>
        ) : (
          <EmptyPreview><UserRound size={16} aria-hidden="true" /> No matching accounts.</EmptyPreview>
        )}
      </TargetPreview>

      <AdminPasswordSetupLinkPanel target={selectedTarget} disabled={!controlsAvailable || loading} />
      <AdminAccountCommandPanel
        target={selectedTarget}
        disabled={!controlsAvailable || loading}
        onCommandComplete={() => setRefreshKey((current) => current + 1)}
      />

      <StatusLine $error={Boolean(error) || accountControl.error} role={Boolean(error) || accountControl.error ? 'alert' : 'status'} aria-live="polite">
        {error || statusText}
      </StatusLine>
    </SwitcherShell>
  );
};

export default AdminAccountSwitcher;