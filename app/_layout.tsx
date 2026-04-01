// app/_layout.tsx
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStore } from "../store";
import { useLang } from "../i18n";
import { useTeamStore } from "../teamStore";
import { useProStore } from "../proStore";
import { requestNotificationPermissions } from "../notifications";
import AppLock from "../components/AppLock";
import Onboarding, { hasSeenOnboarding } from "../components/Onboarding";

const APP_LOCK_KEY = "eg-app-lock-enabled";

function injectGA() {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  if (document.getElementById("ga-script")) return; // already injected
  const s1 = document.createElement("script");
  s1.id = "ga-script";
  s1.async = true;
  s1.src = "https://www.googletagmanager.com/gtag/js?id=G-9EYXMP1S7Y";
  document.head.appendChild(s1);
  const s2 = document.createElement("script");
  s2.innerHTML = "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-9EYXMP1S7Y');";
  document.head.appendChild(s2);
}

export default function RootLayout() {
  const loadFromStorage = useStore(s => s.loadFromStorage);
  const loadLang = useLang(s => s.loadLang);
  const loadTeamData = useTeamStore(s => s.loadTeamData);
  const loadPro = useProStore(s => s.load);
  const [locked, setLocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => { injectGA(); init(); }, []);

  const init = async () => {
    try {
      const lockEnabled = await AsyncStorage.getItem(APP_LOCK_KEY);
      if (lockEnabled === "true") setLocked(true);
    } catch {}
    setLockChecked(true);
    const seen = await hasSeenOnboarding();
    if (!seen) setShowOnboarding(true);
    await Promise.all([loadFromStorage(), loadLang(), loadTeamData(), loadPro()]);
    requestNotificationPermissions();
  };

  if (!lockChecked) return null;

  if (showOnboarding) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light"/>
        <Onboarding onDone={() => setShowOnboarding(false)} />
      </GestureHandlerRootView>
    );
  }

  if (locked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light"/>
        <AppLock onUnlocked={() => setLocked(false)}/>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light"/>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor:"#0d1117" },
          animation: "slide_from_right",
        }}
      >
        {/* Startbildschirm — Portal Auswahl */}
        <Stack.Screen name="portal_select" options={{ animation:"none" }}/>
        <Stack.Screen name="index" options={{ animation:"none" }}/> {/* redirect zu portal_select */}

        {/* Privater Bereich */}
        <Stack.Screen name="private/index" options={{ animation:"none" }}/>
        <Stack.Screen name="folder/[id]"/>
        <Stack.Screen name="material/[id]"/>
        <Stack.Screen name="ki"/>
        <Stack.Screen name="stats"/>
        <Stack.Screen name="shopping"/>
        <Stack.Screen name="scanner" options={{ animation:"fade" }}/>
        <Stack.Screen name="suppliers"/>
        <Stack.Screen name="loans"/>
        <Stack.Screen name="reports"/>

        {/* Firmen Portal */}
        <Stack.Screen name="company/index" options={{ animation:"none" }}/>
        <Stack.Screen name="warehouse"/>
        <Stack.Screen name="team"/>
        <Stack.Screen name="invites"/>

        {/* Gemeinsam */}
        <Stack.Screen name="profile"/>
      </Stack>
    </GestureHandlerRootView>
  );
}
