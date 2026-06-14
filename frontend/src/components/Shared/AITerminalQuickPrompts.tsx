import React from 'react';
import type { AITerminalQuickPrompt } from './AITerminalPanel.types';
import {
  QuickPromptBar,
  QuickPromptButton,
  QuickPromptDescription,
} from './AITerminalPanel.quickPrompts.styles';

interface AITerminalQuickPromptsProps {
  displayLabel: string;
  items: AITerminalQuickPrompt[];
  onSelect: (item: AITerminalQuickPrompt) => void;
}

const AITerminalQuickPrompts: React.FC<AITerminalQuickPromptsProps> = ({
  displayLabel,
  items,
  onSelect,
}) => {
  if (items.length === 0) return null;

  return (
    <QuickPromptBar aria-label={`${displayLabel} quick prompts`}>
      {items.map((item) => (
        <QuickPromptButton
          key={item.label}
          type="button"
          onClick={() => onSelect(item)}
        >
          <strong>{item.label}</strong>
          {item.description && (
            <QuickPromptDescription>{item.description}</QuickPromptDescription>
          )}
        </QuickPromptButton>
      ))}
    </QuickPromptBar>
  );
};

export default AITerminalQuickPrompts;
