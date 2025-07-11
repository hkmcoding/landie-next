'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AI Assistant Error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} retry={this.retry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Card className="p-6 border-red-200 bg-red-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="heading-4 text-red-900 mb-2">Something went wrong</h3>
          <p className="paragraph text-red-700 mb-4">
            {error.message || 'An unexpected error occurred in the AI Assistant.'}
          </p>
          <Button
            onClick={retry}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function AIErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={AIErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}

function AIErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
  const isAPIError = error.message.includes('API') || error.message.includes('OpenAI');
  const isAuthError = error.message.includes('Unauthorized') || error.message.includes('auth');

  let title = 'AI Assistant Error';
  let description = 'An unexpected error occurred. Please try again.';
  let suggestions: string[] = [];

  if (isNetworkError) {
    title = 'Connection Problem';
    description = 'Unable to connect to the AI service. Please check your internet connection.';
    suggestions = ['Check your internet connection', 'Try again in a few moments'];
  } else if (isAPIError) {
    title = 'AI Service Unavailable';
    description = 'The AI service is temporarily unavailable. Our team has been notified.';
    suggestions = ['Try again later', 'Contact support if the problem persists'];
  } else if (isAuthError) {
    title = 'Authentication Error';
    description = 'Please log in again to continue using the AI Assistant.';
    suggestions = ['Refresh the page', 'Log out and log back in'];
  }

  return (
    <Card className="p-6 border-red-200 bg-red-50">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
        <h3 className="heading-4 text-red-900 mb-2">{title}</h3>
        <p className="paragraph text-red-700 mb-4">{description}</p>
        
        {suggestions.length > 0 && (
          <div className="mb-4">
            <p className="subtitle-3 text-red-800 mb-2">Try these steps:</p>
            <ul className="text-sm text-red-700 space-y-1">
              {suggestions.map((suggestion, index) => (
                <li key={index}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="flex gap-2 justify-center">
          <Button
            onClick={retry}
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            Reload Page
          </Button>
        </div>
      </div>
    </Card>
  );
}