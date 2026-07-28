import React from 'react';
import {
  SectionBand,
  SectionCopy,
  SectionEyebrow,
  SectionGrid,
  SectionHeader,
  SectionLead,
  SectionTitle,
} from './AdminOverviewCommandSurface.styles';

interface AdminOverviewSectionProps {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}

const AdminOverviewSection: React.FC<AdminOverviewSectionProps> = ({ id, eyebrow, title, lead, children }) => (
  <SectionBand id={id} aria-labelledby={`${id}-title`}>
    <SectionHeader>
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <SectionCopy>
        <SectionTitle id={`${id}-title`}>{title}</SectionTitle>
        <SectionLead>{lead}</SectionLead>
      </SectionCopy>
    </SectionHeader>
    <SectionGrid>{children}</SectionGrid>
  </SectionBand>
);

export default AdminOverviewSection;
