/**
 * Blueprint: CoachProgressPdf
 * Parent: CoachWorkspacePage. Answers "make me a PDF" from the coach chat ON THIS
 * DEVICE: it loads the subject's canonical progress charts — the same first-party
 * data the Progress tab draws (training frequency, volume, PRs, estimated 1RM,
 * recovery / pain signals, weight and body-fat trends) — builds the branded report
 * with the existing Swan PDF kit, and opens the Approval Vault so the exact bytes
 * are previewed before they download.
 *
 * Privacy: nothing here talks to Swan Coach. The name printed on the report comes
 * from the viewer's own roster; the model never sees it (Rule 8).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import PdfApprovalVault from '../../../Shared/PdfApprovalVault';
import { useAdminClientProgressCharts } from '../../../../hooks/analytics/useAdminClientProgressCharts';
import { useClientProgressCharts } from '../../../../hooks/analytics/useClientProgressCharts';
import type { UseCanonicalProgressChartsFetchReturn } from '../../../../hooks/analytics/useCanonicalProgressChartsFetch';
import { useOptionalGlobalClient } from '../../../../context/GlobalClientContext';
import { buildProgressReportSections } from '../../progress-proof/buildProgressReportSections';

export type CoachPdfRequest =
  | { nonce: number; kind: 'client'; clientId: number; clientName: string }
  | { nonce: number; kind: 'self'; clientName: string; clientSource?: string | null };

type Callbacks = { onClose: () => void; onStatus: (text: string | null) => void };

function ReportVault({ data, clientName, clientSource, onClose, onStatus }: Callbacks & {
  data: UseCanonicalProgressChartsFetchReturn;
  clientName: string;
  clientSource: string | null;
}) {
  const { charts, isLoading, error } = data;
  // The fetch hook reports "not loading" before its first request starts, so the
  // vault opens only after a load has really begun AND finished — never on the
  // empty initial bundle (which would print a blank report).
  const sawLoading = useRef(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (isLoading) sawLoading.current = true;
    else if (sawLoading.current) setSettled(true);
  }, [isLoading]);

  useEffect(() => {
    if (error) { onStatus(`Could not load ${clientName}'s records for the PDF: ${error}`); onClose(); return; }
    onStatus(settled ? null : `Gathering ${clientName}'s charts for the PDF…`);
  }, [clientName, error, onClose, onStatus, settled]);

  const buildFile = useCallback(async () => {
    const { buildProgressReportPdfPreview } = await import('../../../../services/pdf/progressReportPdf');
    return buildProgressReportPdfPreview({
      clientName,
      clientSource,
      generatedOnLabel: new Date().toLocaleDateString(),
      sections: buildProgressReportSections(charts),
    });
  }, [charts, clientName, clientSource]);

  return (
    <PdfApprovalVault open={settled && !error} onClose={onClose} documentLabel="progress report" buildFile={buildFile} />
  );
}

function ClientReport({ clientId, clientName, ...callbacks }: Callbacks & { clientId: number; clientName: string }) {
  const data = useAdminClientProgressCharts(clientId);
  // White-label by the SUBJECT client's source, as AdminProgressChartsGrid does.
  const roster = useOptionalGlobalClient();
  const clientSource = roster?.clientList.find((client) => client.id === clientId)?.clientSource ?? null;
  return <ReportVault data={data} clientName={clientName} clientSource={clientSource} {...callbacks} />;
}

function SelfReport({ clientName, clientSource, ...callbacks }: Callbacks & { clientName: string; clientSource: string | null }) {
  const data = useClientProgressCharts();
  return <ReportVault data={data} clientName={clientName} clientSource={clientSource} {...callbacks} />;
}

const CoachProgressPdf: React.FC<Callbacks & { request: CoachPdfRequest | null }> = ({ request, ...callbacks }) => {
  if (!request) return null;
  return request.kind === 'client'
    ? <ClientReport clientId={request.clientId} clientName={request.clientName} {...callbacks} />
    : <SelfReport clientName={request.clientName} clientSource={request.clientSource ?? null} {...callbacks} />;
};

export default CoachProgressPdf;
