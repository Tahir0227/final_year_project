import React from 'react';
import { InboxIcon } from '@heroicons/react/24/outline';

export default function EmptyState({
  title = 'No data available',
  description = 'There is nothing to display here yet.',
  icon: Icon = InboxIcon,
  action,
  className = '',
}) {
  return (
    <div className={`card border-dark-700/30 flex flex-col items-center justify-center text-center p-12 ${className}`}>
      <div className="p-4 rounded-full bg-dark-900 border border-dark-800 text-dark-400 mb-4">
        <Icon className="w-10 h-10" />
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-dark-400 max-w-sm mt-1 mb-6">{description}</p>
      {action && action}
    </div>
  );
}
