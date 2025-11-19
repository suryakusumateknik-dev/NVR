import React, { useState, useEffect } from 'react';
import { Camera, Video, Clock, AlertCircle, Activity } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

const Dashboard = ({ api }) => {
  const [cameras, setCameras] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [camerasRes, recordingsRes, notificationsRes] = await Promise.all([
        api.get('/cameras'),
        api.get('/recordings'),
        api.get('/notifications'),
      ]);

      setCameras(camerasRes.data);
      setRecordings(recordingsRes.data);
      setNotifications(notificationsRes.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      title: 'Total Cameras',
      value: cameras.length,
      icon: Camera,
      color: 'from-cyan-400 to-blue-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      title: 'Online Cameras',
      value: cameras.filter((c) => c.status === 'online' || c.status === 'recording').length,
      icon: Activity,
      color: 'from-green-400 to-emerald-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Recording',
      value: cameras.filter((c) => c.status === 'recording').length,
      icon: Video,
      color: 'from-red-400 to-pink-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Total Recordings',
      value: recordings.length,
      icon: Clock,
      color: 'from-purple-400 to-indigo-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cyan-400 text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Dashboard
        </h1>
        <p className="text-gray-400 text-lg">Real-time surveillance monitoring</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s/g, '-')}`}
              className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-6 hover:border-cyan-400/40 transition-all card-hover"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-4 rounded-2xl`}>
                  <Icon className={`w-8 h-8 bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} style={{ filter: 'drop-shadow(0 0 8px currentColor)' }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Cameras Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Live Cameras</h2>
          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30">
            {cameras.length} Total
          </Badge>
        </div>

        {cameras.length === 0 ? (
          <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-12 text-center">
            <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No cameras added yet</p>
            <p className="text-gray-500 text-sm mt-2">Add your first camera from the Cameras page</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((camera) => (
              <Card
                key={camera.id}
                data-testid={`camera-card-${camera.id}`}
                className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 overflow-hidden hover:border-cyan-400/40 transition-all card-hover"
              >
                {/* Camera Preview Placeholder */}
                <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 aspect-video flex items-center justify-center">
                  <Camera className="w-16 h-16 text-gray-600" />
                  {camera.status === 'recording' && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-500/90 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-white text-xs font-semibold">REC</span>
                    </div>
                  )}
                </div>

                {/* Camera Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{camera.name}</h3>
                      {camera.location && (
                        <p className="text-gray-400 text-sm">{camera.location}</p>
                      )}
                    </div>
                    <Badge
                      className={`${
                        camera.status === 'online'
                          ? 'bg-green-500/20 text-green-400 border-green-400/30'
                          : camera.status === 'recording'
                          ? 'bg-red-500/20 text-red-400 border-red-400/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-400/30'
                      }`}
                    >
                      {camera.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Recent Alerts</h2>
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notif) => (
              <Card
                key={notif.id}
                data-testid={`notification-${notif.id}`}
                className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-4 hover:border-cyan-400/40 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${
                    notif.type === 'error' ? 'bg-red-500/20' :
                    notif.type === 'warning' ? 'bg-yellow-500/20' :
                    'bg-cyan-500/20'
                  }`}>
                    <AlertCircle className={`w-5 h-5 ${
                      notif.type === 'error' ? 'text-red-400' :
                      notif.type === 'warning' ? 'text-yellow-400' :
                      'text-cyan-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-semibold">{notif.title}</h4>
                    <p className="text-gray-400 text-sm mt-1">{notif.message}</p>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {new Date(notif.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;