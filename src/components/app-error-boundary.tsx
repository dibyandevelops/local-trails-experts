'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Client error boundary caught an error:', error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto mt-10 max-w-lg rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/60 dark:bg-red-950/30">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">
          The app hit an unexpected client-side error. Please reload to continue.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 dark:bg-red-600 dark:hover:bg-red-500"
        >
          Reload App
        </button>
      </div>
    );
  }
}
