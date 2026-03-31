// theme.ts - Dark/Light Theme für ElektroGenius MaterialCheck
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_KEY = "eg-theme";

export const DARK_COLORS = {
  bg: "#0d1117",
  surface: "#161b22",
  surface2: "#21262d",
  surface3: "#2d333b",
  border: "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.14)",
  accent: "#f5a623",
  accentBg: "rgba(245,166,35,0.12)",
  green: "#3fb950",
  red: "#f85149",
  blue: "#4fa3f7",
  purple: "#a371f7",
  text: "#e6edf3",
  text2: "#8b949e",
  text3: "#6e7681",
};

export const LIGHT_COLORS = {
  bg: "#f4f6f9",
  surface: "#ffffff",
  surface2: "#f0f2f5",
  surface3: "#e8eaed",
  border: "rgba(0,0,0,0.08)",
  border2: "rgba(0,0,0,0.14)",
  accent: "#e09612",
  accentBg: "rgba(224,150,18,0.1)",
  green: "#2da44e",
  red: "#d1242f",
  blue: "#0969da",
  purple: "#8250df",
  text: "#1c2128",
  text2: "#57606a",
  text3: "#8c959f",
};

interface ThemeState {
  isDark: boolean;
  colors: typeof DARK_COLORS;
  toggleTheme: () => void;
  loadTheme: () => Promise<void>;
}

export const useTheme = create<ThemeState>((set, get) => ({
  isDark: true,
  colors: DARK_COLORS,

  toggleTheme: () => {
    const newIsDark = !get().isDark;
    set({ isDark: newIsDark, colors: newIsDark ? DARK_COLORS : LIGHT_COLORS });
    AsyncStorage.setItem(THEME_KEY, newIsDark ? "dark" : "light");
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      const isDark = saved !== "light";
      set({ isDark, colors: isDark ? DARK_COLORS : LIGHT_COLORS });
    } catch {}
  },
}));
