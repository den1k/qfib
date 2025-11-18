'use client';

import React, { useState, useEffect } from 'react';
import { getInstantDB } from '@/app/utils/instantdb';

export default function AuthMenu() {
  const db = getInstantDB();
  if (!db) {
    return <span className="text-xs opacity-70">Auth not configured</span>;
  }

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoading, user, error: authError } = db.useAuth();

  useEffect(() => {
    if (user) {
      setStep('email');
      setEmail('');
      setCode('');
      setError(null);
    }
  }, [user]);

  if (isLoading) {
    return <span className="text-xs">Loading...</span>;
  }

  if (authError) {
    return <span className="text-xs text-red-400">Auth error: {authError.message}</span>;
  }

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      await db.auth.sendMagicCode({ email });
      setStep('code');
    } catch (err: any) {
      setError(err.body?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      await db.auth.signInWithMagicCode({ email, code });
      // Success triggers re-render via useAuth
      setCode('');
      setStep('email');
    } catch (err: any) {
      setError(err.body?.message || 'Invalid code');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <a href="/projects" className="text-xs underline opacity-90">Projects</a>
        <a href="/profile" className="text-xs underline opacity-90">Profile</a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {step === 'email' ? (
        <form onSubmit={sendCode} className="flex items-center gap-1">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="text-xs px-2 py-1"
            style={{ height: 24, minWidth: '120px' }}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !email}
            className="text-xs px-2 py-1"
          >
            {loading ? 'Sending...' : 'Send code'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex items-center gap-1">
          <input
            type="text"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="text-xs px-2 py-1"
            style={{ height: 24, minWidth: '80px' }}
            disabled={loading}
            maxLength={6}
          />
          <button
            type="submit"
            disabled={loading || !code}
            className="text-xs px-2 py-1"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => setStep('email')}
            className="text-xs underline opacity-70"
          >
            Back
          </button>
        </form>
      )}
      {error && <span className="text-xs text-red-400 ml-1">{error}</span>}
    </div>
  );
}


