/**
 * ProgressReportPdfButton
 * =======================
 * One-tap branded progress-report export (Phase P6 + A3 Approval Vault): builds
 * the report sections from the canonical charts bundle (same row builders as the
 * expand modal) and opens the Approval Vault so the studio-branded PDF is
 * PREVIEWED — with its resolved brand visible on the safety chip — before the
 * exact same bytes download. The PDF modules stay lazy-loaded: nothing lands in
 * the main bundle until tapped.
 */
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import { FileDown } from 'lucide-react';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts';
import PdfApprovalVault from '../../Shared/PdfApprovalVault';
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

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export interface ProgressReportPdfButtonProps {
  charts: CanonicalProgressCharts;
  /** Name printed in the PDF header band; defaults to a neutral label. */
  clientName?: string;
  /** Subject client's source — drives white-label branding (move_fitness -> Move Fitness only). */
  clientSource?: string | null;
}

const ProgressReportPdfButton: React.FC<ProgressReportPdfButtonProps> = ({ charts, clientName, clientSource }) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  const buildReportFile = useCallback(async () => {
    const { buildProgressReportPdfPreview } = await import('../../../services/pdf/progressReportPdf');
    return buildProgressReportPdfPreview({
      clientName: clientName?.trim() || 'Client',
      clientSource,
      generatedOnLabel: new Date().toLocaleDateString(),
      sections: buildProgressReportSections(charts),
    });
  }, [charts, clientName, clientSource]);

  return (
    <>
      <PdfButton
        type="button"
        onClick={() => setPreviewOpen(true)}
        aria-label="Download progress report PDF"
      >
        <FileDown size={14} />
        PDF report
      </PdfButton>
      <PdfApprovalVault
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        documentLabel="progress report"
        buildFile={buildReportFile}
      />
    </>
  );
};

export default ProgressReportPdfButton;
