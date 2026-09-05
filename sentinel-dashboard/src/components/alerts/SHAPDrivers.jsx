import React from 'react';

export default function SHAPDrivers({ inference }) {
  if (!inference) return null;

  const drivers = [
    { feature: inference.shap_driver_1_feature, value: inference.shap_driver_1_value, interpretation: inference.shap_driver_1_interpretation },
    { feature: inference.shap_driver_2_feature, value: inference.shap_driver_2_value, interpretation: inference.shap_driver_2_interpretation },
    { feature: inference.shap_driver_3_feature, value: inference.shap_driver_3_value, interpretation: inference.shap_driver_3_interpretation },
  ].filter(d => d.feature);

  if (drivers.length === 0) return null;

  return (
    <div className="card">
      <h3 className="section-title mb-2">Risk Factor Attributions</h3>
      <p className="text-xs text-dark-400 mb-6">Attribution scores mapped directly to specific operational metrics</p>
      
      <div className="space-y-4">
        {drivers.map((driver, index) => {
          const isRisk = Number(driver.value) > 0;
          return (
            <div key={index} className="flex gap-4 p-4 rounded-xl bg-dark-900 border border-dark-800">
              <div className="flex flex-col items-center justify-center">
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${isRisk ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                  {Number(driver.value) > 0 ? '+' : ''}{Number(driver.value).toFixed(3)}
                </span>
                <span className="text-[9px] text-dark-400 uppercase font-semibold mt-1">Impact</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-white capitalize">
                  {driver.feature.replace(/_/g, ' ')}
                </h4>
                <p className="text-xs text-dark-300 mt-1 leading-relaxed">
                  {driver.interpretation || 'No description available for this feature.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
