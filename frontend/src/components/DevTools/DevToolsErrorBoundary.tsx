import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary specifically for DevTools components
 * Prevents development tools from crashing the entire application
 */
class DevToolsErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console but don't interfere with production behavior
    console.error('[DEV MODE] Error in DevTools component:', error);
    console.info('[DEV MODE] Component stack:', errorInfo.componentStack);
  }

  // Allow error boundary to recover on prop changes
  componentDidUpdate(prevProps: Props): void {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Show fallback UI or minimal error message to avoid cluttering the app
      return this.props.fallback || (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'rgba(255, 65, 108, 0.1)',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.7)',
          maxWidth: '300px',
          backdropFilter: 'blur(5px)',
          border: '1px solid rgba(255, 65, 108, 0.3)',
          zIndex: 9000
        }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              DevTools Error (Click to expand)
            </summary>
            <div style={{ marginTop: '8px', wordBreak: 'break-word' }}>
              {this.state.error?.message || 'Unknown error in development tools'}
            </div>
            <button 
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                background: 'rgba(0, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                marginTop: '8px',
                cursor: 'pointer',
                color: 'white'
              }}
            >
              Reset
            </button>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DevToolsErrorBoundary;