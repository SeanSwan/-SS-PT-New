/**
 * COMPONENT: BatchGenerationPanel
 * PURPOSE: Generate badge variations and pet avatars, then save selected art as badges.
 * DATA: Uses protected `/api/admin/badge-creator` routes through shared auth transport.
 */
import React, { useCallback, useRef, useState } from 'react';
import { Dog, Layers, Save, Shuffle, Sparkles } from 'lucide-react';
import StyleBrowser, { type ArtStyle } from './StyleBrowser';
import apiService from '../../services/api.service';
import { normalizeBadgeImageResult, safeBadgeImageUrl } from './BadgeCreatorImageSafety';
import { normalizeBatchImageRows, normalizeCreditCount, type BatchImageRow } from './BadgeCreatorPayloadSafety';
import {
  ActionBtn, FailedIcon, FailedOverlay, Input, Label, Panel, PetSelect, RaritySelect,
  ResultCard, ResultImg, ResultImage, ResultLabel, ResultsGrid, Row, SaveBtn, SaveRow,
  SelectedCheck, SpinningRefresh, StyleSpacer, TextArea, ToggleBtn,
} from './BatchGenerationPanel.styles';

type BatchImage = BatchImageRow;
interface BatchResult { images: unknown; creditsRemaining: unknown; }
interface Props {
  styles: ArtStyle[]; credits: { remaining: number; max: number } | null;
  onCreditsUpdate: (remaining: number) => void; onStatusMsg: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const PET_SPECIES = ['Phoenix', 'Wolf', 'Dragon', 'Owl', 'Swan'];
export const BADGE_BATCH_GENERATE_ERROR = 'Batch generation could not finish. Check credits and try again.';
export const BADGE_BATCH_PET_ERROR = 'Pet avatar generation could not finish. Check credits and try again.';
export const BADGE_BATCH_SAVE_ERROR = 'Badge could not be saved. Rename it and try again.';
export const BADGE_BATCH_NETWORK_ERROR = 'Badge generator service is temporarily unavailable. Please try again.';

const titleCaseTab = (label: string) => label.charAt(0).toUpperCase() + label.slice(1);

const BatchGenerationPanel: React.FC<Props> = ({ styles, credits, onCreditsUpdate, onStatusMsg }) => {
  const [prompt, setPrompt] = useState('');
  const [primaryStyle, setPrimaryStyle] = useState<ArtStyle | null>(null);
  const [secondaryStyle, setSecondaryStyle] = useState<ArtStyle | null>(null);
  const [mixEnabled, setMixEnabled] = useState(false);
  const [petMode, setPetMode] = useState(false);
  const [petSpecies, setPetSpecies] = useState('phoenix');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<BatchImage[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveRarity, setSaveRarity] = useState('common');
  const [saving, setSaving] = useState(false);
  const generatingRef = useRef(false);
  const savingRef = useRef(false);

  const resetGeneration = () => {
    setResults([]);
    setSelectedIdx(null);
  };

  const handleBatchGenerate = useCallback(async () => {
    if (generatingRef.current || !prompt.trim() || !primaryStyle) return;
    generatingRef.current = true;
    setGenerating(true);
    resetGeneration();

    try {
      const body: Record<string, string> = {
        prompt: prompt.trim(),
        style: primaryStyle.promptModifier,
      };
      if (mixEnabled && secondaryStyle) body.secondaryStyle = secondaryStyle.promptModifier;
      const res = await apiService.post<{ success: boolean; data?: BatchResult }>(
        '/api/admin/badge-creator/generate-batch',
        body,
        { validateStatus: status => status < 500 }
      );
      const data = res.data.data;
      if (res.data.success && data) {
        const normalizedImages = normalizeBatchImageRows(data.images);
        const creditsRemaining = normalizeCreditCount(data.creditsRemaining);
        if (!normalizedImages.length || creditsRemaining === null) {
          onStatusMsg({ type: 'error', text: BADGE_BATCH_GENERATE_ERROR });
          return;
        }
        const safeImages = normalizedImages.map(normalizeBadgeImageResult);
        setResults(safeImages);
        onCreditsUpdate(Math.min(creditsRemaining, credits?.max ?? creditsRemaining));
        const successCount = safeImages.filter(image => image.success).length;
        onStatusMsg({ type: 'success', text: `Batch complete: ${successCount}/5 variations generated` });
      } else {
        onStatusMsg({ type: 'error', text: BADGE_BATCH_GENERATE_ERROR });
      }
    } catch {
      onStatusMsg({ type: 'error', text: BADGE_BATCH_NETWORK_ERROR });
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [prompt, primaryStyle, secondaryStyle, mixEnabled, credits?.max, onCreditsUpdate, onStatusMsg]);

  const handlePetGenerate = useCallback(async () => {
    if (generatingRef.current || !primaryStyle) return;
    generatingRef.current = true;
    setGenerating(true);
    resetGeneration();

    try {
      const res = await apiService.post<{
        success: boolean;
        data?: { imageUrl: string; creditsRemaining: number };
      }>('/api/admin/badge-creator/generate-pet-avatar', {
        species: petSpecies,
        personality: prompt.trim() || undefined,
        style: primaryStyle.promptModifier,
      }, {
        validateStatus: status => status < 500,
      });
      const safeImageUrl = safeBadgeImageUrl(res.data.data?.imageUrl);
      const creditsRemaining = normalizeCreditCount(res.data.data?.creditsRemaining);
      if (res.data.success && res.data.data && safeImageUrl && creditsRemaining !== null) {
        setResults([{ index: 0, variation: 'Pet Avatar', success: true, imageUrl: safeImageUrl }]);
        onCreditsUpdate(Math.min(creditsRemaining, credits?.max ?? creditsRemaining));
        onStatusMsg({ type: 'success', text: `${titleCaseTab(petSpecies)} avatar generated.` });
      } else {
        onStatusMsg({ type: 'error', text: BADGE_BATCH_PET_ERROR });
      }
    } catch {
      onStatusMsg({ type: 'error', text: BADGE_BATCH_NETWORK_ERROR });
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [petSpecies, prompt, primaryStyle, credits?.max, onCreditsUpdate, onStatusMsg]);

  const handleSaveSelected = useCallback(async () => {
    if (savingRef.current || selectedIdx === null || !saveName.trim()) return;
    const selectedImage = results[selectedIdx];
    if (!selectedImage?.imageUrl) return;
    savingRef.current = true;
    setSaving(true);

    try {
      const res = await apiService.post<{ success: boolean }>('/api/admin/badge-creator/save', {
        name: saveName.trim(),
        imageUrl: selectedImage.imageUrl,
        prompt,
        style: primaryStyle?.id,
        rarity: saveRarity,
        isAnimated: saveRarity === 'legendary',
      }, {
        validateStatus: status => status < 500,
      });
      if (res.data.success) {
        onStatusMsg({ type: 'success', text: `Badge "${saveName.trim()}" saved.` });
        setSaveName('');
        setSelectedIdx(null);
      } else {
        onStatusMsg({ type: 'error', text: BADGE_BATCH_SAVE_ERROR });
      }
    } catch {
      onStatusMsg({ type: 'error', text: BADGE_BATCH_NETWORK_ERROR });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [selectedIdx, saveName, saveRarity, results, prompt, primaryStyle, onStatusMsg]);

  const requiredCredits = petMode ? 1 : 5;
  const hasCredits = (credits?.remaining ?? 0) >= requiredCredits;
  const canGenerate = Boolean(primaryStyle) && hasCredits && (petMode || Boolean(prompt.trim()));

  return (
    <Panel>
      <Row>
        <ToggleBtn type="button" $active={!petMode} onClick={() => setPetMode(false)}>
          <Layers size={16} aria-hidden="true" /> Batch (5 Variations)
        </ToggleBtn>
        <ToggleBtn type="button" $active={petMode} onClick={() => setPetMode(true)}>
          <Dog size={16} aria-hidden="true" /> Pet Avatar
        </ToggleBtn>
        <ToggleBtn type="button" $active={mixEnabled} onClick={() => setMixEnabled(value => !value)}>
          <Shuffle size={16} aria-hidden="true" /> Style Mixer {mixEnabled ? 'ON' : 'OFF'}
        </ToggleBtn>
      </Row>

      {petMode && (
        <>
          <Label>Pet species</Label>
          <Row>
            <PetSelect value={petSpecies} onChange={event => setPetSpecies(event.target.value)}>
              {PET_SPECIES.map(species => (
                <option key={species.toLowerCase()} value={species.toLowerCase()}>{species}</option>
              ))}
            </PetSelect>
          </Row>
        </>
      )}

      <Label>{petMode ? 'Personality / extra details (optional)' : 'Describe your badge'}</Label>
      <TextArea
        value={prompt}
        onChange={event => setPrompt(event.target.value)}
        placeholder={petMode
          ? 'e.g., playful, fiery personality, wears a tiny crown...'
          : 'e.g., Golden swan shield badge, crystalline ice texture...'}
      />

      <Label>Primary style</Label>
      <StyleBrowser styles={styles} selectedId={primaryStyle?.id || null} onSelect={setPrimaryStyle} />

      {mixEnabled && (
        <>
          <StyleSpacer />
          <Label>Secondary style (mix with)</Label>
          <StyleBrowser styles={styles} selectedId={secondaryStyle?.id || null} onSelect={setSecondaryStyle} />
        </>
      )}

      <StyleSpacer />
      <ActionBtn
        type="button"
        onClick={petMode ? () => void handlePetGenerate() : () => void handleBatchGenerate()}
        disabled={generating || !canGenerate}
        aria-busy={generating}
      >
        {generating
          ? <><SpinningRefresh size={16} aria-hidden="true" /> Generating...</>
          : petMode
            ? <><Dog size={16} aria-hidden="true" /> Generate Pet Avatar (1 credit)</>
            : <><Sparkles size={16} aria-hidden="true" /> Generate 5 Variations ({mixEnabled ? 'Mixed' : 'Single Style'}) - 5 credits</>}
      </ActionBtn>

      {results.length > 0 && (
        <>
          <Label>Select your favorite - click to pick, then save below</Label>
          <ResultsGrid>
            {results.map((image, index) => (
              <ResultCard
                key={`${image.variation}-${index}`}
                type="button"
                $selected={selectedIdx === index}
                disabled={!image.success}
                aria-pressed={selectedIdx === index}
                aria-label={`Select ${image.variation} variation`}
                onClick={() => image.success && setSelectedIdx(index)}
              >
                <ResultImg>
                  {image.success && image.imageUrl ? (
                    <ResultImage src={image.imageUrl} alt={`Variation ${index + 1}`} />
                  ) : (
                    <FailedOverlay>
                      <FailedIcon size={20} aria-hidden="true" />
                      <div>Generation skipped</div>
                    </FailedOverlay>
                  )}
                </ResultImg>
                <ResultLabel>
                  <span>{image.variation}</span>
                  {selectedIdx === index && <SelectedCheck size={14} aria-hidden="true" />}
                </ResultLabel>
              </ResultCard>
            ))}
          </ResultsGrid>

          {selectedIdx !== null && (
            <SaveRow>
              <Input
                value={saveName}
                onChange={event => setSaveName(event.target.value)}
                placeholder="Badge name..."
              />
              <RaritySelect value={saveRarity} onChange={event => setSaveRarity(event.target.value)}>
                <option value="common">Common</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </RaritySelect>
              <SaveBtn
                type="button"
                onClick={() => void handleSaveSelected()}
                disabled={!saveName.trim() || saving}
                aria-busy={saving}
              >
                <Save size={14} aria-hidden="true" />
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
