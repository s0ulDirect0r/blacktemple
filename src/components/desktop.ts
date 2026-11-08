'use client';

/**
 * Bridge to the Black Temple desktop app (desktop/, Tauri). The app sets
 * `__BLACK_TEMPLE_DESKTOP__` before the page loads; in a browser it's absent and
 * every function here does nothing.
 */
interface DesktopInfo { paired: boolean; deviceName: string }
type Invoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

declare global {
  interface Window {
    __BLACK_TEMPLE_DESKTOP__?: DesktopInfo;
    __TAURI_INTERNALS__?: { invoke: Invoke };
  }
}

const PAIRED_KEY = 'desktopPaired';

function desktop() {
  if (typeof window === 'undefined') return null;
  const info = window.__BLACK_TEMPLE_DESKTOP__, invoke = window.__TAURI_INTERNALS__?.invoke;
  return info && invoke ? { info, invoke } : null;
}

/**
 * After a password sign-in in the app, mint a device token and hand it to the app's
 * keychain so later launches sign in without the password. Best effort: a failure
 * only means the password is asked for again next time.
 */
export async function rememberThisDevice(adminToken: string) {
  const app = desktop();
  if (!app || app.info.paired || sessionStorage.getItem(PAIRED_KEY)) return;
  try {
    const response = await fetch('/api/sense/devices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: app.info.deviceName }),
    });
    if (!response.ok) return;
    const { token } = await response.json();
    await app.invoke('remember_device', { token });
    sessionStorage.setItem(PAIRED_KEY, '1');
  } catch (error) {
    console.error('Desktop app could not remember this device:', error);
  }
}

/** Logging out in the app also signs the device out, so the next launch asks for the password. */
export async function forgetThisDevice() {
  const app = desktop();
  if (!app) return;
  sessionStorage.removeItem(PAIRED_KEY);
  await app.invoke('forget_device').catch(error => console.error('Desktop app could not forget this device:', error));
}
