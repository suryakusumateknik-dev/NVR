import React, { useState } from 'react';
import { Video, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const AuthPage = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await onLogin(formData.email, formData.password);
      } else {
        result = await onRegister(formData.username, formData.email, formData.password);
      }

      if (result.success) {
        toast.success(isLogin ? 'Login successful!' : 'Registration successful!');
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] via-[#1a1d23] to-[#0c1220] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block relative mb-4">
            <div className="absolute inset-0 bg-cyan-400 blur-2xl opacity-20"></div>
            <div className="relative bg-gradient-to-br from-cyan-400 to-blue-500 p-4 rounded-2xl">
              <Video className="w-12 h-12 text-[#0a0f1a]" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            NVR CCTV System
          </h1>
          <p className="text-gray-400 mt-2">Professional Surveillance Management</p>
        </div>

        {/* Auth Form */}
        <div className="bg-[#1a1d23]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 shadow-2xl p-8">
          <div className="flex gap-4 mb-6">
            <button
              data-testid="login-tab-button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                isLogin
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-[#0a0f1a] shadow-lg'
                  : 'bg-[#0f1419] text-gray-400 hover:text-gray-300'
              }`}
            >
              Login
            </button>
            <button
              data-testid="register-tab-button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                !isLogin
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-[#0a0f1a] shadow-lg'
                  : 'bg-[#0f1419] text-gray-400 hover:text-gray-300'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <Label htmlFor="username" className="text-gray-300 mb-2 block">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <Input
                    id="username"
                    data-testid="username-input"
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-11 bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white h-12 rounded-xl"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-gray-300 mb-2 block">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-11 bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white h-12 rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-gray-300 mb-2 block">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                <Input
                  id="password"
                  data-testid="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-11 pr-11 bg-[#0f1419] border-gray-700 focus:border-cyan-400 text-white h-12 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              data-testid="auth-submit-button"
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-[#0a0f1a] font-semibold rounded-xl shadow-lg"
            >
              {loading ? 'Processing...' : isLogin ? 'Login' : 'Register'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;