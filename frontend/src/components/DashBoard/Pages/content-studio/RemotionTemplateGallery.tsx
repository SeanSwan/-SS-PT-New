/**
 * ============================================================================
 * FILE: RemotionTemplateGallery.tsx
 * PURPOSE: Remotion motion graphics template gallery + branding pipeline
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows a gallery of pre-built Remotion motion graphics
 * templates (workout intros, exercise demos, client highlight reels, branded
 * social clips). Users select a template, configure branding, and render.
 *
 * HOW IT FITS IN THE APP: ContentStudioHub → AI Video tab → RemotionTemplateGallery
 *
 * ┌─── SUB-COMPONENT: RemotionTemplateGallery ─────────────┐
 * │ PARENT: ContentStudioHub                                 │
 * │ PURPOSE: Template browser + branding configurator        ��
 * │ WIREFRAME:                                               │
 * │ ┌──────────────────────────────────────────┐             │
 * │ │ 🎬 Motion Templates        [Filter ▾]   │             │
 * │ ├──────────────────────────────────────────┤             │
 * │ │ ┌────────┐ ┌────────┐ ┌────────┐        │             │
 * │ │ │Template│ │Template│ │Template│        │             │
 * │ │ │Preview │ │Preview │ │Preview │        │             │
 * │ │ │ Title  │ │ Title  │ │ Title  │        │             │
 * │ │ └────────┘ └────────┘ └────���───┘        │             │
 * │ ├──────────────────────────────────────────┤             │
 * │ │ Branding Pipeline Config                 │             │
 * │ │ [Logo URL] [Primary Color] [Font]        │             │
 * │ │ [Render Preview] [Queue Render]          │             │
 * │ └────��─────────────────────────────────────┘             │
 * │ Props: none                                               │
 * │ CLICK-OUTCOMES:                                           │
 * │ [Template Card] → Selects template → shows config panel  │
 * │ [Queue Render] → POST /api/content-studio/render-job     │
 * └────────────────────────────────────────────���──────────────┘
 */

import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Play, Film, Zap, Award, Users, Dumbbell,
  Palette, Type, Image, ChevronRight, Loader2,
  CheckCircle2, Sparkles, Clock, Video,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ───────────────────────────────���─────────────────────────────
interface MotionTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  duration: string;
  icon: React.ReactNode;
  previewGradient: string;
  tags: string[];
}

type TemplateCategory = 'workout' | 'social' | 'branding' | 'highlight' | 'educational';

interface BrandingConfig {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  businessName: string;
  tagline: string;
}

interface RenderJob {
  templateId: string;
  branding: BrandingConfig;
  clientName?: string;
  exerciseName?: string;
  customText?: string;
}

// ───────────────────────────────────��─────────────────────────
// SECTION: Template Definitions
// PURPOSE: Pre-built Remotion motion graphics templates
// WHY: Trainers need branded video content without design skills
// ────────���───────────────────────────────���────────────────────
const TEMPLATES: MotionTemplate[] = [
  {
    id: 'workout-intro',
    name: 'Workout Intro',
    description: 'Cinematic intro with client name, session type, and OPT phase badge. 5-second animated opener.',
    category: 'workout',
    duration: '5s',
    icon: <Dumbbell size={24} />,
    previewGradient: 'linear-gradient(135deg, #002060 0%, #8B5CF6 50%, #60C0F0 100%)',
    tags: ['intro', 'session', 'OPT phase'],
  },
  {
    id: 'exercise-demo-card',
    name: 'Exercise Demo Card',
    description: 'Animated exercise info card — name, sets/reps, tempo, rest. Overlays on demo video.',
    category: 'workout',
    duration: '4s',
    icon: <Film size={24} />,
    previewGradient: 'linear-gradient(135deg, #0A0A0F 0%, #002060 50%, #60C0F0 100%)',
    tags: ['exercise', 'overlay', 'info card'],
  },
  {
    id: 'client-highlight-reel',
    name: 'Client Highlight Reel',
    description: 'Before/after photo montage with progress stats animation. Achievement badges fly in.',
    category: 'highlight',
    duration: '15s',
    icon: <Award size={24} />,
    previewGradient: 'linear-gradient(135deg, #C6A84B 0%, #8B5CF6 50%, #002060 100%)',
    tags: ['progress', 'before/after', 'achievements'],
  },
  {
    id: 'social-story-promo',
    name: 'Social Story Promo',
    description: 'Vertical 9:16 story template for Instagram/TikTok. Animated text + brand colors.',
    category: 'social',
    duration: '8s',
    icon: <Sparkles size={24} />,
    previewGradient: 'linear-gradient(135deg, #8B5CF6 0%, #60C0F0 50%, #C6A84B 100%)',
    tags: ['story', 'vertical', 'social media'],
  },
  {
    id: 'brand-logo-reveal',
    name: 'Brand Logo Reveal',
    description: 'Crystalline logo reveal animation with particle burst. Uses your uploaded logo.',
    category: 'branding',
    duration: '4s',
    icon: <Zap size={24} />,
    previewGradient: 'linear-gradient(135deg, #0A0A0F 0%, #141419 30%, #8B5CF6 100%)',
    tags: ['logo', 'reveal', 'brand'],
  },
  {
    id: 'class-schedule-board',
    name: 'Class Schedule Board',
    description: 'Animated weekly schedule with session slots, trainer names, and availability indicators.',
    category: 'branding',
    duration: '10s',
    icon: <Clock size={24} />,
    previewGradient: 'linear-gradient(135deg, #002060 0%, #003080 50%, #60C0F0 100%)',
    tags: ['schedule', 'classes', 'availability'],
  },
  {
    id: 'team-intro-carousel',
    name: 'Team Intro Carousel',
    description: 'Trainer profile carousel — photo, name, certifications, specialties. Auto-advances.',
    category: 'branding',
    duration: '12s',
    icon: <Users size={24} />,
    previewGradient: 'linear-gradient(135deg, #1A1A24 0%, #8B5CF6 50%, #C6A84B 100%)',
    tags: ['team', 'trainers', 'profiles'],
  },
  {
    id: 'nasm-phase-explainer',
    name: 'NASM Phase Explainer',
    description: 'Educational animation explaining OPT model phases. Reps, sets, tempo, rest % visualized.',
    category: 'educational',
    duration: '20s',
    icon: <Video size={24} />,
    previewGradient: 'linear-gradient(135deg, #60C0F0 0%, #002060 50%, #8B5CF6 100%)',
    tags: ['NASM', 'OPT', 'educational', 'periodization'],
  },
];

const CATEGORIES: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Templates' },
  { value: 'workout', label: 'Workout' },
  { value: 'social', label: 'Social Media' },
  { value: 'branding', label: 'Branding' },
  { value: 'highlight', label: 'Highlights' },
  { value: 'educational', label: 'Educational' },
];

const DEFAULT_BRANDING: BrandingConfig = {
  logoUrl: '',
  primaryColor: '#002060',
  secondaryColor: '#8B5CF6',
  fontFamily: 'Plus Jakarta Sans',
  businessName: 'SwanStudios',
  tagline: 'Train Smarter. Live Stronger.',
};

const FONT_OPTIONS = [
  'Plus Jakarta Sans',
  'Sora',
  'Cormorant Garamond',
  'Fira Code',
  'Montserrat',
  'Oswald',
];

// ────────────���─────────────────────��──────────────────────────
// SECTION: Component
// ───────��─────────────────────────────────────────────────────
const RemotionTemplateGallery: React.FC = () => {
  const { authAxios } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<TemplateCategory | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<MotionTemplate | null>(null);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [rendering, setRendering] = useState(false);
  const [renderStatus, setRenderStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const filtered = categoryFilter === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === categoryFilter);

  const handleQueueRender = useCallback(async () => {
    if (!selectedTemplate) return;
    setRendering(true);
    setRenderStatus(null);
    try {
      const job: RenderJob = {
        templateId: selectedTemplate.id,
        branding,
      };
      await authAxios.post('/api/content-studio/render-job', job);
      setRenderStatus({ type: 'success', msg: `"${selectedTemplate.name}" queued for rendering. Check Jobs tab for status.` });
    } catch {
      setRenderStatus({ type: 'error', msg: 'Failed to queue render job. Check API configuration.' });
    } finally {
      setRendering(false);
    }
  }, [authAxios, selectedTemplate, branding]);

  const updateBranding = (key: keyof BrandingConfig, value: string) => {
    setBranding(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Container>
      {/* Header + Filter */}
      <SectionHeader>
        <SectionTitle>
          <Film size={20} /> Motion Templates
        </SectionTitle>
        <FilterRow>
          {CATEGORIES.map(c => (
            <FilterChip
              key={c.value}
              $active={categoryFilter === c.value}
              onClick={() => setCategoryFilter(c.value)}
            >
              {c.label}
            </FilterChip>
          ))}
        </FilterRow>
      </SectionHeader>

      {/* Template Grid */}
      <TemplateGrid>
        {filtered.map(t => (
          <TemplateCard
            key={t.id}
            $selected={selectedTemplate?.id === t.id}
            onClick={() => setSelectedTemplate(t)}
          >
            <TemplatePreview $gradient={t.previewGradient}>
              <PreviewIcon>{t.icon}</PreviewIcon>
              <DurationBadge>{t.duration}</DurationBadge>
            </TemplatePreview>
            <TemplateInfo>
              <TemplateName>{t.name}</TemplateName>
              <TemplateDesc>{t.description}</TemplateDesc>
              <TagRow>
                {t.tags.slice(0, 3).map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </TagRow>
            </TemplateInfo>
          </TemplateCard>
        ))}
      </TemplateGrid>

      {/* Branding Pipeline Config */}
      {selectedTemplate && (
        <BrandingPanel>
          <BrandingHeader>
            <BrandingTitle>
              <Palette size={18} />
              Branding Pipeline
              <ChevronRight size={14} style={{ opacity: 0.4 }} />
              <SelectedTemplateName>{selectedTemplate.name}</SelectedTemplateName>
            </BrandingTitle>
          </BrandingHeader>

          <BrandingGrid>
            <FieldGroup>
              <FieldLabel><Image size={14} /> Logo URL</FieldLabel>
              <BrandInput
                type="url"
                placeholder="https://your-site.com/logo.png"
                value={branding.logoUrl}
                onChange={e => updateBranding('logoUrl', e.target.value)}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel><Type size={14} /> Business Name</FieldLabel>
              <BrandInput
                type="text"
                value={branding.businessName}
                onChange={e => updateBranding('businessName', e.target.value)}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Tagline</FieldLabel>
              <BrandInput
                type="text"
                value={branding.tagline}
                onChange={e => updateBranding('tagline', e.target.value)}
                placeholder="Your brand tagline"
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel><Type size={14} /> Font</FieldLabel>
              <BrandSelect
                value={branding.fontFamily}
                onChange={e => updateBranding('fontFamily', e.target.value)}
              >
                {FONT_OPTIONS.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </BrandSelect>
            </FieldGroup>

            <ColorGroup>
              <FieldGroup>
                <FieldLabel>Primary</FieldLabel>
                <ColorRow>
                  <ColorSwatch $color={branding.primaryColor} />
                  <BrandInput
                    type="text"
                    value={branding.primaryColor}
                    onChange={e => updateBranding('primaryColor', e.target.value)}
                    style={{ width: 100 }}
                  />
                </ColorRow>
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Accent</FieldLabel>
                <ColorRow>
                  <ColorSwatch $color={branding.secondaryColor} />
                  <BrandInput
                    type="text"
                    value={branding.secondaryColor}
                    onChange={e => updateBranding('secondaryColor', e.target.value)}
                    style={{ width: 100 }}
                  />
                </ColorRow>
              </FieldGroup>
            </ColorGroup>
          </BrandingGrid>

          {/* Preview Strip */}
          <PreviewStrip $primary={branding.primaryColor} $secondary={branding.secondaryColor}>
            <PreviewStripText style={{ fontFamily: branding.fontFamily }}>
              {branding.businessName}
            </PreviewStripText>
            <PreviewStripTagline style={{ fontFamily: branding.fontFamily }}>
              {branding.tagline}
            </PreviewStripTagline>
          </PreviewStrip>

          {/* Actions */}
          <ActionRow>
            <RenderButton onClick={handleQueueRender} disabled={rendering}>
              {rendering ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
              {rendering ? 'Queueing...' : 'Queue Render'}
            </RenderButton>
          </ActionRow>

          {renderStatus && (
            <StatusMsg $type={renderStatus.type}>
              {renderStatus.type === 'success' ? <CheckCircle2 size={14} /> : <Zap size={14} />}
              {renderStatus.msg}
            </StatusMsg>
          )}
        </BrandingPanel>
      )}
    </Container>
  );
};

export default RemotionTemplateGallery;

// ────────���───────────────────────────────────────────────��────
// SECTION: Styled Components
// PURPOSE: Crystalline Swan dark-first design
// ──────────────────────────────────��──────────────────────────
const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 rgba(139, 92, 246, 0); }
  50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
`;

const Container = styled.div`
  padding: 24px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  padding: 8px 16px;
  border-radius: 20px;
  min-height: 44px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  color: ${({ $active }) => ($active ? '#E0ECF4' : 'rgba(224, 236, 244, 0.6)')};
  background: ${({ $active }) => ($active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(96, 192, 240, 0.06)')};
  border: 1px solid ${({ $active }) => ($active ? '#8B5CF6' : 'rgba(96, 192, 240, 0.1)')};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    color: #E0ECF4;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

// ─── Template Grid ────────────────────────────────────────
const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TemplateCard = styled.button<{ $selected: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  border-radius: 14px;
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $selected }) =>
    $selected ? 'rgba(139, 92, 246, 0.5)' : 'rgba(96, 192, 240, 0.08)'};
  overflow: hidden;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  ${({ $selected }) => $selected && `animation: ${pulseGlow} 2s ease-in-out infinite;`}

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const TemplatePreview = styled.div<{ $gradient: string }>`
  height: 120px;
  background: ${({ $gradient }) => $gradient};
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const PreviewIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #E0ECF4;
`;

const DurationBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  color: #60C0F0;
`;

const TemplateInfo = styled.div`
  padding: 14px;
`;

const TemplateName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 6px;
`;

const TemplateDesc = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  line-height: 1.5;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TagRow = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.08);
  color: rgba(224, 236, 244, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.08);
`;

// ─── Branding Pipeline ──────────────────────────────────
const BrandingPanel = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 14px;
  padding: 20px;
`;

const BrandingHeader = styled.div`
  margin-bottom: 20px;
`;

const BrandingTitle = styled.h3`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SelectedTemplateName = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-style: italic;
`;

const BrandingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
`;

const FieldGroup = styled.div``;

const FieldLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 6px;
`;

const BrandInput = styled.input`
  width: 100%;
  background: var(--bg-base, #030712);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 8px;
  padding: 0 12px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  min-height: 44px;
  transition: border-color 0.2s ease;

  &::placeholder { color: rgba(224, 236, 244, 0.3); }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
    border-color: #8B5CF6;
  }
`;

const BrandSelect = styled.select`
  width: 100%;
  background: var(--bg-base, #030712);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 8px;
  padding: 0 12px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  min-height: 44px;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
    border-color: #8B5CF6;
  }

  option { background: var(--bg-base, #030712); }
`;

const ColorGroup = styled.div`
  display: flex;
  gap: 16px;
`;

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ColorSwatch = styled.div<{ $color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $color }) => $color};
  border: 2px solid rgba(224, 236, 244, 0.2);
  flex-shrink: 0;
`;

// ─── Preview Strip ────────────────────────────────────────
const PreviewStrip = styled.div<{ $primary: string; $secondary: string }>`
  padding: 20px 24px;
  border-radius: 10px;
  background: linear-gradient(135deg, ${({ $primary }) => $primary} 0%, ${({ $secondary }) => $secondary} 100%);
  margin-bottom: 16px;
  text-align: center;
`;

const PreviewStripText = styled.div`
  font-size: 1.3rem;
  font-weight: 700;
  color: #E0ECF4;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  margin-bottom: 4px;
`;

const PreviewStripTagline = styled.div`
  font-size: 0.85rem;
  font-weight: 400;
  font-style: italic;
  color: rgba(224, 236, 244, 0.8);
`;

// ─── Actions ────────────────────────────────────────────
const ActionRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

const RenderButton = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0 24px;
  min-height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  color: #E0ECF4;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 14px;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $type }) =>
    $type === 'success' ? 'rgba(96, 192, 240, 0.1)' : 'rgba(201, 42, 84, 0.1)'};
  border-left: 3px solid ${({ $type }) =>
    $type === 'success' ? '#60C0F0' : '#C92A54'};
`;
