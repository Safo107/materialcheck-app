// app/private/index.tsx - Privater Bereich (vollständige App)
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Modal, Image, Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore, Folder } from "../../store";
import { useTeamStore } from "../../teamStore";
import { useProStore } from "../../proStore";
import ProGate from "../../components/ProGate";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLang, t } from "../../i18n";
import BottomNav from "../../components/BottomNav";
import { Zap, Lock, Mail, Globe, Search, X, ShoppingCart, Pencil, FolderOpen, Trash2, ChevronLeft, Plus, Package, KeyRound, Truck, Factory, Home, Wrench, Warehouse, Box, Building2, Star, Users, RotateCcw } from "lucide-react-native";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

const FOLDER_ICON_OPTIONS = [
  { key:"truck",     Icon:Truck },
  { key:"factory",   Icon:Factory },
  { key:"home",      Icon:Home },
  { key:"wrench",    Icon:Wrench },
  { key:"zap",       Icon:Zap },
  { key:"package",   Icon:Package },
  { key:"warehouse", Icon:Warehouse },
  { key:"box",       Icon:Box },
  { key:"building",  Icon:Building2 },
  { key:"star",      Icon:Star },
  { key:"users",     Icon:Users },
  { key:"refresh",   Icon:RotateCcw },
];

function FolderIcon({ iconKey, size, color }: { iconKey:string; size:number; color:string }) {
  const found = FOLDER_ICON_OPTIONS.find(o => o.key === iconKey);
  if (found) return <found.Icon size={size} color={color}/>;
  // Rückwärtskompatibel: alte Emoji-Icons als Text anzeigen
  return <Text style={{fontSize:size*1.1,lineHeight:size*1.4}}>{iconKey}</Text>;
}

function stockStatus(qty:number, min:number, T:any) {
  if (qty===0) return { label:T.statusOut, color:C.red, bg:"rgba(248,81,73,0.15)" };
  if (qty<min) return { label:T.statusLow, color:C.accent, bg:"rgba(245,166,35,0.15)" };
  return { label:T.statusOk, color:C.green, bg:"rgba(63,185,80,0.15)" };
}

export default function PrivateIndex() {
  const router = useRouter();
  const { lang } = useLang();
  const T = t(lang);
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const isPro = useProStore(s => s.isPro);
  const _store = useStore();
  const folders = _store?.folders ?? [];
  const materials = _store?.materials ?? [];
  const addFolder = _store?.addFolder;
  const updateFolder = _store?.updateFolder;
  const deleteFolder = _store?.deleteFolder;
  const getLowStockMaterials = _store?.getLowStockMaterials ?? (() => []);
  const loaded = _store?.loaded ?? false;
  const _team = useTeamStore();
  const invitations = _team?.invitations ?? [];
  const checkInvitations = _team?.checkInvitations;
  const [search, setSearch] = useState("");
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder|null>(null);
  const [folderName, setFolderName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("package");
  const [firmName, setFirmName] = useState("");
  const [logoUri, setLogoUri] = useState<string|null>(null);

  // ── Ordner Optionen Modal (ersetzt LongPress Alert) ──
  const [folderOptionsVisible, setFolderOptionsVisible] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder|null>(null);

  // ── Pro Gate ─────────────────────────────────────────
  const [showProGate, setShowProGate] = useState(false);
  const [proGateFeature, setProGateFeature] = useState<"folder"|"material">("folder");

  // ── Löschen PIN Modal ────────────────────────────────
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deletePinError, setDeletePinError] = useState("");

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const raw = await AsyncStorage.getItem("eg-profile-v1");
      if (raw) {
        const p = JSON.parse(raw);
        setFirmName(p.firmName||""); setLogoUri(p.logoUri||null);
        if (p.email) checkInvitations(p.email);
      }
    } catch {}
  };

  const lowStock = getLowStockMaterials();
  const searchResults = search.trim() ? materials.filter(m=>m.name.toLowerCase().includes(search.toLowerCase())) : [];

  const openAddFolder = () => {
    if (!isPro && folders.length >= 3) { setProGateFeature("folder"); setShowProGate(true); return; }
    setEditingFolder(null); setFolderName(""); setSelectedIcon("package"); setShowFolderModal(true);
  };
  const openEditFolder = (f:Folder) => { setEditingFolder(f); setFolderName(f.name); setSelectedIcon(f.icon); setShowFolderModal(true); };
  const saveFolder = () => {
    if (!folderName.trim()) return;
    if (editingFolder) updateFolder(editingFolder.id, folderName.trim(), selectedIcon);
    else addFolder(folderName.trim(), selectedIcon);
    setShowFolderModal(false);
  };

  const handleFolderLongPress = (f: Folder) => {
    setSelectedFolder(f);
    setFolderOptionsVisible(true);
  };

  const openDeleteConfirm = () => {
    setDeletePin("");
    setDeletePinError("");
    setDeleteVisible(true);
  };

  const onDeletePinDigit = async (d: string) => {
    const next = deletePin + d;
    setDeletePin(next);
    if (next.length === 4) {
      const savedPin = await AsyncStorage.getItem("eg-app-pin");
      if (!savedPin || next === savedPin) {
        if (selectedFolder) deleteFolder(selectedFolder.id);
        setDeleteVisible(false);
        setFolderOptionsVisible(false);
        setSelectedFolder(null);
      } else {
        setDeletePinError("Falscher PIN");
        setTimeout(() => { setDeletePin(""); setDeletePinError(""); }, 800);
      }
    }
  };

  if (!loaded) {
    return <View style={{ flex:1, backgroundColor:C.bg, alignItems:"center", justifyContent:"center" }}>
      <Zap size={32} color={C.accent} />
    </View>;
  }

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.portalBackBtn} onPress={async()=>{ await AsyncStorage.removeItem("eg-last-portal"); router.replace("/portal_select"); }}>
          <ChevronLeft size={20} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerLeft}>
          {logoUri?<Image source={{uri:logoUri}} style={s.firmLogo}/>:<View style={s.logoBadge}><Text style={s.logoText}>EG</Text></View>}
          <View style={{ flex:1, minWidth:0 }}>
            <Text style={s.headerTitle} numberOfLines={1}>{firmName||T.appName}</Text>
            <View style={{flexDirection:"row",alignItems:"center",gap:4}}><Lock size={10} color="#a371f7"/><Text style={s.headerSub}>Privater Bereich</Text></View>
          </View>
        </View>
        <View style={{ flexDirection:"row", gap:6 }}>
          {invitations.length > 0 && (
            <TouchableOpacity style={s.inviteBtn} onPress={()=>router.push("/invites")}>
              <Mail size={14} color={C.red} />
              <View style={s.inviteDot}><Text style={{ color:"#fff", fontSize:8, fontWeight:"700" }}>{invitations.length}</Text></View>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.websiteBtn} onPress={()=>Linking.openURL("https://elektrogenius.de")}>
            <Globe size={16} color={C.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.content} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomPad+100 }}>
        <View style={s.privateNotice}>
          <Lock size={14} color="#a371f7" />
          <Text style={s.privateNoticeText}>Nur du siehst diesen Bereich</Text>
        </View>

        <View style={s.searchWrap}>
          <Search size={14} color={C.text3} style={{marginRight:4}} />
          <TextInput style={s.searchInput} placeholder={T.searchPlaceholder} placeholderTextColor={C.text3} value={search} onChangeText={setSearch}/>
          {search.length>0&&<TouchableOpacity onPress={()=>setSearch("")} style={{ padding:8 }}><X size={14} color={C.text3} /></TouchableOpacity>}
        </View>

        {search.trim().length>0?(
          searchResults.map(m=>{
            const st = stockStatus(m.qty,m.min,T);
            const folder = folders.find(f=>f.id===m.folderId);
            return (
              <TouchableOpacity key={m.id} style={s.matCard} onPress={()=>router.push(`/material/${m.id}`)}>
                <View style={[s.matIcon,{backgroundColor:C.accentBg}]}><Package size={20} color={C.accent} /></View>
                <View style={s.matInfo}>
                  <Text style={s.matName}>{m.name}</Text>
                  <View style={{flexDirection:"row",gap:6}}>
                    <View style={[s.badge,{backgroundColor:st.bg}]}><Text style={[s.badgeText,{color:st.color}]}>{st.label}</Text></View>
                    {folder&&<Text style={s.metaText}>{folder.icon} {folder.name}</Text>}
                  </View>
                </View>
                <View style={s.matQty}><Text style={s.matQtyNum}>{m.qty}</Text><Text style={s.matQtyUnit}>{m.unit}</Text></View>
              </TouchableOpacity>
            );
          })
        ):(
          <>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>{T.myFolders}</Text>
              <TouchableOpacity onPress={openAddFolder}><Text style={s.sectionAction}>{T.addFolder}</Text></TouchableOpacity>
            </View>
            <View style={s.folderGrid}>
              {folders.map(f=>{
                const mats=materials.filter(m=>m.folderId===f.id);
                const low=mats.filter(m=>m.qty<m.min).length;
                const fillPct=mats.length>0?Math.round((mats.filter(m=>m.qty>=m.min).length/mats.length)*100):0;
                return (
                  <TouchableOpacity key={f.id} style={s.folderCard}
                    onPress={()=>router.push(`/folder/${f.id}`)}
                    onLongPress={()=>handleFolderLongPress(f)}>
                    {low>0&&<View style={s.folderAlert}/>}
                    <View style={[s.folderIcon,{alignItems:"center",justifyContent:"center"}]}>
                      <FolderIcon iconKey={f.icon} size={24} color={C.accent}/>
                    </View>
                    <Text style={s.folderName}>{f.name}</Text>
                    <Text style={s.folderCount}>{mats.length} {T.materials}</Text>
                    <View style={s.folderBar}><View style={[s.folderBarFill,{width:`${fillPct}%` as any}]}/></View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={[s.folderCard,s.folderAddCard]} onPress={openAddFolder}>
                <Plus size={24} color={C.text3} />
                <Text style={{fontSize:11,color:C.text3,marginTop:4}}>{T.folder}</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.sectionRow,{marginTop:4}]}>
              <Text style={s.sectionLabel}>{T.lowEmpty}</Text>
              <TouchableOpacity onPress={()=>router.push("/shopping")}><View style={{flexDirection:"row",alignItems:"center",gap:4}}><ShoppingCart size={12} color={C.accent}/><Text style={s.sectionAction}>{T.shoppingTitle}</Text></View></TouchableOpacity>
            </View>
            {lowStock.slice(0,4).map(m=>{
              const st=stockStatus(m.qty,m.min,T);
              const folder=folders.find(f=>f.id===m.folderId);
              return (
                <TouchableOpacity key={m.id} style={s.matCard} onPress={()=>router.push(`/material/${m.id}`)}>
                  <View style={[s.matIcon,{backgroundColor:C.accentBg}]}><Package size={20} color={C.accent} /></View>
                  <View style={s.matInfo}>
                    <Text style={s.matName}>{m.name}</Text>
                    <View style={{flexDirection:"row",gap:6}}>
                      <View style={[s.badge,{backgroundColor:st.bg}]}><Text style={[s.badgeText,{color:st.color}]}>{st.label}</Text></View>
                      {folder&&<View style={{flexDirection:"row",alignItems:"center",gap:4}}><FolderIcon iconKey={folder.icon} size={11} color={C.text2}/><Text style={s.metaText}>{folder.name}</Text></View>}
                    </View>
                  </View>
                  <View style={s.matQty}><Text style={s.matQtyNum}>{m.qty}</Text><Text style={s.matQtyUnit}>{m.unit}</Text></View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      <TouchableOpacity style={[s.fab,{bottom:bottomPad+80}]} onPress={()=>{ if (!isPro && materials.length >= 200) { setProGateFeature("material"); setShowProGate(true); return; } router.push("/material/new"); }}>
        <Plus size={26} color="#000" strokeWidth={2.5} />
      </TouchableOpacity>

      <BottomNav active="home"/>

      {/* ORDNER OPTIONEN MODAL (ersetzt LongPress Alert) */}
      <Modal visible={folderOptionsVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,justifyContent:"center",marginBottom:4}}>
              {selectedFolder&&<FolderIcon iconKey={selectedFolder.icon} size={18} color={C.accent}/>}
              <Text style={s.dialogTitle}>{selectedFolder?.name}</Text>
            </View>
            <Text style={s.dialogSub}>{T.whatToDo}</Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity style={s.dialogBtn} onPress={() => {
                setFolderOptionsVisible(false);
                if (selectedFolder) openEditFolder(selectedFolder);
              }}>
                <View style={{flexDirection:"row",alignItems:"center",gap:8}}><Pencil size={14} color={C.text}/><Text style={s.dialogBtnText}>{T.renameFolder}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={s.dialogBtn} onPress={() => {
                setFolderOptionsVisible(false);
                if (selectedFolder) router.push(`/folder/${selectedFolder.id}`);
              }}>
                <View style={{flexDirection:"row",alignItems:"center",gap:8}}><FolderOpen size={14} color={C.text}/><Text style={s.dialogBtnText}>{T.openFolder}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn, s.dialogBtnDestructive]} onPress={() => {
                setFolderOptionsVisible(false);
                openDeleteConfirm();
              }}>
                <View style={{flexDirection:"row",alignItems:"center",gap:8}}><Trash2 size={14} color={C.red}/><Text style={[s.dialogBtnText, { color:C.red }]}>{T.deleteFolder}</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn, s.dialogBtnCancel]} onPress={() => {
                setFolderOptionsVisible(false);
                setSelectedFolder(null);
              }}>
                <Text style={[s.dialogBtnText, { color:C.text2 }]}>{T.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LÖSCHEN PIN MODAL */}
      <Modal visible={deleteVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={[s.dialogBox, { maxWidth:320 }]}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:4}}>
              <KeyRound size={18} color={C.red}/>
              <Text style={s.dialogTitle}>Ordner löschen</Text>
            </View>
            <Text style={s.dialogSub}>"{selectedFolder?.name}" und alle Materialien werden gelöscht</Text>
            {/* PIN Punkte */}
            <View style={{ flexDirection:"row", justifyContent:"center", gap:14, marginBottom:20 }}>
              {[0,1,2,3].map(i => (
                <View key={i} style={{
                  width:14, height:14, borderRadius:7,
                  backgroundColor: deletePin.length > i ? C.red : C.surface3,
                  borderWidth:1.5, borderColor: deletePin.length > i ? C.red : C.border2,
                }}/>
              ))}
            </View>
            {/* PIN Grid */}
            <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d,i) => (
                <TouchableOpacity key={i} style={{
                  width:"30%", paddingVertical:13, borderRadius:10,
                  backgroundColor: d==="" ? "transparent" : C.surface2,
                  borderWidth: d==="" ? 0 : 0.5, borderColor:C.border2,
                  alignItems:"center",
                }} onPress={() => {
                  if (d==="") return;
                  if (d==="⌫") { setDeletePin(p=>p.slice(0,-1)); setDeletePinError(""); }
                  else onDeletePinDigit(d);
                }} disabled={d===""}>
                  <Text style={{ fontSize:18, fontWeight:"600", color: d==="⌫" ? C.text2 : C.text }}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {deletePinError ? <Text style={{ fontSize:12, color:C.red, textAlign:"center", marginTop:10 }}>{deletePinError}</Text> : null}
            <TouchableOpacity style={[s.dialogBtn, s.dialogBtnCancel, {marginTop:14}]} onPress={() => { setDeleteVisible(false); setDeletePin(""); setDeletePinError(""); }}>
              <Text style={[s.dialogBtnText, { color:C.text2 }]}>{T.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ProGate visible={showProGate} onClose={() => setShowProGate(false)} feature={proGateFeature} />

      {/* ORDNER MODAL */}
      <Modal visible={showFolderModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowFolderModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet,{paddingBottom:bottomPad+20}]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>{editingFolder?T.renameFolder2:T.createFolder}</Text>
            <Text style={s.formLabel}>{T.name}</Text>
            <TextInput style={s.formInput} placeholder={T.chooseName} placeholderTextColor={C.text3} value={folderName} onChangeText={setFolderName} autoFocus/>
            <Text style={[s.formLabel,{marginTop:12}]}>{T.chooseIcon}</Text>
            <View style={s.iconGrid}>
              {FOLDER_ICON_OPTIONS.map(opt=>(
                <TouchableOpacity key={opt.key} style={[s.iconOption,selectedIcon===opt.key&&s.iconOptionSelected]} onPress={()=>setSelectedIcon(opt.key)}>
                  <opt.Icon size={22} color={selectedIcon===opt.key?C.accent:C.text2}/>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.btnPrimary} onPress={saveFolder}>
              <Text style={s.btnPrimaryText}>{editingFolder?T.save:T.create}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowFolderModal(false)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>{T.cancel}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{flex:1,backgroundColor:C.bg},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:14,paddingVertical:12,borderBottomWidth:0.5,borderBottomColor:C.border},
  portalBackBtn:{width:30,height:30,backgroundColor:C.surface2,borderRadius:8,alignItems:"center",justifyContent:"center",marginRight:6},
  headerLeft:{flexDirection:"row",alignItems:"center",gap:10,flex:1,marginRight:10},
  logoBadge:{width:34,height:34,backgroundColor:"#1c2c55",borderWidth:1.5,borderColor:C.accent,borderRadius:10,alignItems:"center",justifyContent:"center"},
  logoText:{color:C.accent,fontWeight:"700",fontSize:11},
  firmLogo:{width:34,height:34,borderRadius:10,borderWidth:1.5,borderColor:C.accent},
  headerTitle:{fontSize:14,fontWeight:"700",color:C.text},
  headerSub:{fontSize:10,color:"#a371f7"},
  websiteBtn:{width:34,height:34,backgroundColor:C.accentBg,borderWidth:0.5,borderColor:"rgba(245,166,35,0.3)",borderRadius:10,alignItems:"center",justifyContent:"center"},
  inviteBtn:{width:34,height:34,backgroundColor:"rgba(248,81,73,0.15)",borderRadius:10,alignItems:"center",justifyContent:"center",position:"relative"},
  inviteDot:{position:"absolute",top:-4,right:-4,backgroundColor:C.red,borderRadius:8,minWidth:16,height:16,alignItems:"center",justifyContent:"center",paddingHorizontal:3},
  content:{flex:1,padding:14},
  privateNotice:{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(163,113,247,0.08)",borderWidth:0.5,borderColor:"rgba(163,113,247,0.2)",borderRadius:10,padding:10,marginBottom:12},
  privateNoticeText:{fontSize:11,color:"#a371f7"},
  searchWrap:{flexDirection:"row",alignItems:"center",backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:10,marginBottom:14,paddingLeft:12},
  searchInput:{flex:1,color:C.text,fontSize:13,paddingVertical:10},
  sectionRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:10},
  sectionLabel:{fontSize:10,fontWeight:"700",color:C.text3,textTransform:"uppercase",letterSpacing:0.8},
  sectionAction:{fontSize:12,color:C.accent,fontWeight:"500"},
  folderGrid:{flexDirection:"row",flexWrap:"wrap",gap:10,marginBottom:16},
  folderCard:{width:"47%",backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:13,position:"relative",overflow:"hidden"},
  folderAddCard:{alignItems:"center",justifyContent:"center",borderStyle:"dashed",borderColor:"rgba(255,255,255,0.22)",minHeight:90},
  folderAlert:{position:"absolute",top:9,right:9,width:8,height:8,backgroundColor:C.red,borderRadius:4},
  folderIcon:{width:32,height:32,marginBottom:8},
  folderName:{fontSize:13,fontWeight:"600",color:C.text,marginBottom:2},
  folderCount:{fontSize:10,color:C.text2},
  folderBar:{height:3,backgroundColor:C.border2,borderRadius:2,marginTop:10,overflow:"hidden"},
  folderBarFill:{height:3,backgroundColor:C.accent,borderRadius:2},
  matCard:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:12,marginBottom:8,flexDirection:"row",alignItems:"center",gap:10},
  matIcon:{width:42,height:42,borderRadius:10,alignItems:"center",justifyContent:"center"},
  matInfo:{flex:1,minWidth:0},
  matName:{fontSize:13,fontWeight:"600",color:C.text,marginBottom:3},
  badge:{paddingHorizontal:7,paddingVertical:2,borderRadius:20},
  badgeText:{fontSize:10,fontWeight:"600"},
  metaText:{fontSize:11,color:C.text2},
  matQty:{alignItems:"flex-end"},
  matQtyNum:{fontSize:17,fontWeight:"700",color:C.text},
  matQtyUnit:{fontSize:10,color:C.text3},
  fab:{position:"absolute",right:18,width:52,height:52,backgroundColor:C.accent,borderRadius:26,alignItems:"center",justifyContent:"center",elevation:8},
  modalOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end"},
  modalSheet:{backgroundColor:C.surface,borderTopLeftRadius:22,borderTopRightRadius:22,padding:20,borderTopWidth:0.5,borderTopColor:C.border2},
  modalHandle:{width:36,height:3,backgroundColor:C.border2,borderRadius:2,alignSelf:"center",marginBottom:18},
  modalTitle:{fontSize:16,fontWeight:"700",color:C.text,marginBottom:16},
  formLabel:{fontSize:10,fontWeight:"600",color:C.text3,textTransform:"uppercase",letterSpacing:0.7,marginBottom:5},
  formInput:{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8,padding:11,fontSize:13,color:C.text,marginBottom:4},
  iconGrid:{flexDirection:"row",flexWrap:"wrap",gap:8,marginBottom:18},
  iconOption:{width:46,height:46,backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8,alignItems:"center",justifyContent:"center"},
  iconOptionSelected:{borderColor:C.accent,backgroundColor:C.accentBg},
  btnPrimary:{backgroundColor:C.accent,borderRadius:8,padding:13,alignItems:"center",marginTop:6},
  btnPrimaryText:{color:"#000",fontWeight:"700",fontSize:14},
  // Dialog Styles
  overlayCenter:{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundColor:"rgba(0,0,0,0.75)",alignItems:"center",justifyContent:"center"},
  dialogBox:{width:"85%",maxWidth:340,backgroundColor:C.surface,borderRadius:16,padding:20,borderWidth:0.5,borderColor:C.border2},
  dialogTitle:{fontSize:16,fontWeight:"700",color:C.text,marginBottom:4,textAlign:"center"},
  dialogSub:{fontSize:13,color:C.text2,marginBottom:16,textAlign:"center"},
  dialogBtns:{gap:8},
  dialogBtn:{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:10,padding:13,alignItems:"center"},
  dialogBtnDestructive:{backgroundColor:"rgba(248,81,73,0.1)",borderColor:"rgba(248,81,73,0.3)"},
  dialogBtnCancel:{backgroundColor:"transparent",borderColor:"transparent"},
  dialogBtnText:{fontSize:14,fontWeight:"600",color:C.text},
});
