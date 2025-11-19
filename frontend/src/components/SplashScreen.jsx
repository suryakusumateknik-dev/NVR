import React, { useState, useEffect } from 'react';
import { Video } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [settings, setSettings] = useState({
    app_name: 'NVR CCTV',
    app_logo: null,
  });

  useEffect(() => {
    // Load theme
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

    // Fetch settings
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/settings`);
        setSettings(response.data);
      } catch (error) {
        console.log('Using default settings');
      }
    };

    fetchSettings();

    const duration = 10000; // 10 seconds
    const interval = 50; // Update every 50ms
    const increment = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center theme-gradient" style={{ background: `var(--theme-bg)` }}>
      <div className="text-center space-y-8">
        {/* Logo Animation */}
        <div className="relative inline-block">
          <div className="absolute inset-0 blur-3xl opacity-20 animate-pulse" style={{ backgroundColor: 'var(--theme-primary)' }}></div>
          <div className="relative theme-gradient p-8 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
            {settings.app_logo ? (
              <img 
                src={`${BACKEND_URL}${settings.app_logo}`} 
                alt="Logo" 
                className="w-24 h-24 object-contain"
              />
            ) : (
              <Video className="w-24 h-24" style={{ color: 'var(--theme-bg)' }} strokeWidth={2} />
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold gradient-text animate-pulse" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {settings.app_name || 'NVR CCTV'}
          </h1>
          <p className="text-gray-400 text-lg">Surveillance System</p>
        </div>

        {/* Progress Bar */}
        <div className="w-80 mx-auto space-y-3">
          <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
            </div>
          </div>
          <div className="text-center text-cyan-400 text-2xl font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {Math.round(progress)}%
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-gray-500 text-sm animate-pulse">
          Initializing system...
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;