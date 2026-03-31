// app/folder/[id].tsx - Ordner Detail (mit i18n)
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, SafeAreaView, KeyboardAvoidingView, Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useStore, Category } from "../../store";
import { useLang, t } from "../../i18n";
import { useProStore } from "../../proStore";
import ProGate from "../../components/ProGate";
import { Package, ChevronLeft, Trash2, KeyRound } from "lucide-react-native";
import Swipeable from "react-native-gesture-handler/Swipeable";

const C = {
  bg: "#0d1117", surface: "#161b22", surface2: "#21262d", surface3: "#2d333b",
  border: "rgba(255,255,255,0.08)", border2: "rgba(255,255,255,0.14)",
  accent: "#f5a623", accentBg: "rgba(245,166,35,0.12)",
  green: "#3fb950", red: "#f85149",
  text: "#e6edf3", text2: "#8b949e", text3: "#6e7681",
};

const UNITS = ["m", "Stk", "Pkg", "Rolle", "kg", "Liter"];

function stockStatus(qty: number, min: number, T: any) {
  if (qty === 0) return { label: T.statusOut, color: C.red, bg: "rgba(248,81,73,0.15)" };
  if (qty < min) return { label: T.statusLow, color: C.accent, bg: "rgba(245,166,35,0.15)" };
  return { label: T.statusOk, color: C.green, bg: "rgba(63,185,80,0.15)" };
}

// ── PIN-Pad Komponente ────────────────────────────────────────────────────────
function PinPad({ pin, onDigit, onDelete }: { pin: string; onDigit: (d: string) => void; onDelete: () => void }) {
  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
  return (
    <View>
      {/* Punkte */}
      <View style={{ flexDirection:"row", justifyContent:"center", gap:14, marginBottom:20 }}>
        {[0,1,2,3].map(i => (
          <View key={i} style={{
            width:14, height:14, borderRadius:7,
            backgroundColor: pin.length > i ? C.accent : C.surface3,
            borderWidth: 1.5, borderColor: pin.length > i ? C.accent : C.border2,
          }}/>
        ))}
      </View>
      {/* Grid */}
      <View style={{ flexDirection:"row", flexWrap:"wrap", gap:10 }}>
        {digits.map((d, i) => (
          <TouchableOpacity key={i} style={{
            width:"30%", paddingVertical:14, borderRadius:10,
            backgroundColor: d === "" ? "transparent" : C.surface2,
            borderWidth: d === "" ? 0 : 0.5, borderColor: C.border2,
            alignItems:"center", justifyContent:"center",
          }} onPress={() => {
            if (d === "") return;
            if (d === "⌫") onDelete();
            else if (pin.length < 4) onDigit(d);
          }} disabled={d === ""}>
            <Text style={{ fontSize:18, fontWeight:"600", color: d === "⌫" ? C.text2 : C.text }}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useLang();
  const T = t(lang);
  const isPro = useProStore(s => s.isPro);
  const { folders, materials, addMaterial, deleteMaterial, deleteFolder } = useStore();

  const folderId = parseInt(id ?? "0");
  const folder = folders.find(f => f.id === folderId);
  const folderMaterials = materials.filter(m => m.folderId === folderId);

  const [catFilter, setCatFilter] = useState<string>("all");
  const [showProGate, setShowProGate] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Ordner löschen (PIN) ──────────────────────────────────────────────────
  const [showFolderDeleteModal, setShowFolderDeleteModal] = useState(false);
  const [folderDeletePin, setFolderDeletePin] = useState("");
  const [folderDeleteError, setFolderDeleteError] = useState("");

  // ── Material löschen (PIN) ────────────────────────────────────────────────
  const [pendingDeleteMatId, setPendingDeleteMatId] = useState<number | null>(null);
  const [showMatDeleteModal, setShowMatDeleteModal] = useState(false);
  const [matDeletePin, setMatDeletePin] = useState("");
  const [matDeleteError, setMatDeleteError] = useState("");

  const [matName, setMatName] = useState("");
  const [matQty, setMatQty] = useState("0");
  const [matUnit, setMatUnit] = useState("Stk");
  const [matCat, setMatCat] = useState<Category>("kabel");
  const [matMin, setMatMin] = useState("10");
  const [matPrice, setMatPrice] = useState("0");
  const [matNote, setMatNote] = useState("");

  const CATEGORIES: { value: Category; label: string }[] = [
    { value: "kabel", label: T.cable }, { value: "sicherung", label: T.fuse },
    { value: "steckdose", label: T.socket }, { value: "schalter", label: T.switch },
    { value: "verteiler", label: T.distributor }, { value: "leitung", label: T.line },
    { value: "werkzeug", label: T.tool }, { value: "sonstiges", label: T.other },
  ];

  const categories = [...new Set(folderMaterials.map(m => m.cat))];
  const filtered = catFilter === "all" ? folderMaterials : folderMaterials.filter(m => m.cat === catFilter);

  // ── Add Material ─────────────────────────────────────────────────────────
  const openAdd = () => {
    if (!isPro && materials.length >= 200) { setShowProGate(true); return; }
    setMatName(""); setMatQty("0"); setMatUnit("Stk"); setMatCat("kabel");
    setMatMin("10"); setMatPrice("0"); setMatNote("");
    setShowAddModal(true);
  };

  const saveAdd = () => {
    if (!matName.trim()) { Alert.alert(T.required, T.enterName); return; }
    addMaterial({
      name: matName.trim(), qty: parseFloat(matQty) || 0,
      unit: matUnit, cat: matCat, folderId,
      min: parseFloat(matMin) || 10, price: parseFloat(matPrice) || 0, note: matNote.trim(),
    });
    setShowAddModal(false);
  };

  // ── Ordner löschen ────────────────────────────────────────────────────────
  const handleDeleteFolderPress = () => {
    setFolderDeletePin("");
    setFolderDeleteError("");
    setShowFolderDeleteModal(true);
  };

  const onFolderPinDigit = async (d: string) => {
    const next = folderDeletePin + d;
    setFolderDeletePin(next);
    if (next.length === 4) {
      const savedPin = await AsyncStorage.getItem("eg-app-pin");
      if (!savedPin || next === savedPin) {
        setShowFolderDeleteModal(false);
        deleteFolder(folderId);
        router.back();
      } else {
        setFolderDeleteError("Falscher PIN");
        setTimeout(() => { setFolderDeletePin(""); setFolderDeleteError(""); }, 800);
      }
    }
  };

  // ── Material löschen ──────────────────────────────────────────────────────
  const requestDeleteMaterial = (matId: number) => {
    setPendingDeleteMatId(matId);
    setMatDeletePin("");
    setMatDeleteError("");
    setShowMatDeleteModal(true);
  };

  const onMatPinDigit = async (d: string) => {
    const next = matDeletePin + d;
    setMatDeletePin(next);
    if (next.length === 4) {
      const savedPin = await AsyncStorage.getItem("eg-app-pin");
      if (!savedPin || next === savedPin) {
        if (pendingDeleteMatId !== null) deleteMaterial(pendingDeleteMatId);
        setShowMatDeleteModal(false);
        setPendingDeleteMatId(null);
      } else {
        setMatDeleteError("Falscher PIN");
        setTimeout(() => { setMatDeletePin(""); setMatDeleteError(""); }, 800);
      }
    }
  };

  if (!folder) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.text2 }}>{T.folder}...</Text>
      </View>
    );
  }

  const pendingMat = pendingDeleteMatId !== null ? materials.find(m => m.id === pendingDeleteMatId) : null;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{folder.name}</Text>
          <Text style={s.headerSub}>{folderMaterials.length} {folderMaterials.length !== 1 ? T.materials : T.material}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={openAdd}>
          <Text style={s.addBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.addBtn, { marginLeft: 6, backgroundColor:"rgba(248,81,73,0.12)", borderColor:"rgba(248,81,73,0.3)" }]} onPress={handleDeleteFolderPress}>
          <Trash2 size={16} color={C.red} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow} contentContainerStyle={{ paddingHorizontal: 14, gap: 7 }}>
        <TouchableOpacity style={[s.chip, catFilter === "all" && s.chipActive]} onPress={() => setCatFilter("all")}>
          <Text style={[s.chipText, catFilter === "all" && s.chipTextActive]}>Alle</Text>
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity key={c} style={[s.chip, catFilter === c && s.chipActive]} onPress={() => setCatFilter(c)}>
            <Text style={[s.chipText, catFilter === c && s.chipTextActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.sectionLabel}>{T.stock} ({filtered.length})</Text>

        {filtered.length === 0 ? (
          <View style={s.emptyState}>
            <Package size={36} color={C.text3} />
            <Text style={s.emptyText}>{T.addMaterial}</Text>
          </View>
        ) : filtered.map(m => {
          const st = stockStatus(m.qty, m.min, T);
          return (
            <Swipeable key={m.id} renderRightActions={() => (
              <TouchableOpacity
                style={{ backgroundColor: C.red, justifyContent: "center", alignItems: "center", width: 72, borderRadius: 12, marginBottom: 8 }}
                onPress={() => requestDeleteMaterial(m.id)}>
                <Trash2 size={20} color="#fff" />
              </TouchableOpacity>
            )}>
              <TouchableOpacity style={s.matCard} onPress={() => router.push(`/material/${m.id}`)}>
                <View style={[s.matIcon, { backgroundColor: C.accentBg }]}>
                  <Package size={18} color={C.accent} />
                </View>
                <View style={s.matInfo}>
                  <Text style={s.matName}>{m.name}</Text>
                  <View style={s.matMeta}>
                    <View style={[s.badge, { backgroundColor: st.bg }]}>
                      <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Text style={s.metaText}>{T.minStock}: {m.min} {m.unit}</Text>
                    {m.price > 0 && <Text style={s.metaText}>€{(m.qty * m.price).toFixed(0)}</Text>}
                  </View>
                </View>
                <View style={s.matQty}>
                  <Text style={s.matQtyNum}>{m.qty}</Text>
                  <Text style={s.matQtyUnit}>{m.unit}</Text>
                </View>
              </TouchableOpacity>
            </Swipeable>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      <ProGate visible={showProGate} onClose={() => setShowProGate(false)} feature="material" />

      {/* ── ORDNER LÖSCHEN (PIN) ── */}
      <Modal visible={showFolderDeleteModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.pinBox}>
            <View style={{ flexDirection:"row", alignItems:"center", gap:8, marginBottom:4 }}>
              <KeyRound size={18} color={C.red} />
              <Text style={s.pinTitle}>Ordner löschen</Text>
            </View>
            <Text style={s.pinSub}>"{folder?.name}" und alle Materialien werden gelöscht</Text>
            <PinPad
              pin={folderDeletePin}
              onDigit={onFolderPinDigit}
              onDelete={() => setFolderDeletePin(p => p.slice(0,-1))}
            />
            {folderDeleteError ? <Text style={s.pinError}>{folderDeleteError}</Text> : null}
            <TouchableOpacity style={s.cancelBtn} onPress={() => setShowFolderDeleteModal(false)}>
              <Text style={s.cancelBtnText}>{T.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MATERIAL LÖSCHEN (PIN) ── */}
      <Modal visible={showMatDeleteModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={s.pinBox}>
            <View style={{ flexDirection:"row", alignItems:"center", gap:8, marginBottom:4 }}>
              <KeyRound size={18} color={C.red} />
              <Text style={s.pinTitle}>Material löschen</Text>
            </View>
            <Text style={s.pinSub}>"{pendingMat?.name}" wird gelöscht</Text>
            <PinPad
              pin={matDeletePin}
              onDigit={onMatPinDigit}
              onDelete={() => setMatDeletePin(p => p.slice(0,-1))}
            />
            {matDeleteError ? <Text style={s.pinError}>{matDeleteError}</Text> : null}
            <TouchableOpacity style={s.cancelBtn} onPress={() => { setShowMatDeleteModal(false); setPendingDeleteMatId(null); }}>
              <Text style={s.cancelBtnText}>{T.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MATERIAL HINZUFÜGEN ── */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
            <TouchableOpacity activeOpacity={1} style={s.modalSheet}>
              <View style={s.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={s.modalTitle}>{T.addMaterial}</Text>

                <Text style={s.formLabel}>{T.name}</Text>
                <TextInput style={s.formInput} placeholder={`${T.eg} NYM-J 3x1,5`} placeholderTextColor={C.text3} value={matName} onChangeText={setMatName} />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>{T.stock}</Text>
                    <TextInput style={s.formInput} keyboardType="numeric" value={matQty} onChangeText={setMatQty} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>{T.unit}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {UNITS.map(u => (
                          <TouchableOpacity key={u} onPress={() => setMatUnit(u)} style={[s.unitChip, matUnit === u && s.unitChipActive]}>
                            <Text style={{ fontSize: 11, color: matUnit === u ? C.accent : C.text2 }}>{u}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>

                <Text style={s.formLabel}>{T.category}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {CATEGORIES.map(c => (
                    <TouchableOpacity key={c.value} onPress={() => setMatCat(c.value)} style={[s.catChip, matCat === c.value && s.catChipActive]}>
                      <Text style={{ fontSize: 11, color: matCat === c.value ? C.accent : C.text2 }}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>{T.minStockAlarm}</Text>
                    <TextInput style={s.formInput} keyboardType="numeric" value={matMin} onChangeText={setMatMin} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formLabel}>{T.pricePerUnit}</Text>
                    <TextInput style={s.formInput} keyboardType="decimal-pad" value={matPrice} onChangeText={setMatPrice} />
                  </View>
                </View>

                <Text style={s.formLabel}>{T.note}</Text>
                <TextInput style={s.formInput} placeholder={`${T.eg} Lieferant...`} placeholderTextColor={C.text3} value={matNote} onChangeText={setMatNote} />

                <TouchableOpacity style={s.btnPrimary} onPress={saveAdd}>
                  <Text style={s.btnPrimaryText}>{T.addMaterial}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.btnPrimary, s.btnSecondary]} onPress={() => setShowAddModal(false)}>
                  <Text style={s.btnSecondaryText}>{T.cancel}</Text>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: C.border },
  backBtn: { width: 32, height: 32, backgroundColor: C.surface2, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  headerSub: { fontSize: 10, color: C.text2, marginTop: 1 },
  addBtn: { width: 34, height: 34, backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.border2, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addBtnText: { fontSize: 22, color: C.text, fontWeight: "700", lineHeight: 26 },
  chipRow: { paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.border },
  chip: { paddingHorizontal: 13, paddingVertical: 5, borderRadius: 20, backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.border2 },
  chipActive: { backgroundColor: C.accentBg, borderColor: C.accent },
  chipText: { fontSize: 11, fontWeight: "500", color: C.text2 },
  chipTextActive: { color: C.accent },
  content: { flex: 1, padding: 14 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: C.text3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  matCard: { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border2, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  matIcon: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  matInfo: { flex: 1, minWidth: 0 },
  matName: { fontSize: 13, fontWeight: "600", color: C.text, marginBottom: 3 },
  matMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: "600" },
  metaText: { fontSize: 11, color: C.text2 },
  matQty: { alignItems: "flex-end" },
  matQtyNum: { fontSize: 17, fontWeight: "700", color: C.text },
  matQtyUnit: { fontSize: 10, color: C.text3 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 13, color: C.text3, textAlign: "center", lineHeight: 20 },
  // PIN Modal
  overlay: { flex:1, backgroundColor:"rgba(0,0,0,0.8)", justifyContent:"center", alignItems:"center", padding:24 },
  pinBox: { width:"100%", maxWidth:320, backgroundColor:C.surface, borderRadius:18, padding:24, borderWidth:0.5, borderColor:C.border2 },
  pinTitle: { fontSize:16, fontWeight:"700", color:C.text },
  pinSub: { fontSize:12, color:C.text2, marginBottom:20, lineHeight:18 },
  pinError: { fontSize:12, color:C.red, textAlign:"center", marginTop:12 },
  cancelBtn: { marginTop:16, backgroundColor:C.surface3, borderRadius:10, padding:12, alignItems:"center" },
  cancelBtnText: { fontSize:14, fontWeight:"600", color:C.text2 },
  // Add Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 20, borderTopWidth: 0.5, borderTopColor: C.border2, maxHeight: "92%" },
  modalHandle: { width: 34, height: 3, backgroundColor: C.border2, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 14 },
  formLabel: { fontSize: 10, fontWeight: "600", color: C.text3, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 5 },
  formInput: { backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.border2, borderRadius: 8, padding: 10, fontSize: 13, color: C.text, marginBottom: 12 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.border2, borderRadius: 8 },
  unitChipActive: { borderColor: C.accent, backgroundColor: C.accentBg },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.surface2, borderWidth: 0.5, borderColor: C.border2, borderRadius: 8 },
  catChipActive: { borderColor: C.accent, backgroundColor: C.accentBg },
  btnPrimary: { backgroundColor: C.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 6 },
  btnPrimaryText: { color: "#000", fontWeight: "700", fontSize: 14 },
  btnSecondary: { backgroundColor: C.surface3, marginTop: 8 },
  btnSecondaryText: { color: C.text2, fontWeight: "500", fontSize: 14 },
});
