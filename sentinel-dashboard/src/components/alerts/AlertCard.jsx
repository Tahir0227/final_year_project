import React from 'react';
import { ShieldExclamationIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import HealthBadge from '../common/HealthBadge';
import { timeAgo } from '../../utils/formatDate';

export default function AlertCard({ alert }) {
  const isAtRisk = alert.health_label === 'AT_RISK';
  const hasAnomaly = alert.anomaly_detected;

  return (
    <div className={`card border-l-4 ${isAtRisk ? (alert.stability_score < 30 ? 'border-l-red-500' : 'border-l-amber-500') : 'border-l-green-500'} flex flex-col gap-4`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl mt-0.5 ${isAtRisk ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
            {isAtRisk ? <ShieldExclamationIcon className="w-5 h-5" /> : <ShieldCheckIcon className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-white leading-snug">
              {isAtRisk ? `Project Failure Risk Identified` : `System Analysis Stable`}
            </h4>
            <span className="text-[10px] text-dark-400 block mt-0.5">{timeAgo(alert.inferred_at)}</span>
          </div>
        </div>
        <HealthBadge label={alert.health_label} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs bg-dark-900/40 rounded-xl p-3 border border-dark-800">
        <div>
          <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Stability Index</span>
          <span className={`text-base font-extrabold ${isAtRisk ? 'text-red-400' : 'text-green-400'}`}>
            {alert.stability_score ?? 100}%
          </span>
        </div>
        <div>
          <span className="text-dark-400 font-semibold block uppercase tracking-wider text-[9px]">Anomaly Scan</span>
          <span className={`text-sm font-bold ${hasAnomaly ? 'text-red-400' : 'text-green-400'}`}>
            {hasAnomaly ? '⚠️ ANOMALY' : '✓ NORMAL'}
          </span>
        </div>
      </div>

      {isAtRisk && (
        <div className="space-y-2 mt-1">
          <span className="text-[10px] text-dark-400 font-bold uppercase tracking-wider block">Top Risk Attributions</span>
          <div className="space-y-1.5">
            {[
              { feature: alert.shap_driver_1_feature, interpretation: alert.shap_driver_1_interpretation },
              { feature: alert.shap_driver_2_feature, interpretation: alert.shap_driver_2_interpretation },
              { feature: alert.shap_driver_3_feature, interpretation: alert.shap_driver_3_interpretation },
            ].filter(d => d.feature).map((driver, idx) => (
              <div key={idx} className="bg-dark-900/60 rounded-lg p-2 text-xs text-dark-200 border border-dark-800 flex gap-2">
                <span className="text-red-400 font-bold">{idx + 1}.</span>
                <div>
                  <span className="font-semibold text-white mr-1.5">{driver.feature.replace(/_/g, ' ')}:</span>
                  <span>{driver.interpretation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
