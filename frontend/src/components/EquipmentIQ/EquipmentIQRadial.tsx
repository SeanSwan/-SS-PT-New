/**
 * EquipmentIQRadial — pure SVG pattern-web renderer (Slice S8)
 * ============================================================
 * BLUEPRINT: docs/ai-workflow/AI-HANDOFF/EQUIPMENT-INTELLIGENCE-OVERHAUL-BLUEPRINT-2026-08-04.md §10a #4
 *
 * Renders whatever patterns the API returns (7 OR 8), evenly spaced — layout
 * math lives in equipmentIQGeometry.ts so it stays unit-testable. Coverage
 * fills each spoke in an Ice Wing gradient; the WEAKEST spoke (server-declared
 * `weakestPattern`) renders in Gilded Fern so the eye lands on the gap — its
 * guide spoke goes gold-dashed even at zero coverage. Overall % sits in Frost
 * White at the web's center. Below 768px the web collapses (CSS) to a
 * horizontal segmented arc gauge — same data, same colors. Draw-in animation
 * is a one-shot stroke-dash sweep, disabled under prefers-reduced-motion via
 * the styled-components media query (no JS branching needed).
 */
import React, { useId } from 'react';
import {
  computeArcGauge,
  computeSpokePoints,
  coveragePercent,
  polygonPath,
} from './equipmentIQGeometry';
import { ArcWrap, DrawInLine, DrawInStroke, WebWrap } from './EquipmentIQPanel.styles';

export interface RadialPatternInput {
  pattern: string;
  coverage: number;
  itemCount?: number;
}

export interface EquipmentIQRadialProps {
  patterns: RadialPatternInput[];
  overallCoverage: number;
  weakestPattern: string | null;
  /** Square viewBox size for the web; arc gauge reuses it as its width. */
  size?: number;
}

const RING_LEVELS = [0.25, 0.5, 0.75, 1];
const GOLD = 'var(--accent-gold, #c6a84b)';
const FROST = 'var(--text-primary, #e0ecf4)';
const FAINT = 'rgba(224, 236, 244, 0.14)';

const labelFor = (pattern: string): string =>
  pattern.charAt(0).toUpperCase() + pattern.slice(1);

const EquipmentIQRadial: React.FC<EquipmentIQRadialProps> = ({
  patterns,
  overallCoverage,
  weakestPattern,
  size = 320,
}) => {
  const gradientId = useId().replace(/:/g, '');
  const webGradient = `iq-web-${gradientId}`;
  const arcGradient = `iq-arc-${gradientId}`;
  const spokes = computeSpokePoints(patterns, size);
  const gauge = computeArcGauge(patterns, size);
  const percent = coveragePercent(overallCoverage);
  const cx = size / 2;
  const cy = size / 2;
  const webRadius = spokes.length > 0
    ? Math.hypot(spokes[0].outerX - cx, spokes[0].outerY - cy)
    : 0;
  const ariaLabel = `Movement pattern coverage ${percent} percent${
    weakestPattern ? `; weakest pattern ${weakestPattern}` : ''
  }`;

  return (
    <>
      <WebWrap data-testid="iq-web">
        <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size }} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={webGradient} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'var(--accent-data, #50a0f0)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--accent-primary, #60c0f0)' }} />
            </linearGradient>
          </defs>
          {RING_LEVELS.map((level) => (
            <path
              key={level}
              d={polygonPath(cx, cy, webRadius * level, Math.max(3, spokes.length))}
              fill="none"
              stroke={FAINT}
              strokeWidth={level === 1 ? 1.25 : 0.75}
            />
          ))}
          {spokes.map((spoke) => {
            const isWeakest = spoke.pattern === weakestPattern;
            return (
              <g key={spoke.pattern}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={spoke.outerX}
                  y2={spoke.outerY}
                  strokeWidth={isWeakest ? 1.5 : 1}
                  strokeDasharray={isWeakest ? '4 4' : undefined}
                  style={{ stroke: isWeakest ? GOLD : FAINT }}
                  data-role="guide-spoke"
                  data-pattern={spoke.pattern}
                  data-weakest={isWeakest ? 'true' : undefined}
                />
                {spoke.coverage > 0 && (
                  <DrawInLine
                    x1={cx}
                    y1={cy}
                    x2={spoke.tipX}
                    y2={spoke.tipY}
                    pathLength={1}
                    strokeWidth={10}
                    strokeLinecap="round"
                    opacity={0.92}
                    stroke={isWeakest ? undefined : `url(#${webGradient})`}
                    style={isWeakest ? { stroke: GOLD } : undefined}
                    data-role="coverage-spoke"
                    data-pattern={spoke.pattern}
                    data-coverage={spoke.coverage}
                    data-weakest={isWeakest ? 'true' : undefined}
                  />
                )}
                <text
                  x={spoke.labelX}
                  y={spoke.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  style={{ fill: isWeakest ? GOLD : 'rgba(224, 236, 244, 0.78)' }}
                  data-role="spoke-label"
                  data-pattern={spoke.pattern}
                >
                  {labelFor(spoke.pattern)}
                </text>
              </g>
            );
          })}
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize={30} fontWeight={700} style={{ fill: FROST }} data-testid="iq-overall-web">
            {percent}%
          </text>
          <text x={cx} y={cy + 16} textAnchor="middle" fontSize={10} letterSpacing={1.5} style={{ fill: 'rgba(224, 236, 244, 0.6)' }}>
            COVERAGE
          </text>
        </svg>
      </WebWrap>

      <ArcWrap data-testid="iq-arc">
        <svg viewBox={`0 0 ${gauge.width} ${gauge.height}`} width="100%" style={{ maxWidth: gauge.width }} role="img" aria-label={ariaLabel}>
          <defs>
            <linearGradient id={arcGradient} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: 'var(--accent-data, #50a0f0)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--accent-primary, #60c0f0)' }} />
            </linearGradient>
          </defs>
          {gauge.segments.map((segment) => {
            const isWeakest = segment.pattern === weakestPattern;
            return (
              <g key={segment.pattern}>
                <path
                  d={segment.trackPath}
                  fill="none"
                  strokeWidth={10}
                  strokeLinecap="round"
                  strokeDasharray={isWeakest && segment.coverage === 0 ? '3 5' : undefined}
                  style={{ stroke: isWeakest ? 'rgba(198, 168, 75, 0.45)' : FAINT }}
                  data-role="arc-track"
                  data-pattern={segment.pattern}
                  data-weakest={isWeakest ? 'true' : undefined}
                />
                {segment.fillPath && (
                  <DrawInStroke
                    d={segment.fillPath}
                    fill="none"
                    pathLength={1}
                    strokeWidth={10}
                    strokeLinecap="round"
                    stroke={isWeakest ? undefined : `url(#${arcGradient})`}
                    style={isWeakest ? { stroke: GOLD } : undefined}
                    data-role="arc-fill"
                    data-pattern={segment.pattern}
                    data-coverage={segment.coverage}
                    data-weakest={isWeakest ? 'true' : undefined}
                  />
                )}
                <text
                  x={segment.labelX}
                  y={segment.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  style={{ fill: isWeakest ? GOLD : 'rgba(224, 236, 244, 0.7)' }}
                  data-role="arc-label"
                  data-pattern={segment.pattern}
                >
                  {labelFor(segment.pattern)}
                </text>
              </g>
            );
          })}
          <text x={gauge.cx} y={gauge.cy - 6} textAnchor="middle" fontSize={26} fontWeight={700} style={{ fill: FROST }} data-testid="iq-overall-arc">
            {percent}%
          </text>
        </svg>
      </ArcWrap>
    </>
  );
};

export default EquipmentIQRadial;
