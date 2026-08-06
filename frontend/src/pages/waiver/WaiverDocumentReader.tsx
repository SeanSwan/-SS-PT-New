/**
 * WaiverDocumentReader — SWA-140
 * ===============================
 * One card per document, each opening into a full-height reading sheet.
 *
 * Replaces a 400px scroll box that showed every document stacked together —
 * where comprehension went to die, and where the required checkbox said
 * "acknowledge the risks described above" while pointing at nothing when the
 * text failed to load. Each document now carries its own read attestation, so
 * the consent language references documents by name rather than by position.
 *
 * Note on evidence: attestation here is a UX and conspicuousness measure, not
 * a scroll-telemetry system. We do not gate on scroll depth — courts weigh
 * conspicuousness and opportunity to read, and scroll gates on a phone buy
 * abandonment rather than enforceability.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { sanitizeWaiverHtml, looksLikeHtml } from './sanitizeWaiverHtml';
import { WAIVER_COPY } from './waiverCopy';
import type { WaiverVersionInfo } from '../../services/publicWaiverService';

const List = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const Card = styled.div<{ $done: boolean }>`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid ${({ $done }) =>
    $done ? 'var(--accent-gold, #C6A84B)' : 'var(--border-subtle, rgba(96, 192, 240, 0.22))'};
  background: var(--surface-elevated, rgba(255, 255, 255, 0.04));

  @media (max-width: 430px) {
    flex-wrap: wrap;
  }
`;

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitle = styled.p`
  margin: 0 0 0.25rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const CardMeta = styled.p`
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

const StatusPill = styled.span<{ $done: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.625rem;
  border-radius: 999px;
  white-space: nowrap;
  color: ${({ $done }) => ($done ? 'var(--accent-gold, #C6A84B)' : 'var(--text-muted, rgba(224,236,244,0.62))')};
  border: 1px solid currentColor;
`;

const OpenButton = styled.button`
  min-height: 44px;
  min-width: 88px;
  padding: 0 1.25rem;
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  background: var(--surface-raised, rgba(96, 192, 240, 0.12));
  border: 1px solid var(--accent-primary, #60C0F0);

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const Sheet = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: var(--bg-base, #030712);
`;

const SheetHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
`;

const SheetTitle = styled.h2`
  margin: 0;
  flex: 1;
  font-size: 1.0625rem;
  color: var(--text-primary, #E0ECF4);
`;

const CloseButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  color: var(--text-primary, #E0ECF4);
  background: transparent;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

/**
 * Legal text gets a high-contrast reading surface rather than the page's
 * glass treatment — glassmorphism is beautiful for cards and hostile for
 * paragraphs you are legally responsible for understanding.
 */
const SheetBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.25rem 2rem;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.7;
  font-size: 1rem;

  > div {
    max-width: 68ch;
    margin: 0 auto;
  }

  h2, h3 { line-height: 1.35; }
  h3 { margin-top: 1.75rem; }
  li { margin-bottom: 0.4rem; }

  @media (max-width: 430px) {
    font-size: 1.0625rem;
  }
`;

const SheetFooter = styled.footer`
  padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  background: var(--surface-elevated, rgba(255, 255, 255, 0.04));
`;

const AttestLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 48px;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);

  input {
    width: 22px;
    height: 22px;
    accent-color: var(--accent-primary, #60C0F0);
  }
`;

const ChangeNote = styled.div`
  margin-bottom: 1.25rem;
  padding: 0.875rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  color: var(--text-primary, #E0ECF4);

  strong { display: block; margin-bottom: 0.25rem; }
`;

interface Props {
  versions: WaiverVersionInfo[];
  attestedIds: Set<number>;
  onAttest: (versionId: number, attested: boolean) => void;
  requiredIds: Set<number>;
}

export default function WaiverDocumentReader({ versions, attestedIds, onAttest, requiredIds }: Props) {
  const [openId, setOpenId] = React.useState<number | null>(null);
  const openDoc = versions.find((v) => v.id === openId) || null;
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Escape closes the sheet, and focus returns to the card that opened it —
  // otherwise a keyboard user is dropped at the top of the page each time.
  useEffect(() => {
    if (!openDoc) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [openDoc]);

  const close = useCallback(() => {
    setOpenId(null);
    openerRef.current?.focus();
  }, []);

  return (
    <>
      <List>
        {versions.map((v) => {
          const done = attestedIds.has(v.id);
          const optional = !requiredIds.has(v.id);
          return (
            <Card key={v.id} $done={done}>
              <CardBody>
                <CardTitle>
                  {v.title}
                  {optional && <span aria-label="optional"> · optional</span>}
                </CardTitle>
                <CardMeta>{WAIVER_COPY.documents.versionLine(v.version, v.effectiveAt)}</CardMeta>
              </CardBody>
              <StatusPill $done={done}>
                {done ? WAIVER_COPY.documents.readBadge : WAIVER_COPY.documents.readingBadge}
              </StatusPill>
              <OpenButton
                type="button"
                onClick={(e) => { openerRef.current = e.currentTarget; setOpenId(v.id); }}
                aria-label={`${WAIVER_COPY.documents.readAction} ${v.title}`}
              >
                {WAIVER_COPY.documents.readAction}
              </OpenButton>
            </Card>
          );
        })}
      </List>

      {openDoc && (
        <Sheet role="dialog" aria-modal="true" aria-label={openDoc.title}>
          <SheetHeader>
            <SheetTitle>{openDoc.title}</SheetTitle>
            <CloseButton ref={closeRef} type="button" onClick={close} aria-label="Close document">
              ✕
            </CloseButton>
          </SheetHeader>

          <SheetBody tabIndex={0}>
            <div>
              {openDoc.changeSummary && (
                <ChangeNote>
                  <strong>{WAIVER_COPY.documents.whatChanged}</strong>
                  {openDoc.changeSummary}
                </ChangeNote>
              )}
              {openDoc.displayText && looksLikeHtml(openDoc.displayText) ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeWaiverHtml(openDoc.displayText) }} />
              ) : (
                <div style={{ whiteSpace: 'pre-wrap' }}>{openDoc.displayText}</div>
              )}
            </div>
          </SheetBody>

          <SheetFooter>
            <AttestLabel>
              <input
                type="checkbox"
                checked={attestedIds.has(openDoc.id)}
                onChange={(e) => onAttest(openDoc.id, e.target.checked)}
              />
              <span>{WAIVER_COPY.documents.attest}</span>
            </AttestLabel>
          </SheetFooter>
        </Sheet>
      )}
    </>
  );
}
