import * as SecureStore from 'expo-secure-store';
import { SupportedStorage } from '@supabase/supabase-js';

export const storage: SupportedStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};
