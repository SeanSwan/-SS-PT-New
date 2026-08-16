/**
 * ============================================================================
 * FILE: CreatorRenderQueue.tsx
 * PURPOSE: Operator console for the render/sync worker queue.
 * ============================================================================
 *
 * THE ZERO STATE IS THE DEFAULT STATE, possibly for weeks — no worker is enrolled until
 * the operator sets one up. So "empty" is not an edge case here, it is the primary design
 * problem, and it must read as *an unfinished setup step with an obvious next action*
 * rather than *a broken product*. Hence: no empty jobs table, a numbered two-step card,
 * and Gilded Fern rather than danger red.
 *
 * THE HONESTY CONTRACT: the endpoint behind this screen once answered
 * `success: true, status: 'waiting'` while rendering nothing. This component must not
 * restate that lie in pixels. Two rules follow:
 *   1. `blocked` is derived from worker presence, never from the status string — a
 *      `queued` job with a capable worker and one nothing can touch are opposite truths.
 *   2. The word "Queued" never appears alone on a blocked job; the reason is the label.
 */

import React, { useMemo, useState } from 'react';
import { Server, PlugZap, Waves, RefreshCw } from 'lucide-react';
import type { AxiosInstance } from 'axios';
import useRenderQueue, { type RenderJobView, type WorkerState } from './CreatorRenderQueue.api';
import CreatorRenderQueueTokenModal from './CreatorRenderQueueTokenModal';
import {
  Panel, FleetStrip, FleetReadout, FleetLabel, Split, Card, CardTitle, CardHint,
  Steps, Step, StepIndex, StepBody, PrimaryButton, QuietButton, Field, Input,
  JobList, JobRow, JobMeta, StatusLabel, PauseGlyph, Dot, Indeterminate,
  GhostRow, GhostBar, Caption, ErrorText, Attribution,
} from './CreatorRenderQueue.styles';

interface Props { api: AxiosInstance | null }

const WORKER_COPY: Record<WorkerState, { label: string; blocked: boolean; hint: string }> = {
  NO_WORKER_ENROLLED: {
    label: 'No render machine connected',
    blocked: true,
    hint: 'Nothing can pick up work until a machine is enrolled and running the agent.',
  },
  NO_WORKER_ONLINE: {
    label: 'Machine enrolled, not checked in',
    blocked: true,
    hint: 'The agent has not reported in for over three minutes. Start it on that machine.',
  },
  NO_WORKER_WITH_CAPABILITY: {
    label: 'No machine can do this job type',
    blocked: true,
    hint: 'A machine is online but does not advertise the capability this job needs.',
  },
  WORKER_ONLINE: {
    label: 'Worker online',
    blocked: false,
    hint: 'Jobs you queue will be picked up within a few seconds.',
  },
};

/**
 * Derived from presence, NOT from the status string — see the honesty contract above.
 * Exported so the honesty rules are TESTABLE rather than asserted in a comment.
 */
/**
 * What must be displayed alongside a finished asset, per the model licence.
 *
 * Pure and exported so the honesty tests can pin it. Returns null rather than a
 * placeholder when there is nothing to show: a fabricated attribution is worse than an
 * absent one, because it asserts a provenance the asset does not have.
 */
export function describeAttribution(job: RenderJobView): { text: string; pending: boolean } | null {
  const text = job.attribution?.trim();
  if (!text) return null;
  // A grant that has not arrived is worth surfacing next to the credit: the asset exists
  // and is attributed, but commercial use of the MODEL is still ungranted.
  const pending = job.provenance?.grantRecorded === false;
  return { text, pending };
}

export function describeJob(job: RenderJobView) {
  if (job.status === 'ready') return { tone: 'ready' as const, text: 'Ready', blocked: false };
  if (job.status === 'failed') {
    return { tone: 'failed' as const, text: job.errorCode ? `Failed · ${job.errorCode}` : 'Failed', blocked: false };
  }
  if (job.status === 'cancelled') return { tone: 'blocked' as const, text: 'Cancelled', blocked: true };
  if (job.status === 'leased') return { tone: 'working' as const, text: 'Claimed by a worker', blocked: false };
  if (job.status === 'rendering') return { tone: 'working' as const, text: 'Rendering', blocked: false };

  // queued — the case where the same word means two opposite things.
  if (job.startable) return { tone: 'working' as const, text: 'Queued · worker available', blocked: false };

  // All THREE blocked states get their own words. An earlier version collapsed
  // NO_WORKER_ENROLLED into "no worker online", which implies a machine exists and is
  // merely switched off — when the truth is none has ever been registered. That is the
  // precise distinction the backend goes to trouble to make, because the operator fix
  // differs: enrol a machine vs start the one you have vs enrol one that can do this job.
  // Flattening it here would have re-introduced, in miniature, the exact vagueness this
  // whole surface exists to remove.
  const why = job.workerState === 'NO_WORKER_WITH_CAPABILITY' ? 'no capable worker'
    : job.workerState === 'NO_WORKER_ENROLLED' ? 'no machine connected'
      : 'worker offline';
  return { tone: 'blocked' as const, text: `Queued · ${why}`, blocked: true };
}

const CreatorRenderQueue: React.FC<Props> = ({ api }) => {
  const q = useRenderQueue(api);
  const [agentId, setAgentId] = useState('');
  const [agentLabel, setAgentLabel] = useState('');
  const [refPath, setRefPath] = useState('');
  const [tgtPath, setTgtPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<{ token: string; agentId: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const worker = q.workerState ? WORKER_COPY[q.workerState] : WORKER_COPY.NO_WORKER_ENROLLED;
  const enrolled = q.workerState !== null && q.workerState !== 'NO_WORKER_ENROLLED';
  const blockedCount = useMemo(
    () => q.jobs.filter((j) => describeJob(j).blocked).length,
    [q.jobs],
  );

  const doEnrol = async () => {
    const id = agentId.trim();
    if (!id || !agentLabel.trim()) return;
    setBusy(true); setNotice(null);
    try {
      const res = await q.enrol(id, agentLabel.trim(), ['ffmpeg', 'mediasync']);
      setReveal({ token: res.token, agentId: res.agent?.id ?? id });
    } catch { /* surfaced via q.error */ } finally { setBusy(false); }
  };

  const doQueue = async () => {
    if (!refPath.trim() || !tgtPath.trim()) return;
    setBusy(true); setNotice(null);
    try {
      const res = await q.queueSync(refPath.trim(), tgtPath.trim());
      setNotice(res.message);
    } catch { /* surfaced via q.error */ } finally { setBusy(false); }
  };

  return (
    <Panel>
      {/* Signature moment: raw backend truth, in monospace, never animated. */}
      <FleetStrip $tone={worker.blocked ? 'blocked' : 'ok'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Server size={18} color={worker.blocked ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)'} aria-hidden />
          <FleetLabel $tone={worker.blocked ? 'blocked' : 'ok'}>{worker.label}</FleetLabel>
        </div>
        <FleetReadout>
          {`STATE ${q.workerState ?? 'NO_WORKER_ENROLLED'}`}
          {blockedCount > 0 && ` · ${blockedCount} JOB${blockedCount === 1 ? '' : 'S'} CANNOT START`}
        </FleetReadout>
      </FleetStrip>

      <Split>
        <div>
          <Card $accent={enrolled ? 'ice' : 'gold'}>
            <CardTitle>Connect a render machine</CardTitle>
            <CardHint>{worker.hint}</CardHint>

            <Steps>
              <Step $state={enrolled ? 'done' : 'current'}>
                <StepIndex $state={enrolled ? 'done' : 'current'}>1</StepIndex>
                <StepBody>
                  <strong>Enrol the machine</strong>
                  <span>Issues a credential shown once. Re-enrolling rotates it.</span>
                </StepBody>
              </Step>
              <Step $state={enrolled ? 'current' : 'locked'}>
                <StepIndex $state={enrolled ? 'current' : 'locked'}>2</StepIndex>
                <StepBody>
                  <strong>Run the agent on that machine</strong>
                  <span>
                    It polls outbound — nothing needs to be exposed on your network.
                  </span>
                </StepBody>
              </Step>
            </Steps>

            <div style={{ marginTop: 22 }}>
              <Field>
                Machine id
                <Input
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="sean-5090"
                  aria-label="Machine id"
                />
              </Field>
              <Field>
                Label
                <Input
                  value={agentLabel}
                  onChange={(e) => setAgentLabel(e.target.value)}
                  placeholder="Desktop 5090"
                  aria-label="Machine label"
                />
              </Field>
              <PrimaryButton
                type="button"
                onClick={doEnrol}
                disabled={busy || !agentId.trim() || !agentLabel.trim()}
              >
                <PlugZap size={16} />
                {enrolled ? 'Enrol another machine' : 'Enrol this machine'}
              </PrimaryButton>
            </div>
          </Card>

          <Card style={{ marginTop: 20 }}>
            <CardTitle>Queue an audio sync</CardTitle>
            <CardHint>
              Paths are on the render machine, not this browser. Large camera files never
              move — only the measured offset comes back.
            </CardHint>
            <Field>
              Camera file
              <Input
                value={refPath}
                onChange={(e) => setRefPath(e.target.value)}
                placeholder="D:/footage/A001.MP4"
                aria-label="Camera file path"
              />
            </Field>
            <Field>
              Microphone file
              <Input
                value={tgtPath}
                onChange={(e) => setTgtPath(e.target.value)}
                placeholder="D:/audio/DJI_01.WAV"
                aria-label="Microphone file path"
              />
            </Field>
            <PrimaryButton
              type="button"
              onClick={doQueue}
              disabled={busy || !refPath.trim() || !tgtPath.trim()}
            >
              <Waves size={16} />
              Queue sync
            </PrimaryButton>
            {notice && <Caption>{notice}</Caption>}
            {q.error && <ErrorText>{q.error}</ErrorText>}
          </Card>
        </div>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <CardTitle style={{ marginBottom: 0 }}>Queue</CardTitle>
            {q.jobs.length > 0 && (
              <QuietButton type="button" onClick={q.refresh} disabled={q.loading}>
                <RefreshCw size={15} />
                Refresh
              </QuietButton>
            )}
          </div>

          {q.jobs.length === 0 ? (
            <>
              {/* Teaches what this becomes without pretending it already is. */}
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[68, 52, 44].map((w) => (
                  <GhostRow key={w} aria-hidden>
                    <GhostBar $w={w} />
                  </GhostRow>
                ))}
              </div>
              <Caption>Jobs you queue will wait here until a worker checks in.</Caption>
            </>
          ) : (
            <JobList style={{ marginTop: 18 }}>
              {q.jobs.map((job) => {
                const d = describeJob(job);
                return (
                  <JobRow key={job.jobId} $blocked={d.blocked}>
                    <JobMeta>
                      <StatusLabel $tone={d.tone}>
                        {d.blocked ? <PauseGlyph aria-hidden /> : <Dot aria-hidden />}
                        {d.text}
                      </StatusLabel>
                      <code>{job.jobId}</code>
                      {job.errorMessage && <code>{job.errorMessage}</code>}
                      {(() => {
                        const a = describeAttribution(job);
                        if (!a) return null;
                        return (
                          <Attribution>
                            {a.text}
                            {a.pending && <span> · commercial licence pending</span>}
                          </Attribution>
                        );
                      })()}
                    </JobMeta>
                    {/* The only motion on this surface, and only where work is proven. */}
                    {job.status === 'rendering' && <Indeterminate aria-hidden />}
                  </JobRow>
                );
              })}
            </JobList>
          )}
        </Card>
      </Split>

      {reveal && (
        <CreatorRenderQueueTokenModal
          token={reveal.token}
          agentId={reveal.agentId}
          onClose={() => setReveal(null)}
        />
      )}
    </Panel>
  );
};

export default CreatorRenderQueue;
