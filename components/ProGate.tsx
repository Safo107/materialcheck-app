import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Crown, Zap, Package, Users, ScanLine, Download, Bot, X, Star } from "lucide-react-native";

const BACKEND = "https://materialcheck-backend2.onrender.com";

const C = {
  bg: "#0d1117", surface: "#161b22", surface2: "#21262d",
  border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.14)",
  accent: "#f5a623", accentBg: "rgba(245,166,35,0.12)",
  cyan: "#00c6ff", cyanBg: "rgba(0,198,255,0.10)",
  green: "#22c55e",
  text: "#e6edf3", text2: "#8b949e", text3: "#7a95b0",
};

type ProFeature = "folder" | "material" | "task" | "supplier" | "scanner" | "qr" | "export" | "ki" | "team" | "multidevice";

interface Props {
  visible: boolean;
  onClose: () => void;
  feature: ProFeature;
  email?: string;
  deviceId?: string;
}

const FEATURE_INFO: Record<ProFeature, { title: string; desc: string }> = {
  folder:      { title: "Mehr Ordner",         desc: "Im Free-Plan sind maximal 3 Ordner erlaubt." },
  material:    { title: "Mehr Materialien",     desc: "Im Free-Plan sind maximal 200 Materialien erlaubt." },
  task:        { title: "Mehr Aufgaben",        desc: "Im Free-Plan sind maximal 20 Aufgaben erlaubt." },
  supplier:    { title: "Mehr Lieferanten",     desc: "Im Free-Plan sind maximal 5 Lieferanten erlaubt." },
  scanner:     { title: "Barcode-Scanner",      desc: "Der Barcode-Scanner ist ein MaterialCheck+ Feature." },
  qr:          { title: "QR-Code ausdrucken",   desc: "QR-Codes erstellen & drucken ist ein MaterialCheck+ Feature." },
  export:      { title: "Berichte exportieren", desc: "CSV & PDF Export ist ein MaterialCheck+ Feature." },
  ki:          { title: "KI-Assistent",         desc: "Der KI-Assistent ist ein MaterialCheck+ Feature." },
  team:        { title: "Team-Portal",          desc: "Das Team-Portal ist ein MaterialCheck+ Feature." },
  multidevice: { title: "Mehrere Geräte",       desc: "Profil auf anderen Geräten laden ist ein MaterialCheck+ Feature." },
};

const PRO_HIGHLIGHTS = [
  { Icon: Package,  text: "Unbegrenzte Ordner & Materialien" },
  { Icon: Users,    text: "Team-Portal & Lager-Verwaltung" },
  { Icon: ScanLine, text: "Barcode-Scanner & QR-Codes" },
  { Icon: Download, text: "CSV & PDF Export" },
  { Icon: Bot,      text: "KI-Assistent & Mehrere Geräte" },
];

export default function ProGate({ visible, onClose, feature, email: emailProp, deviceId: deviceIdProp }: Props) {
  const info = FEATURE_INFO[feature] ?? FEATURE_INFO.folder;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartTrial = async () => {
    setLoading(true);
    setError("");
    try {
      // Email/DeviceId aus Props oder AsyncStorage
      let email = emailProp || "";
      let deviceId = deviceIdProp || "";
      if (!email) {
        const raw = await AsyncStorage.getItem("eg-profile-v1");
        if (raw) {
          const p = JSON.parse(raw);
          email = p.email || "";
          deviceId = p.deviceId || deviceId;
        }
      }
      if (!email) {
        setError("Kein Profil gefunden. Bitte erst anmelden.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${BACKEND}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, deviceId }),
      });
      const data = await res.json();
      if (data.url) {
        await Linking.openURL(data.url);
        onClose();
      } else {
        setError(data.detail || "Checkout konnte nicht gestartet werden.");
      }
    } catch {
      setError("Netzwerkfehler – bitte Internetverbindung prüfen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <X size={18} color={C.text2} />
          </TouchableOpacity>

          {/* Crown badge */}
          <View style={s.crownWrap}>
            <Crown size={32} color={C.accent} />
          </View>

          <Text style={s.productName}>MaterialCheck+</Text>
          <Text style={s.title}>{info.title}</Text>
          <Text style={s.desc}>{info.desc}</Text>

          {/* Trial badge */}
          <View style={s.trialBadge}>
            <Star size={12} color={C.green} />
            <Text style={s.trialBadgeText}>7 Tage kostenlos testen — danach 19,99 €/Monat</Text>
          </View>

          <View style={s.divider} />

          <Text style={s.highlightsLabel}>Alles inklusive:</Text>
          {PRO_HIGHLIGHTS.map(({ Icon, text }, i) => (
            <View key={i} style={s.highlightRow}>
              <View style={s.highlightIcon}>
                <Icon size={15} color={C.accent} />
              </View>
              <Text style={s.highlightText}>{text}</Text>
            </View>
          ))}

          {error ? (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Main CTA */}
          <TouchableOpacity
            style={[s.trialBtn, loading && { opacity: 0.7 }]}
            onPress={handleStartTrial}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Zap size={16} color="#000" />
            )}
            <Text style={s.trialBtnText}>
              {loading ? "Wird gestartet…" : "7 Tage kostenlos testen"}
            </Text>
          </TouchableOpacity>

          <Text style={s.trialNote}>
            Keine Zahlung heute · Kündigung jederzeit möglich
          </Text>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Vielleicht später</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.80)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 0.5, borderTopColor: C.border2,
  },
  closeBtn: {
    position: "absolute", top: 16, right: 16,
    width: 32, height: 32, backgroundColor: C.surface2,
    borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  crownWrap: {
    width: 68, height: 68, backgroundColor: C.accentBg,
    borderRadius: 34, alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 12,
    borderWidth: 1, borderColor: "rgba(245,166,35,0.3)",
  },
  productName: {
    fontSize: 11, fontWeight: "700", color: C.accent,
    textAlign: "center", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4,
  },
  title: { fontSize: 20, fontWeight: "700", color: C.text, textAlign: "center", marginBottom: 6 },
  desc: { fontSize: 13, color: C.text2, textAlign: "center", lineHeight: 20, marginBottom: 14 },
  trialBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(34,197,94,0.10)",
    borderWidth: 0.5, borderColor: "rgba(34,197,94,0.3)",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    alignSelf: "center", marginBottom: 16,
  },
  trialBadgeText: { fontSize: 12, fontWeight: "700", color: C.green },
  divider: { height: 0.5, backgroundColor: C.border2, marginBottom: 14 },
  highlightsLabel: {
    fontSize: 10, fontWeight: "700", color: C.text2,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10,
  },
  highlightRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 9 },
  highlightIcon: {
    width: 30, height: 30, backgroundColor: C.accentBg,
    borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  highlightText: { fontSize: 13, color: C.text, flex: 1 },
  errorBox: {
    backgroundColor: "rgba(239,68,68,0.10)", borderRadius: 8,
    borderWidth: 0.5, borderColor: "rgba(239,68,68,0.3)",
    padding: 10, marginBottom: 10,
  },
  errorText: { fontSize: 12, color: "#ef4444", textAlign: "center" },
  trialBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, marginTop: 16,
  },
  trialBtnText: { color: "#000", fontWeight: "800", fontSize: 15 },
  trialNote: { fontSize: 11, color: C.text3, textAlign: "center", marginTop: 8, marginBottom: 2 },
  cancelBtn: { alignItems: "center", padding: 12 },
  cancelBtnText: { color: C.text2, fontSize: 13 },
});
