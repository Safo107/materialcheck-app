// app/company/index.tsx - Firmen Portal
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTeamStore } from "../../teamStore";
import { useLang, t } from "../../i18n";
import {
  Building2, Warehouse, Package, Users, Crown, Star, Eye, User,
  ChevronLeft, Plus, Trash2, BarChart3, ShoppingCart, Brain,
  AlertTriangle, Check, CheckCircle, X, Bell, BellOff, LogOut,
  Mail, Truck, Zap, Wrench, Home, Box, Factory, Search,
} from "lucide-react-native";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7", purple:"#a371f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

// ── Lager-Icon Auswahl ────────────────────────────────────────────────────────
const WH_ICON_OPTIONS = [
  { key:"warehouse", Icon:Warehouse },
  { key:"truck",     Icon:Truck },
  { key:"building",  Icon:Building2 },
  { key:"zap",       Icon:Zap },
  { key:"wrench",    Icon:Wrench },
  { key:"package",   Icon:Package },
  { key:"home",      Icon:Home },
  { key:"box",       Icon:Box },
  { key:"factory",   Icon:Factory },
];

function WhIcon({ iconKey, size, color }: { iconKey:string; size:number; color:string }) {
  const opt = WH_ICON_OPTIONS.find(o => o.key === iconKey);
  const Icon = opt?.Icon ?? Warehouse;
  return <Icon size={size} color={color} />;
}

function getRoleLabel(role: string) {
  switch(role) {
    case "owner": return "Chef";
    case "admin": return "Admin";
    case "readonly": return "Nur lesen";
    default: return "Mitarbeiter";
  }
}

export default function CompanyIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { lang } = useLang();
  const T = t(lang);

  const company        = useTeamStore(s => s?.company ?? null);
  const rawInvitations = useTeamStore(s => s?.invitations);
  const invitations    = Array.isArray(rawInvitations) ? rawInvitations : [];
  const checkInvitations = useTeamStore(s => s?.checkInvitations);
  const loadCompany      = useTeamStore(s => s?.loadCompany);
  const createWarehouse  = useTeamStore(s => s?.createWarehouse);
  const removeMember     = useTeamStore(s => s?.removeMember);
  const leaveCompany     = useTeamStore(s => s?.leaveCompany);
  const deleteWarehouse  = useTeamStore(s => s?.deleteWarehouse);

  const warehouses = Array.isArray(company?.warehouses) ? company!.warehouses : [];
  const members    = Array.isArray(company?.members)    ? company!.members    : [];

  const [myEmail,   setMyEmail]   = useState("");
  const [myRole,    setMyRole]    = useState("");
  const [search,    setSearch]    = useState("");
  const [activeTab, setActiveTab] = useState<"warehouses"|"members"|"stats"|"shopping"|"ki">("warehouses");
  const [showAddWh, setShowAddWh] = useState(false);
  const [newWhName, setNewWhName] = useState("");
  const [newWhIcon, setNewWhIcon] = useState("warehouse");
  const [creating,  setCreating]  = useState(false);
  const [removing,  setRemoving]  = useState<string|null>(null);
  const [notifMuted,setNotifMuted]= useState(false);

  // ── Confirm Modals ─────────────────────────────────────
  const [leaveModal,     setLeaveModal]     = useState(false);
  const [deleteWhModal,  setDeleteWhModal]  = useState(false);
  const [deleteWhTarget, setDeleteWhTarget] = useState<{id:string;name:string}|null>(null);
  const [removeModal,    setRemoveModal]    = useState(false);
  const [removeTarget,   setRemoveTarget]   = useState<{email:string;name:string}|null>(null);

  // ── Einkauf: abhaken ───────────────────────────────────
  const [checkedKeys,    setCheckedKeys]    = useState<Set<string>>(new Set());
  const [buyModal,       setBuyModal]       = useState(false);
  const [buyPending,     setBuyPending]     = useState<{whId:string;matName:string;qty:number;min:number;unit:string;price:number;key:string}|null>(null);

  const effectiveRole = members.find(m => m.email === myEmail)?.role ?? myRole;
  const isChef = effectiveRole === "owner" || effectiveRole === "admin";

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const raw = await AsyncStorage.getItem("eg-profile-v1");
      if (!raw) return;
      const p = JSON.parse(raw);
      setMyEmail(p?.email ?? "");
      setMyRole(p?.companyRole ?? "");
      if (p?.email) {
        checkInvitations?.(p.email);
        if (p?.companyId) loadCompany?.(p.companyId, p.email);
      }
    } catch {}
  };

  const handleDeleteWarehouse = (warehouseId: string, warehouseName: string) => {
    setDeleteWhTarget({ id: warehouseId, name: warehouseName });
    setDeleteWhModal(true);
  };

  const confirmDeleteWarehouse = async () => {
    if (!deleteWhTarget) return;
    const ok = await deleteWarehouse?.(deleteWhTarget.id);
    setDeleteWhModal(false);
    setDeleteWhTarget(null);
    if (!ok) {/* Fehler ignorieren */ }
  };

  const handleCreateWarehouse = async () => {
    if (!newWhName.trim()) return;
    setCreating(true);
    const id = await createWarehouse?.(newWhName.trim(), newWhIcon);
    setCreating(false);
    if (id) { setShowAddWh(false); setNewWhName(""); setNewWhIcon("warehouse"); }
  };

  const handleRemoveMember = (email: string, name: string) => {
    setRemoveTarget({ email, name });
    setRemoveModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!removeTarget) return;
    setRemoving(removeTarget.email);
    await removeMember?.(removeTarget.email);
    setRemoving(null);
    setRemoveModal(false);
    setRemoveTarget(null);
  };

  const confirmLeave = async () => {
    setLeaveModal(false);
    await leaveCompany?.();
    await AsyncStorage.removeItem("eg-last-portal");
    router.replace("/portal_select");
  };

  const filteredWh = search.trim()
    ? warehouses.filter(w => w.warehouseName?.toLowerCase().includes(search.toLowerCase()))
    : warehouses;

  const allMaterials = warehouses.flatMap(w => Array.isArray(w.materials) ? w.materials : []);
  const totalValue   = allMaterials.reduce((s,m) => s+(m?.qty||0)*(m?.price||0), 0);
  const lowCount     = allMaterials.filter(m => (m?.qty||0) < (m?.min||0) && !checkedKeys.has(`${m?.warehouseId}-${m?.id}`)).length;
  const allTasks     = warehouses.flatMap(w => Array.isArray(w.tasks) ? w.tasks : []);
  const openTasks    = allTasks.filter(t => t?.status !== "done").length;

  // Alle fehlenden Materialien für Einkauf
  const allLowMats = warehouses.flatMap(wh => {
    const mats = Array.isArray(wh.materials) ? wh.materials : [];
    return mats
      .filter((m:any) => (m?.qty||0) < (m?.min||0))
      .map((m:any) => ({
        ...m,
        whName: wh.warehouseName,
        whId:   wh.warehouseId,
        key:    `${wh.warehouseId}-${m?.id}`,
      }));
  });
  const totalShoppingCost = allLowMats
    .filter(m => !checkedKeys.has(m.key))
    .reduce((s,m) => s + Math.max(0, (m.min||0)-(m.qty||0)) * (m.price||0), 0);

  const handleBuyPress = (m: any) => {
    setBuyPending({ whId:m.whId, matName:m.name, qty:m.qty||0, min:m.min||0, unit:m.unit||"Stk", price:m.price||0, key:m.key });
    setBuyModal(true);
  };

  const confirmBuy = () => {
    if (!buyPending) return;
    setCheckedKeys(prev => new Set([...prev, buyPending.key]));
    setBuyModal(false);
    setBuyPending(null);
  };

  // ── Kein Unternehmen ─────────────────────────────────────────────────────
  if (!company) {
    return (
      <SafeAreaView style={s.container} edges={["top","left","right"]}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={async()=>{ await AsyncStorage.removeItem("eg-last-portal"); router.replace("/portal_select"); }}>
            <ChevronLeft size={20} color={C.text} />
          </TouchableOpacity>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
            <Building2 size={16} color={C.accent}/>
            <Text style={s.headerTitle}>Firmen Portal</Text>
          </View>
        </View>
        <View style={{flex:1,alignItems:"center",justifyContent:"center",padding:30}}>
          <View style={{width:80,height:80,borderRadius:20,backgroundColor:"rgba(245,166,35,0.1)",alignItems:"center",justifyContent:"center",marginBottom:16}}>
            <Building2 size={40} color={C.accent}/>
          </View>
          <Text style={{fontSize:20,fontWeight:"700",color:C.text,marginBottom:10}}>Noch keine Firma</Text>
          <Text style={{fontSize:13,color:C.text2,textAlign:"center",marginBottom:24,lineHeight:20}}>
            Erstelle eine Firma im Profil um dein Team einzuladen, oder warte auf eine Einladung.
          </Text>
          <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.accent}]} onPress={()=>router.push("/profile")}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
              <Building2 size={16} color="#000"/>
              <Text style={{color:"#000",fontWeight:"700",fontSize:15}}>Firma erstellen</Text>
            </View>
          </TouchableOpacity>
          {invitations.length > 0 && (
            <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.surface2,marginTop:10}]} onPress={()=>router.push("/invites")}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                <Mail size={14} color={C.accent}/>
                <Text style={{color:C.accent,fontWeight:"700"}}>{invitations.length} Einladung{invitations.length>1?"en":""}</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.surface2,marginTop:10}]} onPress={()=>router.replace("/portal_select")}>
            <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
              <ChevronLeft size={14} color={C.text2}/>
              <Text style={{color:C.text2,fontWeight:"600",fontSize:13}}>Zurück</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={async()=>{ await AsyncStorage.removeItem("eg-last-portal"); router.replace("/portal_select"); }}>
          <ChevronLeft size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{flex:1}}>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
            <Building2 size={14} color={C.accent}/>
            <Text style={s.headerTitle} numberOfLines={1}>{company.companyName}</Text>
          </View>
          <Text style={s.headerSub}>{getRoleLabel(myRole)} · {members.length} Mitglieder</Text>
        </View>
        <View style={{flexDirection:"row",gap:6}}>
          {invitations.length > 0 && (
            <TouchableOpacity style={s.badgeBtn} onPress={()=>router.push("/invites")}>
              <Mail size={16} color={C.red}/>
              <View style={s.redDot}><Text style={{color:"#fff",fontSize:8,fontWeight:"700"}}>{invitations.length}</Text></View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.iconBtn} onPress={()=>router.push("/profile")}>
            <User size={16} color={C.text2}/>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── BOTTOM NAV ── */}
      <View style={[s.bottomNav,{paddingBottom:bottomPad+6}]}>
        {([
          {key:"warehouses", Icon:Warehouse,    label:"Lager"},
          {key:"members",    Icon:Users,         label:"Team"},
          ...(isChef?[
            {key:"stats",    Icon:BarChart3,     label:"Statistik"},
            {key:"shopping", Icon:ShoppingCart,  label:"Einkauf"},
          ]:[]),
          {key:"ki",         Icon:Brain,         label:"KI"},
        ] as any[]).map((nav:any)=>(
          <TouchableOpacity key={nav.key} style={s.navItem} onPress={()=>setActiveTab(nav.key)}>
            <View style={{position:"relative"}}>
              <nav.Icon size={20} color={activeTab===nav.key?C.accent:C.text3}/>
              {nav.key==="shopping" && lowCount>0 && (
                <View style={s.navBadge}><Text style={{color:"#fff",fontSize:8,fontWeight:"700"}}>{lowCount>9?"9+":lowCount}</Text></View>
              )}
            </View>
            <View style={[s.navDot,{opacity:activeTab===nav.key?1:0}]}/>
            <Text style={[s.navLabel,activeTab===nav.key&&{color:C.accent}]}>{nav.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={s.navItem} onPress={()=>router.push("/profile")}>
          <User size={20} color={C.text3}/>
          <View style={s.navDot}/>
          <Text style={s.navLabel}>Profil</Text>
        </TouchableOpacity>
      </View>

      {/* ── LAGER ── */}
      {activeTab === "warehouses" && (
        <ScrollView style={s.content} contentContainerStyle={{paddingBottom:bottomPad+80}}>
          <View style={s.searchWrap}>
            <Search size={14} color={C.text3} style={{marginRight:6}}/>
            <TextInput style={s.searchInput} placeholder="Lager suchen..." placeholderTextColor={C.text3} value={search} onChangeText={setSearch}/>
          </View>

          <View style={s.companyCard}>
            <View style={s.companyCardRow}>
              <View style={s.companyAvatar}><Building2 size={22} color={C.accent}/></View>
              <View style={{flex:1}}>
                <Text style={s.companyName}>{company.companyName}</Text>
                <Text style={s.companySub}>{members.length} Mitglieder · {warehouses.length} Lager</Text>
              </View>
              {isChef && (
                <TouchableOpacity style={s.teamBtn} onPress={()=>router.push("/team")}>
                  <View style={{flexDirection:"row",alignItems:"center",gap:4}}>
                    <Users size={11} color={C.accent}/>
                    <Text style={{fontSize:11,color:C.accent,fontWeight:"600"}}>Team</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
            <View style={s.membersRow}>
              {members.slice(0,6).map(m=>(
                <View key={m.email} style={s.memberAvatar}>
                  <Text style={s.memberAvatarText}>{(m.name||m.email||"?").charAt(0).toUpperCase()}</Text>
                </View>
              ))}
              {members.length>6&&<Text style={{color:C.text3,fontSize:11}}>+{members.length-6}</Text>}
            </View>
          </View>

          <View style={s.sectionRow}>
            <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
              <Warehouse size={14} color={C.text3}/>
              <Text style={s.sectionLabel}>GETEILTE LAGER</Text>
            </View>
            {isChef && (
              <TouchableOpacity onPress={()=>setShowAddWh(true)}>
                <Text style={{color:C.accent,fontSize:12,fontWeight:"600"}}>+ Lager</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredWh.length === 0 ? (
            <View style={s.emptyState}>
              <Warehouse size={42} color={C.text3}/>
              <Text style={s.emptyTitle}>{isChef?"Noch keine Lager":"Noch nicht eingeladen"}</Text>
              <Text style={s.emptyText}>{isChef?"Tippe auf + Lager":"Warte auf Einladung deines Chefs"}</Text>
              {isChef && (
                <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.accent,marginTop:16}]} onPress={()=>setShowAddWh(true)}>
                  <View style={{flexDirection:"row",alignItems:"center",gap:6}}>
                    <Warehouse size={14} color="#000"/>
                    <Text style={{color:"#000",fontWeight:"700",fontSize:13}}>Erstes Lager erstellen</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          ) : filteredWh.map(wh=>{
            const mats    = Array.isArray(wh.materials)?wh.materials:[];
            const whTasks = Array.isArray(wh.tasks)?wh.tasks:[];
            const lowMat  = mats.filter((m:any)=>(m?.qty||0)<(m?.min||0)).length;
            const openTask= whTasks.filter((t:any)=>t?.status!=="done").length;
            return (
              <TouchableOpacity key={wh.warehouseId} style={s.whCard}
                onPress={()=>router.push({pathname:"/warehouse",params:{warehouseId:wh.warehouseId,warehouseName:wh.warehouseName}})}
                onLongPress={()=>isChef && handleDeleteWarehouse(wh.warehouseId, wh.warehouseName)}
                delayLongPress={600}>
                <View style={s.whIcon}>
                  <WhIcon iconKey={wh.warehouseIcon||wh.icon||"warehouse"} size={26} color={C.accent}/>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.whName}>{wh.warehouseName}</Text>
                  <Text style={s.whSub}>{mats.length} Materialien · {(wh.access||[]).length} Mitglieder</Text>
                  <Text style={s.whSync}>Sync: {wh.lastSync?.slice(0,10)||"–"}{wh.lastSyncBy?` · ${wh.lastSyncBy}`:""}</Text>
                </View>
                <View style={{alignItems:"flex-end",gap:5}}>
                  <View style={[s.rolePill,{backgroundColor:wh.userRole==="readonly"?"rgba(139,148,158,0.15)":C.accentBg}]}>
                    <Text style={{fontSize:10,color:wh.userRole==="readonly"?C.text3:C.accent,fontWeight:"600"}}>
                      {wh.userRole==="readonly"?"Lesen":"Bearbeiten"}
                    </Text>
                  </View>
                  {lowMat>0&&(
                    <View style={s.alertPill}>
                      <AlertTriangle size={10} color={C.red}/>
                      <Text style={{fontSize:10,color:C.red,fontWeight:"700"}}> {lowMat}</Text>
                    </View>
                  )}
                  {openTask>0&&(
                    <View style={[s.alertPill,{backgroundColor:"rgba(245,166,35,0.12)"}]}>
                      <Package size={10} color={C.accent}/>
                      <Text style={{fontSize:10,color:C.accent,fontWeight:"700"}}> {openTask}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── TEAM ── */}
      {activeTab === "members" && (
        <ScrollView style={s.content} contentContainerStyle={{paddingBottom:bottomPad+80}}>
          <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:10}}>
            <Users size={14} color={C.text3}/>
            <Text style={s.sectionLabel}>TEAM ({members.length})</Text>
          </View>
          {members.map(member=>{
            const rc = {
              owner:    {color:C.accent,bg:"rgba(245,166,35,0.15)",  label:"Chef",       Icon:Crown},
              admin:    {color:C.blue,  bg:"rgba(79,163,247,0.15)",   label:"Admin",      Icon:Star},
              readonly: {color:C.text2, bg:"rgba(139,148,158,0.15)",  label:"Lesen",      Icon:Eye},
              member:   {color:C.green, bg:"rgba(63,185,80,0.15)",    label:"Mitarbeiter",Icon:User},
            }[member.role] || {color:C.green,bg:"rgba(63,185,80,0.15)",label:"Mitarbeiter",Icon:User};
            return (
              <View key={member.email} style={s.memberCard2}>
                <View style={s.memberAvatar2}>
                  <Text style={s.memberAvatarText2}>{(member.name||member.email||"?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={s.memberName2}>{member.name||member.email}</Text>
                  <Text style={s.memberEmail2}>{member.email}</Text>
                  <View style={[s.roleBadge2,{backgroundColor:rc.bg}]}>
                    <rc.Icon size={10} color={rc.color}/>
                    <Text style={[s.roleBadgeText2,{color:rc.color,marginLeft:4}]}>{rc.label}</Text>
                  </View>
                </View>
                {isChef && member.email!==myEmail && member.role!=="owner" && (
                  removing===member.email
                    ? <ActivityIndicator color={C.red} size="small"/>
                    : <TouchableOpacity style={s.removeBtn} onPress={()=>handleRemoveMember(member.email,member.name)}>
                        <View style={{flexDirection:"row",alignItems:"center",gap:4}}>
                          <Trash2 size={12} color={C.red}/>
                          <Text style={{fontSize:12,color:C.red,fontWeight:"600"}}>Entfernen</Text>
                        </View>
                      </TouchableOpacity>
                )}
              </View>
            );
          })}
          {isChef && (
            <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.accentBg,borderWidth:0.5,borderColor:"rgba(245,166,35,0.3)",marginTop:12}]}
              onPress={()=>router.push("/team")}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                <Mail size={14} color={C.accent}/>
                <Text style={{color:C.accent,fontWeight:"700",fontSize:13}}>Mitarbeiter einladen</Text>
              </View>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.bigBtn,{backgroundColor:notifMuted?"rgba(248,81,73,0.1)":"rgba(139,148,158,0.1)",borderWidth:0.5,borderColor:notifMuted?"rgba(248,81,73,0.3)":"rgba(139,148,158,0.3)",marginTop:8}]}
            onPress={()=>setNotifMuted(!notifMuted)}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
              {notifMuted ? <BellOff size={14} color={C.red}/> : <Bell size={14} color={C.text2}/>}
              <Text style={{color:notifMuted?C.red:C.text2,fontWeight:"600",fontSize:13}}>
                {notifMuted?"Benachrichtigungen stummgeschaltet":"Benachrichtigungen aktiv"}
              </Text>
            </View>
          </TouchableOpacity>
          {myRole !== "owner" && (
            <TouchableOpacity
              style={[s.bigBtn,{backgroundColor:"rgba(248,81,73,0.08)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)",marginTop:8}]}
              onPress={()=>setLeaveModal(true)}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                <LogOut size={14} color={C.red}/>
                <Text style={{color:C.red,fontWeight:"700",fontSize:13}}>Firma verlassen</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── STATISTIK ── */}
      {activeTab === "stats" && isChef && (
        <ScrollView style={s.content} contentContainerStyle={{paddingBottom:bottomPad+80}}>
          <View style={s.statsGrid}>
            {[
              {Icon:Warehouse,   label:"Lager",     value:String(warehouses.length),    color:C.accent},
              {Icon:Package,     label:"Materialien",value:String(allMaterials.length),  color:C.green},
              {Icon:CheckCircle, label:"Lagerwert",  value:`€${totalValue.toFixed(0)}`,  color:C.green},
              {Icon:AlertTriangle,label:"Niedrig",   value:String(lowCount),             color:lowCount>0?C.red:C.green},
              {Icon:ShoppingCart, label:"Aufgaben",  value:String(openTasks),            color:C.accent},
              {Icon:Users,        label:"Team",      value:String(members.length),       color:C.blue},
            ].map((c,i)=>(
              <View key={i} style={s.statCard}>
                <c.Icon size={20} color={c.color} style={{marginBottom:6}}/>
                <Text style={{fontSize:10,color:C.text3,marginBottom:3}}>{c.label}</Text>
                <Text style={{fontSize:20,fontWeight:"700",color:c.color}}>{c.value}</Text>
              </View>
            ))}
          </View>
          <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:4}}>
            <Warehouse size={14} color={C.text3}/>
            <Text style={s.sectionLabel}>LAGER ÜBERSICHT</Text>
          </View>
          {warehouses.map(wh=>{
            const mats=Array.isArray(wh.materials)?wh.materials:[];
            const hasLow = mats.filter((m:any)=>(m?.qty||0)<(m?.min||0)).length > 0;
            return (
              <View key={wh.warehouseId} style={s.statsWhCard}>
                <WhIcon iconKey={wh.warehouseIcon||wh.icon||"warehouse"} size={20} color={C.accent}/>
                <View style={{flex:1,marginLeft:12}}>
                  <Text style={{fontSize:13,fontWeight:"700",color:C.text}}>{wh.warehouseName}</Text>
                  <Text style={{fontSize:11,color:C.text2}}>{mats.length} Mat. · €{mats.reduce((s:number,m:any)=>s+(m?.qty||0)*(m?.price||0),0).toFixed(0)}</Text>
                </View>
                <View style={{flexDirection:"row",alignItems:"center",gap:4}}>
                  {hasLow
                    ? <><AlertTriangle size={12} color={C.red}/><Text style={{fontSize:11,fontWeight:"600",color:C.red}}>Niedrig</Text></>
                    : <><CheckCircle size={12} color={C.green}/><Text style={{fontSize:11,fontWeight:"600",color:C.green}}>OK</Text></>
                  }
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── EINKAUF ── */}
      {activeTab === "shopping" && isChef && (
        <ScrollView style={s.content} contentContainerStyle={{paddingBottom:bottomPad+80}}>
          {/* Zusammenfassung */}
          {allLowMats.length > 0 && (
            <View style={s.summaryRow}>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Gesamt</Text>
                <Text style={[s.summaryValue,{color:C.accent}]}>{allLowMats.length}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Leer</Text>
                <Text style={[s.summaryValue,{color:C.red}]}>{allLowMats.filter(m=>(m.qty||0)===0).length}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Gekauft</Text>
                <Text style={[s.summaryValue,{color:C.green}]}>{checkedKeys.size}</Text>
              </View>
              {totalShoppingCost > 0 && (
                <View style={s.summaryCard}>
                  <Text style={s.summaryLabel}>~Kosten</Text>
                  <Text style={[s.summaryValue,{color:C.green,fontSize:14}]}>€{totalShoppingCost.toFixed(0)}</Text>
                </View>
              )}
            </View>
          )}

          {allLowMats.length === 0 ? (
            <View style={s.emptyState}>
              <CheckCircle size={48} color={C.green}/>
              <Text style={s.emptyTitle}>Alles gut!</Text>
              <Text style={s.emptyText}>Alle Lager sind ausreichend.</Text>
            </View>
          ) : warehouses.map(wh=>{
            const mats = Array.isArray(wh.materials)?wh.materials:[];
            const lowMats = mats.filter((m:any)=>(m?.qty||0)<(m?.min||0));
            if (lowMats.length===0) return null;
            return (
              <View key={wh.warehouseId} style={{marginBottom:8}}>
                <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:6,marginTop:4}}>
                  <WhIcon iconKey={wh.warehouseIcon||wh.icon||"warehouse"} size={14} color={C.accent}/>
                  <Text style={s.whSectionHeader}>{wh.warehouseName}</Text>
                </View>
                {lowMats.filter((m:any) => !checkedKeys.has(`${wh.warehouseId}-${m?.id}`)).map((m:any,i:number)=>{
                  const key = `${wh.warehouseId}-${m?.id}`;
                  const needed = Math.max(0,(m.min||0)-(m.qty||0));
                  const cost = needed * (m.price||0);
                  const isEmpty = (m.qty||0)===0;
                  return (
                    <TouchableOpacity key={i} style={s.shoppingItem}
                      onPress={()=>handleBuyPress({...m,whId:wh.warehouseId,whName:wh.warehouseName,key})}>
                      <View style={s.itemCheckbox}>
                        <View style={s.checkboxEmpty}/>
                      </View>
                      <View style={[s.itemCatIcon,{backgroundColor:isEmpty?"rgba(248,81,73,0.12)":"rgba(245,166,35,0.12)"}]}>
                        <Package size={16} color={isEmpty?C.red:C.accent}/>
                      </View>
                      <View style={{flex:1}}>
                        <Text style={{fontSize:13,fontWeight:"600",color:C.text}}>{m?.name}</Text>
                        <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
                          <Text style={{fontSize:11,color:C.text2}}>Bestand: {m?.qty} {m?.unit}</Text>
                          <Text style={{fontSize:11,color:C.text3}}>·</Text>
                          <Text style={{fontSize:11,color:C.accent,fontWeight:"600"}}>Bestellen: {needed} {m?.unit}</Text>
                          {cost > 0 && <>
                            <Text style={{fontSize:11,color:C.text3}}>·</Text>
                            <Text style={{fontSize:11,color:C.green}}>€{cost.toFixed(2)}</Text>
                          </>}
                        </View>
                      </View>
                      <View style={[s.statusBadge,{backgroundColor:isEmpty?"rgba(248,81,73,0.15)":"rgba(245,166,35,0.15)"}]}>
                        <Text style={{fontSize:10,fontWeight:"600",color:isEmpty?C.red:C.accent}}>{isEmpty?"Leer":"Niedrig"}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}

          {checkedKeys.size > 0 && (
            <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,marginTop:8}]}
              onPress={()=>setCheckedKeys(new Set())}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                <X size={14} color={C.text2}/>
                <Text style={{color:C.text2,fontWeight:"600",fontSize:13}}>Liste zurücksetzen</Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* ── KI ── */}
      {activeTab === "ki" && (
        <View style={{flex:1,alignItems:"center",justifyContent:"center",padding:20}}>
          <View style={{width:72,height:72,borderRadius:20,backgroundColor:"rgba(163,113,247,0.1)",alignItems:"center",justifyContent:"center",marginBottom:16}}>
            <Brain size={36} color={C.purple}/>
          </View>
          <Text style={{fontSize:18,fontWeight:"700",color:C.text,marginBottom:8}}>KI-Assistent</Text>
          <Text style={{fontSize:13,color:C.text2,textAlign:"center",marginBottom:20}}>Frage den KI-Assistenten zu Elektrotechnik.</Text>
          <TouchableOpacity style={[s.bigBtn,{backgroundColor:C.accent,paddingHorizontal:28}]} onPress={()=>router.push("/ki")}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
              <Brain size={16} color="#000"/>
              <Text style={{color:"#000",fontWeight:"700",fontSize:14}}>KI öffnen</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── LAGER ERSTELLEN MODAL ── */}
      <Modal visible={showAddWh} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowAddWh(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet,{paddingBottom:bottomPad+16}]}>
            <View style={s.modalHandle}/>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:14}}>
              <Warehouse size={18} color={C.accent}/>
              <Text style={s.modalTitle}>Geteiltes Lager erstellen</Text>
            </View>
            <Text style={s.formLabel}>NAME *</Text>
            <TextInput style={s.formInput} placeholder="z.B. Baustelle A, Wagen 1..." placeholderTextColor={C.text3} value={newWhName} onChangeText={setNewWhName} autoFocus/>
            <Text style={s.formLabel}>ICON</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
              <View style={{flexDirection:"row",gap:8}}>
                {WH_ICON_OPTIONS.map(opt=>(
                  <TouchableOpacity key={opt.key} onPress={()=>setNewWhIcon(opt.key)}
                    style={[s.iconChip,newWhIcon===opt.key&&{borderColor:C.accent,backgroundColor:C.accentBg}]}>
                    <opt.Icon size={22} color={newWhIcon===opt.key?C.accent:C.text2}/>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.accent}]} onPress={handleCreateWarehouse} disabled={creating}>
              {creating ? <ActivityIndicator color="#000"/> : (
                <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                  <Check size={14} color="#000"/>
                  <Text style={s.btnPrimaryText}>Lager erstellen</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowAddWh(false)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── LAGER LÖSCHEN CONFIRM ── */}
      <Modal visible={deleteWhModal} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:6}}>
              <Trash2 size={18} color={C.red}/>
              <Text style={s.dialogTitle}>Lager löschen</Text>
            </View>
            <Text style={s.dialogText}>"{deleteWhTarget?.name}" und alle Materialien und Aufgaben löschen?</Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2}]} onPress={()=>setDeleteWhModal(false)}>
                <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:"rgba(248,81,73,0.15)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)"}]} onPress={confirmDeleteWarehouse}>
                <Text style={{color:C.red,fontWeight:"700"}}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MITGLIED ENTFERNEN CONFIRM ── */}
      <Modal visible={removeModal} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:6}}>
              <Trash2 size={18} color={C.red}/>
              <Text style={s.dialogTitle}>Mitglied entfernen</Text>
            </View>
            <Text style={s.dialogText}>{removeTarget?.name||removeTarget?.email} wirklich aus der Firma entfernen?</Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2}]} onPress={()=>setRemoveModal(false)}>
                <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:"rgba(248,81,73,0.15)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)"}]} onPress={confirmRemoveMember}>
                {removing ? <ActivityIndicator color={C.red} size="small"/> : <Text style={{color:C.red,fontWeight:"700"}}>Entfernen</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── FIRMA VERLASSEN CONFIRM ── */}
      <Modal visible={leaveModal} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:6}}>
              <LogOut size={18} color={C.red}/>
              <Text style={s.dialogTitle}>Firma verlassen</Text>
            </View>
            <Text style={s.dialogText}>"{company?.companyName}" verlassen? Du verlierst Zugriff auf alle geteilten Lager.</Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2}]} onPress={()=>setLeaveModal(false)}>
                <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:"rgba(248,81,73,0.15)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)"}]} onPress={confirmLeave}>
                <Text style={{color:C.red,fontWeight:"700"}}>Verlassen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── EINGEKAUFT CONFIRM ── */}
      <Modal visible={buyModal} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:6}}>
              <ShoppingCart size={18} color={C.green}/>
              <Text style={s.dialogTitle}>Eingekauft?</Text>
            </View>
            <Text style={s.dialogText}>
              "{buyPending?.matName}" wurde eingekauft?{"\n"}
              Wird als erledigt markiert.
              {buyPending && buyPending.price > 0 &&
                `\n~Kosten: €${(Math.max(0,buyPending.min-buyPending.qty)*buyPending.price).toFixed(2)}`
              }
            </Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2}]} onPress={()=>{ setBuyModal(false); setBuyPending(null); }}>
                <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.accent}]} onPress={confirmBuy}>
                <Text style={{color:"#000",fontWeight:"700"}}>Ja, gekauft!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:C.bg},
  header:{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:14,paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:C.border},
  backBtn:{width:32,height:32,backgroundColor:C.surface2,borderRadius:8,alignItems:"center",justifyContent:"center"},
  headerTitle:{fontSize:15,fontWeight:"700",color:C.text,flex:1},
  headerSub:{fontSize:10,color:C.text2},
  badgeBtn:{width:34,height:34,backgroundColor:"rgba(248,81,73,0.15)",borderRadius:10,alignItems:"center",justifyContent:"center",position:"relative"},
  redDot:{position:"absolute",top:-4,right:-4,backgroundColor:C.red,borderRadius:8,minWidth:16,height:16,alignItems:"center",justifyContent:"center",paddingHorizontal:3},
  iconBtn:{width:34,height:34,backgroundColor:C.surface2,borderRadius:10,alignItems:"center",justifyContent:"center"},
  content:{flex:1,padding:14},
  searchWrap:{flexDirection:"row",alignItems:"center",backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:10,marginBottom:14,paddingLeft:12},
  searchInput:{flex:1,color:C.text,fontSize:13,paddingVertical:10},
  sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:10},
  sectionLabel:{fontSize:10,fontWeight:"700",color:C.text3,textTransform:"uppercase",letterSpacing:0.8,marginBottom:8},
  companyCard:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:14,padding:14,marginBottom:16},
  companyCardRow:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:10},
  companyAvatar:{width:46,height:46,backgroundColor:C.accentBg,borderRadius:12,alignItems:"center",justifyContent:"center"},
  companyName:{fontSize:15,fontWeight:"700",color:C.text},
  companySub:{fontSize:11,color:C.text2,marginTop:2},
  teamBtn:{backgroundColor:C.accentBg,borderWidth:0.5,borderColor:"rgba(245,166,35,0.3)",borderRadius:10,paddingHorizontal:10,paddingVertical:6},
  membersRow:{flexDirection:"row",gap:6,alignItems:"center"},
  memberAvatar:{width:26,height:26,backgroundColor:C.surface2,borderRadius:13,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:C.border2},
  memberAvatarText:{fontSize:11,fontWeight:"700",color:C.text2},
  whCard:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:14,padding:14,marginBottom:10,flexDirection:"row",alignItems:"center",gap:12},
  whIcon:{width:52,height:52,backgroundColor:C.accentBg,borderRadius:14,alignItems:"center",justifyContent:"center"},
  whName:{fontSize:14,fontWeight:"700",color:C.text},
  whSub:{fontSize:11,color:C.text2,marginTop:2},
  whSync:{fontSize:10,color:C.text3,marginTop:2},
  rolePill:{paddingHorizontal:8,paddingVertical:3,borderRadius:20},
  alertPill:{flexDirection:"row",alignItems:"center",backgroundColor:"rgba(248,81,73,0.12)",paddingHorizontal:8,paddingVertical:3,borderRadius:20},
  memberCard2:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:14,marginBottom:8,flexDirection:"row",alignItems:"center",gap:12},
  memberAvatar2:{width:44,height:44,backgroundColor:C.accentBg,borderRadius:22,alignItems:"center",justifyContent:"center"},
  memberAvatarText2:{fontSize:18,fontWeight:"700",color:C.accent},
  memberName2:{fontSize:13,fontWeight:"600",color:C.text,marginBottom:2},
  memberEmail2:{fontSize:11,color:C.text2,marginBottom:4},
  roleBadge2:{flexDirection:"row",alignItems:"center",paddingHorizontal:8,paddingVertical:3,borderRadius:20,alignSelf:"flex-start"},
  roleBadgeText2:{fontSize:10,fontWeight:"700"},
  removeBtn:{backgroundColor:"rgba(248,81,73,0.1)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)",borderRadius:8,paddingHorizontal:10,paddingVertical:6},
  statsGrid:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:16},
  statCard:{width:"31%",backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:12},
  statsWhCard:{flexDirection:"row",alignItems:"center",backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:12,marginBottom:8},
  summaryRow:{flexDirection:"row",gap:8,marginBottom:12},
  summaryCard:{flex:1,backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:10,padding:10,alignItems:"center"},
  summaryLabel:{fontSize:10,color:C.text3,marginBottom:3},
  summaryValue:{fontSize:20,fontWeight:"700",color:C.text},
  whSectionHeader:{fontSize:13,fontWeight:"700",color:C.accent},
  shoppingItem:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:10,padding:12,marginBottom:6,flexDirection:"row",alignItems:"center",gap:8},
  itemCheckbox:{width:24,alignItems:"center"},
  checkboxEmpty:{width:22,height:22,borderRadius:5,borderWidth:2,borderColor:C.accent,alignItems:"center",justifyContent:"center"},
  itemCatIcon:{width:36,height:36,borderRadius:9,alignItems:"center",justifyContent:"center",flexShrink:0},
  statusBadge:{paddingHorizontal:8,paddingVertical:3,borderRadius:20,flexShrink:0},
  emptyState:{alignItems:"center",paddingVertical:40,gap:10},
  emptyTitle:{fontSize:18,fontWeight:"700",color:C.text},
  emptyText:{fontSize:13,color:C.text2,textAlign:"center",lineHeight:20},
  bigBtn:{borderRadius:12,padding:14,alignItems:"center"},
  bottomNav:{flexDirection:"row",backgroundColor:C.surface,borderTopWidth:0.5,borderTopColor:C.border,paddingTop:10},
  navItem:{flex:1,alignItems:"center",gap:2,paddingVertical:4},
  navDot:{width:4,height:4,borderRadius:2,backgroundColor:C.accent,marginTop:1},
  navLabel:{fontSize:9,fontWeight:"500",color:C.text3},
  navBadge:{position:"absolute",top:-4,right:-6,backgroundColor:C.red,borderRadius:8,minWidth:16,height:16,alignItems:"center",justifyContent:"center",paddingHorizontal:3},
  modalOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end"},
  modalSheet:{backgroundColor:C.surface,borderTopLeftRadius:22,borderTopRightRadius:22,padding:20,borderTopWidth:0.5,borderTopColor:C.border2},
  modalHandle:{width:36,height:3,backgroundColor:C.border2,borderRadius:2,alignSelf:"center",marginBottom:18},
  modalTitle:{fontSize:16,fontWeight:"700",color:C.text},
  formLabel:{fontSize:10,fontWeight:"600",color:C.text3,textTransform:"uppercase",letterSpacing:0.7,marginBottom:5},
  formInput:{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8,padding:11,fontSize:13,color:C.text,marginBottom:14},
  iconChip:{width:46,height:46,backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:10,alignItems:"center",justifyContent:"center"},
  btnPrimary:{borderRadius:8,padding:13,alignItems:"center",marginTop:4},
  btnPrimaryText:{color:"#000",fontWeight:"700",fontSize:14},
  overlayCenter:{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.75)",alignItems:"center",justifyContent:"center"},
  dialogBox:{width:"85%",maxWidth:340,backgroundColor:C.surface,borderRadius:16,padding:20,borderWidth:0.5,borderColor:C.border2},
  dialogTitle:{fontSize:16,fontWeight:"700",color:C.text},
  dialogText:{fontSize:13,color:C.text2,marginBottom:20,lineHeight:20,marginTop:4},
  dialogBtns:{flexDirection:"row",gap:10},
  dialogBtn:{flex:1,padding:12,borderRadius:10,alignItems:"center"},
});
