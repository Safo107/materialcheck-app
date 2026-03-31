// notifications.ts - ElektroGenius Lokale Benachrichtigungen
// Kompatibel mit Expo Go SDK 53 (nur lokale Benachrichtigungen)

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Auf Web keine Push-Token Listener (nicht unterstützt)
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Berechtigungen anfordern ────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return false;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("materialcheck", {
        name: "MaterialCheck Lager",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#f5a623",
        sound: "default",
      });
    }

    return true;
  } catch {
    return false;
  }
}

// ─── Lokale Benachrichtigung senden ─────────────────────
export async function sendStockNotification(
  materialName: string,
  qty: number,
  min: number,
  unit: string,
  folderName: string
): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    if (qty >= min) return;
    const isEmpty = qty === 0;
    const title = isEmpty ? `Leer: ${materialName}` : `Niedrig: ${materialName}`;
    const body = isEmpty
      ? `${folderName} - Kein Bestand mehr! Sofort nachbestellen.`
      : `${folderName} - Noch ${qty} ${unit} (Min: ${min} ${unit})`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title, body, sound: true,
        data: { materialName, qty, min, unit, folderName },
        ...(Platform.OS === "android" ? { channelId: "materialcheck" } : {}),
      },
      trigger: null,
    });
  } catch {}
}

// ─── Badge Zahl setzen ───────────────────────────────────
export async function updateBadgeCount(count: number): Promise<void> {
  if (Platform.OS === "web") return;
  try { await Notifications.setBadgeCountAsync(count); } catch {}
}

// ─── Alle Benachrichtigungen löschen ────────────────────
export async function clearAllNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch {}
}
