// app/shopping.tsx - Einkaufsliste
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Share, ActivityIndicator, Linking, Modal, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store";
import { useLang, t } from "../i18n";
import { ShoppingCart, Package, AlertTriangle, AlertCircle, ArrowLeft, Globe, Check, Share2, ChevronRight, Filter, Folder } from "lucide-react-native";

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

interface ShoppingItem {
  id:number; name:string; cat:string;
  currentQty:number; minQty:number; neededQty:number;
  unit:string; price:number; folderName:string; folderIcon:string;
}

export default function ShoppingScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const T = t(lang);
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;

  const { materials, folders, setQty } = useStore();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<"all"|"empty"|"low">("all");

  // ── Confirm Modal ────────────────────────────────
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingItem, setPendingItem] = useState<ShoppingItem | null>(null);

  // ── Info Modal (ersetzt einfache Alerts) ─────────
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");

  useEffect(() => { generateList(); }, [materials, folders]);

  const generateList = () => {
    const low = materials.filter(m => m.qty < m.min);
    setItems(low.map(m => {
      const folder = folders.find(f => f.id === m.folderId);
      const needed = Math.max(1, m.min - m.qty);
      return {
        id:m.id, name:m.name, cat:m.cat,
        currentQty:m.qty, minQty:m.min, neededQty:needed,
        unit:m.unit, price:m.price||0,
        folderName:folder?.name??"Lager", folderIcon:folder?.icon??"",
      };
    }));
  };

  // ── Abhaken: Modal öffnen statt Alert ───────────
  const handleCheck = (item: ShoppingItem) => {
    setPendingItem(item);
    setConfirmVisible(true);
  };

  const confirmCheck = () => {
    if (!pendingItem) return;
    setQty(pendingItem.id, pendingItem.minQty);
    setItems(prev => prev.filter(i => i.id !== pendingItem.id));
    setConfirmVisible(false);
    setPendingItem(null);
  };

  const filtered = filter==="empty" ? items.filter(i=>i.currentQty===0)
    : filter==="low" ? items.filter(i=>i.currentQty>0&&i.currentQty<i.minQty)
    : items;
  const totalCost = filtered.reduce((sum,i) => sum+i.neededQty*i.price, 0);

  const shareAsText = async () => {
    if (filtered.length===0) { setInfoMsg(T.shoppingAllChecked); setInfoVisible(true); return; }
    const date = new Date().toLocaleDateString("de-DE");
    let text = `ElektroGenius MaterialCheck\n${T.shoppingTitle} ${date}\n\n`;
    filtered.forEach(item => {
      text += `${item.name}\n`;
      text += `  Bestand: ${item.currentQty} ${item.unit} | Bestellen: ${item.neededQty} ${item.unit}`;
      if (item.price>0) text += ` | ~€${(item.neededQty*item.price).toFixed(2)}`;
      text += "\n\n";
    });
    if (totalCost>0) text += `Gesamt: €${totalCost.toFixed(2)}\n`;
    text += `\nhttps://elektrogenius.de`;
    try { await Share.share({ message:text, title:T.shoppingTitle }); } catch {}
  };

  const exportAsPDF = async () => {
    if (filtered.length===0) { setInfoMsg(T.shoppingAllChecked); setInfoVisible(true); return; }

    // Web: direkt HTML in neuem Tab öffnen
    if (Platform.OS === "web") {
      const date = new Date().toLocaleDateString("de-DE");
      let tableRows = "";
      filtered.forEach((item, idx) => {
        const statusColor = item.currentQty===0?"#f85149":"#f5a623";
        const statusLabel = item.currentQty===0 ? T.statusOut : T.statusLow;
        const bg = idx%2===0?"#161b22":"#1c2230";
        const cost = item.price>0?`€${(item.neededQty*item.price).toFixed(2)}`:"–";
        tableRows += `<tr style="background:${bg};">
          <td style="padding:10px 14px;color:#e6edf3;">${item.name}</td>
          <td style="padding:10px 14px;text-align:center;color:#e6edf3;">${item.currentQty} ${item.unit}</td>
          <td style="padding:10px 14px;text-align:center;color:#f5a623;font-weight:700;">${item.neededQty} ${item.unit}</td>
          <td style="padding:10px 14px;text-align:center;color:#e6edf3;">${cost}</td>
          <td style="padding:10px 14px;text-align:center;"><span style="background:${statusColor}22;color:${statusColor};padding:3px 8px;border-radius:12px;font-size:11px;">${statusLabel}</span></td>
        </tr>`;
      });
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;background:#0d1117;color:#e6edf3;padding:20px;}
.header{background:#161b22;border:1px solid rgba(245,166,35,0.3);border-radius:12px;padding:20px;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;background:#161b22;border-radius:12px;border:1px solid rgba(255,255,255,0.08);}
th{background:#0d1117;color:#8b949e;font-size:11px;text-transform:uppercase;padding:12px 14px;text-align:left;}
td{border-bottom:1px solid rgba(255,255,255,0.05);}
.footer{margin-top:20px;text-align:center;color:#6e7681;font-size:12px;padding:16px;background:#161b22;border-radius:10px;}
</style></head><body>
<div class="header"><h1>${T.shoppingTitle}</h1><p style="color:#8b949e;margin-top:4px;">MaterialCheck by ElektroGenius · ${date}</p></div>
<table><thead><tr>
<th>Material</th><th style="text-align:center;">Bestand</th><th style="text-align:center;">Bestellen</th>
<th style="text-align:center;">Kosten</th><th style="text-align:center;">Status</th>
</tr></thead><tbody>${tableRows}</tbody></table>
${totalCost>0?`<p style="margin-top:16px;text-align:right;font-size:16px;font-weight:700;color:#3fb950;">Gesamt: €${totalCost.toFixed(2)}</p>`:""}
<div class="footer"><p>ElektroGenius · elektrogenius.de</p></div>
</body></html>`;
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      return;
    }

    // Native: FileSystem
    setExporting(true);
    try {
      const FileSystem = require("expo-file-system/legacy");
      const Sharing = require("expo-sharing");
      const date = new Date().toLocaleDateString("de-DE");
      const dateFile = new Date().toISOString().slice(0,10);
      let tableRows = "";
      filtered.forEach((item, idx) => {
        const statusColor = item.currentQty===0?"#f85149":"#f5a623";
        const statusLabel = item.currentQty===0 ? T.statusOut : T.statusLow;
        const bg = idx%2===0?"#161b22":"#1c2230";
        const cost = item.price>0?`€${(item.neededQty*item.price).toFixed(2)}`:"–";
        tableRows += `<tr style="background:${bg};">
          <td style="padding:10px 14px;color:#e6edf3;">${item.name}</td>
          <td style="padding:10px 14px;text-align:center;color:#e6edf3;">${item.currentQty} ${item.unit}</td>
          <td style="padding:10px 14px;text-align:center;color:#f5a623;font-weight:700;">${item.neededQty} ${item.unit}</td>
          <td style="padding:10px 14px;text-align:center;color:#e6edf3;">${cost}</td>
          <td style="padding:10px 14px;text-align:center;"><span style="background:${statusColor}22;color:${statusColor};padding:3px 8px;border-radius:12px;font-size:11px;">${statusLabel}</span></td>
        </tr>`;
      });
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;background:#0d1117;color:#e6edf3;padding:20px;}
.header{background:#161b22;border:1px solid rgba(245,166,35,0.3);border-radius:12px;padding:20px;margin-bottom:20px;}
table{width:100%;border-collapse:collapse;background:#161b22;border-radius:12px;border:1px solid rgba(255,255,255,0.08);}
th{background:#0d1117;color:#8b949e;font-size:11px;text-transform:uppercase;padding:12px 14px;text-align:left;}
td{border-bottom:1px solid rgba(255,255,255,0.05);}
.footer{margin-top:20px;text-align:center;color:#6e7681;font-size:12px;padding:16px;background:#161b22;border-radius:10px;}
</style></head><body>
<div class="header"><h1>${T.shoppingTitle}</h1><p style="color:#8b949e;margin-top:4px;">MaterialCheck by ElektroGenius · ${date}</p></div>
<table><thead><tr>
<th>Material</th><th style="text-align:center;">Bestand</th><th style="text-align:center;">Bestellen</th>
<th style="text-align:center;">Kosten</th><th style="text-align:center;">Status</th>
</tr></thead><tbody>${tableRows}</tbody></table>
${totalCost>0?`<p style="margin-top:16px;text-align:right;font-size:16px;font-weight:700;color:#3fb950;">Gesamt: €${totalCost.toFixed(2)}</p>`:""}
<div class="footer"><p>ElektroGenius · elektrogenius.de</p></div>
</body></html>`;
      const path = (FileSystem.documentDirectory??"")+`einkaufsliste-${dateFile}.html`;
      await FileSystem.writeAsStringAsync(path, html, { encoding:"utf8" });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType:"text/html", dialogTitle:T.shoppingPdf });
    } catch(e) {
      setInfoMsg(String(e));
      setInfoVisible(true);
    }
    finally { setExporting(false); }
  };

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={()=>router.back()}><ArrowLeft size={18} color={C.text} /></TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle}>{T.shoppingTitle}</Text>
          <Text style={s.headerSub}>{filtered.length} {T.materials}</Text>
        </View>
        <TouchableOpacity style={s.websiteBtn} onPress={()=>Linking.openURL("https://elektrogenius.de")}><Globe size={16} color={C.accent} /></TouchableOpacity>
      </View>

      <View style={s.hintBox}>
        
        <Text style={s.hintText}>Tippe auf einen Artikel um ihn als eingekauft zu markieren — Bestand wird automatisch aufgefüllt.</Text>
      </View>

      {items.length>0&&(
        <View style={s.summaryRow}>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>Gesamt</Text><Text style={[s.summaryValue, { color:C.accent }]}>{items.length}</Text></View>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>{T.statusOut}</Text><Text style={[s.summaryValue, { color:C.red }]}>{items.filter(i=>i.currentQty===0).length}</Text></View>
          <View style={s.summaryCard}><Text style={s.summaryLabel}>{T.statusLow}</Text><Text style={[s.summaryValue, { color:C.accent }]}>{items.filter(i=>i.currentQty>0).length}</Text></View>
          {totalCost>0&&<View style={s.summaryCard}><Text style={s.summaryLabel}>~Kosten</Text><Text style={[s.summaryValue, { color:C.green, fontSize:14 }]}>€{totalCost.toFixed(0)}</Text></View>}
        </View>
      )}

      <View style={s.filterRow}>
        {([
          { key:"all" as const, label:`Alle (${items.length})` },
          { key:"empty" as const, label:`Leer (${items.filter(i=>i.currentQty===0).length})` },
          { key:"low" as const, label:`Niedrig (${items.filter(i=>i.currentQty>0&&i.currentQty<i.minQty).length})` },
        ]).map(f=>(
          <TouchableOpacity key={f.key} style={[s.filterChip, filter===f.key&&s.filterChipActive]} onPress={()=>setFilter(f.key)}>
            <Text style={[s.filterChipText, filter===f.key&&s.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {filtered.length===0 ? (
          <View style={s.emptyState}>
            <Check size={48} color={C.green} />
            <Text style={s.emptyTitle}>{T.shoppingAllOk}</Text>
            <Text style={s.emptyText}>{T.shoppingAllOkSub}</Text>
          </View>
        ) : <>
          <Text style={s.sectionLabel}>{T.shoppingOrder} ({filtered.length})</Text>
          {filtered.map(item=>(
            <TouchableOpacity key={item.id} style={s.itemCard} onPress={()=>handleCheck(item)} activeOpacity={0.7}>
              <View style={s.itemCheckbox}><View style={s.checkboxEmpty}/></View>
              <View style={[s.itemCatIcon, { backgroundColor:item.currentQty===0?"rgba(248,81,73,0.15)":"rgba(245,166,35,0.15)" }]}>
                <Package size={18} color={C.accent} />
              </View>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{item.name}</Text>
                <Text style={s.itemFolder}>{item.folderName}</Text>
                <View style={s.itemMeta}>
                  <Text style={s.itemMetaText}>Bestand: {item.currentQty} {item.unit}</Text>
                  <Text style={s.itemMetaDot}>·</Text>
                  <Text style={[s.itemMetaText, { color:C.accent, fontWeight:"600" }]}>Bestellen: {item.neededQty} {item.unit}</Text>
                  {item.price>0&&<><Text style={s.itemMetaDot}>·</Text><Text style={[s.itemMetaText, { color:C.green }]}>€{(item.neededQty*item.price).toFixed(2)}</Text></>}
                </View>
              </View>
              <View style={[s.statusBadge, { backgroundColor:item.currentQty===0?"rgba(248,81,73,0.15)":"rgba(245,166,35,0.15)" }]}>
                <Text style={[s.statusText, { color:item.currentQty===0?C.red:C.accent }]}>{item.currentQty===0?T.statusOut:T.statusLow}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>}
        <View style={{ height: bottomPad + 20 }} />
      </ScrollView>

      {items.length>0&&(
        <View style={[s.bottomButtons, { paddingBottom: bottomPad + 8 }]}>
          <TouchableOpacity style={[s.bottomBtn, { backgroundColor:"rgba(79,163,247,0.15)", borderColor:"rgba(79,163,247,0.3)" }]} onPress={shareAsText}>
            
            <Text style={[s.bottomBtnText, { color:C.blue }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.bottomBtn, s.bottomBtnPrimary]} onPress={exportAsPDF} disabled={exporting}>
            {exporting?<ActivityIndicator color="#000" size="small"/>:<><Text style={s.bottomBtnTextPrimary}>PDF Export</Text></>}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Abhaken Confirm Modal ── */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <Text style={s.dialogTitle}>Eingekauft?</Text>
            <Text style={s.dialogText}>
              "{pendingItem?.name}" wurde eingekauft?{"\n\n"}
              Bestand wird auf {pendingItem?.minQty} {pendingItem?.unit} aufgefüllt.
            </Text>
            <View style={s.dialogBtns}>
              <TouchableOpacity
                style={[s.dialogBtn, { backgroundColor:C.surface2 }]}
                onPress={() => { setConfirmVisible(false); setPendingItem(null); }}>
                <Text style={{ color:C.text2, fontWeight:"600" }}>{T.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.dialogBtn, { backgroundColor:C.accent }]}
                onPress={confirmCheck}>
                <Text style={{ color:"#000", fontWeight:"700" }}>Ja, eingekauft!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Info Modal ── */}
      <Modal visible={infoVisible} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <Text style={s.dialogText}>{infoMsg}</Text>
            <TouchableOpacity
              style={[s.dialogBtn, { backgroundColor:C.surface2, width:"100%" }]}
              onPress={() => setInfoVisible(false)}>
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
  websiteBtn:{ width:34, height:34, backgroundColor:C.accentBg, borderWidth:0.5, borderColor:"rgba(245,166,35,0.3)", borderRadius:10, alignItems:"center", justifyContent:"center" },
  hintBox:{ flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"rgba(79,163,247,0.08)", borderBottomWidth:0.5, borderBottomColor:"rgba(79,163,247,0.2)", paddingHorizontal:14, paddingVertical:8 },
  hintText:{ flex:1, fontSize:11, color:C.text2, lineHeight:16 },
  summaryRow:{ flexDirection:"row", gap:8, padding:12, paddingBottom:0 },
  summaryCard:{ flex:1, backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:10, padding:10, alignItems:"center" },
  summaryLabel:{ fontSize:10, color:C.text3, marginBottom:3 },
  summaryValue:{ fontSize:20, fontWeight:"700", color:C.text },
  filterRow:{ flexDirection:"row", gap:6, paddingHorizontal:14, paddingVertical:10, borderBottomWidth:0.5, borderBottomColor:C.border },
  filterChip:{ paddingHorizontal:11, paddingVertical:5, borderRadius:20, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2 },
  filterChipActive:{ backgroundColor:C.accentBg, borderColor:C.accent },
  filterChipText:{ fontSize:11, color:C.text2, fontWeight:"500" },
  filterChipTextActive:{ color:C.accent },
  content:{ flex:1, padding:14 },
  sectionLabel:{ fontSize:10, fontWeight:"700", color:C.text3, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 },
  itemCard:{ backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:12, marginBottom:8, flexDirection:"row", alignItems:"center", gap:10 },
  itemCheckbox:{ width:24, alignItems:"center" },
  checkboxEmpty:{ width:22, height:22, borderRadius:5, borderWidth:2, borderColor:C.accent },
  itemCatIcon:{ width:38, height:38, borderRadius:9, alignItems:"center", justifyContent:"center", flexShrink:0 },
  itemInfo:{ flex:1, minWidth:0 },
  itemName:{ fontSize:13, fontWeight:"600", color:C.text, marginBottom:2 },
  itemFolder:{ fontSize:10, color:C.text3, marginBottom:3 },
  itemMeta:{ flexDirection:"row", alignItems:"center", flexWrap:"wrap", gap:4 },
  itemMetaText:{ fontSize:11, color:C.text2 },
  itemMetaDot:{ fontSize:11, color:C.text3 },
  statusBadge:{ paddingHorizontal:8, paddingVertical:3, borderRadius:20, flexShrink:0 },
  statusText:{ fontSize:10, fontWeight:"600" },
  emptyState:{ alignItems:"center", paddingVertical:60, gap:12 },
  emptyTitle:{ fontSize:18, fontWeight:"700", color:C.text },
  emptyText:{ fontSize:13, color:C.text2, textAlign:"center" },
  bottomButtons:{ flexDirection:"row", gap:10, paddingHorizontal:14, paddingTop:12, borderTopWidth:0.5, borderTopColor:C.border, backgroundColor:C.bg },
  bottomBtn:{ flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, padding:13, borderRadius:12, borderWidth:0.5 },
  bottomBtnText:{ fontSize:14, fontWeight:"600" },
  bottomBtnPrimary:{ backgroundColor:C.accent, borderColor:C.accent },
  bottomBtnTextPrimary:{ fontSize:14, fontWeight:"700", color:"#000" },
  // Dialoge
  overlayCenter:{ position:"absolute", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.75)", alignItems:"center", justifyContent:"center" },
  dialogBox:{ width:"85%", maxWidth:340, backgroundColor:C.surface, borderRadius:16, padding:20, borderWidth:0.5, borderColor:C.border2, alignItems:"center" },
  dialogTitle:{ fontSize:16, fontWeight:"700", color:C.text, marginBottom:8, textAlign:"center" },
  dialogText:{ fontSize:13, color:C.text2, marginBottom:20, lineHeight:20, textAlign:"center" },
  dialogBtns:{ flexDirection:"row", gap:10, width:"100%" },
  dialogBtn:{ flex:1, padding:12, borderRadius:10, alignItems:"center" },
});
