/**
 * AdminPasswordSetupLinkPanel
 * ===========================
 * Owner-gated helper on the Account Access page: generates a one-time
 * password set/reset link for the selected account so Sean can copy it and
 * text it to the client (no email required). Backend endpoint:
 * POST /api/auth/admin/password-setup-link (owner allowlist enforced).
 * The link is shown response-only and cleared when the target changes.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, KeyRound } from 'lucide-react';
import apiService from '../../services/api.service';
import type { AdminCommandTarget } from './AdminAccountCommandPanel';
import {
  LinkActionButton,
  LinkActionRow,
  LinkHeader,
  LinkOutputRow,
  LinkShell,
  LinkStatus,
} from './AdminPasswordSetupLinkPanel.styles';

interface Props {
  target: AdminCommandTarget | null;
  disabled?: boolean;
}

const IDLE_MESSAGE = 'Generates a one-time link the client can open to set their password. Copy it and text it to them.';

const AdminPasswordSetupLinkPanel: React.FC<Props> = ({ target, disabled = false }) => {
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState(IDLE_MESSAGE);
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  // A generated link belongs to one account only — clear it on target change.
  useEffect(() => {
    setLink('');
    setCopied(false);
    setError(false);
    setMessage(IDLE_MESSAGE);
  }, [target?.id]);

  const generateLink = async () => {
    if (!target || disabled || busy) return;
    setBusy(true);
    setError(false);
    setCopied(false);
    setLink('');
    setMessage('Generating password setup link...');
    try {
      const response = await apiService.post<{ link?: string; expiresInMinutes?: number }>(
        '/api/auth/admin/password-setup-link',
        { userId: target.id }
      );
      const nextLink = response.data?.link || '';
      if (!nextLink) throw new Error('The server did not return a link.');
      setLink(nextLink);
      const hours = Math.round((response.data?.expiresInMinutes || 1440) / 60);
      setMessage(`One-time link ready for ${target.displayName}. Expires in ${hours}h and is consumed on first use.`);
    } catch (err: any) {
      setError(true);
      setMessage(err?.response?.data?.message || err?.message || 'Unable to generate password setup link.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setMessage('Link copied. Text it to the client — it works once and then expires.');
    } catch {
      linkInputRef.current?.select();
      setError(true);
      setMessage('Clipboard unavailable. The link is selected — press Ctrl+C to copy.');
    }
  };

  return (
    <LinkShell aria-label="Password setup link">
      <LinkHeader>
        <div>
          <strong>Password setup link</strong>
          <span>Owner gated. One-time reset link to copy and text — no email needed.</span>
        </div>
      </LinkHeader>

      <LinkActionRow>
        <LinkActionButton
          type="button"
          onClick={generateLink}
          disabled={disabled || !target || busy}
          aria-label={target ? `Get password setup link for ${target.displayName}` : 'Get password setup link'}
        >
          <KeyRound size={16} aria-hidden="true" focusable="false" />
          {busy ? 'Generating...' : 'Get password setup link'}
        </LinkActionButton>
      </LinkActionRow>

      {link && (
        <LinkOutputRow>
          <input
            ref={linkInputRef}
            value={link}
            readOnly
            aria-label="Generated password setup link"
            onFocus={(event) => event.currentTarget.select()}
          />
          <LinkActionButton type="button" onClick={copyLink} aria-label="Copy password setup link">
            {copied
              ? <Check size={16} aria-hidden="true" focusable="false" />
              : <Copy size={16} aria-hidden="true" focusable="false" />}
            {copied ? 'Copied' : 'Copy link'}
          </LinkActionButton>
        </LinkOutputRow>
      )}

      <LinkStatus $error={error} role={error ? 'alert' : 'status'} aria-live="polite">
        {message}
      </LinkStatus>
    </LinkShell>
  );
};

export default AdminPasswordSetupLinkPanel;
