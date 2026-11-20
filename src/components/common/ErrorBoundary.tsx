import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('HeatLedger Unhandled Route Exception:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#FAFAFA] text-[#09090B] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl bg-[#FFFFFF] border border-[#E4E4E7] shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#FFFBEB] border-b border-[#FDE68A] flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#D97706] text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-mono font-semibold text-[#92400E]">
                  INTERFACE INTERRUPTED
                </div>
                <h2 className="text-sm font-semibold text-[#09090B]">
                  Something did not load properly
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-[#52525B] leading-relaxed">
                An unexpected client error occurred. Your saved drafts and server audit logs remain
                intact.
              </p>

              {this.state.error?.message && (
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] text-left">
                  <span className="text-xs font-mono text-[#52525B] block mb-1">
                    Diagnostic Message
                  </span>
                  <p className="text-xs font-mono text-[#DC2626] break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="w-full sm:flex-1 h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reload Screen</span>
                </button>
                <a
                  href="/"
                  className="w-full sm:flex-1 h-9 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-[#FAFAFA] hover:bg-[#F4F4F5] text-[#09090B] text-xs font-medium border border-[#E4E4E7] transition-colors"
                >
                  <Home className="w-3.5 h-3.5 text-[#52525B]" />
                  <span>Return Home</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
