/**
 * ┌─── SUB-COMPONENT: VoiceStudioPanel ──────────────────────────┐
 * │ PARENT: ContentStudioHub                                      │
 * │ PURPOSE: ElevenLabs voice synthesis UI — script → AI voice   │
 * │ WIREFRAME:                                                    │
 * │ ┌─��────────────────────────────────────────────┐              │
 * │ │ Voice Selection   [Clone] [Library]          │              │
 * │ │ ┌───���┐ ┌────┐ ┌────┐ ┌────┐                │              │
 * │ │ │Sean│ │Coach│ │Calm│ │Hype│ (← scroll)     │              │
 * │ │ └────┘ └────┘ └────┘ └────┘                │              │
 * │ │ Script Input:                                │              │
 * │ │ [                                          ] │              │
 * │ │ [   Text area for narration script         ] │              │
 * │ │ [                                          ] │              │
 * │ │ Duration: ~12s  ·  Cost: ~0.003            │              │
 * │ │ [▶ Generate Voiceover]                      │              │
 * │ │                                              │              │
 * │ │ Recent Generations:                          │              │
 * │ │ ┌──────────────────────────────────────┐    │              │
 * │ │ │ "Squat form check..." · 8s · ▶ │    │              │
 * │ │ └──────────────────────────────────────┘    │              │
 * │ └──────────────────────────────────────────────┘              │
 * │ Props: (none — self-contained)                                │
 * │ CLICK-OUTCOMES:                                               │
 * │ [Generate] → POST /api/content-studio/synthesize-voice        │
 * │ [Voice Card] → sets selectedVoice state                       │
 * │ [Play] → HTML5 Audio playback                                 │
 * └───────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Mic2, Play, Pause, Download, Volume2, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface VoicePreset {
  id: string;
  name: string;
  style: string;
  icon: string;
}

interface GeneratedVoice {
  id: string;
  script: string;
  voiceName: string;
  duration: string;
  url: string | null;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────
const VOICE_PRESETS: VoicePreset[] = [
  { id: 'coach-male', name: 'Coach Sean', style: 'Motivational', icon: '🏋️' },
  { id: 'narrator', name: 'Narrator', style: 'Professional', icon: '🎙️' },
  { id: 'calm-female', name: 'Calm Guide', style: 'Soothing', icon: '🧘' },
  { id: 'hype-male', name: 'Hype Coach', style: 'Energetic', icon: '⚡' },
  { id: 'scientific', name: 'Educator', style: 'Analytical', icon: '🔬' },
  { id: 'warmup', name: 'Warm Up', style: 'Friendly', icon: '☀️' },
];

const SCRIPT_TEMPLATES: { label: string; text: string }[] = [
  { label: 'Exercise Demo', text: 'Now we\'re going to focus on the barbell back squat. Keep your core tight, chest up, and drive through your heels as you descend to parallel.' },
  { label: 'Workout Intro', text: 'Welcome to today\'s session. We\'re hitting a full upper body strength workout following NASM Phase 3 — hypertrophy. Let\'s get after it.' },
  { label: 'Form Cue', text: 'Watch your knee alignment. Make sure your knees track over your toes, not caving inward. Engage your glutes at the top of the movement.' },
  { label: 'Cool Down', text: 'Great work today. Let\'s take 5 minutes to stretch it out. Start with a standing quad stretch, holding each side for 30 seconds.' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Wrap = styled.div`
  padding: 24px;
  max-width: 800px;
`;

const SectionLabel = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const VoiceGrid = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-soft, rgba(96, 192, 240, 0.12)) transparent;
`;

const VoiceCard = styled.button<{ $selected: boolean }>`
  flex: 0 0 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  border-radius: 12px;
  border: 1px solid ${({ $selected }) =>
    $selected ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96, 192, 240, 0.08))'};
  background: ${({ $selected }) =>
    $selected ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent)' : 'var(--bg-elevated, #141419)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 44px;

  &:hover {
    border-color: var(--accent-secondary, rgba(139, 92, 246, 0.3));
    transform: translateY(-2px);
  }
`;

const VoiceIcon = styled.span`font-size: 1.5rem;`;
const VoiceName = styled.span`font-family: 'Sora', sans-serif; font-size: 0.75rem; font-weight: 600;`;
const VoiceStyle = styled.span`font-size: 0.6rem; color: var(--text-muted, rgba(224, 236, 244, 0.45));`;

const TemplateRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const TemplateChip = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-secondary, #94a3b8);
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.15s ease;

  &:hover {
    border-color: var(--accent-primary, rgba(96, 192, 240, 0.25));
    color: var(--text-primary, #E0ECF4);
  }
`;

const ScriptArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  resize: vertical;
  line-height: 1.6;
  margin-bottom: 12px;

  &::placeholder { color: rgba(224, 236, 244, 0.3); }
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
`;

const GenerateBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 24px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  margin-bottom: 32px;

  &:hover:not(:disabled) { box-shadow: 0 0 20px rgba(139, 92, 246, 0.35); transform: scale(1.02); }
  &:active:not(:disabled) { transform: scale(0.97); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const HistoryCard = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  margin-bottom: 8px;
`;

const HistoryText = styled.div`
  flex: 1;
  min-width: 0;
`;

const HistoryScript = styled.div`
  font-size: 0.8rem;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const HistoryMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  margin-top: 2px;
`;

const PlayBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, rgba(96, 192, 240, 0.2));
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &:hover { background: rgba(96, 192, 240, 0.08); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const VoiceStudioPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [selectedVoice, setSelectedVoice] = useState<string>('coach-male');
  const [script, setScript] = useState('');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedVoice[]>([]);

  const estimatedDuration = Math.max(1, Math.round(script.split(/\s+/).length / 2.5));
  const charCount = script.length;

  const handleGenerate = useCallback(async () => {
    if (!script.trim() || !selectedVoice) return;
    setGenerating(true);
    try {
      const res = await authAxios.post('/api/content-studio/synthesize-voice', {
        script: script.trim(),
        voiceId: selectedVoice,
      });
      const result = res.data?.data || res.data;
      setHistory(prev => [{
        id: result?.id || Date.now().toString(),
        script: script.trim().slice(0, 80),
        voiceName: VOICE_PRESETS.find(v => v.id === selectedVoice)?.name || selectedVoice,
        duration: `${estimatedDuration}s`,
        url: result?.audioUrl || null,
        createdAt: new Date().toISOString(),
      }, ...prev]);
      setScript('');
    } catch {
      // Will show error in API response — non-fatal for UI
    } finally {
      setGenerating(false);
    }
  }, [authAxios, script, selectedVoice, estimatedDuration]);

  return (
    <Wrap>
      <SectionLabel><Volume2 size={16} /> Select Voice</SectionLabel>
      <VoiceGrid>
        {VOICE_PRESETS.map(voice => (
          <VoiceCard
            key={voice.id}
            $selected={selectedVoice === voice.id}
            onClick={() => setSelectedVoice(voice.id)}
            aria-pressed={selectedVoice === voice.id}
          >
            <VoiceIcon>{voice.icon}</VoiceIcon>
            <VoiceName>{voice.name}</VoiceName>
            <VoiceStyle>{voice.style}</VoiceStyle>
          </VoiceCard>
        ))}
      </VoiceGrid>

      <SectionLabel><Mic2 size={16} /> Script</SectionLabel>
      <TemplateRow>
        {SCRIPT_TEMPLATES.map(t => (
          <TemplateChip key={t.label} onClick={() => setScript(t.text)}>
            {t.label}
          </TemplateChip>
        ))}
      </TemplateRow>

      <ScriptArea
        value={script}
        onChange={e => setScript(e.target.value)}
        placeholder="Type or paste your narration script here..."
        maxLength={5000}
      />

      <MetaRow>
        <span><Clock size={10} /> ~{estimatedDuration}s</span>
        <span>{charCount.toLocaleString()} chars</span>
        <span>Voice: {VOICE_PRESETS.find(v => v.id === selectedVoice)?.name}</span>
      </MetaRow>

      <GenerateBtn onClick={handleGenerate} disabled={generating || !script.trim()}>
        {generating ? <><Loader2 size={16} /> Generating...</> : <><Mic2 size={16} /> Generate Voiceover</>}
      </GenerateBtn>

      {history.length > 0 && (
        <>
          <SectionLabel>Recent Generations</SectionLabel>
          {history.map(item => (
            <HistoryCard key={item.id}>
              <PlayBtn onClick={() => {
                if (!item.url) return;
                const audio = new Audio(item.url);
                audio.addEventListener('ended', () => { audio.src = ''; });
                audio.play();
              }} title="Play">
                <Play size={16} />
              </PlayBtn>
              <HistoryText>
                <HistoryScript>"{item.script}..."</HistoryScript>
                <HistoryMeta>{item.voiceName} · {item.duration}</HistoryMeta>
              </HistoryText>
              {item.url && (
                <PlayBtn as="a" href={item.url} download title="Download">
                  <Download size={14} />
                </PlayBtn>
              )}
            </HistoryCard>
          ))}
        </>
      )}
    </Wrap>
  );
};

export default VoiceStudioPanel;
