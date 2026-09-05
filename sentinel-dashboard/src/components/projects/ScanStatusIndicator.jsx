import React from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import { timeAgo } from '../../utils/formatDate';

export default function ScanStatusIndicator({ status, lastScannedAt, nextScanAt, isRescanning }) {
  const isRunning = isRescanning || status === 'RUNNING';

  return (
    <div className="card flex items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        {isRunning ? (
          <div className="p-3 bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded-xl relative">
            <LoadingSpinner size="md" />
          </div>
        ) : status === 'FAILED' ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-lg font-bold">
            ⚠️
          </div>
        ) : (
          <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-lg font-bold">
            ✓
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold text-white">
            {isRunning ? 'System Analysis in Progress' : status === 'FAILED' ? 'Scan Analysis Failed' : 'System Analysis Current'}
          </h4>
          <p className="text-xs text-dark-300 mt-0.5">
            {isRunning 
              ? 'Gathering telemetry and generating ML failure projections...' 
              : `Last scanned: ${timeAgo(lastScannedAt)}`}
          </p>
        </div>
      </div>

      {!isRunning && nextScanAt && (
        <div className="text-right hidden sm:block">
          <span className="text-[10px] text-dark-400 uppercase tracking-wider font-semibold block">Next Scheduled Scan</span>
          <span className="text-xs text-dark-200 font-medium">{timeAgo(nextScanAt)}</span>
        </div>
      )}
    </div>
  );
}
