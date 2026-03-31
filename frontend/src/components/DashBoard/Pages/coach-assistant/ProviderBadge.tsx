/**
 * ┌─── SUB-COMPONENT: ProviderBadge ──────────────────────────┐
 * │ PARENT: CoachMessage                                        │
 * │ PURPOSE: Shows which AI model responded (Gemini/Qwen/etc)  │
 * │ Props: { provider, model }                                  │
 * │ CLICK-OUTCOMES: None (display only)                         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { Cpu } from 'lucide-react';

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
    // Check exact match first
    if (MODEL_LABELS[model]) return MODEL_LABELS[model];
    // Check partial match
    for (const [key, label] of Object.entries(MODEL_LABELS)) {
      if (model.includes(key)) return label;
    }
    // Extract meaningful name from model string
    const parts = model.split('/');
    const modelName = parts[parts.length - 1];
    return modelName.split(':')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  return provider || '';
}

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
      <Cpu size={10} />
      {label}
    </BadgeWrap>
  );
});

ProviderBadge.displayName = 'ProviderBadge';

export default ProviderBadge;
