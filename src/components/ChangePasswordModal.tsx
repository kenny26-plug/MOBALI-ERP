import React, { useState } from 'react';
import { User } from '../types';
import { ShieldCheck, Lock, CheckCircle2, AlertCircle, Key, Check, Eye, EyeOff, X } from 'lucide-react';

interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
  onPasswordChanged: (updatedUser: User) => void;
}

export default function ChangePasswordModal({ user, onClose, onPasswordChanged }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password structural test criteria match requirement
  const checks = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword)
  };

  const isFormValid = 
    checks.length && 
    checks.upper && 
    checks.lower && 
    checks.number && 
    checks.special && 
    (newPassword === confirmNewPassword) && 
    currentPassword.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError('Please ensure your new password satisfies all system security rules.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must differ from your current password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('erp_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmNewPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password update failed.');
      }

      setSuccess('Password updated successfully.');
      
      // Update global user model
      onPasswordChanged(data.user);
      
      // Close modal after showing success brief feedback
      setTimeout(() => {
        onClose();
      }, 1800);

    } catch (err: any) {
      setError(err.message || 'System update logic failure.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="change-password-modal-container" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div 
        id="change-password-modal" 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl space-y-6"
      >
        {/* Header containing title and dismiss button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-md font-bold text-white tracking-tight">
                Change Access Password
              </h3>
              <p className="text-[11px] text-slate-400">
                Optional configuration for account: <span className="font-mono text-amber-400 font-semibold">{user.username}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-150 transition-colors bg-slate-950/40 border border-slate-800"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div 
            id="modal-change-pwd-error" 
            className="rounded-xl bg-rose-950/35 border border-rose-800/40 p-4 text-xs text-rose-300 text-left font-sans flex items-start space-x-2 animate-shake"
          >
            <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-0.5 text-rose-200">Integrity Violation:</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div 
            id="modal-change-pwd-success" 
            className="rounded-xl bg-green-950/30 border border-green-800/40 p-4 text-xs text-green-300 text-left font-sans flex items-center space-x-2.5"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        <form id="modal-change-pwd-form" className="space-y-4" onSubmit={handleSubmit}>
          
          {/* Current Password Field */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              Current Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Key className="h-4 w-4" />
              </span>
              <input
                id="modal-current-pwd-input"
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="block w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-9 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/80 transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password Field */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="modal-new-pwd-input"
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                className="block w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-9 py-2.5 text-sm text-slate-250 placeholder-slate-650 focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/80 transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              Confirm New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="modal-confirm-pwd-input"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Re-enter new secure password"
                className="block w-full rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-9 py-2.5 text-sm text-slate-250 placeholder-slate-650 focus:border-amber-500/80 focus:outline-none focus:ring-1 focus:ring-amber-500/80 transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Real-time Validation Criteria indicator */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-[11px] font-mono leading-relaxed text-slate-400 space-y-2">
            <span className="font-bold text-amber-500 uppercase tracking-widest block text-[9px]">
              Required Password Specifications
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1.5">
              <li className="flex items-center space-x-1.5">
                <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] shrink-0 ${checks.length ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'border-slate-800 text-slate-600'}`}>
                  {checks.length ? <Check className="h-2.5 w-2.5" /> : '•'}
                </span>
                <span className={checks.length ? 'text-green-400' : 'text-slate-500'}>At least 8 characters</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] shrink-0 ${checks.upper ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'border-slate-800 text-slate-600'}`}>
                  {checks.upper ? <Check className="h-2.5 w-2.5" /> : '•'}
                </span>
                <span className={checks.upper ? 'text-green-400' : 'text-slate-500'}>Uppercase Letter (A-Z)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] shrink-0 ${checks.lower ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'border-slate-800 text-slate-600'}`}>
                  {checks.lower ? <Check className="h-2.5 w-2.5" /> : '•'}
                </span>
                <span className={checks.lower ? 'text-green-400' : 'text-slate-500'}>Lowercase Letter (a-z)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] shrink-0 ${checks.number ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'border-slate-800 text-slate-600'}`}>
                  {checks.number ? <Check className="h-2.5 w-2.5" /> : '•'}
                </span>
                <span className={checks.number ? 'text-green-400' : 'text-slate-500'}>Number (0-9)</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] shrink-0 ${checks.special ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'border-slate-800 text-slate-600'}`}>
                  {checks.special ? <Check className="h-2.5 w-2.5" /> : '•'}
                </span>
                <span className={checks.special ? 'text-green-400' : 'text-slate-500'}>Special Character</span>
              </li>
              <li className="flex items-center space-x-1.5">
                <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] shrink-0 ${(newPassword && newPassword === confirmNewPassword) ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'border-slate-800 text-slate-600'}`}>
                  {(newPassword && newPassword === confirmNewPassword) ? <Check className="h-2.5 w-2.5" /> : '•'}
                </span>
                <span className={(newPassword && newPassword === confirmNewPassword) ? 'text-green-400' : 'text-slate-500'}>Passwords match</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              id="modal-cancel-pwd-btn"
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 py-3 text-xs font-semibold tracking-wide transition cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              id="modal-submit-pwd-btn"
              type="submit"
              disabled={loading || !isFormValid}
              className="flex-1 flex items-center justify-center space-x-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 py-3 text-xs font-bold tracking-wide transition shadow-md hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer"
            >
              <span>{loading ? 'Changing...' : 'Update Password'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
