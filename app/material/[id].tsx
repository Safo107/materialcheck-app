// app/material/[id].tsx - Material Detail mit QR Code + Seriennummer + Garantie
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform,
  Share,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useStore, Category } from "../../store";
import { useLang, t } from "../../i18n";
import { useProStore } from "../../proStore";
import ProGate from "../../components/ProGate";
import { useTheme } from "../../theme";
import { Package, ArrowLeft, Edit2, Trash2, Plus, Minus, Tag, Folder, AlertTriangle, Check, Hash, QrCode, ChevronRight } from "lucide-react-native";

const CAT_ICONS: Record<string,string> = {
  kabel:"", sicherung:"", steckdose:"", schalter:"",
  verteiler:"", leitung:"", werkzeug:"", sonstiges:"",
};
const UNITS = ["m","Stk","Pkg","Rolle","kg","Liter"];

function stockStatus(qty:number, min:number, colors:any, T:any) {
  if (qty===0) return { label:T.statusOut, color:colors.red, bg:"rgba(248,81,73,0.15)" };
  if (qty<min) return { label:T.statusLow, color:colors.accent, bg:"rgba(245,166,35,0.15)" };
  return { label:T.statusOk, color:colors.green, bg:"rgba(63,185,80,0.15)" };
}

export default function MaterialScreen() {
  const { id } = useLocalSearchParams<{ id:string }>();
  const router = useRouter();
  const { lang } = useLang();
  const T = t(lang);
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { colors: C, isDark } = useTheme();
  const isPro = useProStore(s => s.isPro);

  const { materials, folders, addMaterial, updateMaterial, deleteMaterial, changeQty, setQty, moveMaterial } = useStore();

  const isNew = id==="new";
  const mat = isNew ? null : materials.find(m=>m.id===parseInt(id??"0"));

  const [editing, setEditing] = useState(isNew);
  const [name, setName] = useState(mat?.name??"");
  const [qty, setQtyInput] = useState(String(mat?.qty??"0"));
  const [unit, setUnit] = useState(mat?.unit??"Stk");
  const [cat, setCat] = useState<Category>(mat?.cat??"kabel");
  const [folderId, setFolderId] = useState(mat?.folderId??folders[0]?.id??1);
  const [min, setMin] = useState(String(mat?.min??"10"));
  const [price, setPrice] = useState(String(mat?.price??"0"));
  const [note, setNote] = useState(mat?.note??"");
  const [serialNumber, setSerialNumber] = useState(mat?.serialNumber??"");
  const [warrantyDate, setWarrantyDate] = useState(mat?.warrantyDate??"");
  const [customQty, setCustomQty] = useState("");
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProGate, setShowProGate] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalMsg, setInfoModalMsg] = useState("");
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const CATEGORIES: { value:Category; label:string }[] = [
    { value:"kabel", label:T.cable },{ value:"sicherung", label:T.fuse },
    { value:"steckdose", label:T.socket },{ value:"schalter", label:T.switch },
    { value:"verteiler", label:T.distributor },{ value:"leitung", label:T.line },
    { value:"werkzeug", label:T.tool },{ value:"sonstiges", label:T.other },
  ];

  useEffect(() => {
    if (mat) {
      setName(mat.name); setQtyInput(String(mat.qty)); setUnit(mat.unit);
      setCat(mat.cat); setFolderId(mat.folderId); setMin(String(mat.min));
      setPrice(String(mat.price)); setNote(mat.note);
      setSerialNumber(mat.serialNumber??""); setWarrantyDate(mat.warrantyDate??"");
    }
  }, [id]);

  const handleSave = () => {
    if (!name.trim()) { setInfoModalMsg(`${T.required}: ${T.enterName}`); setInfoModalVisible(true); return; }
    const data = { name:name.trim(), qty:parseFloat(qty)||0, unit, cat, folderId, min:parseFloat(min)||10, price:parseFloat(price)||0, note, serialNumber:serialNumber.trim(), warrantyDate:warrantyDate.trim() };
    if (isNew) { addMaterial(data); router.back(); }
    else if (mat) { updateMaterial(mat.id, data); setEditing(false); }
  };

  const handleDelete = () => {
    if (!mat) return;
    setDeleteConfirmVisible(true);
  };

  const handleApplyQty = () => {
    if (!mat) return;
    const v = parseFloat(customQty);
    if (isNaN(v)||v<0) return;
    setQty(mat.id, Math.round(v));
    setCustomQty("");
  };

  const shareQRInfo = async () => {
    if (!mat) return;
    const currentMat = materials.find(m=>m.id===mat.id)??mat;
    const folder = folders.find(f=>f.id===currentMat.folderId);
    const text = `ElektroGenius MaterialCheck\n\n${currentMat.name}\n${folder?.name??""}\nBestand: ${currentMat.qty} ${currentMat.unit}\n${currentMat.serialNumber?`S/N: ${currentMat.serialNumber}\n`:""}\nID: material-${currentMat.id}\n\nhttps://elektrogenius.de`;
    try { await Share.share({ message:text }); } catch {}
  };

  // ── EDIT VIEW ────────────────────────────────────
  if (editing||isNew) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor:C.bg }]} edges={["top","left","right"]}>
        <View style={[s.header, { borderBottomColor:C.border }]}>
          <TouchableOpacity style={[s.backBtn, { backgroundColor:C.surface2 }]} onPress={()=>isNew?router.back():setEditing(false)}>
            <ArrowLeft size={18} color={C.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color:C.text }]}>{isNew?T.addMaterial:T.edit}</Text>
        </View>
        <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":undefined} style={{ flex:1 }}>
          <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:bottomPad+20 }}>
            <Text style={[s.formLabel, { color:C.text3 }]}>{T.name}</Text>
            <TextInput style={[s.formInput, { backgroundColor:C.surface2, borderColor:C.border2, color:C.text }]} placeholder={`${T.eg} NYM-J 3x1,5`} placeholderTextColor={C.text3} value={name} onChangeText={setName} autoFocus={isNew}/>

            <View style={{ flexDirection:"row", gap:10 }}>
              <View style={{ flex:1 }}>
                <Text style={[s.formLabel, { color:C.text3 }]}>{T.stock}</Text>
                <TextInput style={[s.formInput, { backgroundColor:C.surface2, borderColor:C.border2, color:C.text }]} keyboardType="numeric" value={qty} onChangeText={setQtyInput}/>
              </View>
              <View style={{ flex:1 }}>
                <Text style={[s.formLabel, { color:C.text3 }]}>{T.unit}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection:"row", gap:5 }}>
                    {UNITS.map(u=>(
                      <TouchableOpacity key={u} onPress={()=>setUnit(u)} style={[s.chip, { backgroundColor:C.surface2, borderColor: unit===u?C.accent:C.border2 }, unit===u&&{ backgroundColor:C.accentBg }]}>
                        <Text style={{ fontSize:11, color:unit===u?C.accent:C.text2 }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            <Text style={[s.formLabel, { color:C.text3 }]}>{T.category}</Text>
            <View style={{ flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:12 }}>
              {CATEGORIES.map(c=>(
                <TouchableOpacity key={c.value} onPress={()=>setCat(c.value)} style={[s.chip, { backgroundColor:C.surface2, borderColor:cat===c.value?C.accent:C.border2 }, cat===c.value&&{ backgroundColor:C.accentBg }]}>
                  <Text style={{ fontSize:11, color:cat===c.value?C.accent:C.text2 }}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.formLabel, { color:C.text3 }]}>{T.folder}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
              <View style={{ flexDirection:"row", gap:6 }}>
                {folders.map(f=>(
                  <TouchableOpacity key={f.id} onPress={()=>setFolderId(f.id)} style={[s.chip, { backgroundColor:C.surface2, borderColor:folderId===f.id?C.accent:C.border2 }, folderId===f.id&&{ backgroundColor:C.accentBg }]}>
                    <Text style={{ fontSize:11, color:folderId===f.id?C.accent:C.text2 }}>{f.icon} {f.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={{ flexDirection:"row", gap:10 }}>
              <View style={{ flex:1 }}>
                <Text style={[s.formLabel, { color:C.text3 }]}>{T.minStockAlarm}</Text>
                <TextInput style={[s.formInput, { backgroundColor:C.surface2, borderColor:C.border2, color:C.text }]} keyboardType="numeric" value={min} onChangeText={setMin}/>
              </View>
              <View style={{ flex:1 }}>
                <Text style={[s.formLabel, { color:C.text3 }]}>{T.pricePerUnit}</Text>
                <TextInput style={[s.formInput, { backgroundColor:C.surface2, borderColor:C.border2, color:C.text }]} keyboardType="decimal-pad" value={price} onChangeText={setPrice}/>
              </View>
            </View>

            {/* NEU: Seriennummer */}
            <Text style={[s.formLabel, { color:C.text3 }]}>Seriennummer (optional)</Text>
            <TextInput style={[s.formInput, { backgroundColor:C.surface2, borderColor:C.border2, color:C.text }]} placeholder="z.B. SN-2024-001234" placeholderTextColor={C.text3} value={serialNumber} onChangeText={setSerialNumber}/>

            {/* NEU: Garantiedatum */}
            <Text style={[s.formLabel, { color:C.text3 }]}>Garantie bis (optional)</Text>
            <TextInput style={[s.formInput, { backgroundColor:C.surface2, borderColor:C.border2, color:C.text }]} placeholder="z.B. 2026-12-31" placeholderTextColor={C.text3} value={warrantyDate} onChangeText={setWarrantyDate}/>

            <Text style={[s.formLabel, { color:C.text3 }]}>{T.note}</Text>
            <TextInput style={[s.formInput, { backgroundColor:C.surface2, borderColor:C.border2, color:C.text }]} placeholder={`${T.eg} Lieferant...`} placeholderTextColor={C.text3} value={note} onChangeText={setNote}/>

            <TouchableOpacity style={[s.btnPrimary, { backgroundColor:C.accent }]} onPress={handleSave}>
              <Text style={s.btnPrimaryText}>{isNew?T.addMaterial:T.save}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary, { backgroundColor:C.surface3, marginTop:8 }]} onPress={()=>isNew?router.back():setEditing(false)}>
              <Text style={[s.btnPrimaryText, { color:C.text2 }]}>{T.cancel}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (!mat) return (
    <View style={{ flex:1, backgroundColor:C.bg, alignItems:"center", justifyContent:"center" }}>
      <Text style={{ color:C.text2 }}>{T.material}...</Text>
    </View>
  );

  const currentMat = materials.find(m=>m.id===mat.id)??mat;
  const st = stockStatus(currentMat.qty, currentMat.min, C, T);
  const folder = folders.find(f=>f.id===currentMat.folderId);
  const value = (currentMat.qty*(currentMat.price||0)).toFixed(2);
  const qrData = `materialcheck://material/${currentMat.id}|${currentMat.name}|${currentMat.qty}|${currentMat.unit}`;

  // Garantie prüfen
  const warrantyExpired = currentMat.warrantyDate && new Date(currentMat.warrantyDate) < new Date();
  const warrantyExpiringSoon = currentMat.warrantyDate && !warrantyExpired && new Date(currentMat.warrantyDate) <= new Date(Date.now() + 30*24*60*60*1000);

  return (
    <SafeAreaView style={[s.container, { backgroundColor:C.bg }]} edges={["top","left","right"]}>
      <View style={[s.header, { borderBottomColor:C.border }]}>
        <TouchableOpacity style={[s.backBtn, { backgroundColor:C.surface2 }]} onPress={()=>router.back()}>
          <ArrowLeft size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color:C.text }]} numberOfLines={1}>{currentMat.name}</Text>
        <TouchableOpacity style={[s.iconBtn, { backgroundColor:C.surface2 }]} onPress={()=>{ if (!isPro) { setShowProGate(true); return; } setShowQRModal(true); }}>
          <QrCode size={18} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.iconBtn, { backgroundColor:C.surface2 }]} onPress={()=>setShowMoveModal(true)}>
          <Folder size={16} color={C.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:bottomPad+20 }}>

        {/* Garantie Warnung */}
        {warrantyExpired && (
          <View style={s.warrantyBad}>
            <AlertTriangle size={16} color="#f85149" />
            <Text style={s.warrantyBadText}>Garantie abgelaufen! ({currentMat.warrantyDate})</Text>
          </View>
        )}
        {warrantyExpiringSoon && (
          <View style={s.warrantyWarn}>
            <AlertTriangle size={16} color="#f5a623" />
            <Text style={s.warrantyWarnText}>Garantie läuft bald ab! ({currentMat.warrantyDate})</Text>
          </View>
        )}

        {/* Menge */}
        <View style={s.qtyCenter}>
          <Package size={52} color={C.accent} style={{ marginBottom:4 }} />
          <View style={s.qtyControl}>
            <TouchableOpacity style={[s.qtyBtn, { backgroundColor:C.surface2, borderColor:C.border2 }]} onPress={()=>changeQty(currentMat.id,-1)}>
              <Text style={[s.qtyBtnMinus, { color:C.red }]}>−</Text>
            </TouchableOpacity>
            <Text style={[s.qtyDisplay, { color:C.text }]}>{currentMat.qty}</Text>
            <TouchableOpacity style={[s.qtyBtn, { backgroundColor:C.surface2, borderColor:C.border2 }]} onPress={()=>changeQty(currentMat.id,1)}>
              <Text style={[s.qtyBtnPlus, { color:C.green }]}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[s.qtySub, { color:C.text2 }]}>{currentMat.unit} {T.stock.toLowerCase()}</Text>
          <View style={s.customQtyRow}>
            <TextInput style={[s.customQtyInput, { backgroundColor:C.surface2, borderColor:C.border2, color:C.text }]} placeholder={T.setAmount} placeholderTextColor={C.text3} keyboardType="numeric" value={customQty} onChangeText={setCustomQty}/>
            <TouchableOpacity style={[s.customQtyApply, { backgroundColor:C.accent }]} onPress={handleApplyQty}>
              <Text style={{ color:"#000", fontWeight:"700", fontSize:12 }}>{T.setAmount}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Details */}
        <View style={[s.detailSection, { backgroundColor:C.surface, borderColor:C.border2 }]}>
          <View style={[s.detailRow, { borderBottomColor:C.border }]}>
            <Text style={[s.detailKey, { color:C.text2 }]}>{T.category}</Text>
            <View style={s.tag}><Text style={s.tagText}>{currentMat.cat}</Text></View>
          </View>
          <View style={[s.detailRow, { borderBottomColor:C.border }]}>
            <Text style={[s.detailKey, { color:C.text2 }]}>{T.folder}</Text>
            <Text style={[s.detailVal, { color:C.text }]} numberOfLines={1}>{folder?folder.name:"–"}</Text>
          </View>
          <View style={[s.detailRow, { borderBottomColor:C.border }]}>
            <Text style={[s.detailKey, { color:C.text2 }]}>{T.minStock}</Text>
            <Text style={[s.detailVal, { color:C.text }]}>{currentMat.min} {currentMat.unit}</Text>
          </View>
          <View style={[s.detailRow, { borderBottomColor:C.border }]}>
            <Text style={[s.detailKey, { color:C.text2 }]}>{T.status}</Text>
            <View style={[s.statusBadge, { backgroundColor:st.bg }]}><Text style={[s.statusText, { color:st.color }]}>{st.label}</Text></View>
          </View>
          {currentMat.price>0&&<>
            <View style={[s.detailRow, { borderBottomColor:C.border }]}>
              <Text style={[s.detailKey, { color:C.text2 }]}>{T.price}</Text>
              <Text style={[s.detailVal, { color:C.text }]}>€ {Number(currentMat.price).toFixed(2)}</Text>
            </View>
            <View style={[s.detailRow, { borderBottomColor:C.border }]}>
              <Text style={[s.detailKey, { color:C.text2 }]}>{T.value}</Text>
              <Text style={[s.detailVal, { color:C.accent, fontWeight:"700" }]}>€ {value}</Text>
            </View>
          </>}
          {currentMat.serialNumber&&(
            <View style={[s.detailRow, { borderBottomColor:C.border }]}>
              <Text style={[s.detailKey, { color:C.text2 }]}>Seriennummer</Text>
              <Text style={[s.detailVal, { color:C.text }]}>{currentMat.serialNumber}</Text>
            </View>
          )}
          {currentMat.warrantyDate&&(
            <View style={[s.detailRow, { borderBottomColor:C.border }]}>
              <Text style={[s.detailKey, { color:C.text2 }]}>Garantie bis</Text>
              <Text style={[s.detailVal, { color:warrantyExpired?C.red:warrantyExpiringSoon?C.accent:C.green, fontWeight:"600" }]}>
                {currentMat.warrantyDate}
              </Text>
            </View>
          )}
          {currentMat.note?(
            <View style={[s.detailRow, { borderBottomColor:C.border }]}>
              <Text style={[s.detailKey, { color:C.text2 }]}>{T.note}</Text>
              <Text style={[s.detailVal, { color:C.text2, flex:1, textAlign:"right" }]} numberOfLines={2}>{currentMat.note}</Text>
            </View>
          ):null}
          <View style={[s.detailRow, { borderBottomColor:"transparent" }]}>
            <Text style={[s.detailKey, { color:C.text2 }]}>{T.added}</Text>
            <Text style={[s.detailVal, { color:C.text }]}>{currentMat.added}</Text>
          </View>
        </View>

        {/* Aktionen */}
        <View style={{ flexDirection:"row", gap:10, marginTop:8 }}>
          <TouchableOpacity style={[s.btnPrimary, { flex:1, backgroundColor:C.surface2 }]} onPress={()=>setEditing(true)}>
            <Text style={[s.btnPrimaryText, { color:C.text }]}>{T.edit}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, { flex:0.6, backgroundColor:"rgba(248,81,73,0.12)" }]} onPress={handleDelete}>
            <Trash2 size={16} color={C.red} />
          </TouchableOpacity>
        </View>

        {/* QR Code Button */}
        <TouchableOpacity style={[s.qrBtn, { backgroundColor:C.surface, borderColor:"rgba(163,113,247,0.3)" }]} onPress={()=>{ if (!isPro) { setShowProGate(true); return; } setShowQRModal(true); }}>
          <QrCode size={20} color={"#a371f7"} />
          <View style={{ flex:1 }}>
            <Text style={[s.qrBtnTitle, { color:"#a371f7" }]}>QR Code anzeigen</Text>
            <Text style={[s.qrBtnSub, { color:C.text2 }]}>Ausdrucken & ans Regal kleben</Text>
          </View>
          <ChevronRight size={16} color={C.text3} />
        </TouchableOpacity>

      </ScrollView>

      <ProGate visible={showProGate} onClose={() => setShowProGate(false)} feature="qr" />

      {/* QR CODE MODAL */}
      <Modal visible={showQRModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowQRModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet, { backgroundColor:C.surface, paddingBottom:bottomPad+20 }]}>
            <View style={[s.modalHandle, { backgroundColor:C.border2 }]}/>
            <Text style={[s.modalTitle, { color:C.text }]}>QR Code</Text>

            {/* QR Code Karte */}
            <View style={[s.qrCard, { backgroundColor: isDark?"#fff":"#f8f8f8" }]}>
              <QRCode
                value={qrData}
                size={180}
                color="#000000"
                backgroundColor="#ffffff"
              />
              <View style={s.qrInfo}>
                <Text style={s.qrMatName}>{currentMat.name}</Text>
                <Text style={s.qrMatDetail}>{folder?.icon} {folder?.name} · {currentMat.qty} {currentMat.unit}</Text>
                {currentMat.serialNumber&&<Text style={s.qrMatDetail}>S/N: {currentMat.serialNumber}</Text>}
                <Text style={s.qrBrand}>ElektroGenius MaterialCheck</Text>
              </View>
            </View>

            <Text style={[s.qrHint, { color:C.text2 }]}>Scanne mit der App — direkt zum Material</Text>

            <TouchableOpacity style={[s.btnPrimary, { backgroundColor:C.accent, marginTop:16 }]} onPress={shareQRInfo}>
              <Text style={s.btnPrimaryText}>Material-Info teilen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary, { backgroundColor:C.surface3, marginTop:8 }]} onPress={()=>setShowQRModal(false)}>
              <Text style={[s.btnPrimaryText, { color:C.text2 }]}>{T.cancel}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MOVE MODAL */}
      <Modal visible={showMoveModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowMoveModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet, { backgroundColor:C.surface, paddingBottom:bottomPad+16 }]}>
            <View style={[s.modalHandle, { backgroundColor:C.border2 }]}/>
            <Text style={[s.modalTitle, { color:C.text }]}>{T.moveMaterial}</Text>
            {folders.map(f=>(
              <TouchableOpacity key={f.id} style={[s.moveOption, { borderBottomColor:C.border }]}
                onPress={()=>{ moveMaterial(currentMat.id,f.id); setShowMoveModal(false); }}>
                <Folder size={22} color={f.id===currentMat.folderId?C.accent:C.text2} />
                <Text style={[s.moveOptionText, { color:f.id===currentMat.folderId?C.accent:C.text }]}>
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.btnPrimary, { backgroundColor:C.surface3, marginTop:12 }]} onPress={()=>setShowMoveModal(false)}>
              <Text style={[s.btnPrimaryText, { color:C.text2 }]}>{T.cancel}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* INFO MODAL */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <View style={{ position:"absolute", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.75)", alignItems:"center", justifyContent:"center" }}>
          <View style={{ width:"85%", maxWidth:320, backgroundColor:C.surface, borderRadius:14, padding:20, borderWidth:0.5, borderColor:"rgba(255,255,255,0.14)", alignItems:"center" }}>
            <Text style={{ fontSize:13, color:C.text2, marginBottom:16, lineHeight:20, textAlign:"center" }}>{infoModalMsg}</Text>
            <TouchableOpacity style={{ backgroundColor:C.surface2, borderRadius:8, paddingVertical:10, paddingHorizontal:24 }} onPress={()=>setInfoModalVisible(false)}>
              <Text style={{ color:C.text, fontWeight:"600" }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={{ position:"absolute", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.75)", alignItems:"center", justifyContent:"center" }}>
          <View style={{ width:"85%", maxWidth:320, backgroundColor:C.surface, borderRadius:14, padding:20, borderWidth:0.5, borderColor:"rgba(255,255,255,0.14)" }}>
            <Text style={{ fontSize:15, fontWeight:"700", color:C.text, marginBottom:8 }}>{T.delete}</Text>
            <Text style={{ fontSize:13, color:C.text2, marginBottom:20, lineHeight:20 }}>"{mat?.name}" {T.deleteConfirm}</Text>
            <View style={{ flexDirection:"row", gap:10 }}>
              <TouchableOpacity style={{ flex:1, backgroundColor:C.surface2, borderRadius:8, padding:12, alignItems:"center" }} onPress={()=>setDeleteConfirmVisible(false)}>
                <Text style={{ color:C.text2, fontWeight:"600" }}>{T.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex:1, backgroundColor:"rgba(248,81,73,0.15)", borderWidth:0.5, borderColor:"rgba(248,81,73,0.3)", borderRadius:8, padding:12, alignItems:"center" }}
                onPress={()=>{ if(mat){ deleteMaterial(mat.id); router.back(); } }}>
                <Text style={{ color:"#f85149", fontWeight:"700" }}>{T.delete}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1 },
  header:{ flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:14, paddingVertical:12, borderBottomWidth:0.5 },
  backBtn:{ width:32, height:32, borderRadius:8, alignItems:"center", justifyContent:"center" },
  headerTitle:{ fontSize:15, fontWeight:"700", flex:1 },
  iconBtn:{ width:34, height:34, borderRadius:10, alignItems:"center", justifyContent:"center" },
  content:{ flex:1, padding:14 },
  warrantyBad:{ flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(248,81,73,0.15)", borderWidth:0.5, borderColor:"rgba(248,81,73,0.4)", borderRadius:10, padding:10, marginBottom:10 },
  warrantyBadText:{ fontSize:12, fontWeight:"600", color:"#f85149", flex:1 },
  warrantyWarn:{ flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(245,166,35,0.15)", borderWidth:0.5, borderColor:"rgba(245,166,35,0.4)", borderRadius:10, padding:10, marginBottom:10 },
  warrantyWarnText:{ fontSize:12, fontWeight:"600", color:"#f5a623", flex:1 },
  qtyCenter:{ alignItems:"center", paddingVertical:16 },
  qtyControl:{ flexDirection:"row", alignItems:"center", gap:20, marginVertical:8 },
  qtyBtn:{ width:44, height:44, borderWidth:0.5, borderRadius:22, alignItems:"center", justifyContent:"center" },
  qtyBtnMinus:{ fontSize:22, fontWeight:"700", lineHeight:26 },
  qtyBtnPlus:{ fontSize:22, fontWeight:"700", lineHeight:26 },
  qtyDisplay:{ fontSize:42, fontWeight:"700", minWidth:80, textAlign:"center" },
  qtySub:{ fontSize:12, marginBottom:12 },
  customQtyRow:{ flexDirection:"row", alignItems:"center", gap:8, paddingHorizontal:20, width:"100%" },
  customQtyInput:{ flex:1, borderWidth:0.5, borderRadius:8, padding:9, fontSize:13, textAlign:"center" },
  customQtyApply:{ paddingHorizontal:14, paddingVertical:9, borderRadius:8 },
  detailSection:{ borderWidth:0.5, borderRadius:12, overflow:"hidden", marginBottom:8 },
  detailRow:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:14, paddingVertical:12, borderBottomWidth:0.5 },
  detailKey:{ fontSize:13, minWidth:120, flexShrink:0 },
  detailVal:{ fontSize:13, fontWeight:"500", flexShrink:1, textAlign:"right" },
  tag:{ backgroundColor:"rgba(79,163,247,0.15)", paddingHorizontal:9, paddingVertical:2, borderRadius:20 },
  tagText:{ fontSize:11, fontWeight:"600", color:"#4fa3f7" },
  statusBadge:{ paddingHorizontal:9, paddingVertical:3, borderRadius:20 },
  statusText:{ fontSize:11, fontWeight:"600" },
  qrBtn:{ flexDirection:"row", alignItems:"center", gap:12, borderWidth:0.5, backgroundColor:"rgba(163,113,247,0.05)", borderRadius:12, padding:14, marginTop:8 },
  qrBtnTitle:{ fontSize:13, fontWeight:"700", marginBottom:2 },
  qrBtnSub:{ fontSize:11 },
  formLabel:{ fontSize:10, fontWeight:"600", textTransform:"uppercase", letterSpacing:0.7, marginBottom:5 },
  formInput:{ borderWidth:0.5, borderRadius:8, padding:10, fontSize:13, marginBottom:12 },
  chip:{ paddingHorizontal:10, paddingVertical:6, borderWidth:0.5, borderRadius:8 },
  btnPrimary:{ borderRadius:8, padding:13, alignItems:"center", marginTop:4 },
  btnPrimaryText:{ color:"#000", fontWeight:"700", fontSize:13 },
  modalOverlay:{ flex:1, backgroundColor:"rgba(0,0,0,0.7)", justifyContent:"flex-end" },
  modalSheet:{ borderTopLeftRadius:22, borderTopRightRadius:22, padding:20, borderTopWidth:0.5 },
  modalHandle:{ width:34, height:3, borderRadius:2, alignSelf:"center", marginBottom:18 },
  modalTitle:{ fontSize:16, fontWeight:"700", marginBottom:16 },
  qrCard:{ borderRadius:16, padding:20, alignItems:"center", marginBottom:12 },
  qrInfo:{ alignItems:"center", marginTop:14, gap:4 },
  qrMatName:{ fontSize:15, fontWeight:"700", color:"#000", textAlign:"center" },
  qrMatDetail:{ fontSize:12, color:"#444", textAlign:"center" },
  qrBrand:{ fontSize:10, color:"#888", marginTop:4 },
  qrHint:{ fontSize:12, textAlign:"center", marginTop:4 },
  moveOption:{ flexDirection:"row", alignItems:"center", gap:12, paddingVertical:12, borderBottomWidth:0.5 },
  moveOptionText:{ fontSize:14, fontWeight:"500" },
});
