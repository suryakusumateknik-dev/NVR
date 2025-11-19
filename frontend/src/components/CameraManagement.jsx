import React, { useState, useEffect } from 'react';
import { Camera, Plus, Edit, Trash2, Play, Square, AlertCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';

const CameraManagement = ({ api }) => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    stream_url: '',
    location: '',
  });

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const response = await api.get('/cameras');
      setCameras(response.data);
    } catch (error) {
      toast.error('Failed to load cameras');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingCamera) {
        await api.put(`/cameras/${editingCamera.id}`, formData);
        toast.success('Camera updated successfully');
      } else {
        await api.post('/cameras', formData);
        toast.success('Camera added successfully');
      }
      
      setDialogOpen(false);
      setFormData({ name: '', stream_url: '', location: '' });
      setEditingCamera(null);
      fetchCameras();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save camera');
    }
  };

  const handleEdit = (camera) => {
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      stream_url: camera.stream_url,
      location: camera.location || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (cameraId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) return;

    try {
      await api.delete(`/cameras/${cameraId}`);
      toast.success('Camera deleted successfully');
      fetchCameras();
    } catch (error) {
      toast.error('Failed to delete camera');
    }
  };

  const handleStartRecording = async (cameraId) => {
    try {
      await api.post(`/recordings/start/${cameraId}`);
      toast.success('Recording started');
      fetchCameras();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to start recording');
    }
  };

  const handleStopRecording = async (cameraId) => {
    try {
      await api.post(`/recordings/stop/${cameraId}`);
      toast.success('Recording stopped');
      fetchCameras();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to stop recording');
    }
  };

  const openDialog = () => {
    setEditingCamera(null);
    setFormData({ name: '', stream_url: '', location: '' });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cyan-400 text-xl">Loading cameras...</div>
      </div>
    );
  }

  return (
    <div data-testid="camera-management-page" className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Camera Management
          </h1>
          <p className="text-gray-400 text-lg">Manage your surveillance cameras</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="add-camera-button"
              onClick={openDialog}
              className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-[#0a0f1a] font-semibold shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a1d23] border-cyan-500/20 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {editingCamera ? 'Edit Camera' : 'Add New Camera'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="camera-name" className="text-gray-300">Camera Name *</Label>
                <Input
                  id="camera-name"
                  data-testid="camera-name-input"
                  type="text"
                  placeholder="e.g. Front Door"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="stream-url" className="text-gray-300">Stream URL (RTSP/HTTP) *</Label>
                <Input
                  id="stream-url"
                  data-testid="stream-url-input"
                  type="text"
                  placeholder="rtsp://192.168.1.100:554/stream"
                  value={formData.stream_url}
                  onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
                  className="bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white mt-2"
                  required
                />
              </div>

              <div>
                <Label htmlFor="location" className="text-gray-300">Location</Label>
                <Input
                  id="location"
                  data-testid="location-input"
                  type="text"
                  placeholder="e.g. Building A, Floor 1"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white mt-2"
                />
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <div className="text-sm text-cyan-300">
                    <p className="font-semibold mb-1">Stream URL Format:</p>
                    <p className="text-cyan-400/80">• RTSP: rtsp://username:password@ip:port/path</p>
                    <p className="text-cyan-400/80">• HTTP: http://ip:port/video</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingCamera(null);
                    setFormData({ name: '', stream_url: '', location: '' });
                  }}
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-[#0f1419]"
                >
                  Cancel
                </Button>
                <Button
                  data-testid="save-camera-button"
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-[#0a0f1a] font-semibold"
                >
                  {editingCamera ? 'Update' : 'Add'} Camera
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cameras Grid */}
      {cameras.length === 0 ? (
        <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-16 text-center">
          <Camera className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">No Cameras Yet</h3>
          <p className="text-gray-400 mb-6">Get started by adding your first camera</p>
          <Button
            onClick={openDialog}
            className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-[#0a0f1a] font-semibold"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Your First Camera
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {cameras.map((camera) => (
            <Card
              key={camera.id}
              data-testid={`camera-item-${camera.id}`}
              className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 overflow-hidden hover:border-cyan-400/40 transition-all card-hover"
            >
              {/* Camera Preview */}
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 aspect-video flex items-center justify-center">
                <Camera className="w-16 h-16 text-gray-600" />
                {camera.status === 'recording' && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-500/90 px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-white text-sm font-semibold">REC</span>
                  </div>
                )}
              </div>

              {/* Camera Info */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{camera.name}</h3>
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

                <div className="bg-[#0f1419] rounded-lg p-3 mb-4">
                  <p className="text-gray-500 text-xs mb-1">Stream URL</p>
                  <p className="text-gray-300 text-sm font-mono truncate">{camera.stream_url}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {camera.status === 'recording' ? (
                    <Button
                      data-testid={`stop-recording-${camera.id}`}
                      onClick={() => handleStopRecording(camera.id)}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-400/30"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      data-testid={`start-recording-${camera.id}`}
                      onClick={() => handleStartRecording(camera.id)}
                      className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-400/30"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Record
                    </Button>
                  )}
                  <Button
                    data-testid={`edit-camera-${camera.id}`}
                    onClick={() => handleEdit(camera)}
                    variant="outline"
                    size="icon"
                    className="border-gray-700 text-gray-400 hover:bg-[#0f1419] hover:text-white"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    data-testid={`delete-camera-${camera.id}`}
                    onClick={() => handleDelete(camera.id)}
                    variant="outline"
                    size="icon"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CameraManagement;