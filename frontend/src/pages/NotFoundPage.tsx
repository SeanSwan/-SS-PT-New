/**
 * NotFoundPage.tsx
 * ================
 * Branded 404 page. The router's catch-all previously did a silent
 * `<Navigate to="/" />`, which made broken deep links (shared workout/social
 * URLs, typos) look like "the app dumped me home" and masked dead-route
 * regressions. This page says what happened and offers a way back.
 */
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

const NotFoundContainer = styled.main`
  min-height: calc(100dvh - var(--header-height, 64px) - env(safe-area-inset-top, 0px));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem 1.25rem 4rem;
  text-align: center;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
`;

const GlyphRow = styled.div`
  font-family: var(--font-heading, 'Sora', sans-serif);
  font-size: clamp(4rem, 18vw, 7rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.04em;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0) 0%, var(--accent-secondary, #8B5CF6) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Title = styled.h1`
  font-family: var(--font-heading, 'Sora', sans-serif);
  font-size: clamp(1.25rem, 4.5vw, 1.75rem);
  font-weight: 600;
  margin: 0;
`;

const Message = styled.p`
  max-width: 34rem;
  margin: 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 65%, transparent));
  line-height: 1.6;
  overflow-wrap: anywhere;
`;

const HomeCta = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  margin-top: 0.75rem;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  background: var(--brand-primary, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 26px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const NotFoundPage: React.FC = () => {
  const location = useLocation();

  return (
    <NotFoundContainer>
      <GlyphRow aria-hidden="true">404</GlyphRow>
      <Title>This page has flown off</Title>
      <Message>
        We couldn&apos;t find <code>{location.pathname}</code>. The link may be
        outdated, or the page may have moved.
      </Message>
      <HomeCta to="/">Back to SwanStudios</HomeCta>
    </NotFoundContainer>
  );
};

export default NotFoundPage;
