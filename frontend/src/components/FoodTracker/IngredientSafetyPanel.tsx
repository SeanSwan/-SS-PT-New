/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: IngredientSafetyPanel                            ║
 * ║  PURPOSE: Render per-ingredient safety badges for a scanned  ║
 * ║           product — IARC group, EU-banned, GMO flags         ║
 * ║  OWNER: Claude Sonnet 4.6                                    ║
 * ║  CREATED: 2026-04-08 | PHASE: 6.5 Phase 3                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WHAT THIS FILE DOES:
 * Lists all ingredients for a scanned food product. Each ingredient
 * row shows safety indicators (IARC group, EU-banned, GMO). Tapping
 * a flagged ingredient opens IngredientDetailModal for full details.
 *
 * HOW IT FITS IN THE APP:
 *   BarcodeScanner.tsx → IngredientSafetyPanel → IngredientDetailModal
 *
 * DATA SOURCE:
 *   FoodProduct.ingredients — JSON array of IngredientSafety objects
 *   already populated by foodScannerService via FoodIngredient model.
 *
 * LEGAL NOTE:
 *   FDA wellness disclaimer shown at bottom of every render.
 *   IARC ratings use conservative defaults (Group 1 + EU-banned only).
 *   Do NOT upgrade IARC thresholds without legal review.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { ShieldAlert, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import IngredientDetailModal from './IngredientDetailModal';

// ── Types ──────────────────────────────────────────────────────────────────
export interface IngredientSafety {
  id?: number;
  name: string;
  healthRating?: 'good' | 'bad' | 'okay';
  iarcGroup?: '1' | '2A' | '2B' | null;
  isEUBanned?: boolean;
  bannedRegions?: string[];
  isGMO?: boolean;
  isProcessed?: boolean;
  healthConcerns?: string[];
  healthierAlternatives?: string[];
  description?: string;
  researchUrls?: string[];
}

interface IngredientSafetyPanelProps {
  ingredients: IngredientSafety[];
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getSafetyLevel(ing: IngredientSafety): 'danger' | 'caution' | 'safe' {
  if (ing.iarcGroup === '1' || ing.isEUBanned) return 'danger';
  if (ing.iarcGroup === '2A' || ing.iarcGroup === '2B' || ing.isGMO || ing.healthRating === 'bad') return 'caution';
  return 'safe';
}

const SAFETY_COLORS = {
  danger:  { bg: 'rgba(201, 42, 84, 0.15)',  border: '#C92A54', text: '#C92A54' },
  caution: { bg: 'rgba(198, 168, 75, 0.15)', border: '#C6A84B', text: '#C6A84B' },
  safe:    { bg: 'rgba(96, 192, 240, 0.08)', border: 'rgba(96,192,240,0.25)', text: 'rgba(224,236,244,0.55)' },
} as const;

function badgeLabel(ing: IngredientSafety): string | null {
  if (ing.iarcGroup === '1')  return 'IARC-1';
  if (ing.iarcGroup === '2A') return 'IARC-2A';
  if (ing.iarcGroup === '2B') return 'IARC-2B';
  if (ing.isEUBanned)         return 'EU Banned';
  if (ing.isGMO)              return 'GMO';
  return null;
}

const FDA_DISCLAIMER =
  'This information is for general wellness purposes only and is not medical advice. ' +
  'IARC classifications reflect research consensus; individual risk depends on exposure level. ' +
  'Consult a healthcare provider before making dietary changes.';

// ── Component ──────────────────────────────────────────────────────────────
const IngredientSafetyPanel: React.FC<IngredientSafetyPanelProps> = ({ ingredients }) => {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<IngredientSafety | null>(null);

  if (!ingredients || ingredients.length === 0) return null;

  const flagged = ingredients.filter(i => getSafetyLevel(i) !== 'safe');
  const preview = ingredients.slice(0, 5);
  const shown = expanded ? ingredients : preview;

  return (
    <Panel>
      <PanelHeader>
        <HeaderLeft>
          {flagged.length > 0
            ? <ShieldAlert size={16} color="#C92A54" />
            : <ShieldCheck size={16} color="#60C0F0" />
          }
          <PanelTitle>
            Ingredient Safety
            {flagged.length > 0 && <FlagCount>{flagged.length} flagged</FlagCount>}
          </PanelTitle>
        </HeaderLeft>
        <ExpandBtn
          type="button"
          onClick={() => setExpanded(p => !p)}
          aria-label={expanded ? 'Show fewer ingredients' : `Show all ${ingredients.length} ingredients`}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Less' : `All ${ingredients.length}`}
        </ExpandBtn>
      </PanelHeader>

      <IngredientList>
        {shown.map((ing, idx) => {
          const level = getSafetyLevel(ing);
          const label = badgeLabel(ing);
          const isClickable = level !== 'safe';
          return (
            <IngredientRow
              key={ing.id ?? `${ing.name}-${idx}`}
              $level={level}
              as={isClickable ? 'button' : 'div'}
              type={isClickable ? 'button' : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={isClickable ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(ing);
                }
              } : undefined}
              onClick={isClickable ? () => setSelected(ing) : undefined}
              aria-label={isClickable ? `View details for ${ing.name}` : undefined}
            >
              <IngName $level={level}>{ing.name}</IngName>
              {label && <SafetyBadge $level={level}>{label}</SafetyBadge>}
              {ing.isProcessed && !label && <SafetyBadge $level="caution">Processed</SafetyBadge>}
            </IngredientRow>
          );
        })}
      </IngredientList>

      {ingredients.length > 5 && !expanded && (
        <ShowMore type="button" onClick={() => setExpanded(true)}>
          +{ingredients.length - 5} more ingredients
        </ShowMore>
      )}

      <Disclaimer>{FDA_DISCLAIMER}</Disclaimer>

      {selected && (
        <IngredientDetailModal
          ingredient={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </Panel>
  );
};

export default IngredientSafetyPanel;

// ── Styled Components ──────────────────────────────────────────────────────
const Panel = styled.div`
  margin-top: 12px;
  border-top: 1px solid rgba(96, 192, 240, 0.12);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PanelTitle = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 6px;
`;

const FlagCount = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  color: #C92A54;
  background: rgba(201, 42, 84, 0.12);
  padding: 2px 6px;
  border-radius: 10px;
`;

const ExpandBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  min-height: 44px;
  &:hover { background: rgba(96,192,240,0.08); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const IngredientList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const IngredientRow = styled.div<{ $level: 'danger' | 'caution' | 'safe' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 8px;
  background: ${({ $level }) => SAFETY_COLORS[$level].bg};
  border: 1px solid ${({ $level }) => SAFETY_COLORS[$level].border};
  cursor: ${({ $level }) => $level !== 'safe' ? 'pointer' : 'default'};
  text-align: left;
  width: 100%;
  min-height: 44px;
  transition: opacity 0.15s;
  &:hover { opacity: ${({ $level }) => $level !== 'safe' ? '0.85' : '1'}; }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const IngName = styled.span<{ $level: 'danger' | 'caution' | 'safe' }>`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: ${({ $level }) => SAFETY_COLORS[$level].text};
  font-weight: ${({ $level }) => $level !== 'safe' ? '600' : '400'};
`;

const SafetyBadge = styled.span<{ $level: 'danger' | 'caution' | 'safe' }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  color: ${({ $level }) => SAFETY_COLORS[$level].text};
  border: 1px solid ${({ $level }) => SAFETY_COLORS[$level].border};
  border-radius: 4px;
  padding: 2px 5px;
  letter-spacing: 0.04em;
  flex-shrink: 0;
`;

const ShowMore = styled.button`
  background: none;
  border: none;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 4px 0;
  text-align: left;
  min-height: 44px;
  &:hover { text-decoration: underline; }
`;

const Disclaimer = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  color: rgba(224, 236, 244, 0.35);
  line-height: 1.4;
  margin: 4px 0 0;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
`;
