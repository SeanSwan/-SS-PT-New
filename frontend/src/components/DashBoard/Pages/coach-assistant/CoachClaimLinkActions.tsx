/**
 * FILE: CoachClaimLinkActions.tsx
 * PURPOSE: Shared copy/open controls for secure client claim/reset-link handoff.
 */
import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { ActionAnchor, ActionButton, Actions, StatusText } from './CoachActionProposalCard.styles';
import { AccessHandoffButton, AccessHandoffLink } from './CoachCommandLogEntry.styles';

const copyError = (label: string) => `Clipboard unavailable. Open the ${label} and copy the URL manually.`;
const copyCodeError = 'Clipboard unavailable. Copy the claim code manually.';
const titleCaseLabel = (label: string) => `${label.slice(0, 1).toUpperCase()}${label.slice(1)}`;

const useClipboardCopy = (value: string, errorMessage: string) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setError(null);
    } catch {
      setCopied(false);
      setError(errorMessage);
    }
  };

  return { copied, copy, error };
};

const useAccessLinkCopy = (url: string, label: string) => useClipboardCopy(url, copyError(label));

export const ProposalAccessLinkActions = ({ url, label }: { url: string; label: 'claim link' | 'reset link' }) => {
  const { copied, copy, error } = useAccessLinkCopy(url, label);
  const labelTitle = titleCaseLabel(label);

  return (
    <>
      <Actions aria-label="Client access handoff actions">
        <ActionButton type="button" onClick={copy}>
          <Copy size={16} />
          {copied ? `${labelTitle} copied` : `Copy ${label}`}
        </ActionButton>
        <ActionAnchor href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={16} />Open {label}
        </ActionAnchor>
      </Actions>
      {error && <StatusText $error>{error}</StatusText>}
    </>
  );
};

export const ProposalClaimLinkActions = ({ claimUrl }: { claimUrl: string }) => (
  <ProposalAccessLinkActions url={claimUrl} label="claim link" />
);

export const CommandLogAccessLinkActions = ({ url, label }: { url: string; label: 'claim link' | 'reset link' }) => {
  const { copied, copy, error } = useAccessLinkCopy(url, label);
  const labelTitle = titleCaseLabel(label);

  return (
    <>
      <AccessHandoffButton type="button" onClick={copy}>
        <Copy size={16} aria-hidden="true" />
        {copied ? `${labelTitle} copied` : `Copy ${label}`}
      </AccessHandoffButton>
      <AccessHandoffLink href={url} target="_blank" rel="noopener noreferrer">
        <ExternalLink size={16} aria-hidden="true" />
        Open {label}
      </AccessHandoffLink>
      {error ? <p role="status">{error}</p> : null}
    </>
  );
};

export const CommandLogClaimLinkActions = ({ claimUrl }: { claimUrl: string }) => (
  <CommandLogAccessLinkActions url={claimUrl} label="claim link" />
);
export const CommandLogClaimCodeCopyAction = ({ code }: { code: string }) => {
  const { copied, copy, error } = useClipboardCopy(code, copyCodeError);

  return (
    <>
      <AccessHandoffButton type="button" onClick={copy}>
        <Copy size={16} aria-hidden="true" />
        {copied ? 'Claim code copied' : 'Copy claim code'}
      </AccessHandoffButton>
      {error ? <p role="status">{error}</p> : null}
    </>
  );
};
