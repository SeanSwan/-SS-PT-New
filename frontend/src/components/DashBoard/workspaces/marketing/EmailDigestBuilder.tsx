/**
 * ┌─── PANEL: Email Digest Builder ─────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Compose client newsletters with templates,          │
 * │          personalization tokens, cadence guard (2x/month).   │
 * │          Sean approves before sending.                       │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Mail, AlertTriangle, Plus, Trash2, Eye, Edit3 } from 'lucide-react';
import { CHART_COLORS, hexAlpha } from '../../../../components/Charts/chartTheme';
import {
  MarketingCard, CardHeader, HeaderLeft, IconWrap, CardTitle, CardSubtitle,
  ActionButton, CadenceWarning,
} from './marketing.styles';
import type { EmailTemplate, EmailBlock, EmailBlockType } from './marketing.types';
import { StyledBox } from '@/components/ui/StyledBox';

// ─── Demo Data ─────────────────────────────────────────────────
const TEMPLATES: EmailTemplate[] = [
  { id: 'recap', name: 'Monthly Recap', description: 'Summarize client achievements and upcoming plans', defaultBlocks: [
    { id: 'h1', type: 'heading', content: 'Your Monthly Training Recap' },
    { id: 'p1', type: 'paragraph', content: 'Hi {{firstName}}, here\'s what you accomplished this month...' },
    { id: 'c1', type: 'cta', content: 'Book Your Next Session' },
  ]},
  { id: 'announce', name: 'New Class Announcement', description: 'Announce new group sessions or programs', defaultBlocks: [
    { id: 'h1', type: 'heading', content: 'Exciting New Class Starting Soon!' },
    { id: 'p1', type: 'paragraph', content: 'We\'re launching a brand new program designed to...' },
    { id: 'c1', type: 'cta', content: 'Reserve Your Spot' },
  ]},
  { id: 'success', name: 'Client Success Story', description: 'Share a transformation story to inspire clients', defaultBlocks: [
    { id: 'h1', type: 'heading', content: 'Client Spotlight: A 12-Week Journey' },
    { id: 't1', type: 'testimonial', content: '"SwanStudios changed my approach to fitness completely." — Client' },
    { id: 'p1', type: 'paragraph', content: 'Here\'s how consistency and expert coaching delivered results...' },
    { id: 'c1', type: 'cta', content: 'Start Your Transformation' },
  ]},
  { id: 'holiday', name: 'Holiday Special', description: 'Seasonal promotion or limited-time offer', defaultBlocks: [
    { id: 'h1', type: 'heading', content: 'Limited Time: Holiday Training Special' },
    { id: 'p1', type: 'paragraph', content: 'This season, invest in yourself with our exclusive package...' },
    { id: 'c1', type: 'cta', content: 'Claim Your Offer' },
  ]},
];

const TOKENS = ['{{firstName}}', '{{sessionsRemaining}}', '{{nextSession}}', '{{trainerName}}'];

// Simulate 1 email sent this month
const emailsSentThisMonth = 1;
const maxPerMonth = 2;
const cadenceReached = emailsSentThisMonth >= maxPerMonth;

// ─── Styled Components ─────────────────────────────────────────
const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;

  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const TemplateCard = styled.button<{ $selected: boolean }>`
  text-align: left;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid ${({ $selected }) =>
    $selected ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-subtle, rgba(96, 192, 240, 0.08))'};
  background: ${({ $selected }) =>
    $selected ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-elevated, #141419)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 44px;

  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

const TplName = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
`;

const TplDesc = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

const InputRow = styled.div`
  margin-bottom: 12px;
`;

const Label = styled.label`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  min-height: 44px;

  &:focus { border-color: var(--accent-secondary, #8B5CF6); }
  &::placeholder { color: var(--text-placeholder, rgba(224, 236, 244, 0.5)); } /* placeholder intentionally dimmer */
`;

const CharHint = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  margin-left: 8px;
`;

const BlockList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`;

const BlockItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.08));
`;

const BlockType = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.1);
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
  margin-top: 2px;
`;

const BlockContent = styled.div`
  flex: 1;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  line-height: 1.5;
`;

const RemoveBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--text-muted-icon, rgba(224, 236, 244, 0.85));
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { color: #EF4444; }
`;

const TokenRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const TokenChip = styled.button`
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  cursor: pointer;
  min-height: 36px;
  transition: all 0.15s;

  &:hover { background: rgba(96, 192, 240, 0.08); }
`;

const CadenceMeter = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PreviewPane = styled.div`
  padding: 20px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.08));
  font-family: 'Sora', sans-serif;
  min-height: 300px;
`;

const PreviewH = styled.h2`
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 12px;
`;

const PreviewP = styled.p`
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 12px;
`;

const PreviewCTA = styled.div`
  display: inline-block;
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--accent-primary, #60C0F0);
  color: #0A0A0F;
  font-weight: 700;
  font-size: 14px;
  margin: 8px 0;
`;

const PreviewQuote = styled.blockquote`
  border-left: 3px solid ${CHART_COLORS.gildedFern};
  padding-left: 16px;
  font-style: italic;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  margin: 12px 0;
`;

const ToggleRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? '#8B5CF6' : 'rgba(96,192,240,0.08)'};
  background: ${({ $active }) => $active ? 'rgba(139,92,246,0.1)' : 'transparent'};
  color: ${({ $active }) => $active ? '#8B5CF6' : 'rgba(224,236,244,0.85)'};
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
`;

// ─── Component ─────────────────────────────────────────────────
const EmailDigestBuilder: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('recap');
  const [subject, setSubject] = useState('Your Monthly Training Recap — SwanStudios');
  const [preheader, setPreheader] = useState('See what you accomplished this month and what\'s next');
  const [blocks, setBlocks] = useState<EmailBlock[]>(TEMPLATES[0].defaultBlocks);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const handleTemplateSelect = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl.id);
    setBlocks(tpl.defaultBlocks);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const addBlock = (type: EmailBlockType) => {
    const id = `${type}-${Date.now()}`;
    const defaults: Record<EmailBlockType, string> = {
      heading: 'New Section',
      paragraph: 'Add your content here...',
      cta: 'Call to Action',
      testimonial: '"Client testimonial here..." — Client Name',
    };
    setBlocks(prev => [...prev, { id, type, content: defaults[type] }]);
  };

  return (
    <>
      {cadenceReached && (
        <CadenceWarning>
          <AlertTriangle size={16} />
          Email cadence limit reached ({emailsSentThisMonth}/{maxPerMonth} this month). Next slot available next month.
        </CadenceWarning>
      )}

      <CadenceMeter>
        <Mail size={14} />
        Emails sent this month: {emailsSentThisMonth}/{maxPerMonth}
      </CadenceMeter>

      <TemplateGrid>
        {TEMPLATES.map(tpl => (
          <TemplateCard key={tpl.id} $selected={selectedTemplate === tpl.id} onClick={() => handleTemplateSelect(tpl)}>
            <TplName>{tpl.name}</TplName>
            <TplDesc>{tpl.description}</TplDesc>
          </TemplateCard>
        ))}
      </TemplateGrid>

      <Grid>
        <MarketingCard>
          <CardHeader>
            <HeaderLeft>
              <IconWrap $bg={hexAlpha(CHART_COLORS.gildedFern, 0.15)} $color={CHART_COLORS.gildedFern}>
                <Mail size={18} />
              </IconWrap>
              <div>
                <CardTitle>Compose Email</CardTitle>
                <CardSubtitle>Template: {TEMPLATES.find(t => t.id === selectedTemplate)?.name}</CardSubtitle>
              </div>
            </HeaderLeft>
          </CardHeader>

          <InputRow>
            <Label htmlFor="digest-subject">Subject Line <CharHint>{subject.length}/60 ideal</CharHint></Label>
            <Input id="digest-subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
          </InputRow>

          <InputRow>
            <Label htmlFor="digest-preheader">Preheader <CharHint>{preheader.length}/100 ideal</CharHint></Label>
            <Input id="digest-preheader" value={preheader} onChange={e => setPreheader(e.target.value)} placeholder="Preview text..." />
          </InputRow>

          <Label as="h3">Personalization Tokens</Label>
          <TokenRow>
            {TOKENS.map(token => (
              <TokenChip key={token} onClick={() => navigator.clipboard?.writeText(token)} title="Click to copy">
                {token}
              </TokenChip>
            ))}
          </TokenRow>

          <Label as="h3">Content Blocks</Label>
          <BlockList>
            {blocks.map(block => (
              <BlockItem key={block.id}>
                <BlockType>{block.type}</BlockType>
                <BlockContent>{block.content}</BlockContent>
                <RemoveBtn onClick={() => removeBlock(block.id)} aria-label="Remove block">
                  <Trash2 size={14} />
                </RemoveBtn>
              </BlockItem>
            ))}
          </BlockList>

          <StyledBox as="div" $style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {(['heading', 'paragraph', 'cta', 'testimonial'] as EmailBlockType[]).map(type => (
              <StyledBox as={ActionButton} key={type} $variant="secondary" onClick={() => addBlock(type)} $style={{ fontSize: 12, padding: '6px 12px' }}>
                <Plus size={12} /> {type}
              </StyledBox>
            ))}
          </StyledBox>

          <ActionButton disabled={cadenceReached}>
            {cadenceReached ? 'Cadence Limit Reached' : 'Schedule Send (Pending Approval)'}
          </ActionButton>
        </MarketingCard>

        <div>
          <ToggleRow>
            <ToggleBtn $active={mode === 'edit'} onClick={() => setMode('edit')}>
              <Edit3 size={14} /> Edit
            </ToggleBtn>
            <ToggleBtn $active={mode === 'preview'} onClick={() => setMode('preview')}>
              <Eye size={14} /> Preview
            </ToggleBtn>
          </ToggleRow>

          <PreviewPane>
            {blocks.map(block => {
              switch (block.type) {
                case 'heading': return <PreviewH key={block.id}>{block.content}</PreviewH>;
                case 'paragraph': return <PreviewP key={block.id}>{block.content}</PreviewP>;
                case 'cta': return <PreviewCTA key={block.id}>{block.content}</PreviewCTA>;
                case 'testimonial': return <PreviewQuote key={block.id}>{block.content}</PreviewQuote>;
                default: return null;
              }
            })}
          </PreviewPane>
        </div>
      </Grid>
    </>
  );
};

export default EmailDigestBuilder;
