/**
 * ============================================================================
 * FILE: CreatorRenderQueueTokenModal.tsx
 * PURPOSE: Reveal an agent credential that the server will never show again.
 * ============================================================================
 *
 * This is the most dangerous moment in the surface. The token is generated once, stored
 * only as a SHA-256 hash, and is genuinely unrecoverable — losing it means re-enrolling,
 * which rotates the credential and invalidates whatever the worker was given.
 *
 * So every SILENT exit is removed: backdrop click, Escape, and a bare close button are
 * the three muscle-memory dismissals that would destroy the token without the operator
 * ever deciding to. They do not fail silently either — attempting one surfaces a single
 * line explaining why, then the modal stays. One gate, one sentence, no timers, no
 * shaking, no countdown: the friction sits exactly at the irreversible action and nowhere
 * else.
 *
 * A download escape is offered because "I forgot to copy it" needs a recoverable path
 * that is ALSO a save, rather than a weaker gate.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Copy, Check, Download, ShieldAlert } from 'lucide-react';
import {
  Scrim, Modal, CardTitle, Warning, TokenWell, ModalActions,
  PrimaryButton, QuietButton, AccentButton, Caption,
} from './CreatorRenderQueue.styles';

interface Props {
  token: string;
  agentId: string;
  onClose: () => void;
}

const CreatorRenderQueueTokenModal: React.FC<Props> = ({ token, agentId, onClose }) => {
  const [saved, setSaved] = useState(false);
  const [nagged, setNagged] = useState(false);
  const copyRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { copyRef.current?.focus(); }, []);

  const blockExit = useCallback(() => {
    if (saved) { onClose(); return; }
    setNagged(true);
  }, [saved, onClose]);

  // Escape is the fastest way to lose this token, so it is intercepted rather than
  // allowed to bubble to any ancestor dialog handler.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      blockExit();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [blockExit]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(token);
      setSaved(true);
    } catch {
      // Clipboard can be denied by permissions or a non-secure context. Do NOT strand the
      // operator: the token is selectable text, so arm the exit and say what to do.
      setSaved(true);
      setNagged(true);
    }
  }, [token]);

  const download = useCallback(() => {
    const body = `# SwanStudios render agent credential\n`
      + `# Agent: ${agentId}\n`
      + `# This token is shown once. Re-enrolling rotates it and invalidates this value.\n`
      + `SWAN_AGENT_TOKEN=${token}\n`;
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `swan-agent-${agentId}.env`;
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
  }, [token, agentId]);

  return (
    <Scrim
      role="dialog"
      aria-modal="true"
      aria-labelledby="token-modal-title"
      onMouseDown={(e) => { if (e.target === e.currentTarget) blockExit(); }}
    >
      <Modal onMouseDown={(e) => e.stopPropagation()}>
        <CardTitle id="token-modal-title">
          <ShieldAlert size={18} style={{ verticalAlign: '-3px', marginRight: 8, color: '#C6A84B' }} />
          Save this token now
        </CardTitle>

        <Warning>
          Shown once and never again. If you close this without saving it, the only way
          forward is re-enrolling <strong>{agentId}</strong>, which issues a new token and
          invalidates this one.
        </Warning>

        <TokenWell>{token}</TokenWell>

        <ModalActions>
          <PrimaryButton ref={copyRef} type="button" onClick={copy}>
            {saved ? <Check size={16} /> : <Copy size={16} />}
            {saved ? 'Copied' : 'Copy token'}
          </PrimaryButton>
          <QuietButton type="button" onClick={download}>
            <Download size={16} />
            Download .env
          </QuietButton>
        </ModalActions>

        <div style={{ marginTop: 16 }}>
          <AccentButton
            type="button"
            onClick={onClose}
            disabled={!saved}
            style={{ width: '100%' }}
          >
            {saved ? "I've saved it — close" : 'Copy or download to continue'}
          </AccentButton>
        </div>

        {nagged && !saved && (
          <Caption style={{ color: '#C6A84B' }}>
            Copy it first — this is the only time it can be shown.
          </Caption>
        )}
        {nagged && saved && (
          <Caption style={{ color: '#C6A84B' }}>
            Clipboard was blocked by the browser. Select the token above and copy it
            manually, or use Download .env.
          </Caption>
        )}

        <Caption>
          Next: run the agent on that machine with{' '}
          <code style={{ fontFamily: "'Fira Code', monospace" }}>SWAN_AGENT_TOKEN</code> set.
        </Caption>
      </Modal>
    </Scrim>
  );
};

export default CreatorRenderQueueTokenModal;
