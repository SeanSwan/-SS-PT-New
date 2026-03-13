/**
 * StudyPlatform.tsx
 * ──────────────────────────────────────────────────────────────────
 * Module 5: Study Hub — IELTS prep, French/TEF, AI Certifications,
 * score history chart, and study session logging.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
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
    'Part 1: Answer in 2-3 sentences. Extend naturally, don\'t give one-word answers.',
    'Part 2: Use the 1-minute prep wisely — jot down keywords, not full sentences.',
    'Part 3: Give opinion + reason + example for band 7+ responses.',
    'Paraphrase the question in your answer to show vocabulary range.',
  ],
};

const FRENCH_VOCAB = [
  { word: 'Bonjour', meaning: 'Hello / Good day', example: 'Bonjour, comment allez-vous?' },
  { word: 'Merci', meaning: 'Thank you', example: 'Merci beaucoup pour votre aide.' },
  { word: 'S\'il vous plait', meaning: 'Please (formal)', example: 'Un cafe, s\'il vous plait.' },
  { word: 'Travailler', meaning: 'To work', example: 'Je travaille a Toronto.' },
  { word: 'Comprendre', meaning: 'To understand', example: 'Je comprends le francais.' },
  { word: 'Habiter', meaning: 'To live', example: 'J\'habite au Canada.' },
  { word: 'Apprendre', meaning: 'To learn', example: 'J\'apprends le francais.' },
  { word: 'Parler', meaning: 'To speak', example: 'Je parle anglais et francais.' },
  { word: 'Chercher', meaning: 'To look for', example: 'Je cherche un emploi.' },
  { word: 'Pouvoir', meaning: 'To be able to / Can', example: 'Je peux vous aider.' },
];

const GRAMMAR_TIPS = [
  'Verb groups: -er (parler), -ir (finir), -re (vendre) — learn conjugation patterns.',
  'Passe compose = avoir/etre + past participle. "J\'ai mange" (I ate).',
  'Use "ne...pas" for negation: "Je ne parle pas francais."',
  'Gender matters: le/la/les — learn nouns with their articles.',
  'Formal vs informal: vous (formal) vs tu (informal).',
];

const AI_CERTS = [
  {
    name: 'IBM AI Engineering Professional',
    platform: 'Coursera',
    topics: ['Machine Learning', 'Deep Learning', 'Neural Networks', 'TensorFlow', 'Keras'],
    link: 'https://www.coursera.org/professional-certificates/ai-engineer',
  },
  {
    name: 'AWS Certified ML - Specialty',
    platform: 'AWS',
    topics: ['SageMaker', 'Data Engineering', 'ML Modeling', 'ML Implementation', 'Deployment'],
    link: 'https://aws.amazon.com/certification/certified-machine-learning-specialty/',
  },
  {
    name: 'Microsoft Azure AI Engineer',
    platform: 'Microsoft Learn',
    topics: ['Azure Cognitive Services', 'Azure ML', 'NLP', 'Computer Vision', 'Conversational AI'],
    link: 'https://learn.microsoft.com/en-us/certifications/azure-ai-engineer/',
  },
  {
    name: 'Google Cloud Professional ML',
    platform: 'Google Cloud',
    topics: ['Vertex AI', 'BigQuery ML', 'TensorFlow on GCP', 'ML Pipelines', 'AutoML'],
    link: 'https://cloud.google.com/certification/machine-learning-engineer',
  },
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
  transition: all 0.15s;
  background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.25)' : 'rgba(0, 48, 128, 0.3)')};
  color: ${(p) => (p.$active ? '#E0ECF4' : 'rgba(224,236,244,0.5)')};
  border: 1px solid ${(p) => (p.$active ? 'rgba(139,92,246,0.3)' : 'transparent')};

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    color: #E0ECF4;
  }
`;

const Card = styled.div`
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
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
`;

const TipsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const TipCard = styled.div`
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.08);
  border-radius: 10px;
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

/* ── Vocab Table ── */

const VocabGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
`;

const VocabCard = styled.div`
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.4);
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
  font-size: 13px;
  color: #E0ECF4;
  margin-top: 2px;
`;

const VocabExample = styled.div`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.5);
  font-style: italic;
  margin-top: 4px;
`;

/* ── Cert Cards ── */

const CertCard = styled.div`
  background: rgba(0, 32, 96, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.08);
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
  font-size: 12px;
  color: #60C0F0;
  margin-bottom: 8px;
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
`;

const CertProgress = styled.div`
  height: 6px;
  background: rgba(0, 16, 64, 0.6);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
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
  color: #60C0F0;
  font-size: 12px;
  text-decoration: none;

  &:hover {
    color: #8B5CF6;
    text-decoration: underline;
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

/* ────────── Component ────────── */

const StudyPlatform: React.FC<Props> = ({ studySessions, addStudySession }) => {
  const [activeSection, setActiveSection] = useState<'ielts' | 'french' | 'certs' | 'history'>('ielts');
  const [logCategory, setLogCategory] = useState('ielts');
  const [logScore, setLogScore] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ── Cert progress (based on study sessions) ── */
  const certProgress = useMemo(() => {
    const aiSessions = studySessions.filter((s) => s.category === 'ai_cert');
    return AI_CERTS.map((cert) => {
      const sessions = aiSessions.filter((s) => s.notes?.toLowerCase().includes(cert.name.toLowerCase().split(' ')[0]));
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
      <SubTabBar>
        <SubTab $active={activeSection === 'ielts'} onClick={() => setActiveSection('ielts')}>
          IELTS Prep
        </SubTab>
        <SubTab $active={activeSection === 'french'} onClick={() => setActiveSection('french')}>
          French / TEF
        </SubTab>
        <SubTab $active={activeSection === 'certs'} onClick={() => setActiveSection('certs')}>
          AI Certifications
        </SubTab>
        <SubTab $active={activeSection === 'history'} onClick={() => setActiveSection('history')}>
          Score History
        </SubTab>
      </SubTabBar>

      {/* IELTS Section */}
      {activeSection === 'ielts' && (
        <SectionGrid>
          {(Object.entries(IELTS_TIPS) as [string, string[]][]).map(([section, tips]) => (
            <Card key={section}>
              <SectionTitle>{section}</SectionTitle>
              <TipsList>
                {tips.map((tip, i) => (
                  <TipCard key={i}>{tip}</TipCard>
                ))}
              </TipsList>
            </Card>
          ))}
        </SectionGrid>
      )}

      {/* French Section */}
      {activeSection === 'french' && (
        <>
          <Card>
            <CardTitle>Daily Vocabulary (10 Essential Words)</CardTitle>
            <VocabGrid>
              {FRENCH_VOCAB.map((v) => (
                <VocabCard key={v.word}>
                  <VocabWord>{v.word}</VocabWord>
                  <VocabMeaning>{v.meaning}</VocabMeaning>
                  <VocabExample>{v.example}</VocabExample>
                </VocabCard>
              ))}
            </VocabGrid>
          </Card>

          <Card>
            <CardTitle>Grammar Tips</CardTitle>
            <TipsList>
              {GRAMMAR_TIPS.map((tip, i) => (
                <TipCard key={i}>{tip}</TipCard>
              ))}
            </TipsList>
          </Card>

          <Card>
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
          </Card>
        </>
      )}

      {/* AI Certifications Section */}
      {activeSection === 'certs' && (
        <SectionGrid>
          {certProgress.map((cert) => (
            <CertCard key={cert.name}>
              <CertName>{cert.name}</CertName>
              <CertPlatform>{cert.platform}</CertPlatform>
              <TopicList>
                {cert.topics.map((t) => (
                  <TopicChip key={t}>{t}</TopicChip>
                ))}
              </TopicList>
              <CertProgress>
                <CertFill $pct={cert.pct} />
              </CertProgress>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Fira Code', monospace", fontSize: 12, color: 'rgba(224,236,244,0.5)' }}>
                  {cert.sessions} sessions logged
                </span>
                <CertLink href={cert.link} target="_blank" rel="noopener noreferrer">
                  Open platform
                </CertLink>
              </div>
            </CertCard>
          ))}
        </SectionGrid>
      )}

      {/* Score History */}
      {activeSection === 'history' && (
        <Card>
          <CardTitle>Score History</CardTitle>
          {chartData.length > 0 ? (
            <ChartContainer>
              {chartData.map((d, i) => (
                <ChartBar key={i} $height={d.height} $color={d.color} data-tooltip={d.tooltip} />
              ))}
            </ChartContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(224,236,244,0.4)', fontSize: 14 }}>
              No study sessions logged yet. Use the form below to start tracking.
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'IELTS', color: '#60C0F0' },
              { label: 'French', color: '#C6A84B' },
              { label: 'AI Cert', color: '#8B5CF6' },
              { label: 'Other', color: '#22c55e' },
            ].map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
                <span style={{ fontSize: 11, color: 'rgba(224,236,244,0.5)' }}>{l.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Log Study Session */}
      <Card>
        <CardTitle>Log Study Session</CardTitle>
        <FormRow>
          <FieldGroup>
            <Label>Category</Label>
            <Select value={logCategory} onChange={(e) => setLogCategory(e.target.value)}>
              {STUDY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>Score (optional)</Label>
            <Input
              type="number"
              placeholder="e.g. 7.5"
              value={logScore}
              onChange={(e) => setLogScore(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            <Label>Notes (optional)</Label>
            <Input
              placeholder="What did you study?"
              value={logNotes}
              onChange={(e) => setLogNotes(e.target.value)}
              style={{ width: 240 }}
            />
          </FieldGroup>
          <LogButton onClick={handleLog} disabled={submitting}>
            {submitting ? 'Logging...' : 'Log Session'}
          </LogButton>
        </FormRow>
      </Card>
    </Container>
  );
};

export default StudyPlatform;
