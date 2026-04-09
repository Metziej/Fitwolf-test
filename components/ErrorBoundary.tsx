import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private parseFirestoreError(message: string) {
    try {
      return JSON.parse(message);
    } catch {
      return null;
    }
  }

  public render() {
    if (this.state.hasError) {
      const firestoreError = this.state.error ? this.parseFirestoreError(this.state.error.message) : null;

      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
          <div className="max-w-md border-2 border-[#FF2A2A] bg-[#050505] p-8 shadow-[0_0_50px_rgba(255,42,42,0.2)]">
            <h1 className="text-2xl font-black text-[#FF2A2A] uppercase italic mb-4 tracking-tighter">System Malfunction</h1>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-6 leading-relaxed">
              {firestoreError 
                ? `Access Denied: ${firestoreError.operationType} on ${firestoreError.path}. Insufficient permissions.`
                : "A critical error has occurred in the system core."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#FF2A2A] text-black font-black py-4 uppercase tracking-[0.5em] shadow-[0_0_20px_#FF2A2A]"
            >
              Reboot System
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-6 text-[8px] text-left text-gray-600 overflow-auto max-h-40 p-2 bg-black border border-gray-900">
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
