/**
 * ┌─── SUB-COMPONENT: ProviderBadge ──────────────────────────┐
 * │ PARENT: CoachMessage                                        │
 * │ PURPOSE: Shows which AI model responded (Gemini/Qwen/etc)  │
 * │ Props: { provider, model }                                  │
 * │ CLICK-OUTCOMES: None (display only)                         │
 * │ AI VILLAGE VALIDATED: 2026-03-31                            │
 * │ DESIGN CONSENSUS: 4-point astral spark SVG icon             │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Model Display Names
// ─────────────────────────────────────────────────────────────
const MODEL_LABELS: Record<string, string> = {
  'gemini-2.5-flash': 'Gemini Flash',
  'gemini-3.1-pro': 'Gemini Pro',
  'qwen3.6-plus': 'Qwen 3.6',
  'qwen3.6-plus-preview': 'Qwen 3.6',
  'deepseek-v3.2': 'DeepSeek V3',
};

function getDisplayLabel(provider?: string, model?: string): string {
  if (!model && !provider) return '';
  if (model) {
    if (MODEL_LABELS[model]) return MODEL_LABELS[model];
    for (const [key, label] of Object.entries(MODEL_LABELS)) {
      if (model.includes(key)) return label;
    }
    const parts = model.split('/');
    const modelName = parts[parts.length - 1];
    return modelName.split(':')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return provider || '';
}

// ─────────────────────────────────────────────────────────────
// SECTION: 4-Point Astral Spark SVG (Design Consensus)
// 4 cardinal points with tapered diamond shapes
// ─────────────────────────────────────────────────────────────
const AstralSpark: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* 4-point star: top, right, bottom, left with tapered curves */}
    <path
      d="M8 1C8 1 8.8 5.5 8 8C7.2 5.5 8 1 8 1Z
         M15 8C15 8 10.5 8.8 8 8C10.5 7.2 15 8 15 8Z
         M8 15C8 15 7.2 10.5 8 8C8.8 10.5 8 15 8 15Z
         M1 8C1 8 5.5 7.2 8 8C5.5 8.8 1 8 1 8Z"
      fill="currentColor"
      opacity="0.7"
    />
    {/* Sharp 4-point cross for clarity */}
    <path
      d="M8 0.5L8.6 6.5L8 8L7.4 6.5Z
         M15.5 8L9.5 8.6L8 8L9.5 7.4Z
         M8 15.5L7.4 9.5L8 8L8.6 9.5Z
         M0.5 8L6.5 7.4L8 8L6.5 8.6Z"
      fill="currentColor"
    />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const BadgeWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  white-space: nowrap;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface ProviderBadgeProps {
  provider?: string;
  model?: string;
}

const ProviderBadge: React.FC<ProviderBadgeProps> = memo(({ provider, model }) => {
  const label = useMemo(() => getDisplayLabel(provider, model), [provider, model]);

  if (!label) return null;

  return (
    <BadgeWrap title={model || provider || ''}>
      <AstralSpark size={10} />
      {label}
    </BadgeWrap>
  );
});

ProviderBadge.displayName = 'ProviderBadge';

export default ProviderBadge;
