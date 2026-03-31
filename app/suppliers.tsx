// app/suppliers.tsx - Lieferanten
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore, Supplier } from "../store";
import { useLang, t } from "../i18n";
import { useProStore } from "../proStore";
import ProGate from "../components/ProGate";
import { Truck, ArrowLeft, Globe, Plus, Search, Phone, Mail, ExternalLink, Trash2, Edit2, X, Check } from "lucide-react-native";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

export default function SuppliersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { lang } = useLang();
  const T = t(lang);
  const isPro = useProStore(s => s.isPro);
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");

  // ── Pro Gate ──────────────────────────────────────
  const [showProGate, setShowProGate] = useState(false);

  // ── Error Modal ──────────────────────────────────
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Delete Confirm Modal ─────────────────────────
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.note.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    if (!isPro && suppliers.length >= 5) { setShowProGate(true); return; }
    setEditing(null); setName(""); setPhone(""); setEmail(""); setWebsite(""); setNote("");
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s); setName(s.name); setPhone(s.phone); setEmail(s.email);
    setWebsite(s.website); setNote(s.note); setShowModal(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      setErrorMsg(T.enterName || "Bitte Namen eingeben");
      setErrorVisible(true);
      return;
    }
    if (editing) {
      updateSupplier(editing.id, { name:name.trim(), phone:phone.trim(), email:email.trim(), website:website.trim(), note:note.trim() });
    } else {
      addSupplier({ name:name.trim(), phone:phone.trim(), email:email.trim(), website:website.trim(), note:note.trim() });
    }
    setShowModal(false);
  };

  const handleDelete = (s: Supplier) => {
    setDeletingSupplier(s);
    setDeleteVisible(true);
  };

  const confirmDelete = () => {
    if (deletingSupplier) deleteSupplier(deletingSupplier.id);
    setDeleteVisible(false);
    setDeletingSupplier(null);
    setShowModal(false);
  };

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>Lieferanten</Text>
          <Text style={s.headerSub}>{suppliers.length} gespeichert</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Plus size={18} color={C.text} />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Search size={14} color={C.text3} style={{ marginRight:6 }} />
        <TextInput style={s.searchInput} placeholder="Lieferant suchen..." placeholderTextColor={C.text3} value={search} onChangeText={setSearch} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Truck size={48} color={C.text3} />
            <Text style={s.emptyTitle}>Noch keine Lieferanten</Text>
            <Text style={s.emptyText}>Tippe + um einen Lieferanten hinzuzufügen</Text>
          </View>
        ) : filtered.map(sup => (
          <TouchableOpacity key={sup.id} style={s.card} onPress={() => openEdit(sup)}
            onLongPress={() => handleDelete(sup)}>
            <View style={s.cardIcon}><Truck size={22} color={C.accent} /></View>
            <View style={s.cardInfo}>
              <Text style={s.cardName}>{sup.name}</Text>
              {sup.phone ? <Text style={s.cardMeta}>{sup.phone}</Text> : null}
              {sup.email ? <Text style={s.cardMeta}>{sup.email}</Text> : null}
              {sup.note ? <Text style={s.cardNote} numberOfLines={1}>{sup.note}</Text> : null}
            </View>
            <View style={s.cardActions}>
              {sup.phone && (
                <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(`tel:${sup.phone}`)}>
                  <Phone size={16} color={C.text2} />
                </TouchableOpacity>
              )}
              {sup.website && (
                <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL(sup.website.startsWith("http") ? sup.website : `https://${sup.website}`)}>
                  <ExternalLink size={14} color={C.blue} />
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: bottomPad + 40 }} />
      </ScrollView>

      <ProGate visible={showProGate} onClose={() => setShowProGate(false)} feature="supplier" />

      {/* ── Bearbeiten / Hinzufügen Modal ── */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <TouchableOpacity activeOpacity={1} style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{editing ? "Lieferant bearbeiten" : "Lieferant hinzufügen"}</Text>

            <Text style={s.formLabel}>Firmenname *</Text>
            <TextInput style={s.formInput} placeholder="z.B. Elektro Großhandel GmbH" placeholderTextColor={C.text3} value={name} onChangeText={setName} autoFocus />

            <Text style={s.formLabel}>Telefon</Text>
            <TextInput style={s.formInput} placeholder="z.B. 0221 123456" placeholderTextColor={C.text3} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

            <Text style={s.formLabel}>E-Mail</Text>
            <TextInput style={s.formInput} placeholder="z.B. info@lieferant.de" placeholderTextColor={C.text3} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

            <Text style={s.formLabel}>Website</Text>
            <TextInput style={s.formInput} placeholder="z.B. www.lieferant.de" placeholderTextColor={C.text3} value={website} onChangeText={setWebsite} autoCapitalize="none" />

            <Text style={s.formLabel}>Notiz</Text>
            <TextInput style={s.formInput} placeholder="z.B. Stammkunde, 10% Rabatt" placeholderTextColor={C.text3} value={note} onChangeText={setNote} />

            <TouchableOpacity style={s.btnPrimary} onPress={handleSave}>
              <Text style={s.btnPrimaryText}>Speichern</Text>
            </TouchableOpacity>
            {editing && (
              <TouchableOpacity
                style={[s.btnPrimary, { backgroundColor:"rgba(248,81,73,0.15)", marginTop:8 }]}
                onPress={() => handleDelete(editing)}>
                <Text style={[s.btnPrimaryText, { color:C.red }]}>Löschen</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btnPrimary, s.btnSec]} onPress={() => setShowModal(false)}>
              <Text style={s.btnSecText}>{T.cancel}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Löschen Confirm Modal ── */}
      <Modal visible={deleteVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <Text style={s.dialogTitle}>Löschen?</Text>
            <Text style={s.dialogText}>
              "{deletingSupplier?.name}" wirklich löschen?
            </Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity
                style={[s.dialogBtn, { backgroundColor:C.surface2 }]}
                onPress={() => { setDeleteVisible(false); setDeletingSupplier(null); }}>
                <Text style={{ color:C.text2, fontWeight:"600" }}>{T.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dialogBtn, { backgroundColor:"rgba(248,81,73,0.15)", borderWidth:0.5, borderColor:"rgba(248,81,73,0.3)" }]}
                onPress={confirmDelete}>
                <Text style={{ color:C.red, fontWeight:"700" }}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Error Modal ── */}
      <Modal visible={errorVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <Text style={s.dialogTitle}>Fehler</Text>
            <Text style={s.dialogText}>{errorMsg}</Text>
            <TouchableOpacity
              style={[s.dialogBtn, { backgroundColor:C.surface2, width:"100%" }]}
              onPress={() => setErrorVisible(false)}>
              <Text style={{ color:C.text2, fontWeight:"600" }}>OK</Text>
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
  backBtnText:{ color:C.text, fontSize:16 },
  headerTitle:{ fontSize:16, fontWeight:"700", color:C.text },
  headerSub:{ fontSize:10, color:C.text2 },
  addBtn:{ width:34, height:34, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:10, alignItems:"center", justifyContent:"center" },
  addBtnText:{ fontSize:22, color:C.text, fontWeight:"700", lineHeight:26 },
  searchWrap:{ flexDirection:"row", alignItems:"center", backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:10, margin:14, paddingLeft:12 },
  searchInput:{ flex:1, color:C.text, fontSize:13, paddingVertical:10 },
  content:{ flex:1, paddingHorizontal:14 },
  card:{ backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:14, marginBottom:8, flexDirection:"row", alignItems:"center", gap:10 },
  cardIcon:{ width:44, height:44, backgroundColor:C.accentBg, borderRadius:10, alignItems:"center", justifyContent:"center" },
  cardInfo:{ flex:1, minWidth:0 },
  cardName:{ fontSize:14, fontWeight:"700", color:C.text, marginBottom:3 },
  cardMeta:{ fontSize:11, color:C.text2, marginBottom:1 },
  cardNote:{ fontSize:11, color:C.text3, marginTop:2 },
  cardActions:{ flexDirection:"row", gap:6 },
  actionBtn:{ width:34, height:34, backgroundColor:C.surface2, borderRadius:8, alignItems:"center", justifyContent:"center" },
  emptyState:{ alignItems:"center", paddingVertical:60, gap:12 },
  emptyTitle:{ fontSize:18, fontWeight:"700", color:C.text },
  emptyText:{ fontSize:13, color:C.text2, textAlign:"center" },
  modalOverlay:{ flex:1, backgroundColor:"rgba(0,0,0,0.7)", justifyContent:"flex-end" },
  modalSheet:{ backgroundColor:C.surface, borderTopLeftRadius:22, borderTopRightRadius:22, padding:20, paddingBottom:36, borderTopWidth:0.5, borderTopColor:C.border2 },
  modalHandle:{ width:36, height:3, backgroundColor:C.border2, borderRadius:2, alignSelf:"center", marginBottom:18 },
  modalTitle:{ fontSize:16, fontWeight:"700", color:C.text, marginBottom:14 },
  formLabel:{ fontSize:10, fontWeight:"600", color:C.text3, textTransform:"uppercase", letterSpacing:0.7, marginBottom:5 },
  formInput:{ backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:8, padding:11, fontSize:13, color:C.text, marginBottom:12 },
  btnPrimary:{ backgroundColor:C.accent, borderRadius:8, padding:13, alignItems:"center", marginTop:4 },
  btnPrimaryText:{ color:"#000", fontWeight:"700", fontSize:14 },
  btnSec:{ backgroundColor:C.surface3, marginTop:8 },
  btnSecText:{ color:C.text2, fontWeight:"500", fontSize:14 },
  overlayCenter:{ position:"absolute", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.75)", alignItems:"center", justifyContent:"center" },
  dialogBox:{ width:"85%", maxWidth:340, backgroundColor:C.surface, borderRadius:16, padding:20, borderWidth:0.5, borderColor:C.border2, alignItems:"center" },
  dialogTitle:{ fontSize:16, fontWeight:"700", color:C.text, marginBottom:8, textAlign:"center" },
  dialogText:{ fontSize:13, color:C.text2, marginBottom:20, lineHeight:20, textAlign:"center" },
  dialogBtns:{ flexDirection:"row", gap:10, width:"100%" },
  dialogBtn:{ flex:1, padding:12, borderRadius:10, alignItems:"center" },
});
