import React from 'react';
import { getSeverityColor } from '../../utils/healthColors';

export default function ActionStepsList({ steps }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        // Extract priority and map colors
        const priority = step.priority || 'MEDIUM';
        const colors = getSeverityColor(priority);

        return (
          <div
            key={idx}
            className="flex items-start gap-4 p-4 bg-dark-900 border border-dark-800 rounded-xl hover:border-dark-700/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center min-w-[50px]">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
                {priority}
              </span>
              <span className="text-[8px] text-dark-400 uppercase font-semibold mt-1">Priority</span>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-white leading-snug">{step.step || 'Action step'}</h4>
              <p className="text-xs text-dark-300 mt-1 leading-relaxed">{step.description || step.details}</p>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-dark-800/60 text-[10px] text-dark-400">
                {step.owner && (
                  <div>
                    <span className="font-semibold text-dark-300">Assignee:</span> <span className="text-white font-medium">{step.owner}</span>
                  </div>
                )}
                {step.timeframe && (
                  <div>
                    <span className="font-semibold text-dark-300">Target Timeframe:</span> <span className="text-primary-300 font-medium">{step.timeframe}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
