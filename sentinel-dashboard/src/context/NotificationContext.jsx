import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { dashboardService } from '../services/dashboardService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount]     = useState(0);
  const [notifications, setNotifications] = useState([]);

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await dashboardService.getNotifications({ unread_only: true, limit: 5 });
      setNotifications(data);
      setUnreadCount(data.length);
    } catch {}
  }, [isAuthenticated]);

  // Poll every 60 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnread]);

  const markRead = useCallback(async (id) => {
    await dashboardService.markRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const value = { unreadCount, notifications, fetchUnread, markRead };
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
