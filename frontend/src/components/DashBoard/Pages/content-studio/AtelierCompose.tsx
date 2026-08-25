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
import { Wand2, RefreshCw, Lock, Sparkles } from 'lucide-react';
import type { AxiosInstance } from 'axios';
import useAtelierCompose, {
  describeLocalLane, describeHostedLane, laneOfferable, formatCost,
  type Lane, type PromptSource, type LawProfile, type ComposeRequest,
} from './AtelierCompose.api';
import AtelierComposeGrid from './AtelierComposeGrid';
import {
  Panel, Card, CardTitle, CardHint, PrimaryButton, AccentButton, QuietButton, Field, Caption,
  LaneStrip, LaneCell, LaneText, LaneFix, Ladder, Rung, Workspace, TextArea, Select,
  Segment, SegmentButton, RouteRow, Readout, Notice, FieldGroup, FieldLabel,
} from './AtelierCompose.styles';

const ASPECTS = ['16:9', '21:9', '1:1', '9:16', '4:5'];
const INTENTS = [['hero', 'Hero'], ['ambient', 'Ambient'], ['card', 'Card'], ['icon', 'Icon']];

/** Stable per-attempt key so a double-click replays instead of paying twice. */
function newKey() { return `ui-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

const AtelierCompose: React.FC<{ api: AxiosInstance | null }> = ({ api }) => {
  const c = useAtelierCompose(api);
  const [text, setText] = useState('');
  const [intent, setIntent] = useState('hero');
  const [aspect, setAspect] = useState('16:9');
  const [source, setSource] = useState<PromptSource>('brief');
  const [lane, setLane] = useState<Lane>('auto');
  const [lawProfile, setLawProfile] = useState<LawProfile>('full');
  const [count, setCount] = useState(4);
  const [selected, setSelected] = useState<number | null>(null);
  const keyRef = useRef<string>(newKey());

  useEffect(() => { c.loadLimits(); }, [c.loadLimits]);

  const local = describeLocalLane(c.limits?.lanes.local ?? null);
  const hosted = describeHostedLane(c.limits?.lanes.hosted ?? null);
  const tasteAllowed = c.limits?.lanes.local.ready === true;
  const canRun = laneOfferable(lane, c.limits) && (source === 'taste' || text.trim().length > 0) && !c.busy;

  const req = useMemo<ComposeRequest>(() => ({
    brief: { text: text.trim(), intent, aspect }, promptSource: source, lane, count, aspect, lawProfile,
  }), [text, intent, aspect, source, lane, count, lawProfile]);

  // Price before the button is live. Debounced so typing does not hammer the server.
  useEffect(() => {
    if (!c.limits || !laneOfferable(lane, c.limits)) return undefined;
    if (source === 'brief' && !text.trim()) return undefined;
    const t = setTimeout(() => { c.runEstimate(req); }, 400);
    return () => clearTimeout(t);
  }, [req, c.limits, c.runEstimate, lane, source, text]);

  // A new brief is a new attempt; the key must change or the server replays the old grid.
  useEffect(() => { keyRef.current = newKey(); setSelected(null); }, [text, intent, aspect, source, lane, count, lawProfile]);

  const generate = async () => {
    const r = await c.compose(req, keyRef.current);
    if (r) setSelected(null);
  };

  const ladder = c.result ? 'still' : 'brief';

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
        <Rung $state={ladder === 'still' ? 'current' : 'locked'}>Still</Rung>
        <Rung $state="locked">Motion</Rung>
        <Rung $state="locked">Publish</Rung>
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
            <AccentButton type="button" disabled title="Motion lands with the asset store — approving a still must bind its exact hash (SWA-207)">
              <Lock size={14} aria-hidden /> Approve → Motion
            </AccentButton>
          </div>
          <Caption>Motion is locked on purpose: an "animate this" that re-prompted from text would not animate the frame you approved.</Caption>

          {c.result && <AtelierComposeGrid result={c.result} aspect={aspect} selectedIndex={selected} onSelect={setSelected} />}
          {c.result?.admission && <Caption>GPU admitted with {c.result.admission.freeMb} MiB free (needs {c.result.admission.neededMb}).</Caption>}
          {c.limits && <Caption>{c.limits.note}</Caption>}
          {c.busy && <Caption role="status">Rendering on the {lane === 'hosted' ? 'hosted lane' : '5090'} — one batch at a time.</Caption>}
        </div>
      </Workspace>
    </Panel>
  );
};

export default AtelierCompose;
