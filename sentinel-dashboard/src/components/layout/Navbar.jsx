import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BellIcon, ArrowRightOnRectangleIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="fixed top-0 left-64 right-0 z-20 h-16 border-b border-dark-800/60 bg-dark-900/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-full px-6">
        {/* Page title */}
        <div>
          <span className="text-sm text-dark-400">
            {location.pathname === '/dashboard' && 'Overview'}
            {location.pathname === '/projects'  && 'My Projects'}
            {location.pathname === '/add-project' && 'Add Project'}
            {location.pathname.startsWith('/projects/') && 'Project Details'}
            {location.pathname === '/notifications' && 'Notifications'}
            {location.pathname === '/profile' && 'Profile'}
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <Link to="/notifications" className="relative btn-icon">
            <BellIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <div className="flex items-center gap-3 pl-3 border-l border-dark-800">
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-primary-600/30 border border-primary-600/50 flex items-center justify-center">
                <span className="text-primary-300 text-sm font-semibold">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-sm font-medium text-dark-100 hidden md:block">{user?.full_name}</span>
            </Link>
            <button onClick={handleLogout} className="btn-icon" title="Logout">
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
