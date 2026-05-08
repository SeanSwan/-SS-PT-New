/**
 * Loading, error, and render-failure states for UserDashboard V3.
 */

import React from 'react';
import styled from 'styled-components';
import {
  ContentWrapper,
  LoadingContainer,
  LoadingSpinner,
  MainContentZWrapper,
  NoiseOverlay,
  PrimaryButton,
  ProfileContainer,
} from '../styles/DashboardV3Styles';

const ErrorPanel = styled.div`
  display: flex;
  min-height: 50vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-primary, #E0ECF4);
`;

const ErrorCopy = styled.p`
  margin: 0 0 2rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
`;

interface DashboardErrorStateProps {
  title?: string;
  message: string;
}

export const UserDashboardLoadingState = () => (
  <ProfileContainer>
    <NoiseOverlay />
    <MainContentZWrapper>
      <LoadingContainer>
        <LoadingSpinner />
      </LoadingContainer>
    </MainContentZWrapper>
  </ProfileContainer>
);

export const UserDashboardErrorState: React.FC<DashboardErrorStateProps> = ({
  title = 'Error Loading Profile',
  message,
}) => (
  <ProfileContainer>
    <NoiseOverlay />
    <MainContentZWrapper>
      <ContentWrapper>
        <ErrorPanel>
          <h2>{title}</h2>
          <ErrorCopy>{message}</ErrorCopy>
          <PrimaryButton onClick={() => window.location.reload()}>
            Retry
          </PrimaryButton>
        </ErrorPanel>
      </ContentWrapper>
    </MainContentZWrapper>
  </ProfileContainer>
);

class UserDashboardErrorBoundaryV3 extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <UserDashboardErrorState
          title="Something went wrong"
          message="Please refresh the page to try again."
        />
      );
    }

    return this.props.children;
  }
}

export default UserDashboardErrorBoundaryV3;
