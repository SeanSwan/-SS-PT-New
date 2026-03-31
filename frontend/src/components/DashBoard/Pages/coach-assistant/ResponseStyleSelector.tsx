/**
 * ┌─── SUB-COMPONENT: ResponseStyleSelector ───────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Toggle between PhD / Balanced / Keep It 100        │
 * │ Props: { activeStyle, onStyleChange }                       │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo } from 'react';
import { StyleBar, StyleBtn } from './SwanCoachStyles';
import { RESPONSE_STYLES } from './SwanCoachConstants';
import type { ResponseStyle } from './SwanCoachTypes';

interface ResponseStyleSelectorProps {
  activeStyle: ResponseStyle;
  onStyleChange: (style: ResponseStyle) => void;
}

const ResponseStyleSelectorComponent: React.FC<ResponseStyleSelectorProps> = ({
  activeStyle,
  onStyleChange,
}) => (
  <StyleBar role="radiogroup" aria-label="AI response style">
    {RESPONSE_STYLES.map(style => (
      <StyleBtn
        key={style.key}
        $active={activeStyle === style.key}
        onClick={() => onStyleChange(style.key)}
        role="radio"
        aria-checked={activeStyle === style.key}
        aria-label={`${style.label}: ${style.description}`}
        title={style.description}
      >
        <span aria-hidden="true">{style.emoji}</span>
        {style.label}
      </StyleBtn>
    ))}
  </StyleBar>
);

export const ResponseStyleSelector = memo(ResponseStyleSelectorComponent);
