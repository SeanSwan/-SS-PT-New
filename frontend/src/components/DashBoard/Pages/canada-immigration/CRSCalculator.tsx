/**
 * CRSCalculator.tsx
 * ──────────────────────────────────────────────────────────────────
 * Module 4: Interactive Express Entry CRS Score Calculator.
 * Both applicants' fields, auto-calculation, breakdown display,
 * "what-if" toggles, and recent draw cutoff comparisons.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';

/* ────────── Types ────────── */

interface ApplicantData {
  age: number;
  education: string;
  clbReading: number;
  clbWriting: number;
  clbListening: number;
  clbSpeaking: number;
  frenchReading: number;
  frenchWriting: number;
  frenchListening: number;
  frenchSpeaking: number;
  canadianWorkYears: number;
  foreignWorkYears: number;
}

const defaultApplicant = (): ApplicantData => ({
  age: 30,
  education: 'bachelor',
  clbReading: 7,
  clbWriting: 7,
  clbListening: 7,
  clbSpeaking: 7,
  frenchReading: 0,
  frenchWriting: 0,
  frenchListening: 0,
  frenchSpeaking: 0,
  canadianWorkYears: 0,
  foreignWorkYears: 2,
});

/* ────────── CRS Calculation Logic ────────── */

function agePoints(age: number, withSpouse: boolean): number {
  const table: Record<number, [number, number]> = {
    // [withSpouse, withoutSpouse]
    18: [90, 99], 19: [95, 105], 20: [100, 110], 21: [100, 110], 22: [100, 110],
    23: [100, 110], 24: [100, 110], 25: [100, 110], 26: [100, 110], 27: [100, 110],
    28: [100, 110], 29: [100, 110], 30: [105, 110], 31: [105, 110], 32: [100, 110],
    33: [100, 110], 34: [100, 110], 35: [95, 105], 36: [90, 99], 37: [85, 94],
    38: [80, 88], 39: [75, 83], 40: [65, 72], 41: [55, 61], 42: [45, 50],
    43: [35, 39], 44: [25, 28], 45: [0, 0],
  };
  const clamped = Math.max(18, Math.min(45, age));
  const entry = table[clamped] || [0, 0];
  return withSpouse ? entry[0] : entry[1];
}

function educationPoints(edu: string, withSpouse: boolean): number {
  const table: Record<string, [number, number]> = {
    none: [0, 0],
    high_school: [28, 30],
    one_year: [84, 90],
    two_year: [91, 98],
    bachelor: [112, 120],
    two_plus: [119, 128],
    master: [126, 135],
    phd: [140, 150],
  };
  const entry = table[edu] || [0, 0];
  return withSpouse ? entry[0] : entry[1];
}

function clbToLangPoints(clb: number, withSpouse: boolean): number {
  if (clb < 4) return 0;
  if (clb <= 5) return withSpouse ? 6 : 6;
  if (clb === 6) return withSpouse ? 8 : 9;
  if (clb === 7) return withSpouse ? 16 : 17;
  if (clb === 8) return withSpouse ? 22 : 23;
  if (clb === 9) return withSpouse ? 29 : 31;
  return withSpouse ? 32 : 34; // CLB 10+
}

function firstLangPoints(applicant: ApplicantData, withSpouse: boolean): number {
  return (
    clbToLangPoints(applicant.clbReading, withSpouse) +
    clbToLangPoints(applicant.clbWriting, withSpouse) +
    clbToLangPoints(applicant.clbListening, withSpouse) +
    clbToLangPoints(applicant.clbSpeaking, withSpouse)
  );
}

function canadianWorkPoints(years: number, withSpouse: boolean): number {
  if (years <= 0) return 0;
  const table: Record<number, [number, number]> = {
    1: [35, 40], 2: [46, 53], 3: [56, 64], 4: [63, 72], 5: [70, 80],
  };
  const clamped = Math.min(5, years);
  const entry = table[clamped] || [70, 80];
  return withSpouse ? entry[0] : entry[1];
}

function spouseEducationPoints(edu: string): number {
  const table: Record<string, number> = {
    none: 0, high_school: 2, one_year: 6, two_year: 7, bachelor: 8,
    two_plus: 9, master: 10, phd: 10,
  };
  return table[edu] || 0;
}

function spouseCLBPoints(clb: number): number {
  if (clb < 4) return 0;
  if (clb <= 6) return 1;
  if (clb <= 8) return 3;
  return 5;
}

function spouseLangPoints(spouse: ApplicantData): number {
  return (
    spouseCLBPoints(spouse.clbReading) +
    spouseCLBPoints(spouse.clbWriting) +
    spouseCLBPoints(spouse.clbListening) +
    spouseCLBPoints(spouse.clbSpeaking)
  );
}

function spouseCanWorkPoints(years: number): number {
  return years >= 1 ? 10 : 0;
}

function skillTransferability(primary: ApplicantData): number {
  let points = 0;
  const eduLevel = ['none', 'high_school', 'one_year', 'two_year', 'bachelor', 'two_plus', 'master', 'phd'].indexOf(primary.education);
  const minCLB = Math.min(primary.clbReading, primary.clbWriting, primary.clbListening, primary.clbSpeaking);

  // Education + Language
  if (eduLevel >= 4 && minCLB >= 9) points += 50;
  else if (eduLevel >= 4 && minCLB >= 7) points += 25;
  else if (eduLevel >= 2 && minCLB >= 9) points += 25;
  else if (eduLevel >= 2 && minCLB >= 7) points += 13;

  // Education + Canadian work
  if (eduLevel >= 4 && primary.canadianWorkYears >= 2) points += 50;
  else if (eduLevel >= 4 && primary.canadianWorkYears >= 1) points += 25;
  else if (eduLevel >= 2 && primary.canadianWorkYears >= 2) points += 25;
  else if (eduLevel >= 2 && primary.canadianWorkYears >= 1) points += 13;

  return Math.min(100, points);
}

function frenchBonus(primary: ApplicantData): number {
  const minFrench = Math.min(
    primary.frenchReading, primary.frenchWriting,
    primary.frenchListening, primary.frenchSpeaking,
  );
  const minEnglish = Math.min(
    primary.clbReading, primary.clbWriting,
    primary.clbListening, primary.clbSpeaking,
  );
  if (minFrench >= 7 && minEnglish >= 5) return 50;
  if (minFrench >= 7) return 25;
  return 0;
}

interface CRSBreakdown {
  coreHumanCapital: number;
  spouseFactors: number;
  skillTransfer: number;
  additional: number;
  total: number;
}

function calculateCRS(
  primary: ApplicantData,
  spouse: ApplicantData,
  pnp: boolean,
): CRSBreakdown {
  const withSpouse = true;
  const core =
    agePoints(primary.age, withSpouse) +
    educationPoints(primary.education, withSpouse) +
    firstLangPoints(primary, withSpouse) +
    canadianWorkPoints(primary.canadianWorkYears, withSpouse);

  const spouseF =
    spouseEducationPoints(spouse.education) +
    spouseLangPoints(spouse) +
    spouseCanWorkPoints(spouse.canadianWorkYears);

  const skill = skillTransferability(primary);

  let additional = frenchBonus(primary);
  if (pnp) additional += 600;

  return {
    coreHumanCapital: Math.min(460, core),
    spouseFactors: Math.min(40, spouseF),
    skillTransfer: Math.min(100, skill),
    additional: Math.min(600, additional),
    total: Math.min(460, core) + Math.min(40, spouseF) + Math.min(100, skill) + Math.min(600, additional),
  };
}

/* ────────── Animations ────────── */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

/* ────────── Styled Components ────────── */

const Container = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Card = styled.div`
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 16px;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const FullCard = styled(Card)`
  grid-column: 1 / -1;
`;

const CardTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0 0 16px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.div<{ $full?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  ${(p) => p.$full && 'grid-column: 1 / -1;'}
`;

const Label = styled.label`
  font-size: 12px;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.6);
  font-family: 'Sora', sans-serif;
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
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
  }

  option {
    background: #001040;
    color: #E0ECF4;
  }
`;

const NumberInput = styled.input`
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.6);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  color: #E0ECF4;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  width: 100%;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
  }
`;

const SectionLabel = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #60C0F0;
  margin: 12px 0 8px;
  grid-column: 1 / -1;
`;

/* ── Results Display ── */

const ScoreDisplay = styled.div<{ $color: string }>`
  text-align: center;
  padding: 24px;
  background: rgba(0, 16, 64, 0.4);
  border: 2px solid ${(p) => p.$color};
  border-radius: 16px;
  margin-bottom: 20px;
`;

const ScoreNumber = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 56px;
  font-weight: 700;
  color: #E0ECF4;

  @media (max-width: 480px) {
    font-size: 40px;
  }
`;

const ScoreLabel = styled.div`
  font-size: 14px;
  color: rgba(224, 236, 244, 0.6);
  margin-top: 4px;
`;

const BreakdownList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const BreakdownRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(0, 32, 96, 0.4);
  border-radius: 8px;
`;

const BreakdownLabel = styled.span`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.7);
`;

const BreakdownValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 700;
  color: #60C0F0;
`;

const BreakdownMax = styled.span`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.35);
  margin-left: 4px;
`;

/* ── What-If Toggles ── */

const ToggleRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 16px;
  background: ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 32, 96, 0.4)')};
  border: 1px solid ${(p) => (p.$active ? 'rgba(139, 92, 246, 0.4)' : 'rgba(96, 192, 240, 0.1)')};
  border-radius: 10px;
  cursor: pointer;
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  text-align: left;
  transition: all 0.15s;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
  }
`;

const ToggleIndicator = styled.span<{ $on: boolean }>`
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: ${(p) => (p.$on ? '#8B5CF6' : 'rgba(224,236,244,0.15)')};
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${(p) => (p.$on ? '18px' : '2px')};
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #E0ECF4;
    transition: left 0.2s;
  }
`;

/* ── Draw Comparison ── */

const DrawGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const DrawCard = styled.div<{ $status: 'green' | 'yellow' | 'red' }>`
  text-align: center;
  padding: 16px;
  background: rgba(0, 32, 96, 0.4);
  border: 1px solid ${(p) =>
    p.$status === 'green' ? 'rgba(34,197,94,0.3)' :
    p.$status === 'yellow' ? 'rgba(245,158,11,0.3)' :
    'rgba(239,68,68,0.3)'};
  border-radius: 10px;
`;

const DrawCategory = styled.div`
  font-size: 12px;
  color: rgba(224, 236, 244, 0.6);
  margin-bottom: 4px;
`;

const DrawCutoff = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 20px;
  font-weight: 700;
  color: rgba(224, 236, 244, 0.5);
`;

const DrawStatus = styled.div<{ $status: 'green' | 'yellow' | 'red' }>`
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
  color: ${(p) =>
    p.$status === 'green' ? '#22c55e' :
    p.$status === 'yellow' ? '#f59e0b' :
    '#ef4444'};
`;

/* ────────── Component ────────── */

const EDUCATION_OPTIONS = [
  { value: 'none', label: 'No formal education' },
  { value: 'high_school', label: 'High school diploma' },
  { value: 'one_year', label: '1-year post-secondary' },
  { value: 'two_year', label: '2-year post-secondary' },
  { value: 'bachelor', label: "Bachelor's degree" },
  { value: 'two_plus', label: '2+ credentials (one 3yr+)' },
  { value: 'master', label: "Master's degree" },
  { value: 'phd', label: 'Doctoral (PhD)' },
];

const CRSCalculator: React.FC = () => {
  const [primary, setPrimary] = useState<ApplicantData>(defaultApplicant());
  const [spouse, setSpouse] = useState<ApplicantData>(defaultApplicant());
  const [whatIfFrench, setWhatIfFrench] = useState(false);
  const [whatIfPNP, setWhatIfPNP] = useState(false);

  const effectivePrimary = useMemo(() => {
    if (!whatIfFrench) return primary;
    return {
      ...primary,
      frenchReading: Math.max(primary.frenchReading, 7),
      frenchWriting: Math.max(primary.frenchWriting, 7),
      frenchListening: Math.max(primary.frenchListening, 7),
      frenchSpeaking: Math.max(primary.frenchSpeaking, 7),
    };
  }, [primary, whatIfFrench]);

  const breakdown = useMemo(
    () => calculateCRS(effectivePrimary, spouse, whatIfPNP),
    [effectivePrimary, spouse, whatIfPNP],
  );

  /* ── Draw cutoffs (recent values) ── */
  const draws = [
    { category: 'General', cutoff: 520 },
    { category: 'French (PEQ)', cutoff: 379 },
    { category: 'STEM', cutoff: 480 },
  ];

  const getDrawStatus = (cutoff: number): 'green' | 'yellow' | 'red' => {
    if (breakdown.total >= cutoff) return 'green';
    if (breakdown.total >= cutoff - 50) return 'yellow';
    return 'red';
  };

  const scoreColor = breakdown.total >= 520 ? '#22c55e' : breakdown.total >= 470 ? '#f59e0b' : '#ef4444';

  /* ── Field updaters ── */
  const updatePrimary = (field: keyof ApplicantData, value: number | string) =>
    setPrimary((p) => ({ ...p, [field]: value }));

  const updateSpouse = (field: keyof ApplicantData, value: number | string) =>
    setSpouse((p) => ({ ...p, [field]: value }));

  const clbOptions = Array.from({ length: 13 }, (_, i) => i);
  const ageOptions = Array.from({ length: 28 }, (_, i) => i + 18);
  const workOptions = [0, 1, 2, 3, 4, 5];

  return (
    <Container>
      {/* Primary Applicant */}
      <Card>
        <CardTitle>Primary Applicant (Sean)</CardTitle>
        <FormGrid>
          <FieldGroup>
            <Label>Age</Label>
            <Select value={primary.age} onChange={(e) => updatePrimary('age', Number(e.target.value))}>
              {ageOptions.map((a) => (
                <option key={a} value={a}>{a}{a >= 45 ? '+' : ''}</option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label>Education</Label>
            <Select value={primary.education} onChange={(e) => updatePrimary('education', e.target.value)}>
              {EDUCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </FieldGroup>

          <SectionLabel>IELTS (CLB Scores)</SectionLabel>
          {(['clbReading', 'clbWriting', 'clbListening', 'clbSpeaking'] as const).map((f) => (
            <FieldGroup key={f}>
              <Label>{f.replace('clb', '')}</Label>
              <Select value={primary[f]} onChange={(e) => updatePrimary(f, Number(e.target.value))}>
                {clbOptions.map((v) => (
                  <option key={v} value={v}>CLB {v}</option>
                ))}
              </Select>
            </FieldGroup>
          ))}

          <SectionLabel>French (NCLC Scores)</SectionLabel>
          {(['frenchReading', 'frenchWriting', 'frenchListening', 'frenchSpeaking'] as const).map((f) => (
            <FieldGroup key={f}>
              <Label>{f.replace('french', '')}</Label>
              <Select value={primary[f]} onChange={(e) => updatePrimary(f, Number(e.target.value))}>
                {clbOptions.map((v) => (
                  <option key={v} value={v}>NCLC {v}</option>
                ))}
              </Select>
            </FieldGroup>
          ))}

          <SectionLabel>Work Experience</SectionLabel>
          <FieldGroup>
            <Label>Canadian (years)</Label>
            <Select value={primary.canadianWorkYears} onChange={(e) => updatePrimary('canadianWorkYears', Number(e.target.value))}>
              {workOptions.map((v) => (
                <option key={v} value={v}>{v}{v >= 5 ? '+' : ''}</option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>Foreign (years)</Label>
            <Select value={primary.foreignWorkYears} onChange={(e) => updatePrimary('foreignWorkYears', Number(e.target.value))}>
              {workOptions.map((v) => (
                <option key={v} value={v}>{v}{v >= 5 ? '+' : ''}</option>
              ))}
            </Select>
          </FieldGroup>
        </FormGrid>
      </Card>

      {/* Spouse */}
      <Card>
        <CardTitle>Spouse / Partner</CardTitle>
        <FormGrid>
          <FieldGroup>
            <Label>Age</Label>
            <Select value={spouse.age} onChange={(e) => updateSpouse('age', Number(e.target.value))}>
              {ageOptions.map((a) => (
                <option key={a} value={a}>{a}{a >= 45 ? '+' : ''}</option>
              ))}
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label>Education</Label>
            <Select value={spouse.education} onChange={(e) => updateSpouse('education', e.target.value)}>
              {EDUCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </FieldGroup>

          <SectionLabel>IELTS (CLB Scores)</SectionLabel>
          {(['clbReading', 'clbWriting', 'clbListening', 'clbSpeaking'] as const).map((f) => (
            <FieldGroup key={f}>
              <Label>{f.replace('clb', '')}</Label>
              <Select value={spouse[f]} onChange={(e) => updateSpouse(f, Number(e.target.value))}>
                {clbOptions.map((v) => (
                  <option key={v} value={v}>CLB {v}</option>
                ))}
              </Select>
            </FieldGroup>
          ))}

          <SectionLabel>Work Experience</SectionLabel>
          <FieldGroup>
            <Label>Canadian (years)</Label>
            <Select value={spouse.canadianWorkYears} onChange={(e) => updateSpouse('canadianWorkYears', Number(e.target.value))}>
              {workOptions.map((v) => (
                <option key={v} value={v}>{v}{v >= 5 ? '+' : ''}</option>
              ))}
            </Select>
          </FieldGroup>
          <FieldGroup>
            <Label>Foreign (years)</Label>
            <Select value={spouse.foreignWorkYears} onChange={(e) => updateSpouse('foreignWorkYears', Number(e.target.value))}>
              {workOptions.map((v) => (
                <option key={v} value={v}>{v}{v >= 5 ? '+' : ''}</option>
              ))}
            </Select>
          </FieldGroup>
        </FormGrid>
      </Card>

      {/* Score Result */}
      <Card>
        <CardTitle>CRS Score Breakdown</CardTitle>
        <ScoreDisplay $color={scoreColor}>
          <ScoreNumber>{breakdown.total}</ScoreNumber>
          <ScoreLabel>Comprehensive Ranking System Score</ScoreLabel>
        </ScoreDisplay>

        <BreakdownList>
          <BreakdownRow>
            <BreakdownLabel>Core / Human Capital</BreakdownLabel>
            <div>
              <BreakdownValue>{breakdown.coreHumanCapital}</BreakdownValue>
              <BreakdownMax>/ 460</BreakdownMax>
            </div>
          </BreakdownRow>
          <BreakdownRow>
            <BreakdownLabel>Spouse Factors</BreakdownLabel>
            <div>
              <BreakdownValue>{breakdown.spouseFactors}</BreakdownValue>
              <BreakdownMax>/ 40</BreakdownMax>
            </div>
          </BreakdownRow>
          <BreakdownRow>
            <BreakdownLabel>Skill Transferability</BreakdownLabel>
            <div>
              <BreakdownValue>{breakdown.skillTransfer}</BreakdownValue>
              <BreakdownMax>/ 100</BreakdownMax>
            </div>
          </BreakdownRow>
          <BreakdownRow>
            <BreakdownLabel>Additional Points</BreakdownLabel>
            <div>
              <BreakdownValue>{breakdown.additional}</BreakdownValue>
              <BreakdownMax>/ 600</BreakdownMax>
            </div>
          </BreakdownRow>
        </BreakdownList>

        {/* What-If */}
        <ToggleRow>
          <ToggleButton $active={whatIfFrench} onClick={() => setWhatIfFrench(!whatIfFrench)}>
            <ToggleIndicator $on={whatIfFrench} />
            What if I get NCLC 7+ in French? (+25 or +50)
          </ToggleButton>
          <ToggleButton $active={whatIfPNP} onClick={() => setWhatIfPNP(!whatIfPNP)}>
            <ToggleIndicator $on={whatIfPNP} />
            What if we get a PNP nomination? (+600)
          </ToggleButton>
        </ToggleRow>
      </Card>

      {/* Draw Comparison */}
      <Card>
        <CardTitle>Recent Draw Cutoffs</CardTitle>
        <DrawGrid>
          {draws.map((d) => {
            const status = getDrawStatus(d.cutoff);
            return (
              <DrawCard key={d.category} $status={status}>
                <DrawCategory>{d.category}</DrawCategory>
                <DrawCutoff>~{d.cutoff}</DrawCutoff>
                <DrawStatus $status={status}>
                  {status === 'green' && 'Above cutoff'}
                  {status === 'yellow' && 'Within 50 pts'}
                  {status === 'red' && 'Below cutoff'}
                </DrawStatus>
                <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 11, color: 'rgba(224,236,244,0.4)', marginTop: 4 }}>
                  {breakdown.total >= d.cutoff ? `+${breakdown.total - d.cutoff}` : `${breakdown.total - d.cutoff}`}
                </div>
              </DrawCard>
            );
          })}
        </DrawGrid>

        {frenchBonus(effectivePrimary) > 0 && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: 'rgba(198, 168, 75, 0.1)',
            border: '1px solid rgba(198, 168, 75, 0.25)',
            borderRadius: 10,
            fontSize: 13,
            color: '#C6A84B',
          }}>
            French Bonus Active: +{frenchBonus(effectivePrimary)} points (NCLC 7+ achieved)
          </div>
        )}
      </Card>
    </Container>
  );
};

export default CRSCalculator;
