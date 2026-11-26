import { registerPlugin } from '@capacitor/core';

export interface AyebaNativePlugin {
  getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }>;
  authenticateBiometric(options: { reason: string }): Promise<{ success: boolean }>;
  haptic(options: { type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' }): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  scheduleNotification(options: { title: string; body: string; delay: number }): Promise<void>;
  share(options: { text?: string; url?: string }): Promise<void>;
  setKeychainItem(options: { key: string; value: string }): Promise<void>;
  getKeychainItem(options: { key: string }): Promise<{ value: string }>;
  deleteKeychainItem(options: { key: string }): Promise<void>;
  indexForSpotlight(options: { title: string; content: string; url: string }): Promise<void>;
}

const AyebaNative = registerPlugin<AyebaNativePlugin>('AyebaBrowser');

export default AyebaNative;
