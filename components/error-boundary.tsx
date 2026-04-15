'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <p className="font-medium">Er ging iets mis bij het laden van dit onderdeel.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-red-600 underline text-xs cursor-pointer"
          >
            Opnieuw proberen
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
