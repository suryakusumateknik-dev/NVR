import React, { useState, useEffect } from 'react';
import { PlayCircle, Trash2, Download, Calendar, Clock, HardDrive, Video } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';

const Recordings = ({ api }) => {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [playbackOpen, setPlaybackOpen] = useState(false);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const response = await api.get('/recordings');
      setRecordings(response.data.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)));
    } catch (error) {
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordingId) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) return;

    try {
      await api.delete(`/recordings/${recordingId}`);
      toast.success('Recording deleted successfully');
      fetchRecordings();
    } catch (error) {
      toast.error('Failed to delete recording');
    }
  };

  const handlePlayback = (recording) => {
    setSelectedRecording(recording);
    setPlaybackOpen(true);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
  };

  const getDownloadUrl = (recordingId) => {
    const token = localStorage.getItem('token');
    return `${process.env.REACT_APP_BACKEND_URL}/api/recordings/${recordingId}?token=${token}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-cyan-400 text-xl">Loading recordings...</div>
      </div>
    );
  }

  return (
    <div data-testid="recordings-page" className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Recordings
        </h1>
        <p className="text-gray-400 text-lg">View and manage recorded footage</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Recordings</p>
              <p className="text-3xl font-bold text-white">{recordings.length}</p>
            </div>
            <div className="bg-cyan-500/10 p-4 rounded-2xl">
              <Video className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Duration</p>
              <p className="text-3xl font-bold text-white">
                {formatDuration(recordings.reduce((acc, r) => acc + (r.duration || 0), 0))}
              </p>
            </div>
            <div className="bg-purple-500/10 p-4 rounded-2xl">
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Storage Used</p>
              <p className="text-3xl font-bold text-white">
                {formatFileSize(recordings.reduce((acc, r) => acc + (r.file_size || 0), 0))}
              </p>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-2xl">
              <HardDrive className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recordings List */}
      {recordings.length === 0 ? (
        <Card className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-16 text-center">
          <Video className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">No Recordings Yet</h3>
          <p className="text-gray-400">Start recording from your cameras to see recordings here</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {recordings.map((recording) => (
            <Card
              key={recording.id}
              data-testid={`recording-item-${recording.id}`}
              className="bg-[#1a1d23]/80 backdrop-blur-xl border-cyan-500/20 p-6 hover:border-cyan-400/40 transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Video Icon */}
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 w-full lg:w-48 aspect-video rounded-xl flex items-center justify-center flex-shrink-0">
                  <Video className="w-12 h-12 text-gray-600" />
                </div>

                {/* Recording Info */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{recording.camera_name}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(recording.start_time).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(recording.start_time).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-400/30">
                      Duration: {formatDuration(recording.duration)}
                    </Badge>
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                      Size: {formatFileSize(recording.file_size)}
                    </Badge>
                    {!recording.end_time && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-400/30 animate-pulse">
                        Recording in progress
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2">
                  <Button
                    data-testid={`play-recording-${recording.id}`}
                    onClick={() => handlePlayback(recording)}
                    className="flex-1 lg:flex-none bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-400/30"
                    disabled={!recording.end_time}
                  >
                    <PlayCircle className="w-4 h-4 lg:mr-2" />
                    <span className="hidden lg:inline">Play</span>
                  </Button>
                  <a
                    href={getDownloadUrl(recording.id)}
                    download={recording.filename}
                    className="flex-1 lg:flex-none"
                  >
                    <Button
                      data-testid={`download-recording-${recording.id}`}
                      className="w-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-400/30"
                      disabled={!recording.end_time}
                    >
                      <Download className="w-4 h-4 lg:mr-2" />
                      <span className="hidden lg:inline">Download</span>
                    </Button>
                  </a>
                  <Button
                    data-testid={`delete-recording-${recording.id}`}
                    onClick={() => handleDelete(recording.id)}
                    variant="outline"
                    className="flex-1 lg:flex-none border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500"
                  >
                    <Trash2 className="w-4 h-4 lg:mr-2" />
                    <span className="hidden lg:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Playback Dialog */}
      <Dialog open={playbackOpen} onOpenChange={setPlaybackOpen}>
        <DialogContent className="bg-[#1a1d23] border-cyan-500/20 text-white max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-cyan-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Playback: {selectedRecording?.camera_name}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedRecording && (
              <video
                data-testid="video-player"
                controls
                className="w-full rounded-xl bg-black"
                src={getDownloadUrl(selectedRecording.id)}
              >
                Your browser does not support video playback.
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Recordings;