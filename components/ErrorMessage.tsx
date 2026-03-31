import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { AlertCircle, WifiOff, ServerCrash, RefreshCw } from "lucide-react-native";

type ErrorType = "network" | "server" | "generic";

interface ErrorMessageProps {
  message?: string;
  type?: ErrorType;
  onRetry?: () => void;
}

const config = {
  network: {
    Icon: WifiOff,
    color: "#f5a623",
    title: "Keine Verbindung",
    desc: "Bitte prüfe deine Internetverbindung.",
  },
  server: {
    Icon: ServerCrash,
    color: "#f85149",
    title: "Serverfehler",
    desc: "Der Server ist momentan nicht erreichbar.",
  },
  generic: {
    Icon: AlertCircle,
    color: "#f85149",
    title: "Fehler aufgetreten",
    desc: "Etwas ist schiefgelaufen.",
  },
};

export default function ErrorMessage({ message, type = "generic", onRetry }: ErrorMessageProps) {
  const { Icon, color, title, desc } = config[type];

  return (
    <View style={s.container}>
      <View style={[s.iconWrap, { backgroundColor: color + "18", borderColor: color + "44" }]}>
        <Icon size={28} color={color} />
      </View>
      <Text style={s.title}>{title}</Text>
      <Text style={s.desc}>{message || desc}</Text>
      {onRetry && (
        <TouchableOpacity style={s.retryBtn} onPress={onRetry} activeOpacity={0.8}>
          <RefreshCw size={14} color="#0d1117" style={{ marginRight: 6 }} />
          <Text style={s.retryText}>Erneut versuchen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e6edf3",
    marginBottom: 6,
    textAlign: "center",
  },
  desc: {
    fontSize: 13,
    color: "#8b949e",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5a623",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0d1117",
  },
});
