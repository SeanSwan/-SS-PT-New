/**
 * ============================================================================
 * FILE: ChangePasswordCard.tsx
 * PURPOSE: Self-serve password change card for the client profile page
 * AUTHOR: Claude (Fable 5) | LAST MODIFIED: 2026-07-21
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Card with current/new/confirm password fields that
 * calls PUT /api/auth/password. Client-side rules mirror the backend
 * changePassword validator (validationMiddleware.mjs): 8+ chars, uppercase,
 * lowercase, number, special character — plus "different from current".
 * Backend revokes refresh sessions on success, so other devices sign out.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ChangePasswordCard                                ║
 * ║  MOUNTED BY: ClientProfilePage (/dashboard/profile)           ║
 * ║  API: PUT /api/auth/password {currentPassword, newPassword}   ║
 * ║  ERRORS: 401 wrong current · 400 policy/same · 429 throttled  ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { Lock, Eye, EyeOff, Check, X, Save, ShieldCheck } from 'lucide-react';
import apiService from '../../../../services/api.service';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components (matches ClientProfilePage card language)
// ─────────────────────────────────────────────────────────────

const Card = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem; margin: 0 0 1rem;
  display: flex; align-items: center; gap: 0.5rem;
  color: var(--accent-primary, #60C0F0);
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted, #94a3b8);
  margin: 0 0 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const FieldRow = styled.div`
  position: relative;
  margin-bottom: 1rem;
`;

const PasswordInput = styled.input`
  width: 100%; min-height: 44px; padding: 0.625rem 3rem 0.625rem 0.75rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px; color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 0.875rem;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
  &[aria-invalid='true'] { border-color: rgba(248, 113, 113, 0.6); }
`;

const EyeButton = styled.button`
  position: absolute; right: 4px; bottom: 0;
  min-width: 44px; min-height: 44px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none; cursor: pointer;
  color: var(--text-muted, #94a3b8);
  border-radius: 8px;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const CapsHint = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  color: var(--accent-gold, #C6A84B);
`;

const RuleList = styled.ul`
  list-style: none; margin: 0 0 1rem; padding: 0;
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.375rem 1rem;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const RuleItem = styled.li<{ $met: boolean }>`
  display: flex; align-items: center; gap: 0.375rem;
  font-size: 0.75rem;
  color: ${({ $met }) => $met ? '#4CAF50' : 'var(--text-muted, rgba(224, 236, 244, 0.45))'};
`;

const SaveButton = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  min-height: 44px; padding: 0.625rem 1.25rem;
  border-radius: 10px; border: none;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-heading, #E0ECF4);
  font-family: 'Sora', sans-serif; font-size: 0.8125rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  &:hover:not(:disabled) { box-shadow: 0 0 16px rgba(139, 92, 246, 0.35); transform: scale(1.02); }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 4px; }
`;

const StatusText = styled.span<{ $success?: boolean }>`
  font-size: 0.8125rem;
  margin-left: 0.75rem;
  color: ${({ $success }) => $success ? '#4CAF50' : '#f87171'};
`;

const SuccessNote = styled.p`
  display: flex; align-items: center; gap: 0.375rem;
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary, #94a3b8);
`;

const SaveRow = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Validation (mirrors backend changePassword validator)
// ─────────────────────────────────────────────────────────────

const PASSWORD_RULES: Array<{ label: string; test: (pw: string) => boolean }> = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'One uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: pw => /[a-z]/.test(pw) },
  { label: 'One number', test: pw => /[0-9]/.test(pw) },
  { label: 'One special character', test: pw => /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ChangePasswordCard: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changed, setChanged] = useState(false);
  const [status, setStatus] = useState<{ message: string; success: boolean } | null>(null);

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map(rule => ({ ...rule, met: rule.test(newPassword) })),
    [newPassword]
  );
  const allRulesMet = ruleResults.every(r => r.met);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const differsFromCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const canSubmit = currentPassword.length > 0 && allRulesMet && passwordsMatch
    && differsFromCurrent && !saving;

  const handleKeyEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await apiService.put(
        '/api/auth/password',
        { currentPassword, newPassword },
        { validateStatus: s => s < 500 }
      );
      if (res.status >= 200 && res.status < 300) {
        setStatus({ message: 'Password updated successfully', success: true });
        setChanged(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else if (res.status === 401) {
        setStatus({ message: 'Current password is incorrect', success: false });
      } else if (res.status === 429) {
        setStatus({ message: 'Too many attempts — please wait a few minutes and try again', success: false });
      } else {
        const msg = res.data?.errors?.[0]?.message || res.data?.message || 'Could not update password';
        setStatus({ message: msg, success: false });
      }
    } catch {
      setStatus({ message: 'Network error — please try again', success: false });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <SectionTitle><Lock size={18} /> Change Password</SectionTitle>
      <form onSubmit={handleSubmit}>
        <FieldRow>
          <FieldLabel htmlFor="current-password">Current Password</FieldLabel>
          <PasswordInput
            id="current-password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="current-password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            onKeyDown={handleKeyEvent}
            onKeyUp={handleKeyEvent}
          />
          <EyeButton
            type="button"
            onClick={() => setShowPasswords(v => !v)}
            aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
          >
            {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
          </EyeButton>
        </FieldRow>

        <FieldRow>
          <FieldLabel htmlFor="new-password">New Password</FieldLabel>
          <PasswordInput
            id="new-password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            onKeyDown={handleKeyEvent}
            onKeyUp={handleKeyEvent}
          />
        </FieldRow>

        <FieldRow>
          <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
          <PasswordInput
            id="confirm-password"
            type={showPasswords ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={handleKeyEvent}
            onKeyUp={handleKeyEvent}
            aria-invalid={confirmPassword.length > 0 && !passwordsMatch}
          />
          {capsLockOn && <CapsHint role="status">Caps Lock is on</CapsHint>}
        </FieldRow>

        <RuleList aria-label="Password requirements">
          {ruleResults.map(rule => (
            <RuleItem key={rule.label} $met={rule.met}>
              {rule.met ? <Check size={14} /> : <X size={14} />}
              {rule.label}
            </RuleItem>
          ))}
          <RuleItem $met={passwordsMatch}>
            {passwordsMatch ? <Check size={14} /> : <X size={14} />}
            Passwords match
          </RuleItem>
          <RuleItem $met={differsFromCurrent}>
            {differsFromCurrent ? <Check size={14} /> : <X size={14} />}
            Different from current password
          </RuleItem>
        </RuleList>

        <SaveRow>
          <SaveButton type="submit" disabled={!canSubmit}>
            <Save size={14} />
            {saving ? 'Updating...' : 'Update Password'}
          </SaveButton>
          {status && (
            <StatusText $success={status.success} role="status">
              {status.message}
            </StatusText>
          )}
        </SaveRow>
        {changed && (
          <SuccessNote>
            <ShieldCheck size={14} />
            For your security, other devices will be signed out and need your new password.
          </SuccessNote>
        )}
      </form>
    </Card>
  );
};

export default ChangePasswordCard;
