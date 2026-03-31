// app/index.tsx - Leitet sofort zu portal_select weiter
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    // Kleiner Delay damit Store geladen wird
    const timer = setTimeout(() => {
      router.replace("/portal_select");
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View style={{ flex:1, backgroundColor:"#0d1117", alignItems:"center", justifyContent:"center" }}>
      <ActivityIndicator color="#f5a623" size="large"/>
    </View>
  );
}
