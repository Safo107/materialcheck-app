import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, Alert } from "react-native";
import { Crown, Zap, Package, Users, ScanLine, Download, Bot, X } from "lucide-react-native";

const C = {
  bg: "#0d1117", surface: "#161b22", surface2: "#21262d",
  border2: "rgba(255,255,255,0.14)",
  accent: "#f5a623", accentBg: "rgba(245,166,35,0.12)",
  text: "#e6edf3", text2: "#8b949e",
};

type ProFeature = "folder" | "material" | "task" | "supplier" | "scanner" | "qr" | "export" | "ki" | "team" | "multidevice";

interface Props {
  visible: boolean;
  onClose: () => void;
  feature: ProFeature;
}

const FEATURE_INFO: Record<ProFeature, { title: string; desc: string }> = {
  folder: { title: "Mehr Ordner", desc: "Im Free-Plan sind maximal 3 Ordner erlaubt." },
  material: { title: "Mehr Materialien", desc: "Im Free-Plan sind maximal 200 Materialien erlaubt." },
  task: { title: "Mehr Aufgaben", desc: "Im Free-Plan sind maximal 20 Aufgaben erlaubt." },
  supplier: { title: "Mehr Lieferanten", desc: "Im Free-Plan sind maximal 5 Lieferanten erlaubt." },
  scanner: { title: "Barcode-Scanner", desc: "Der Barcode-Scanner ist ein Pro-Feature." },
  qr: { title: "QR-Code ausdrucken", desc: "QR-Codes erstellen & drucken ist ein Pro-Feature." },
  export: { title: "Berichte exportieren", desc: "CSV & HTML Export ist ein Pro-Feature." },
  ki: { title: "KI-Assistent", desc: "Der KI-Assistent ist ein Pro-Feature." },
  team: { title: "Mehr Teammitglieder", desc: "Im Free-Plan können maximal 2 Mitglieder eingeladen werden." },
  multidevice: { title: "Mehrere Geräte", desc: "Profil auf anderen Geräten laden ist ein Pro-Feature." },
};

const PRO_HIGHLIGHTS = [
  { Icon: Package, text: "Unbegrenzte Ordner & Materialien" },
  { Icon: ScanLine, text: "Barcode-Scanner & QR-Codes" },
  { Icon: Download, text: "CSV & HTML Export" },
  { Icon: Bot, text: "KI-Assistent & Mehrere Geräte" },
];

export default function ProGate({ visible, onClose, feature }: Props) {
  const info = FEATURE_INFO[feature] ?? FEATURE_INFO.folder;

  const handleUpgrade = () => {
    Alert.alert("Pro Version", "Pro kommt bald! Wir arbeiten an der Bezahlfunktion.");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <X size={18} color={C.text2} />
          </TouchableOpacity>

          <View style={s.crownWrap}>
            <Crown size={32} color={C.accent} />
          </View>

          <Text style={s.title}>{info.title}</Text>
          <Text style={s.desc}>{info.desc}</Text>

          <View style={s.divider} />

          <Text style={s.highlightsLabel}>Pro beinhaltet:</Text>
          {PRO_HIGHLIGHTS.map(({ Icon, text }, i) => (
            <View key={i} style={s.highlightRow}>
              <View style={s.highlightIcon}>
                <Icon size={16} color={C.accent} />
              </View>
              <Text style={s.highlightText}>{text}</Text>
            </View>
          ))}

          <TouchableOpacity style={s.upgradeBtn} onPress={handleUpgrade}>
            <Zap size={16} color="#000" />
            <Text style={s.upgradeBtnText}>Jetzt upgraden</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelBtnText}>Vielleicht später</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, borderTopWidth: 0.5, borderTopColor: C.border2 },
  closeBtn: { position: "absolute", top: 16, right: 16, width: 32, height: 32, backgroundColor: C.surface2, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  crownWrap: { width: 64, height: 64, backgroundColor: C.accentBg, borderRadius: 32, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14, borderWidth: 1, borderColor: "rgba(245,166,35,0.3)" },
  title: { fontSize: 20, fontWeight: "700", color: C.text, textAlign: "center", marginBottom: 8 },
  desc: { fontSize: 13, color: C.text2, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  divider: { height: 0.5, backgroundColor: C.border2, marginBottom: 14 },
  highlightsLabel: { fontSize: 10, fontWeight: "700", color: C.text2, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  highlightRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  highlightIcon: { width: 32, height: 32, backgroundColor: C.accentBg, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  highlightText: { fontSize: 13, color: C.text, flex: 1 },
  upgradeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: 12, padding: 15, marginTop: 16 },
  upgradeBtnText: { color: "#000", fontWeight: "700", fontSize: 15 },
  cancelBtn: { alignItems: "center", padding: 12, marginTop: 4 },
  cancelBtnText: { color: C.text2, fontSize: 13 },
});
