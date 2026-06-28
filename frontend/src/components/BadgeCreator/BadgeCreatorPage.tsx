import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Grid3X3, Image as ImageIcon, Layers, RefreshCw, Save, ShoppingBag, Sparkles, Upload, Zap } from 'lucide-react';
import StyleBrowser, { type ArtStyle } from './StyleBrowser';
import BadgeGalleryPanel from './BadgeGalleryPanel';
import BatchGenerationPanel from './BatchGenerationPanel';
import BadgeMarketplacePanel from './BadgeMarketplacePanel';
import BadgeUploadPanel from './BadgeUploadPanel';
import apiService from '../../services/api.service';
import { safeBadgeImageUrl } from './BadgeCreatorImageSafety';
import { normalizeArtStyleRows, normalizeBadgeCreatorCredits, normalizeCreditCount } from './BadgeCreatorPayloadSafety';
import {
  ActionBtn,
  ActionSpacing,
  Card,
  CreditBadge,
  CreditZap,
  EmptyPreview,
  GeneratingOverlay,
  GroupLabel,
  Header,
  Input,
  Label,
  ModeTab,
  ModeTabs,
  PageWrapper,
  PreviewArea,
  PreviewIcon,
  RaritySelect,
  SpinningRefresh,
  StatusMsg,
  StudioGrid,
  TextArea,
  Title,
} from './BadgeCreatorPage.styles';

export const BADGE_CREATOR_GENERATE_ERROR = 'Badge generation could not finish. Check credits and try again.';
export const BADGE_CREATOR_SAVE_ERROR = 'Badge could not be saved. Rename it and try again.';
export const BADGE_CREATOR_NETWORK_ERROR = 'Badge creator service is temporarily unavailable. Please try again.';

type BadgeCreatorMode = 'generate' | 'upload' | 'gallery' | 'batch' | 'marketplace';

const BadgeCreatorPage: React.FC = () => {
  const [mode, setMode] = useState<BadgeCreatorMode>('generate');
  const [styles, setStyles] = useState<ArtStyle[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [credits, setCredits] = useState<{ remaining: number; max: number } | null>(null);
  const [saveName, setSaveName] = useState('');
  const [saveRarity, setSaveRarity] = useState('common');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const generatingRef = useRef(false);
  const savingRef = useRef(false);
  const canGenerate = Boolean(prompt.trim() && selectedStyle && (credits?.remaining ?? 0) > 0);

  useEffect(() => {
    apiService.get<{ success: boolean; data: ArtStyle[] }>('/api/admin/badge-creator/styles')
      .then(res => {
        if (res.data.success) setStyles(normalizeArtStyleRows(res.data.data));
      })
      .catch(() => {});

    apiService.get<{ success: boolean; data: { remaining: number; max: number } }>('/api/admin/badge-creator/credits')
      .then(res => {
        if (res.data.success) setCredits(normalizeBadgeCreatorCredits(res.data.data));
      })
      .catch(() => {});
  }, []);

  const handleGenerate = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (generatingRef.current || !canGenerate || !selectedStyle) return;
    generatingRef.current = true;
    setGenerating(true);
    setGeneratedUrl(null);
    setStatusMsg(null);

    try {
      const res = await apiService.post<{
        success: boolean;
        data?: { imageUrl: string; creditsRemaining: number };
      }>('/api/admin/badge-creator/generate', {
        prompt: trimmedPrompt,
        style: selectedStyle.promptModifier,
      }, {
        validateStatus: status => status < 500,
      });
      const data = res.data.data;
      const safeImageUrl = safeBadgeImageUrl(data?.imageUrl);
      const creditsRemaining = normalizeCreditCount(data?.creditsRemaining);
      if (res.data.success && data && safeImageUrl && creditsRemaining !== null) {
        setGeneratedUrl(safeImageUrl);
        setCredits(current => current ? { ...current, remaining: Math.min(creditsRemaining, current.max) } : current);
      } else {
        setStatusMsg({ type: 'error', text: BADGE_CREATOR_GENERATE_ERROR });
      }
    } catch {
      setStatusMsg({ type: 'error', text: BADGE_CREATOR_NETWORK_ERROR });
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }, [canGenerate, prompt, selectedStyle]);

  const handleSave = useCallback(async () => {
    const trimmedName = saveName.trim();
    if (savingRef.current || !trimmedName || !generatedUrl) return;
    savingRef.current = true;
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await apiService.post<{ success: boolean }>('/api/admin/badge-creator/save', {
        name: trimmedName,
        imageUrl: generatedUrl,
        prompt,
        style: selectedStyle?.id,
        rarity: saveRarity,
      }, {
        validateStatus: status => status < 500,
      });
      if (res.data.success) {
        setStatusMsg({ type: 'success', text: `Badge "${trimmedName}" saved.` });
        setSaveName('');
        setGeneratedUrl(null);
      } else {
        setStatusMsg({ type: 'error', text: BADGE_CREATOR_SAVE_ERROR });
      }
    } catch {
      setStatusMsg({ type: 'error', text: BADGE_CREATOR_NETWORK_ERROR });
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }, [saveName, generatedUrl, prompt, selectedStyle, saveRarity]);

  return (
    <PageWrapper>
      <Header>
        <Title><Sparkles size={22} aria-hidden="true" /> Badge Creator</Title>
        {credits && (
          <CreditBadge>
            <CreditZap><Zap size={12} aria-hidden="true" /></CreditZap>
            {credits.remaining}/{credits.max} generations left
          </CreditBadge>
        )}
      </Header>

      <ModeTabs role="group" aria-label="Badge creator mode">
        <ModeTab type="button" $active={mode === 'generate'} aria-pressed={mode === 'generate'} onClick={() => setMode('generate')}>
          <Sparkles size={16} aria-hidden="true" /> AI Generate
        </ModeTab>
        <ModeTab type="button" $active={mode === 'batch'} aria-pressed={mode === 'batch'} onClick={() => setMode('batch')}>
          <Layers size={16} aria-hidden="true" /> Batch
        </ModeTab>
        <ModeTab type="button" $active={mode === 'upload'} aria-pressed={mode === 'upload'} onClick={() => setMode('upload')}>
          <Upload size={16} aria-hidden="true" /> Upload
        </ModeTab>
        <ModeTab type="button" $active={mode === 'gallery'} aria-pressed={mode === 'gallery'} onClick={() => setMode('gallery')}>
          <Grid3X3 size={16} aria-hidden="true" /> Gallery
        </ModeTab>
        <ModeTab type="button" $active={mode === 'marketplace'} aria-pressed={mode === 'marketplace'} onClick={() => setMode('marketplace')}>
          <ShoppingBag size={16} aria-hidden="true" /> Marketplace
        </ModeTab>
      </ModeTabs>

      {statusMsg && (
        <StatusMsg
          $type={statusMsg.type}
          role={statusMsg.type === 'error' ? 'alert' : 'status'}
          aria-live={statusMsg.type === 'error' ? 'assertive' : 'polite'}
        >
          {statusMsg.type === 'success'
            ? <CheckCircle size={16} aria-hidden="true" />
            : <AlertTriangle size={16} aria-hidden="true" />}
          {statusMsg.text}
        </StatusMsg>
      )}

      {mode === 'upload' ? (
        <BadgeUploadPanel />
      ) : mode === 'gallery' ? (
        <BadgeGalleryPanel />
      ) : mode === 'batch' ? (
        <BatchGenerationPanel
          styles={styles}
          credits={credits}
          onCreditsUpdate={(remaining) => setCredits(current => current ? { ...current, remaining } : current)}
          onStatusMsg={setStatusMsg}
        />
      ) : mode === 'marketplace' ? (
        <BadgeMarketplacePanel />
      ) : (
        <StudioGrid>
          <div>
            <Label htmlFor="badge-prompt">Describe your badge</Label>
            <TextArea
              id="badge-prompt"
              value={prompt}
              onChange={event => setPrompt(event.target.value)}
              placeholder="e.g., Golden swan shield badge, crystalline ice texture, premium fitness achievement..."
            />

            <GroupLabel>Select art style</GroupLabel>
            <StyleBrowser
              styles={styles}
              selectedId={selectedStyle?.id || null}
              onSelect={setSelectedStyle}
            />

            <ActionBtn
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate || generating}
              aria-busy={generating}
            >
              {generating
                ? <SpinningRefresh $duration="1s"><RefreshCw size={16} aria-hidden="true" /></SpinningRefresh>
                : <Sparkles size={16} aria-hidden="true" />}
              {generating ? 'Generating...' : 'Generate Badge'}
            </ActionBtn>
          </div>

          <Card>
            <GroupLabel>Preview</GroupLabel>
            <PreviewArea>
              {generating ? (
                <GeneratingOverlay>
                  <SpinningRefresh $duration="1.5s"><RefreshCw size={28} aria-hidden="true" /></SpinningRefresh>
                  Creating your badge...
                </GeneratingOverlay>
              ) : generatedUrl ? (
                <img src={generatedUrl} alt="Generated badge" />
              ) : (
                <EmptyPreview>
                  <PreviewIcon><ImageIcon size={32} aria-hidden="true" /></PreviewIcon>
                  <div>Your badge will appear here</div>
                </EmptyPreview>
              )}
            </PreviewArea>

            {generatedUrl && (
              <>
                <Label htmlFor="badge-save-name">Badge name</Label>
                <Input
                  id="badge-save-name"
                  value={saveName}
                  onChange={event => setSaveName(event.target.value)}
                  placeholder="e.g., Golden Swan Shield"
                />

                <Label htmlFor="badge-rarity-tier">Rarity tier</Label>
                <RaritySelect id="badge-rarity-tier" value={saveRarity} onChange={event => setSaveRarity(event.target.value)}>
                  <option value="common">Common (Swan Lavender)</option>
                  <option value="rare">Rare (Gilded Fern)</option>
                  <option value="epic">Epic (Wing Purple)</option>
                  <option value="legendary">Legendary (Animated Gradient)</option>
                </RaritySelect>

                <ActionBtn type="button" onClick={() => void handleSave()} disabled={!saveName.trim() || saving} aria-busy={saving}>
                  <Save size={16} aria-hidden="true" />
                  {saving ? 'Saving...' : 'Save Badge'}
                </ActionBtn>

                <ActionSpacing>
                  <ActionBtn type="button" $variant="secondary" onClick={() => void handleGenerate()} disabled={!canGenerate || generating}>
                    <RefreshCw size={14} aria-hidden="true" /> Regenerate
                  </ActionBtn>
                </ActionSpacing>
              </>
            )}
          </Card>
        </StudioGrid>
      )}
    </PageWrapper>
  );
};

export default BadgeCreatorPage;
