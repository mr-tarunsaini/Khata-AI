import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled React error:', error, errorInfo)
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-[#F8F7F2] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl border border-[#E3E5E0] text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-[#17233B]">
              कुछ तकनीकी त्रुटि हुई (Something went wrong)
            </h2>

            <p className="text-sm text-[#667085] leading-relaxed">
              स्क्रीन रीसेट करने के लिए नीचे दिए गए बटन पर टैप करें। आपका खाता डेटा सुरक्षित है।
            </p>

            {this.state.error && (
              <div className="text-left text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-slate-700 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 bg-[#253B73] hover:bg-[#1a2b55] text-white text-sm font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>पुनः प्रयास करें (Retry)</span>
              </button>

              <button
                onClick={() => window.location.reload()}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-[#17233B] text-sm font-semibold rounded-xl transition cursor-pointer"
              >
                रीलोड (Reload)
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
