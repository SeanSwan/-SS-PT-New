/**
 * ============================================================================
 * FILE: SeedanceVideoPanel.tsx
 * PURPOSE: AI video generation panel using Seedance 2.0 (Higgsfield API)
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-06
 * PHASE: 10 — Content Studio Upgrades
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides a UI for generating exercise demos, social
 * clips, and marketing videos via Seedance 2.0. Users select a video type,
 * enter a prompt, configure duration/style, and submit generation jobs.
 *
 * HOW IT FITS: Content Studio → "AI Video" tab (Seedance 2.0).
 * Requires seedance API key configured in Settings.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SeedanceVideoPanel                               ║
 * ║  PURPOSE: Seedance 2.0 video generation UI                    ║
 * ║  OWNER: Claude Opus 4.6                                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  Film, Dumbbell, Share2, Megaphone, Sparkles,
  Play, Clock, Loader2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  PanelContainer, SectionTitle, SectionHint, OptionLabel,
  PrimaryBtn, ChipRow, Chip, MetaText,
} from './content-studio.styles';
import {
  getSeedanceJobErrorMessage,
  resolveSeedanceJobResult,
  type SeedanceJobStatus,
} from './SeedanceVideoPanel.logic';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────
type VideoCategory = 'exercise-demo' | 'social-clip' | 'marketing';
type VideoStyle = 'cinematic' | 'dynamic' | 'minimal' | 'editorial';

interface VideoJob {
  id: string; prompt: string; category: VideoCategory;
  style: VideoStyle; duration: number; status: SeedanceJobStatus;
  createdAt: string; videoUrl?: string; providerJobId?: string; error?: string;
}

const CATEGORIES: { id: VideoCategory; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: 'exercise-demo', label: 'Exercise Demo', icon: <Dumbbell size={18} />, hint: 'Exercise demonstration videos' },
  { id: 'social-clip', label: 'Social Clip', icon: <Share2 size={18} />, hint: 'Short-form for Reels / TikTok' },
  { id: 'marketing', label: 'Marketing', icon: <Megaphone size={18} />, hint: 'Promotional clips for ads' },
];

const STYLES: { id: VideoStyle; label: string }[] = [
  { id: 'cinematic', label: 'Cinematic' }, { id: 'dynamic', label: 'Dynamic' },
  { id: 'minimal', label: 'Minimal' }, { id: 'editorial', label: 'Editorial' },
];

const DURATIONS = [5, 10, 15, 30];

const PROMPTS: Record<VideoCategory, string> = {
  'exercise-demo': 'Describe the exercise — e.g., "Barbell back squat with proper form, side angle view"',
  'social-clip': 'Describe the clip — e.g., "High-energy gym montage with text overlay: Train Like a Swan"',
  'marketing': 'Describe the video — e.g., "Premium personal training studio showcase, cinematic lighting"',
};

// ─── Local Styled Components ─────────────────────────────────
const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
`;

const CategoryCard = styled.button<{ $active: boolean }>`
  all: unset; box-sizing: border-box; cursor: pointer;
  display: flex; align-items: center; gap: 12px; padding: 16px; min-height: 44px;
  border-radius: 12px;
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-elevated, #141419)'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(96, 192, 240, 0.08)'};
  color: ${({ $active }) => ($active ? '#8B5CF6' : 'var(--text-primary, #E0ECF4)')};
  transition: all 0.2s ease;
  &:hover { border-color: rgba(139, 92, 246, 0.3); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const PromptArea = styled.textarea`
  width: 100%; min-height: 100px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px; padding: 12px 16px;
  color: var(--text-primary, #E0ECF4); font-family: 'Sora', sans-serif;
  font-size: 0.85rem; line-height: 1.5; resize: vertical;
  transition: border-color 0.3s ease;
  &::placeholder { color: rgba(224, 236, 244, 0.3); }
  &:focus { outline: none; border-color: #8B5CF6; box-shadow: 0 0 12px rgba(139, 92, 246, 0.3); }
`;

const OptionsRow = styled.div`
  display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end;
`;

const OptionGroup = styled.div`
  display: flex; flex-direction: column; gap: 6px;
`;

const JobCard = styled.div<{ $status: SeedanceJobStatus }>`
  display: flex; align-items: center; gap: 14px; padding: 14px 18px;
  border-radius: 12px; background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $status }) =>
    $status === 'complete' ? 'rgba(96, 192, 240, 0.25)' :
    $status === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(96, 192, 240, 0.08)'};
`;

const JobPrompt = styled.div`
  font-size: 0.85rem; color: var(--text-primary, #E0ECF4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const StatusIcon: React.FC<{ status: SeedanceJobStatus }> = ({ status }) => {
  if (status === 'generating') return <StyledBox as={Loader2} size={18} $style={{ color: '#8B5CF6', animation: 'spin 1s linear infinite' }} />;
  if (status === 'queued') return <StyledBox as={Clock} size={18} $style={{ color: '#8B5CF6' }} />;
  if (status === 'complete') return <StyledBox as={CheckCircle2} size={18} $style={{ color: '#60C0F0' }} />;
  if (status === 'error') return <StyledBox as={AlertCircle} size={18} $style={{ color: '#ef4444' }} />;
  return null;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const SeedanceVideoPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [category, setCategory] = useState<VideoCategory>('exercise-demo');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<VideoStyle>('cinematic');
  const [duration, setDuration] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [jobs, setJobs] = useState<VideoJob[]>([]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    const jobId = `job-${Date.now()}`;
    const newJob: VideoJob = { id: jobId, prompt: prompt.trim(), category, style, duration, status: 'generating', createdAt: new Date().toISOString() };
    setJobs(prev => [newJob, ...prev]);

    try {
      const res = await authAxios.post('/api/content-studio/generate-video', { prompt: prompt.trim(), category, style, duration });
      const jobResult = resolveSeedanceJobResult(res.data?.data);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...jobResult } : j));
      setPrompt('');
    } catch (err: unknown) {
      const msg = getSeedanceJobErrorMessage(err);
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'error' as const, error: msg } : j));
    } finally { setGenerating(false); }
  }, [authAxios, prompt, category, style, duration]);

  return (
    <PanelContainer>
      <div>
        <SectionTitle>Seedance 2.0 Video Generation</SectionTitle>
        <SectionHint>Generate exercise demos, social clips, and marketing videos with AI.</SectionHint>
      </div>

      <CategoryGrid>
        {CATEGORIES.map(cat => (
          <CategoryCard key={cat.id} $active={category === cat.id} onClick={() => setCategory(cat.id)}>
            {cat.icon}
            <div>
              <StyledBox as="span" $style={{ fontFamily: "'Sora', sans-serif", fontSize: '0.85rem', fontWeight: 600 }}>{cat.label}</StyledBox>
              <StyledBox as={SectionHint} $style={{ margin: 0 }}>{cat.hint}</StyledBox>
            </div>
          </CategoryCard>
        ))}
      </CategoryGrid>

      <div>
        <OptionLabel>Video Prompt</OptionLabel>
        <PromptArea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={PROMPTS[category]} maxLength={500} />
      </div>

      <OptionsRow>
        <OptionGroup>
          <OptionLabel>Style</OptionLabel>
          <ChipRow>{STYLES.map(s => <Chip key={s.id} $active={style === s.id} $color="#60C0F0" onClick={() => setStyle(s.id)}>{s.label}</Chip>)}</ChipRow>
        </OptionGroup>
        <OptionGroup>
          <OptionLabel>Duration (sec)</OptionLabel>
          <ChipRow>{DURATIONS.map(d => <Chip key={d} $active={duration === d} $color="#60C0F0" onClick={() => setDuration(d)}><Clock size={12} /> {d}s</Chip>)}</ChipRow>
        </OptionGroup>
      </OptionsRow>

      <div>
        <StyledBox as={PrimaryBtn} onClick={handleGenerate} disabled={generating || !prompt.trim()} $style={{ height: 48, padding: '0 28px', fontSize: '0.9rem' }}>
          {generating ? <StyledBox as={Loader2} size={18} $style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18} />}
          {generating ? 'Generating...' : 'Generate Video'}
        </StyledBox>
      </div>

      {jobs.length > 0 && (
        <div>
          <SectionTitle>Recent Jobs</SectionTitle>
          <StyledBox as="div" $style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {jobs.slice(0, 10).map(job => (
              <JobCard key={job.id} $status={job.status}>
                <StyledBox as={Film} size={18} $style={{ color: '#8B5CF6', flexShrink: 0 }} />
                <StyledBox as="div" $style={{ flex: 1, minWidth: 0 }}>
                  <JobPrompt>{job.prompt}</JobPrompt>
                  <MetaText>
                    {job.category} | {job.style} | {job.duration}s
                    {job.status === 'queued' && ' | queued with provider'}
                    {job.providerJobId && ` | ${job.providerJobId}`}
                    {job.error && ` | ${job.error}`}
                  </MetaText>
                </StyledBox>
                <StatusIcon status={job.status} />
                {job.videoUrl && <StyledBox as="a" href={job.videoUrl} target="_blank" rel="noopener noreferrer" $style={{ color: '#60C0F0' }}><Play size={18} /></StyledBox>}
              </JobCard>
            ))}
          </StyledBox>
        </div>
      )}
    </PanelContainer>
  );
};

export default SeedanceVideoPanel;
