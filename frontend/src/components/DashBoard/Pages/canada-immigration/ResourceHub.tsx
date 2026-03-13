/**
 * ResourceHub.tsx
 * ──────────────────────────────────────────────────────────────────
 * Module 6: Organized resource link cards by category.
 * Marriage & Legal, Chickasaw Nation, Immigration, Language Tests,
 * AI Certifications, PT Market.
 * ──────────────────────────────────────────────────────────────────
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';

/* ────────── Data ────────── */

interface ResourceItem {
  title: string;
  description: string;
  url: string;
}

interface ResourceCategory {
  key: string;
  label: string;
  icon: string;
  color: string;
  items: ResourceItem[];
}

const RESOURCES: ResourceCategory[] = [
  {
    key: 'marriage',
    label: 'Marriage & Legal',
    icon: '\u{1F48D}',
    color: '#ef4444',
    items: [
      {
        title: 'OC Clerk-Recorder',
        description: 'Orange County marriage license application and appointment scheduling.',
        url: 'https://www.ocrecorder.com/services/marriage-licenses',
      },
      {
        title: 'OC Superior Court',
        description: 'Courthouse ceremony info and civil ceremony scheduling.',
        url: 'https://www.occourts.org/self-help/family-law/marriage.html',
      },
      {
        title: 'California Marriage Requirements',
        description: 'State of California marriage license requirements and fees.',
        url: 'https://www.cdph.ca.gov/Programs/CHSI/Pages/Marriage-Registration.aspx',
      },
      {
        title: 'USCIS Spousal Visa',
        description: 'If considering US spousal petition before Canada move.',
        url: 'https://www.uscis.gov/family/family-of-us-citizens',
      },
    ],
  },
  {
    key: 'tribal',
    label: 'Chickasaw Nation',
    icon: '\u{1F3DB}\uFE0F',
    color: '#f97316',
    items: [
      {
        title: 'Chickasaw.net',
        description: 'Official Chickasaw Nation website — services, history, and enrollment.',
        url: 'https://www.chickasaw.net/',
      },
      {
        title: 'Tribal Government Services (TGS)',
        description: 'Phone: (580) 436-2603. Enrollment verification and CDIB card.',
        url: 'https://www.chickasaw.net/Services/Tribal-Government-Services.aspx',
      },
      {
        title: 'Dawes Roll Search (Access Genealogy)',
        description: 'Search Dawes Rolls to verify Chickasaw ancestry and enrollment eligibility.',
        url: 'https://www.accessgenealogy.com/native/dawes-rolls.htm',
      },
      {
        title: 'Holisso Research Center',
        description: 'Chickasaw cultural research center for genealogy and tribal history.',
        url: 'https://www.chickasaw.net/holisso',
      },
      {
        title: 'ETC Office (Education)',
        description: 'Chickasaw Nation Education Training Center — scholarship and education programs.',
        url: 'https://www.chickasaw.net/Services/Education.aspx',
      },
    ],
  },
  {
    key: 'immigration',
    label: 'Immigration',
    icon: '\u{1F6C2}',
    color: '#8B5CF6',
    items: [
      {
        title: 'IRCC Express Entry',
        description: 'Official Immigration, Refugees and Citizenship Canada Express Entry portal.',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html',
      },
      {
        title: 'CRS Score Calculator (Official)',
        description: 'Official IRCC Comprehensive Ranking System tool.',
        url: 'https://ircc.canada.ca/english/immigrate/skilled/crs-tool.asp',
      },
      {
        title: 'Ontario Human Capital Priorities (HCP)',
        description: 'Ontario Immigrant Nominee Program — tech & human capital stream.',
        url: 'https://www.ontario.ca/page/ontario-immigrant-nominee-program-oinp',
      },
      {
        title: 'BC Tech Pilot PNP',
        description: 'British Columbia Provincial Nominee Program — tech sector pathway.',
        url: 'https://www.welcomebc.ca/immigrate-to-b-c/bc-pnp-skills-immigration/bc-pnp-tech',
      },
      {
        title: 'Indigenous Mobility Rights',
        description: 'Jay Treaty and Chickasaw heritage impact on US-Canada border crossing.',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/temporary-residents/visitors/indigenous-peoples.html',
      },
      {
        title: 'Express Entry Rounds (Tracker)',
        description: 'Track recent Express Entry draw cutoffs and invitation rounds.',
        url: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/rounds-invitations.html',
      },
    ],
  },
  {
    key: 'language',
    label: 'Language Tests',
    icon: '\u{1F4DD}',
    color: '#60C0F0',
    items: [
      {
        title: 'IELTS Registration',
        description: 'Register for IELTS General Training — accepted for Express Entry.',
        url: 'https://www.ielts.org/book-a-test',
      },
      {
        title: 'TEF Canada Registration',
        description: 'Register for TEF Canada — French language proficiency for immigration.',
        url: 'https://www.lefrancaisdesaffaires.fr/en/tests-diplomas/test-evaluation-francais-tef/tef-canada/',
      },
      {
        title: 'Pimsleur French',
        description: 'Audio-based French learning — excellent for speaking and listening.',
        url: 'https://www.pimsleur.com/learn-french',
      },
      {
        title: 'iTalki French Tutors',
        description: 'Find native French tutors for 1-on-1 conversation practice.',
        url: 'https://www.italki.com/en/teachers/french',
      },
      {
        title: 'Duolingo French',
        description: 'Free gamified French learning — good for vocabulary building.',
        url: 'https://www.duolingo.com/course/fr/en/Learn-French',
      },
    ],
  },
  {
    key: 'certification',
    label: 'AI Certifications',
    icon: '\u{1F4BB}',
    color: '#22c55e',
    items: [
      {
        title: 'Coursera IBM AI Engineering',
        description: 'IBM AI Engineering Professional Certificate — ML, DL, TensorFlow.',
        url: 'https://www.coursera.org/professional-certificates/ai-engineer',
      },
      {
        title: 'AWS ML Specialty Exam',
        description: 'AWS Certified Machine Learning — Specialty certification exam.',
        url: 'https://aws.amazon.com/certification/certified-machine-learning-specialty/',
      },
      {
        title: 'Microsoft Learn (Azure AI)',
        description: 'Azure AI Engineer Associate — free learning paths and exam prep.',
        url: 'https://learn.microsoft.com/en-us/certifications/azure-ai-engineer/',
      },
      {
        title: 'Google Cloud ML Engineer',
        description: 'Google Professional Machine Learning Engineer certification.',
        url: 'https://cloud.google.com/certification/machine-learning-engineer',
      },
    ],
  },
  {
    key: 'pt_market',
    label: 'PT Market Research',
    icon: '\u{1F4AA}',
    color: '#06b6d4',
    items: [
      {
        title: 'Toronto PT Market',
        description: 'Neighborhoods: Yorkville, Liberty Village, Financial District. High demand for luxury PT.',
        url: 'https://www.toronto.ca/community-people/get-involved/community/community-recreation/',
      },
      {
        title: 'Vancouver PT Market',
        description: 'Neighborhoods: Yaletown, Kitsilano, West End. Strong wellness culture.',
        url: 'https://vancouver.ca/parks-recreation-culture/recreation.aspx',
      },
      {
        title: 'Montreal PT Market',
        description: 'Neighborhoods: Plateau, Griffintown, Old Montreal. Bilingual advantage.',
        url: 'https://montreal.ca/en/topics/sports-and-physical-activities',
      },
      {
        title: 'Canadian PT Certification (CSEP)',
        description: 'Canadian Society for Exercise Physiology — may need credential equivalency.',
        url: 'https://csep.ca/certification/',
      },
      {
        title: 'canfitpro Certification',
        description: 'Canada\'s largest fitness education provider — PTS certification.',
        url: 'https://www.canfitpro.com/certifications/',
      },
    ],
  },
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

const CategoryFilter = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 24px;
`;

const FilterChip = styled.button<{ $active: boolean; $color: string }>`
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid ${(p) => (p.$active ? p.$color : 'rgba(96, 192, 240, 0.1)')};
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.15s;
  background: ${(p) => (p.$active ? `${p.$color}22` : 'rgba(0, 48, 128, 0.3)')};
  color: ${(p) => (p.$active ? '#E0ECF4' : 'rgba(224,236,244,0.5)')};

  &:hover {
    background: ${(p) => `${p.$color}15`};
    color: #E0ECF4;
  }
`;

const CategorySection = styled.div`
  margin-bottom: 32px;
`;

const CategoryTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0 0 16px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CatIconSpan = styled.span`
  font-size: 22px;
`;

const CatColorBar = styled.span<{ $color: string }>`
  width: 3px;
  height: 18px;
  border-radius: 2px;
  background: ${(p) => p.$color};
`;

const ResourceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const ResourceCard = styled.div`
  background: rgba(0, 48, 128, 0.3);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
  }
`;

const ResourceTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #E0ECF4;
`;

const ResourceDesc = styled.div`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.6);
  line-height: 1.5;
  flex: 1;
`;

const ResourceLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 10px 20px;
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 10px;
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s;
  margin-top: 4px;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.3);
    color: #8B5CF6;
  }
`;

/* ────────── Component ────────── */

const ResourceHub: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const visibleCategories = activeCategory === 'all'
    ? RESOURCES
    : RESOURCES.filter((c) => c.key === activeCategory);

  return (
    <Container>
      {/* Category Filter */}
      <CategoryFilter>
        <FilterChip
          $active={activeCategory === 'all'}
          $color="#60C0F0"
          onClick={() => setActiveCategory('all')}
        >
          All Categories
        </FilterChip>
        {RESOURCES.map((cat) => (
          <FilterChip
            key={cat.key}
            $active={activeCategory === cat.key}
            $color={cat.color}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.icon} {cat.label}
          </FilterChip>
        ))}
      </CategoryFilter>

      {/* Sections */}
      {visibleCategories.map((cat) => (
        <CategorySection key={cat.key}>
          <CategoryTitle>
            <CatColorBar $color={cat.color} />
            <CatIconSpan>{cat.icon}</CatIconSpan>
            {cat.label}
          </CategoryTitle>
          <ResourceGrid>
            {cat.items.map((item) => (
              <ResourceCard key={item.url}>
                <ResourceTitle>{item.title}</ResourceTitle>
                <ResourceDesc>{item.description}</ResourceDesc>
                <ResourceLink href={item.url} target="_blank" rel="noopener noreferrer">
                  Open Resource \u2197
                </ResourceLink>
              </ResourceCard>
            ))}
          </ResourceGrid>
        </CategorySection>
      ))}
    </Container>
  );
};

export default ResourceHub;
