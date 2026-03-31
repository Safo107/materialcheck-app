import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Dimensions, Animated,
} from "react-native";
import { Package, Users, BarChart2, Zap, ArrowRight, Check } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const ONBOARDING_KEY = "eg-onboarding-done";

const slides = [
  {
    Icon: Package,
    color: "#f5a623",
    title: "Materiallager",
    description: "Verwalte dein gesamtes Elektromaterial — übersichtlich, schnell und immer aktuell.",
  },
  {
    Icon: Users,
    color: "#4fa3f7",
    title: "Team & Firma",
    description: "Arbeite mit deinem Team zusammen. Lager teilen, Rollen vergeben, Live-Sync.",
  },
  {
    Icon: BarChart2,
    color: "#3fb950",
    title: "Statistiken",
    description: "Behalte den Überblick: Lagerwert, Verbrauch und kritische Bestände auf einen Blick.",
  },
  {
    Icon: Zap,
    color: "#a371f7",
    title: "KI-Assistent",
    description: "Lass die KI beim Bestellen helfen, Preise analysieren und Empfehlungen geben.",
  },
];

interface OnboardingProps {
  onDone: () => void;
}

export default function Onboarding({ onDone }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const goNext = () => {
    if (page < slides.length - 1) {
      const next = page + 1;
      setPage(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    onDone();
  };

  return (
    <View style={s.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      >
        {slides.map((slide, i) => {
          const { Icon } = slide;
          return (
            <View key={i} style={[s.slide, { width }]}>
              <View style={[s.iconWrap, { backgroundColor: slide.color + "18", borderColor: slide.color + "44" }]}>
                <Icon size={48} color={slide.color} />
              </View>
              <Text style={s.title}>{slide.title}</Text>
              <Text style={s.desc}>{slide.description}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={s.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[s.dot, { backgroundColor: i === page ? "#f5a623" : "rgba(255,255,255,0.2)" }]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={s.footer}>
        {page < slides.length - 1 ? (
          <>
            <TouchableOpacity onPress={finish} style={s.skipBtn}>
              <Text style={s.skipText}>Überspringen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goNext} style={s.nextBtn} activeOpacity={0.85}>
              <Text style={s.nextText}>Weiter</Text>
              <ArrowRight size={18} color="#0d1117" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={finish} style={[s.nextBtn, { flex: 1 }]} activeOpacity={0.85}>
            <Check size={18} color="#0d1117" style={{ marginRight: 6 }} />
            <Text style={s.nextText}>Loslegen</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export async function hasSeenOnboarding() {
  const val = await AsyncStorage.getItem(ONBOARDING_KEY);
  return val === "true";
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d1117",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#e6edf3",
    textAlign: "center",
    marginBottom: 16,
  },
  desc: {
    fontSize: 15,
    color: "#8b949e",
    textAlign: "center",
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 12,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  skipText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8b949e",
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5a623",
  },
  nextText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0d1117",
  },
});
