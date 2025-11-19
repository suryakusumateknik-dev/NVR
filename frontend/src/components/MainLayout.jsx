import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, LayoutDashboard, Camera, PlayCircle, Settings, Bell, LogOut, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { api } from '../App';

const MainLayout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Load theme on mount
    const savedTheme = localStorage.getItem('app_theme') || 'cyan';
    const themes = {
      cyan: { primary: '#06b6d4', secondary: '#0891b2', bg: '#0a0f1a' },
      purple: { primary: '#a855f7', secondary: '#9333ea', bg: '#0f0a1a' },
      green: { primary: '#10b981', secondary: '#059669', bg: '#0a1a0f' },
      orange: { primary: '#f97316', secondary: '#ea580c', bg: '#1a0f0a' },
      pink: { primary: '#ec4899', secondary: '#db2777', bg: '#1a0a14' },
      blue: { primary: '#3b82f6', secondary: '#2563eb', bg: '#0a0f1a' },
    };
    
    const theme = themes[savedTheme];
    if (theme) {
      document.documentElement.style.setProperty('--theme-primary', theme.primary);
      document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
      document.documentElement.style.setProperty('--theme-bg', theme.bg);
    }

    fetchNotifications();
    fetchSettings();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.filter(n => !n.is_read));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/cameras', icon: Camera, label: 'Cameras' },
    { path: '/recordings', icon: PlayCircle, label: 'Recordings' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#1a1d23] border-r border-cyan-500/20 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 lg:p-6 border-b border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-2 rounded-xl">
                  {settings?.app_logo ? (
                    <img src={`${process.env.REACT_APP_BACKEND_URL}${settings.app_logo}`} alt="Logo" className="w-7 h-7 lg:w-8 lg:h-8 object-contain" />
                  ) : (
                    <Video className="w-7 h-7 lg:w-8 lg:h-8 text-[#0a0f1a]" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg lg:text-xl font-bold text-cyan-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {settings?.app_name || 'NVR CCTV'}
                  </h1>
                </div>
              </div>
              <button
                className="lg:hidden text-gray-400 hover:text-white p-2"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-3 lg:p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`menu-${item.label.toLowerCase()}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3.5 lg:py-3 rounded-xl transition-all text-base lg:text-sm ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-cyan-400 border border-cyan-400/30'
                      : 'text-gray-400 hover:bg-[#0f1419] hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {item.label === 'Dashboard' && notifications.length > 0 && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs">{notifications.length}</Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-cyan-500/20">
            <div className="flex items-center gap-3 mb-3 lg:mb-3">
              <div className="w-11 h-11 lg:w-10 lg:h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-[#0a0f1a] font-bold text-base lg:text-sm">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate text-base lg:text-sm">{user?.username}</div>
                <div className="text-gray-400 text-sm truncate">{user?.email}</div>
              </div>
            </div>
            <Button
              data-testid="logout-button"
              onClick={onLogout}
              variant="outline"
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 h-11 lg:h-10 text-base lg:text-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-[#1a1d23]/80 backdrop-blur-xl border-b border-cyan-500/20 sticky top-0 z-30">
          <div className="px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden text-gray-400 hover:text-white p-2 -ml-2"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Mobile Logo */}
              <div className="lg:hidden flex items-center gap-2">
                <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-1.5 rounded-lg">
                  {settings?.app_logo ? (
                    <img src={`${process.env.REACT_APP_BACKEND_URL}${settings.app_logo}`} alt="Logo" className="w-6 h-6 object-contain" />
                  ) : (
                    <Video className="w-6 h-6 text-[#0a0f1a]" />
                  )}
                </div>
                <span className="text-cyan-400 font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {settings?.app_name?.split(' ')[0] || 'NVR'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
              <button className="relative text-gray-400 hover:text-white transition-colors p-2">
                <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-semibold">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;