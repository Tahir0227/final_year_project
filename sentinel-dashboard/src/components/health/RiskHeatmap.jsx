import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function RiskHeatmap({ inference }) {
  if (!inference) return null;

  // Build drivers array from SHAP drivers
  const rawDrivers = [
    { feature: inference.shap_driver_1_feature, value: inference.shap_driver_1_value, label: inference.shap_driver_1_interpretation },
    { feature: inference.shap_driver_2_feature, value: inference.shap_driver_2_value, label: inference.shap_driver_2_interpretation },
    { feature: inference.shap_driver_3_feature, value: inference.shap_driver_3_value, label: inference.shap_driver_3_interpretation },
  ].filter(d => d.feature && d.value !== undefined && d.value !== null);

  if (rawDrivers.length === 0) {
    return (
      <div className="card text-center p-8">
        <p className="text-sm text-dark-300">No SHAP attribution drivers generated for this scan.</p>
      </div>
    );
  }

  // Format drivers data for horizontal bar chart
  const chartData = rawDrivers.map(d => {
    // Humanize feature name
    let cleanFeature = d.feature.replace(/_/g, ' ');
    cleanFeature = cleanFeature.charAt(0).toUpperCase() + cleanFeature.slice(1);

    return {
      feature: cleanFeature,
      value: Number(d.value),
      interpretation: d.label || '',
    };
  });

  return (
    <div className="card flex flex-col h-[340px]">
      <h3 className="section-title mb-2">SHAP Feature Attribution</h3>
      <p className="text-xs text-dark-400 mb-4">ML driver attributions (positive values signal risk drivers)</p>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
          >
            <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis 
              dataKey="feature" 
              type="category" 
              stroke="#64748b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              width={120}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-dark-800 border border-dark-700/50 p-3 rounded-xl shadow-xl max-w-xs text-xs">
                      <p className="font-bold text-white mb-1">{data.feature}</p>
                      <p className="text-dark-200 mb-1">Impact score: <span className="font-semibold">{data.value.toFixed(3)}</span></p>
                      <p className="text-primary-300 leading-normal">{data.interpretation}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
              {chartData.map((entry, index) => {
                const color = entry.value > 0 ? '#ef4444' : '#22c55e';
                return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.7} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
