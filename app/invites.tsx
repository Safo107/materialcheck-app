// app/invites.tsx - Einladungen annehmen
import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTeamStore, Invitation } from "../teamStore";
import { Mail, RotateCcw, Warehouse, Key, User, Eye, Star, Info, CheckCircle, X, ArrowLeft } from "lucide-react-native";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

export default function InvitesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { invitations, checkInvitations, acceptInvite, rejectInvite, loading } = useTeamStore();
  const [myEmail, setMyEmail] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [accepting, setAccepting] = useState<string|null>(null);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmInvite, setConfirmInvite] = useState<Invitation|null>(null);
  const [successVisible, setSuccessVisible] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { loadAndCheck(); }, []);

  const loadAndCheck = async () => {
    const raw = await AsyncStorage.getItem("eg-profile-v1");
    const did = await AsyncStorage.getItem("eg-device-id");
    if (raw) {
      const p = JSON.parse(raw);
      setMyEmail(p.email ?? "");
      setDeviceId(did ?? "");
      if (p.email) await checkInvitations(p.email);
    }
  };

  const handleAccept = async (invite: Invitation) => {
    setAccepting(invite.inviteId);
    const ok = await acceptInvite(invite.inviteId, myEmail, deviceId);
    setAccepting(null);
    if (ok) {
      setSuccessMsg(`Du hast jetzt Zugriff auf "${invite.warehouseName}" bei ${invite.companyName}.`);
      setSuccessVisible(true);
    } else {
      setErrorMsg("Einladung konnte nicht angenommen werden.");
      setErrorVisible(true);
    }
  };

  const handleReject = (invite: Invitation) => {
    setConfirmInvite(invite);
    setConfirmVisible(true);
  };

  const confirmReject = async () => {
    if (confirmInvite) await rejectInvite(confirmInvite.inviteId);
    setConfirmVisible(false);
    setConfirmInvite(null);
  };

  const getRoleInfo = (role: string) => {
    switch(role) {
      case "admin":    return { label:"Admin",       Icon:Star, color:C.accent, note:"Du hast fast alle Rechte des Chefs" };
      case "readonly": return { label:"Nur lesen",   Icon:Eye,  color:C.text2,  note:"Du kannst nur lesen — keine Änderungen" };
      default:         return { label:"Mitarbeiter", Icon:User, color:C.green,  note:"Du kannst Bestand ändern und Materialien hinzufügen" };
    }
  };

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={C.text}/>
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
            <Mail size={14} color={C.accent}/>
            <Text style={s.headerTitle}>Einladungen</Text>
          </View>
          <Text style={s.headerSub}>{invitations.length} ausstehend</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={loadAndCheck}>
          <RotateCcw size={16} color={C.text2}/>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: bottomPad + 20 }}>
        {loading && invitations.length === 0 && (
          <View style={{ alignItems:"center", paddingVertical:40 }}>
            <ActivityIndicator color={C.accent} size="large"/>
            <Text style={{ color:C.text2, marginTop:12 }}>Suche nach Einladungen...</Text>
          </View>
        )}

        {!loading && invitations.length === 0 && (
          <View style={s.emptyState}>
            <View style={{width:72,height:72,borderRadius:20,backgroundColor:C.accentBg,alignItems:"center",justifyContent:"center",marginBottom:8}}>
              <Mail size={36} color={C.accent}/>
            </View>
            <Text style={s.emptyTitle}>Keine Einladungen</Text>
            <Text style={s.emptyText}>Wenn dich ein Chef einlädt, erscheint die Einladung hier.</Text>
            <TouchableOpacity style={s.refreshBtn2} onPress={loadAndCheck}>
              <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
                <RotateCcw size={12} color={C.accent}/>
                <Text style={{ color:C.accent, fontWeight:"600", fontSize:13 }}>Nochmal prüfen</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {invitations.map(invite => {
          const roleInfo = getRoleInfo(invite.role);
          return (
            <View key={invite.inviteId} style={s.inviteCard}>
              <View style={s.inviteHeader}>
                <View style={s.inviteBadge}>
                  <Mail size={20} color={C.accent}/>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.inviteCompany}>{invite.companyName}</Text>
                  <Text style={s.inviteFrom}>von {invite.inviterName || invite.inviterEmail}</Text>
                </View>
                <Text style={s.inviteDate}>{invite.createdAt?.slice(0,10)}</Text>
              </View>

              <View style={s.inviteBody}>
                <View style={s.inviteRow}>
                  <Warehouse size={14} color={C.text3}/>
                  <Text style={s.inviteLabel}>Lager:</Text>
                  <Text style={s.inviteValue}>{invite.warehouseName}</Text>
                </View>
                <View style={s.inviteRow}>
                  <Key size={14} color={C.text3}/>
                  <Text style={s.inviteLabel}>Rolle:</Text>
                  <View style={{flexDirection:"row",alignItems:"center",gap:4}}>
                    <roleInfo.Icon size={12} color={roleInfo.color}/>
                    <Text style={[s.inviteValue, { color: roleInfo.color }]}>{roleInfo.label}</Text>
                  </View>
                </View>
                <View style={{flexDirection:"row",alignItems:"flex-start",gap:6,marginTop:4}}>
                  <Info size={12} color={C.text3} style={{marginTop:1}}/>
                  <Text style={s.inviteNote}>{roleInfo.note}</Text>
                </View>
              </View>

              <View style={s.inviteActions}>
                <TouchableOpacity
                  style={[s.rejectBtn, { flex:1 }]}
                  onPress={() => handleReject(invite)}
                  disabled={accepting === invite.inviteId}>
                  <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
                    <X size={13} color={C.red}/>
                    <Text style={{ color:C.red, fontWeight:"600", fontSize:13 }}>Ablehnen</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.acceptBtn, { flex:2 }]}
                  onPress={() => handleAccept(invite)}
                  disabled={accepting === invite.inviteId}>
                  {accepting === invite.inviteId
                    ? <ActivityIndicator color="#000" size="small"/>
                    : <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
                        <CheckCircle size={13} color="#000"/>
                        <Text style={{ color:"#000", fontWeight:"700", fontSize:13 }}>Beitreten</Text>
                      </View>
                  }
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Ablehnen Confirm ── */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <Text style={s.dialogTitle}>Einladung ablehnen?</Text>
            <Text style={s.dialogText}>
              Einladung zu "{confirmInvite?.warehouseName}" bei {confirmInvite?.companyName} wirklich ablehnen?
            </Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2}]} onPress={()=>setConfirmVisible(false)}>
                <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:"rgba(248,81,73,0.2)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.4)"}]} onPress={confirmReject}>
                <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
                  <X size={13} color={C.red}/>
                  <Text style={{color:C.red,fontWeight:"700"}}>Ablehnen</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Erfolg ── */}
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:8}}>
              <CheckCircle size={20} color={C.green}/>
              <Text style={s.dialogTitle}>Beigetreten!</Text>
            </View>
            <Text style={s.dialogText}>{successMsg}</Text>
            <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.accent,width:"100%"}]} onPress={()=>{setSuccessVisible(false);router.back();}}>
              <Text style={{color:"#000",fontWeight:"700"}}>Super!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Fehler ── */}
      <Modal visible={errorVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:8}}>
              <X size={20} color={C.red}/>
              <Text style={s.dialogTitle}>Fehler</Text>
            </View>
            <Text style={s.dialogText}>{errorMsg}</Text>
            <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2,width:"100%"}]} onPress={()=>setErrorVisible(false)}>
              <Text style={{color:C.text2,fontWeight:"600"}}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:C.bg },
  header:{ flexDirection:"row", alignItems:"center", gap:10, paddingHorizontal:14, paddingVertical:12, borderBottomWidth:0.5, borderBottomColor:C.border },
  backBtn:{ width:32, height:32, backgroundColor:C.surface2, borderRadius:8, alignItems:"center", justifyContent:"center" },
  refreshBtn:{ width:34, height:34, backgroundColor:C.surface2, borderRadius:10, alignItems:"center", justifyContent:"center" },
  headerTitle:{ fontSize:16, fontWeight:"700", color:C.text },
  headerSub:{ fontSize:10, color:C.text2 },
  content:{ flex:1, padding:14 },
  inviteCard:{ backgroundColor:C.surface, borderWidth:0.5, borderColor:"rgba(245,166,35,0.3)", borderRadius:16, marginBottom:12, overflow:"hidden" },
  inviteHeader:{ flexDirection:"row", alignItems:"center", gap:12, padding:14, backgroundColor:"rgba(245,166,35,0.05)", borderBottomWidth:0.5, borderBottomColor:C.border2 },
  inviteBadge:{ width:42, height:42, backgroundColor:C.accentBg, borderRadius:10, alignItems:"center", justifyContent:"center" },
  inviteCompany:{ fontSize:15, fontWeight:"700", color:C.text },
  inviteFrom:{ fontSize:11, color:C.text2 },
  inviteDate:{ fontSize:10, color:C.text3 },
  inviteBody:{ padding:14, gap:8 },
  inviteRow:{ flexDirection:"row", alignItems:"center", gap:8 },
  inviteLabel:{ fontSize:12, color:C.text2, width:60 },
  inviteValue:{ fontSize:12, fontWeight:"600", color:C.text },
  inviteNote:{ flex:1, fontSize:11, color:C.text3, fontStyle:"italic" },
  inviteActions:{ flexDirection:"row", gap:8, padding:14, paddingTop:0 },
  rejectBtn:{ backgroundColor:"rgba(248,81,73,0.1)", borderWidth:0.5, borderColor:"rgba(248,81,73,0.3)", borderRadius:10, padding:12, alignItems:"center" },
  acceptBtn:{ backgroundColor:C.accent, borderRadius:10, padding:12, alignItems:"center" },
  emptyState:{ alignItems:"center", paddingVertical:60, gap:12 },
  emptyTitle:{ fontSize:18, fontWeight:"700", color:C.text },
  emptyText:{ fontSize:13, color:C.text2, textAlign:"center", lineHeight:20 },
  refreshBtn2:{ backgroundColor:C.accentBg, borderWidth:0.5, borderColor:"rgba(245,166,35,0.3)", borderRadius:20, paddingHorizontal:16, paddingVertical:8, marginTop:8 },
  overlayCenter:{ flex:1, backgroundColor:"rgba(0,0,0,0.7)", alignItems:"center", justifyContent:"center" },
  dialogBox:{ width:"80%", backgroundColor:C.surface, borderRadius:16, padding:20, borderWidth:0.5, borderColor:C.border2, alignItems:"center" },
  dialogTitle:{ fontSize:16, fontWeight:"700", color:C.text, marginBottom:8, textAlign:"center" },
  dialogText:{ fontSize:13, color:C.text2, marginBottom:20, lineHeight:20, textAlign:"center" },
  dialogBtns:{ flexDirection:"row", gap:10, width:"100%" },
  dialogBtn:{ flex:1, padding:12, borderRadius:10, alignItems:"center" },
});
