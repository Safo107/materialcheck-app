// app/team.tsx - Team verwalten
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTeamStore, TeamRole } from "../teamStore";
import { useStore } from "../store";
import { useProStore } from "../proStore";
import ProGate from "../components/ProGate";
import { useLang, t } from "../i18n";
import { Crown, Star, Eye, HardHat, ChevronLeft, Users, Mail, Trash2, Pencil, Warehouse, Info, LogOut } from "lucide-react-native";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7", purple:"#a371f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

// ── Web-kompatibler Alert ────────────────────────
function showAlert(title: string, message?: string, buttons?: { text: string; onPress?: () => void; style?: string }[]) {
  if (Platform.OS !== "web") {
    const { Alert } = require("react-native");
    Alert.alert(title, message, buttons as any);
    return;
  }
  if (!buttons || buttons.length <= 1) {
    window.alert(`${title}${message ? "\n\n" + message : ""}`);
    buttons?.[0]?.onPress?.();
    return;
  }
  const destructive = buttons.find(b => b.style === "destructive");
  const cancel = buttons.find(b => b.style === "cancel");
  if (destructive) {
    const confirmed = window.confirm(`${title}${message ? "\n\n" + message : ""}`);
    if (confirmed) destructive.onPress?.();
    else cancel?.onPress?.();
    return;
  }
  const msg = `${title}${message ? "\n\n" + message : ""}\n\n` +
    buttons.filter(b => b.style !== "cancel").map((b, i) => `${i + 1}. ${b.text}`).join("\n");
  const input = window.prompt(msg + "\n\nNummer eingeben:");
  const idx = parseInt(input ?? "") - 1;
  const nonCancel = buttons.filter(b => b.style !== "cancel");
  if (!isNaN(idx) && nonCancel[idx]) nonCancel[idx].onPress?.();
}

// ── Web-kompatibler Confirm Dialog ──────────────
type ConfirmButton = { text: string; onPress?: () => void; style?: string };

// ── Inline Confirm Modal (Web) ───────────────────
function ConfirmModal({ visible, title, message, buttons, onClose }: {
  visible: boolean;
  title: string;
  message?: string;
  buttons: ConfirmButton[];
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={cm.overlay}>
      <View style={cm.box}>
        <Text style={cm.title}>{title}</Text>
        {message ? <Text style={cm.msg}>{message}</Text> : null}
        <View style={cm.btnRow}>
          {buttons.map((b, i) => (
            <TouchableOpacity key={i}
              style={[cm.btn,
                b.style === "destructive" && cm.btnDestructive,
                b.style === "cancel" && cm.btnCancel,
              ]}
              onPress={() => { b.onPress?.(); onClose(); }}>
              <Text style={[cm.btnText,
                b.style === "destructive" && { color: C.red },
                b.style === "cancel" && { color: C.text2 },
              ]}>{b.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
const cm = StyleSheet.create({
  overlay: { position:"absolute", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.8)", alignItems:"center", justifyContent:"center", zIndex:999 },
  box: { backgroundColor:"#161b22", borderRadius:16, padding:24, width:"85%", maxWidth:340, borderWidth:0.5, borderColor:"rgba(255,255,255,0.14)" },
  title: { fontSize:16, fontWeight:"700", color:"#e6edf3", marginBottom:8, textAlign:"center" },
  msg: { fontSize:13, color:"#8b949e", marginBottom:20, textAlign:"center", lineHeight:20 },
  btnRow: { gap:8 },
  btn: { backgroundColor:"#21262d", borderRadius:10, padding:13, alignItems:"center", borderWidth:0.5, borderColor:"rgba(255,255,255,0.1)" },
  btnDestructive: { backgroundColor:"rgba(248,81,73,0.1)", borderColor:"rgba(248,81,73,0.3)" },
  btnCancel: { backgroundColor:"transparent", borderColor:"transparent" },
  btnText: { fontSize:14, fontWeight:"600", color:"#e6edf3" },
});

function getRoleColor(role: string) {
  switch(role) {
    case "owner": return { color:C.accent, bg:"rgba(245,166,35,0.15)", label:"Chef", Icon: Crown };
    case "admin": return { color:C.blue, bg:"rgba(79,163,247,0.15)", label:"Admin", Icon: Star };
    case "readonly": return { color:C.text2, bg:"rgba(139,148,158,0.15)", label:"Nur lesen", Icon: Eye };
    default: return { color:C.green, bg:"rgba(63,185,80,0.15)", label:"Mitarbeiter", Icon: HardHat };
  }
}

export default function TeamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { lang } = useLang();
  const T = t(lang);

  const isPro = useProStore(s => s.isPro);
  const company = useTeamStore(s => s?.company ?? null);
  const inviteMember = useTeamStore(s => s?.inviteMember);
  const changeRole = useTeamStore(s => s?.changeRole);
  const removeMember = useTeamStore(s => s?.removeMember);
  const loadCompany = useTeamStore(s => s?.loadCompany);
  const leaveCompany = useTeamStore(s => s?.leaveCompany);
  const resetTeamData = useTeamStore(s => s?.resetTeamData);

  const members = Array.isArray(company?.members) ? company!.members : [];
  const warehouses = Array.isArray(company?.warehouses) ? company!.warehouses : [];

  const [myEmail, setMyEmail] = useState("");
  const [myRole, setMyRole] = useState<TeamRole>("member");
  const [activeTab, setActiveTab] = useState<"members"|"invite">("members");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWarehouse, setInviteWarehouse] = useState("");
  const [inviteWarehouseName, setInviteWarehouseName] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"none"|"ok"|"error">("none");
  const [removing, setRemoving] = useState<string|null>(null);
  const [leaving, setLeaving] = useState(false);

  // Pro Gate State
  const [showProGate, setShowProGate] = useState(false);

  // Inline Confirm Modal State
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [confirmButtons, setConfirmButtons] = useState<ConfirmButton[]>([]);

  // Rolle ändern Modal
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [roleTargetEmail, setRoleTargetEmail] = useState("");
  const [roleCurrentRole, setRoleCurrentRole] = useState<TeamRole>("member");

  const openConfirm = (title: string, message: string, buttons: ConfirmButton[]) => {
    setConfirmTitle(title);
    setConfirmMsg(message);
    setConfirmButtons(buttons);
    setConfirmVisible(true);
  };

  useEffect(() => { loadMyInfo(); }, []);

  const loadMyInfo = async () => {
    try {
      const raw = await AsyncStorage.getItem("eg-profile-v1");
      if (raw) {
        const p = JSON.parse(raw);
        setMyEmail(p?.email ?? "");
        const member = members.find(m => m.email === p?.email);
        setMyRole(member?.role ?? "member");
      }
    } catch {}
  };

  const effectiveRole = members.find(m => m.email === myEmail)?.role ?? myRole;
  const isChef = effectiveRole === "owner" || effectiveRole === "admin";

  const handleLeaveCompany = () => {
    openConfirm(
      "Firma verlassen",
      "Möchtest du die Firma wirklich verlassen? Du verlierst alle Zugriffsrechte.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Verlassen", style: "destructive", onPress: async () => {
          setLeaving(true);
          try {
            const ok = await leaveCompany?.();
            if (ok) {
              const raw = await AsyncStorage.getItem("eg-profile-v1");
              if (raw) {
                const p = JSON.parse(raw);
                delete p.companyId;
                delete p.companyRole;
                await AsyncStorage.setItem("eg-profile-v1", JSON.stringify(p));
              }
              await resetTeamData?.();
              router.replace("/profile");
            } else {
              openConfirm("Fehler", "Bitte nochmal versuchen.", [{ text: "OK" }]);
            }
          } catch {
            openConfirm("Fehler", "Keine Verbindung.", [{ text: "OK" }]);
          }
          setLeaving(false);
        }},
      ]
    );
  };

  const handleInvite = async () => {
    if (!isPro && (company?.members?.length ?? 0) >= 3) { setShowProGate(true); return; }
    if (!inviteEmail.trim()) { setInviteMsg("Email eingeben"); setInviteStatus("error"); return; }
    if (!inviteWarehouse) { setInviteMsg("Lager auswählen"); setInviteStatus("error"); return; }
    setInviting(true); setInviteMsg("Wird gesendet..."); setInviteStatus("none");
    try {
      const result = await inviteMember?.(inviteEmail.trim(), inviteWarehouse, inviteWarehouseName, inviteRole);
      if (result?.ok) {
        setInviteMsg(`Einladung an ${inviteEmail} gesendet!`);
        setInviteStatus("ok");
        setInviteEmail(""); setInviteWarehouse(""); setInviteWarehouseName("");
      } else {
        setInviteMsg(`${result?.error || "Fehler. Hat der Kollege ein Konto?"}`);
        setInviteStatus("error");
      }
    } catch {
      setInviteMsg("Keine Verbindung");
      setInviteStatus("error");
    }
    setInviting(false);
  };

  const handleChangeRole = (targetEmail: string, currentRole: TeamRole) => {
    if (!isChef) return;
    setRoleTargetEmail(targetEmail);
    setRoleCurrentRole(currentRole);
    setRoleModalVisible(true);
  };

  const doChangeRole = async (newRole: TeamRole) => {
    setRoleModalVisible(false);
    const wh = warehouses[0];
    if (wh) {
      const ok = await changeRole?.(roleTargetEmail, wh.warehouseId, newRole);
      openConfirm(ok ? "Erfolg" : "Fehler", ok ? "Rolle geändert" : "Fehler beim Ändern", [{ text: "OK" }]);
    }
  };

  const handleRemove = (email: string, name: string) => {
    openConfirm(
      "Mitglied entfernen",
      `${name || email} wirklich entfernen?\n\nDer Nutzer verliert sofort alle Zugriffsrechte.`,
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Entfernen", style: "destructive", onPress: async () => {
          setRemoving(email);
          const ok = await removeMember?.(email);
          setRemoving(null);
          if (ok) {
            openConfirm("Entfernt", `${name || email} wurde entfernt.`, [{ text: "OK" }]);
            const raw = await AsyncStorage.getItem("eg-profile-v1");
            if (raw) {
              const p = JSON.parse(raw);
              if (p?.companyId) loadCompany?.(p.companyId, p.email);
            }
          } else {
            openConfirm("Fehler", "Bitte nochmal versuchen.", [{ text: "OK" }]);
          }
        }},
      ]
    );
  };

  if (!company) {
    return (
      <SafeAreaView style={s.container} edges={["top","left","right"]}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Users size={16} color={C.text}/><Text style={s.headerTitle}>Team</Text></View>
        </View>
        <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:30 }}>
          <Users size={48} color={C.text3} style={{marginBottom:16}} />
          <Text style={{ fontSize:18, fontWeight:"700", color:C.text, marginBottom:8 }}>Noch kein Team</Text>
          <Text style={{ fontSize:13, color:C.text2, textAlign:"center", marginBottom:20 }}>
            Erstelle zuerst eine Firma im Profil.
          </Text>
          <TouchableOpacity style={[s.btnPrimary, { backgroundColor:C.accent }]} onPress={() => router.push("/profile")}>
            <Text style={s.btnPrimaryText}>Zum Profil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>

      <ProGate visible={showProGate} onClose={() => setShowProGate(false)} feature="team" />

      {/* Inline Confirm Modal */}
      <ConfirmModal
        visible={confirmVisible}
        title={confirmTitle}
        message={confirmMsg}
        buttons={confirmButtons}
        onClose={() => setConfirmVisible(false)}
      />

      {/* Rolle ändern Modal */}
      {roleModalVisible && (
        <View style={cm.overlay}>
          <View style={cm.box}>
            <Text style={cm.title}>Rolle ändern</Text>
            <Text style={cm.msg}>{roleTargetEmail}</Text>
            <View style={cm.btnRow}>
              {([
                { role:"member" as TeamRole, label:"Mitarbeiter" },
                { role:"readonly" as TeamRole, label:"Nur lesen" },
                { role:"admin" as TeamRole, label:"Admin" },
              ]).filter(r => r.role !== roleCurrentRole).map(r => (
                <TouchableOpacity key={r.role} style={cm.btn} onPress={() => doChangeRole(r.role)}>
                  <Text style={cm.btnText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[cm.btn, cm.btnCancel]} onPress={() => setRoleModalVisible(false)}>
                <Text style={[cm.btnText, { color: C.text2 }]}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Users size={16} color={C.text}/><Text style={s.headerTitle}>{company.companyName}</Text></View>
          <Text style={s.headerSub}>
            {members.length} Mitglieder · {getRoleColor(effectiveRole).label}
          </Text>
        </View>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, activeTab==="members"&&s.tabActive]} onPress={()=>setActiveTab("members")}>
          <Text style={[s.tabText, activeTab==="members"&&s.tabTextActive]}>
            Mitglieder ({members.length})
          </Text>
        </TouchableOpacity>
        {isChef && (
          <TouchableOpacity style={[s.tab, activeTab==="invite"&&s.tabActive]} onPress={()=>setActiveTab("invite")}>
            <Text style={[s.tabText, activeTab==="invite"&&s.tabTextActive]}>Einladen</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad+20 }}>

        {/* MITGLIEDER */}
        {activeTab === "members" && <>
          <Text style={s.sectionLabel}>TEAM MITGLIEDER</Text>
          {members.map(member => {
            const rc = getRoleColor(member.role);
            return (
              <View key={member.email} style={s.memberCard}>
                <View style={s.memberAvatar}>
                  <Text style={s.memberAvatarText}>
                    {(member.name||member.email||"?").charAt(0).toUpperCase()}
                  </Text>
                  {member.isActive && <View style={s.onlineDot}/>}
                </View>
                <View style={{ flex:1 }}>
                  <Text style={s.memberName}>{member.name||member.email}</Text>
                  <Text style={s.memberEmail}>{member.email}</Text>
                  <Text style={s.memberJoined}>Seit: {member.joinedAt?.slice(0,10)??"–"}</Text>
                </View>
                <View style={{ alignItems:"flex-end", gap:6 }}>
                  <View style={[s.roleBadge, { backgroundColor: rc.bg }]}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:4}}><rc.Icon size={10} color={rc.color}/><Text style={[s.roleBadgeText, { color: rc.color }]}>{rc.label}</Text></View>
                  </View>
                  {isChef && member.email !== myEmail && member.role !== "owner" && (
                    removing === member.email ? (
                      <ActivityIndicator size="small" color={C.red}/>
                    ) : (
                      <View style={{ flexDirection:"row", gap:6 }}>
                        <TouchableOpacity style={s.actionSmall} onPress={() => handleChangeRole(member.email, member.role)}>
                          <View style={{flexDirection:"row",alignItems:"center",gap:4}}><Pencil size={11} color={C.blue}/><Text style={{ fontSize:11, color:C.blue }}>Rolle</Text></View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.actionSmall, { backgroundColor:"rgba(248,81,73,0.1)", borderColor:"rgba(248,81,73,0.3)" }]}
                          onPress={() => handleRemove(member.email, member.name)}>
                          <View style={{flexDirection:"row",alignItems:"center",gap:4}}><Trash2 size={11} color={C.red}/><Text style={{ fontSize:11, color:C.red }}>Raus</Text></View>
                        </TouchableOpacity>
                      </View>
                    )
                  )}
                </View>
              </View>
            );
          })}

          {/* FIRMA VERLASSEN — nur für nicht-Owner */}
          {effectiveRole !== "owner" && (
            <TouchableOpacity
              style={[s.memberCard, { borderColor:"rgba(248,81,73,0.3)", backgroundColor:"rgba(248,81,73,0.05)", marginTop:4 }]}
              onPress={handleLeaveCompany}
              disabled={leaving}>
              <LogOut size={20} color={C.red} />
              <View style={{ flex:1 }}>
                <Text style={[s.memberName, { color:C.red }]}>Firma verlassen</Text>
                <Text style={s.memberEmail}>Alle Zugriffsrechte werden entzogen</Text>
              </View>
              {leaving
                ? <ActivityIndicator size="small" color={C.red}/>
                : <ChevronLeft size={18} color={C.red} style={{ transform:[{rotate:"180deg"}] }} />
              }
            </TouchableOpacity>
          )}

          <Text style={[s.sectionLabel, { marginTop:16 }]}>GETEILTE LAGER</Text>
          {warehouses.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={{ color:C.text3, fontSize:13 }}>Noch keine geteilten Lager</Text>
            </View>
          ) : warehouses.map(wh => (
            <View key={wh.warehouseId} style={s.whCard}>
              <Warehouse size={22} color={C.accent} />
              <View style={{ flex:1 }}>
                <Text style={s.whName}>{wh.warehouseName}</Text>
                <Text style={s.whSub}>
                  {(wh.access??[]).length} Mitglieder · Sync: {wh.lastSync?.slice(0,10)??"–"}
                </Text>
              </View>
              <Text style={{ fontSize:11, color:C.green, fontWeight:"600" }}>
                {(wh.materials??[]).length} Artikel
              </Text>
            </View>
          ))}
        </>}

        {/* EINLADEN */}
        {activeTab === "invite" && isChef && <>
          <Text style={s.sectionLabel}>KOLLEGEN EINLADEN</Text>

          <View style={s.infoBox}>
            <Info size={16} color={C.accent} />
            <Text style={s.infoText}>
              Der Kollege muss ein Konto in der App haben. Er bekommt dann eine Einladung.
            </Text>
          </View>

          <Text style={s.formLabel}>EMAIL DES KOLLEGEN *</Text>
          <TextInput style={s.formInput} placeholder="z.B. max@firma.de"
            placeholderTextColor={C.text3} value={inviteEmail} onChangeText={setInviteEmail}
            keyboardType="email-address" autoCapitalize="none"/>

          <Text style={s.formLabel}>WELCHES LAGER? *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
            <View style={{ flexDirection:"row", gap:8 }}>
              {warehouses.length === 0 ? (
                <Text style={{ color:C.text3, fontSize:12, padding:8 }}>
                  Erstelle zuerst ein Lager im Firmen Portal
                </Text>
              ) : warehouses.map(wh => (
                <TouchableOpacity key={wh.warehouseId}
                  onPress={() => { setInviteWarehouse(wh.warehouseId); setInviteWarehouseName(wh.warehouseName); }}
                  style={[s.whChip, inviteWarehouse===wh.warehouseId&&s.whChipActive]}>
                  <Warehouse size={16} color={inviteWarehouse===wh.warehouseId?C.accent:C.text3} />
                  <Text style={{ fontSize:12, color:inviteWarehouse===wh.warehouseId?C.accent:C.text2 }}>
                    {wh.warehouseName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={s.formLabel}>ROLLE *</Text>
          <View style={{ flexDirection:"row", gap:8, marginBottom:14 }}>
            {([
              { role:"member" as TeamRole, label:"Mitarbeiter", color:C.green },
              { role:"readonly" as TeamRole, label:"Lesen", color:C.text2 },
              { role:"admin" as TeamRole, label:"Admin", color:C.accent },
            ]).map(r => (
              <TouchableOpacity key={r.role} onPress={() => setInviteRole(r.role)}
                style={[s.roleChip, inviteRole===r.role&&{ borderColor:r.color, backgroundColor:`${r.color}18` }]}>
                <Text style={{ fontSize:11, color:inviteRole===r.role?r.color:C.text2 }}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {inviteMsg ? (
            <View style={[s.msgBox, { backgroundColor:inviteStatus==="ok"?"rgba(63,185,80,0.1)":"rgba(248,81,73,0.1)", borderColor:inviteStatus==="ok"?"rgba(63,185,80,0.3)":"rgba(248,81,73,0.3)" }]}>
              <Text style={{ color:inviteStatus==="ok"?C.green:C.red, fontSize:13, fontWeight:"600" }}>{inviteMsg}</Text>
            </View>
          ):null}

          <TouchableOpacity style={[s.btnPrimary, { backgroundColor:C.accent }]} onPress={handleInvite} disabled={inviting}>
            {inviting ? <ActivityIndicator color="#000"/> : <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Mail size={14} color="#000"/><Text style={s.btnPrimaryText}>Einladung senden</Text></View>}
          </TouchableOpacity>
        </>}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:C.bg},
  header:{flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:14,paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:C.border},
  backBtn:{width:32,height:32,backgroundColor:C.surface2,borderRadius:8,alignItems:"center",justifyContent:"center"},
  headerTitle:{fontSize:16,fontWeight:"700",color:C.text},
  headerSub:{fontSize:10,color:C.text2},
  tabRow:{flexDirection:"row",borderBottomWidth:0.5,borderBottomColor:C.border,backgroundColor:C.surface},
  tab:{flex:1,paddingVertical:11,alignItems:"center"},
  tabActive:{borderBottomWidth:2,borderBottomColor:C.accent},
  tabText:{fontSize:12,fontWeight:"500",color:C.text3},
  tabTextActive:{color:C.accent,fontWeight:"700"},
  content:{flex:1,padding:14},
  sectionLabel:{fontSize:10,fontWeight:"700",color:C.text3,textTransform:"uppercase",letterSpacing:0.8,marginBottom:10},
  memberCard:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:14,marginBottom:8,flexDirection:"row",alignItems:"center",gap:12},
  memberAvatar:{width:44,height:44,backgroundColor:C.accentBg,borderRadius:22,alignItems:"center",justifyContent:"center",position:"relative"},
  memberAvatarText:{fontSize:18,fontWeight:"700",color:C.accent},
  onlineDot:{position:"absolute",bottom:0,right:0,width:12,height:12,backgroundColor:C.green,borderRadius:6,borderWidth:2,borderColor:C.surface},
  memberName:{fontSize:13,fontWeight:"600",color:C.text},
  memberEmail:{fontSize:11,color:C.text2},
  memberJoined:{fontSize:10,color:C.text3},
  roleBadge:{paddingHorizontal:8,paddingVertical:4,borderRadius:20},
  roleBadgeText:{fontSize:11,fontWeight:"700"},
  actionSmall:{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,paddingHorizontal:8,paddingVertical:4,borderRadius:8},
  whCard:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:14,marginBottom:8},
  whName:{fontSize:13,fontWeight:"600",color:C.text},
  whSub:{fontSize:11,color:C.text2},
  emptyCard:{backgroundColor:C.surface,borderRadius:12,padding:20,alignItems:"center"},
  infoBox:{flexDirection:"row",alignItems:"flex-start",gap:8,backgroundColor:C.accentBg,borderWidth:0.5,borderColor:"rgba(245,166,35,0.25)",borderRadius:10,padding:12,marginBottom:16},
  infoText:{flex:1,fontSize:12,color:C.text2,lineHeight:18},
  formLabel:{fontSize:10,fontWeight:"600",color:C.text3,textTransform:"uppercase",letterSpacing:0.7,marginBottom:6},
  formInput:{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8,padding:11,fontSize:13,color:C.text,marginBottom:14},
  whChip:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:12,paddingVertical:8,backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:10},
  whChipActive:{borderColor:C.accent,backgroundColor:C.accentBg},
  roleChip:{flex:1,alignItems:"center",paddingVertical:8,backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8},
  msgBox:{borderWidth:0.5,borderRadius:10,padding:12,marginBottom:12},
  btnPrimary:{borderRadius:8,padding:13,alignItems:"center",marginTop:4},
  btnPrimaryText:{color:"#000",fontWeight:"700",fontSize:14},
});
