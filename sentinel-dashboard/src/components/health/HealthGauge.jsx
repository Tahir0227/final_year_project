import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { getStabilityColor } from '../../utils/healthColors';

export default function HealthGauge({ score, label, anomalyDetected }) {
  const color = getStabilityColor(score);
  const displayScore = score ?? 0;

  return (
    <div className="card flex flex-col items-center justify-center p-6 text-center h-[280px]">
      <h3 className="text-sm font-semibold text-dark-300 uppercase tracking-wider mb-4">Stability Index</h3>
      
      <div className="w-32 h-32 mb-4 relative">
        <CircularProgressbar
          value={displayScore}
          text={`${displayScore}%`}
          styles={buildStyles({
            pathColor: color,
            textColor: '#fff',
            trailColor: '#1e293b',
            textSize: '18px',
            strokeLinecap: 'round',
          })}
        />
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-bold text-white uppercase tracking-wider">{label || 'UNKNOWN'}</span>
        {!!anomalyDetected && (
          <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse-slow">
            ⚠️ Anomaly Detected
          </span>
        )}
      </div>
    </div>
  );
}
