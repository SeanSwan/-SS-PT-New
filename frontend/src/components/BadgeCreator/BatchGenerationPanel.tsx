/**
 * ┌─── COMPONENT: BatchGenerationPanel ─────────────────────────┐
 * │ PURPOSE: Generate 5 badge variations from one prompt.       │
 * │ Supports style mixing (combine 2 art styles).               │
 * │ Includes pet avatar generation preset.                      │
 * │ PHASE 3: Batch generation, style mixing, pet avatars.       │
 * │ CEO RULING: 5 variations per batch, costs 5 credits.        │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Layers, RefreshCw, Sparkles, Save, Check, Dog,
  Shuffle, AlertTriangle,
} from 'lucide-react';
import StyleBrowser, { type ArtStyle } from './StyleBrowser';
import apiService from '../../services/api.service';

// ── Types ──
interface BatchImage {
  index: number;
  variation: string;
  success: boolean;
  imageUrl: string | null;
  error?: string;
}

interface BatchResult {
  batchGroupId: string;
  images: BatchImage[];
  creditsUsed: number;
  creditsRemaining: number;
  styleMixed: boolean;
}

interface Props {
  styles: ArtStyle[];
  credits: { remaining: number; max: number } | null;
  onCreditsUpdate: (remaining: number) => void;
  onStatusMsg: (msg: { type: 'success' | 'error'; text: string }) => void;
}

// ── Animations ──
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// ── Styled Components ──
const Panel = styled.div`padding: 0;`;

const Label = styled.label`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin-bottom: 6px;
`;

const TextArea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  resize: vertical;
  outline: none;
  margin-bottom: 16px;
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &::placeholder { color: rgba(224, 236, 244, 0.5); }
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 2px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'rgba(96, 192, 240, 0.15)'};
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) => $active ? '#8B5CF6' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const ActionBtn = styled.button`
  min-height: 48px;
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  color: #fff;
  transition: all 0.15s;
  margin-bottom: 20px;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
`;

const PetSelect = styled.select`
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  flex: 1;
  min-width: 160px;
  option { background: #141419; }
`;

const ResultsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 16px;
`;

const ResultCard = styled.div<{ $selected: boolean }>`
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 2px solid ${({ $selected }) => $selected ? 'var(--accent-secondary, #8B5CF6)' : 'rgba(96, 192, 240, 0.12)'};
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { transform: translateY(-2px); border-color: var(--accent-secondary, #8B5CF6); }
`;

const ResultImg = styled.div`
  width: 100%;
  aspect-ratio: 1;
  background: rgba(10, 10, 15, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  img { width: 100%; height: 100%; object-fit: contain; }
`;

const ResultLabel = styled.div`
  padding: 8px 10px;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const FailedOverlay = styled.div`
  color: rgba(239, 68, 68, 0.7);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  text-align: center;
  padding: 16px;
`;

const SaveRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 16px;
  align-items: center;
`;

const Input = styled.input`
  flex: 1;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
`;

const RaritySelect = styled.select`
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  option { background: #141419; }
`;

const SaveBtn = styled.button`
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #002060, #8B5CF6);
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
`;

const PET_SPECIES = ['Phoenix', 'Wolf', 'Dragon', 'Owl', 'Swan'];

const BatchGenerationPanel: React.FC<Props> = ({ styles, credits, onCreditsUpdate, onStatusMsg }) => {
  const [prompt, setPrompt] = useState('');
  const [primaryStyle, setPrimaryStyle] = useState<ArtStyle | null>(null);
  const [secondaryStyle, setSecondaryStyle] = useState<ArtStyle | null>(null);
  const [mixEnabled, setMixEnabled] = useState(false);
  const [petMode, setPetMode] = useState(false);
  const [petSpecies, setPetSpecies] = useState('phoenix');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<BatchImage[]>([]);
  const [batchGroupId, setBatchGroupId] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveRarity, setSaveRarity] = useState('common');
  const [saving, setSaving] = useState(false);

  const handleBatchGenerate = useCallback(async () => {
    if (!prompt.trim() || !primaryStyle) return;
    setGenerating(true);
    setResults([]);
    setSelectedIdx(null);
    setBatchGroupId(null);

    try {
      const body: Record<string, string> = {
        prompt,
        style: primaryStyle.promptModifier,
      };
      if (mixEnabled && secondaryStyle) {
        body.secondaryStyle = secondaryStyle.promptModifier;
      }

      const res = await apiService.post<{
        success: boolean;
        data?: BatchResult;
        message?: string;
      }>('/api/admin/badge-creator/generate-batch', body, {
        validateStatus: status => status < 500,
      });
      const d = res.data;
      if (d.success && d.data) {
        const data = d.data;
        setResults(data.images);
        setBatchGroupId(data.batchGroupId);
        onCreditsUpdate(data.creditsRemaining);
        const successCount = data.images.filter(i => i.success).length;
        onStatusMsg({ type: 'success', text: `Batch complete: ${successCount}/5 variations generated` });
      } else {
        onStatusMsg({ type: 'error', text: d.message || 'Batch generation failed' });
      }
    } catch {
      onStatusMsg({ type: 'error', text: 'Network error during batch generation' });
    } finally {
      setGenerating(false);
    }
  }, [prompt, primaryStyle, secondaryStyle, mixEnabled, onCreditsUpdate, onStatusMsg]);

  const handlePetGenerate = useCallback(async () => {
    if (!primaryStyle) return;
    setGenerating(true);
    setResults([]);
    setSelectedIdx(null);

    try {
      const res = await apiService.post<{
        success: boolean;
        data?: { imageUrl: string; creditsRemaining: number };
        message?: string;
      }>('/api/admin/badge-creator/generate-pet-avatar', {
        species: petSpecies,
        personality: prompt.trim() || undefined,
        style: primaryStyle.promptModifier,
      }, {
        validateStatus: status => status < 500,
      });
      const d = res.data;
      if (d.success && d.data) {
        setResults([{ index: 0, variation: 'Pet Avatar', success: true, imageUrl: d.data.imageUrl }]);
        onCreditsUpdate(d.data.creditsRemaining);
        onStatusMsg({ type: 'success', text: `${petSpecies} avatar generated!` });
      } else {
        onStatusMsg({ type: 'error', text: d.message || 'Pet avatar generation failed' });
      }
    } catch {
      onStatusMsg({ type: 'error', text: 'Network error' });
    } finally {
      setGenerating(false);
    }
  }, [petSpecies, prompt, primaryStyle, onCreditsUpdate, onStatusMsg]);

  const handleSaveSelected = useCallback(async () => {
    if (selectedIdx === null || !saveName.trim()) return;
    const img = results[selectedIdx];
    if (!img?.imageUrl) return;

    setSaving(true);
    try {
      const res = await apiService.post<{ success: boolean; message?: string }>('/api/admin/badge-creator/save', {
        name: saveName,
        imageUrl: img.imageUrl,
        prompt,
        style: primaryStyle?.id,
        rarity: saveRarity,
        isAnimated: saveRarity === 'legendary',
      }, {
        validateStatus: status => status < 500,
      });
      const d = res.data;
      if (d.success) {
        onStatusMsg({ type: 'success', text: `Badge "${saveName}" saved!` });
        setSaveName('');
        setSelectedIdx(null);
      } else {
        onStatusMsg({ type: 'error', text: d.message || 'Save failed' });
      }
    } catch {
      onStatusMsg({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  }, [selectedIdx, saveName, saveRarity, results, prompt, primaryStyle, onStatusMsg]);

  return (
    <Panel>
      {/* Mode toggles */}
      <Row>
        <ToggleBtn $active={!petMode} onClick={() => setPetMode(false)}>
          <Layers size={16} /> Batch (5 Variations)
        </ToggleBtn>
        <ToggleBtn $active={petMode} onClick={() => setPetMode(true)}>
          <Dog size={16} /> Pet Avatar
        </ToggleBtn>
        <ToggleBtn $active={mixEnabled} onClick={() => setMixEnabled(!mixEnabled)}>
          <Shuffle size={16} /> Style Mixer {mixEnabled ? 'ON' : 'OFF'}
        </ToggleBtn>
      </Row>

      {/* Pet species selector */}
      {petMode && (
        <>
          <Label>Pet species</Label>
          <Row>
            <PetSelect value={petSpecies} onChange={e => setPetSpecies(e.target.value)}>
              {PET_SPECIES.map(s => (
                <option key={s.toLowerCase()} value={s.toLowerCase()}>{s}</option>
              ))}
            </PetSelect>
          </Row>
        </>
      )}

      {/* Prompt */}
      <Label>{petMode ? 'Personality / extra details (optional)' : 'Describe your badge'}</Label>
      <TextArea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        placeholder={petMode
          ? 'e.g., playful, fiery personality, wears a tiny crown...'
          : 'e.g., Golden swan shield badge, crystalline ice texture...'
        }
      />

      {/* Primary style */}
      <Label>Primary style</Label>
      <StyleBrowser styles={styles} selectedId={primaryStyle?.id || null} onSelect={setPrimaryStyle} />

      {/* Secondary style (mixer) */}
      {mixEnabled && (
        <>
          <div style={{ marginTop: 16 }} />
          <Label>Secondary style (mix with)</Label>
          <StyleBrowser styles={styles} selectedId={secondaryStyle?.id || null} onSelect={setSecondaryStyle} />
        </>
      )}

      {/* Generate button */}
      <div style={{ marginTop: 16 }}>
        <ActionBtn
          onClick={petMode ? handlePetGenerate : handleBatchGenerate}
          disabled={
            generating
            || !primaryStyle
            || (!petMode && !prompt.trim())
            || (credits?.remaining ?? 0) < (petMode ? 1 : 5)
          }
        >
          {generating
            ? <><RefreshCw size={16} style={{ animation: `${spin} 1s linear infinite` }} /> Generating...</>
            : petMode
              ? <><Dog size={16} /> Generate Pet Avatar (1 credit)</>
              : <><Sparkles size={16} /> Generate 5 Variations ({mixEnabled ? 'Mixed' : 'Single Style'}) — 5 credits</>
          }
        </ActionBtn>
      </div>

      {/* Results grid */}
      {results.length > 0 && (
        <>
          <Label>Select your favorite — click to pick, then save below</Label>
          <ResultsGrid>
            {results.map((img, i) => (
              <ResultCard key={i} $selected={selectedIdx === i} onClick={() => img.success && setSelectedIdx(i)}>
                <ResultImg>
                  {img.success && img.imageUrl ? (
                    <img src={img.imageUrl} alt={`Variation ${i + 1}`} />
                  ) : (
                    <FailedOverlay>
                      <AlertTriangle size={20} style={{ marginBottom: 4 }} />
                      <div>Failed</div>
                    </FailedOverlay>
                  )}
                </ResultImg>
                <ResultLabel>
                  <span>{img.variation}</span>
                  {selectedIdx === i && <Check size={14} color="#8B5CF6" />}
                </ResultLabel>
              </ResultCard>
            ))}
          </ResultsGrid>

          {/* Save selected */}
          {selectedIdx !== null && (
            <SaveRow>
              <Input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="Badge name..."
              />
              <RaritySelect value={saveRarity} onChange={e => setSaveRarity(e.target.value)}>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </RaritySelect>
              <SaveBtn onClick={handleSaveSelected} disabled={!saveName.trim() || saving}>
                <Save size={14} />
                {saving ? 'Saving...' : 'Save'}
              </SaveBtn>
            </SaveRow>
          )}
        </>
      )}
    </Panel>
  );
};

export default BatchGenerationPanel;
