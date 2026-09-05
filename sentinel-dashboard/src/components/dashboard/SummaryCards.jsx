import React from 'react';
import {
  FolderIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ShieldExclamationIcon,
  CalendarIcon,
  BellIcon
} from '@heroicons/react/24/outline';

export default function SummaryCards({ summary }) {
  const cards = [
    {
      label: 'Total Projects',
      value: summary.total_projects ?? 0,
      icon: FolderIcon,
      color: 'text-primary-400 bg-primary-500/10 border-primary-500/10',
    },
    {
      label: 'Healthy Projects',
      value: summary.healthy_count ?? 0,
      icon: CheckCircleIcon,
      color: 'text-green-400 bg-green-500/10 border-green-500/10',
    },
    {
      label: 'At Risk Projects',
      value: summary.at_risk_count ?? 0,
      icon: ExclamationCircleIcon,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/10',
    },
    {
      label: 'Critical Status',
      value: summary.critical_count ?? 0,
      icon: ShieldExclamationIcon,
      color: 'text-red-400 bg-red-500/10 border-red-500/10',
    },
    {
      label: 'Deadline this Week',
      value: summary.projects_ending_this_week ?? 0,
      icon: CalendarIcon,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/10',
    },
    {
      label: 'Unread Alerts',
      value: summary.unread_notifications_count ?? 0,
      icon: BellIcon,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="card-hover flex items-center justify-between">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="stat-label">{card.label}</span>
              <span className="stat-value">{card.value}</span>
            </div>
            <div className={`p-3 rounded-xl border ${card.color}`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
