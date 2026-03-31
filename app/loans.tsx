// app/loans.tsx - Material leihen / zurückgeben
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore, LoanItem } from "../store";
import { useLang, t } from "../i18n";
import { RotateCcw, Package, ArrowLeft, Globe, Plus, Check, X, AlertCircle, Folder } from "lucide-react-native";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { lang } = useLang();
  const T = t(lang);
  const { loans, folders, materials, addLoan, returnLoan, changeQty } = useStore();

  const [activeTab, setActiveTab] = useState<"open"|"returned">("open");
  const [showModal, setShowModal] = useState(false);
  const [selMat, setSelMat] = useState<number | null>(null);
  const [selFrom, setSelFrom] = useState<number | null>(null);
  const [selTo, setSelTo] = useState<number | null>(null);
  const [loanQty, setLoanQty] = useState(1);

  // ── Confirm Modal (Zurückgeben) ──────────────────
  const [returnVisible, setReturnVisible] = useState(false);
  const [pendingLoan, setPendingLoan] = useState<LoanItem | null>(null);

  // ── Error Modal ──────────────────────────────────
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const openLoans = loans.filter(l => !l.returned);
  const returnedLoans = loans.filter(l => l.returned);
  const shown = activeTab === "open" ? openLoans : returnedLoans;

  const selectedMat = materials.find(m => m.id === selMat);
  const availableMats = selFrom ? materials.filter(m => m.folderId === selFrom && m.qty > 0) : [];

  const handleReturn = (loan: LoanItem) => {
    setPendingLoan(loan);
    setReturnVisible(true);
  };

  const confirmReturn = () => {
    if (!pendingLoan) return;
    returnLoan(pendingLoan.id);
    const mat = materials.find(m => m.id === pendingLoan.materialId);
    if (mat) changeQty(mat.id, pendingLoan.qty);
    setReturnVisible(false);
    setPendingLoan(null);
  };

  const handleCreate = () => {
    if (!selMat || !selFrom || !selTo) {
      setErrorMsg("Bitte alle Felder ausfüllen");
      setErrorVisible(true);
      return;
    }
    if (selFrom === selTo) {
      setErrorMsg("Von und Zu können nicht gleich sein");
      setErrorVisible(true);
      return;
    }
    const mat = materials.find(m => m.id === selMat);
    if (!mat || mat.qty < loanQty) {
      setErrorMsg("Nicht genug Bestand");
      setErrorVisible(true);
      return;
    }
    const toFolder = folders.find(f => f.id === selTo);
    addLoan({
      materialId: selMat,
      materialName: mat.name,
      fromFolderId: selFrom,
      toFolderId: selTo,
      qty: loanQty,
      unit: mat.unit,
      returnDate: "",
      note: `→ ${toFolder?.name ?? ""}`,
    });
    changeQty(selMat, -loanQty);
    setShowModal(false);
  };

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>Material leihen</Text>
          <Text style={s.headerSub}>{openLoans.length} offen · {returnedLoans.length} zurückgegeben</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { setSelMat(null); setSelFrom(null); setSelTo(null); setLoanQty(1); setShowModal(true); }}>
          <Plus size={18} color={C.text} />
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, activeTab==="open" && s.tabActive]} onPress={() => setActiveTab("open")}>
          <Text style={[s.tabText, activeTab==="open" && s.tabTextActive]}>Offen ({openLoans.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab==="returned" && s.tabActive]} onPress={() => setActiveTab("returned")}>
          <Text style={[s.tabText, activeTab==="returned" && s.tabTextActive]}>Zurück ({returnedLoans.length})</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {shown.length === 0 ? (
          <View style={s.emptyState}>
            <RotateCcw size={48} color={C.text3} />
            <Text style={s.emptyTitle}>{activeTab === "open" ? "Nichts ausgeliehen" : "Keine Rückgaben"}</Text>
            <Text style={s.emptyText}>{activeTab === "open" ? "Tippe + um Material auszuleihen" : ""}</Text>
          </View>
        ) : shown.map(loan => {
          const fromFolder = folders.find(f => f.id === loan.fromFolderId);
          const toFolder = folders.find(f => f.id === loan.toFolderId);
          return (
            <View key={loan.id} style={s.loanCard}>
              <View style={s.loanHeader}>
                <View style={[s.loanStatus, { backgroundColor: loan.returned ? "rgba(63,185,80,0.15)" : "rgba(245,166,35,0.15)" }]}>
                  <Text style={{ fontSize:10, fontWeight:"700", color: loan.returned ? C.green : C.accent }}>
                    {loan.returned ? "ZURÜCK" : "OFFEN"}
                  </Text>
                </View>
                <Text style={s.loanDate}>{loan.loanDate}</Text>
              </View>
              <Text style={s.loanName}>{loan.materialName}</Text>
              <Text style={s.loanQty}>{loan.qty} {loan.unit}</Text>
              <View style={s.loanRoute}>
                <View style={s.loanFolder}>
                  <Package size={20} color={C.accent} />
                  <Text style={s.loanFolderName}>{fromFolder?.name ?? "?"}</Text>
                </View>
                <ArrowLeft size={16} color={C.accent} style={{ marginHorizontal:8, transform:[{rotate:"180deg"}] }} />
                <View style={s.loanFolder}>
                  <Folder size={20} color={C.accent} />
                  <Text style={s.loanFolderName}>{toFolder?.name ?? "?"}</Text>
                </View>
              </View>
              {!loan.returned && (
                <TouchableOpacity style={s.returnBtn} onPress={() => handleReturn(loan)}>
                  <RotateCcw size={16} color={C.green} /><Text style={s.returnBtnText}> Als zurückgegeben markieren</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        <View style={{ height: bottomPad + 40 }} />
      </ScrollView>

      {/* ── Ausleihen Modal ── */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowModal(false)}>
          <TouchableOpacity activeOpacity={1} style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Material ausleihen</Text>

            <Text style={s.formLabel}>Von welchem Ordner?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
              <View style={{ flexDirection:"row", gap:8 }}>
                {folders.map(f => (
                  <TouchableOpacity key={f.id} onPress={() => { setSelFrom(f.id); setSelMat(null); }}
                    style={[s.folderChip, selFrom===f.id && s.folderChipActive]}>
                    <Text style={{ fontSize:11, color:selFrom===f.id?C.accent:C.text2 }}>{f.icon} {f.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {selFrom && <>
              <Text style={s.formLabel}>Welches Material?</Text>
              <ScrollView style={{ maxHeight:140, marginBottom:12 }}>
                {availableMats.map(m => (
                  <TouchableOpacity key={m.id} onPress={() => setSelMat(m.id)}
                    style={[s.matChip, selMat===m.id && s.matChipActive]}>
                    <Text style={{ fontSize:12, color:selMat===m.id?C.accent:C.text, fontWeight:"500" }}>{m.name}</Text>
                    <Text style={{ fontSize:11, color:C.text2 }}>{m.qty} {m.unit}</Text>
                  </TouchableOpacity>
                ))}
                {availableMats.length === 0 && <Text style={{ color:C.text3, fontSize:12, padding:8 }}>Kein Material mit Bestand in diesem Ordner</Text>}
              </ScrollView>
            </>}

            {selMat && <>
              <Text style={s.formLabel}>Menge</Text>
              <View style={{ flexDirection:"row", alignItems:"center", gap:16, marginBottom:12 }}>
                <TouchableOpacity style={s.qtyBtn} onPress={() => setLoanQty(Math.max(1, loanQty-1))}>
                  <Text style={{ color:C.red, fontSize:20, fontWeight:"700" }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontSize:24, fontWeight:"700", color:C.text, flex:1, textAlign:"center" }}>{loanQty} {selectedMat?.unit}</Text>
                <TouchableOpacity style={s.qtyBtn} onPress={() => setLoanQty(Math.min(selectedMat?.qty ?? 1, loanQty+1))}>
                  <Text style={{ color:C.green, fontSize:20, fontWeight:"700" }}>+</Text>
                </TouchableOpacity>
              </View>
            </>}

            <Text style={s.formLabel}>An welchen Ordner?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }}>
              <View style={{ flexDirection:"row", gap:8 }}>
                {folders.filter(f => f.id !== selFrom).map(f => (
                  <TouchableOpacity key={f.id} onPress={() => setSelTo(f.id)}
                    style={[s.folderChip, selTo===f.id && s.folderChipActive]}>
                    <Text style={{ fontSize:11, color:selTo===f.id?C.accent:C.text2 }}>{f.icon} {f.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={s.btnPrimary} onPress={handleCreate}>
              <Text style={s.btnPrimaryText}>Ausleihen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary, s.btnSec]} onPress={() => setShowModal(false)}>
              <Text style={s.btnSecText}>{T.cancel}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Zurückgeben Confirm Modal ── */}
      <Modal visible={returnVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <Text style={s.dialogTitle}>Zurückgegeben?</Text>
            <Text style={s.dialogText}>
              "{pendingLoan?.materialName}" ({pendingLoan?.qty} {pendingLoan?.unit}) zurückgegeben?
            </Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity
                style={[s.dialogBtn, { backgroundColor:C.surface2 }]}
                onPress={() => { setReturnVisible(false); setPendingLoan(null); }}>
                <Text style={{ color:C.text2, fontWeight:"600" }}>{T.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dialogBtn, { backgroundColor:C.green }]}
                onPress={confirmReturn}>
                <Text style={{ color:"#000", fontWeight:"700" }}>Ja, zurück</Text>
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
  tabRow:{ flexDirection:"row", borderBottomWidth:0.5, borderBottomColor:C.border, backgroundColor:C.surface },
  tab:{ flex:1, paddingVertical:11, alignItems:"center" },
  tabActive:{ borderBottomWidth:2, borderBottomColor:C.accent },
  tabText:{ fontSize:12, fontWeight:"500", color:C.text3 },
  tabTextActive:{ color:C.accent, fontWeight:"700" },
  content:{ flex:1, padding:14 },
  loanCard:{ backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:14, marginBottom:10 },
  loanHeader:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:8 },
  loanStatus:{ paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  loanDate:{ fontSize:11, color:C.text3 },
  loanName:{ fontSize:15, fontWeight:"700", color:C.text, marginBottom:2 },
  loanQty:{ fontSize:13, color:C.accent, fontWeight:"600", marginBottom:10 },
  loanRoute:{ flexDirection:"row", alignItems:"center", marginBottom:10 },
  loanFolder:{ alignItems:"center", gap:3 },
  loanFolderName:{ fontSize:11, color:C.text2 },
  returnBtn:{ backgroundColor:"rgba(63,185,80,0.15)", borderWidth:0.5, borderColor:"rgba(63,185,80,0.3)", borderRadius:8, padding:10, alignItems:"center", flexDirection:"row", justifyContent:"center", gap:6 },
  returnBtnText:{ color:C.green, fontWeight:"600", fontSize:13 },
  emptyState:{ alignItems:"center", paddingVertical:60, gap:12 },
  emptyTitle:{ fontSize:18, fontWeight:"700", color:C.text },
  emptyText:{ fontSize:13, color:C.text2, textAlign:"center" },
  modalOverlay:{ flex:1, backgroundColor:"rgba(0,0,0,0.7)", justifyContent:"flex-end" },
  modalSheet:{ backgroundColor:C.surface, borderTopLeftRadius:22, borderTopRightRadius:22, padding:20, paddingBottom:36, borderTopWidth:0.5, borderTopColor:C.border2 },
  modalHandle:{ width:36, height:3, backgroundColor:C.border2, borderRadius:2, alignSelf:"center", marginBottom:18 },
  modalTitle:{ fontSize:16, fontWeight:"700", color:C.text, marginBottom:14 },
  formLabel:{ fontSize:10, fontWeight:"600", color:C.text3, textTransform:"uppercase", letterSpacing:0.7, marginBottom:6 },
  folderChip:{ paddingHorizontal:12, paddingVertical:8, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:10 },
  folderChipActive:{ borderColor:C.accent, backgroundColor:C.accentBg },
  matChip:{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:8, padding:10, marginBottom:6 },
  matChipActive:{ borderColor:C.accent, backgroundColor:C.accentBg },
  qtyBtn:{ width:44, height:44, backgroundColor:C.surface2, borderRadius:22, alignItems:"center", justifyContent:"center" },
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
