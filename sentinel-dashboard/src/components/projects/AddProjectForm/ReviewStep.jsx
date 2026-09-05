import React from 'react';
import { maskToken } from '../../../utils/maskToken';
import { formatDate } from '../../../utils/formatDate';

export default function ReviewStep({ data }) {
  const sections = [
    {
      title: 'Project Settings',
      items: [
        { label: 'Project Name', value: data.project_name },
        { label: 'Description', value: data.description || 'No description provided' },
        { label: 'Target Deadline', value: formatDate(data.project_end_date) },
        { label: 'Scan Interval', value: `Every ${Number(data.scan_interval_minutes || 1440) / 60} hour(s)` },
      ],
    },
    {
      title: 'GitHub Integration',
      items: [
        { label: 'Repository Owner', value: data.github_owner },
        { label: 'Repository Name', value: data.github_repo },
        { label: 'Access Token', value: maskToken(data.github_token) },
      ],
    },
    {
      title: 'Jira Software',
      items: [
        { label: 'Workspace URL', value: data.jira_base_url },
        { label: 'Project Key', value: data.jira_project_key },
        { label: 'Account Email', value: data.jira_email },
        { label: 'API Token', value: maskToken(data.jira_api_token) },
      ],
    },
    {
      title: 'Discord Integration',
      items: [
        { label: 'Guild (Server) ID', value: data.discord_guild_id },
        { label: 'Channel ID', value: data.discord_channel_id },
        { label: 'Bot Token', value: maskToken(data.discord_bot_token) },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
      <div className="bg-primary-950/20 border border-primary-500/10 rounded-xl p-4 text-xs text-primary-300">
        ✨ <strong>Please review your settings.</strong> Upon clicking launch, the project credentials will be encrypted at rest, and the initial telemetry collection and machine learning pipeline will trigger automatically in the background.
      </div>

      <div className="space-y-5">
        {sections.map((section, idx) => (
          <div key={idx} className="border-b border-dark-800/60 pb-4 last:border-none last:pb-0">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">{section.title}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="bg-dark-900/40 rounded-lg p-2.5 border border-dark-800">
                  <span className="text-dark-400 font-semibold block mb-0.5">{item.label}</span>
                  <span className="text-white font-medium break-all">{item.value || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
