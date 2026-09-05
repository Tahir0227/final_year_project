import React from 'react';
import { Link } from 'react-router-dom';
import { BellIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { getNotifTypeColor } from '../../utils/healthColors';
import { timeAgo } from '../../utils/formatDate';

export default function RecentAlerts({ notifications, onMarkRead }) {
  const hasNotifications = notifications && notifications.length > 0;

  return (
    <div className="card h-[380px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="section-title mb-0">Recent Alerts</h3>
        <Link to="/notifications" className="text-xs font-semibold text-primary-400 hover:text-primary-300 flex items-center gap-1">
          View All <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
      </div>
      <p className="text-xs text-dark-400 mb-4">Latest critical signals from active project scanning</p>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {hasNotifications ? (
          notifications.map((notif) => {
            const typeConfig = getNotifTypeColor(notif.type);
            return (
              <div
                key={notif.id}
                className="flex items-start justify-between gap-3 p-3 bg-dark-900/40 rounded-xl border border-dark-800 hover:border-dark-700/50 transition-colors"
              >
                <div className="flex gap-3 min-w-0">
                  <div className={`p-2 rounded-lg text-lg flex items-center justify-center ${typeConfig.bg}`}>
                    {typeConfig.icon}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/projects/${notif.project_id}`} className="text-sm font-semibold text-white hover:text-primary-400 transition-colors block truncate">
                      {notif.title}
                    </Link>
                    <p className="text-xs text-dark-300 mt-0.5 line-clamp-1">{notif.message}</p>
                    <span className="text-[10px] text-dark-400 mt-1 block">{timeAgo(notif.created_at)}</span>
                  </div>
                </div>
                <button
                  onClick={() => onMarkRead(notif.id)}
                  className="text-xs font-semibold text-primary-400 hover:text-primary-300 whitespace-nowrap self-center"
                >
                  Dismiss
                </button>
              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="p-3 rounded-full bg-dark-900 text-dark-400 mb-2">
              <BellIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-white">All quiet for now</p>
            <p className="text-xs text-dark-400 mt-1">No unread alerts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
