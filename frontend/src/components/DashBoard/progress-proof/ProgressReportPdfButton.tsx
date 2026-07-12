/**
 * ProgressReportPdfButton
 * =======================
 * One-tap branded progress-report download (Phase P6): builds the report
 * sections from the canonical charts bundle (same row builders as the expand
 * modal) and streams the studio-branded PDF via the shared Swan kit. The PDF
 * modules stay lazy-loaded - nothing lands in the main bundle until tapped.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { FileDown, Loader2 } from 'lucide-react';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts';
import { buildProgressReportSections } from './buildProgressReportSections';

const PdfButton = styled.button`
  min-height: 44px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.85rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: transparent;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) { color: var(--text-primary, #E0ECF4); }
  &:disabled { opacity: 0.6; cursor: progress; }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ErrorNote = styled.span`
  margin-left: 0.5rem;
  font-size: 0.72rem;
  color: var(--text-secondary, #9FB6C8);
`;

export interface ProgressReportPdfButtonProps {
  charts: CanonicalProgressCharts;
  /** Name printed in the PDF header band; defaults to a neutral label. */
  clientName?: string;
  /** Subject client's source — drives white-label branding (move_fitness -> Move Fitness only). */
  clientSource?: string | null;
}

const ProgressReportPdfButton: React.FC<ProgressReportPdfButtonProps> = ({ charts, clientName, clientSource }) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const { downloadProgressReportPdf } = await import('../../../services/pdf/progressReportPdf');
      const delivered = await downloadProgressReportPdf({
        clientName: clientName?.trim() || 'Client',
        clientSource,
        generatedOnLabel: new Date().toLocaleDateString(),
        sections: buildProgressReportSections(charts),
      });
      if (!delivered) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PdfButton
        type="button"
        onClick={handleDownload}
        disabled={busy}
        aria-label="Download progress report PDF"
      >
        {busy ? <Loader2 size={14} /> : <FileDown size={14} />}
        PDF report
      </PdfButton>
      {failed && <ErrorNote role="status">Couldn't build the PDF - try again.</ErrorNote>}
    </>
  );
};

export default ProgressReportPdfButton;
