import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Upload, Image as ImageIcon, Users, Palette, Check } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

const Settings = ({ api, user }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    app_name: '',
    app_logo: null,
    recording_duration: 3600,
    motion_detection_enabled: false,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [users, setUsers] = useState([]);
  const [newUserData, setNewUserData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [currentTheme, setCurrentTheme] = useState('cyan');

  const themes = [
    { id: 'cyan', name: 'Cyan Blue', primary: '#06b6d4', secondary: '#0891b2', bg: '#0a0f1a' },
    { id: 'purple', name: 'Purple', primary: '#a855f7', secondary: '#9333ea', bg: '#0f0a1a' },
    { id: 'green', name: 'Emerald', primary: '#10b981', secondary: '#059669', bg: '#0a1a0f' },
    { id: 'orange', name: 'Orange', primary: '#f97316', secondary: '#ea580c', bg: '#1a0f0a' },
    { id: 'pink', name: 'Pink', primary: '#ec4899', secondary: '#db2777', bg: '#1a0a14' },
    { id: 'blue', name: 'Sky Blue', primary: '#3b82f6', secondary: '#2563eb', bg: '#0a0f1a' },
  ];

  useEffect(() => {
    fetchSettings();
    fetchUsers();
    loadTheme();
  }, []);

  const loadTheme = () => {
    const savedTheme = localStorage.getItem('app_theme') || 'cyan';
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  };

  const applyTheme = (themeId) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      document.documentElement.style.setProperty('--theme-primary', theme.primary);
      document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
      document.documentElement.style.setProperty('--theme-bg', theme.bg);
    }
  };

  const handleSetTheme = (themeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId);
    localStorage.setItem('app_theme', themeId);
    toast.success('Theme applied successfully');
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
      if (response.data.app_logo) {
        setLogoPreview(`${process.env.REACT_APP_BACKEND_URL}${response.data.app_logo}`);
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/all');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    try {
      const formData = new FormData();
      formData.append('file', logoFile);

      const response = await api.post('/settings/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSettings({ ...settings, app_logo: response.data.logo_url });
      toast.success('Logo uploaded successfully');
      setLogoFile(null);
    } catch (error) {
      toast.error('Failed to upload logo');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      if (logoFile) {
        await handleLogoUpload();
      }

      await api.put('/settings', {
        app_name: settings.app_name,
        recording_duration: parseInt(settings.recording_duration),
        motion_detection_enabled: settings.motion_detection_enabled,
      });

      toast.success('Settings saved successfully');
      fetchSettings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', newUserData);
      toast.success('User added successfully');
      setNewUserData({ username: '', email: '', password: '' });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cyan-400 text-xl">Loading settings...</div>
      </div>
    );
  }

  return (
    <div data-testid="settings-page" className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Settings
        </h1>
        <p className="text-gray-400 text-base md:text-lg">Configure your NVR CCTV system</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#1a1d23] border border-cyan-500/20 p-1">
          <TabsTrigger value="general" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400 data-[state=active]:to-blue-500 data-[state=active]:text-[#0a0f1a]">
            General
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400 data-[state=active]:to-blue-500 data-[state=active]:text-[#0a0f1a]">
            Users
          </TabsTrigger>
          <TabsTrigger value="theme" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-400 data-[state=active]:to-blue-500 data-[state=active]:text-[#0a0f1a]">
            Theme
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-cyan-500/10 p-3 rounded-xl">
                <SettingsIcon className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Application Settings</h2>
            </div>

            <div className="space-y-6">
              {/* App Name */}
              <div>
                <Label htmlFor="app-name" className="text-gray-300 text-sm md:text-base mb-2 block">
                  Application Name
                </Label>
                <Input
                  id="app-name"
                  data-testid="app-name-input"
                  type="text"
                  placeholder="NVR CCTV System"
                  value={settings.app_name}
                  onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
                  className="bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white h-10 md:h-12 text-sm md:text-base"
                />
              </div>

              {/* App Logo */}
              <div>
                <Label className="text-gray-300 text-sm md:text-base mb-2 block">
                  Application Logo
                </Label>
                <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                  <div className="w-24 h-24 md:w-32 md:h-32 bg-[#0f1419] border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-10 h-10 md:w-12 md:h-12 text-gray-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <input
                      id="logo-upload"
                      data-testid="logo-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <label htmlFor="logo-upload">
                      <Button
                        type="button"
                        onClick={() => document.getElementById('logo-upload').click()}
                        className="bg-[#0f1419] hover:bg-[#1a1d23] border border-cyan-400/30 text-cyan-400 h-10 md:h-11 text-sm md:text-base"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Logo
                      </Button>
                    </label>
                    <p className="text-gray-500 text-xs md:text-sm mt-2">
                      Recommended: Square image, 512x512px or larger
                    </p>
                  </div>
                </div>
              </div>

              {/* Recording Duration */}
              <div>
                <Label htmlFor="recording-duration" className="text-gray-300 text-sm md:text-base mb-2 block">
                  Default Recording Duration (seconds)
                </Label>
                <Input
                  id="recording-duration"
                  data-testid="recording-duration-input"
                  type="number"
                  min="60"
                  step="60"
                  value={settings.recording_duration}
                  onChange={(e) => setSettings({ ...settings, recording_duration: e.target.value })}
                  className="bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white h-10 md:h-12 text-sm md:text-base"
                />
                <p className="text-gray-500 text-xs md:text-sm mt-2">
                  Current: {Math.floor(settings.recording_duration / 3600)}h {Math.floor((settings.recording_duration % 3600) / 60)}m
                </p>
              </div>

              {/* Motion Detection */}
              <div className="flex items-center justify-between p-3 md:p-4 bg-[#0f1419] rounded-xl border border-gray-700">
                <div>
                  <Label className="text-gray-300 text-sm md:text-base">Motion Detection</Label>
                  <p className="text-gray-500 text-xs md:text-sm mt-1">Enable automatic motion detection alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    data-testid="motion-detection-toggle"
                    type="checkbox"
                    checked={settings.motion_detection_enabled}
                    onChange={(e) => setSettings({ ...settings, motion_detection_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 md:w-14 md:h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-cyan-500 pointer-events-none"></div>
                </label>
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button
              data-testid="save-settings-button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-[#0a0f1a] font-semibold shadow-lg px-6 md:px-8 h-10 md:h-12 text-sm md:text-base"
            >
              <Save className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </TabsContent>

        {/* User Management */}
        <TabsContent value="users" className="space-y-6 mt-6">
          <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-cyan-500/10 p-3 rounded-xl">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>User Management</h2>
            </div>

            {/* Add New User Form */}
            <form onSubmit={handleAddUser} className="space-y-4 mb-8 p-4 md:p-6 bg-[#0f1419] rounded-xl border border-gray-700">
              <h3 className="text-base md:text-lg font-semibold text-white mb-4">Add New User</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="new-username" className="text-gray-300 text-sm mb-1 block">Username</Label>
                  <Input
                    id="new-username"
                    type="text"
                    placeholder="Username"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                    className="bg-[#1a1d23] border-gray-700 focus:border-cyan-400 text-white h-10 text-sm"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-email" className="text-gray-300 text-sm mb-1 block">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="email@example.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    className="bg-[#1a1d23] border-gray-700 focus:border-cyan-400 text-white h-10 text-sm"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="new-password" className="text-gray-300 text-sm mb-1 block">Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="bg-[#1a1d23] border-gray-700 focus:border-cyan-400 text-white h-10 text-sm"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full md:w-auto bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-[#0a0f1a] font-semibold h-10 text-sm"
              >
                Add User
              </Button>
            </form>

            {/* Users List */}
            <div className="space-y-3">
              <h3 className="text-base md:text-lg font-semibold text-white mb-4">Existing Users</h3>
              {users.length === 0 ? (
                <p className="text-gray-400 text-center py-8 text-sm md:text-base">No users found</p>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[#0f1419] rounded-xl border border-gray-700 gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-[#0a0f1a] font-bold text-sm">
                          {u.username?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm md:text-base">{u.username}</p>
                          <p className="text-gray-400 text-xs md:text-sm">{u.email}</p>
                        </div>
                      </div>
                    </div>
                    {u.id !== user.id && (
                      <Button
                        onClick={() => handleDeleteUser(u.id)}
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 h-9 text-sm"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Theme Settings */}
        <TabsContent value="theme" className="space-y-6 mt-6">
          <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-4 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-cyan-500/10 p-3 rounded-xl">
                <Palette className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Theme Settings</h2>
            </div>

            <p className="text-gray-400 mb-6 text-sm md:text-base">Choose your preferred color theme for the application</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {themes.map((theme) => (
                <div
                  key={theme.id}
                  onClick={() => handleSetTheme(theme.id)}
                  className={`relative p-4 md:p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                    currentTheme === theme.id
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-gray-700 bg-[#0f1419] hover:border-gray-600'
                  }`}
                >
                  {currentTheme === theme.id && (
                    <div className="absolute top-2 right-2 bg-cyan-400 rounded-full p-1">
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-[#0a0f1a]" />
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 md:w-12 md:h-12 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}
                    />
                    <div>
                      <p className="text-white font-semibold text-sm md:text-base">{theme.name}</p>
                      <p className="text-gray-400 text-xs">Click to apply</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.primary }} />
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.secondary }} />
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.bg }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              <p className="text-cyan-300 text-xs md:text-sm">
                <strong>Current Theme:</strong> {themes.find(t => t.id === currentTheme)?.name}
              </p>
              <p className="text-cyan-400/80 text-xs mt-1">Theme is saved automatically and will persist across sessions</p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
