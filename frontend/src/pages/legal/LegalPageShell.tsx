/**
 * LegalPageShell.tsx
 * ====================
 * Shared layout for the public legal surfaces (/privacy, /terms).
 * Launch charter BP04 §6.3 — these routes previously did not exist and the
 * footer links silently bounced to Home. Token-styled, dark-first, readable
 * measure, WCAG-conscious. Content pages pass structured sections; the shell
 * renders Helmet meta + heading hierarchy.
 */
import React from 'react';
import styled from 'styled-components';
import { Helmet } from 'react-helmet-async';

const Page = styled.main`
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #e0ecf4);
  padding: 6.5rem 1.25rem 4rem;

  @media (min-width: 768px) {
    padding: 7.5rem 2rem 5rem;
  }
`;

const Sheet = styled.article`
  max-width: 760px;
  margin: 0 auto;
  background: var(--surface-elevated, #141419);
  border: 1px solid var(--border-subtle, #1a1a24);
  border-radius: 16px;
  padding: 2rem 1.5rem;

  @media (min-width: 768px) {
    padding: 3rem 3rem 3.5rem;
  }
`;

const Title = styled.h1`
  margin: 0 0 0.5rem;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  line-height: 1.15;
  color: var(--text-primary, #e0ecf4);
`;

const Updated = styled.p`
  margin: 0 0 2rem;
  font-size: 0.85rem;
  color: var(--text-secondary, #9fb3c8);
`;

const SectionHeading = styled.h2`
  margin: 2rem 0 0.75rem;
  font-size: 1.15rem;
  color: var(--accent-primary, #60c0f0);
`;

const Body = styled.div`
  font-size: 0.975rem;
  line-height: 1.7;
  color: var(--text-primary, #e0ecf4);

  p {
    margin: 0 0 1rem;
  }

  ul {
    margin: 0 0 1rem;
    padding-left: 1.25rem;
  }

  li {
    margin-bottom: 0.5rem;
  }

  a {
    color: var(--accent-primary, #60c0f0);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`;

export interface LegalSection {
  heading: string;
  body: React.ReactNode;
}

export interface LegalPageShellProps {
  title: string;
  metaDescription: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const LegalPageShell: React.FC<LegalPageShellProps> = ({
  title,
  metaDescription,
  lastUpdated,
  sections,
}) => (
  <Page>
    <Helmet>
      <title>{`${title} | SwanStudios`}</title>
      <meta name="description" content={metaDescription} />
    </Helmet>
    <Sheet>
      <Title>{title}</Title>
      <Updated>Last updated: {lastUpdated}</Updated>
      {sections.map((section) => (
        <section key={section.heading}>
          <SectionHeading>{section.heading}</SectionHeading>
          <Body>{section.body}</Body>
        </section>
      ))}
    </Sheet>
  </Page>
);

export default LegalPageShell;
