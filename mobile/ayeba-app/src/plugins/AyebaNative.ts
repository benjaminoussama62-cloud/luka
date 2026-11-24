import { registerPlugin } from '@capacitor/core';

export interface AyebaNativePlugin {
  getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }>;
  authenticateBiometric(options: { reason: string }): Promise<{ success: boolean }>;
  haptic(options: { type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' }): Promise<void>;
}

const AyebaNative = registerPlugin<AyebaNativePlugin>('AyebaBrowserPlugin');

export default AyebaNative;
