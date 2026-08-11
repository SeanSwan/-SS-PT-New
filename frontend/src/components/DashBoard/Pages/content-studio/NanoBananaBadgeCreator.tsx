/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: NanoBananaBadgeCreator                            ║
 * ║  PURPOSE: AI-powered badge/picture creator using Gemini       ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-29                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  NANO BANANA II — Badge Creator                            │
 * ├──────────┬─────────────────────────────────────────────────┤
 * │ Presets  │  [Prompt Input Area]                             │
 * │ ○ Glass  │  Style: [ Glass ▼ ]  Rarity: [ Epic ▼ ]        │
 * │ ○ Metal  │                                                  │
 * │ ○ Clay   │  [Generate Badge]                                │
 * │ ○ Neon   │                                                  │
 * │ ○ Custom │  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
 * │          │  │ Preview 1│ │ Preview 2│ │ Preview 3│        │
 * │          │  └──────────┘ └──────────┘ └──────────┘        │
 * │          │                                                  │
 * │          │  [Save to Manifest] [Download PNG]               │
 * └──────────┴─────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none
 * State:     prompt, style, rarity, generatedImages, selectedImage, isGenerating
 * API Calls: POST /api/content-studio/generate-badge
 * Events:    onGenerate, onSave, onDownload
 *
 * CLICK-OUTCOMES:
 * [Style preset] → Sets style template in prompt → Updates preview placeholder
 * [Generate Badge] → POST to Gemini API → Returns generated image → Shows preview
 * [Save to Manifest] → POST to save endpoint → Adds to badge-manifest.json
 * [Download PNG] → Downloads selected badge as PNG file
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Wand2, Download, Save, Image, Palette, Sparkles } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Badge Style Presets
// ─────────────────────────────────────────────────────────────

const BADGE_STYLES = [
  {
    id: 'glass',
    name: 'Glass',
    description: 'Transparent glass with refraction and soft glow',
    prompt: 'glass morphism style badge, transparent with refraction, soft cyan glow, luxury feel',
    color: '#60C0F0',
  },
  {
    id: 'metallic',
    name: 'Metallic',
    description: 'Polished metal with reflections and engraving',
    prompt: 'polished metallic badge, chrome reflections, engraved details, premium quality',
    color: '#C0C0C0',
  },
  {
    id: 'claymation',
    name: 'Claymation',
    description: '3D clay-rendered with soft lighting',
    prompt: 'claymation 3D style badge, soft clay material, warm lighting, playful yet premium',
    color: '#C6A84B',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Glowing neon outlines on dark background',
    prompt: 'neon glow badge, bright neon outlines, dark background, cyberpunk aesthetic, purple and cyan',
    color: '#8B5CF6',
  },
  {
    id: 'crystal',
    name: 'Crystal',
    description: 'Crystalline structure with prismatic light',
    prompt: 'crystalline badge, prismatic light refraction, ice crystal structure, elegant luxury',
    color: '#50A0F0',
  },
  {
    id: 'holographic',
    name: 'Holographic',
    description: 'Rainbow holographic foil effect',
    prompt: 'holographic foil badge, rainbow prismatic effect, futuristic, premium collector quality',
    color: '#E0ECF4',
  },
];

const RARITY_PRESETS = [
  { id: 'common', name: 'Common', color: '#4070C0', modifier: 'simple, clean design' },
  { id: 'rare', name: 'Rare', color: '#C6A84B', modifier: 'golden accents, detailed' },
  { id: 'epic', name: 'Epic', color: '#8B5CF6', modifier: 'purple aura, glowing, intricate' },
  { id: 'legendary', name: 'Legendary', color: '#60C0F0', modifier: 'animated gradient feel, maximum detail, legendary aura, particles' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const NanoBananaBadgeCreator: React.FC = () => {
  const { authAxios } = useAuth();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('glass');
  const [selectedRarity, setSelectedRarity] = useState('rare');
  const [achievementName, setAchievementName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const stylePreset = BADGE_STYLES.find(s => s.id === selectedStyle);
  const rarityPreset = RARITY_PRESETS.find(r => r.id === selectedRarity);

  const buildFullPrompt = useCallback(() => {
    const base = `Create a premium fitness achievement badge icon for "${achievementName || 'Achievement'}".`;
    const style = stylePreset?.prompt || '';
    const rarity = rarityPreset?.modifier || '';
    const custom = prompt ? `Additional details: ${prompt}` : '';
    const theme = 'Crystalline Swan theme: dark background (#0A0A0F), cyan (#60C0F0) and purple (#8B5CF6) accents, premium luxury fitness brand.';
    const format = 'Square 512x512, centered badge icon, no text, transparent or dark background, suitable for UI display at 36-48px.';

    return [base, style, rarity, custom, theme, format].filter(Boolean).join(' ');
  }, [achievementName, prompt, stylePreset, rarityPreset]);

  const handleGenerate = useCallback(async () => {
    if (!achievementName.trim()) {
      setError('Please enter an achievement name');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);
    setSelectedImage(null);

    try {
      const fullPrompt = buildFullPrompt();
      const res = await authAxios.post('/api/content-studio/generate-badge', {
        prompt: fullPrompt,
        achievementName: achievementName.trim(),
        style: selectedStyle,
        rarity: selectedRarity,
      });

      if (res.data?.success && res.data.images) {
        setGeneratedImages(res.data.images);
        setSelectedImage(0);
      } else {
        setError(res.data?.message || 'Badge generation failed. Ensure GEMINI_API_KEY is configured.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      setError(msg.includes('401') || msg.includes('403')
        ? 'Gemini API key not configured. Add GEMINI_API_KEY to your .env file.'
        : msg);
    } finally {
      setIsGenerating(false);
    }
  }, [achievementName, buildFullPrompt, authAxios, selectedStyle, selectedRarity]);

  const handleSaveToManifest = useCallback(async () => {
    if (selectedImage === null || !generatedImages[selectedImage]) return;

    setSaveStatus('saving');
    try {
      const res = await authAxios.post('/api/content-studio/save-badge', {
        achievementName: achievementName.trim(),
        imageUrl: generatedImages[selectedImage],
        style: selectedStyle,
        rarity: selectedRarity,
      });

      if (res.data?.success) {
        setSaveStatus('Badge saved to manifest!');
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('Failed to save badge');
      }
    } catch {
      setSaveStatus('Save failed — check console');
    }
  }, [selectedImage, generatedImages, achievementName, authAxios, selectedStyle, selectedRarity]);

  const handleDownload = useCallback(() => {
    if (selectedImage === null || !generatedImages[selectedImage]) return;
    const link = document.createElement('a');
    link.href = generatedImages[selectedImage];
    link.download = `${achievementName.replace(/\s+/g, '-').toLowerCase()}-${selectedStyle}-${selectedRarity}.png`;
    link.click();
  }, [selectedImage, generatedImages, achievementName, selectedStyle, selectedRarity]);

  return (
    <Container>
      <Header>
        <HeaderIcon><Wand2 size={20} /></HeaderIcon>
        <div>
          <Title>Nano Banana II — Badge Creator</Title>
          <Subtitle>Swan Coach badge generation using Gemini image models</Subtitle>
        </div>
      </Header>

      <ContentGrid>
        {/* Left: Style Presets */}
        <PresetPanel>
          <PresetTitle><Palette size={14} /> Badge Style</PresetTitle>
          {BADGE_STYLES.map((style) => (
            <PresetCard
              key={style.id}
              $active={selectedStyle === style.id}
              $accentColor={style.color}
              onClick={() => setSelectedStyle(style.id)}
              aria-pressed={selectedStyle === style.id}
            >
              <PresetName>{style.name}</PresetName>
              <PresetDesc>{style.description}</PresetDesc>
            </PresetCard>
          ))}

          <StyledBox as={PresetTitle} $style={{ marginTop: 20 }}><Sparkles size={14} /> Rarity</StyledBox>
          {RARITY_PRESETS.map((rarity) => (
            <PresetCard
              key={rarity.id}
              $active={selectedRarity === rarity.id}
              $accentColor={rarity.color}
              onClick={() => setSelectedRarity(rarity.id)}
              aria-pressed={selectedRarity === rarity.id}
            >
              <PresetName>{rarity.name}</PresetName>
              <PresetDesc>{rarity.modifier}</PresetDesc>
            </PresetCard>
          ))}
        </PresetPanel>

        {/* Right: Generator */}
        <GeneratorPanel>
          {/* Achievement Name */}
          <FormGroup>
            <Label htmlFor="achievement-name">Achievement Name</Label>
            <Input
              id="achievement-name"
              value={achievementName}
              onChange={(e) => setAchievementName(e.target.value)}
              placeholder="e.g., Iron Warrior, First Steps, Ghost Slayer..."
              maxLength={100}
            />
          </FormGroup>

          {/* Custom Prompt */}
          <FormGroup>
            <Label htmlFor="custom-prompt">Additional Details (optional)</Label>
            <TextArea
              id="custom-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Add specific details: a sword, flames, a shield with a swan emblem..."
              rows={3}
              maxLength={500}
            />
          </FormGroup>

          {/* Full Prompt Preview */}
          <PromptPreview>
            <PromptLabel>Full prompt:</PromptLabel>
            <PromptText>{buildFullPrompt()}</PromptText>
          </PromptPreview>

          {/* Generate Button */}
          <GenerateButton
            onClick={handleGenerate}
            disabled={isGenerating || !achievementName.trim()}
          >
            {isGenerating ? (
              <>Generating...</>
            ) : (
              <>
                <Wand2 size={18} />
                Generate Badge
              </>
            )}
          </GenerateButton>

          {/* Error/Status — aria-live for screen readers */}
          <div role="status" aria-live="polite">
            {error && <ErrorMessage>{error}</ErrorMessage>}
          </div>

          {/* Generated Images */}
          {generatedImages.length > 0 && (
            <ResultsSection>
              <Label as="h3">Generated Badges</Label>
              <ImageGrid>
                {generatedImages.map((img, idx) => (
                  <ImageCard
                    key={idx}
                    $selected={selectedImage === idx}
                    onClick={() => setSelectedImage(idx)}
                    aria-pressed={selectedImage === idx}
                    aria-label={`Badge variant ${idx + 1}`}
                  >
                    <img src={img} alt={`Generated badge ${idx + 1}`} />
                  </ImageCard>
                ))}
              </ImageGrid>

              {/* Action Buttons */}
              {selectedImage !== null && (
                <ActionRow>
                  <ActionButton onClick={handleSaveToManifest} $variant="primary">
                    <Save size={16} /> Save to Manifest
                  </ActionButton>
                  <ActionButton onClick={handleDownload} $variant="secondary">
                    <Download size={16} /> Download PNG
                  </ActionButton>
                </ActionRow>
              )}

              {saveStatus && (
                <SaveStatusText $success={saveStatus.includes('saved')}>
                  {saveStatus}
                </SaveStatusText>
              )}
            </ResultsSection>
          )}

          {/* Empty State */}
          {generatedImages.length === 0 && !isGenerating && (
            <EmptyState>
              <Image size={48} strokeWidth={1} />
              <EmptyText>
                Enter an achievement name and click Generate to create Swan Coach badge art.
                Badges are generated using Gemini&apos;s image model in the Crystalline Swan style.
              </EmptyText>
            </EmptyState>
          )}
        </GeneratorPanel>
      </ContentGrid>
    </Container>
  );
};

export default NanoBananaBadgeCreator;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderIcon = styled.div`
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.15);
  color: var(--accent-secondary, #8B5CF6);
`;

const Title = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const Subtitle = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  margin: 2px 0 0;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PresetPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const PresetTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
`;

const PresetCard = styled.button<{ $active: boolean; $accentColor: string }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $active, $accentColor }) =>
    $active ? `${$accentColor}60` : 'rgba(224, 236, 244, 0.08)'};
  background: ${({ $active, $accentColor }) =>
    $active ? `${$accentColor}15` : 'transparent'};
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: ${({ $accentColor }) => `${$accentColor}40`};
    background: ${({ $accentColor }) => `${$accentColor}10`};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const PresetName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

const PresetDesc = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

const GeneratorPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
`;

const Input = styled.input`
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(64, 112, 192, 0.3);
  background: rgba(20, 20, 25, 0.6);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  min-height: 44px;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: #4070C0;
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(96, 192, 240, 0.4);
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(64, 112, 192, 0.3);
  background: rgba(20, 20, 25, 0.6);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 80px;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: #4070C0;
    opacity: 0.8;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
    box-shadow: 0 0 8px rgba(96, 192, 240, 0.4);
  }
`;

const PromptPreview = styled.div`
  padding: 12px 16px;
  background: rgba(96, 192, 240, 0.05);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 8px;
`;

const PromptLabel = styled.span`
  display: block;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: var(--accent-primary, #60C0F0);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
`;

const PromptText = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  line-height: 1.5;
`;

const GenerateButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 12px 32px;
  border-radius: 10px;
  border: none;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 15px rgba(96, 192, 240, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 0 25px rgba(96, 192, 240, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;

const ErrorMessage = styled.div`
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(26, 26, 36, 0.95);
  border-left: 4px solid #C92A54;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
`;

const ResultsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ImageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
  gap: 12px;
`;

const ImageCard = styled.button<{ $selected: boolean }>`
  aspect-ratio: 1;
  border-radius: 12px;
  border: 2px solid ${({ $selected }) =>
    $selected ? 'var(--accent-primary, #60C0F0)' : 'rgba(224, 236, 244, 0.1)'};
  background: var(--bg-elevated, #141419);
  padding: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  ${({ $selected }) => $selected && `
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.3);
  `}

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    transform: scale(1.03);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 8px;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const ActionButton = styled.button<{ $variant: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 8px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary' ? 'rgba(96, 192, 240, 0.3)' : 'rgba(224, 236, 244, 0.15)'};
  background: ${({ $variant }) =>
    $variant === 'primary' ? 'rgba(96, 192, 240, 0.1)' : 'transparent'};
  color: ${({ $variant }) =>
    $variant === 'primary' ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'primary' ? 'rgba(96, 192, 240, 0.2)' : 'rgba(224, 236, 244, 0.05)'};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
  }
`;

const SaveStatusText = styled.div<{ $success: boolean }>`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  color: ${({ $success }) => $success ? '#22c55e' : '#C92A54'};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 48px 24px;
  color: rgba(224, 236, 244, 0.25);
`;

const EmptyText = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.4));
  text-align: center;
  max-width: 400px;
  line-height: 1.6;
`;
