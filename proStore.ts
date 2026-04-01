import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRO_KEY = "eg-pro-status";

interface ProState {
  isPro: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  setPro: (val: boolean) => Promise<void>;
}

export const useProStore = create<ProState>((set) => ({
  isPro: false,
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(PRO_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ isPro: data.isPro ?? false, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch { set({ loaded: true }); }
  },
  setPro: async (val: boolean) => {
    set({ isPro: val });
    await AsyncStorage.setItem(PRO_KEY, JSON.stringify({ isPro: val }));
  },
}));
