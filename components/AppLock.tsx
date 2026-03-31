// components/AppLock.tsx - App PIN Sperre
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = {
  bg: "#0d1117", surface: "#161b22", surface2: "#21262d",
  border: "rgba(255,255,255,0.14)", accent: "#f5a623",
  green: "#3fb950", red: "#f85149",
  text: "#e6edf3", text2: "#8b949e", text3: "#6e7681",
};

const APP_PIN_KEY = "eg-app-pin";
const APP_LOCK_KEY = "eg-app-lock-enabled";

interface Props {
  onUnlocked: () => void;
}

export default function AppLock({ onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    checkBiometric();
    tryBiometric();
  }, []);

  const checkBiometric = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometric(compatible && enrolled);
    } catch {}
  };

  const tryBiometric = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "MaterialCheck entsperren",
        cancelLabel: "PIN verwenden",
      });
      if (result.success) onUnlocked();
    } catch {}
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = async (digit: string) => {
    const updated = pin + digit;
    setPin(updated);
    setError("");

    if (updated.length === 6) {
      try {
        const stored = await AsyncStorage.getItem(APP_PIN_KEY);
        if (updated === stored) {
          onUnlocked();
        } else {
          shake();
          setAttempts(prev => prev + 1);
          setError(attempts >= 2 ? `❌ Falscher PIN (${attempts + 1}. Versuch)` : "❌ Falscher PIN");
          setTimeout(() => setPin(""), 500);
        }
      } catch {
        setError("Fehler beim Prüfen");
        setPin("");
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  return (
    <View style={s.container}>
      {/* Logo */}
      <View style={s.logoWrap}>
        <View style={s.logoBadge}><Text style={s.logoText}>EG</Text></View>
        <Text style={s.appName}>MaterialCheck</Text>
        <Text style={s.appSub}>ElektroGenius</Text>
      </View>

      {/* PIN Dots */}
      <Animated.View style={[s.dotsWrap, { transform: [{ translateX: shakeAnim }] }]}>
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={[s.dot, pin.length > i && s.dotFilled]} />
        ))}
      </Animated.View>

      {error ? <Text style={s.errorText}>{error}</Text> : <Text style={s.hintText}>PIN eingeben</Text>}

      {/* Numpad */}
      <View style={s.grid}>
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((key, i) => (
          <TouchableOpacity
            key={i}
            style={[s.key, key === "" && { opacity: 0 }, key === "⌫" && s.keyDelete]}
            onPress={() => key === "⌫" ? handleDelete() : key !== "" ? handleDigit(key) : null}
            disabled={key === ""}
          >
            <Text style={[s.keyText, key === "⌫" && { color: C.red }]}>{key}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Biometrie */}
      {hasBiometric && (
        <TouchableOpacity style={s.bioBtn} onPress={tryBiometric}>
          <Text style={s.bioText}>👆 Fingerabdruck verwenden</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, backgroundColor:C.bg, alignItems:"center", justifyContent:"center", paddingHorizontal:30 },
  logoWrap: { alignItems:"center", marginBottom:40 },
  logoBadge: { width:64, height:64, backgroundColor:"#1c2c55", borderWidth:2, borderColor:C.accent, borderRadius:16, alignItems:"center", justifyContent:"center", marginBottom:12 },
  logoText: { color:C.accent, fontWeight:"700", fontSize:22 },
  appName: { fontSize:22, fontWeight:"700", color:C.text },
  appSub: { fontSize:13, color:C.text2, marginTop:3 },
  dotsWrap: { flexDirection:"row", gap:14, marginBottom:12 },
  dot: { width:16, height:16, borderRadius:8, borderWidth:2, borderColor:C.border },
  dotFilled: { backgroundColor:C.accent, borderColor:C.accent },
  hintText: { fontSize:13, color:C.text3, marginBottom:32 },
  errorText: { fontSize:13, color:C.red, fontWeight:"600", marginBottom:32 },
  grid: { flexDirection:"row", flexWrap:"wrap", width:270, gap:12, justifyContent:"center" },
  key: { width:80, height:70, backgroundColor:C.surface, borderRadius:14, alignItems:"center", justifyContent:"center", borderWidth:0.5, borderColor:C.border },
  keyDelete: { backgroundColor:"rgba(248,81,73,0.1)", borderColor:"rgba(248,81,73,0.2)" },
  keyText: { fontSize:26, fontWeight:"500", color:C.text },
  bioBtn: { marginTop:24, paddingHorizontal:20, paddingVertical:12, backgroundColor:C.surface, borderRadius:20, borderWidth:0.5, borderColor:C.border },
  bioText: { fontSize:13, color:C.text2 },
});
