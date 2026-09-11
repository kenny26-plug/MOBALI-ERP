import React, { useState } from 'react';
import { User as UserIcon, Lock, Eye, EyeOff, Shield, ArrowRight, AlertCircle, Building2 } from 'lucide-react';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide correct username and password combinations.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failure. Access denied.');
      }

      // Save secure login credentials locally
      localStorage.setItem('erp_token', data.token);
      localStorage.setItem('erp_refresh_token', data.refreshToken);

      // Successfully propagate to parent screen root routing
      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'System network error. Cannot connect to gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="login-gateway-container" 
      className="min-h-screen bg-slate-950 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100 font-sans"
    >
      <div className="max-w-md w-full space-y-8">
        
        {/* Abstract Corporate Branding logo */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center shadow-inner shadow-amber-500/5">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-extrabold tracking-widest text-[#f59e0b] uppercase font-sans">
              Mobali Supplies
            </h1>
            <p className="text-xs tracking-wider text-slate-400 font-mono font-medium uppercase">
              Enterprise Management System
            </p>
          </div>
        </div>

        {/* Security Login Card */}
        <div className="bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
          
          <div className="space-y-2 mb-8 text-center sm:text-left">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <Shield className="h-5 w-5 text-amber-500 shrink-0" />
              Gateway Verification
            </h2>
            <p className="text-xs text-slate-400">
              Please enter your security combination below to establish a terminal session.
            </p>
          </div>

          {error && (
            <div 
              id="login-error-container" 
              className="mb-6 rounded-xl bg-rose-950/40 border border-rose-800/40 p-4 text-xs text-rose-300 flex items-start space-x-2.5 font-sans animate-fade-in"
            >
              <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block text-rose-200">Terminal Rejection:</span>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          <form id="login-form" className="space-y-6" onSubmit={handleSubmit}>
            
            {/* Username Selection input */}
            <div>
              <label 
                htmlFor="username-field" 
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono"
              >
                Security Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <UserIcon className="h-4.5 w-4.5" />
                </span>
                <input
                  id="username-field"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username or Security alias"
                  className="block w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/80 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password input */}
            <div>
              <label 
                htmlFor="password-field" 
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono"
              >
                Access Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  id="password-field"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret combination"
                  className="block w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-11 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/80 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit btn */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 py-3 px-4 text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/15 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none transition-all cursor-pointer"
            >
              <span>{loading ? 'Decrypting Access Token...' : 'Establish Secure Connection'}</span>
              {!loading && <ArrowRight className="h-4 w-4 shrink-0" />}
            </button>

          </form>

        </div>

        {/* Footer info lock */}
        <div className="text-center">
          <p className="text-[10px] text-slate-600 font-mono tracking-wide uppercase">
            Secured Connection • TLS 1.3 Encryption
          </p>
        </div>

      </div>
    </div>
  );
}
