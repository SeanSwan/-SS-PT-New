/**
 * QuickLinksStrip — utility quick-nav band relocated OUT of the hero (finding H5,
 * five-surface hostile review 2026-09-01): the hero keeps exactly its two CTAs;
 * these role/utility links live below the fold in one calm band. De-golded per
 * LAW 2 (gold is an allowlist — PR numeral / ≤1px filigree / focus ring / one
 * badge — never link chrome). Static by design: no entrance motion, so the
 * reduced-motion path is the only path (LAW 6 calm budget).
 * @module pages/HomePage/components/sections/QuickLinksStrip
 */
import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { UserCircle, Camera, FileSignature, LayoutDashboard, Award } from 'lucide-react';
import logoImg from '../../../../assets/Logo.png';
import { useAuth } from '../../../../context/AuthContext';
import { quickLinksFor, type QuickLinkId } from './quickLinks.data';

const ICONS: Record<QuickLinkId, React.ReactNode> = {
  social: <img src={logoImg} alt="" width={16} height={16} />,
  'client-dashboard': <UserCircle size={16} />,
  'trainer-dashboard': <LayoutDashboard size={16} />,
  photography: <Camera size={16} />,
  waiver: <FileSignature size={16} />,
  'staff-review': <Award size={16} />,
};

const Band = styled.nav`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  padding: 1rem 1rem 1.25rem;
  background: var(--bg-base, #030712);
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.08));
`;

const Pill = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  text-decoration: none;
  transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
  border: 1px solid var(--border-prominent, rgba(0, 48, 128, 0.5));
  background: var(--bg-surface, rgba(0, 32, 96, 0.35));
  color: var(--text-primary, #e0ecf4);
  &:hover {
    border-color: var(--royal-purple-glow, rgba(139, 92, 246, 0.5));
    background: var(--surface-overlay, rgba(0, 32, 96, 0.6));
    box-shadow: 0 0 14px var(--royal-purple-glow, rgba(139, 92, 246, 0.2));
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

/** One calm sapphire treatment for every link — the carnival of per-pill colors
 * (incl. two gold pills) was the LAW-2 defect; differentiation is the icon. */
const QuickLinksStrip: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const links = quickLinksFor(Boolean(isAuthenticated), user?.role);

  return (
    <Band aria-label="Quick links">
      {links.map(({ id, label, to }) => (
        <Pill key={id} to={to}>
          {ICONS[id]}
          {label}
        </Pill>
      ))}
    </Band>
  );
};

export default QuickLinksStrip;
