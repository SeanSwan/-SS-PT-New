/**
 * ResourceHub.tsx v2.0
 * ──────────────────────────────────────────────────────────────────
 * Canada Immigration Resource Hub — comprehensive guide covering
 * Marriage, Chickasaw enrollment, Jay Treaty, MEd family pathway,
 * Self-Employed Persons Program, PT market research, and resource links.
 *
 * Design: Gemini 3.1 Pro Crystalline Swan specs
 * Surface Level 1 glass, Ice Wing borders, Wing Purple glow
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  ChevronDown,
  Heart,
  Feather,
  Scale,
  GraduationCap,
  Briefcase,
  MapPin,
  Globe,
  BookOpen,
  Monitor,
  Dumbbell,
  ExternalLink,
  Phone,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Star,
  Users,
  FileText,
  Info,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════ */

interface ResourceHubProps {} // No props needed, all static content

interface ResourceItem {
  title: string;
  description: string;
  url: string;
}

interface ResourceCategory {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  items: ResourceItem[];
}

/* ═══════════════════════════════════════════════════════════════════
   FILTER CATEGORIES
   ═══════════════════════════════════════════════════════════════════ */

type FilterKey =
  | 'all'
  | 'marriage'
  | 'chickasaw'
  | 'family'
  | 'selfemployed'
  | 'ptmarket'
  | 'language'
  | 'certification'
  | 'immigration';

interface FilterDef {
  key: FilterKey;
  label: string;
  color: string;
}

const FILTERS: FilterDef[] = [
  { key: 'all', label: 'All', color: '#60C0F0' },
  { key: 'marriage', label: 'Marriage', color: '#ef4444' },
  { key: 'chickasaw', label: 'Chickasaw', color: '#f97316' },
  { key: 'family', label: 'Family Pathway', color: '#8B5CF6' },
  { key: 'selfemployed', label: 'Self-Employed', color: '#C6A84B' },
  { key: 'ptmarket', label: 'PT Market', color: '#06b6d4' },
  { key: 'language', label: 'Language', color: '#60C0F0' },
  { key: 'certification', label: 'AI Certs', color: '#22c55e' },
  { key: 'immigration', label: 'Immigration Links', color: '#8B5CF6' },
];

/* ═══════════════════════════════════════════════════════════════════
   SECTION DEFINITIONS
   ═══════════════════════════════════════════════════════════════════ */

interface SectionDef {
  id: string;
  filterKey: FilterKey;
  title: string;
  icon: React.ReactNode;
  defaultExpanded: boolean;
}

const SECTIONS: SectionDef[] = [
  { id: 'marriage', filterKey: 'marriage', title: 'Marriage Step-by-Step Guide', icon: <Heart size={20} />, defaultExpanded: true },
  { id: 'chickasaw', filterKey: 'chickasaw', title: 'Chickasaw 5-Step Enrollment Process', icon: <Feather size={20} />, defaultExpanded: true },
  { id: 'jaytreaty', filterKey: 'chickasaw', title: 'Jay Treaty Comparison', icon: <Scale size={20} />, defaultExpanded: false },
  { id: 'family', filterKey: 'family', title: 'Wife MEd & Family Pathway', icon: <GraduationCap size={20} />, defaultExpanded: false },
  { id: 'selfemployed', filterKey: 'selfemployed', title: 'Self-Employed Persons Program', icon: <Briefcase size={20} />, defaultExpanded: false },
  { id: 'ptmarket', filterKey: 'ptmarket', title: 'PT Market & Wealthy Neighborhoods', icon: <MapPin size={20} />, defaultExpanded: false },
  { id: 'resources', filterKey: 'immigration', title: 'Resource Links', icon: <Globe size={20} />, defaultExpanded: false },
];

/* ═══════════════════════════════════════════════════════════════════
   RESOURCE LINK DATA (enhanced from v1)
   ═══════════════════════════════════════════════════════════════════ */

const RESOURCES: ResourceCategory[] = [
  {
    key: 'marriage',
    label: 'Marriage & Legal',
    icon: <Heart size={18} />,
    color: '#ef4444',
    items: [
      { title: 'OC Clerk-Recorder', description: 'Orange County marriage license application and appointment scheduling.', url: 'https://www.ocrecorder.com/services/marriage-licenses' },
      { title: 'OC Weddings Portal', description: 'Online marriage license application — start here.', url: 'https://ocweddings.ocrecorder.com' },
      { title: 'OC Superior Court', description: 'Courthouse ceremony info and civil ceremony scheduling.', url: 'https://www.occourts.org/self-help/family-law/marriage.html' },
      { title: 'California Marriage Requirements', description: 'State of California marriage license requirements and fees.', url: 'https://www.cdph.ca.gov/Programs/CHSI/Pages/Marriage-Registration.aspx' },
    ],
  },
  {
    key: 'tribal',
    label: 'Chickasaw Nation',
    icon: <Feather size={18} />,
    color: '#f97316',
    items: [
      { title: 'Chickasaw.net', description: 'Official Chickasaw Nation website — services, history, and enrollment.', url: 'https://www.chickasaw.net/' },
      { title: 'Tribal Government Services (TGS)', description: 'Phone: (580) 436-2603. Enrollment verification and CDIB card.', url: 'https://www.chickasaw.net/Services/Tribal-Government-Services.aspx' },
      { title: 'Dawes Roll Search', description: 'Search Dawes Rolls to verify Chickasaw ancestry and enrollment eligibility.', url: 'https://www.accessgenealogy.com/native/dawes-rolls.htm' },
      { title: 'Holisso Research Center', description: 'Chickasaw cultural research center for genealogy and tribal history.', url: 'https://www.chickasaw.net/holisso' },
      { title: 'ETC Office (Education)', description: 'Chickasaw Nation Education Training Center — scholarship and education programs.', url: 'https://www.chickasaw.net/Services/Education.aspx' },
    ],
  },
  {
    key: 'immigration',
    label: 'Immigration',
    icon: <Globe size={18} />,
    color: '#8B5CF6',
    items: [
      { title: 'IRCC Express Entry', description: 'Official Immigration, Refugees and Citizenship Canada Express Entry portal.', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html' },
      { title: 'CRS Score Calculator (Official)', description: 'Official IRCC Comprehensive Ranking System tool.', url: 'https://ircc.canada.ca/english/immigrate/skilled/crs-tool.asp' },
      { title: 'Ontario HCP (OINP)', description: 'Ontario Immigrant Nominee Program — tech & human capital stream.', url: 'https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp' },
      { title: 'BC Tech Pilot PNP', description: 'British Columbia Provincial Nominee Program — tech sector pathway.', url: 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-skills-immigration/bc-pnp-tech' },
      { title: 'Indigenous Mobility Rights', description: 'Jay Treaty and Chickasaw heritage impact on US-Canada border crossing.', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/indigenous-peoples.html' },
      { title: 'Express Entry Rounds (Tracker)', description: 'Track recent Express Entry draw cutoffs and invitation rounds.', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html' },
      { title: 'IRCC Self-Employed Persons', description: 'Federal Self-Employed Persons Program — for athletes, coaches, artists.', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/self-employed.html' },
    ],
  },
  {
    key: 'family',
    label: 'Family Pathway',
    icon: <GraduationCap size={18} />,
    color: '#8B5CF6',
    items: [
      { title: 'McGill MEd Program', description: 'McGill University Faculty of Education — Master of Education programs.', url: 'https://www.mcgill.ca/education/programs' },
      { title: 'UBC MEd Program', description: 'University of British Columbia — Master of Education programs.', url: 'https://educ.ubc.ca/programs/' },
      { title: 'Concordia MEd Program', description: 'Concordia University — Master of Education, Montreal campus.', url: 'https://www.concordia.ca/academics/graduate/education.html' },
      { title: 'UofT MEd Program', description: 'University of Toronto OISE — Master of Education programs.', url: 'https://www.oise.utoronto.ca/oise/Programs/' },
      { title: 'Spousal Open Work Permit', description: 'IRCC guide for spouses of study permit holders.', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/work/help-your-spouse-common-law-work-canada.html' },
      { title: 'Super Visa (Grandma)', description: 'IRCC Super Visa requirements for parents and grandparents.', url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/parent-grandparent-super-visa.html' },
    ],
  },
  {
    key: 'language',
    label: 'Language Tests',
    icon: <BookOpen size={18} />,
    color: '#60C0F0',
    items: [
      { title: 'IELTS Registration', description: 'Register for IELTS General Training — accepted for Express Entry.', url: 'https://www.ielts.org/book-a-test' },
      { title: 'TEF Canada Registration', description: 'Register for TEF Canada — French language proficiency for immigration.', url: 'https://www.lefrancaisdesaffaires.fr/en/tests-diplomas/test-evaluation-francais-tef/tef-canada/' },
      { title: 'Pimsleur French', description: 'Audio-based French learning — excellent for speaking and listening.', url: 'https://www.pimsleur.com/learn-french' },
      { title: 'iTalki French Tutors', description: 'Find native French tutors for 1-on-1 conversation practice.', url: 'https://www.italki.com/en/teachers/french' },
      { title: 'Duolingo French', description: 'Free gamified French learning — good for vocabulary building.', url: 'https://www.duolingo.com/course/fr/en/Learn-French' },
    ],
  },
  {
    key: 'certification',
    label: 'AI Certifications',
    icon: <Monitor size={18} />,
    color: '#22c55e',
    items: [
      { title: 'Coursera IBM AI Engineering', description: 'IBM AI Engineering Professional Certificate — ML, DL, TensorFlow.', url: 'https://www.coursera.org/professional-certificates/ai-engineer' },
      { title: 'AWS ML Specialty Exam', description: 'AWS Certified Machine Learning — Specialty certification exam.', url: 'https://aws.amazon.com/certification/certified-machine-learning-specialty/' },
      { title: 'Microsoft Learn (Azure AI)', description: 'Azure AI Engineer Associate — free learning paths and exam prep.', url: 'https://learn.microsoft.com/en-us/certifications/azure-ai-engineer/' },
      { title: 'Google Cloud ML Engineer', description: 'Google Professional Machine Learning Engineer certification.', url: 'https://cloud.google.com/certification/machine-learning-engineer' },
    ],
  },
  {
    key: 'pt_market',
    label: 'Canadian PT',
    icon: <Dumbbell size={18} />,
    color: '#06b6d4',
    items: [
      { title: 'CSEP Certification', description: 'Canadian Society for Exercise Physiology — credential equivalency for PTs.', url: 'https://csep.ca/certification/' },
      { title: 'canfitpro Certification', description: "Canada's largest fitness education provider — PTS certification.", url: 'https://www.canfitpro.com/certifications/' },
      { title: 'Toronto Recreation', description: 'City of Toronto recreation and community fitness programs.', url: 'https://www.toronto.ca/community-people/get-involved/community/community-recreation/' },
      { title: 'Vancouver Recreation', description: 'City of Vancouver parks and recreation fitness info.', url: 'https://vancouver.ca/parks-recreation-culture/recreation.aspx' },
      { title: 'Montreal Sports', description: 'City of Montreal sports and physical activities portal.', url: 'https://montreal.ca/en/topics/sports-and-physical-activities' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════════════════ */

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to   { opacity: 1; max-height: 4000px; }
`;

/* ═══════════════════════════════════════════════════════════════════
   STYLED COMPONENTS — Gemini 3.1 Pro Crystalline Swan Design System
   ═══════════════════════════════════════════════════════════════════ */

const Container = styled.div`
  animation: ${fadeIn} 0.4s ease-out;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

/* ── Filter Chips ── */

const FilterBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
`;

const FilterChip = styled.button<{ $active: boolean; $color: string }>`
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid ${(p) => (p.$active ? p.$color : 'rgba(96, 192, 240, 0.15)')};
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
  background: ${(p) => (p.$active ? `${p.$color}22` : 'rgba(0, 32, 96, 0.15)')};
  backdrop-filter: blur(16px) saturate(180%);
  color: ${(p) => (p.$active ? '#E0ECF4' : '#A0ABC0')};
  box-shadow: ${(p) => (p.$active ? `0 0 24px ${p.$color}26` : 'none')};

  &:hover {
    background: ${(p) => `${p.$color}18`};
    color: #E0ECF4;
    border-color: ${(p) => p.$color};
  }
`;

/* ── Collapsible Section Card ── */

const SectionCard = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 16px;
  box-shadow: 0 0 24px rgba(139, 92, 246, 0.15);
  overflow: hidden;
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(96, 192, 240, 0.25);
  }
`;

const SectionHeader = styled.button<{ $expanded: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  background: transparent;
  border: none;
  cursor: pointer;
  min-height: 44px;
  text-align: left;
  color: #E0ECF4;

  @media (max-width: 480px) {
    padding: 16px;
  }
`;

const SectionIconWrap = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
  flex-shrink: 0;
`;

const SectionTitle = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #E0ECF4;
  flex: 1;

  @media (max-width: 480px) {
    font-size: 16px;
  }
`;

const ChevronWrap = styled.span<{ $expanded: boolean }>`
  display: flex;
  align-items: center;
  color: #A0ABC0;
  transition: transform 0.25s ease;
  transform: rotate(${(p) => (p.$expanded ? '180deg' : '0deg')});
`;

const SectionBody = styled.div<{ $expanded: boolean }>`
  ${(p) =>
    p.$expanded
      ? css`
          animation: ${slideDown} 0.3s ease-out forwards;
          padding: 0 24px 24px;
          @media (max-width: 480px) {
            padding: 0 16px 16px;
          }
        `
      : css`
          display: none;
        `}
`;

/* ── Step Visualizations ── */

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
`;

const StepItem = styled.div`
  display: flex;
  gap: 16px;
  position: relative;

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 19px;
    top: 44px;
    bottom: 0;
    width: 2px;
    background: rgba(96, 192, 240, 0.2);
  }
`;

const StepNumber = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${(p) => p.$color || 'rgba(139, 92, 246, 0.2)'};
  border: 2px solid ${(p) => p.$color || 'rgba(139, 92, 246, 0.4)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-weight: 500;
  font-size: 14px;
  color: #E0ECF4;
  flex-shrink: 0;
  z-index: 1;
`;

const StepContent = styled.div`
  flex: 1;
  padding-bottom: 24px;
`;

const StepTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #E0ECF4;
  margin-bottom: 4px;
`;

const StepDesc = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: #A0ABC0;
  line-height: 1.6;
`;

const StepDetail = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 500;
  color: #60C0F0;
  margin-top: 4px;
`;

/* ── Tables ── */

const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.15);
  margin: 12px 0;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
`;

const Th = styled.th`
  padding: 14px 16px;
  text-align: left;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #60C0F0;
  background: rgba(0, 32, 96, 0.3);
  border-bottom: 1px solid rgba(96, 192, 240, 0.15);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 12px 16px;
  color: #A0ABC0;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
  font-weight: 400;
  line-height: 1.5;
  vertical-align: top;
`;

const TdHighlight = styled(Td)`
  color: #E0ECF4;
  font-weight: 500;
`;

const TdMoney = styled(Td)`
  font-family: 'Fira Code', monospace;
  font-weight: 500;
  color: #C6A84B;
`;

const TdBadge = styled(Td)<{ $level: 'elite' | 'excellent' | 'verygood' }>`
  font-weight: 600;
  color: ${(p) =>
    p.$level === 'elite'
      ? '#C6A84B'
      : p.$level === 'excellent'
      ? '#8B5CF6'
      : '#60C0F0'};
`;

/* ── Callout Boxes ── */

const CalloutBox = styled.div<{ $variant?: 'info' | 'warning' | 'success' | 'gold' }>`
  padding: 16px 20px;
  border-radius: 12px;
  margin: 12px 0;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.6;
  color: #E0ECF4;

  ${(p) => {
    switch (p.$variant) {
      case 'warning':
        return css`
          background: rgba(249, 115, 22, 0.1);
          border: 1px solid rgba(249, 115, 22, 0.25);
        `;
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.25);
        `;
      case 'gold':
        return css`
          background: rgba(198, 168, 75, 0.1);
          border: 1px solid rgba(198, 168, 75, 0.25);
        `;
      default:
        return css`
          background: rgba(96, 192, 240, 0.08);
          border: 1px solid rgba(96, 192, 240, 0.2);
        `;
    }
  }}
`;

const CalloutIcon = styled.span<{ $color?: string }>`
  flex-shrink: 0;
  color: ${(p) => p.$color || '#60C0F0'};
  margin-top: 2px;
`;

const CalloutText = styled.div`
  flex: 1;
`;

/* ── Cost Summary ── */

const CostRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);

  &:last-child {
    border-bottom: none;
    padding-top: 12px;
    margin-top: 4px;
    border-top: 1px solid rgba(96, 192, 240, 0.2);
  }
`;

const CostLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: #A0ABC0;
`;

const CostValue = styled.span<{ $total?: boolean }>`
  font-family: 'Fira Code', monospace;
  font-weight: 500;
  font-size: ${(p) => (p.$total ? '16px' : '14px')};
  color: ${(p) => (p.$total ? '#C6A84B' : '#E0ECF4')};
`;

/* ── Inline Badges / Labels ── */

const StatusBadge = styled.span<{ $status: 'paused' | 'active' | 'critical' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 500;

  ${(p) => {
    switch (p.$status) {
      case 'paused':
        return css`
          background: rgba(249, 115, 22, 0.15);
          color: #f97316;
          border: 1px solid rgba(249, 115, 22, 0.3);
        `;
      case 'active':
        return css`
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        `;
      case 'critical':
        return css`
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        `;
    }
  }}
`;

/* ── City Section Header ── */

const CityHeader = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 20px 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;

  &:first-of-type {
    margin-top: 4px;
  }
`;

/* ── Document Prep List ── */

const DocList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const DocItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: #A0ABC0;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    margin-top: 3px;
    color: #60C0F0;
  }
`;

/* ── Resource Link Cards ── */

const ResourceSectionLabel = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 20px 0 12px;
  display: flex;
  align-items: center;
  gap: 10px;

  &:first-of-type {
    margin-top: 0;
  }
`;

const ResourceColorBar = styled.span<{ $color: string }>`
  width: 3px;
  height: 16px;
  border-radius: 2px;
  background: ${(p) => p.$color};
`;

const ResourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const ResourceCard = styled.div`
  background: rgba(0, 32, 96, 0.15);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(139, 92, 246, 0.35);
    box-shadow: 0 0 24px rgba(139, 92, 246, 0.15);
    transform: translateY(-2px);
  }
`;

const ResourceCardTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #E0ECF4;
`;

const ResourceCardDesc = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 400;
  color: #A0ABC0;
  line-height: 1.5;
  flex: 1;
`;

const ResourceLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 18px;
  background: rgba(96, 192, 240, 0.08);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 10px;
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  margin-top: 4px;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.35);
    color: #8B5CF6;
  }
`;

/* ── Sub-section header ── */

const SubHeader = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 600;
  color: #E0ECF4;
  margin: 16px 0 8px;
`;

const BodyText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: #A0ABC0;
  line-height: 1.7;
  margin: 4px 0;
`;

const ExternalAnchor = styled.a`
  color: #60C0F0;
  text-decoration: none;
  font-weight: 500;
  &:hover { color: #8B5CF6; text-decoration: underline; }
`;

/* ── Score Table Specifics ── */

const ScoreGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 24px;
  padding: 12px 16px;
  background: rgba(0, 32, 96, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(96, 192, 240, 0.1);
  margin: 8px 0;
`;

const ScoreLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: #A0ABC0;
  padding: 4px 0;
`;

const ScoreValue = styled.span<{ $highlight?: boolean }>`
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  font-weight: 500;
  color: ${(p) => (p.$highlight ? '#C6A84B' : '#E0ECF4')};
  text-align: right;
  padding: 4px 0;
`;

/* ── Divider ── */

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(96, 192, 240, 0.1);
  margin: 16px 0;
`;

/* ═══════════════════════════════════════════════════════════════════
   COLLAPSIBLE SECTION WRAPPER
   ═══════════════════════════════════════════════════════════════════ */

interface CollapsibleProps {
  section: SectionDef;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}

const Collapsible: React.FC<CollapsibleProps> = ({ section, children, expanded, onToggle }) => (
  <SectionCard>
    <SectionHeader $expanded={expanded} onClick={onToggle} aria-expanded={expanded}>
      <SectionIconWrap>{section.icon}</SectionIconWrap>
      <SectionTitle>{section.title}</SectionTitle>
      <ChevronWrap $expanded={expanded}>
        <ChevronDown size={20} />
      </ChevronWrap>
    </SectionHeader>
    <SectionBody $expanded={expanded}>{children}</SectionBody>
  </SectionCard>
);

/* ═══════════════════════════════════════════════════════════════════
   SECTION CONTENT RENDERERS
   ═══════════════════════════════════════════════════════════════════ */

/* ── 1. Marriage Step-by-Step ── */

const MarriageSection: React.FC = () => (
  <>
    <CalloutBox $variant="info">
      <CalloutIcon><MapPin size={18} /></CalloutIcon>
      <CalloutText>
        <strong>OC Clerk-Recorder, Anaheim Branch</strong><br />
        222 S. Harbor Blvd., Ste. 110A &amp; 110B, Anaheim, CA 92805
      </CalloutText>
    </CalloutBox>

    <StepList>
      <StepItem>
        <StepNumber $color="rgba(239, 68, 68, 0.25)">1</StepNumber>
        <StepContent>
          <StepTitle>Apply Online</StepTitle>
          <StepDesc>
            Start your marriage license application at{' '}
            <ExternalAnchor href="https://ocweddings.ocrecorder.com" target="_blank" rel="noopener noreferrer">
              ocweddings.ocrecorder.com
            </ExternalAnchor>
          </StepDesc>
        </StepContent>
      </StepItem>

      <StepItem>
        <StepNumber $color="rgba(239, 68, 68, 0.25)">2</StepNumber>
        <StepContent>
          <StepTitle>Show Up Together</StepTitle>
          <StepDesc>Both parties must appear in person with valid photo IDs (driver's license, passport, or state ID).</StepDesc>
        </StepContent>
      </StepItem>

      <StepItem>
        <StepNumber $color="rgba(239, 68, 68, 0.25)">3</StepNumber>
        <StepContent>
          <StepTitle>Pay Fees</StepTitle>
          <StepDesc>License + ceremony fees vary by type.</StepDesc>
          <div style={{ marginTop: 8 }}>
            <CostRow><CostLabel>Public License</CostLabel><CostValue>$61</CostValue></CostRow>
            <CostRow><CostLabel>Confidential License</CostLabel><CostValue>$66</CostValue></CostRow>
            <CostRow><CostLabel>Ceremony</CostLabel><CostValue>$28</CostValue></CostRow>
            <CostRow><CostLabel>Certified Copy (each)</CostLabel><CostValue>$17</CostValue></CostRow>
            <CostRow>
              <CostLabel><strong>Total Estimate (3 copies)</strong></CostLabel>
              <CostValue $total>~$140</CostValue>
            </CostRow>
          </div>
        </StepContent>
      </StepItem>

      <StepItem>
        <StepNumber $color="rgba(239, 68, 68, 0.25)">4</StepNumber>
        <StepContent>
          <StepTitle>Bring 1 Witness</StepTitle>
          <StepDesc>At least one witness (18+) must be present at the ceremony.</StepDesc>
        </StepContent>
      </StepItem>

      <StepItem>
        <StepNumber $color="rgba(239, 68, 68, 0.25)">5</StepNumber>
        <StepContent>
          <StepTitle>Get 3+ Certified Copies</StepTitle>
          <StepDesc>
            Order at least 3 certified copies ($17 each) — you will need them for immigration applications, name changes, and records.
          </StepDesc>
        </StepContent>
      </StepItem>
    </StepList>

    <CalloutBox $variant="info">
      <CalloutIcon><Info size={18} /></CalloutIcon>
      <CalloutText>
        <strong>Alternative Locations:</strong> Old OC Courthouse in Santa Ana, Laguna Hills Civic Center
      </CalloutText>
    </CalloutBox>
  </>
);

/* ── 2. Chickasaw 5-Step Process ── */

const ChickasawSection: React.FC = () => (
  <StepList>
    <StepItem>
      <StepNumber $color="rgba(249, 115, 22, 0.25)">1</StepNumber>
      <StepContent>
        <StepTitle>Dawes Roll Research</StepTitle>
        <StepDesc>
          Search{' '}
          <ExternalAnchor href="https://www.ancestry.com" target="_blank" rel="noopener noreferrer">Ancestry.com</ExternalAnchor>
          {' '}or the National Archives for your grandfather/father on the Dawes Rolls. This establishes your lineage to an enrolled Chickasaw citizen.
        </StepDesc>
      </StepContent>
    </StepItem>

    <StepItem>
      <StepNumber $color="rgba(249, 115, 22, 0.25)">2</StepNumber>
      <StepContent>
        <StepTitle>Gather Documents</StepTitle>
        <StepDesc>Collect the following documents:</StepDesc>
        <DocList>
          <DocItem><FileText size={14} /> Birth certificates (state-issued long-form) for you and connecting ancestors</DocItem>
          <DocItem><FileText size={14} /> Death certificate (if ancestor is deceased)</DocItem>
          <DocItem><FileText size={14} /> Sworn Statement Affidavit (must be notarized)</DocItem>
          <DocItem><FileText size={14} /> Recent color photograph</DocItem>
        </DocList>
      </StepContent>
    </StepItem>

    <StepItem>
      <StepNumber $color="rgba(249, 115, 22, 0.25)">3</StepNumber>
      <StepContent>
        <StepTitle>CDIB Card (Certificate of Degree of Indian Blood)</StepTitle>
        <StepDesc>
          Call Chickasaw Nation Tribal Government Services and submit your family tree chart with supporting documents.
        </StepDesc>
        <StepDetail>
          <Phone size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> TGS: (580) 436-7250
        </StepDetail>
      </StepContent>
    </StepItem>

    <StepItem>
      <StepNumber $color="rgba(249, 115, 22, 0.25)">4</StepNumber>
      <StepContent>
        <StepTitle>Chickasaw Citizenship Card</StepTitle>
        <StepDesc>
          After receiving your CDIB, apply for Chickasaw citizenship. The Chickasaw Nation uses lineal descent (no blood quantum minimum, no expiry).
        </StepDesc>
      </StepContent>
    </StepItem>

    <StepItem>
      <StepNumber $color="rgba(249, 115, 22, 0.25)">5</StepNumber>
      <StepContent>
        <StepTitle>Enhanced Tribal Citizenship ID (ETC)</StepTitle>
        <StepDesc>
          WHTI-compliant border crossing document. Requires an in-person interview in Ada, Oklahoma.
        </StepDesc>
        <StepDetail>
          <Phone size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> ETC Office: (580) 436-7259
        </StepDetail>
      </StepContent>
    </StepItem>
  </StepList>
);

/* ── 3. Jay Treaty Comparison ── */

const JayTreatySection: React.FC = () => (
  <>
    <BodyText>
      The Jay Treaty (1794) guaranteed Indigenous peoples the right to freely cross the US-Canada border.
      Implementation differs dramatically between the two countries.
    </BodyText>

    <TableWrapper>
      <StyledTable>
        <thead>
          <tr>
            <Th>USA Position</Th>
            <Th>Canada Position</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <Td style={{ color: '#E0ECF4' }}>
              Canadian-born Indigenous with 50%+ blood quantum can enter, live, and work in the US freely.
              No visa needed. Codified in <strong>INA Section 289</strong>.
            </Td>
            <Td style={{ color: '#E0ECF4' }}>
              Does <strong>NOT</strong> currently recognize Jay Treaty rights. However:
              <br /><br />
              <strong>Oct 2024:</strong> IRCC issued Temporary Public Policy for Indigenous work/study permits.
              <br />
              <strong>APM SP52:</strong> Commits to legislative amendments to IRPA.
            </Td>
          </tr>
        </tbody>
      </StyledTable>
    </TableWrapper>

    <CalloutBox $variant="warning">
      <CalloutIcon $color="#f97316"><AlertTriangle size={18} /></CalloutIcon>
      <CalloutText>
        Canada's position is evolving. The Oct 2024 Temporary Public Policy and APM SP52 amendments signal progress,
        but legislative change has not yet been enacted. Monitor IRCC updates closely.
      </CalloutText>
    </CalloutBox>
  </>
);

/* ── 4. Wife MEd & Family Pathway ── */

const FamilyPathwaySection: React.FC = () => (
  <>
    <SubHeader>The Strategy</SubHeader>
    <BodyText>
      Spouse B enrolls in a Canadian Master's program (MEd). Spouse A gets a spousal Open Work Permit (OWP).
      4 kids attend free public school. Grandma joins on a Super Visa.
    </BodyText>

    <CalloutBox $variant="critical">
      <CalloutIcon $color="#ef4444"><AlertTriangle size={18} /></CalloutIcon>
      <CalloutText>
        <strong>Critical Rule Change (January 2025):</strong> Spousal OWP is now LIMITED to spouses of
        Master's (16+ months) or PhD students only. Diploma and bachelor's students no longer qualify.
      </CalloutText>
    </CalloutBox>

    <SubHeader>Why Spouse B Leads</SubHeader>
    <BodyText>
      The principal applicant has a college degree and can pursue a Master's. The spouse has a GED and cannot directly enter a Master's program.
      This makes them the study permit holder and the spouse the OWP recipient.
    </BodyText>

    <SubHeader>Target Programs</SubHeader>
    <DocList>
      <DocItem>
        <GraduationCap size={14} />
        <ExternalAnchor href="https://www.mcgill.ca/education/programs" target="_blank" rel="noopener noreferrer">
          McGill University MEd
        </ExternalAnchor>{' '}
        — Montreal, QC
      </DocItem>
      <DocItem>
        <GraduationCap size={14} />
        <ExternalAnchor href="https://educ.ubc.ca/programs/" target="_blank" rel="noopener noreferrer">
          UBC MEd
        </ExternalAnchor>{' '}
        — Vancouver, BC
      </DocItem>
      <DocItem>
        <GraduationCap size={14} />
        <ExternalAnchor href="https://www.oise.utoronto.ca/oise/Programs/" target="_blank" rel="noopener noreferrer">
          University of Toronto OISE MEd
        </ExternalAnchor>{' '}
        — Toronto, ON
      </DocItem>
      <DocItem>
        <GraduationCap size={14} />
        <ExternalAnchor href="https://www.concordia.ca/academics/graduate/education.html" target="_blank" rel="noopener noreferrer">
          Concordia University MEd
        </ExternalAnchor>{' '}
        — Montreal, QC
      </DocItem>
    </DocList>

    <CalloutBox $variant="gold">
      <CalloutIcon $color="#C6A84B"><Star size={18} /></CalloutIcon>
      <CalloutText>
        <strong>Montreal is the top pick:</strong> Cheapest international tuition of any major Canadian city,
        plus French immersion bonus for immigration points.
      </CalloutText>
    </CalloutBox>
  </>
);

/* ── 5. Self-Employed Persons Program ── */

const SelfEmployedSection: React.FC = () => (
  <>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <StatusBadge $status="paused">PAUSED since April 2024</StatusBadge>
      <BodyText style={{ margin: 0 }}>Expected reopen: <strong style={{ color: '#E0ECF4' }}>2027</strong></BodyText>
    </div>

    <BodyText>
      Why it fits: 26 years NASM-certified Personal Trainer. The program specifically includes
      athletic trainers and coaches in its eligible occupations.
    </BodyText>

    <SubHeader>Score Estimate</SubHeader>
    <ScoreGrid>
      <ScoreLabel>Experience (self-employed)</ScoreLabel>
      <ScoreValue>35 pts</ScoreValue>
      <ScoreLabel>Education</ScoreLabel>
      <ScoreValue>5 pts</ScoreValue>
      <ScoreLabel>Age</ScoreLabel>
      <ScoreValue>5-10 pts</ScoreValue>
      <ScoreLabel>Language (English)</ScoreLabel>
      <ScoreValue>20-24 pts</ScoreValue>
      <ScoreLabel>Adaptability</ScoreLabel>
      <ScoreValue>3-6 pts</ScoreValue>
      <ScoreLabel><strong>Total Estimate</strong></ScoreLabel>
      <ScoreValue $highlight>68-80 pts</ScoreValue>
      <ScoreLabel>Pass Mark</ScoreLabel>
      <ScoreValue $highlight>35 pts</ScoreValue>
    </ScoreGrid>

    <CalloutBox $variant="success">
      <CalloutIcon $color="#22c55e"><CheckCircle size={18} /></CalloutIcon>
      <CalloutText>
        Estimated score of 68-80 is well above the 35-point pass mark. Strong candidate when program reopens.
      </CalloutText>
    </CalloutBox>

    <SubHeader>Documents to Prepare NOW</SubHeader>
    <DocList>
      <DocItem><FileText size={14} /> Tax returns (last 5 years minimum)</DocItem>
      <DocItem><FileText size={14} /> Client contracts and testimonials</DocItem>
      <DocItem><FileText size={14} /> NASM certification (current and historical)</DocItem>
      <DocItem><FileText size={14} /> Business plan for Canadian PT practice</DocItem>
      <DocItem><FileText size={14} /> Bank statements (proof of funds)</DocItem>
      <DocItem><FileText size={14} /> Letters of recommendation from clients/industry</DocItem>
    </DocList>
  </>
);

/* ── 6. PT Market & Wealthy Neighborhoods ── */

const PTMarketSection: React.FC = () => (
  <>
    {/* Toronto */}
    <CityHeader><MapPin size={18} color="#60C0F0" /> Toronto</CityHeader>
    <TableWrapper>
      <StyledTable>
        <thead>
          <tr>
            <Th>Neighborhood</Th>
            <Th>Avg Net Worth</Th>
            <Th>Home Prices</Th>
            <Th>PT Opportunity</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TdHighlight>Bridle Path</TdHighlight>
            <TdMoney>$22.7M</TdMoney>
            <Td>$2.2M - $45M</Td>
            <TdBadge $level="elite">ELITE</TdBadge>
          </tr>
          <tr>
            <TdHighlight>York Mills</TdHighlight>
            <TdMoney>$21.5M</TdMoney>
            <Td>$3.4M avg</Td>
            <TdBadge $level="elite">ELITE</TdBadge>
          </tr>
          <tr>
            <TdHighlight>Forest Hill / Rosedale</TdHighlight>
            <TdMoney>$8M - $10M+</TdMoney>
            <Td>$2M - $15M+</Td>
            <TdBadge $level="excellent">EXCELLENT</TdBadge>
          </tr>
        </tbody>
      </StyledTable>
    </TableWrapper>

    {/* Vancouver */}
    <CityHeader><MapPin size={18} color="#60C0F0" /> Vancouver</CityHeader>
    <TableWrapper>
      <StyledTable>
        <thead>
          <tr>
            <Th>Neighborhood</Th>
            <Th>Avg Net Worth</Th>
            <Th>Home Prices</Th>
            <Th>PT Opportunity</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TdHighlight>Shaughnessy</TdHighlight>
            <TdMoney>$12M</TdMoney>
            <Td>$7M median</Td>
            <TdBadge $level="elite">ELITE</TdBadge>
          </tr>
          <tr>
            <TdHighlight>West Vancouver</TdHighlight>
            <TdMoney>$9M+</TdMoney>
            <Td>Up to $22.8M</Td>
            <TdBadge $level="elite">ELITE</TdBadge>
          </tr>
          <tr>
            <TdHighlight>Kerrisdale</TdHighlight>
            <TdMoney>$12.8M</TdMoney>
            <Td>$3M+</Td>
            <TdBadge $level="excellent">EXCELLENT</TdBadge>
          </tr>
        </tbody>
      </StyledTable>
    </TableWrapper>

    {/* Montreal */}
    <CityHeader><MapPin size={18} color="#C6A84B" /> Montreal (THE STRATEGIC PICK)</CityHeader>
    <TableWrapper>
      <StyledTable>
        <thead>
          <tr>
            <Th>Neighborhood</Th>
            <Th>Character</Th>
            <Th>Home Prices</Th>
            <Th>PT Opportunity</Th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <TdHighlight>Westmount</TdHighlight>
            <Td>English-speaking</Td>
            <Td>$2.5M - $25M+</Td>
            <TdBadge $level="excellent">EXCELLENT</TdBadge>
          </tr>
          <tr>
            <TdHighlight>Outremont</TdHighlight>
            <Td>French-speaking</Td>
            <Td>$2M - $10M+</Td>
            <TdBadge $level="excellent">EXCELLENT</TdBadge>
          </tr>
          <tr>
            <TdHighlight>Mount Royal</TdHighlight>
            <Td>Bilingual</Td>
            <Td>$1.5M - $5M+</Td>
            <TdBadge $level="verygood">VERY GOOD</TdBadge>
          </tr>
        </tbody>
      </StyledTable>
    </TableWrapper>

    <CalloutBox $variant="gold">
      <CalloutIcon $color="#C6A84B"><Star size={18} /></CalloutIcon>
      <CalloutText>
        <strong>WHY MONTREAL:</strong> Cost of living 30-40% lower than Toronto/Vancouver. Westmount is
        English-speaking (easy transition). French immersion earns bonus immigration points. Canada's #2 AI hub.
        Cheapest international tuition. Lowest CRS cutoffs in recent draws.
      </CalloutText>
    </CalloutBox>
  </>
);

/* ── 7. Resource Links Section ── */

const ResourceLinksSection: React.FC<{ activeFilter: FilterKey }> = ({ activeFilter }) => {
  const visibleCategories =
    activeFilter === 'all' || activeFilter === 'immigration'
      ? RESOURCES
      : RESOURCES.filter((c) => {
          const mapping: Record<string, string[]> = {
            marriage: ['marriage'],
            chickasaw: ['tribal'],
            family: ['family'],
            selfemployed: ['immigration'],
            ptmarket: ['pt_market'],
            language: ['language'],
            certification: ['certification'],
          };
          return (mapping[activeFilter] || []).includes(c.key);
        });

  return (
    <>
      {visibleCategories.map((cat) => (
        <div key={cat.key}>
          <ResourceSectionLabel>
            <ResourceColorBar $color={cat.color} />
            {cat.icon}
            {cat.label}
          </ResourceSectionLabel>
          <ResourceGrid>
            {cat.items.map((item) => (
              <ResourceCard key={item.url}>
                <ResourceCardTitle>{item.title}</ResourceCardTitle>
                <ResourceCardDesc>{item.description}</ResourceCardDesc>
                <ResourceLink href={item.url} target="_blank" rel="noopener noreferrer">
                  Open Resource <ExternalLink size={14} />
                </ResourceLink>
              </ResourceCard>
            ))}
          </ResourceGrid>
        </div>
      ))}
    </>
  );
};

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

const ResourceHub: React.FC<ResourceHubProps> = () => {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  // Initialize expanded state from section defaults
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    SECTIONS.forEach((s) => {
      initial[s.id] = s.defaultExpanded;
    });
    return initial;
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter visible sections
  const visibleSections =
    activeFilter === 'all'
      ? SECTIONS
      : SECTIONS.filter((s) => s.filterKey === activeFilter);

  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'marriage':
        return <MarriageSection />;
      case 'chickasaw':
        return <ChickasawSection />;
      case 'jaytreaty':
        return <JayTreatySection />;
      case 'family':
        return <FamilyPathwaySection />;
      case 'selfemployed':
        return <SelfEmployedSection />;
      case 'ptmarket':
        return <PTMarketSection />;
      case 'resources':
        return <ResourceLinksSection activeFilter={activeFilter} />;
      default:
        return null;
    }
  };

  return (
    <Container>
      {/* Filter Chips */}
      <FilterBar>
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            $active={activeFilter === f.key}
            $color={f.color}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </FilterChip>
        ))}
      </FilterBar>

      {/* Collapsible Sections */}
      {visibleSections.map((section) => (
        <Collapsible
          key={section.id}
          section={section}
          expanded={!!expandedSections[section.id]}
          onToggle={() => toggleSection(section.id)}
        >
          {renderSectionContent(section.id)}
        </Collapsible>
      ))}
    </Container>
  );
};

export default ResourceHub;
