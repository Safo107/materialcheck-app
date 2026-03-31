// app/reports.tsx - Monatsberichte + Excel Export
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Linking, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store";
import { useLang, t } from "../i18n";
import { useProStore } from "../proStore";
import ProGate from "../components/ProGate";
import { Package, DollarSign, AlertTriangle, AlertCircle, Folder, Tag, Download, FileText, BarChart2, Globe, ArrowLeft, ChevronRight } from "lucide-react-native";

// Web-kompatibler Download
function webDownload(content: string, filename: string, mimeType: string) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) { Alert.alert("Fehler", String(e)); }
}

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

const CAT_ICONS: Record<string,string> = {
  kabel:"🔌", sicherung:"⚡", steckdose:"🔋", schalter:"💡",
  verteiler:"🗄️", leitung:"〰️", werkzeug:"🔧", sonstiges:"📦",
};

export default function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { lang } = useLang();
  const T = t(lang);
  const isPro = useProStore(s => s.isPro);
  const { folders, materials, activities, getTotalValue, getLowStockMaterials } = useStore();
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<"csv"|"html"|null>(null);
  const [showProGate, setShowProGate] = useState(false);

  const totalValue = getTotalValue();
  const lowCount = getLowStockMaterials().length;
  const totalMats = materials.length;
  const totalQty = materials.reduce((s,m) => s+m.qty, 0);
  const outCount = materials.filter(m=>m.qty===0).length;

  // Kategoriestatistik
  const catStats = Object.entries(CAT_ICONS).map(([cat, icon]) => {
    const mats = materials.filter(m=>m.cat===cat);
    return {
      cat, icon,
      count: mats.length,
      qty: mats.reduce((s,m)=>s+m.qty,0),
      value: mats.reduce((s,m)=>s+m.qty*(m.price||0),0),
    };
  }).filter(c=>c.count>0).sort((a,b)=>b.value-a.value);

  // Ordnerstatistik
  const folderStats = folders.map(f => {
    const mats = materials.filter(m=>m.folderId===f.id);
    return {
      folder: f,
      count: mats.length,
      value: mats.reduce((s,m)=>s+m.qty*(m.price||0),0),
      low: mats.filter(m=>m.qty<m.min).length,
    };
  });

  // ── CSV Export ───────────────────────────────────────
  const exportCSV = async () => {
    if (!isPro) { setShowProGate(true); return; }
    setExporting(true); setExportType("csv");
    try {
      const date = new Date().toISOString().slice(0,10);
      let csv = "\uFEFF"; // BOM für Excel UTF-8
      csv += "Name,Kategorie,Ordner,Bestand,Einheit,Mindestbestand,Preis/Einheit,Lagerwert,Status\n";
      materials.forEach(m => {
        const folder = folders.find(f=>f.id===m.folderId);
        const status = m.qty===0?"Leer":m.qty<m.min?"Niedrig":"OK";
        const value = (m.qty*(m.price||0)).toFixed(2);
        csv += `"${m.name}","${m.cat}","${folder?.name??""}",${m.qty},"${m.unit}",${m.min},${m.price||0},${value},"${status}"\n`;
      });
      csv += `\n"GESAMT","","",${totalQty},"","","",${totalValue.toFixed(2)},""\n`;
      csv += `"Artikel gesamt: ${totalMats}","Niedrig: ${lowCount}","Leer: ${outCount}",,,,,,\n`;
      webDownload(csv, `materialcheck-${date}.csv`, "text/csv;charset=utf-8;");
    } catch(e) { Alert.alert("Fehler", String(e)); }
    finally { setExporting(false); setExportType(null); }
  };

  // ── HTML Bericht Export ──────────────────────────────
  const exportHTML = async () => {
    if (!isPro) { setShowProGate(true); return; }
    setExporting(true); setExportType("html");
    try {
      const date = new Date().toLocaleDateString("de-DE");
      const dateFile = new Date().toISOString().slice(0,10);

      // Material Tabelle
      let matRows = "";
      materials.forEach((m,i) => {
        const folder = folders.find(f=>f.id===m.folderId);
        const status = m.qty===0?"Leer":m.qty<m.min?"Niedrig":"OK";
        const statusColor = m.qty===0?"#f85149":m.qty<m.min?"#f5a623":"#3fb950";
        const bg = i%2===0?"#161b22":"#1c2230";
        const value = (m.qty*(m.price||0)).toFixed(2);
        matRows += `<tr style="background:${bg}">
          <td style="padding:8px 12px;color:#e6edf3;">${CAT_ICONS[m.cat]||"📦"} ${m.name}</td>
          <td style="padding:8px 12px;color:#8b949e;">${folder?.name??""}</td>
          <td style="padding:8px 12px;text-align:center;color:#e6edf3;">${m.qty} ${m.unit}</td>
          <td style="padding:8px 12px;text-align:center;color:#8b949e;">${m.min}</td>
          <td style="padding:8px 12px;text-align:center;color:#f5a623;">€${(m.price||0).toFixed(2)}</td>
          <td style="padding:8px 12px;text-align:right;color:#3fb950;font-weight:700;">€${value}</td>
          <td style="padding:8px 12px;text-align:center;"><span style="background:${statusColor}22;color:${statusColor};padding:2px 8px;border-radius:12px;font-size:11px;">${status}</span></td>
        </tr>`;
      });

      // Ordner Tabelle
      let folderRows = "";
      folderStats.forEach(({folder,count,value,low}) => {
        folderRows += `<tr>
          <td style="padding:8px 12px;color:#e6edf3;">${folder.icon} ${folder.name}</td>
          <td style="padding:8px 12px;text-align:center;color:#8b949e;">${count}</td>
          <td style="padding:8px 12px;text-align:right;color:#f5a623;font-weight:700;">€${value.toFixed(2)}</td>
          <td style="padding:8px 12px;text-align:center;color:${low>0?"#f85149":"#3fb950"};">${low>0?`⚠️ ${low}`:"-"}</td>
        </tr>`;
      });

      const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">
<title>MaterialCheck Bericht</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;background:#0d1117;color:#e6edf3;padding:24px;}
h1{font-size:24px;margin-bottom:4px;}h2{font-size:16px;color:#8b949e;margin-bottom:20px;}
h3{font-size:14px;color:#6e7681;text-transform:uppercase;letter-spacing:0.8px;margin:24px 0 10px;}
.header{display:flex;align-items:center;gap:16px;background:#161b22;border:1px solid rgba(245,166,35,0.3);border-radius:12px;padding:20px;margin-bottom:24px;}
.logo{width:60px;height:60px;background:#1c2c55;border:2px solid #f5a623;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#f5a623;}
.cards{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;}
.card{flex:1;min-width:140px;background:#161b22;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;}
.card-label{font-size:11px;color:#6e7681;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;}
.card-value{font-size:28px;font-weight:700;}
table{width:100%;border-collapse:collapse;background:#161b22;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);margin-bottom:24px;}
th{background:#0d1117;color:#6e7681;font-size:11px;text-transform:uppercase;letter-spacing:0.6px;padding:10px 12px;text-align:left;}
td{border-bottom:1px solid rgba(255,255,255,0.04);}
.footer{text-align:center;color:#6e7681;font-size:12px;padding:16px;background:#161b22;border-radius:10px;}
</style></head><body>
<div class="header">
  <div class="logo">EG</div>
  <div><h1>⚡ MaterialCheck Bericht</h1><h2>ElektroGenius · ${date}</h2></div>
</div>

<div class="cards">
  <div class="card"><div class="card-label">Materialarten</div><div class="card-value" style="color:#f5a623;">${totalMats}</div></div>
  <div class="card"><div class="card-label">Lagerwert</div><div class="card-value" style="color:#3fb950;">€${totalValue.toFixed(0)}</div></div>
  <div class="card"><div class="card-label">Niedrig</div><div class="card-value" style="color:#f5a623;">${lowCount}</div></div>
  <div class="card"><div class="card-label">Leer</div><div class="card-value" style="color:#f85149;">${outCount}</div></div>
</div>

<h3>📦 Alle Materialien</h3>
<table>
  <thead><tr>
    <th>Material</th><th>Ordner</th><th style="text-align:center;">Bestand</th>
    <th style="text-align:center;">Min.</th><th style="text-align:center;">Preis</th>
    <th style="text-align:right;">Wert</th><th style="text-align:center;">Status</th>
  </tr></thead>
  <tbody>${matRows}</tbody>
  <tfoot><tr style="background:#0d1117;">
    <td colspan="5" style="padding:10px 12px;color:#8b949e;font-weight:700;">GESAMT</td>
    <td style="padding:10px 12px;text-align:right;color:#3fb950;font-weight:700;font-size:16px;">€${totalValue.toFixed(2)}</td>
    <td></td>
  </tr></tfoot>
</table>

<h3>🗂️ Nach Ordner</h3>
<table>
  <thead><tr>
    <th>Ordner</th><th style="text-align:center;">Artikel</th>
    <th style="text-align:right;">Wert</th><th style="text-align:center;">Niedrig</th>
  </tr></thead>
  <tbody>${folderRows}</tbody>
</table>

<div class="footer">
  <p>Erstellt mit MaterialCheck by ElektroGenius · elektrogenius.de</p>
  <p style="margin-top:4px;">${date}</p>
</div>
</body></html>`;

      webDownload(html, `bericht-${dateFile}.html`, "text/html;charset=utf-8;");
    } catch(e) { Alert.alert("Fehler", String(e)); }
    finally { setExporting(false); setExportType(null); }
  };

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <ProGate visible={showProGate} onClose={() => setShowProGate(false)} feature="export" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}><BarChart2 size={16} color={C.accent}/><Text style={s.headerTitle}>Berichte</Text></View>
          <Text style={s.headerSub}>Übersicht & Export</Text>
        </View>
        <TouchableOpacity style={s.webBtn} onPress={() => Linking.openURL("https://elektrogenius.de")}>
          <Globe size={16} color={C.accent} />
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>

        {/* Übersicht Karten */}
        <View style={s.cardGrid}>
          <View style={[s.card, { borderColor:"rgba(245,166,35,0.3)" }]}>
            <Package size={20} color={C.accent} style={{marginBottom:6}} />
            <Text style={s.cardLabel}>{T.totalMaterials}</Text>
            <Text style={[s.cardValue, { color:C.accent }]}>{totalMats}</Text>
            <Text style={s.cardSub}>{totalQty} Einheiten</Text>
          </View>
          <View style={[s.card, { borderColor:"rgba(63,185,80,0.3)" }]}>
            <DollarSign size={20} color={C.green} style={{marginBottom:6}} />
            <Text style={s.cardLabel}>{T.totalValue}</Text>
            <Text style={[s.cardValue, { color:C.green, fontSize:20 }]}>€{totalValue.toFixed(0)}</Text>
            <Text style={s.cardSub}>Gesamtwert</Text>
          </View>
          <View style={[s.card, { borderColor:"rgba(245,166,35,0.3)" }]}>
            <AlertTriangle size={20} color={C.accent} style={{marginBottom:6}} />
            <Text style={s.cardLabel}>{T.lowStock}</Text>
            <Text style={[s.cardValue, { color:C.accent }]}>{lowCount}</Text>
            <Text style={s.cardSub}>Nachbestellen</Text>
          </View>
          <View style={[s.card, { borderColor:"rgba(248,81,73,0.3)" }]}>
            <AlertCircle size={20} color={C.red} style={{marginBottom:6}} />
            <Text style={s.cardLabel}>{T.outOfStock}</Text>
            <Text style={[s.cardValue, { color:C.red }]}>{outCount}</Text>
            <Text style={s.cardSub}>Dringend</Text>
          </View>
        </View>

        {/* Nach Ordner */}
        <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:10}}><Folder size={14} color={C.text3}/><Text style={s.sectionLabel}>Nach Ordner</Text></View>
        {folderStats.map(({folder,count,value,low}) => (
          <View key={folder.id} style={s.folderRow}>
            <Folder size={20} color={C.accent} />
            <View style={{ flex:1 }}>
              <Text style={s.folderName}>{folder.name}</Text>
              <Text style={s.folderSub}>{count} Artikel · €{value.toFixed(0)}</Text>
            </View>
            {low>0 && <View style={s.lowBadge}><AlertTriangle size={11} color={C.red}/><Text style={{ fontSize:11, fontWeight:"700", color:C.red, marginLeft:3 }}>{low}</Text></View>}
          </View>
        ))}

        {/* Nach Kategorie */}
        <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:16,marginBottom:10}}><Tag size={14} color={C.text3}/><Text style={s.sectionLabel}>Nach Kategorie</Text></View>
        {catStats.map(c => (
          <View key={c.cat} style={s.catRow}>
            <Package size={18} color={C.text2} style={{width:28}} />
            <View style={{ flex:1 }}>
              <Text style={s.catName}>{c.cat.charAt(0).toUpperCase()+c.cat.slice(1)}</Text>
              <View style={s.catBar}><View style={[s.catBarFill, { width:`${totalMats>0?(c.count/totalMats)*100:0}%` as any }]}/></View>
            </View>
            <View style={{ alignItems:"flex-end" }}>
              <Text style={{ fontSize:12, color:C.text }}>{c.count} Artikel</Text>
              <Text style={{ fontSize:11, color:C.accent }}>€{c.value.toFixed(0)}</Text>
            </View>
          </View>
        ))}

        {/* Export Buttons */}
        <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:16,marginBottom:10}}><Download size={14} color={C.text3}/><Text style={s.sectionLabel}>Exportieren</Text></View>
        <TouchableOpacity style={[s.exportBtn, { borderColor:"rgba(63,185,80,0.3)", backgroundColor:"rgba(63,185,80,0.08)" }]} onPress={exportCSV} disabled={exporting}>
          {exporting && exportType==="csv" ? <ActivityIndicator color={C.green} size="small" /> : <BarChart2 size={24} color={C.green} />}
          <View style={{ flex:1 }}>
            <Text style={[s.exportTitle, { color:C.green }]}>CSV Export (Excel)</Text>
            <Text style={s.exportSub}>Alle Materialien als Tabelle · In Excel öffnen</Text>
          </View>
          <ChevronRight size={16} color={C.text3} />
        </TouchableOpacity>

        <TouchableOpacity style={[s.exportBtn, { borderColor:"rgba(245,166,35,0.3)", backgroundColor:"rgba(245,166,35,0.08)" }]} onPress={exportHTML} disabled={exporting}>
          {exporting && exportType==="html" ? <ActivityIndicator color={C.accent} size="small" /> : <FileText size={24} color={C.accent} />}
          <View style={{ flex:1 }}>
            <Text style={[s.exportTitle, { color:C.accent }]}>HTML Bericht</Text>
            <Text style={s.exportSub}>Vollständiger Lagerbericht · Im Browser öffnen & drucken</Text>
          </View>
          <ChevronRight size={16} color={C.text3} />
        </TouchableOpacity>

        <View style={ { height: bottomPad + 40 } } />
      </ScrollView>
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
  webBtn:{ width:34, height:34, backgroundColor:C.accentBg, borderWidth:0.5, borderColor:"rgba(245,166,35,0.3)", borderRadius:10, alignItems:"center", justifyContent:"center" },
  content:{ flex:1, padding:14 },
  cardGrid:{ flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:16 },
  card:{ width:"47%", backgroundColor:C.surface, borderWidth:0.5, borderRadius:12, padding:13 },
  cardIcon:{ fontSize:20, marginBottom:6 },
  cardLabel:{ fontSize:10, color:C.text3, marginBottom:3 },
  cardValue:{ fontSize:26, fontWeight:"700", color:C.text },
  cardSub:{ fontSize:10, color:C.text2, marginTop:2 },
  sectionLabel:{ fontSize:10, fontWeight:"700", color:C.text3, textTransform:"uppercase", letterSpacing:0.8 },
  folderRow:{ flexDirection:"row", alignItems:"center", gap:10, backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:10, padding:12, marginBottom:6 },
  folderName:{ fontSize:13, fontWeight:"600", color:C.text },
  folderSub:{ fontSize:11, color:C.text2 },
  lowBadge:{ flexDirection:"row", alignItems:"center", backgroundColor:"rgba(248,81,73,0.15)", paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  catRow:{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:10, borderBottomWidth:0.5, borderBottomColor:C.border },
  catName:{ fontSize:12, fontWeight:"500", color:C.text, marginBottom:4 },
  catBar:{ height:4, backgroundColor:C.border2, borderRadius:2, overflow:"hidden" },
  catBarFill:{ height:4, backgroundColor:C.accent, borderRadius:2 },
  exportBtn:{ flexDirection:"row", alignItems:"center", gap:14, borderWidth:0.5, borderRadius:12, padding:14, marginBottom:8 },
  exportTitle:{ fontSize:13, fontWeight:"700", marginBottom:2 },
  exportSub:{ fontSize:11, color:C.text2 },
});
