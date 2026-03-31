// app/ki.tsx - KI Chat
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Linking, FlatList, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useLang, t } from "../i18n";
import { Brain, ArrowLeft, Globe, Send, Zap, Trash2 } from "lucide-react-native";
import { useProStore } from "../proStore";
import ProGate from "../components/ProGate";
import BottomNav from "../components/BottomNav";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", green:"#3fb950", red:"#f85149",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

const BACKEND = "https://materialcheck-backend2.onrender.com";

const OFFLINE: Record<string,string> = {
  kabel:"Kabel:\n• 3x1,5mm² → 16A\n• 3x2,5mm² → 20A\n• NYY-J → Erdverlegung",
  sicherung:"LS-Schalter:\n• Typ B: Wohnbau\n• Typ C: Motoren\n• FI 30mA: Personenschutz",
  rcd:"RCD:\n1. Geräte trennen\n2. Einzeln testen\n3. Kabel prüfen",
  ip:"IP-Schutz:\n• IP44: Bad\n• IP55: Außen\n• IP65: Staubdicht\n• IP67: Tauchen",
  default:"Ich helfe bei:\n• Kabel & Leitungen\n• VDE 0100\n• Querschnitt\n• IP-Schutz\n• Fehlersuche",
};

function offlineResp(msg:string):string {
  const l = msg.toLowerCase();
  if (l.match(/kabel|nym|aderleit/)) return OFFLINE.kabel;
  if (l.match(/rcd|fi|fehlerstrom/)) return OFFLINE.rcd;
  if (l.match(/sicherung|automat/)) return OFFLINE.sicherung;
  if (l.match(/ip.*(schutz|44|55|65)/)) return OFFLINE.ip;
  return OFFLINE.default;
}

interface Msg { id:string; role:"user"|"assistant"; content:string; offline?:boolean; }

export default function KIScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const T = t(lang);
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const isPro = useProStore(s => s.isPro);

  const QUICK = ["Kabel für 16A?","RCD löst aus?","NYM vs NYY?","IP44 oder IP65?","Querschnitt 2kW?","Wechselschaltung?"];
  const [messages, setMessages] = useState<Msg[]>([{ id:"0", role:"assistant", content:T.kiWelcome }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const invertedData = [...messages].reverse();

  const sendMessage = async (text?:string) => {
    const msg = (text??input).trim();
    if (!msg||loading) return;
    setInput("");
    const userMsg:Msg = { id:Date.now().toString(), role:"user", content:msg };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/chat`, {
        method:"POST", headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify({ message:msg, session_id:"default" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data.response??data.reply??data.message??"...";
      setMessages([...newMsgs, { id:Date.now().toString()+"r", role:"assistant", content:reply }]);
    } catch {
      setMessages([...newMsgs, { id:Date.now().toString()+"o", role:"assistant", content:offlineResp(msg), offline:true }]);
    } finally { setLoading(false); }
  };

  const renderMsg = ({ item }: { item:Msg }) => {
    const isUser = item.role==="user";
    return (
      <View style={isUser?s.userRow:s.botRow}>
        {!isUser&&<View style={s.avatar}><Text style={s.avatarText}>EG</Text></View>}
        <View style={[s.bubble, isUser?s.bubbleUser:s.bubbleBot]}>
          <Text style={s.bubbleText}>{item.content}</Text>
          {item.offline&&<Text style={s.offlineNote}>{T.offline}</Text>}
        </View>
      </View>
    );
  };

  if (!isPro) {
    return (
      <View style={{ flex:1, backgroundColor:C.bg }}>
        <ProGate visible={true} onClose={() => router.back()} feature="ki" />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={()=>router.back()}><ArrowLeft size={18} color={C.text} /></TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>{T.kiTitle}</Text>
          <Text style={s.headerSub}>{T.kiSub}</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={()=>Linking.openURL("https://elektrogenius.de")}><Globe size={16} color={C.text} /></TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={()=>setMessages([{ id:"0", role:"assistant", content:T.kiWelcome }])}><Trash2 size={15} color={C.text} /></TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==="ios"?"padding":"height"}>
        <FlatList
          data={invertedData} keyExtractor={item=>item.id} renderItem={renderMsg} inverted
          contentContainerStyle={{ padding:12, gap:10, paddingBottom:4 }}
          showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
          ListHeaderComponent={loading?(
            <View style={s.botRow}>
              <View style={s.avatar}><Text style={s.avatarText}>EG</Text></View>
              <View style={s.bubbleBot}><ActivityIndicator size="small" color={C.accent}/></View>
            </View>
          ):null}
        />
        <View style={s.quickWrap}>
          <FlatList
            data={QUICK} keyExtractor={q=>q} horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:12, gap:6, alignItems:"center" }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item })=>(
              <TouchableOpacity style={s.quickChip} onPress={()=>sendMessage(item)}>
                <Text style={s.quickChipText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        <View style={[s.inputRow, { paddingBottom: bottomPad + 4 }]}>
          <TextInput
            style={s.textInput} placeholder={T.askQuestion} placeholderTextColor={C.text3}
            value={input} onChangeText={setInput} onSubmitEditing={()=>sendMessage()}
            returnKeyType="send" blurOnSubmit={false}
          />
          <TouchableOpacity style={[s.sendBtn, (!input.trim()||loading)&&s.sendBtnOff]} onPress={()=>sendMessage()} disabled={!input.trim()||loading}>
            <Send size={15} color={"#000"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <BottomNav active="ki" />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:C.bg },
  header:{ flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:14, paddingVertical:12, borderBottomWidth:0.5, borderBottomColor:C.border },
  backBtn:{ width:32, height:32, backgroundColor:C.surface2, borderRadius:8, alignItems:"center", justifyContent:"center" },
  backBtnText:{ color:C.text, fontSize:16 },
  headerTitle:{ fontSize:15, fontWeight:"700", color:C.text },
  headerSub:{ fontSize:10, color:C.text2 },
  iconBtn:{ width:34, height:34, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:10, alignItems:"center", justifyContent:"center" },
  botRow:{ flexDirection:"row", alignItems:"flex-start", gap:7, marginBottom:8 },
  userRow:{ flexDirection:"row", justifyContent:"flex-end", marginBottom:8 },
  avatar:{ width:28, height:28, backgroundColor:"#1c2c55", borderWidth:1, borderColor:C.accent, borderRadius:8, alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 },
  avatarText:{ fontSize:8, fontWeight:"700", color:C.accent },
  bubble:{ maxWidth:"78%", padding:10, borderRadius:14 },
  bubbleBot:{ backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderBottomLeftRadius:4 },
  bubbleUser:{ backgroundColor:"rgba(245,166,35,0.17)", borderWidth:0.5, borderColor:"rgba(245,166,35,0.33)", borderBottomRightRadius:4 },
  bubbleText:{ fontSize:13, color:C.text, lineHeight:19 },
  offlineNote:{ fontSize:10, color:C.text3, marginTop:5, fontStyle:"italic" },
  quickWrap:{ height:44, borderTopWidth:0.5, borderTopColor:C.border },
  quickChip:{ height:30, paddingHorizontal:13, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:15, alignItems:"center", justifyContent:"center" },
  quickChipText:{ fontSize:11, color:C.text2 },
  inputRow:{ flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:12, paddingTop:10, borderTopWidth:0.5, borderTopColor:C.border },
  textInput:{ flex:1, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:22, paddingHorizontal:16, paddingVertical:10, fontSize:13, color:C.text },
  sendBtn:{ width:42, height:42, backgroundColor:C.accent, borderRadius:21, alignItems:"center", justifyContent:"center" },
  sendBtnOff:{ backgroundColor:C.surface3 },
  
});
