/**
 * ┌─── PAGE: BadgeCreatorPage ─────────────────────────────────┐
 * │ PURPOSE: AI-powered badge/icon creation studio for admin.  │
 * │ Two modes: AI Generate (Recraft V3) or Upload Custom.      │
 * │ CEO RULING: Recraft V3, 50 gens/month, curated styles.    │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Sparkles, Upload, Save, Image, RefreshCw, Zap, AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import StyleBrowser, { type ArtStyle } from './StyleBrowser';

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const PageWrapper = styled.div`
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CreditBadge = styled.div`
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(198, 168, 75, 0.1);
  border: 1px solid rgba(198, 168, 75, 0.25);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: #C6A84B;
`;

const ModeTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
`;

const ModeTab = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 10px;
  border: 2px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'transparent'};
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) => $active ? '#8B5CF6' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const Card = styled.div`
  padding: 20px;
  border-radius: 16px;
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.12);
`;

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

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  margin-bottom: 12px;

  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
`;

const ActionBtn = styled.button<{ $variant?: 'primary' | 'secondary' }>`
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
  transition: all 0.15s;
  width: 100%;
  background: ${({ $variant }) =>
    $variant === 'secondary'
      ? 'var(--bg-elevated, #141419)'
      : 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))'};
  color: ${({ $variant }) => $variant === 'secondary' ? 'var(--text-primary, #E0ECF4)' : '#fff'};
  border: ${({ $variant }) => $variant === 'secondary' ? '1px solid rgba(96, 192, 240, 0.2)' : 'none'};

  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.9; }
`;

const PreviewArea = styled.div`
  width: 100%;
  aspect-ratio: 1;
  max-width: 300px;
  margin: 0 auto 16px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #0A0A0F 0%, #002060 50%, #0A0A0F 100%);
  background-size: 200% 100%;
  border: 1px solid rgba(96, 192, 240, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const GeneratingOverlay = styled.div`
  animation: ${shimmer} 2s ease-in-out infinite;
  background: linear-gradient(90deg, transparent 0%, rgba(96, 192, 240, 0.1) 50%, transparent 100%);
  background-size: 200% 100%;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

const EmptyPreview = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  text-align: center;
  padding: 24px;
`;

const RaritySelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  margin-bottom: 12px;
`;

const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'};
  border: 1px solid ${({ $type }) => $type === 'success' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'};
  color: ${({ $type }) => $type === 'success' ? '#10B981' : '#EF4444'};
`;

const BadgeCreatorPage: React.FC = () => {
  const [mode, setMode] = useState<'generate' | 'upload'>('generate');
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

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  // Fetch styles + credits on mount
  useEffect(() => {
    fetch('/api/admin/badge-creator/styles', { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setStyles(d.data); })
      .catch(() => {});

    fetch('/api/admin/badge-creator/credits', { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setCredits(d.data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || !selectedStyle) return;
    setGenerating(true);
    setGeneratedUrl(null);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/badge-creator/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, style: selectedStyle.promptModifier }),
      });
      const d = await res.json();
      if (d.success) {
        setGeneratedUrl(d.data.imageUrl);
        if (credits) setCredits({ ...credits, remaining: d.data.creditsRemaining });
      } else {
        setStatusMsg({ type: 'error', text: d.message || 'Generation failed' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error' });
    } finally {
      setGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, selectedStyle, credits]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim() || !generatedUrl) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/badge-creator/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: saveName,
          imageUrl: generatedUrl,
          prompt,
          style: selectedStyle?.id,
          rarity: saveRarity,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setStatusMsg({ type: 'success', text: `Badge "${saveName}" saved!` });
        setSaveName('');
        setGeneratedUrl(null);
      } else {
        setStatusMsg({ type: 'error', text: d.message || 'Save failed' });
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveName, generatedUrl, prompt, selectedStyle, saveRarity]);

  return (
    <PageWrapper>
      <Header>
        <Title><Sparkles size={22} /> Badge Creator</Title>
        {credits && (
          <CreditBadge>
            <Zap size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {credits.remaining}/{credits.max} generations left
          </CreditBadge>
        )}
      </Header>

      <ModeTabs>
        <ModeTab $active={mode === 'generate'} onClick={() => setMode('generate')}>
          <Sparkles size={16} /> AI Generate
        </ModeTab>
        <ModeTab $active={mode === 'upload'} onClick={() => setMode('upload')}>
          <Upload size={16} /> Upload Custom
        </ModeTab>
      </ModeTabs>

      {statusMsg && (
        <StatusMsg $type={statusMsg.type}>
          {statusMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {statusMsg.text}
        </StatusMsg>
      )}

      <Grid>
        <div>
          {mode === 'generate' ? (
            <>
              <Label>Describe your badge</Label>
              <TextArea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="e.g., Golden swan shield badge, crystalline ice texture, premium fitness achievement..."
              />

              <Label>Select art style</Label>
              <StyleBrowser
                styles={styles}
                selectedId={selectedStyle?.id || null}
                onSelect={setSelectedStyle}
              />

              <ActionBtn
                onClick={handleGenerate}
                disabled={!prompt.trim() || !selectedStyle || generating || (credits?.remaining ?? 0) <= 0}
              >
                {generating ? <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                {generating ? 'Generating...' : 'Generate Badge'}
              </ActionBtn>
            </>
          ) : (
            <>
              <Label>Upload badge image</Label>
              <div style={{
                padding: '40px 24px',
                borderRadius: 12,
                border: '2px dashed rgba(96, 192, 240, 0.2)',
                textAlign: 'center',
                color: 'var(--text-secondary, rgba(224, 236, 244, 0.85))',
                fontFamily: 'Sora, sans-serif',
                fontSize: 14,
                marginBottom: 16,
              }}>
                <Upload size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                <div>Drag & drop or click to upload</div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>PNG, SVG, or GIF — max 2MB</div>
              </div>
            </>
          )}
        </div>

        <Card>
          <Label>Preview</Label>
          <PreviewArea>
            {generating ? (
              <GeneratingOverlay>
                <RefreshCw size={28} style={{ animation: 'spin 1.5s linear infinite' }} />
                Creating your badge...
              </GeneratingOverlay>
            ) : generatedUrl ? (
              <img src={generatedUrl} alt="Generated badge" />
            ) : (
              <EmptyPreview>
                <Image size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div>Your badge will appear here</div>
              </EmptyPreview>
            )}
          </PreviewArea>

          {generatedUrl && (
            <>
              <Label>Badge name</Label>
              <Input
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="e.g., Golden Swan Shield"
              />

              <Label>Rarity tier</Label>
              <RaritySelect value={saveRarity} onChange={e => setSaveRarity(e.target.value)}>
                <option value="common">Common (Swan Lavender)</option>
                <option value="rare">Rare (Gilded Fern)</option>
                <option value="epic">Epic (Wing Purple)</option>
                <option value="legendary">Legendary (Animated Gradient)</option>
              </RaritySelect>

              <ActionBtn onClick={handleSave} disabled={!saveName.trim() || saving}>
                <Save size={16} />
                {saving ? 'Saving...' : 'Save Badge'}
              </ActionBtn>

              <div style={{ marginTop: 10 }}>
                <ActionBtn $variant="secondary" onClick={handleGenerate} disabled={generating}>
                  <RefreshCw size={14} /> Regenerate
                </ActionBtn>
              </div>
            </>
          )}
        </Card>
      </Grid>
    </PageWrapper>
  );
};

export default BadgeCreatorPage;
