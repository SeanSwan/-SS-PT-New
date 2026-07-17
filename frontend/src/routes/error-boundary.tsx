/**
 * BLUEPRINT: Route Error Boundary
 * PURPOSE: Recover safely from router failures and hand off to the Report Room.
 * PRIVACY: Raw route errors are visible only in development and are never logged.
 */
import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import styled from 'styled-components';

import { buildSupportErrorRoute } from '../pages/support/supportErrorRoute';

const AlertContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 600px;
  min-height: 44px;
  margin: 20px auto;
  padding: 16px;
  border: 1px solid var(--danger-border, rgba(229, 72, 77, 0.5));
  border-radius: 10px;
  color: var(--danger-text, #F0938A);
  background: var(--danger-wash, rgba(229, 72, 77, 0.1));
  font: 600 16px/1.5 'Plus Jakarta Sans', sans-serif;
`;

const AlertIcon = styled.div`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
`;

const AlertMessage = styled.div`flex: 1;`;

const ErrorPanel = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  padding: 32px 20px;
  color: var(--frost-white, #E0ECF4);
  text-align: center;
  background: var(--error-page-bg, linear-gradient(135deg, #002060, #1A1A24));
`;

const ErrorTitle = styled.h1`
  margin: 0 0 16px;
  color: var(--danger-text, #F0938A);
  font: 700 clamp(26px, 5vw, 36px)/1.2 'Plus Jakarta Sans', sans-serif;
`;

const ErrorCopy = styled.p`
  max-width: 600px;
  margin: 0 0 28px;
  color: var(--text-secondary, #B8C7D9);
  font: 500 16px/1.6 'Plus Jakarta Sans', sans-serif;
`;

const RecoveryButton = styled.button`
  min-height: 44px;
  padding: 12px 20px;
  border: 1px solid var(--ice-wing, #60C0F0);
  border-radius: 10px;
  color: var(--frost-white, #E0ECF4);
  background: var(--midnight-sapphire, #002060);
  font: 700 14px 'Plus Jakarta Sans', sans-serif;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--wing-purple, #8B5CF6); outline-offset: 3px; }
`;

const ErrorActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  @media (max-width: 480px) { width: 100%; ${RecoveryButton} { width: 100%; } }
`;

const TechnicalDetails = styled.details`
  max-width: 600px;
  margin-top: 32px;
  text-align: left;
`;

const TechnicalSummary = styled.summary`
  min-height: 44px;
  color: var(--ice-wing, #60C0F0);
  cursor: pointer;
`;

const TechnicalPre = styled.pre`
  max-width: 100%;
  margin-top: 8px;
  padding: 16px;
  border-radius: 8px;
  overflow: auto;
  white-space: pre-wrap;
  background: var(--graphite, #1A1A24);
`;

const Alert: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AlertContainer role="alert">
    <AlertIcon><AlertTriangle size={20} aria-hidden="true" /></AlertIcon>
    <AlertMessage>{children}</AlertMessage>
  </AlertContainer>
);

const ErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  if (isRouteErrorResponse(error)) {
    switch (error.status) {
      case 404: return <Alert>Error 404 - This page does not exist.</Alert>;
      case 401: return <Alert>Error 401 - You are not authorized to see this.</Alert>;
      case 503: return <Alert>Error 503 - The service is temporarily unavailable.</Alert>;
      case 418: return <Alert>Error 418 - Contact the site owner.</Alert>;
      default: break;
    }
  }

  return (
    <ErrorPanel>
      <ErrorTitle>Application error</ErrorTitle>
      <ErrorCopy>
        A temporary issue interrupted this page. Return home to keep your browser session, or send Swan Coach a private report.
      </ErrorCopy>
      <ErrorActions>
        <RecoveryButton type="button" onClick={() => navigate('/', { replace: true })}>Return home</RecoveryButton>
        <RecoveryButton
          type="button"
          onClick={() => navigate(buildSupportErrorRoute(window.location.pathname, 'ROUTE_RENDER_ERROR'))}
        >
          Report this problem
        </RecoveryButton>
      </ErrorActions>
      {import.meta.env.DEV && (
        <TechnicalDetails>
          <TechnicalSummary>Technical details (development only)</TechnicalSummary>
          <TechnicalPre>{error instanceof Error ? error.message : 'Unknown error occurred'}</TechnicalPre>
        </TechnicalDetails>
      )}
    </ErrorPanel>
  );
};

export default ErrorBoundary;