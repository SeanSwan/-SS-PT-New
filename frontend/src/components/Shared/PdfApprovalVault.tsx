/**
 * PdfApprovalVault
 * ================
 * A3 "Approval Vault": a Crystalline-Swan modal that previews the EXACT generated
 * PDF blob (preview == print) before download, so Sean eyeballs the branding —
 * and catches a mis-tagged Move Fitness client — before a client-facing document
 * leaves the building. The `buildFile` callback yields the same bytes that get
 * previewed and then saved on Approve; a "Branding: <wordmark>" chip surfaces the
 * resolved brand as a safety signal.
 *
 * Generic + service-agnostic (no PDF logic here) so all three client-facing docs
 * (plan, session log, progress report) and the future A2b editor can reuse it.
 * In-house modal: framer-motion / focus-trap-react are NOT installed, so the
 * entrance, focus-trap, scroll-lock, and Escape/click-outside contract are hand
 * -rolled per the house WorkoutPlannerBlendDialog pattern (z-index 2200).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Loader2, ShieldCheck, X } from 'lucide-react';
import {
  ApproveButton,
  BrandChip,
  CancelButton,
  CloseButton,
  ErrorState,
  Footer,
  Header,
  LoadingState,
  Overlay,
  Panel,
  PreviewArea,
  PreviewFrame,
  SafetyHint,
  TitleGroup,
} from './PdfApprovalVault.styles';

export interface PdfPreviewPayload {
  /** The exact bytes previewed AND downloaded (preview == print). */
  blob: Blob;
  /** Download filename (already brand-prefixed by the exporter). */
  filename: string;
  /** Resolved brand wordmark for the safety chip, e.g. "Move Fitness". */
  brandWordmark: string;
}

type VaultState = 'loading' | 'ready' | 'error';

interface PdfApprovalVaultProps {
  open: boolean;
  onClose: () => void;
  /** Builds the exact bytes to preview + download; called once per open. */
  buildFile: () => PdfPreviewPayload | Promise<PdfPreviewPayload | null> | null;
  /** Human label for the document kind, e.g. "training plan". */
  documentLabel?: string;
}

const FOCUSABLE =
  'button:not([disabled]), [href], iframe, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const PdfApprovalVault: React.FC<PdfApprovalVaultProps> = ({
  open,
  onClose,
  buildFile,
  documentLabel = 'document',
}) => {
  const [state, setState] = useState<VaultState>('loading');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [wordmark, setWordmark] = useState('');
  const payloadRef = useRef<PdfPreviewPayload | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);
  // buildFile is often an inline arrow (new identity each parent render). Keep it
  // in a ref so the build effect fires once per OPEN, not on every re-render.
  const buildFileRef = useRef(buildFile);
  buildFileRef.current = buildFile;

  // Build the PDF blob when the vault opens; revoke the preview URL on close.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let objectUrl: string | null = null;
    setState('loading');
    setPreviewUrl(null);
    setWordmark('');
    payloadRef.current = null;

    Promise.resolve()
      .then(() => buildFileRef.current())
      .then((payload) => {
        if (cancelled) return;
        if (!payload) {
          setState('error');
          return;
        }
        payloadRef.current = payload;
        objectUrl = URL.createObjectURL(payload.blob);
        setPreviewUrl(objectUrl);
        setWordmark(payload.brandWordmark);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open]);

  // House dialog contract: focus in on open, restore opener on close, lock
  // background scroll.
  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      const opener = openerRef.current;
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [open]);

  // Escape closes; Tab is trapped inside the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleApprove = useCallback(() => {
    const payload = payloadRef.current;
    if (!payload || typeof document === 'undefined') return;
    // Fresh URL for the download so we never revoke the live preview URL early.
    const url = URL.createObjectURL(payload.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = payload.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <Overlay onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Review and approve ${documentLabel} PDF`}
      >
        <Header>
          <TitleGroup>
            <ShieldCheck size={18} aria-hidden="true" />
            Review before download
          </TitleGroup>
          {state === 'ready' && wordmark && (
            <BrandChip role="status" aria-label={`Branding: ${wordmark}`}>
              Branding:&nbsp;<b>{wordmark}</b>
            </BrandChip>
          )}
          <CloseButton ref={closeRef} type="button" onClick={onClose} aria-label="Close preview">
            <X size={16} aria-hidden="true" />
          </CloseButton>
        </Header>

        {state === 'loading' && (
          <LoadingState role="status" aria-live="polite">
            <Loader2 size={22} aria-hidden="true" />
            <div className="shimmer" aria-hidden="true" />
            Building your {documentLabel} preview...
          </LoadingState>
        )}

        {state === 'error' && (
          <ErrorState role="alert">
            <AlertTriangle size={26} aria-hidden="true" />
            Couldn&apos;t build the preview.
            <span>Close and try again — nothing was downloaded.</span>
          </ErrorState>
        )}

        {state === 'ready' && previewUrl && (
          <PreviewArea>
            <PreviewFrame title={`${documentLabel} PDF preview`} src={previewUrl} />
          </PreviewArea>
        )}

        <Footer>
          <SafetyHint>
            The document downloads exactly as previewed above.
          </SafetyHint>
          <CancelButton type="button" onClick={onClose}>
            Cancel
          </CancelButton>
          <ApproveButton
            type="button"
            onClick={handleApprove}
            disabled={state !== 'ready'}
            aria-label={`Approve and download the ${documentLabel} PDF`}
          >
            <Download size={15} aria-hidden="true" />
            Approve &amp; Download
          </ApproveButton>
        </Footer>
      </Panel>
    </Overlay>
  );
};

export default PdfApprovalVault;
