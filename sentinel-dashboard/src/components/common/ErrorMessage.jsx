import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ErrorMessage({ message, onRetry, className = '' }) {
  return (
    <div className={`card border-red-500/20 bg-red-950/10 p-6 flex flex-col items-center text-center gap-3 ${className}`}>
      <ExclamationTriangleIcon className="w-12 h-12 text-red-400" />
      <div>
        <h3 className="text-lg font-semibold text-white">Something went wrong</h3>
        <p className="text-sm text-red-200 mt-1">{message || 'An unexpected error occurred. Please try again.'}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary mt-2 px-4 py-2 text-sm border-red-500/20 hover:bg-red-950/20">
          Try Again
        </button>
      )}
    </div>
  );
}
