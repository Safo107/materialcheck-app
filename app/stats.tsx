// app/stats.tsx - Statistik mit Links zu allen Tools
import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store";
import { useLang, t } from "../i18n";
import BottomNav from "../components/BottomNav";
import { Package, DollarSign, AlertTriangle, AlertCircle, Folder, BarChart2, ShoppingCart, Tag, ArrowLeft, Globe, Download, ClipboardList, RotateCcw, Truck, Wrench, Zap, Archive, Plus, Minus, Edit2, RefreshCw, Activity } from "lucide-react-native";

function webDownload(content: string, filename: string, mimeType: string) {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch(e) { Alert.alert("Fehler", String(e)); }
}

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7", purple:"#a371f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

const ACT_ICONS: Record<string,any> = { add:Plus, remove:Minus, edit:Edit2, folder:Folder, move:RefreshCw, task:ClipboardList, loan:RotateCcw };
const ACT_BG: Record<string,string> = {
  add:"rgba(63,185,80,0.15)", remove:"rgba(248,81,73,0.15)",
  edit:"rgba(245,166,35,0.15)", folder:"rgba(79,163,247,0.15)",
  move:"rgba(163,113,247,0.15)", task:"rgba(245,166,35,0.15)", loan:"rgba(79,163,247,0.15)",
};
const ACT_CLR: Record<string,string> = { add:"#3fb950", remove:"#f85149", edit:"#f5a623", folder:"#4fa3f7", move:"#a371f7", task:"#f5a623", loan:"#4fa3f7" };

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { lang } = useLang();
  const T = t(lang);
  const { folders, materials, tasks, suppliers, loans, activities, getTotalValue } = useStore();
  const [activeTab, setActiveTab] = useState<"overview"|"folders"|"activity">("overview");

  const total = materials.length;
  const low = materials.filter(m=>m.qty<m.min&&m.qty>0).length;
  const out = materials.filter(m=>m.qty===0).length;
  const ok = materials.filter(m=>m.qty>=m.min).length;
  const value = getTotalValue();
  const totalQty = materials.reduce((s,m)=>s+m.qty,0);
  const openTasks = tasks.filter(t=>t.status!=="done").length;
  const openLoans = loans.filter(l=>!l.returned).length;

  const catStats = Object.entries(CAT_ICONS).map(([cat,icon]) => {
    const mats = materials.filter(m=>m.cat===cat);
    return { cat, icon, count:mats.length, value:mats.reduce((s,m)=>s+m.qty*(m.price||0),0) };
  }).filter(c=>c.count>0).sort((a,b)=>b.count-a.count);

  const exportData = () => {
    try {
      const state = useStore.getState();
      const data = JSON.stringify({ folders:state.folders, materials:state.materials, exportDate:new Date().toISOString() }, null, 2);
      webDownload(data, `materialcheck-${new Date().toISOString().slice(0,10)}.json`, "application/json");
    } catch(e) { Alert.alert("Fehler", String(e)); }
  };

  const shareApp = async () => {
    try { await Share.share({ message:"MaterialCheck – ElektroGenius!\nhttps://elektrogenius.de" }); } catch {}
  };

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <View style={{flexDirection:"row",alignItems:"center",gap:6}}><BarChart2 size={16} color={C.accent}/><Text style={s.headerTitle}>{T.navStats}</Text></View>
          <Text style={s.headerSub}>ElektroGenius</Text>
        </View>
        <TouchableOpacity style={s.websiteBtn} onPress={() => Linking.openURL("https://elektrogenius.de")}>
          <Globe size={16} color={C.accent} />
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        {(["overview","folders","activity"] as const).map(tab => (
          <TouchableOpacity key={tab} style={[s.tab, activeTab===tab&&s.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab===tab&&s.tabTextActive]}>
              {tab==="overview"?T.overview:tab==="folders"?T.folders:T.activity}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>

        {activeTab === "overview" && <>
          {/* Hauptkarten */}
          <View style={s.statGrid}>
            {([
              { Icon:Package,       label:T.totalMaterials, value:String(total),                 sub:`${totalQty} ${T.entries}`, color:C.accent, bc:"rgba(245,166,35,0.3)" },
              { Icon:DollarSign,    label:T.totalValue,     value:`€${value.toFixed(0)}`,   sub:"Gesamtwert",               color:C.green,  bc:"rgba(63,185,80,0.3)" },
              { Icon:AlertTriangle, label:T.lowStock,       value:String(low),                   sub:T.reorder,                  color:C.accent, bc:"rgba(245,166,35,0.3)" },
              { Icon:AlertCircle,   label:T.outOfStock,     value:String(out),                   sub:T.urgent,                   color:C.red,    bc:"rgba(248,81,73,0.3)" },
            ] as const).map(({Icon,label,value,sub,color,bc},i) => (
              <View key={i} style={[s.statCard, { borderColor:bc }]}>
                <Icon size={20} color={color} style={{marginBottom:6}} />
                <Text style={s.statLabel}>{label}</Text>
                <Text style={[s.statValue, { color:color }]}>{value}</Text>
                <Text style={s.statSub}>{sub}</Text>
              </View>
            ))}
          </View>

          {/* Quick Tools */}
          <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:10}}><Wrench size={14} color={C.text3}/><Text style={s.sectionLabel}>Werkzeuge</Text></View>
          <View style={s.toolsGrid}>
            <TouchableOpacity style={[s.toolBtn, { borderColor:"rgba(245,166,35,0.3)", backgroundColor:"rgba(245,166,35,0.05)" }]} onPress={() => router.push("/reports")}>
              <BarChart2 size={24} color={C.accent}/>
              <Text style={[s.toolTitle, { color:C.accent }]}>Berichte</Text>
              <Text style={s.toolSub}>CSV & PDF Export</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toolBtn, { borderColor:"rgba(79,163,247,0.3)", backgroundColor:"rgba(79,163,247,0.05)" }]} onPress={() => router.push("/suppliers")}>
              <Truck size={24} color={C.blue}/>
              <Text style={[s.toolTitle, { color:C.blue }]}>Lieferanten</Text>
              <Text style={s.toolSub}>{suppliers.length} gespeichert</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toolBtn, { borderColor:"rgba(163,113,247,0.3)", backgroundColor:"rgba(163,113,247,0.05)" }]} onPress={() => router.push("/loans")}>
              <RotateCcw size={24} color={C.purple}/>
              <Text style={[s.toolTitle, { color:C.purple }]}>Ausleihen</Text>
              <Text style={s.toolSub}>{openLoans} offen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toolBtn, { borderColor:"rgba(63,185,80,0.3)", backgroundColor:"rgba(63,185,80,0.05)" }]} onPress={() => router.push("/shopping")}>
              <ShoppingCart size={24} color={C.green}/>
              <Text style={[s.toolTitle, { color:C.green }]}>Einkauf</Text>
              <Text style={s.toolSub}>{low+out} Artikel</Text>
            </TouchableOpacity>
          </View>

          {/* Aufgaben Übersicht */}
          {tasks.length > 0 && <>
            <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:8,marginBottom:10}}><ClipboardList size={14} color={C.text3}/><Text style={s.sectionLabel}>Aufgaben</Text></View>
            <View style={s.taskOverview}>
              <View style={s.taskStat}>
                <Text style={[s.taskStatValue, { color:C.red }]}>{tasks.filter(t=>t.status==="open").length}</Text>
                <Text style={s.taskStatLabel}>Offen</Text>
              </View>
              <View style={s.taskStat}>
                <Text style={[s.taskStatValue, { color:C.accent }]}>{tasks.filter(t=>t.status==="inprogress").length}</Text>
                <Text style={s.taskStatLabel}>Aktiv</Text>
              </View>
              <View style={s.taskStat}>
                <Text style={[s.taskStatValue, { color:C.green }]}>{tasks.filter(t=>t.status==="done").length}</Text>
                <Text style={s.taskStatLabel}>Erledigt</Text>
              </View>
              <View style={s.taskStat}>
                <Text style={[s.taskStatValue, { color:C.text }]}>{tasks.length}</Text>
                <Text style={s.taskStatLabel}>Gesamt</Text>
              </View>
            </View>
          </>}

          {/* Bestandsübersicht */}
          <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:8,marginBottom:10}}><Archive size={14} color={C.text3}/><Text style={s.sectionLabel}>{T.stockOverview}</Text></View>
          <View style={s.progressCard}>
            {[
              { label:T.statusOk, count:ok, color:C.green },
              { label:T.statusLow, count:low, color:C.accent },
              { label:T.statusOut, count:out, color:C.red },
            ].map(row => (
              <View key={row.label} style={s.progressRow}>
                <View style={[s.progDot, { backgroundColor:row.color }]}/>
                <Text style={s.progLabel}>{row.label}</Text>
                <Text style={s.progCount}>{row.count}</Text>
                <View style={s.progBarWrap}><View style={[s.progBar, { width:`${total>0?(row.count/total)*100:0}%` as any, backgroundColor:row.color }]}/></View>
              </View>
            ))}
          </View>

          {/* Kategorie */}
          {catStats.length > 0 && <>
            <Text style={[s.sectionLabel, { marginTop:8 }]}>{T.byCategory}</Text>
            {catStats.map(c => (
              <View key={c.cat} style={s.catRow}>
                <Package size={18} color={C.text2} style={{width:30}}/>
                <View style={{ flex:1 }}>
                  <Text style={s.catName}>{c.cat.charAt(0).toUpperCase()+c.cat.slice(1)}</Text>
                  <View style={s.catBarWrap}><View style={[s.catBar, { width:`${total>0?(c.count/total)*100:0}%` as any }]}/></View>
                </View>
                <View style={{ alignItems:"flex-end" }}>
                  <Text style={s.catCount}>{c.count} {T.material}</Text>
                  {c.value>0&&<Text style={s.catValue}>€{c.value.toFixed(0)}</Text>}
                </View>
              </View>
            ))}
          </>}

          {/* Export */}
          <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:16,marginBottom:10}}><Download size={14} color={C.text3}/><Text style={s.sectionLabel}>{T.exportShare}</Text></View>
          <View style={s.actionGrid}>
            <TouchableOpacity style={s.actionBtn} onPress={() => router.push("/reports")}><BarChart2 size={24} color={C.accent}/><Text style={s.actionLabel}>Berichte</Text></TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={exportData}><Download size={24} color={C.blue}/><Text style={s.actionLabel}>{T.export}</Text></TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL("https://instagram.com/elektrogenius.de")}><Zap size={24} color={C.purple}/><Text style={s.actionLabel}>Instagram</Text></TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => Linking.openURL("https://elektrogenius.de")}><Globe size={24} color={C.green}/><Text style={s.actionLabel}>Website</Text></TouchableOpacity>
          </View>

          <View style={s.infoCard}>
            <View style={s.infoBadge}><Text style={s.infoBadgeText}>EG</Text></View>
            <View><Text style={s.infoTitle}>MaterialCheck</Text><Text style={s.infoSub}>ElektroGenius · v1.5.0</Text></View>
          </View>
        </>}

        {activeTab === "folders" && <>
          <Text style={[s.sectionLabel, { marginBottom:12 }]}>{folders.length} {T.folders} · {total} {T.materials}</Text>
          {folders.map(f => {
            const mats = materials.filter(m=>m.folderId===f.id);
            const fValue = mats.reduce((sum,m)=>sum+m.qty*(m.price||0),0);
            const fLow = mats.filter(m=>m.qty<m.min).length;
            const fTasks = tasks.filter(t=>t.folderId===f.id&&t.status!=="done").length;
            const fillPct = mats.length>0?Math.round((mats.filter(m=>m.qty>=m.min).length/mats.length)*100):0;
            return (
              <TouchableOpacity key={f.id} style={s.folderCard} onPress={() => router.push(`/folder/${f.id}`)}>
                <View style={s.folderCardTop}>
                  <View style={s.folderIconWrap}><Folder size={22} color={C.accent}/></View>
                  <View style={{ flex:1, marginLeft:12 }}>
                    <Text style={s.folderCardName}>{f.name}</Text>
                    <Text style={s.folderCardMeta}>{mats.length} {T.materials} · €{fValue.toFixed(0)}</Text>
                  </View>
                  <View style={{ alignItems:"flex-end", gap:4 }}>
                    {fLow>0&&<View style={s.alertBadge}><AlertTriangle size={10} color={C.red}/><Text style={s.alertBadgeText}> {fLow}</Text></View>}
                    {fTasks>0&&<View style={[s.alertBadge,{backgroundColor:"rgba(245,166,35,0.15)"}]}><ClipboardList size={10} color={C.accent}/><Text style={[s.alertBadgeText,{color:C.accent}]}> {fTasks}</Text></View>}
                  </View>
                </View>
                <View style={s.folderProgressWrap}><View style={[s.folderProgress, { width:`${fillPct}%` as any }]}/></View>
                <Text style={s.folderProgressLabel}>{fillPct}% {T.statusOk}</Text>
              </TouchableOpacity>
            );
          })}
        </>}

        {activeTab === "activity" && <>
          <Text style={[s.sectionLabel, { marginBottom:12 }]}>{activities.length} {T.entries}</Text>
          {activities.length===0 ? (
            <View style={s.emptyState}><Activity size={36} color={C.text3}/><Text style={s.emptyText}>{T.lastActivities}</Text></View>
          ) : activities.map((a,i) => (
            <View key={i} style={s.actItem}>
              <View style={[s.actIcon,{backgroundColor:ACT_BG[a.type]||C.surface2}]}>{ (() => { const Icon = ACT_ICONS[a.type]||Package; return <Icon size={14} color={ACT_CLR[a.type]||C.accent}/>; })() }</View>
              <View style={s.actInfo}><Text style={s.actName} numberOfLines={1}>{a.name}</Text><Text style={s.actTime}>{a.time}</Text></View>
              {a.amount?<Text style={[s.actAmount, { color:a.type==="remove"?C.red:a.type==="add"?C.green:C.accent }]}>{a.amount}</Text>:null}
            </View>
          ))}
        </>}

        <View style={ { height: bottomPad + 40 } } />
      </ScrollView>

      <BottomNav active="stats" />
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
  tabRow:{ flexDirection:"row", borderBottomWidth:0.5, borderBottomColor:C.border, backgroundColor:C.surface },
  tab:{ flex:1, paddingVertical:11, alignItems:"center" },
  tabActive:{ borderBottomWidth:2, borderBottomColor:C.accent },
  tabText:{ fontSize:12, fontWeight:"500", color:C.text3 },
  tabTextActive:{ color:C.accent, fontWeight:"700" },
  content:{ flex:1, padding:14 },
  sectionLabel:{ fontSize:10, fontWeight:"700", color:C.text3, textTransform:"uppercase", letterSpacing:0.9, marginBottom:10 },
  statGrid:{ flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:16 },
  statCard:{ width:"47%", backgroundColor:C.surface, borderWidth:0.5, borderRadius:12, padding:13 },
  statLabel:{ fontSize:10, color:C.text3, marginBottom:3 },
  statValue:{ fontSize:26, fontWeight:"700", color:C.text },
  statSub:{ fontSize:10, color:C.text2, marginTop:2 },
  toolsGrid:{ flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:8 },
  toolBtn:{ width:"47%", borderWidth:0.5, borderRadius:12, padding:14, alignItems:"center", gap:4 },
  toolTitle:{ fontSize:13, fontWeight:"700" },
  toolSub:{ fontSize:10, color:C.text2 },
  taskOverview:{ flexDirection:"row", backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:14, marginBottom:8 },
  taskStat:{ flex:1, alignItems:"center" },
  taskStatValue:{ fontSize:22, fontWeight:"700" },
  taskStatLabel:{ fontSize:10, color:C.text3, marginTop:2 },
  progressCard:{ backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:14, gap:12, marginBottom:8 },
  progressRow:{ flexDirection:"row", alignItems:"center", gap:8 },
  progDot:{ width:8, height:8, borderRadius:4 },
  progLabel:{ fontSize:12, color:C.text2, width:48 },
  progCount:{ fontSize:12, fontWeight:"700", color:C.text, width:24, textAlign:"right" },
  progBarWrap:{ flex:1, height:6, backgroundColor:C.border2, borderRadius:3, overflow:"hidden" },
  progBar:{ height:6, borderRadius:3 },
  catRow:{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:10, borderBottomWidth:0.5, borderBottomColor:C.border },
  catName:{ fontSize:12, fontWeight:"500", color:C.text, marginBottom:4 },
  catBarWrap:{ height:4, backgroundColor:C.border2, borderRadius:2, overflow:"hidden" },
  catBar:{ height:4, backgroundColor:C.accent, borderRadius:2 },
  catCount:{ fontSize:11, color:C.text2 },
  catValue:{ fontSize:11, color:C.accent, fontWeight:"600" },
  actionGrid:{ flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:16 },
  actionBtn:{ width:"47%", backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:14, alignItems:"center", gap:4 },
  actionLabel:{ fontSize:12, fontWeight:"600", color:C.text },
  infoCard:{ flexDirection:"row", alignItems:"center", gap:12, backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:14, marginBottom:16 },
  infoBadge:{ width:40, height:40, backgroundColor:"#1c2c55", borderWidth:1.5, borderColor:C.accent, borderRadius:10, alignItems:"center", justifyContent:"center" },
  infoBadgeText:{ color:C.accent, fontWeight:"700", fontSize:13 },
  infoTitle:{ fontSize:14, fontWeight:"700", color:C.text },
  infoSub:{ fontSize:11, color:C.text2, marginTop:2 },
  folderCard:{ backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:12, padding:14, marginBottom:10 },
  folderCardTop:{ flexDirection:"row", alignItems:"center", marginBottom:12 },
  folderCardName:{ fontSize:14, fontWeight:"700", color:C.text },
  folderCardMeta:{ fontSize:11, color:C.text2, marginTop:2 },
  alertBadge:{ flexDirection:"row", alignItems:"center", backgroundColor:"rgba(248,81,73,0.15)", paddingHorizontal:8, paddingVertical:3, borderRadius:20 },
  alertBadgeText:{ fontSize:11, fontWeight:"600", color:C.red },
  folderProgressWrap:{ height:4, backgroundColor:C.border2, borderRadius:2, overflow:"hidden", marginBottom:4 },
  folderProgress:{ height:4, backgroundColor:C.accent, borderRadius:2 },
  folderProgressLabel:{ fontSize:10, color:C.text3 },
  actItem:{ flexDirection:"row", alignItems:"center", gap:10, paddingVertical:10, borderBottomWidth:0.5, borderBottomColor:C.border },
  actIcon:{ width:34, height:34, borderRadius:9, alignItems:"center", justifyContent:"center" },
  actInfo:{ flex:1, minWidth:0 },
  actName:{ fontSize:12, fontWeight:"500", color:C.text },
  actTime:{ fontSize:10, color:C.text3, marginTop:1 },
  actAmount:{ fontSize:11, fontWeight:"700" },
  emptyState:{ alignItems:"center", paddingVertical:40, gap:10 },
  emptyText:{ fontSize:13, color:C.text3, textAlign:"center" },
});
