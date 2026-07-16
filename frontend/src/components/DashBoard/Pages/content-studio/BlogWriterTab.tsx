/**
 * ============================================================================
 * FILE: BlogWriterTab.tsx
 * PURPOSE: SEO-optimized blog writer inside Content Studio
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-06
 * PHASE: 10 — Content Studio Upgrades
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Three-step blog creation wizard (Topic → Outline → Draft)
 * with SEO keyword integration, cadence guard (1x/week max), and draft queue.
 *
 * HOW IT FITS: Content Studio → "Blog Writer" tab.
 * Cadence rule: blog 1x/week, Sean approves before publish.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BlogWriterTab                                     ║
 * ║  PURPOSE: Long-form blog post creation with SEO               ║
 * ║  OWNER: Claude Opus 4.6                                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  FileText, ChevronRight, Search, Tag, Clock,
  Loader2, CheckCircle2, AlertTriangle, Send,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import {
  SplitLayout, MainPanel, SidePanel, SectionTitle, MetaText,
  StudioInput, StudioTextArea, PrimaryBtn, SecondaryBtn, ActionRow,
  ChipRow, Chip, StudioCard, StatusChip, WarningBanner,
} from './content-studio.styles';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────
type WizardStep = 'topic' | 'outline' | 'draft';
type DraftStatus = 'draft' | 'pending_review' | 'approved' | 'published';

interface BlogDraft {
  id: string;
  title: string;
  status: DraftStatus;
  wordCount: number;
  keywords: string[];
  createdAt: string;
}

const SUGGESTED_TOPICS = [
  'Benefits of Personal Training for Golf Performance',
  '5 Exercises Every Desk Worker Needs',
  'How Functional Training Prevents Injury',
  'Building Strength After 40: A Complete Guide',
  'The Science Behind Progressive Overload',
  'Stretching vs Static Holds: What Works Best',
];

const KEYWORD_PRESETS = [
  'personal training', 'golf fitness', 'weight loss', 'strength training',
  'injury prevention', 'functional fitness', 'stretching', 'progressive overload',
];

const STEP_LABELS: { step: WizardStep; label: string; num: number }[] = [
  { step: 'topic', label: 'Topic & Keywords', num: 1 },
  { step: 'outline', label: 'Outline', num: 2 },
  { step: 'draft', label: 'Draft', num: 3 },
];

const STATUS_VARIANT: Record<DraftStatus, 'cyan' | 'gold' | 'purple' | 'muted'> = {
  published: 'cyan', approved: 'gold', pending_review: 'purple', draft: 'muted',
};

// ─── Local Styled Components ─────────────────────────────────
const StepBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`;

const StepDot = styled.div<{ $active: boolean; $done: boolean }>`
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Fira Code', monospace; font-size: 0.7rem; font-weight: 700;
  background: ${({ $active, $done }) => $done ? 'rgba(96, 192, 240, 0.2)' : $active ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg-elevated, #141419)'};
  color: ${({ $active, $done }) => $done ? '#60C0F0' : $active ? '#8B5CF6' : 'rgba(224, 236, 244, 0.4)'};
  border: 1px solid ${({ $active, $done }) => $done ? 'rgba(96, 192, 240, 0.3)' : $active ? 'rgba(139, 92, 246, 0.3)' : 'rgba(96, 192, 240, 0.08)'};
`;

const StepLabel = styled.span<{ $active: boolean }>`
  font-family: 'Sora', sans-serif; font-size: 0.8rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'rgba(224, 236, 244, 0.5)'};
`;

const StepConnector = styled.div`
  width: 20px; height: 1px; background: rgba(96, 192, 240, 0.15);
`;

const TopicBtn = styled.button`
  all: unset; box-sizing: border-box; cursor: pointer; width: 100%;
  text-align: left; font-size: 0.8rem; padding: 10px 14px; min-height: 44px;
  border-radius: 10px; background: var(--bg-elevated, #141419);
  border: 1px solid rgba(96, 192, 240, 0.08); color: var(--text-primary, #E0ECF4);
  transition: all 0.2s ease; display: flex; align-items: center; gap: 8px;
  &:hover { border-color: rgba(139, 92, 246, 0.3); }
  &:focus-visible { outline: 2px solid #60C0F0; outline-offset: 2px; }
`;

const DraftTitle = styled.div`
  font-size: 0.8rem; font-weight: 600; color: var(--text-primary, #E0ECF4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const BlogWriterTab: React.FC = () => {
  const { authAxios } = useAuth();
  const [step, setStep] = useState<WizardStep>('topic');
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [outline, setOutline] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<BlogDraft[]>([
    { id: '1', title: 'Benefits of Personal Training for Golf Performance', status: 'pending_review', wordCount: 1240, keywords: ['golf fitness', 'personal training'], createdAt: '2026-04-01' },
    { id: '2', title: 'How Functional Training Prevents Injury', status: 'draft', wordCount: 890, keywords: ['functional training', 'injury prevention'], createdAt: '2026-03-28' },
  ]);

  const stepIndex = STEP_LABELS.findIndex(s => s.step === step);

  const toggleKeyword = (kw: string) => {
    setKeywords(prev => prev.includes(kw) ? prev.filter(k => k !== kw) : [...prev, kw]);
  };

  const addCustomKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) { setKeywords(prev => [...prev, kw]); setKeywordInput(''); }
  };

  const handleGenerateOutline = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await authAxios.post('/api/content-studio/blog/outline', { title, keywords });
      setOutline(res.data?.data?.outline || '## Introduction\n\n## Main Points\n\n## Conclusion');
    } catch { setOutline('## Introduction\n\n## Key Points\n\n## Practical Application\n\n## Conclusion'); }
    finally { setGenerating(false); setStep('outline'); }
  }, [authAxios, title, keywords]);

  const handleGenerateDraft = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await authAxios.post('/api/content-studio/blog/draft', { title, keywords, outline });
      setDraftContent(res.data?.data?.content || '');
    } catch { setDraftContent(`# ${title}\n\n${outline}\n\n[Draft generation pending — Swan Coach will expand this outline.]`); }
    finally { setGenerating(false); setStep('draft'); }
  }, [authAxios, title, keywords, outline]);

  const handleSaveDraft = useCallback(async () => {
    const wordCount = draftContent.split(/\s+/).filter(Boolean).length;
    setDrafts(prev => [{ id: `d-${Date.now()}`, title: title || 'Untitled', status: 'pending_review', wordCount, keywords, createdAt: new Date().toISOString().split('T')[0] }, ...prev]);
    try { await authAxios.post('/api/content-studio/blog/save', { title, keywords, outline, content: draftContent }); } catch { /* saved locally */ }
    setTitle(''); setKeywords([]); setOutline(''); setDraftContent(''); setStep('topic');
  }, [authAxios, title, keywords, outline, draftContent]);

  const hasRecentPublish = drafts.some(d => d.status === 'published' && (Date.now() - new Date(d.createdAt).getTime()) / 86400000 < 7);

  return (
    <SplitLayout>
      <MainPanel>
        <StepBar>
          {STEP_LABELS.map((s, i) => (
            <React.Fragment key={s.step}>
              {i > 0 && <StepConnector />}
              <StepDot $active={s.step === step} $done={i < stepIndex}>
                {i < stepIndex ? <CheckCircle2 size={14} /> : s.num}
              </StepDot>
              <StepLabel $active={s.step === step}>{s.label}</StepLabel>
            </React.Fragment>
          ))}
        </StepBar>

        {step === 'topic' && (
          <>
            <div>
              <SectionTitle>Blog Topic</SectionTitle>
              <StyledBox as={StudioInput} value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter your blog post title or topic..." $style={{ marginTop: 8 }} />
            </div>
            <div>
              <SectionTitle>SEO Keywords</SectionTitle>
              <StyledBox as={StudioInput} value={keywordInput} onChange={e => setKeywordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomKeyword()} placeholder="Add keyword and press Enter..." $style={{ marginTop: 8 }} />
              <StyledBox as={ChipRow} $style={{ marginTop: 8 }}>
                {KEYWORD_PRESETS.map(kw => (
                  <Chip key={kw} $active={keywords.includes(kw)} $color="#C6A84B" onClick={() => toggleKeyword(kw)}>
                    <Tag size={10} /> {kw}
                  </Chip>
                ))}
              </StyledBox>
              {keywords.length > 0 && <StyledBox as={MetaText} $style={{ marginTop: 8 }}>Selected: {keywords.join(', ')}</StyledBox>}
            </div>
            <ActionRow>
              <PrimaryBtn onClick={handleGenerateOutline} disabled={!title.trim() || generating}>
                {generating ? <StyledBox as={Loader2} size={16} $style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronRight size={16} />}
                Generate Outline
              </PrimaryBtn>
            </ActionRow>
          </>
        )}

        {step === 'outline' && (
          <>
            <SectionTitle>Post Outline — {title}</SectionTitle>
            <StyledBox as={StudioTextArea} value={outline} onChange={e => setOutline(e.target.value)} $style={{ minHeight: 200 }} />
            <ActionRow>
              <SecondaryBtn onClick={() => setStep('topic')}>Back</SecondaryBtn>
              <PrimaryBtn onClick={handleGenerateDraft} disabled={!outline.trim() || generating}>
                {generating ? <StyledBox as={Loader2} size={16} $style={{ animation: 'spin 1s linear infinite' }} /> : <ChevronRight size={16} />}
                Generate Draft
              </PrimaryBtn>
            </ActionRow>
          </>
        )}

        {step === 'draft' && (
          <>
            <SectionTitle>Draft — {title}</SectionTitle>
            <StyledBox as={StudioTextArea} value={draftContent} onChange={e => setDraftContent(e.target.value)} $style={{ minHeight: 300 }} />
            <MetaText>{draftContent.split(/\s+/).filter(Boolean).length} words · {keywords.length} keywords</MetaText>
            {hasRecentPublish && (
              <WarningBanner>
                <StyledBox as={AlertTriangle} size={16} $style={{ color: '#C6A84B', flexShrink: 0 }} />
                A post was published this week. Cadence limit: 1x/week.
              </WarningBanner>
            )}
            <ActionRow>
              <SecondaryBtn onClick={() => setStep('outline')}>Back</SecondaryBtn>
              <PrimaryBtn onClick={handleSaveDraft}><Send size={16} /> Save for Review</PrimaryBtn>
            </ActionRow>
          </>
        )}
      </MainPanel>

      <SidePanel $width={260}>
        {step === 'topic' && (
          <>
            <StyledBox as={SectionTitle} $style={{ fontSize: '0.85rem' }}><Search size={14} /> Topic Suggestions</StyledBox>
            {SUGGESTED_TOPICS.map(topic => (
              <TopicBtn key={topic} onClick={() => setTitle(topic)}>
                <StyledBox as={FileText} size={14} $style={{ color: '#8B5CF6', flexShrink: 0 }} /> {topic}
              </TopicBtn>
            ))}
          </>
        )}
        <StyledBox as={SectionTitle} $style={{ fontSize: '0.85rem', marginTop: step === 'topic' ? 16 : 0 }}>
          <Clock size={14} /> Draft Queue ({drafts.length})
        </StyledBox>
        {drafts.map(d => (
          <StudioCard key={d.id}>
            <DraftTitle>{d.title}</DraftTitle>
            <MetaText>
              <StatusChip $variant={STATUS_VARIANT[d.status]}>{d.status.replace('_', ' ')}</StatusChip>
              {d.wordCount} words · {d.createdAt}
            </MetaText>
          </StudioCard>
        ))}
      </SidePanel>
    </SplitLayout>
  );
};

export default BlogWriterTab;
