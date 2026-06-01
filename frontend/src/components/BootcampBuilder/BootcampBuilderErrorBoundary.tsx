import React from 'react';
import { PageWrapper, Panel, PanelTitle, PrimaryButton } from './BootcampBuilderStyles';

class BootcampBuilderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return (
        <PageWrapper>
          <Panel>
            <PanelTitle>Something went wrong</PanelTitle>
            <p>The Boot Camp Builder encountered an error.</p>
            <PrimaryButton onClick={() => this.setState({ hasError: false })}>
              Try Again
            </PrimaryButton>
          </Panel>
        </PageWrapper>
      );
    }
    return this.props.children;
  }
}

export default BootcampBuilderErrorBoundary;
