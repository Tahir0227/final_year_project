import React, { useEffect, useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Navbar from '../components/layout/Navbar';
import SummaryCards from '../components/dashboard/SummaryCards';
import ProjectHealthCard from '../components/dashboard/ProjectHealthCard';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { dashboardService } from '../services/dashboardService';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatDate';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user } = useAuth();
  const { notifications, fetchUnread, markRead } = useNotifications();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryData = await dashboardService.getSummary();
      setSummary(summaryData);
      await fetchUnread();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismissNotification = async (id) => {
    try {
      await markRead(id);
      // Refresh local summary count
      setSummary(prev => ({
        ...prev,
        unread_notifications_count: Math.max(0, prev.unread_notifications_count - 1),
      }));
      toast.success('Alert dismissed');
    } catch {
      toast.error('Failed to dismiss alert');
    }
  };

  return (
    <div className="min-h-screen pl-64 pt-16">
      <Sidebar />
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">
              Hello, {user?.full_name || 'User'}
            </h1>
            <p className="text-sm text-dark-300 mt-1">
              Here is the failure risk telemetry assessment for your active projects.
            </p>
          </div>
          {summary?.last_scan_time && (
            <div className="bg-dark-850 border border-dark-800 rounded-xl px-4 py-2 text-xs text-dark-400">
              ⚡ Last automated scan: <strong className="text-white">{formatDate(summary.last_scan_time, 'MMM d, yyyy HH:mm')}</strong>
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-[400px] flex items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <ErrorMessage message={error} onRetry={loadData} />
        ) : (
          <>
            {/* Status Grid Cards */}
            <SummaryCards summary={summary} />

            {/* Split row charts / feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ProjectHealthCard summary={summary} />
              <RecentAlerts 
                notifications={notifications} 
                onMarkRead={handleDismissNotification} 
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
