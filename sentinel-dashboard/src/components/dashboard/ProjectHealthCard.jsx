import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getHealthColor } from '../../utils/healthColors';

export default function ProjectHealthCard({ summary }) {
  const data = [
    { name: 'Healthy', value: summary.healthy_count ?? 0, label: 'HEALTHY' },
    { name: 'At Risk', value: summary.at_risk_count ?? 0, label: 'AT_RISK' },
    { name: 'Critical', value: summary.critical_count ?? 0, label: 'CRITICAL' },
  ].filter(item => item.value > 0);

  const hasData = data.length > 0;

  // Custom Legend Renderer
  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-xs font-semibold">
        {payload.map((entry, index) => {
          const healthColor = getHealthColor(entry.payload.label);
          return (
            <div key={`legend-${index}`} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-dark-200">{entry.value}</span>
              <span className={`${healthColor.text}`}>({entry.payload.value})</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card h-[380px] flex flex-col">
      <h3 className="section-title mb-2">Health Distribution</h3>
      <p className="text-xs text-dark-400 mb-4">Visual breakdown of all active software projects</p>
      
      <div className="flex-1 min-h-0 relative">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => {
                  const colors = getHealthColor(entry.label);
                  return <Cell key={`cell-${index}`} fill={colors.hex} stroke="rgba(15,23,42,0.8)" strokeWidth={2} />;
                })}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: 'rgba(99, 102, 241, 0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <span className="text-4xl mb-2">📊</span>
            <p className="text-sm font-semibold text-white">No active project data</p>
            <p className="text-xs text-dark-400 mt-1">Add a project to view health distribution chart</p>
          </div>
        )}
      </div>
    </div>
  );
}
