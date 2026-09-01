/**
 * ============================================================================
 * FILE: AtelierCompose.tsx
 * PURPOSE: Compose — describe an asset, get four candidates, pick one. The first
 *          surface in the studio that CREATES rather than administers.
 * ============================================================================
 *
 * HONESTY RULES (pinned by AtelierCompose.honesty.test.ts):
 *   1. Lane state comes from GET /limits and is shown BEFORE any control. The local
 *      lane ships `claimed` until an operator probes it; it is labelled "unproven"
 *      with the exact switch, in gold — unfinished, not broken.
 *   2. A lane the server will refuse is never offered as if it will run. `auto`
 *      is offerable only when at least one lane is.
 *   3. Price shows BEFORE the button is live. Estimate re-runs on every change.
 *   4. "Approve → Motion" is visibly present and visibly locked: the asset store
 *      it must bind to does not exist yet (SWA-207). A button that re-prompted
 *      from text would be the broken promise the blueprint names.
 *
 * Taste prompts render locally only — the backend refuses taste+hosted, and the
 * UI disables the pairing so the refusal is never the first thing Sean sees.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Wand2, RefreshCw, Lock, Sparkles, Clapperboard } from 'lucide-react';
import type { AxiosInstance } from 'axios';
import type { MotionTarget, ReusedFrame } from './AtelierCompose.types';
import ReusedFrameNotice from './AtelierReusedFrameNotice';
import useAtelierCompose, {
  describeLocalLane, describeHostedLane, laneOfferable, formatCost, motionBindable, describeMotionJob, nextPublishStep, describeBatch,
  type Lane, type PromptSource, type LawProfile, type ComposeRequest,
} from './AtelierCompose.api';
import AtelierComposeGrid from './AtelierComposeGrid';
import AtelierPublishPanel from './AtelierPublishPanel';
import {
  Panel, Card, CardTitle, CardHint, PrimaryButton, AccentButton, QuietButton, Field, Caption,
  LaneStrip, LaneCell, LaneText, LaneFix, Ladder, Rung, Workspace, TextArea, Select,
  Segment, SegmentButton, RouteRow, Readout, Notice, FieldGroup, FieldLabel,
} from './AtelierCompose.styles';

const ASPECTS = ['16:9', '21:9', '1:1', '9:16', '4:5'];
const INTENTS = [['hero', 'Hero'], ['ambient', 'Ambient'], ['card', 'Card'], ['icon', 'Icon']];

/** Stable per-attempt key so a double-click replays instead of paying twice. */
function newKey() { return `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

const AtelierCompose: React.FC<{
  api: AxiosInstance | null;
  /** A frame carried in from the Assets library. Compose owns the Motion rung, so reusing
   *  a past render means arriving here with it already selected — otherwise the library is
   *  a wall of pictures you can look at and do nothing with. */
  incoming?: ReusedFrame | null;
  /** Called once the frame has been taken. The handoff is a DELIVERY, not a standing
   *  value: without this the hub keeps handing the same asset over, and since Compose
   *  remounts on every tab switch, merely visiting the tab would silently re-adopt an
   *  old frame the operator had already moved on from. */
  onAdopted?: () => void;
}> = ({ api, incoming, onAdopted }) => {
  const c = useAtelierCompose(api);
  const [text, setText] = useState('');
  const [intent, setIntent] = useState('hero');
  const [aspect, setAspect] = useState('16:9');
  const [source, setSource] = useState<PromptSource>('brief');
  const [lane, setLane] = useState<Lane>('auto');
  const [lawProfile, setLawProfile] = useState<LawProfile>('full');
  // Empty means "whatever the server defaults to" until /limits answers; picking a kit is
  // what makes this studio usable for a site that is not SwanStudios.
  const [brandKit, setBrandKit] = useState<string>('');
  const [count, setCount] = useState(4);
  const [selected, setSelected] = useState<number | null>(null);
  // A frame adopted from the library, held separately from the batch because it is not IN
  // the batch. Kept as its own state rather than faked into `c.result.stills`: an object
  // pretending to be a freshly-composed still would carry an invented seed, provider and
  // image that nothing rendered.
  const [adopted, setAdopted] = useState<ReusedFrame | null>(null);
  const keyRef = useRef<string>(newKey());

  useEffect(() => { c.loadLimits(); }, [c.loadLimits]);

  const local = describeLocalLane(c.limits?.lanes.local ?? null);
  const hosted = describeHostedLane(c.limits?.lanes.hosted ?? null);
  const tasteAllowed = c.limits?.lanes.local.ready === true;
  const canRun = laneOfferable(lane, c.limits) && (source === 'taste' || text.trim().length > 0) && !c.busy && !(c.batch && !c.batch.terminal);

  const req = useMemo<ComposeRequest>(() => ({
    brief: { text: text.trim(), intent, aspect }, promptSource: source, lane, count, aspect, lawProfile,
    ...(brandKit ? { brandKit } : {}),
  }), [text, intent, aspect, source, lane, count, lawProfile, brandKit]);

  // Price before the button is live. Debounced so typing does not hammer the server.
  useEffect(() => {
    if (!c.limits || !laneOfferable(lane, c.limits)) return undefined;
    if (source === 'brief' && !text.trim()) return undefined;
    const t = setTimeout(() => { c.runEstimate(req); }, 400);
    return () => clearTimeout(t);
  }, [req, c.limits, c.runEstimate, lane, source, text]);

  // A new brief is a new attempt; the key must change or the server replays the old grid.
  useEffect(() => { keyRef.current = newKey(); setSelected(null); }, [text, intent, aspect, source, lane, count, lawProfile, brandKit]);

  const generate = async () => {
    const r = await c.compose(req, keyRef.current);
    if (r) setSelected(null);
  };

  const selectedStill = selected === null ? null : (c.result?.stills.find((s) => s.index === selected) ?? null);
  // ADOPT WHAT ARRIVES; a NEW BATCH RETIRES IT. Two halves of one rule — without the
  // second, rendering four fresh candidates leaves Motion pointing at the picture you
  // walked in with, under a button reading "Approve → Motion" over frames it was not
  // bound to. `onAdopted` takes the frame off the hub's hands: a delivery, not a standing
  // value, or every visit to this tab would silently re-adopt it.
  useEffect(() => {
    if (!incoming) return;
    setAdopted(incoming); setSelected(null); onAdopted?.();
  }, [incoming, onAdopted]);
  useEffect(() => { if (c.result) setAdopted(null); }, [c.result]);

  // The bind target is the batch selection when there is one, else the frame carried in.
  const bindTarget: MotionTarget | null = selectedStill ?? adopted;
  const bind = motionBindable(bindTarget);
  const mj = describeMotionJob(c.motionJob);
  const motionActive = !!c.motionJob && !['ready', 'failed', 'cancelled'].includes(c.motionJob.status);
  const published = c.reference?.status === 'published';
  const ladder = published ? 'publish' : c.motionJob ? 'motion' : c.result ? 'still' : 'brief';

  // The selected still's asset record drives the Publish panel. Re-read on selection.
  useEffect(() => {
    if (bindTarget?.assetId) { c.loadReference(bindTarget.assetId); } else { c.setReference(null); }
  }, [bindTarget?.assetId, c.loadReference, c.setReference]);


  // Poll a local batch every 3s until terminal; the hook promotes the snapshot into `result`.
  const batchActive = !!c.batch && !c.batch.terminal;
  useEffect(() => {
    if (!batchActive) return undefined;
    const t = setInterval(() => { c.pollBatch(); }, 3000);
    return () => clearInterval(t);
  }, [batchActive, c.pollBatch]);
  const bd = describeBatch(c.batch);

  // Poll the queued Motion job on the endpoint the Render Queue already uses; stop on a terminal state.
  useEffect(() => {
    if (!motionActive) return undefined;
    const t = setInterval(() => { c.pollMotion(); }, 4000);
    return () => clearInterval(t);
  }, [motionActive, c.pollMotion]);

  return (
    <Panel aria-label="Atelier Compose">
      <LaneStrip aria-label="Lane state">
        <LaneCell $tone={local.tone}>
          <LaneText $tone={local.tone}>{local.text}</LaneText>
          {local.fix && <LaneFix>{local.fix}</LaneFix>}
        </LaneCell>
        <LaneCell $tone={hosted.tone}>
          <LaneText $tone={hosted.tone}>{hosted.text}</LaneText>
          {hosted.fix && <LaneFix>{hosted.fix}</LaneFix>}
        </LaneCell>
      </LaneStrip>

      <Ladder aria-label="Compose ladder">
        <Rung $state={ladder === 'brief' ? 'current' : 'done'}>Brief</Rung>
        <Rung $state={ladder === 'still' ? 'current' : ladder === 'motion' ? 'done' : 'locked'}>Still</Rung>
        <Rung $state={ladder === 'motion' ? 'current' : ladder === 'publish' ? 'done' : 'locked'}>Motion</Rung>
        <Rung $state={ladder === 'publish' ? 'current' : 'locked'}>Publish</Rung>
      </Ladder>

      <Workspace>
        <Card $accent="ice">
          <CardTitle><Wand2 size={16} aria-hidden /> Brief</CardTitle>
          <CardHint>Describe the asset. The compiler adds Swan's slots and laws; the taste brain draws from your rated corpus instead.</CardHint>

          <FieldGroup>
            <FieldLabel id="compose-source-label">Source</FieldLabel>
            <Segment role="group" aria-labelledby="compose-source-label">
              <SegmentButton type="button" $on={source === 'brief'} onClick={() => setSource('brief')}>Brief</SegmentButton>
              <SegmentButton type="button" $on={source === 'taste'} disabled={!tasteAllowed}
                title={tasteAllowed ? 'Draw prompts from the Swan taste brain (local only)' : 'Taste prompts render locally only — the local lane is not ready'}
                onClick={() => { setSource('taste'); setLane('local'); }}>
                <Sparkles size={14} aria-hidden /> Taste brain
              </SegmentButton>
            </Segment>
            {!tasteAllowed && <Caption>Taste-brain prompts render on the local GPU only; that lane is not ready yet, so this stays off.</Caption>}
          </FieldGroup>

          {source === 'brief' && (
            <Field>Describe it
              <TextArea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000}
                placeholder="a glacier wall calving into black water at dawn, long lens, cold light" />
            </Field>
          )}

          {/* Which site this render is for. Only shown once the server has told us which
              kits exist — a picker listing options the server would refuse is the honesty
              rule this surface is built on. */}
          {(c.limits?.brandKits?.length ?? 0) > 0 && (
            <Field>Brand
              <Select value={brandKit} onChange={(e) => setBrandKit(e.target.value)} aria-label="Brand kit">
                {c.limits!.brandKits.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}{k.isDefault ? ' (default)' : ''}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field>Intent
            <Select value={intent} onChange={(e) => setIntent(e.target.value)}>
              {INTENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </Field>
          <Field>Aspect
            <Select value={aspect} onChange={(e) => setAspect(e.target.value)}>
              {ASPECTS.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field>Candidates
            <Select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>

          <FieldGroup>
            <FieldLabel id="compose-law-label">Laws</FieldLabel>
            <Segment role="group" aria-labelledby="compose-law-label">
              <SegmentButton type="button" $on={lawProfile === 'full'} onClick={() => setLawProfile('full')}
                title="Every law, including Swan brand taste (no literal creatures, gold allowlist)">Swan brand</SegmentButton>
              <SegmentButton type="button" $on={lawProfile === 'universal'} onClick={() => setLawProfile('universal')}
                title="House rules only — keeps the anti-slop kill-list, retired palette and content law; drops the two Swan-brand taste laws">Universal</SegmentButton>
            </Segment>
            <Caption>{lawProfile === 'universal'
              ? 'Wildlife and gold allowed. Kill-list, palette and content laws still apply.'
              : 'Swan brand: the swan is optics, never a bird.'}</Caption>
          </FieldGroup>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <RouteRow aria-label="Route and price">
            <Segment role="group" aria-label="Lane">
              {(['auto', 'local', 'hosted'] as Lane[]).map((l) => (
                <SegmentButton key={l} type="button" $on={lane === l}
                  disabled={!laneOfferable(l, c.limits) || (source === 'taste' && l === 'hosted')}
                  onClick={() => setLane(l)}>{l}</SegmentButton>
              ))}
            </Segment>
            <Readout>{c.estimate ? `${formatCost(c.estimate.cost)} · lane ${c.estimate.lane}` : 'price appears when a lane is ready'}</Readout>
            <QuietButton type="button" onClick={() => c.loadLimits()} aria-label="Refresh lane state"><RefreshCw size={14} aria-hidden /> Refresh</QuietButton>
          </RouteRow>

          {c.refusal && (
            <Notice $tone={c.refusal.code === 'E_STILL_LANE_UNPROBED' || c.refusal.code === 'E_NO_LANE' ? 'unproven' : 'off'} role="status">
              <strong>{c.refusal.code}</strong> — {c.refusal.message}
              {c.refusal.retryAfterSec ? ` Try again in ~${c.refusal.retryAfterSec}s.` : ''}
            </Notice>
          )}
          {!c.limits && !c.refusal && <Caption>Reading lane state…</Caption>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <PrimaryButton type="button" disabled={!canRun} onClick={generate}>
              {c.busy ? 'Rendering…' : `Generate ${count} candidate${count === 1 ? '' : 's'}`}
            </PrimaryButton>
            <AccentButton type="button" disabled={!bind.ok || motionActive}
              onClick={() => { if (bindTarget) c.startMotion(bindTarget); }}
              title={bind.ok ? 'Animate the approved frame, bound by its hash' : bind.why}>
              {bind.ok ? <Clapperboard size={14} aria-hidden /> : <Lock size={14} aria-hidden />} Approve → Motion
            </AccentButton>
          </div>
          <Caption>{bind.ok
            ? `Motion binds to asset ${bindTarget?.assetId?.slice(0, 8)} · sha ${bindTarget?.sha256?.slice(0, 12)} — the agent re-hashes the bytes before the graph sees them.`
            : bind.why}</Caption>
          {c.motionJob && (
            <Notice $tone={mj.tone === 'blocked' ? 'unproven' : mj.tone === 'failed' ? 'off' : 'ready'} role="status" aria-live="polite">
              <strong>Motion job {c.motionJob.jobId.slice(0, 8)}</strong> — {mj.text}
              {c.motion?.attribution ? ` · ${c.motion.attribution}` : ''}
            </Notice>
          )}

          {c.batch && !c.batch.terminal && (
            <Notice $tone="ready" role="status" aria-live="polite">{bd.text} — this page can be left; the batch keeps rendering.</Notice>
          )}
          {c.batch?.terminal && c.batch.status === 'failed' && c.batch.error && (
            <Notice $tone="off" role="status">Batch failed · {c.batch.error.code} — {c.batch.error.message}</Notice>
          )}
          {adopted && !c.result && <ReusedFrameNotice frame={adopted} />}
          {c.result && <AtelierComposeGrid result={c.result} aspect={aspect} selectedIndex={selected} onSelect={setSelected} />}

          <AtelierPublishPanel c={c} />
          {c.result?.admission && <Caption>GPU admitted with {c.result.admission.freeMb} MiB free (needs {c.result.admission.neededMb}).</Caption>}
          {/* A ledger that cannot be read or written REFUSES the billed lane, which is
              too consequential to whisper in a caption alongside the day's run count. */}
          {c.limits && (c.limits.ledger === 'file'
            ? <Caption>{c.limits.note}</Caption>
            : <Notice $tone="off" role="status">{c.limits.note}</Notice>)}
          {c.busy && <Caption role="status">Rendering on the {lane === 'hosted' ? 'hosted lane' : '5090'} — one batch at a time.</Caption>}
        </div>
      </Workspace>
    </Panel>
  );
};

export default AtelierCompose;
