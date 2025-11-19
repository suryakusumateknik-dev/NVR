import React, { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import SplashScreen from './components/SplashScreen';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import CameraManagement from './components/CameraManagement';
import Recordings from './components/Recordings';
import Settings from './components/Settings';
import MainLayout from './components/MainLayout';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create axios instance with auth
const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
      <div className="text-cyan-400 text-xl">Loading...</div>
    </div>;
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <AuthPage onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Dashboard api={api} />
                </MainLayout>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/cameras"
            element={
              isAuthenticated ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <CameraManagement api={api} />
                </MainLayout>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/recordings"
            element={
              isAuthenticated ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Recordings api={api} />
                </MainLayout>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAuthenticated ? (
                <MainLayout user={user} onLogout={handleLogout}>
                  <Settings api={api} user={user} />
                </MainLayout>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
export { api };