import { init } from '@instantdb/react';

// Reads the public app ID from env. Keep optional to avoid build-time crashes.
const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;

// Lazy singleton to avoid multiple inits in Fast Refresh.
let _db: ReturnType<typeof init> | null = null;

export function getInstantDB() {
  if (!appId) {
    console.warn('[InstantDB] No appId found. NEXT_PUBLIC_INSTANT_APP_ID is not set.');
    return null;
  }
  if (_db) {
    return _db;
  }
  _db = init({ appId });
  return _db;
}

export function isInstantDBConfigured(): boolean {
  return Boolean(appId);
}

export function getInstantDBAppId(): string | undefined {
  return appId;
}


