'use client';

import React from 'react';
import { getInstantDB } from '@/app/utils/instantdb';

export default function ProfilePage() {
  const db = getInstantDB();

  if (!db) {
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="retro-title mb-4">Profile</h1>
          <div className="border-t border-green-500 mb-4"></div>
          <div className="text-sm">InstantDB not configured.</div>
        </div>
      </div>
    );
  }

  const { isLoading, user, error } = db.useAuth();

  if (isLoading) {
    return <div className="min-h-screen p-2 flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="retro-title mb-4">Profile</h1>
          <div className="border-t border-green-500 mb-4"></div>
          <div className="text-sm text-red-400">Auth error: {error.message}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen p-2">
        <div className="max-w-4xl mx-auto">
          <h1 className="retro-title mb-4">Profile</h1>
          <div className="border-t border-green-500 mb-4"></div>
          <div className="text-sm">Not signed in. <a href="/" className="underline">Go home</a></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2">
      <div className="max-w-4xl mx-auto">
        <h1 className="retro-title mb-4">Profile</h1>
        <div className="border-t border-green-500 mb-4"></div>
        <div className="space-y-3">
          <div className="text-sm">Signed in as: <strong>{user.email || 'Unknown'}</strong></div>
          <button onClick={() => db.auth.signOut()} className="text-xs px-2 py-1">Sign out</button>
        </div>
      </div>
    </div>
  );
}


