import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate } from '../../utils/formatDate';

export default function StabilityChart({ history }) {
  const chartData = (history || []).map(item => ({
    date: formatDate(item.scanned_at, 'MMM d'),
    score: item.stability_score ?? 100,
  }));

  const hasData = chartData.length > 0;

  return (
    <div className="card h-[280px] flex flex-col">
      <h3 className="section-title mb-2">Stability History</h3>
      <p className="text-xs text-dark-400 mb-4">Historical record of project health metrics</p>
      
      <div className="flex-1 min-h-0 relative">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 100]} 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: 'rgba(99, 102, 241, 0.2)',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#6366f1" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#scoreGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <span className="text-2xl mb-2">📈</span>
            <p className="text-sm font-semibold text-white">Insufficient history</p>
            <p className="text-xs text-dark-400 mt-1">Run more scans to build health history chart</p>
          </div>
        )}
      </div>
    </div>
  );
}
