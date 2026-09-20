/*
 * StatusBoard — R2/R3 surface.
 *
 * The load-bearing rule (T-W3): when the store reports damage, the affected
 * instrument renders a REFUSAL naming the file. It must never render 0, because
 * "0 videos" and "we could not read state.json" are different facts and the
 * operator acts differently on each (05-contracts.md §3 data-truth map).
 *
 * Tokens are consumed as var(--token, #fallback) per design.md §4 line 46.
 */

import type { ReactElement } from 'react';
import styled from 'styled-components';
import type { StatusState } from '../hooks/useStatus';
import { healthText } from './healthText';

const Panel = styled.section`
  background: var(--carbon, #141419);
  border: 1px solid var(--border-electric, rgba(96, 192, 240, 0.2));
  border-radius: var(--radius-card, 20px);
  padding: var(--space-5, 24px);
  color: var(--text-primary, #e0ecf4);
  font-family: var(--font-ui, system-ui, sans-serif);
`;

const PanelHead = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4, 16px);
  margin-bottom: var(--space-4, 16px);
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.01em;
`;

const Meta = styled.span`
  font-family: var(--font-data, monospace);
  font-size: 12px;
  color: var(--text-faint, rgba(224, 236, 244, 0.38));
`;

const Banner = styled.div<{ $tone: 'danger' | 'warn' }>`
  display: flex;
  gap: var(--space-3, 12px);
  align-items: flex-start;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  margin-bottom: var(--space-4, 16px);
  border-radius: var(--radius-control, 12px);
  border: 1px solid
    ${(p) => (p.$tone === 'danger' ? 'var(--danger, #e5484d)' : 'var(--border-gold, rgba(198, 168, 75, 0.3))')};
  background: ${(p) => (p.$tone === 'danger' ? 'rgba(229, 72, 77, 0.1)' : 'rgba(198, 168, 75, 0.1)')};
  font-size: 14px;
  line-height: 1.5;
`;

const BannerFile = styled.code`
  font-family: var(--font-data, monospace);
  color: var(--warn, #c6a84b);
`;

const Grid = styled.dl`
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(160px, 2fr);
  gap: var(--space-2, 8px) var(--space-4, 16px);
  margin: 0;
`;

const Label = styled.dt`
  font-size: 13px;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

const Value = styled.dd<{ $refused?: boolean }>`
  margin: 0;
  font-family: var(--font-data, monospace);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  color: ${(p) => (p.$refused ? 'var(--warn, #c6a84b)' : 'var(--text-primary, #e0ecf4)')};
`;

const Refused = styled.span`
  color: var(--warn, #c6a84b);
`;

const Empty = styled.p`
  margin: 0;
  font-family: var(--font-drama, Georgia, serif);
  font-style: italic;
  font-size: 18px;
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
`;

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function Refusal({ file, testid = 'refused-value' }: { file: string; testid?: string }): ReactElement {
  return (
    <Value $refused data-testid={testid}>
      <Refused>refused — {file} unreadable</Refused>
    </Value>
  );
}

export interface StatusBoardProps {
  state: StatusState;
}

export function StatusBoard({ state }: StatusBoardProps): ReactElement {
  const { phase, status, error, initial } = state;

  if (initial && phase === 'loading') {
    return (
      <Panel aria-busy="true" data-testid="status-board">
        <PanelHead>
          <PanelTitle>Status</PanelTitle>
        </PanelHead>
        <Empty>Reading the store…</Empty>
      </Panel>
    );
  }

  if (!status) {
    return (
      <Panel data-testid="status-board">
        <PanelHead>
          <PanelTitle>Status</PanelTitle>
        </PanelHead>
        <Banner $tone="danger" role="alert" data-testid="refusal-banner">
          <span>
            No instrument can be shown — the bridge did not answer, or answered with a payload this
            console cannot read. {error?.code ?? 'UNKNOWN'}: {error?.message ?? 'unknown error'}
          </span>
        </Banner>
      </Panel>
    );
  }

  const creatorsDamaged = status.creators.damaged;
  const stateDamaged = status.state.damaged;
  const videos = status.state.videos;

  return (
    <Panel data-testid="status-board">
      <PanelHead>
        <PanelTitle>Status</PanelTitle>
        <Meta>
          {phase === 'error' ? `last poll failed (${error?.code}) — showing previous reading` : 'live'}
        </Meta>
      </PanelHead>

      {creatorsDamaged && (
        <Banner $tone="danger" role="alert" data-testid="refusal-banner">
          <span>
            <strong>Creator roster unavailable.</strong> The engine refused to read{' '}
            <BannerFile>{creatorsDamaged.file}</BannerFile> — {creatorsDamaged.detail}. Counts are withheld rather
            than reported as zero.
          </span>
        </Banner>
      )}

      {stateDamaged && (
        <Banner $tone="warn" role="alert" data-testid="refusal-banner">
          <span>
            <strong>Coverage unknown.</strong> The engine refused to read <BannerFile>{stateDamaged.file}</BannerFile>{' '}
            — {stateDamaged.detail}. Per-creator counts are withheld rather than reported as zero.
          </span>
        </Banner>
      )}

      <Grid>
        <Label>yt-dlp</Label>
        <Value data-testid="ytdlp-health">{healthText(status.ytdlp)}</Value>

        <Label>Creators</Label>
        {creatorsDamaged ? (
          <Refusal file={creatorsDamaged.file} />
        ) : (
          <Value>
            {status.creators.enabled} enabled of {status.creators.total}
          </Value>
        )}

        <Label>Video coverage</Label>
        {stateDamaged || !videos ? (
          <Refusal file={stateDamaged?.file ?? 'state.json'} />
        ) : (
          <Value>
            {videos.fetched} of {videos.total} ({pct(videos.coverage)})
          </Value>
        )}

        <Label>Budget</Label>
        <Value>
          {status.budget.used} / {status.budget.perHour} {status.budget.unit} this hour
        </Value>

        <Label>Backlog</Label>
        <Value>
          {status.backlog.lines.length > 0 ? status.backlog.lines.join(' · ') : 'no backlog reported'}
        </Value>

        <Label>Throttle</Label>
        <Value $refused={status.throttle.active}>
          {status.throttle.text}
          {status.throttle.until ? ` · until ${status.throttle.until}` : ''}
        </Value>

        <Label>Census</Label>
        {status.census.error ? (
          // S1-H2: `census.error` means the sweep FAILED. Rendering inFlight/everSwept
          // here would print "0 in flight · 0 swept" — a fabricated measurement, which
          // is the exact failure R3 exists to prevent. The counts are absent, not zero.
          <Value $refused data-testid="refused-census">
            <Refused>refused — the sweep failed: {status.census.error}</Refused>
          </Value>
        ) : (
          <Value>
            {status.census.inFlight.length} in flight · {status.census.everSwept} swept
            {status.census.discarded ? ' · discarded' : ''}
          </Value>
        )}

        <Label>Run lock</Label>
        <Value $refused={status.lock.held}>
          {status.lock.held ? `held by pid ${status.lock.pid ?? '?'}${status.lock.alive === false ? ' (dead)' : ''}` : 'free'}
        </Value>

        <Label>Last run</Label>
        <Value>{status.lastRun ? `${status.lastRun.status} · ${status.lastRun.runId ?? 'no id'}` : 'none recorded'}</Value>

        <Label>Last good</Label>
        <Value>
          {status.lastGood ? `${status.lastGood.at} (${status.lastGood.staleDays}d old)` : 'none recorded'}
        </Value>

        <Label>Documents</Label>
        {stateDamaged ? (
          // S1-H3: status.mjs emits `documents: 0` when state.json is unreadable
          // (`stateDamaged ? 0 : listDocs(r).length`). That 0 is a guard, not a
          // count, so rendering it would claim "you have no documents" during a
          // store fault. Split from publishedBrains — which does not depend on
          // state.json at all, so it stays real here and carries its OWN refusal
          // below when the brains store is what is damaged (R3-02).
          <Refusal file={stateDamaged.file} testid="refused-documents" />
        ) : (
          <Value>{status.documents}</Value>
        )}

        <Label>Published brains</Label>
        {status.publishedBrains === null ? (
          // R3-02: the count comes from the contained enumerator and is `null`
          // when it refused. Withholding it is the honest answer — `0` would
          // claim the store publishes nothing, which is a different fact.
          <Refusal
            file={status.publishedBrainsDamaged?.file ?? 'current.json'}
            testid="refused-published-brains"
          />
        ) : (
          <Value data-testid="published-brains">{status.publishedBrains}</Value>
        )}

        <Label>Recent runs</Label>
        <Value>
          {status.recentRuns.length > 0
            ? status.recentRuns.map((r) => `${r.runId}:${r.ok ? 'ok' : 'fail'}/${r.fetched}`).join(' · ')
            : 'none recorded'}
        </Value>
      </Grid>
    </Panel>
  );
}
