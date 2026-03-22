/**
 * ┌─── SUB-COMPONENT: CategoryOverrideSelector ────────────────┐
 * │ PARENT: CreatePostCard                                      │
 * │ PURPOSE: Displays AI-suggested post category with a manual  │
 * │          override dropdown. AI Village mandate: user MUST    │
 * │          always be able to override the AI suggestion.       │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────────────┐    │
 * │ │ [Sparkles] AI suggests: "Workout" (85%)              │    │
 * │ │               [Override v]                            │    │
 * │ └──────────────────────────────────────────────────────┘    │
 * │ Props: CategoryOverrideSelectorProps                        │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Override dropdown] -> opens native select -> user picks    │
 * │   new category -> calls onOverride(type) on parent          │
 * │ GAMIFICATION: No direct XP; category affects point preview  │
 * └────────────────────────────────────────────────────────────┘
 */

/**
 * ============================================================================
 * FILE: CategoryOverrideSelector.tsx
 * PURPOSE: AI-suggested category with manual override (AI Village mandate)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: When the AI backend suggests a post category (e.g.
 * based on content analysis), this component shows the suggestion with a
 * confidence percentage and lets the user override it via a dropdown. The
 * AI Village mandated that users must ALWAYS have manual override capability.
 *
 * HOW IT FITS IN THE APP: CreatePostCard -> CategoryOverrideSelector
 * KEY DECISIONS: Uses a native <select> instead of a custom dropdown for
 * accessibility and 44px touch targets. Only renders when a suggestion exists.
 */

import React from 'react';
import { Sparkles, BarChart3 } from 'lucide-react';
import {
  CategoryOverrideWrapper,
  CategorySuggestionText,
  CategoryOverrideBtn,
  NativeSelect,
} from '../styles/CreatePostStyles';
import type { CategoryOverrideSelectorProps, PostType } from '../types/CreatePostTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Shows AI suggestion + manual override dropdown
// WHY: AI Village mandate — user must always be able to
//      override AI-suggested categories
// ─────────────────────────────────────────────────────────────

const CategoryOverrideSelector: React.FC<CategoryOverrideSelectorProps> = ({
  suggestion,
  currentType,
  onOverride,
  postTypeOptions,
}) => {
  // Only render when there is an AI suggestion
  if (!suggestion) return null;

  const suggestedOption = postTypeOptions.find(o => o.value === suggestion.suggested);
  const confidencePct = Math.round(suggestion.confidence * 100);

  // If user has already overridden to something different, show muted state
  const isOverridden = currentType !== suggestion.suggested;

  return (
    <CategoryOverrideWrapper>
      <Sparkles size={16} style={{ color: '#C6A84B', flexShrink: 0 }} />
      <CategorySuggestionText>
        AI suggests: <strong>{suggestedOption?.label || suggestion.suggested}</strong>
        {' '}({confidencePct}%)
        {suggestion.reason && (
          <span style={{ marginLeft: 4, opacity: 0.6 }}>
            — {suggestion.reason}
          </span>
        )}
      </CategorySuggestionText>

      {/* Manual override: native select for a11y + 44px touch target */}
      <NativeSelect
        value={currentType}
        onChange={(e) => onOverride(e.target.value as PostType)}
        aria-label="Override AI-suggested category"
        style={{ minWidth: 140, marginLeft: 'auto' }}
      >
        {postTypeOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}{opt.value === suggestion.suggested ? ' (suggested)' : ''}
          </option>
        ))}
      </NativeSelect>

      {isOverridden && (
        <CategoryOverrideBtn
          onClick={() => onOverride(suggestion.suggested)}
          title="Accept AI suggestion"
        >
          <BarChart3 size={12} />
          Use AI pick
        </CategoryOverrideBtn>
      )}
    </CategoryOverrideWrapper>
  );
};

export default React.memo(CategoryOverrideSelector);
