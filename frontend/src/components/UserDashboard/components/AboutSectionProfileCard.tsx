/**
 * Profile info card for the active UserDashboard V3 about section.
 */

import React from 'react';
import { User } from 'lucide-react';
import {
  CardHeader,
  CardTitle,
  InfoCard,
  InfoContent,
  InfoIcon,
  InfoItem,
  InfoLabel,
  InfoList,
  InfoValue,
} from './AboutSection.styles';
import type { PersonalInfoItem } from './AboutSection.types';

interface AboutSectionProfileCardProps {
  personalInfo: PersonalInfoItem[];
}

const AboutSectionProfileCard: React.FC<AboutSectionProfileCardProps> = ({ personalInfo }) => (
  <InfoCard initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
    <CardHeader>
      <CardTitle>
        <User size={20} />
        Profile
      </CardTitle>
    </CardHeader>

    <InfoList>
      {personalInfo.map(({ Icon, label, value, color }) => (
        <InfoItem key={label}>
          <InfoIcon $color={color}>
            <Icon size={20} />
          </InfoIcon>
          <InfoContent>
            <InfoLabel>{label}</InfoLabel>
            <InfoValue>{value}</InfoValue>
          </InfoContent>
        </InfoItem>
      ))}
    </InfoList>
  </InfoCard>
);

export default AboutSectionProfileCard;
