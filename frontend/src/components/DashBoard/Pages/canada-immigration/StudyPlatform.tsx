/**
 * StudyPlatform.tsx  v2.0
 * ──────────────────────────────────────────────────────────────────
 * Module 5: Study Hub — IELTS Target Tracker, French/TEF Target Tracker,
 * AI Certifications (with honest framing), Score History chart,
 * Study Progression Timeline, and study session logging.
 *
 * Design System: Enchanted Apex — Crystalline Swan (Gemini 3.1 Pro)
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  BookOpen,
  Award,
  BarChart3,
  Languages,
  AlertTriangle,
  ExternalLink,
  Clock,
  DollarSign,
  Target,
  Calendar,
  ChevronRight,
  GraduationCap,
  Zap,
} from 'lucide-react';
import type { StudySession } from './CanadaImmigrationTab';

/* ────────── Props ────────── */

interface Props {
  studySessions: StudySession[];
  addStudySession: (session: Omit<StudySession, 'id' | 'date'>) => Promise<void>;
}

/* ────────── Data ────────── */

const IELTS_TIPS = {
  reading: [
    'Skim passages first — focus on headings, first sentences, and keywords.',
    'Practice TRUE / FALSE / NOT GIVEN by underlining evidence in the passage.',
    'Time yourself: 20 minutes per passage, 3 passages total (60 min).',
    'For matching headings, eliminate the easiest matches first.',
  ],
  writing: [
    'Task 1: Describe the overall trend FIRST, then key details. ~150 words.',
    'Task 2: Use a 4-paragraph structure — intro, body 1, body 2, conclusion.',
    'Use linking words: Furthermore, However, In contrast, Consequently.',
    'Aim for a mix of simple and complex sentences for band 7+.',
  ],
  listening: [
    'Read questions before audio starts — predict answer types.',
    'Write answers as you hear them; do not wait.',
    'Watch for traps: speaker corrects themselves (first answer is wrong).',
    'Practice with podcasts at 1.25x speed for real-test comfort.',
  ],
  speaking: [
    "Part 1: Answer in 2-3 sentences. Extend naturally, don't give one-word answers.",
    'Part 2: Use the 1-minute prep wisely — jot down keywords, not full sentences.',
    'Part 3: Give opinion + reason + example for band 7+ responses.',
    'Paraphrase the question in your answer to show vocabulary range.',
  ],
};

const IELTS_TARGETS = [
  { skill: 'Listening', target: '8.0', icon: '🎧' },
  { skill: 'Reading', target: '7.0', icon: '📖' },
  { skill: 'Writing', target: '7.0', icon: '✍️' },
  { skill: 'Speaking', target: '7.0', icon: '🗣️' },
];

const IELTS_RESOURCES = [
  { name: 'British Council Practice Test', cost: 'FREE', description: 'Full practice tests, closest to real exam format' },
  { name: 'IELTS Online Tests', cost: 'FREE', description: 'Computer-based format with AI scoring feedback' },
  { name: 'IELTS Test Fee', cost: '~$300/attempt', description: 'Test centers in LA, Irvine, OC area. Results 3-5 days' },
];

const FRENCH_BENEFITS = [
  { level: 'NCLC 7+ all 4 skills + CLB 5+', benefit: '+50 additional CRS points' },
  { level: 'NCLC 5+ (listening + speaking)', benefit: 'Francophone Mobility Work Permit (NO LMIA)' },
  { level: 'NCLC 7+ all 4 skills', benefit: 'French-category Express Entry draws (cutoffs ~379 vs 500+ general)' },
];

const FRENCH_TIMELINE = [
  { months: 'Months 1-3', activity: 'Duolingo (free) + Pimsleur ($15/mo) daily', detail: 'Build foundation, daily habit. ~$45 total' },
  { months: 'Months 4-8', activity: 'Add iTalki tutoring (~$10-15/session)', detail: 'Speaking practice with native speakers' },
  { months: 'Months 9-12', activity: 'TEF Canada prep course + practice tests', detail: 'Exam-specific strategies. Montreal = forced immersion accelerates this' },
];

const FRENCH_VOCAB = [
  { word: 'Bonjour', meaning: 'Hello / Good day', example: 'Bonjour, comment allez-vous?' },
  { word: 'Merci', meaning: 'Thank you', example: 'Merci beaucoup pour votre aide.' },
  { word: "S'il vous plait", meaning: 'Please (formal)', example: "Un cafe, s'il vous plait." },
  { word: 'Travailler', meaning: 'To work', example: 'Je travaille a Toronto.' },
  { word: 'Comprendre', meaning: 'To understand', example: 'Je comprends le francais.' },
  { word: 'Apprendre', meaning: 'To learn', example: "J'apprends le francais." },
];

const AI_CERTS = [
  {
    num: 1,
    name: 'IBM Generative AI Engineering',
    platform: 'Coursera',
    cost: '~$150',
    time: '2-3 mo',
    difficulty: 'Beginner' as const,
    why: 'Aligns with LLM/RAG/agent development work',
    link: 'https://www.coursera.org/professional-certificates/ai-engineer',
    topics: ['Generative AI', 'LLMs', 'RAG', 'Prompt Engineering', 'LangChain'],
  },
  {
    num: 2,
    name: 'Azure AI Engineer (AI-102)',
    platform: 'Microsoft Learn',
    cost: '$165 exam',
    time: '3-4 mo',
    difficulty: 'Moderate' as const,
    why: 'Microsoft dominates Canadian enterprise. Free prep. $120K-$180K CAD roles',
    link: 'https://learn.microsoft.com/en-us/certifications/azure-ai-engineer/',
    topics: ['Azure Cognitive Services', 'Azure ML', 'NLP', 'Computer Vision', 'Conversational AI'],
  },
  {
    num: 3,
    name: 'AWS AI Practitioner',
    platform: 'AWS',
    cost: '$100 exam',
    time: '2-4 wks',
    difficulty: 'Beginner' as const,
    why: 'Quick credibility. Business + technical AI bridge',
    link: 'https://aws.amazon.com/certification/certified-ai-practitioner/',
    topics: ['AWS AI Services', 'ML Concepts', 'Responsible AI', 'Business Applications'],
  },
  {
    num: 0,
    name: 'Google Professional ML Engineer',
    platform: 'Google Cloud',
    cost: '$200 exam',
    time: '3-6 mo',
    difficulty: 'Advanced' as const,
    why: 'Top-tier. Only if going deep. Not required.',
    link: 'https://cloud.google.com/certification/machine-learning-engineer',
    topics: ['Vertex AI', 'BigQuery ML', 'TensorFlow on GCP', 'ML Pipelines', 'AutoML'],
  },
];

const STUDY_PROGRESSION = [
  { period: 'Phase 0 (Now)', items: ['Take free IELTS practice test', 'Start Duolingo French (free, daily)'], color: '#ef4444' },
  { period: 'Months 1-3', items: ['Book & take IELTS (both spouses, ~$300 each)', 'Start IBM GenAI cert ($49/mo)', 'Get GED ($120-150)'], color: '#8B5CF6' },
  { period: 'Months 4-6', items: ['iTalki French tutoring begins', 'Azure AI-102 exam ($165)', 'Add Pimsleur ($15/mo)'], color: '#60C0F0' },
  { period: 'Months 7-12', items: ['TEF Canada prep intensive', 'Take TEF exam (target NCLC 7, +50 CRS)'], color: '#C6A84B' },
  { period: 'Months 13-24', items: ['Canadian work experience building', 'Update Express Entry with new scores'], color: '#22C55E' },
];

const STUDY_CATEGORIES = [
  { value: 'ielts', label: 'IELTS' },
  { value: 'french', label: 'French / TEF' },
  { value: 'ai_cert', label: 'AI Certification' },
  { value: 'other', label: 'Other' },
];

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulseGold = keyframes`
  0%, 100% { border-color: rgba(198, 168, 75, 0.4); }
  50% { border-color: rgba(198, 168, 75, 0.7); }
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
`;

const SubTabBar = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const SubTab = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
  background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.25)' : 'rgba(0, 48, 128, 0.3)')};
  color: ${(p) => (p.$active ? '#E0ECF4' : 'rgba(224,236,244,0.5)')};
  border: 1px solid ${(p) => (p.$active ? 'rgba(139,92,246,0.3)' : 'transparent')};

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    color: #E0ECF4;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const GlassCard = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    width: 20px;
    height: 20px;
    color: #60C0F0;
    flex-shrink: 0;
  }
`;

const TipsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TipCard = styled.div`
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: rgba(224, 236, 244, 0.8);
  line-height: 1.5;
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #60C0F0;
  margin: 0 0 10px;
  text-transform: capitalize;
`;

/* ── Reality Check Banner ── */

const RealityBanner = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-left: 4px solid #C6A84B;
  border-radius: 0 16px 16px 0;
  padding: 20px 24px;
  margin-bottom: 24px;
  animation: ${pulseGold} 3s ease-in-out infinite;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const BannerTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: #C6A84B;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`;

const BannerText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: rgba(224, 236, 244, 0.8);
  line-height: 1.6;
  margin: 0 0 8px;

  &:last-child { margin-bottom: 0; }
`;

const GoldHighlight = styled.span`
  color: #C6A84B;
  font-weight: 700;
`;

const IceHighlight = styled.span`
  color: #60C0F0;
  font-weight: 700;
`;

/* ── Data Table ── */

const DataTable = styled.div`
  width: 100%;
  overflow-x: auto;
  margin: 16px 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(96,192,240,0.2) transparent;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 2px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  min-width: 580px;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 14px;
  background: rgba(96, 192, 240, 0.1);
  color: #60C0F0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;

  &:first-child { border-radius: 8px 0 0 8px; }
  &:last-child { border-radius: 0 8px 8px 0; }
`;

const Td = styled.td<{ $mono?: boolean }>`
  padding: 10px 14px;
  background: rgba(0, 32, 96, 0.3);
  color: rgba(224, 236, 244, 0.8);
  font-family: ${(p) => (p.$mono ? "'Fira Code', monospace" : "'Sora', sans-serif")};
  font-size: ${(p) => (p.$mono ? '12px' : '13px')};
  vertical-align: top;

  &:first-child { border-radius: 8px 0 0 8px; }
  &:last-child { border-radius: 0 8px 8px 0; }
`;

/* ── Target Tracker Cards ── */

const TargetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
`;

const TargetCard = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;

const TargetIcon = styled.div`
  font-size: 24px;
  margin-bottom: 6px;
`;

const TargetSkill = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.6);
  margin-bottom: 4px;
`;

const TargetScore = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 22px;
  font-weight: 700;
  color: #60C0F0;
`;

/* ── Point Impact Badge ── */

const PointBadge = styled.div`
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 12px;
  padding: 16px 20px;
  text-align: center;
  margin: 16px 0;
`;

type AccentTone = 'ice' | 'gold' | 'purple' | 'green';

const accentToneColor: Record<AccentTone, string> = {
  ice: '#60C0F0',
  gold: '#C6A84B',
  purple: '#8B5CF6',
  green: '#22c55e',
};

const PointValue = styled.div<{ $tone?: AccentTone }>`
  font-family: 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 700;
  color: ${(p) => accentToneColor[p.$tone || 'ice']};
  margin-bottom: 4px;
`;

const PointLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.6);
`;

/* ── Difficulty Badge ── */

const difficultyColors = {
  Beginner: '#22c55e',
  Moderate: '#C6A84B',
  Advanced: '#ef4444',
};

const DifficultyBadge = styled.span<{ $level: 'Beginner' | 'Moderate' | 'Advanced' }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  color: ${(p) => difficultyColors[p.$level]};
  background: ${(p) => difficultyColors[p.$level]}22;
  border: 1px solid ${(p) => difficultyColors[p.$level]}44;
`;

/* ── Cert Cards ── */

const CertCard = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px;
`;

const CertName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #E0ECF4;
`;

const CertPlatform = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: #60C0F0;
  margin-bottom: 8px;
`;

const CertMeta = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const CertMetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: rgba(224, 236, 244, 0.6);

  svg {
    width: 14px;
    height: 14px;
    color: rgba(224, 236, 244, 0.4);
  }
`;

const CertWhy = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.7);
  font-style: italic;
  padding: 8px 12px;
  background: rgba(139, 92, 246, 0.08);
  border-radius: 8px;
  margin-bottom: 10px;
  line-height: 1.5;
`;

const TopicList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
`;

const TopicChip = styled.span`
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.15);
  color: rgba(224, 236, 244, 0.7);
  font-family: 'Sora', sans-serif;
`;

const CertProgress = styled.div`
  height: 6px;
  background: rgba(0, 16, 64, 0.6);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const CertHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
`;

const CertFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CertSessions = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
`;

const CertFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${(p) => p.$pct}%;
  background: linear-gradient(90deg, #8B5CF6, #22c55e);
  border-radius: 3px;
  transition: width 0.5s;
`;

const CertLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  text-decoration: none;
  padding: 4px 0;

  svg {
    width: 14px;
    height: 14px;
  }

  &:hover {
    color: #8B5CF6;
    text-decoration: underline;
  }
`;

const InvestmentSummary = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 12px;
  padding: 16px 20px;
  margin-top: 20px;
  text-align: center;
`;

const InvestmentValue = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #C6A84B;
  margin-bottom: 4px;
`;

const InvestmentLabel = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
`;

const InvestmentFootnote = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
  margin-top: 8px;
`;

/* ── Study Progression Timeline ── */

const TimelineContainer = styled.div`
  position: relative;
  padding-left: 24px;
  margin: 16px 0;

  &::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 4px;
    bottom: 4px;
    width: 2px;
    background: rgba(96, 192, 240, 0.15);
    border-radius: 1px;
  }
`;

const TimelineItem = styled.div<{ $color: string }>`
  position: relative;
  margin-bottom: 16px;

  &:last-child { margin-bottom: 0; }

  &::before {
    content: '';
    position: absolute;
    left: -21px;
    top: 6px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(p) => p.$color};
    border: 2px solid rgba(0, 32, 96, 0.8);
    z-index: 1;
  }
`;

const TimelinePeriod = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #E0ECF4;
  margin-bottom: 4px;
`;

const TimelineActivity = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.7);
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
  gap: 6px;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    margin-top: 3px;
    color: rgba(224, 236, 244, 0.4);
  }
`;

const LegendRow = styled.div`
  display: flex;
  gap: 20px;
  margin-top: 20px;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const LegendDot = styled.div<{ $color: string; $shape?: 'circle' | 'square' }>`
  width: 10px;
  height: 10px;
  border-radius: ${(p) => (p.$shape === 'square' ? '3px' : '50%')};
  background: ${(p) => p.$color};
`;

const LegendText = styled.span<{ $compact?: boolean }>`
  font-family: 'Sora', sans-serif;
  font-size: ${(p) => (p.$compact ? '11px' : '12px')};
  color: rgba(224, 236, 244, ${(p) => (p.$compact ? 0.5 : 0.6)});
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin-top: 20px;
`;

/* ── French progression timeline ── */

const FrenchStepCard = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 8px;
`;

const FrenchStepHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const FrenchStepPeriod = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #C6A84B;
`;

const FrenchStepDetail = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.55);
`;

const FrenchStepActivity = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: #E0ECF4;
  margin-bottom: 4px;
`;

/* ── Vocab ── */

const VocabGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
`;

const VocabCard = styled.div`
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 10px;
`;

const VocabWord = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #C6A84B;
`;

const VocabMeaning = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: #E0ECF4;
  margin-top: 2px;
`;

const VocabExample = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
  font-style: italic;
  margin-top: 4px;
`;

/* ── NCLC Table ── */

const NCLCTable = styled.div`
  display: grid;
  grid-template-columns: auto repeat(4, 1fr);
  gap: 2px;
  font-size: 12px;

  @media (max-width: 480px) {
    font-size: 11px;
  }
`;

const NCLCCell = styled.div<{ $header?: boolean }>`
  padding: 6px 10px;
  background: ${(p) => (p.$header ? 'rgba(96,192,240,0.1)' : 'rgba(0, 32, 96, 0.3)')};
  color: ${(p) => (p.$header ? '#60C0F0' : 'rgba(224,236,244,0.7)')};
  font-weight: ${(p) => (p.$header ? '700' : '400')};
  font-family: ${(p) => (p.$header ? "'Sora', sans-serif" : "'Fira Code', monospace")};
  text-align: center;

  &:first-child {
    text-align: left;
  }
`;

/* ── Chart ── */

const ChartContainer = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 120px;
  padding: 0 4px;
  overflow-x: auto;
`;

const ChartBar = styled.div<{ $height: number; $color: string }>`
  flex: 0 0 24px;
  height: ${(p) => p.$height}%;
  min-height: 4px;
  background: ${(p) => p.$color};
  border-radius: 4px 4px 0 0;
  position: relative;
  transition: height 0.3s;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 4px 8px;
    background: rgba(0, 16, 64, 0.9);
    border: 1px solid rgba(96, 192, 240, 0.2);
    border-radius: 6px;
    font-size: 11px;
    color: #E0ECF4;
    white-space: nowrap;
    z-index: 10;
  }

  @media (max-width: 480px) {
    flex: 0 0 16px;
  }
`;

const ChartEmpty = styled.div`
  text-align: center;
  padding: 40px 0;
  color: rgba(224, 236, 244, 0.4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
`;

/* ── Log Session Form ── */

const FormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.label`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.6);
`;

const Select = styled.select`
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;

  &:focus { outline: none; border-color: #8B5CF6; }
  option { background: #001040; color: #E0ECF4; }
`;

const Input = styled.input`
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  width: 140px;

  &:focus { outline: none; border-color: #8B5CF6; }
  &::placeholder { color: rgba(224,236,244,0.3); }
`;

const StudyNotesInput = styled(Input)`
  width: 240px;
`;

const LogButton = styled.button`
  min-height: 44px;
  padding: 10px 24px;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0);
  border: none;
  border-radius: 10px;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;

  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

/* ── Callout Box ── */

const CalloutBox = styled.div<{ $variant?: 'gold' | 'ice' | 'purple' }>`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-left: 3px solid ${(p) =>
    p.$variant === 'gold' ? '#C6A84B' :
    p.$variant === 'purple' ? '#8B5CF6' :
    '#60C0F0'
  };
  border-radius: 0 10px 10px 0;
  padding: 12px 16px;
  margin: 12px 0;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: rgba(224, 236, 244, 0.8);
  line-height: 1.6;
`;

/* ────────── Component ────────── */

const StudyPlatform: React.FC<Props> = ({ studySessions, addStudySession }) => {
  const [activeSection, setActiveSection] = useState<'ielts' | 'french' | 'certs' | 'history' | 'timeline'>('ielts');
  const [logCategory, setLogCategory] = useState('ielts');
  const [logScore, setLogScore] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ── Cert progress (based on study sessions) ── */
  const certProgress = useMemo(() => {
    const aiSessions = studySessions.filter((s) => s.category === 'ai_cert');
    return AI_CERTS.map((cert) => {
      const sessions = aiSessions.filter((s) =>
        s.notes?.toLowerCase().includes(cert.name.toLowerCase().split(' ')[0])
      );
      return { ...cert, sessions: sessions.length, pct: Math.min(100, sessions.length * 20) };
    });
  }, [studySessions]);

  /* ── Chart data ── */
  const chartData = useMemo(() => {
    const last20 = studySessions.slice(-20);
    const maxScore = Math.max(1, ...last20.map((s) => s.score || 0));
    const catColors: Record<string, string> = {
      ielts: '#60C0F0',
      french: '#C6A84B',
      ai_cert: '#8B5CF6',
      other: '#22c55e',
    };
    return last20.map((s) => ({
      height: s.score ? (s.score / maxScore) * 100 : 10,
      color: catColors[s.category] || '#60C0F0',
      tooltip: `${s.category}: ${s.score ?? 'N/A'} — ${s.date?.slice(0, 10) || 'today'}`,
    }));
  }, [studySessions]);

  /* ── Log session ── */
  const handleLog = async () => {
    setSubmitting(true);
    await addStudySession({
      category: logCategory,
      score: logScore ? Number(logScore) : null,
      notes: logNotes || null,
    });
    setLogScore('');
    setLogNotes('');
    setSubmitting(false);
  };

  return (
    <Container>
      {/* Sub-tabs */}
      <SubTabBar role="tablist" aria-label="Study sections">
        <SubTab
          role="tab"
          aria-selected={activeSection === 'ielts'}
          $active={activeSection === 'ielts'}
          onClick={() => setActiveSection('ielts')}
        >
          <BookOpen /> IELTS Prep
        </SubTab>
        <SubTab
          role="tab"
          aria-selected={activeSection === 'french'}
          $active={activeSection === 'french'}
          onClick={() => setActiveSection('french')}
        >
          <Languages /> French / TEF
        </SubTab>
        <SubTab
          role="tab"
          aria-selected={activeSection === 'certs'}
          $active={activeSection === 'certs'}
          onClick={() => setActiveSection('certs')}
        >
          <Award /> AI Certifications
        </SubTab>
        <SubTab
          role="tab"
          aria-selected={activeSection === 'timeline'}
          $active={activeSection === 'timeline'}
          onClick={() => setActiveSection('timeline')}
        >
          <Calendar /> Study Plan
        </SubTab>
        <SubTab
          role="tab"
          aria-selected={activeSection === 'history'}
          $active={activeSection === 'history'}
          onClick={() => setActiveSection('history')}
        >
          <BarChart3 /> Score History
        </SubTab>
      </SubTabBar>

      {/* ═══════════════════ IELTS Section ═══════════════════ */}
      {activeSection === 'ielts' && (
        <>
          {/* Target Tracker */}
          <GlassCard>
            <CardTitle><Target /> IELTS Target: CLB 9 in All Bands</CardTitle>
            <TargetGrid>
              {IELTS_TARGETS.map((t) => (
                <TargetCard key={t.skill}>
                  <TargetIcon>{t.icon}</TargetIcon>
                  <TargetSkill>{t.skill}</TargetSkill>
                  <TargetScore>{t.target}</TargetScore>
                </TargetCard>
              ))}
            </TargetGrid>

            <CalloutBox $variant="ice">
              As a native English speaker, most score <IceHighlight>7.0-7.5 on first attempt</IceHighlight>.
              The challenge is <strong>procedural, not linguistic</strong> — learn the format and time management.
            </CalloutBox>

            <PointBadge>
              <PointValue>Up to 136 CRS</PointValue>
              <PointLabel>IELTS CLB 9 = up to 136 CRS points (first official language)</PointLabel>
            </PointBadge>
          </GlassCard>

          {/* Resources Table */}
          <GlassCard>
            <CardTitle><GraduationCap /> IELTS Resources</CardTitle>
            <DataTable>
              <Table>
                <thead>
                  <tr>
                    <Th>Resource</Th>
                    <Th>Cost</Th>
                    <Th>What It Does</Th>
                  </tr>
                </thead>
                <tbody>
                  {IELTS_RESOURCES.map((r) => (
                    <tr key={r.name}>
                      <Td>{r.name}</Td>
                      <Td $mono>{r.cost}</Td>
                      <Td>{r.description}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </DataTable>
          </GlassCard>

          {/* Tips per skill */}
          <SectionGrid>
            {(Object.entries(IELTS_TIPS) as [string, string[]][]).map(([section, tips]) => (
              <GlassCard key={section}>
                <SectionTitle>{section}</SectionTitle>
                <TipsList>
                  {tips.map((tip, i) => (
                    <TipCard key={i}>{tip}</TipCard>
                  ))}
                </TipsList>
              </GlassCard>
            ))}
          </SectionGrid>
        </>
      )}

      {/* ═══════════════════ French / TEF Section ═══════════════════ */}
      {activeSection === 'french' && (
        <>
          {/* French Target Tracker */}
          <GlassCard>
            <CardTitle><Target /> French Target: NCLC 7 (The Magic Number)</CardTitle>

            <CalloutBox $variant="gold">
              The French bonus is the <GoldHighlight>single highest-ROI move</GoldHighlight>.
              50 CRS points for $600-1,200 total over 12 months.
            </CalloutBox>

            {/* Benefits Table */}
            <DataTable>
              <Table>
                <thead>
                  <tr>
                    <Th>French Level</Th>
                    <Th>Immigration Benefit</Th>
                  </tr>
                </thead>
                <tbody>
                  {FRENCH_BENEFITS.map((b) => (
                    <tr key={b.level}>
                      <Td $mono>{b.level}</Td>
                      <Td>
                        {b.benefit.includes('+50')
                          ? <GoldHighlight>{b.benefit}</GoldHighlight>
                          : b.benefit
                        }
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </DataTable>

            <PointBadge>
              <PointValue>+50 CRS</PointValue>
              <PointLabel>NCLC 7+ all 4 skills with CLB 5+ English</PointLabel>
            </PointBadge>
          </GlassCard>

          {/* Study Progression */}
          <GlassCard>
            <CardTitle><Clock /> French Study Progression</CardTitle>
            {FRENCH_TIMELINE.map((step) => (
              <FrenchStepCard key={step.months}>
                <FrenchStepHeader>
                  <FrenchStepPeriod>{step.months}</FrenchStepPeriod>
                </FrenchStepHeader>
                <FrenchStepActivity>{step.activity}</FrenchStepActivity>
                <FrenchStepDetail>{step.detail}</FrenchStepDetail>
              </FrenchStepCard>
            ))}
            <CalloutBox $variant="gold">
              Total monthly cost: <GoldHighlight>~$60-100/month</GoldHighlight>.
              Total over 12 months: $600-1,200. Compare that to 50 CRS points.
            </CalloutBox>
          </GlassCard>

          {/* Vocabulary */}
          <GlassCard>
            <CardTitle><BookOpen /> Essential Vocabulary (6 Key Words)</CardTitle>
            <VocabGrid>
              {FRENCH_VOCAB.map((v) => (
                <VocabCard key={v.word}>
                  <VocabWord>{v.word}</VocabWord>
                  <VocabMeaning>{v.meaning}</VocabMeaning>
                  <VocabExample>{v.example}</VocabExample>
                </VocabCard>
              ))}
            </VocabGrid>
          </GlassCard>

          {/* NCLC Estimator */}
          <GlassCard>
            <CardTitle>NCLC Level Estimator</CardTitle>
            <NCLCTable>
              <NCLCCell $header>Level</NCLCCell>
              <NCLCCell $header>Reading</NCLCCell>
              <NCLCCell $header>Writing</NCLCCell>
              <NCLCCell $header>Listening</NCLCCell>
              <NCLCCell $header>Speaking</NCLCCell>

              <NCLCCell>NCLC 5</NCLCCell>
              <NCLCCell>Simple texts</NCLCCell>
              <NCLCCell>Short messages</NCLCCell>
              <NCLCCell>Slow, clear speech</NCLCCell>
              <NCLCCell>Basic needs</NCLCCell>

              <NCLCCell>NCLC 7</NCLCCell>
              <NCLCCell>Most texts</NCLCCell>
              <NCLCCell>Paragraphs</NCLCCell>
              <NCLCCell>Normal speed</NCLCCell>
              <NCLCCell>Complex topics</NCLCCell>

              <NCLCCell>NCLC 9</NCLCCell>
              <NCLCCell>Complex texts</NCLCCell>
              <NCLCCell>Essays, reports</NCLCCell>
              <NCLCCell>Fast/accented</NCLCCell>
              <NCLCCell>Nuanced debate</NCLCCell>

              <NCLCCell>NCLC 10+</NCLCCell>
              <NCLCCell>Academic/legal</NCLCCell>
              <NCLCCell>Professional</NCLCCell>
              <NCLCCell>Any context</NCLCCell>
              <NCLCCell>Near-native</NCLCCell>
            </NCLCTable>
          </GlassCard>
        </>
      )}

      {/* ═══════════════════ AI Certifications Section ═══════════════════ */}
      {activeSection === 'certs' && (
        <>
          {/* Reality Check Banner */}
          <RealityBanner role="alert" aria-live="polite">
            <BannerTitle>
              <AlertTriangle /> REALITY CHECK: AI Certifications = <GoldHighlight>0 CRS Points</GoldHighlight>
            </BannerTitle>
            <BannerText>
              AI certifications <strong>do NOT</strong> appear on the CRS scoring grid. Immigration officers do not score them.
            </BannerText>
            <BannerText>
              They <strong>CAN</strong> help you land a Canadian job offer, but IRCC eliminated extra CRS points
              for job offers as of April 2025.
            </BannerText>
            <BannerText>
              The <strong>REAL reason</strong> to get them: personal growth, stronger SwanStudios platform,
              backup for employment.
            </BannerText>
            <BannerText>
              <GoldHighlight>
                DO THESE AFTER IELTS AND FRENCH. Language = 186+ CRS points. Certs = 0.
              </GoldHighlight>
            </BannerText>
          </RealityBanner>

          {/* Cost/Time/Difficulty Summary Table */}
          <GlassCard>
            <CardTitle><DollarSign /> Certification Cost & Time Comparison</CardTitle>
            <DataTable>
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Certification</Th>
                    <Th>Cost</Th>
                    <Th>Time</Th>
                    <Th>Difficulty</Th>
                    <Th>Why It Helps YOU</Th>
                  </tr>
                </thead>
                <tbody>
                  {AI_CERTS.map((cert) => (
                    <tr key={cert.name}>
                      <Td $mono>{cert.num === 0 ? 'Opt.' : cert.num}</Td>
                      <Td>{cert.name}</Td>
                      <Td $mono>{cert.cost}</Td>
                      <Td $mono>{cert.time}</Td>
                      <Td>
                        <DifficultyBadge $level={cert.difficulty}>{cert.difficulty}</DifficultyBadge>
                      </Td>
                      <Td>{cert.why}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </DataTable>

            <InvestmentSummary>
              <InvestmentValue>$415 - $615</InvestmentValue>
              <InvestmentLabel>Total investment for 3 solid certifications</InvestmentLabel>
              <InvestmentFootnote>
                Do in parallel with IELTS/French during evenings/weekends
              </InvestmentFootnote>
            </InvestmentSummary>
          </GlassCard>

          {/* Detailed Cert Cards */}
          <SectionGrid>
            {certProgress.map((cert) => (
              <CertCard key={cert.name}>
                <CertHeader>
                  <CertName>{cert.num === 0 ? '(Optional) ' : `${cert.num}. `}{cert.name}</CertName>
                </CertHeader>
                <CertPlatform>{cert.platform}</CertPlatform>
                <CertMeta>
                  <CertMetaItem><DollarSign /> {cert.cost}</CertMetaItem>
                  <CertMetaItem><Clock /> {cert.time}</CertMetaItem>
                  <CertMetaItem>
                    <DifficultyBadge $level={cert.difficulty}>{cert.difficulty}</DifficultyBadge>
                  </CertMetaItem>
                </CertMeta>
                <CertWhy>{cert.why}</CertWhy>
                <TopicList>
                  {cert.topics.map((t) => (
                    <TopicChip key={t}>{t}</TopicChip>
                  ))}
                </TopicList>
                <CertProgress>
                  <CertFill $pct={cert.pct} />
                </CertProgress>
                <CertFooter>
                  <CertSessions>{cert.sessions} sessions logged</CertSessions>
                  <CertLink href={cert.link} target="_blank" rel="noopener noreferrer">
                    Open platform <ExternalLink />
                  </CertLink>
                </CertFooter>
              </CertCard>
            ))}
          </SectionGrid>
        </>
      )}

      {/* ═══════════════════ Study Plan Timeline ═══════════════════ */}
      {activeSection === 'timeline' && (
        <GlassCard>
          <CardTitle><Calendar /> Study Progression Timeline</CardTitle>

          <CalloutBox $variant="ice">
            This timeline prioritizes <IceHighlight>language first</IceHighlight> (highest CRS impact),
            then certifications in parallel during evenings and weekends.
          </CalloutBox>

          <TimelineContainer>
            {STUDY_PROGRESSION.map((step, i) => (
              <TimelineItem key={i} $color={step.color}>
                <TimelinePeriod>{step.period}</TimelinePeriod>
                {step.items.map((item, j) => (
                  <TimelineActivity key={j}>
                    <ChevronRight /> {item}
                  </TimelineActivity>
                ))}
              </TimelineItem>
            ))}
          </TimelineContainer>

          {/* Legend */}
          <LegendRow>
            {[
              { label: 'IELTS / English', color: '#60C0F0' },
              { label: 'AI Certifications', color: '#8B5CF6' },
              { label: 'French / TEF', color: '#C6A84B' },
            ].map((l) => (
              <LegendItem key={l.label}>
                <LegendDot $color={l.color} />
                <LegendText>{l.label}</LegendText>
              </LegendItem>
            ))}
          </LegendRow>

          {/* Summary cards */}
          <SummaryGrid>
            <PointBadge>
              <PointValue $tone="ice">136 CRS</PointValue>
              <PointLabel>IELTS CLB 9 (English)</PointLabel>
            </PointBadge>
            <PointBadge>
              <PointValue $tone="gold">+50 CRS</PointValue>
              <PointLabel>French NCLC 7</PointLabel>
            </PointBadge>
            <PointBadge>
              <PointValue $tone="purple">0 CRS</PointValue>
              <PointLabel>AI Certs (job readiness)</PointLabel>
            </PointBadge>
          </SummaryGrid>
        </GlassCard>
      )}

      {/* ═══════════════════ Score History ═══════════════════ */}
      {activeSection === 'history' && (
        <GlassCard>
          <CardTitle><BarChart3 /> Score History</CardTitle>
          {chartData.length > 0 ? (
            <ChartContainer>
              {chartData.map((d, i) => (
                <ChartBar key={i} $height={d.height} $color={d.color} data-tooltip={d.tooltip} />
              ))}
            </ChartContainer>
          ) : (
            <ChartEmpty>
              No study sessions logged yet. Use the form below to start tracking.
            </ChartEmpty>
          )}

          <LegendRow>
            {[
              { label: 'IELTS', color: '#60C0F0' },
              { label: 'French', color: '#C6A84B' },
              { label: 'AI Cert', color: '#8B5CF6' },
              { label: 'Other', color: '#22c55e' },
            ].map((l) => (
              <LegendItem key={l.label}>
                <LegendDot $color={l.color} $shape="square" />
                <LegendText $compact>{l.label}</LegendText>
              </LegendItem>
            ))}
          </LegendRow>
        </GlassCard>
      )}

      {/* ═══════════════════ Log Study Session (always visible) ═══════════════════ */}
      <GlassCard>
        <CardTitle><Zap /> Log Study Session</CardTitle>
        <FormRow>
          <FieldGroup>
            <Label htmlFor="study-category">Category</Label>
            <Select id="study-category" value={logCategory} onChange={(e) => setLogCategory(e.target.value)}>
              {STUDY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="study-score">Score (optional)</Label>
            <Input
              id="study-score"
              type="number"
              placeholder="e.g. 7.5"
              value={logScore}
              onChange={(e) => setLogScore(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            <Label htmlFor="study-notes">Notes (optional)</Label>
            <StudyNotesInput
              id="study-notes"
              placeholder="What did you study?"
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
            />
          </FieldGroup>
          <LogButton onClick={handleLog} disabled={submitting}>
            {submitting ? 'Logging...' : 'Log Session'}
          </LogButton>
        </FormRow>
      </GlassCard>
    </Container>
  );
};

export default StudyPlatform;
