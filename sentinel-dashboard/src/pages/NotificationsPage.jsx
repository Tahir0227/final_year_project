import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import EmptyState from '../components/common/EmptyState';
import { dashboardService } from '../services/dashboardService';
import { useNotifications } from '../context/NotificationContext';
import { getNotifTypeColor } from '../utils/healthColors';
import { timeAgo } from '../utils/formatDate';
import { BellIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const { fetchUnread } = useNotifications();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getNotifications({ limit: 50 });
      setList(data);
    } catch (err) {
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await dashboardService.markRead(id);
      setList(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      await fetchUnread();
      toast.success('Marked as read');
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await dashboardService.markAllRead();
      setList(prev => prev.map(n => ({ ...n, is_read: true })));
      await fetchUnread();
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Action failed');
    }
  };

  const handleDelete = async (id) => {
    try {
      await dashboardService.deleteNotification(id);
      setList(prev => prev.filter(n => n.id !== id));
      await fetchUnread();
      toast.success('Notification deleted');
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const hasNotifications = list.length > 0;

  return (
    <div className="min-h-screen pl-64 pt-16">
      <Sidebar />
      <Navbar />

      <main className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
        {/* Header and Mark All Read */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">Notifications</h1>
            <p className="text-sm text-dark-300 mt-1">Audit log of system alerts, deadline warnings, and completed scans</p>
          </div>
          {hasNotifications && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <CheckIcon className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <ErrorMessage message={error} onRetry={fetchNotifications} />
        ) : hasNotifications ? (
          <div className="space-y-3">
            {list.map((notif) => {
              const typeConfig = getNotifTypeColor(notif.type);
              return (
                <div
                  key={notif.id}
                  className={`card p-4 flex items-center justify-between gap-4 transition-all border-l-4 ${
                    notif.is_read ? 'opacity-60 border-l-dark-800' : 'border-l-primary-500 shadow-md shadow-primary-950/5'
                  }`}
                >
                  <div className="flex gap-4 min-w-0">
                    <div className={`p-2.5 rounded-xl text-xl flex items-center justify-center self-start ${typeConfig.bg}`}>
                      {typeConfig.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Link to={`/projects/${notif.project_id}`} className="text-sm font-bold text-white hover:text-primary-400 transition-colors">
                          {notif.title}
                        </Link>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                        )}
                      </div>
                      <p className="text-xs text-dark-200 mt-1 leading-relaxed">{notif.message}</p>
                      <span className="text-[10px] text-dark-400 mt-1.5 block">{timeAgo(notif.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="btn-icon text-primary-400 hover:text-primary-300 hover:bg-dark-800"
                        title="Mark as read"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="btn-icon text-dark-400 hover:text-red-400 hover:bg-dark-800"
                      title="Delete notification"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="All caught up"
            description="You have no notifications or alert logs logged."
            icon={BellIcon}
          />
        )}
      </main>
    </div>
  );
}
