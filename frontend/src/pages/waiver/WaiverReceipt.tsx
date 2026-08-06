/**
 * WaiverReceipt — SWA-140
 * ========================
 * The success state, rebuilt as a receipt.
 *
 * It used to say "Waiver Submitted / Thank you! Your waiver has been submitted
 * successfully. / Confirmation ID: 42" and then offer "Create an Account" —
 * to people who were already logged in. It named nothing about what was
 * actually signed, and gave the signer no copy at all, which is a weak
 * instrument for a document whose whole purpose is provability.
 *
 * Now: what was signed, which versions, when, and the signer's retainable
 * copy (download + print) composed server-side at the moment of signature.
 */
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { WAIVER_COPY } from './waiverCopy';
import type { WaiverSubmitResponse } from '../../services/publicWaiverService';

const Wrap = styled.div`
  text-align: center;
  padding: 1rem 0 0.5rem;
`;

/**
 * The one moment of gold on an otherwise quiet page: the seal that marks
 * being admitted, rather than a generic green tick that marks a form POST.
 */
const Seal = styled.div`
  width: 88px;
  height: 88px;
  margin: 0 auto 1.25rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 2.25rem;
  color: var(--accent-gold, #C6A84B);
  border: 2px solid var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent);
  animation: sealIn 640ms cubic-bezier(0.2, 0.8, 0.2, 1) both;

  @keyframes sealIn {
    from { transform: scale(0.86); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Title = styled.h2`
  margin: 0 0 0.5rem;
  font-size: clamp(1.5rem, 4vw, 2rem);
  color: var(--text-primary, #E0ECF4);
`;

const Body = styled.p`
  margin: 0 auto 1.5rem;
  max-width: 42ch;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));
`;

const Panel = styled.div`
  text-align: left;
  padding: 1.25rem;
  border-radius: 14px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  background: var(--surface-elevated, rgba(255, 255, 255, 0.04));
  margin-bottom: 1.5rem;
`;

const PanelHeading = styled.h3`
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

const DocList = styled.ul`
  margin: 0 0 1rem;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.14));
    color: var(--text-primary, #E0ECF4);
  }
  li:last-child { border-bottom: 0; }

  span:last-child {
    color: var(--text-muted, rgba(224, 236, 244, 0.62));
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
`;

const MetaRow = styled.p`
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.72));

  strong { color: var(--text-primary, #E0ECF4); }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
`;

const Action = styled.button<{ $primary?: boolean }>`
  min-height: 48px;
  padding: 0 1.5rem;
  border-radius: 12px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: ${({ $primary }) => ($primary ? 'var(--text-primary, #E0ECF4)' : 'var(--text-muted, rgba(224,236,244,0.82))')};
  background: ${({ $primary }) =>
    $primary ? 'var(--accent-deep, #002060)' : 'transparent'};
  border: 1px solid ${({ $primary }) => ($primary ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-subtle, rgba(96,192,240,0.22))')};
  box-shadow: ${({ $primary }) => ($primary ? '0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent)' : 'none')};

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const Note = styled.p`
  margin: 1rem 0 0;
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

interface Props {
  result: WaiverSubmitResponse;
  firstName?: string;
  isLoggedInClient: boolean;
  onContinue: () => void;
}

function formatSignedAt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

export default function WaiverReceipt({ result, firstName, isLoggedInClient, onContinue }: Props) {
  const download = useCallback(() => {
    if (!result.artifactHtml) return;
    const blob = new Blob([result.artifactHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swanstudios-waiver-${result.waiverRecordId}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [result]);

  const print = useCallback(() => {
    if (!result.artifactHtml) { window.print(); return; }
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) { window.print(); return; }
    w.document.write(result.artifactHtml);
    w.document.close();
    w.focus();
    w.print();
  }, [result]);

  const signedAt = formatSignedAt(result.signedAt);

  return (
    <Wrap>
      <Seal aria-hidden>✦</Seal>
      <Title>{WAIVER_COPY.success.title(firstName)}</Title>
      <Body>{WAIVER_COPY.success.body}</Body>

      <Panel>
        <PanelHeading>{WAIVER_COPY.success.documentsHeading}</PanelHeading>
        {result.signedSummary?.length ? (
          <DocList>
            {result.signedSummary.map((doc) => (
              <li key={doc.id}>
                <span>{doc.title}</span>
                <span>{doc.version ? `v${doc.version}` : ''}</span>
              </li>
            ))}
          </DocList>
        ) : null}

        {signedAt && (
          <MetaRow>
            {WAIVER_COPY.success.signedLine} <strong>{signedAt}</strong>
          </MetaRow>
        )}
        <MetaRow>
          {WAIVER_COPY.success.confirmationLine} <strong>#{result.waiverRecordId}</strong>
        </MetaRow>
        {result.replayed && <Note>{WAIVER_COPY.success.replayNote}</Note>}
      </Panel>

      <Actions>
        {result.artifactHtml && (
          <>
            <Action type="button" onClick={download}>{WAIVER_COPY.success.download}</Action>
            <Action type="button" onClick={print}>{WAIVER_COPY.success.print}</Action>
          </>
        )}
        <Action type="button" $primary onClick={onContinue}>
          {isLoggedInClient ? WAIVER_COPY.success.continueDashboard : WAIVER_COPY.success.continueHome}
        </Action>
      </Actions>

      {!isLoggedInClient && (
        <Note>
          <a href="/signup">{WAIVER_COPY.success.createAccount}</a> — {WAIVER_COPY.success.createAccountNote}
        </Note>
      )}
    </Wrap>
  );
}
