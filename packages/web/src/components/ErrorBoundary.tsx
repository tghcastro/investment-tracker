import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './ui';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="cb-error-boundary">
          <div className="cb-error-boundary__content">
            <h1 className="cb-error-boundary__title">Something went wrong</h1>
            <p className="cb-error-boundary__message">
              An unexpected error occurred while loading this page.
            </p>
            <Button variant="secondary-light" onClick={this.handleReload}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
