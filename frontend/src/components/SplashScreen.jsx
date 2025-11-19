import React, { useState, useEffect } from 'react';
import { Video } from 'lucide-react';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] via-[#1a1d23] to-[#0c1220]">
      <div className="text-center space-y-8">
        {/* Logo Animation */}
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-cyan-400 blur-3xl opacity-20 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-cyan-400 to-blue-500 p-8 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
            <Video className="w-24 h-24 text-[#0a0f1a]" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-500 animate-pulse" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            NVR CCTV
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