/**
 * ┌─── PANEL: Blog Writer ──────────────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: AI-assisted blog post generator with 3-step wizard  │
 * │          (topic→outline→draft), cadence guard (1x/week),     │
 * │          and draft queue for Sean's approval.                │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { FileText, ChevronRight, AlertTriangle, Clock, Check } from 'lucide-react';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  ActionButton, StatusChip, CadenceWarning, PillTabs, PillTab,
} from './marketing.styles';
import type { BlogDraft, BlogWizardStep, CADENCE_CONFIG } from './marketing.types';

// ─── Demo Data ─────────────────────────────────────────────────
const SUGGESTED_TOPICS = [
  '5 Mobility Drills Every Golfer Needs Before Tee Time',
  'Why Youth Athletes Need Periodized Training (Not Just Practice)',
  'The Swan Studios Recovery Protocol: Beyond Stretching',
  'How Personal Training Transforms Golf Performance in 8 Weeks',
  'Building a Home Flexibility Routine for Busy Professionals',
];

const DEMO_DRAFTS: BlogDraft[] = [
  { id: '1', title: 'Top 10 Exercises for Golf Power', outline: ['Intro', 'Rotational strength', 'Core stability', 'Lower body', 'Conclusion'], body: '', status: 'approved', createdAt: '2026-04-01', wordCount: 1200 },
  { id: '2', title: 'Why Every Athlete Needs a Coach', outline: ['Hook', 'Accountability', 'Form correction', 'Periodization', 'CTA'], body: '', status: 'pending_review', createdAt: '2026-04-03', wordCount: 850 },
  { id: '3', title: 'SwanStudios Client Success: 12-Week Transformation', outline: ['Before/after', 'Program overview', 'Key milestones', 'Testimonial'], body: '', status: 'draft', createdAt: '2026-04-05', wordCount: 0 },
];

// Simulate last published within this week
const lastPublished = new Date('2026-04-03');
const isWithinWeek = (Date.now() - lastPublished.getTime()) < 7 * 86400000;

// ─── Styled Components ─────────────────────────────────────────
const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 20px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
`;

const StepDot = styled.div<{ $active: boolean; $done: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Sora', sans-serif;
  background: ${({ $active, $done }) =>
    $done ? 'rgba(16, 185, 129, 0.2)' :
    $active ? 'rgba(139, 92, 246, 0.2)' :
    'rgba(96, 192, 240, 0.08)'};
  color: ${({ $active, $done }) =>
    $done ? '#10B981' : $active ? '#8B5CF6' : 'rgba(224, 236, 244, 0.4)'};
  border: 2px solid ${({ $active, $done }) =>
    $done ? '#10B981' : $active ? '#8B5CF6' : 'transparent'};
`;

const StepLabel = styled.span<{ $active: boolean }>`
  font-size: 13px;
  font-family: 'Sora', sans-serif;
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'rgba(224, 236, 244, 0.4)'};
`;

const TopicCard = styled.button<{ $selected: boolean }>`
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid ${({ $selected }) =>
    $selected ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-subtle, rgba(96, 192, 240, 0.08))'};
  background: ${({ $selected }) =>
    $selected ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-elevated, #141419)'};
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const OutlineList = styled.ol`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const OutlineItem = styled.li`
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.08));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const OutlineNum = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
  min-width: 20px;
`;

const DraftPreview = styled.div`
  padding: 20px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.08));
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary, #E0ECF4);
  min-height: 200px;
  white-space: pre-wrap;
`;

const DraftItem = styled.div<{ $active?: boolean }>`
  padding: 10px 12px;
  border-radius: 8px;
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.08)' : 'transparent'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-subtle, rgba(96, 192, 240, 0.06))'};
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 6px;

  &:hover { background: rgba(139, 92, 246, 0.05); }
`;

const DraftTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 2px;
`;

const DraftMeta = styled.div`
  font-size: 11px;
  font-family: 'Fira Code', monospace;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
  display: flex;
  align-items: center;
  gap: 8px;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
`;

const STEPS: { id: BlogWizardStep; label: string }[] = [
  { id: 'topic', label: 'Topic' },
  { id: 'outline', label: 'Outline' },
  { id: 'draft', label: 'Draft' },
];

const DEMO_OUTLINE = [
  'Introduction — Hook with relatable problem',
  'Section 1 — Core concept with evidence',
  'Section 2 — Practical application',
  'Section 3 — SwanStudios approach',
  'Client success example',
  'Call to action — Book a session',
];

const DEMO_BODY = `# 5 Mobility Drills Every Golfer Needs Before Tee Time

Great golf performance starts before you even step on the course. These five mobility drills take just 10 minutes and can dramatically improve your swing mechanics, reduce injury risk, and help you play your best round.

## 1. Thoracic Spine Rotation
The golf swing demands significant rotational mobility. Start on all fours, place one hand behind your head, and rotate your chest toward the ceiling. Hold 2 seconds, repeat 8 times each side.

## 2. Hip 90/90 Stretch
Sit with both legs at 90-degree angles. Lean forward over the front leg, feeling the stretch in the hip. This directly improves your hip rotation during the backswing.

## 3. Lat Stretch with Side Bend
Reach overhead and lean to one side. This opens up the lats and obliques — critical for a full, powerful swing arc.

...

Ready to take your golf fitness to the next level? Book a session with SwanStudios and we'll build a personalized program for your game.`;

// ─── Component ─────────────────────────────────────────────────
const BlogWriterPanel: React.FC = () => {
  const [step, setStep] = useState<BlogWizardStep>('topic');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [loading, setLoading] = useState(false);

  const stepIdx = STEPS.findIndex(s => s.id === step);

  const handleNext = () => {
    if (step === 'topic' && selectedTopic) {
      setLoading(true);
      setTimeout(() => { setLoading(false); setStep('outline'); }, 800);
    } else if (step === 'outline') {
      setLoading(true);
      setTimeout(() => { setLoading(false); setStep('draft'); }, 1200);
    }
  };

  return (
    <Layout>
      <MarketingCard>
        <CardHeader>
          <HeaderLeft>
            <IconWrap $bg={hexAlpha(CHART_COLORS.wingPurple, 0.15)} $color={CHART_COLORS.wingPurple}>
              <FileText size={18} />
            </IconWrap>
            <div>
              <CardTitle>Blog Writer</CardTitle>
              <CardSubtitle>Swan Coach content generation</CardSubtitle>
            </div>
          </HeaderLeft>
        </CardHeader>

        {isWithinWeek && (
          <CadenceWarning>
            <AlertTriangle size={16} />
            Blog cadence limit reached (1/week). Next slot: {new Date(lastPublished.getTime() + 7 * 86400000).toLocaleDateString()}
          </CadenceWarning>
        )}

        <StepIndicator>
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <StepDot $active={i === stepIdx} $done={i < stepIdx}>
                {i < stepIdx ? <Check size={14} /> : i + 1}
              </StepDot>
              <StepLabel $active={i === stepIdx}>{s.label}</StepLabel>
              {i < STEPS.length - 1 && <ChevronRight size={14} style={{ opacity: 0.3 }} />}
            </React.Fragment>
          ))}
        </StepIndicator>

        {step === 'topic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SUGGESTED_TOPICS.map(topic => (
              <TopicCard key={topic} $selected={selectedTopic === topic} onClick={() => setSelectedTopic(topic)}>
                {topic}
              </TopicCard>
            ))}
          </div>
        )}

        {step === 'outline' && (
          <OutlineList>
            {DEMO_OUTLINE.map((item, i) => (
              <OutlineItem key={i}><OutlineNum>{i + 1}.</OutlineNum> {item}</OutlineItem>
            ))}
          </OutlineList>
        )}

        {step === 'draft' && (
          <DraftPreview>{DEMO_BODY}</DraftPreview>
        )}

        <BtnRow>
          {step !== 'topic' && (
            <ActionButton $variant="secondary" onClick={() => setStep(STEPS[stepIdx - 1].id)}>
              Back
            </ActionButton>
          )}
          {step !== 'draft' ? (
            <ActionButton onClick={handleNext} disabled={step === 'topic' && !selectedTopic || loading}>
              {loading ? 'Generating...' : step === 'topic' ? 'Generate Outline' : 'Generate Draft'}
            </ActionButton>
          ) : (
            <ActionButton disabled={isWithinWeek}>
              Submit for Approval
            </ActionButton>
          )}
        </BtnRow>
      </MarketingCard>

      <div>
        <MarketingCard>
          <CardHeader>
            <HeaderLeft>
              <IconWrap $bg="rgba(198, 168, 75, 0.12)" $color="#C6A84B">
                <Clock size={18} />
              </IconWrap>
              <div>
                <CardTitle>Draft Queue</CardTitle>
                <CardSubtitle>{DEMO_DRAFTS.length} drafts</CardSubtitle>
              </div>
            </HeaderLeft>
          </CardHeader>
          {DEMO_DRAFTS.map(d => (
            <DraftItem key={d.id}>
              <DraftTitle>{d.title}</DraftTitle>
              <DraftMeta>
                <StatusChip $status={d.status}>{d.status.replace('_', ' ')}</StatusChip>
                {d.wordCount > 0 && <span>{d.wordCount} words</span>}
              </DraftMeta>
            </DraftItem>
          ))}
        </MarketingCard>
      </div>
    </Layout>
  );
};

export default BlogWriterPanel;
