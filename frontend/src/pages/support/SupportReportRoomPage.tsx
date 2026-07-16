/**
 * ============================================================================
 * FILE: SupportReportRoomPage.tsx
 * PURPOSE: Canonical authenticated Report Room for explaining, reviewing, and
 *          tracking SwanStudios bugs, errors, access problems, and other issues.
 * MOUNT: /support via frontend/src/routes/main-routes.tsx.
 * DATA: GET/POST /api/support/issues through the authenticated support client.
 * DESIGN: Calm C12 working surface; voice and Swan Coach feed this same draft.
 * ============================================================================
 */
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  supportIssueClient,
  type SupportIssue,
  type SupportIssueClient,
} from '../../services/supportIssueService';
import SupportIssueHistory from './SupportIssueHistory';
import SupportReportComposer from './SupportReportComposer';
import { parseSupportErrorContext } from './supportErrorRoute';
import {
  BackLink, Eyebrow, Hero, Lead, Muted, Page, Receipt, ReceiptCode,
  Shell, Title, TrustNote, TrustTitle, Workspace,
} from './SupportReportRoom.styles';

interface Props { client?: SupportIssueClient }

const SupportReportRoomPage: React.FC<Props> = ({ client = supportIssueClient }) => {
  const [searchParams] = useSearchParams();
  const initialContext = parseSupportErrorContext(searchParams);
  const [issues, setIssues] = useState<SupportIssue[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyError, setHistoryError] = useState('');
  const [historyRetry, setHistoryRetry] = useState({ page: 1, append: false });
  const [receipt, setReceipt] = useState<SupportIssue | null>(null);

  const loadHistory = useCallback(async (page = 1, append = false) => {
    if (append) setHistoryLoadingMore(true);
    else setHistoryLoading(true);
    setHistoryError('');
    setHistoryRetry({ page, append });
    try {
      const result = await client.listIssues({ page, pageSize: 20 });
      setIssues((current) => append
        ? [...current, ...result.issues.filter((issue) => !current.some((item) => item.id === issue.id))]
        : result.issues);
      setHistoryPage(result.pagination.page);
      setHistoryTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Your report history could not be loaded.');
    } finally {
      setHistoryLoading(false);
      setHistoryLoadingMore(false);
    }
  }, [client]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const submitted = (issue: SupportIssue) => {
    setReceipt(issue);
    setIssues((current) => [issue, ...current.filter((item) => item.id !== issue.id)]);
    window.setTimeout(() => document.getElementById('support-receipt')?.focus(), 0);
  };

  return (
    <Page>
      <Shell>
        <BackLink to="/dashboard"><ArrowLeft size={18} aria-hidden="true" /> Back to dashboard</BackLink>
        <Hero>
          <div>
            <Eyebrow>Swan Coach support</Eyebrow>
            <Title>The Report Room</Title>
            <Lead>Explain the problem once, in your own words. Swan Coach turns it into a clear report with the details needed to investigate and fix it.</Lead>
          </div>
          <TrustNote>
            <LockKeyhole size={22} aria-hidden="true" />
            <TrustTitle>Private by design</TrustTitle>
            <Muted>Do not include passwords, card numbers, or medical details. Only allowlisted technical diagnostics travel with your report.</Muted>
          </TrustNote>
        </Hero>
        {receipt && (
          <Receipt id="support-receipt" role="status" aria-live="polite" tabIndex={-1}>
            <TrustTitle>Your report is safely in the queue.</TrustTitle>
            <ReceiptCode>{receipt.referenceCode}</ReceiptCode>
            <Muted>Keep this receipt if you need to follow up. You can also find it in Your reports.</Muted>
          </Receipt>
        )}
        <Workspace>
          <SupportReportComposer client={client} onSubmitted={submitted} initialContext={initialContext} />
          <SupportIssueHistory
            issues={issues}
            loading={historyLoading}
            loadingMore={historyLoadingMore}
            hasMore={historyPage < historyTotalPages}
            error={historyError}
            client={client}
            onRetry={() => void loadHistory(historyRetry.page, historyRetry.append)}
            onLoadMore={() => void loadHistory(historyPage + 1, true)}
          />
        </Workspace>
      </Shell>
    </Page>
  );
};

export default SupportReportRoomPage;
