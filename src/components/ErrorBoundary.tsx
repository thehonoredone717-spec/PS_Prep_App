import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let displayMsg = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed && typeof parsed.error === 'string') {
        displayMsg = `${parsed.operationType ? `[${parsed.operationType}] ` : ''}${parsed.error}`;
      }
    } catch {
      // Plain error string
    }
    return {
      hasError: true,
      message: displayMsg,
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6 text-slate-900">
          <div className="w-full max-w-md rounded-xl border border-rose-200 bg-white p-6 shadow-xs">
            <h1 className="font-display text-lg font-bold text-rose-800">
              Tizim xatoligi / Application Error
            </h1>
            <p className="mt-2 break-words text-sm text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex min-h-[40px] items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Qayta yuklash / Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
