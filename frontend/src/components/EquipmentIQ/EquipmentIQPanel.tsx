/**
 * EquipmentIQPanel — Equipment IQ radial panel (Slice S8)
 * =======================================================
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/EQUIPMENT-INTELLIGENCE-OVERHAUL-BLUEPRINT-2026-08-04.md §10a #4
 *
 * The full-width Equipment IQ hero band: pattern-web radial (mobile: arc
 * gauge) fed by the S6 gap-report API via useEquipmentGapReport, plus ONE
 * rotating Coach insight strip below it — "{addition} unlocks {patterns}"
 * (Gilded Fern) with an Ice Wing [Ask ->] CTA that calls onAskCoach when
 * provided (hidden otherwise). Rotation cycles suggestions every 6s and goes
 * static under prefers-reduced-motion. States: idle (profileId null — no
 * fetch), hairline loading (no spinners), error + retry, and the empty
 * dashed-heptagon "Scan your space to light this up." No emoji — lucide only.
 *
 * Standalone: page integration happens in a later slice.
 */
import React, { useEffect, useState } from 'react';
import { ArrowRight, Hexagon, Sparkles } from 'lucide-react';
import EquipmentIQRadial from './EquipmentIQRadial';
import { polygonPath } from './equipmentIQGeometry';
import { useEquipmentGapReport } from './useEquipmentGapReport';
import {
  AskButton,
  HairlineFill,
  HairlineTrack,
  InsightStrip,
  PanelHeader,
  PanelRoot,
  RetryButton,
  StateWrap,
  StripText,
  UnlockText,
} from './EquipmentIQPanel.styles';

export interface EquipmentIQPanelProps {
  profileId: number | null;
  onAskCoach?: (suggestion: string) => void;
}

const INSIGHT_ROTATE_MS = 6000;
const EMPTY_HEPTAGON_SIDES = 7;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const formatPatternList = (patterns: string[]): string => patterns.join(', ');

const EquipmentIQPanel: React.FC<EquipmentIQPanelProps> = ({
  profileId,
  onAskCoach,
}) => {
  const { report, loading, error, refetch } = useEquipmentGapReport(profileId);
  const [insightIndex, setInsightIndex] = useState(0);
  const suggestions = report?.suggestions ?? [];

  // A fresh report restarts the rotation from its first suggestion.
  useEffect(() => {
    setInsightIndex(0);
  }, [report]);

  // 6s rotation through suggestions; static under prefers-reduced-motion.
  useEffect(() => {
    if (suggestions.length < 2 || prefersReducedMotion()) return undefined;
    const timer = window.setInterval(
      () => setInsightIndex((index) => (index + 1) % suggestions.length),
      INSIGHT_ROTATE_MS,
    );
    return () => window.clearInterval(timer);
  }, [suggestions.length]);

  const isEmpty =
    report != null && report.patterns.every((entry) => entry.itemCount === 0);
  const activeSuggestion =
    suggestions.length > 0 ? suggestions[insightIndex % suggestions.length] : null;

  return (
    <PanelRoot aria-label="Equipment IQ">
      <PanelHeader>
        <Hexagon size={18} aria-hidden />
        <h3>Equipment IQ</h3>
      </PanelHeader>

      {profileId == null ? (
        <StateWrap data-testid="iq-idle">
          <span>Choose a training location to see its Equipment IQ.</span>
        </StateWrap>
      ) : loading ? (
        <StateWrap data-testid="iq-loading">
          <span>Mapping your movement coverage&hellip;</span>
          <HairlineTrack>
            <HairlineFill />
          </HairlineTrack>
        </StateWrap>
      ) : error ? (
        <StateWrap data-testid="iq-error" role="status">
          <span>{error}</span>
          <RetryButton type="button" onClick={refetch}>
            Try again
          </RetryButton>
        </StateWrap>
      ) : isEmpty ? (
        <StateWrap data-testid="iq-empty">
          <svg viewBox="0 0 160 160" width={160} height={160} aria-hidden>
            <path
              d={polygonPath(80, 80, 62, EMPTY_HEPTAGON_SIDES)}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="6 6"
              style={{ stroke: 'rgba(96, 192, 240, 0.32)' }}
            />
          </svg>
          <span>Scan your space to light this up.</span>
        </StateWrap>
      ) : report ? (
        <>
          <EquipmentIQRadial
            patterns={report.patterns}
            overallCoverage={report.overallCoverage}
            weakestPattern={report.weakestPattern}
          />
          {activeSuggestion && (
            <InsightStrip data-testid="iq-insight-strip">
              <Sparkles size={18} aria-hidden />
              <StripText key={insightIndex} data-testid="iq-insight-text">
                <UnlockText>{activeSuggestion.addition}</UnlockText>
                {' unlocks '}
                <UnlockText>
                  {formatPatternList(activeSuggestion.unlocksPatterns)}
                </UnlockText>
              </StripText>
              {onAskCoach && (
                <AskButton
                  type="button"
                  onClick={() => onAskCoach(activeSuggestion.addition)}
                >
                  Ask
                  <ArrowRight size={16} aria-hidden />
                </AskButton>
              )}
            </InsightStrip>
          )}
        </>
      ) : null}
    </PanelRoot>
  );
};

export default EquipmentIQPanel;
