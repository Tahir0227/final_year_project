import React from 'react';
import {
  CodeBracketIcon,
  TicketIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

export default function TelemetryPanel({ telemetry }) {
  if (!telemetry) {
    return (
      <div className="card text-center p-8">
        <p className="text-sm text-dark-300">No telemetry scans found for this project yet.</p>
      </div>
    );
  }

  const githubMetrics = [
    { label: 'Commit Frequency', value: telemetry.commit_frequency ? `${Number(telemetry.commit_frequency).toFixed(2)}/day` : '0/day' },
    { label: 'Code Churn (30d)', value: telemetry.code_churn ? `${Number(telemetry.code_churn).toLocaleString()} lines` : '0 lines' },
    { label: 'PR Cycle Time', value: telemetry.pr_cycle_time_hours ? `${Number(telemetry.pr_cycle_time_hours).toFixed(1)} hrs` : '0 hrs' },
    { label: 'Contributors Count', value: telemetry.contributor_count ?? '0' },
    { label: 'Top Contributor', value: telemetry.top_contributor || '—' },
  ];

  const jiraMetrics = [
    { label: 'Sprint Planned', value: telemetry.sprint_velocity_planned ? `${Number(telemetry.sprint_velocity_planned).toFixed(0)} issues` : '0 issues' },
    { label: 'Sprint Completed', value: telemetry.sprint_velocity_completed ? `${Number(telemetry.sprint_velocity_completed).toFixed(0)} issues` : '0 issues' },
    { label: 'Backlog Growth Rate', value: telemetry.backlog_growth_rate ? `${(Number(telemetry.backlog_growth_rate) * 100).toFixed(1)}%` : '0%' },
    { label: 'Average Task Aging', value: telemetry.avg_task_aging_days ? `${Number(telemetry.avg_task_aging_days).toFixed(1)} days` : '0 days' },
  ];

  const discordMetrics = [
    { label: 'Messages Frequency', value: telemetry.messages_per_day ? `${Number(telemetry.messages_per_day).toFixed(1)}/day` : '0/day' },
    { label: 'Active Users (7d)', value: telemetry.active_users ?? '0' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* GitHub Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <CodeBracketIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">GitHub Integration</h3>
            <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold">Repository telemetry</span>
          </div>
        </div>
        <div className="space-y-4">
          {githubMetrics.map((m, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm border-b border-dark-800/60 pb-3 last:border-0 last:pb-0">
              <span className="text-dark-300 font-medium">{m.label}</span>
              <span className="text-white font-semibold">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Jira Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <TicketIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Jira Software</h3>
            <span className="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Issue tracking telemetry</span>
          </div>
        </div>
        <div className="space-y-4">
          {jiraMetrics.map((m, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm border-b border-dark-800/60 pb-3 last:border-0 last:pb-0">
              <span className="text-dark-300 font-medium">{m.label}</span>
              <span className="text-white font-semibold">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Discord Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">Discord Guild</h3>
            <span className="text-[10px] text-pink-400 uppercase tracking-wider font-semibold">Communication telemetry</span>
          </div>
        </div>
        <div className="space-y-4">
          {discordMetrics.map((m, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm border-b border-dark-800/60 pb-3 last:border-0 last:pb-0">
              <span className="text-dark-300 font-medium">{m.label}</span>
              <span className="text-white font-semibold">{m.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
