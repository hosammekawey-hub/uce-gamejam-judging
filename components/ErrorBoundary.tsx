
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">
              💥
            </div>
            <h1 className="text-2xl font-black mb-2">Something went wrong.</h1>
            <p className="text-slate-400 text-sm mb-6">
              The application encountered an unexpected error.
            </p>
            <div className="bg-black/30 p-4 rounded-xl text-left mb-6 overflow-auto max-h-32">
                <code className="text-xs font-mono text-rose-400">
                    {this.state.error?.message}
                </code>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-indigo-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
