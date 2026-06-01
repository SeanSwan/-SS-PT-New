import React from 'react';
import {
  ErrorBoundaryCopy,
  ErrorBoundaryPanel,
  ErrorBoundaryTitle,
  PageWrapper,
  PrimaryButton,
} from './WorkoutBuilderPage.styles';

class WorkoutBuilderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return (
        <PageWrapper>
          <ErrorBoundaryPanel>
            <ErrorBoundaryTitle>Something went wrong</ErrorBoundaryTitle>
            <ErrorBoundaryCopy>
              The Workout Builder encountered an error.
            </ErrorBoundaryCopy>
            <PrimaryButton $auto onClick={() => this.setState({ hasError: false })}>
              Try Again
            </PrimaryButton>
          </ErrorBoundaryPanel>
        </PageWrapper>
      );
    }
    return this.props.children;
  }
}

export default WorkoutBuilderErrorBoundary;
