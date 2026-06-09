/**
 * Session storage 헬퍼
 * - 웹: @active_user → sessionStorage (브라우저 닫으면 사라짐)
 * - 웹: 나머지     → localStorage (= AsyncStorage)
 * - 네이티브: 항상 AsyncStorage
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEYS = ['@active_user'];

function isSessionKey(key: string) {
  return Platform.OS === 'web' && SESSION_KEYS.includes(key);
}

export const Session = {
  async setItem(key: string, value: string): Promise<void> {
    if (isSessionKey(key)) {
      try { window.sessionStorage.setItem(key, value); return; } catch {}
    }
    return AsyncStorage.setItem(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    if (isSessionKey(key)) {
      try { return window.sessionStorage.getItem(key); } catch {}
    }
    return AsyncStorage.getItem(key);
  },

  async removeItem(key: string): Promise<void> {
    if (isSessionKey(key)) {
      try { window.sessionStorage.removeItem(key); return; } catch {}
    }
    return AsyncStorage.removeItem(key);
  },
};
