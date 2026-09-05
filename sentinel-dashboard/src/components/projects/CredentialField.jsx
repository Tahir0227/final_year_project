import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../common/LoadingSpinner';

export default function CredentialField({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  testLoading = false,
  testSuccess = null,
  testError = null,
  onTest,
  isEdit = false,
}) {
  const [showValue, setShowValue] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="label">{label}</label>
        {onTest && (
          <button
            type="button"
            onClick={onTest}
            disabled={testLoading || !value}
            className="text-xs font-semibold text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testLoading ? 'Testing...' : 'Test Connection'}
          </button>
        )}
      </div>

      <div className="relative">
        <input
          type={showValue ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={isEdit && !value ? '•••••••••••••••• (Unchanged)' : placeholder}
          className={`input pr-24 ${error ? 'input-error' : ''}`}
        />
        
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {testLoading && <LoadingSpinner size="sm" />}
          {testSuccess === true && <CheckCircleIcon className="w-5 h-5 text-green-400" title="Connection successful" />}
          {testSuccess === false && <XCircleIcon className="w-5 h-5 text-red-400" title={testError || 'Connection failed'} />}
          
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="text-dark-400 hover:text-white p-1 rounded-lg hover:bg-dark-800 transition-colors"
          >
            {showValue ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
      {testSuccess === false && testError && (
        <span className="text-xs text-red-300 bg-red-950/20 border border-red-500/10 rounded-lg p-2 mt-1">
          {testError}
        </span>
      )}
    </div>
  );
}
