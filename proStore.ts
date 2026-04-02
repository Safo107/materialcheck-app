import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRO_KEY = "eg-pro-status";

interface ProState {
  isPro: boolean;
  inTrial: boolean;
  trialEndsAt: string | null; // ISO string
  loaded: boolean;
  load: () => Promise<void>;
  setPro: (val: boolean, opts?: { inTrial?: boolean; trialEndsAt?: string | null }) => Promise<void>;
  clearPro: () => Promise<void>;
}

export const useProStore = create<ProState>((set) => ({
  isPro: false,
  inTrial: false,
  trialEndsAt: null,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(PRO_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          isPro: data.isPro ?? false,
          inTrial: data.inTrial ?? false,
          trialEndsAt: data.trialEndsAt ?? null,
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  setPro: async (val, opts = {}) => {
    const newState = {
      isPro: val,
      inTrial: opts.inTrial ?? false,
      trialEndsAt: opts.trialEndsAt ?? null,
    };
    set(newState);
    await AsyncStorage.setItem(PRO_KEY, JSON.stringify(newState));
  },

  clearPro: async () => {
    set({ isPro: false, inTrial: false, trialEndsAt: null });
    await AsyncStorage.removeItem(PRO_KEY);
  },
}));
