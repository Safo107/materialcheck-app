import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PRO_KEY = "eg-pro-status";
const PROFILE_KEY = "eg-profile-v1";
const BACKEND = "https://materialcheck-backend2.onrender.com";

interface ProState {
  isPro: boolean;
  inTrial: boolean;
  trialEndsAt: string | null; // ISO string
  loaded: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>; // Backend-Abfrage erzwingen
  setPro: (val: boolean, opts?: { inTrial?: boolean; trialEndsAt?: string | null }) => Promise<void>;
  clearPro: () => Promise<void>;
}

async function fetchProFromBackend(email: string): Promise<{ isPro: boolean; inTrial: boolean; trialEndsAt: string | null } | null> {
  try {
    const res = await fetch(`${BACKEND}/api/pro/status?email=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const useProStore = create<ProState>((set, get) => ({
  isPro: false,
  inTrial: false,
  trialEndsAt: null,
  loaded: false,

  load: async () => {
    // 1. Erst AsyncStorage für sofortige UI
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

    // 2. Backend-Abfrage im Hintergrund (Email aus Profil)
    try {
      const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p?.email) {
          const remote = await fetchProFromBackend(p.email);
          if (remote) {
            const newState = {
              isPro: remote.isPro,
              inTrial: remote.inTrial,
              trialEndsAt: remote.trialEndsAt ?? null,
            };
            set(newState);
            await AsyncStorage.setItem(PRO_KEY, JSON.stringify(newState));
          }
        }
      }
    } catch { /* silent — lokaler Cache bleibt */ }
  },

  refresh: async () => {
    try {
      const profileRaw = await AsyncStorage.getItem(PROFILE_KEY);
      if (!profileRaw) return;
      const p = JSON.parse(profileRaw);
      if (!p?.email) return;
      const remote = await fetchProFromBackend(p.email);
      if (remote) {
        const newState = {
          isPro: remote.isPro,
          inTrial: remote.inTrial,
          trialEndsAt: remote.trialEndsAt ?? null,
        };
        set(newState);
        await AsyncStorage.setItem(PRO_KEY, JSON.stringify(newState));
      }
    } catch { /* silent */ }
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
