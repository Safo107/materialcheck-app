// components/BottomNav.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, Cpu, ShoppingCart, User, Camera, BarChart2 } from "lucide-react-native";
import { useStore } from "../store";
import { useLang, t } from "../i18n";

const C = {
  bg:"#0d1117", surface:"#161b22",
  border:"rgba(255,255,255,0.08)",
  accent:"#f5a623", red:"#f85149", text3:"#6e7681",
};

type Tab = "home"|"ki"|"stats"|"shopping"|"profile";

export default function BottomNav({ active }: { active: Tab }) {
  const router = useRouter();
  const { lang } = useLang();
  const T = t(lang);
  const lowCount = useStore(s => s.getLowStockMaterials().length);

  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const bottomPad = isWeb ? 0 : (insets.bottom > 0 ? insets.bottom : 12);

  const go = (route: string, key: Tab) => {
    if (active !== key) router.push(route as any);
  };

  return (
    <View style={[
      s.wrapper,
      isWeb
        ? { paddingBottom: 0 } as any
        : { paddingBottom: bottomPad }
    ]}>

      {/* Statistik + Scanner FAB */}
      <View style={[s.centerGroup, { bottom: (isWeb ? 0 : bottomPad) + 44 }]}>
        <TouchableOpacity
          style={[s.statsBtn, active==="stats" && s.statsBtnActive]}
          onPress={() => go("/stats", "stats")}>
          <BarChart2 size={12} color={active==="stats" ? C.accent : C.text3} />
          <Text style={[s.statsLabel, active==="stats" && { color:C.accent }]}>{T.navStats}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.fab} onPress={() => router.push("/scanner")}>
          <Camera size={22} color="#0d1117" />
        </TouchableOpacity>
      </View>

      {/* Nav Leiste */}
      <View style={s.nav}>

        <TouchableOpacity style={s.navItem} onPress={() => go("/", "home")}>
          <Home size={20} color={active==="home" ? C.accent : C.text3} />
          <View style={[s.dot, { opacity: active==="home" ? 1 : 0 }]} />
          <Text style={[s.navLabel, active==="home" && { color:C.accent }]}>{T.navOverview}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => go("/ki", "ki")}>
          <Cpu size={20} color={active==="ki" ? C.accent : C.text3} />
          <View style={[s.dot, { opacity: active==="ki" ? 1 : 0 }]} />
          <Text style={[s.navLabel, active==="ki" && { color:C.accent }]}>{T.navKI}</Text>
        </TouchableOpacity>

        <View style={{ width: 76 }} />

        <TouchableOpacity style={s.navItem} onPress={() => go("/shopping", "shopping")}>
          <View style={{ position:"relative" }}>
            <ShoppingCart size={20} color={active==="shopping" ? C.accent : C.text3} />
            {lowCount > 0 && (
              <View style={s.badge}>
                <Text style={s.badgeText}>{lowCount > 9 ? "9+" : lowCount}</Text>
              </View>
            )}
          </View>
          <View style={[s.dot, { opacity: active==="shopping" ? 1 : 0 }]} />
          <Text style={[s.navLabel, active==="shopping" && { color:C.accent }]}>Einkauf</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navItem} onPress={() => go("/profile", "profile")}>
          <User size={20} color={active==="profile" ? C.accent : C.text3} />
          <View style={[s.dot, { opacity: active==="profile" ? 1 : 0 }]} />
          <Text style={[s.navLabel, active==="profile" && { color:C.accent }]}>{T.navProfile}</Text>
        </TouchableOpacity>

      </View>

      {/* iOS Safari Home Indicator Fix */}
      {isWeb && (
        <View style={s.webSafeArea} />
      )}

    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    backgroundColor: C.surface,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  webSafeArea: {
    height: 20,
    backgroundColor: C.surface,
  },
  centerGroup: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
    zIndex: 20,
  },
  statsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 5,
  },
  statsBtnActive: {
    borderColor: "rgba(245,166,35,0.5)",
    backgroundColor: "rgba(245,166,35,0.08)",
  },
  statsLabel: { fontSize: 10, fontWeight: "600", color: C.text3 },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 3,
    borderColor: C.bg,
  },
  nav: {
    flexDirection: "row",
    paddingTop: 10,
    alignItems: "flex-start",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
    marginTop: 1,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: "500",
    color: C.text3,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: C.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
