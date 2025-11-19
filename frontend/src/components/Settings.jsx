import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Upload, Image as ImageIcon } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const Settings = ({ api }) => {
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

  useEffect(() => {
    fetchSettings();
  }, []);

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
      // Upload logo if new file selected
      if (logoFile) {
        await handleLogoUpload();
      }

      // Update settings
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cyan-400 text-xl">Loading settings...</div>
      </div>
    );
  }

  return (
    <div data-testid="settings-page" className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Settings
        </h1>
        <p className="text-gray-400 text-lg">Configure your NVR CCTV system</p>
      </div>

      {/* Application Settings */}
      <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-cyan-500/10 p-3 rounded-xl">
            <SettingsIcon className="w-6 h-6 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Application Settings</h2>
        </div>

        <div className="space-y-6">
          {/* App Name */}
          <div>
            <Label htmlFor="app-name" className="text-gray-300 text-base mb-2 block">
              Application Name
            </Label>
            <Input
              id="app-name"
              data-testid="app-name-input"
              type="text"
              placeholder="NVR CCTV System"
              value={settings.app_name}
              onChange={(e) => setSettings({ ...settings, app_name: e.target.value })}
              className="bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white h-12 text-base"
            />
          </div>

          {/* App Logo */}
          <div>
            <Label className="text-gray-300 text-base mb-2 block">
              Application Logo
            </Label>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Logo Preview */}
              <div className="w-32 h-32 bg-[#0f1419] border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-12 h-12 text-gray-600" />
                )}
              </div>

              {/* Upload Button */}
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
                    className="bg-[#0f1419] hover:bg-[#1a1d23] border border-cyan-400/30 text-cyan-400"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Logo
                  </Button>
                </label>
                <p className="text-gray-500 text-sm mt-2">
                  Recommended: Square image, 512x512px or larger
                </p>
              </div>
            </div>
          </div>

          {/* Recording Duration */}
          <div>
            <Label htmlFor="recording-duration" className="text-gray-300 text-base mb-2 block">
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
              className="bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white h-12 text-base"
            />
            <p className="text-gray-500 text-sm mt-2">
              Current: {Math.floor(settings.recording_duration / 3600)}h {Math.floor((settings.recording_duration % 3600) / 60)}m
            </p>
          </div>

          {/* Motion Detection */}
          <div className="flex items-center justify-between p-4 bg-[#0f1419] rounded-xl border border-gray-700">
            <div>
              <Label className="text-gray-300 text-base">Motion Detection</Label>
              <p className="text-gray-500 text-sm mt-1">Enable automatic motion detection alerts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                data-testid="motion-detection-toggle"
                type="checkbox"
                checked={settings.motion_detection_enabled}
                onChange={(e) => setSettings({ ...settings, motion_detection_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-400/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          data-testid="save-settings-button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-[#0a0f1a] font-semibold shadow-lg px-8 h-12"
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;