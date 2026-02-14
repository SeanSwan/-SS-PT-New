/**
 * OnboardingProfileView.tsx
 * =========================
 * Read-only display of a client's onboarding/master prompt data.
 * Used in both the client dashboard (OnboardingGalaxy) and admin ClientDetailsModal.
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  User, Target, Heart, Apple, Moon, Dumbbell, Activity
} from 'lucide-react';

// === TYPES ===
interface MasterPromptJson {
  version?: string;
  client?: {
    name?: string;
    preferredName?: string;
    alias?: string;
    age?: number | string;
    gender?: string;
    contact?: {
      phone?: string;
      email?: string;
      preferredTime?: string;
    };
  };
  measurements?: {
    height?: { feet?: number; inches?: number };
    currentWeight?: number;
    targetWeight?: number;
    bodyFatPercentage?: number;
  };
  goals?: {
    primary?: string;
    why?: string;
    successLooksLike?: string;
    timeline?: string;
    commitmentLevel?: number | string;
    pastObstacles?: string;
    supportNeeded?: string;
  };
  health?: Record<string, any>;
  nutrition?: Record<string, any>;
  lifestyle?: Record<string, any>;
  training?: Record<string, any>;
  baseline?: Record<string, any>;
}

interface OnboardingProfileViewProps {
  masterPromptJson: MasterPromptJson | null;
  spiritName?: string;
}

// === STYLED COMPONENTS ===
const ProfileGrid = styled.div`
  display: grid;
  gap: 1.25rem;
`;

const ProfileSection = styled(motion.div)`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(8px);
  border-radius: 14px;
  border: 1px solid rgba(0, 255, 255, 0.15);
  padding: 1.25rem;

  &:hover {
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
  color: #00ffff;
  font-size: 1.1rem;
  font-weight: 600;
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
`;

const FieldItem = styled.div`
  .field-label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.25rem;
  }
  .field-value {
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.9);
  }
  .field-empty {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.3);
    font-style: italic;
  }
`;

// === HELPERS ===
const Field: React.FC<{ label: string; value: any }> = ({ label, value }) => (
  <FieldItem>
    <div className="field-label">{label}</div>
    {value != null && value !== '' ? (
      <div className="field-value">{String(value)}</div>
    ) : (
      <div className="field-empty">Not yet provided</div>
    )}
  </FieldItem>
);

const renderObjectFields = (obj: Record<string, any> | undefined, prefix = '') => {
  if (!obj || typeof obj !== 'object') return null;
  return Object.entries(obj)
    .filter(([, v]) => v != null && v !== '' && typeof v !== 'object')
    .map(([key, value]) => (
      <Field key={`${prefix}${key}`} label={key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')} value={value} />
    ));
};

// === COMPONENT ===
const OnboardingProfileView: React.FC<OnboardingProfileViewProps> = ({ masterPromptJson, spiritName }) => {
  if (!masterPromptJson) {
    return (
      <ProfileSection initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p style={{ color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center', padding: '2rem 0' }}>
          No onboarding data available.
        </p>
      </ProfileSection>
    );
  }

  const mp = masterPromptJson;
  const fadeIn = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

  return (
    <ProfileGrid>
      {/* Basic Info */}
      <ProfileSection {...fadeIn} transition={{ delay: 0 }}>
        <SectionHeader><User size={20} /> Basic Info</SectionHeader>
        <FieldGrid>
          <Field label="Name" value={mp.client?.preferredName || mp.client?.name} />
          <Field label="Spirit Name" value={spiritName || mp.client?.alias} />
          <Field label="Age" value={mp.client?.age} />
          <Field label="Gender" value={mp.client?.gender} />
          <Field label="Contact" value={mp.client?.contact?.email} />
          <Field label="Phone" value={mp.client?.contact?.phone} />
        </FieldGrid>
      </ProfileSection>

      {/* Goals */}
      {mp.goals && (
        <ProfileSection {...fadeIn} transition={{ delay: 0.05 }}>
          <SectionHeader><Target size={20} /> Goals</SectionHeader>
          <FieldGrid>
            <Field label="Primary Goal" value={mp.goals.primary} />
            <Field label="Why" value={mp.goals.why} />
            <Field label="Success Looks Like" value={mp.goals.successLooksLike} />
            <Field label="Timeline" value={mp.goals.timeline} />
            <Field label="Commitment Level" value={mp.goals.commitmentLevel ? `${mp.goals.commitmentLevel}/10` : undefined} />
            <Field label="Past Obstacles" value={mp.goals.pastObstacles} />
          </FieldGrid>
        </ProfileSection>
      )}

      {/* Health */}
      {mp.health && (
        <ProfileSection {...fadeIn} transition={{ delay: 0.1 }}>
          <SectionHeader><Heart size={20} /> Health</SectionHeader>
          <FieldGrid>{renderObjectFields(mp.health)}</FieldGrid>
        </ProfileSection>
      )}

      {/* Nutrition */}
      {mp.nutrition && (
        <ProfileSection {...fadeIn} transition={{ delay: 0.15 }}>
          <SectionHeader><Apple size={20} /> Nutrition</SectionHeader>
          <FieldGrid>{renderObjectFields(mp.nutrition)}</FieldGrid>
        </ProfileSection>
      )}

      {/* Lifestyle */}
      {mp.lifestyle && (
        <ProfileSection {...fadeIn} transition={{ delay: 0.2 }}>
          <SectionHeader><Moon size={20} /> Lifestyle</SectionHeader>
          <FieldGrid>{renderObjectFields(mp.lifestyle)}</FieldGrid>
        </ProfileSection>
      )}

      {/* Training */}
      {mp.training && (
        <ProfileSection {...fadeIn} transition={{ delay: 0.25 }}>
          <SectionHeader><Dumbbell size={20} /> Training</SectionHeader>
          <FieldGrid>{renderObjectFields(mp.training)}</FieldGrid>
        </ProfileSection>
      )}

      {/* Baseline Measurements */}
      {mp.baseline && (
        <ProfileSection {...fadeIn} transition={{ delay: 0.3 }}>
          <SectionHeader><Activity size={20} /> Baseline</SectionHeader>
          <FieldGrid>{renderObjectFields(mp.baseline)}</FieldGrid>
        </ProfileSection>
      )}
    </ProfileGrid>
  );
};

export default OnboardingProfileView;
