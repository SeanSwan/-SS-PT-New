/**
 * ┌─── SUB-COMPONENT: VoiceSettingsBar ───────────────────────┐
 * │ PARENT: SwanCoachAssistantPage                              │
 * │ PURPOSE: Toggle AI voice on/off + pick Gemini voice         │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────────────┐            │
 * │ │ 🔊 AI Voice: ON  │ Kore ▾ │ ● Speaking...   │            │
 * │ └──────────────────────────────────────────────┘            │
 * │ Props: { enabled, speaking, voice, voiceOptions, ... }      │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Toggle] → enables/disables Gemini voice readback           │
 * │ [Dropdown] → switches between Gemini voice personalities    │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Volume2, VolumeX, ChevronDown } from 'lucide-react';
import type { GeminiVoice, VoiceOption } from './hooks/usePremiumTTS';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  background: var(--bg-elevated, #141419);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--border-soft, rgba(96, 192, 240, 0.1))'};
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
    : 'transparent'};
  color: ${({ $active }) => $active
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--text-muted, rgba(224, 236, 244, 0.4))'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const VoiceSelectWrap = styled.div`
  position: relative;
`;

const VoiceSelectBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-secondary, #8B5CF6);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const Dropdown = styled.div<{ $open: boolean }>`
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 4px;
  min-width: 200px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 10px;
  padding: 4px;
  z-index: 100;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  transform: translateY(${({ $open }) => ($open ? '0' : '4px')});
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

const VoiceOption_ = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent)'
    : 'transparent'};
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  min-height: 44px;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }
`;

const VoiceName = styled.span`
  font-size: 13px;
  font-weight: 600;
`;

const VoiceDesc = styled.span`
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const SpeakingIndicator = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--accent-primary, #60C0F0);
  font-size: 11px;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const SpeakingDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-primary, #60C0F0);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────
interface VoiceSettingsBarProps {
  enabled: boolean;
  speaking: boolean;
  voice: GeminiVoice;
  voiceOptions: VoiceOption[];
  onToggle: () => void;
  onVoiceChange: (voice: GeminiVoice) => void;
}

const VoiceSettingsBar: React.FC<VoiceSettingsBarProps> = memo(({
  enabled,
  speaking,
  voice,
  voiceOptions,
  onToggle,
  onVoiceChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const handleVoiceSelect = useCallback((v: GeminiVoice) => {
    onVoiceChange(v);
    setDropdownOpen(false);
  }, [onVoiceChange]);

  const currentVoice = voiceOptions.find(v => v.id === voice);

  return (
    <Bar>
      {/* Voice Toggle */}
      <ToggleBtn
        type="button"
        $active={enabled}
        onClick={onToggle}
        aria-label={enabled ? 'Disable Swan Coach voice' : 'Enable Swan Coach voice'}
        title={enabled ? 'Swan Coach voice is ON — responses will be spoken' : 'Enable Swan Coach voice readback'}
      >
        {enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
        AI Voice: {enabled ? 'ON' : 'OFF'}
      </ToggleBtn>

      {/* Voice Selector (only show when enabled) */}
      {enabled && (
        <VoiceSelectWrap ref={dropdownRef}>
          <VoiceSelectBtn
            type="button"
            onClick={() => setDropdownOpen(prev => !prev)}
            aria-label="Select Swan Coach voice"
            aria-expanded={dropdownOpen}
          >
            {currentVoice?.label || voice}
            <ChevronDown size={12} />
          </VoiceSelectBtn>

          <Dropdown $open={dropdownOpen} role="listbox" aria-label="Voice options">
            {voiceOptions.map(opt => (
              <VoiceOption_
                type="button"
                key={opt.id}
                $active={opt.id === voice}
                onClick={() => handleVoiceSelect(opt.id)}
                role="option"
                aria-selected={opt.id === voice}
              >
                <VoiceName>{opt.label}</VoiceName>
                <VoiceDesc>{opt.description}</VoiceDesc>
              </VoiceOption_>
            ))}
          </Dropdown>
        </VoiceSelectWrap>
      )}

      {/* Speaking Indicator */}
      {speaking && (
        <SpeakingIndicator>
          <SpeakingDot /> Speaking...
        </SpeakingIndicator>
      )}
    </Bar>
  );
});

VoiceSettingsBar.displayName = 'VoiceSettingsBar';

export default VoiceSettingsBar;
