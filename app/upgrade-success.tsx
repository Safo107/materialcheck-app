// app/upgrade-success.tsx – Wird nach erfolgreichem Stripe-Checkout aufgerufen
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckCircle, Zap } from "lucide-react-native";
import { useProStore } from "../proStore";

const C = {
  bg: "#0d1117", surface: "#161b22",
  accent: "#f5a623", green: "#3fb950",
  text: "#e6edf3", text2: "#8b949e",
};

export default function UpgradeSuccessScreen() {
  const router = useRouter();
  const refresh = useProStore(s => s.refresh);
  const isPro = useProStore(s => s.isPro);
  const inTrial = useProStore(s => s.inTrial);
  const [syncing, setSyncing] = useState(true);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    // Stripe-Webhook kann 1–5 Sekunden brauchen → mehrfach versuchen
    let tries = 0;
    const poll = async () => {
      tries++;
      setAttempts(tries);
      await refresh();
      const { isPro: pro } = useProStore.getState();
      if (pro || tries >= 8) {
        setSyncing(false);
      } else {
        setTimeout(poll, 2000);
      }
    };
    setTimeout(poll, 1500); // 1.5s warten damit Webhook Zeit hat
  }, []);

  return (
    <SafeAreaView style={s.container} edges={["top","left","right","bottom"]}>
      <View style={s.card}>
        {syncing ? (
          <>
            <ActivityIndicator color={C.accent} size="large" style={{ marginBottom: 16 }} />
            <Text style={s.title}>Pro-Status wird aktiviert…</Text>
            <Text style={s.sub}>Verbindung mit Stripe ({attempts}/8)</Text>
          </>
        ) : isPro || inTrial ? (
          <>
            <CheckCircle size={56} color={C.green} style={{ marginBottom: 16 }} />
            <Text style={[s.title, { color: C.green }]}>
              {inTrial ? "7-Tage-Trial aktiv!" : "MaterialCheck+ aktiv!"}
            </Text>
            <Text style={s.sub}>
              {inTrial
                ? "Alle Premium-Features sind für 7 Tage kostenlos freigeschaltet."
                : "Alle Premium-Features sind dauerhaft freigeschaltet."}
            </Text>
          </>
        ) : (
          <>
            <Zap size={48} color={C.accent} style={{ marginBottom: 16 }} />
            <Text style={s.title}>Fast fertig!</Text>
            <Text style={s.sub}>
              Die Aktivierung kann bis zu 30 Sekunden dauern.{"\n"}
              Öffne Einstellungen → Profil neu laden, um den Status zu aktualisieren.
            </Text>
          </>
        )}

        <TouchableOpacity
          style={s.btn}
          onPress={() => router.replace("/portal_select")}
        >
          <Text style={s.btnText}>Zur App →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: C.surface, borderRadius: 24, padding: 32, alignItems: "center", maxWidth: 360, width: "90%" },
  title: { fontSize: 20, fontWeight: "800", color: C.text, textAlign: "center", marginBottom: 10 },
  sub: { fontSize: 13, color: C.text2, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  btn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  btnText: { fontWeight: "800", fontSize: 15, color: "#0d1117" },
});
