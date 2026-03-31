// app/scanner.tsx - Barcode Scanner
import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput, ScrollView, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useStore, Category } from "../store";
import { useLang, t } from "../i18n";
import { useProStore } from "../proStore";
import ProGate from "../components/ProGate";
import { Camera, ArrowLeft, Search, X, Check, Package, Plus, Minus, Eye, RotateCcw, Hash } from "lucide-react-native";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

const CAT_ICONS: Record<string,string> = {
  kabel:"", sicherung:"", steckdose:"", schalter:"",
  verteiler:"", leitung:"", werkzeug:"", sonstiges:"",
};
const UNITS = ["m","Stk","Pkg","Rolle","kg","Liter"];

function stockStatus(qty:number, min:number) {
  if (qty===0) return { label:"Leer", color:C.red, bg:"rgba(248,81,73,0.15)" };
  if (qty<min) return { label:"Niedrig", color:C.accent, bg:"rgba(245,166,35,0.15)" };
  return { label:"OK", color:C.green, bg:"rgba(63,185,80,0.15)" };
}

export default function ScannerScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const T = t(lang);
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;

  const isPro = useProStore(s => s.isPro);
  const { materials, folders, addMaterial, changeQty } = useStore();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState<"scanning"|"found"|"notfound">("scanning");
  const [lastBarcode, setLastBarcode] = useState("");
  const [foundMaterial, setFoundMaterial] = useState<typeof materials[0]|null>(null);
  const [torch, setTorch] = useState(false);
  const [matName, setMatName] = useState("");
  const [matQty, setMatQty] = useState("1");
  const [matUnit, setMatUnit] = useState("Stk");
  const [matCat, setMatCat] = useState<Category>("sonstiges");
  const [matMin, setMatMin] = useState("5");
  const [matPrice, setMatPrice] = useState("0");
  const [matFolderId, setMatFolderId] = useState(folders[0]?.id??1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQtyModal, setShowQtyModal] = useState(false);
  const [qtyDelta, setQtyDelta] = useState("1");
  const [qtyMode, setQtyMode] = useState<"add"|"remove">("add");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const CATEGORIES: { value:Category; label:string }[] = [
    { value:"kabel", label:T.cable },{ value:"sicherung", label:T.fuse },
    { value:"steckdose", label:T.socket },{ value:"schalter", label:T.switch },
    { value:"verteiler", label:T.distributor },{ value:"leitung", label:T.line },
    { value:"werkzeug", label:T.tool },{ value:"sonstiges", label:T.other },
  ];

  useEffect(() => { if (!permission?.granted) requestPermission(); }, []);

  const handleBarcode = ({ data }: { data:string }) => {
    if (scanned) return;
    setScanned(true); setLastBarcode(data);
    const found = materials.find(m=>m.note?.includes(data)||m.name.includes(data));
    if (found) { setFoundMaterial(found); setMode("found"); }
    else { setMode("notfound"); setMatName(`Artikel ${data.slice(-6)}`); }
  };

  const resetScan = () => { setScanned(false); setMode("scanning"); setFoundMaterial(null); setLastBarcode(""); };

  const handleAddQty = () => {
    if (!foundMaterial) return;
    const delta = parseInt(qtyDelta)||1;
    changeQty(foundMaterial.id, qtyMode==="add"?delta:-delta);
    setShowQtyModal(false);
    Alert.alert("OK", `${foundMaterial.name}\n${qtyMode==="add"?"+":"-"}${delta} ${foundMaterial.unit}`,
      [{ text:"Weiter scannen", onPress:resetScan },{ text:"Fertig", onPress:()=>router.back() }]
    );
  };

  const handleAddNew = () => {
    if (!matName.trim()) { Alert.alert(T.required, T.enterName); return; }
    addMaterial({ name:matName.trim(), qty:parseInt(matQty)||1, unit:matUnit, cat:matCat, folderId:matFolderId, min:parseInt(matMin)||5, price:parseFloat(matPrice)||0, note:`barcode:${lastBarcode}` });
    setShowAddModal(false);
    Alert.alert("Hinzugefügt", matName,
      [{ text:"Weiter scannen", onPress:resetScan },{ text:"Fertig", onPress:()=>router.back() }]
    );
  };

  const handleManualCode = () => {
    const code = manualCode.trim();
    if (!code) return;
    setManualCode(""); setShowManualInput(false);
    setScanned(true); setLastBarcode(code);
    const found = materials.find(m=>m.note?.includes(code)||m.name.includes(code));
    if (found) { setFoundMaterial(found); setMode("found"); }
    else { setMode("notfound"); setMatName(`Artikel ${code.slice(-6)}`); }
  };

  if (!isPro) {
    return (
      <View style={{ flex:1, backgroundColor:C.bg }}>
        <ProGate visible={true} onClose={() => router.back()} feature="scanner" />
      </View>
    );
  }

  if (!permission) return <View style={{ flex:1, backgroundColor:C.bg, alignItems:"center", justifyContent:"center" }}><ActivityIndicator color={C.accent} size="large"/></View>;

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.container} edges={["top","left","right"]}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={()=>router.back()}><ArrowLeft size={18} color={C.text} /></TouchableOpacity>
          <Text style={s.headerTitle}>{T.scannerTitle}</Text>
        </View>
        <View style={s.permissionBox}>
          <Camera size={48} color={C.text3} style={{ marginBottom:16 }} />
          <Text style={s.permissionTitle}>{T.scannerPermTitle}</Text>
          <Text style={s.permissionText}>{T.scannerPermText}</Text>
          <TouchableOpacity style={s.btnPrimary} onPress={requestPermission}><Text style={s.btnPrimaryText}>{T.scannerPermBtn}</Text></TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary, s.btnSec]} onPress={()=>router.back()}><Text style={s.btnSecText}>{T.cancel}</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor:"#000" }]} edges={["top","left","right"]}>
      <View style={[s.header, { backgroundColor:C.bg }]}>
        <TouchableOpacity style={s.backBtn} onPress={()=>router.back()}><ArrowLeft size={18} color={C.text} /></TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>{T.scannerTitle}</Text>
          <Text style={s.headerSub}>{mode==="scanning"?T.scannerHint:mode==="found"?T.scannerFound:T.scannerNotFound}</Text>
        </View>
        <TouchableOpacity style={s.torchBtn} onPress={()=>setShowManualInput(true)}>
          <Hash size={18} color={C.text} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.torchBtn, torch&&s.torchBtnActive]} onPress={()=>setTorch(!torch)}>
          <Camera size={18} color={torch ? C.accent : C.text} />
        </TouchableOpacity>
      </View>

      {/* MANUELLE EINGABE MODAL */}
      <Modal visible={showManualInput} transparent animationType="slide">
        <TouchableOpacity style={{flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end"}} activeOpacity={1} onPress={()=>setShowManualInput(false)}>
          <TouchableOpacity activeOpacity={1} style={{backgroundColor:C.surface,borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,borderTopWidth:0.5,borderTopColor:C.border2}}>
            <View style={{width:36,height:3,backgroundColor:C.border2,borderRadius:2,alignSelf:"center",marginBottom:16}}/>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:12}}>
              <Hash size={18} color={C.accent}/>
              <Text style={{fontSize:16,fontWeight:"700",color:C.text}}>Barcode manuell eingeben</Text>
            </View>
            <Text style={{fontSize:12,color:C.text2,marginBottom:12}}>EAN, UPC, QR-Code oder Artikelnummer eingeben</Text>
            <TextInput
              style={{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:10,padding:13,fontSize:16,color:C.text,letterSpacing:2,marginBottom:12}}
              placeholder="z.B. 4006381333931"
              placeholderTextColor={C.text3}
              value={manualCode}
              onChangeText={setManualCode}
              keyboardType="default"
              autoFocus
              returnKeyType="search"
              onSubmitEditing={handleManualCode}
            />
            <TouchableOpacity style={{backgroundColor:C.accent,borderRadius:10,padding:13,alignItems:"center"}} onPress={handleManualCode}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                <Search size={16} color="#000"/>
                <Text style={{color:"#000",fontWeight:"700",fontSize:14}}>Suchen</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={{backgroundColor:C.surface2,borderRadius:10,padding:12,alignItems:"center",marginTop:8}} onPress={()=>setShowManualInput(false)}>
              <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <View style={s.cameraWrap}>
        <CameraView style={s.camera} facing="back" enableTorch={torch}
          onBarcodeScanned={scanned?undefined:handleBarcode}
          barcodeScannerSettings={{ barcodeTypes:["ean13","ean8","upc_a","upc_e","code128","code39","qr"] }}
        />
        {mode==="scanning"&&(
          <View style={s.scanOverlay}>
            <View style={s.scanFrame}>
              <View style={[s.corner, s.cornerTL]}/><View style={[s.corner, s.cornerTR]}/>
              <View style={[s.corner, s.cornerBL]}/><View style={[s.corner, s.cornerBR]}/>
              <View style={s.scanLine}/>
            </View>
            <Text style={s.scanHint}>{T.scannerHint}</Text>
          </View>
        )}
        {mode!=="scanning"&&(
          <View style={[s.resultOverlay, { paddingBottom: bottomPad + 20 }]}>
            {mode==="found"&&foundMaterial&&(
              <View style={s.resultCard}>
                <Check size={40} color={C.green} />
                <Text style={s.resultTitle}>{T.scannerFound}</Text>
                <View style={s.resultMatCard}>
                  <Package size={24} color={C.accent} />
                  <View style={{ flex:1 }}>
                    <Text style={s.resultMatName}>{foundMaterial.name}</Text>
                    {(()=>{
                      const folder = folders.find(f=>f.id===foundMaterial.folderId);
                      const st = stockStatus(foundMaterial.qty, foundMaterial.min);
                      return (
                        <View style={{ flexDirection:"row", alignItems:"center", gap:8, marginTop:3 }}>
                          <View style={[s.badge, { backgroundColor:st.bg }]}><Text style={[s.badgeText, { color:st.color }]}>{st.label}</Text></View>
                          <Text style={s.resultMatSub}>{foundMaterial.qty} {foundMaterial.unit}</Text>
                          {folder&&<Text style={s.resultMatSub}>{folder.icon} {folder.name}</Text>}
                        </View>
                      );
                    })()}
                  </View>
                </View>
                <View style={s.resultActions}>
                  <TouchableOpacity style={[s.resultBtn, { backgroundColor:"rgba(63,185,80,0.15)", borderColor:"rgba(63,185,80,0.3)" }]} onPress={()=>{ setQtyMode("add"); setShowQtyModal(true); }}>
                    <Plus size={16} color={C.green} /><Text style={[s.resultBtnText, { color:C.green }]}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.resultBtn, { backgroundColor:"rgba(248,81,73,0.15)", borderColor:"rgba(248,81,73,0.3)" }]} onPress={()=>{ setQtyMode("remove"); setShowQtyModal(true); }}>
                    <Minus size={16} color={C.red} /><Text style={[s.resultBtnText, { color:C.red }]}>-</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.resultBtn, { backgroundColor:C.accentBg, borderColor:"rgba(245,166,35,0.3)" }]} onPress={()=>router.push(`/material/${foundMaterial.id}`)}>
                    <Eye size={16} color={C.accent} /><Text style={[s.resultBtnText, { color:C.accent }]}>Detail</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.rescanBtn} onPress={resetScan}><Text style={s.rescanBtnText}>Weiter scannen</Text></TouchableOpacity>
              </View>
            )}
            {mode==="notfound"&&(
              <View style={s.resultCard}>
                <Search size={40} color={C.text3} />
                <Text style={s.resultTitle}>{T.scannerNotFound}</Text>
                <Text style={s.resultSub}>{lastBarcode}</Text>
                <View style={s.resultActions}>
                  <TouchableOpacity style={[s.resultBtn, { backgroundColor:C.accentBg, borderColor:"rgba(245,166,35,0.3)", flex:1 }]} onPress={()=>setShowAddModal(true)}>
                    <Plus size={16} color={C.accent} /><Text style={[s.resultBtnText, { color:C.accent }]}>Hinzufügen</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.rescanBtn} onPress={resetScan}><Text style={s.rescanBtnText}>Nochmal scannen</Text></TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Menge Modal */}
      <Modal visible={showQtyModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowQtyModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet, { paddingBottom: bottomPad + 16 }]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>{qtyMode==="add"?"Menge hinzufügen":"Menge entnehmen"}</Text>
            {foundMaterial&&<Text style={s.modalSub}>{foundMaterial.name} · {foundMaterial.qty} {foundMaterial.unit}</Text>}
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyMinus} onPress={()=>setQtyDelta(d=>String(Math.max(1,parseInt(d||"1")-1)))}><Text style={{ fontSize:22, color:C.red, fontWeight:"700" }}>−</Text></TouchableOpacity>
              <TextInput style={s.qtyInput} keyboardType="numeric" value={qtyDelta} onChangeText={setQtyDelta}/>
              <TouchableOpacity style={s.qtyPlus} onPress={()=>setQtyDelta(d=>String(parseInt(d||"0")+1))}><Text style={{ fontSize:22, color:C.green, fontWeight:"700" }}>+</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.btnPrimary, { backgroundColor:qtyMode==="add"?C.green:C.red }]} onPress={handleAddQty}>
              <Text style={s.btnPrimaryText}>{qtyMode==="add"?"Hinzufügen":"Entnehmen"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary, s.btnSec]} onPress={()=>setShowQtyModal(false)}><Text style={s.btnSecText}>{T.cancel}</Text></TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Neu hinzufügen Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowAddModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet, { paddingBottom: bottomPad + 16 }]}>
            <View style={s.modalHandle}/>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>{T.addMaterial}</Text>
              <Text style={s.modalSub}>Barcode: {lastBarcode}</Text>
              <Text style={s.formLabel}>{T.name}</Text>
              <TextInput style={s.formInput} placeholder={`${T.eg} NYM-J`} placeholderTextColor={C.text3} value={matName} onChangeText={setMatName} autoFocus/>
              <View style={{ flexDirection:"row", gap:10 }}>
                <View style={{ flex:1 }}><Text style={s.formLabel}>{T.stock}</Text><TextInput style={s.formInput} keyboardType="numeric" value={matQty} onChangeText={setMatQty}/></View>
                <View style={{ flex:1 }}>
                  <Text style={s.formLabel}>{T.unit}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection:"row", gap:5 }}>
                      {UNITS.map(u=><TouchableOpacity key={u} onPress={()=>setMatUnit(u)} style={[s.unitChip, matUnit===u&&s.unitChipActive]}><Text style={{ fontSize:11, color:matUnit===u?C.accent:C.text2 }}>{u}</Text></TouchableOpacity>)}
                    </View>
                  </ScrollView>
                </View>
              </View>
              <Text style={s.formLabel}>{T.category}</Text>
              <View style={{ flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                {CATEGORIES.map(c=><TouchableOpacity key={c.value} onPress={()=>setMatCat(c.value)} style={[s.catChip, matCat===c.value&&s.catChipActive]}><Text style={{ fontSize:11, color:matCat===c.value?C.accent:C.text2 }}>{c.label}</Text></TouchableOpacity>)}
              </View>
              <Text style={s.formLabel}>{T.folder}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:12 }}>
                <View style={{ flexDirection:"row", gap:6 }}>
                  {folders.map(f=><TouchableOpacity key={f.id} onPress={()=>setMatFolderId(f.id)} style={[s.catChip, matFolderId===f.id&&s.catChipActive]}><Text style={{ fontSize:11, color:matFolderId===f.id?C.accent:C.text2 }}>{f.icon} {f.name}</Text></TouchableOpacity>)}
                </View>
              </ScrollView>
              <View style={{ flexDirection:"row", gap:10 }}>
                <View style={{ flex:1 }}><Text style={s.formLabel}>{T.minStockAlarm}</Text><TextInput style={s.formInput} keyboardType="numeric" value={matMin} onChangeText={setMatMin}/></View>
                <View style={{ flex:1 }}><Text style={s.formLabel}>{T.pricePerUnit}</Text><TextInput style={s.formInput} keyboardType="decimal-pad" value={matPrice} onChangeText={setMatPrice}/></View>
              </View>
              <TouchableOpacity style={s.btnPrimary} onPress={handleAddNew}><Text style={s.btnPrimaryText}>{T.addMaterial}</Text></TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary, s.btnSec]} onPress={()=>setShowAddModal(false)}><Text style={s.btnSecText}>{T.cancel}</Text></TouchableOpacity>
              <View style={{ height:20 }}/>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  torchBtn:{ width:36, height:36, backgroundColor:C.surface2, borderRadius:10, alignItems:"center", justifyContent:"center", borderWidth:0.5, borderColor:C.border2 },
  torchBtnActive:{ backgroundColor:"rgba(245,166,35,0.2)", borderColor:C.accent },
  cameraWrap:{ flex:1, position:"relative" },
  camera:{ flex:1 },
  scanOverlay:{ position:"absolute", inset:0, alignItems:"center", justifyContent:"center" },
  scanFrame:{ width:260, height:160, position:"relative", alignItems:"center", justifyContent:"center" },
  corner:{ position:"absolute", width:28, height:28, borderColor:C.accent, borderWidth:3 },
  cornerTL:{ top:0, left:0, borderRightWidth:0, borderBottomWidth:0, borderTopLeftRadius:4 },
  cornerTR:{ top:0, right:0, borderLeftWidth:0, borderBottomWidth:0, borderTopRightRadius:4 },
  cornerBL:{ bottom:0, left:0, borderRightWidth:0, borderTopWidth:0, borderBottomLeftRadius:4 },
  cornerBR:{ bottom:0, right:0, borderLeftWidth:0, borderTopWidth:0, borderBottomRightRadius:4 },
  scanLine:{ width:220, height:2, backgroundColor:C.accent, opacity:0.8 },
  scanHint:{ color:"#fff", fontSize:13, marginTop:20, backgroundColor:"rgba(0,0,0,0.6)", paddingHorizontal:16, paddingVertical:6, borderRadius:20 },
  resultOverlay:{ position:"absolute", inset:0, backgroundColor:"rgba(0,0,0,0.85)", alignItems:"center", justifyContent:"flex-end" },
  resultCard:{ width:"92%", backgroundColor:C.surface, borderRadius:20, padding:20, borderWidth:0.5, borderColor:C.border2, marginBottom:16 },
  resultIcon:{ fontSize:40, textAlign:"center", marginBottom:8 },
  resultTitle:{ fontSize:18, fontWeight:"700", color:C.text, textAlign:"center", marginBottom:4 },
  resultSub:{ fontSize:12, color:C.text3, textAlign:"center", marginBottom:12 },
  resultMatCard:{ flexDirection:"row", alignItems:"center", gap:12, backgroundColor:C.surface2, borderRadius:12, padding:12, marginBottom:16 },
  resultMatName:{ fontSize:14, fontWeight:"600", color:C.text },
  resultMatSub:{ fontSize:11, color:C.text2 },
  resultActions:{ flexDirection:"row", gap:8, marginBottom:12 },
  resultBtn:{ flex:1, alignItems:"center", justifyContent:"center", gap:4, padding:12, borderRadius:12, borderWidth:0.5 },
  resultBtnText:{ fontSize:11, fontWeight:"600" },
  rescanBtn:{ backgroundColor:C.surface2, borderRadius:10, padding:12, alignItems:"center" },
  rescanBtnText:{ color:C.text2, fontSize:13, fontWeight:"500" },
  badge:{ paddingHorizontal:7, paddingVertical:2, borderRadius:20 },
  badgeText:{ fontSize:10, fontWeight:"600" },
  permissionBox:{ flex:1, alignItems:"center", justifyContent:"center", padding:30 },
  permissionTitle:{ fontSize:20, fontWeight:"700", color:C.text, marginBottom:12 },
  permissionText:{ fontSize:14, color:C.text2, textAlign:"center", lineHeight:21, marginBottom:24 },
  modalOverlay:{ flex:1, backgroundColor:"rgba(0,0,0,0.7)", justifyContent:"flex-end" },
  modalSheet:{ backgroundColor:C.surface, borderTopLeftRadius:22, borderTopRightRadius:22, padding:18, borderTopWidth:0.5, borderTopColor:C.border2, maxHeight:"88%" },
  modalHandle:{ width:34, height:3, backgroundColor:C.border2, borderRadius:2, alignSelf:"center", marginBottom:16 },
  modalTitle:{ fontSize:16, fontWeight:"700", color:C.text, marginBottom:4 },
  modalSub:{ fontSize:11, color:C.text3, marginBottom:16 },
  qtyRow:{ flexDirection:"row", alignItems:"center", gap:12, marginBottom:16 },
  qtyMinus:{ width:44, height:44, backgroundColor:C.surface2, borderRadius:22, alignItems:"center", justifyContent:"center" },
  qtyPlus:{ width:44, height:44, backgroundColor:C.surface2, borderRadius:22, alignItems:"center", justifyContent:"center" },
  qtyInput:{ flex:1, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:8, padding:10, fontSize:20, color:C.text, textAlign:"center", fontWeight:"700" },
  formLabel:{ fontSize:10, fontWeight:"600", color:C.text3, textTransform:"uppercase", letterSpacing:0.7, marginBottom:5 },
  formInput:{ backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:8, padding:10, fontSize:13, color:C.text, marginBottom:12 },
  unitChip:{ paddingHorizontal:10, paddingVertical:6, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:8 },
  unitChipActive:{ borderColor:C.accent, backgroundColor:C.accentBg },
  catChip:{ paddingHorizontal:10, paddingVertical:6, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:8 },
  catChipActive:{ borderColor:C.accent, backgroundColor:C.accentBg },
  btnPrimary:{ backgroundColor:C.accent, borderRadius:8, padding:13, alignItems:"center", marginTop:4 },
  btnPrimaryText:{ color:"#000", fontWeight:"700", fontSize:14 },
  btnSec:{ backgroundColor:C.surface3, marginTop:8 },
  btnSecText:{ color:C.text2, fontWeight:"500", fontSize:14 },
});
