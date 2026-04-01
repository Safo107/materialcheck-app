// app/warehouse.tsx - Geteiltes Lager mit Echtzeit Auto-Sync
import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTeamStore } from "../teamStore";
import {
  Warehouse, Package, ArrowLeft, Plus, Trash2, AlertTriangle,
  RotateCcw, ListChecks, Activity, CheckCircle, Pencil, Check, X,
} from "lucide-react-native";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

export default function WarehouseScreen() {
  const { warehouseId, warehouseName } = useLocalSearchParams<{ warehouseId:string; warehouseName:string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { company, activeUsers, connectWebSocket, disconnectWebSocket, syncWarehouse, loadWarehouse, sendMaterialChange } = useTeamStore();

  const [materials, setMaterials] = useState<any[]>([]);
  const [tasks, setTasks]         = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [userRole, setUserRole]   = useState("member");
  const [myEmail, setMyEmail]     = useState("");
  const [myName, setMyName]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [liveMsg, setLiveMsg]     = useState<string|null>(null);
  const [activeTab, setActiveTab] = useState<"materials"|"tasks"|"activity">("materials");

  // Add Material
  const [showAddMat,   setShowAddMat]   = useState(false);
  const [newMatName,   setNewMatName]   = useState("");
  const [newMatQty,    setNewMatQty]    = useState("0");
  const [newMatUnit,   setNewMatUnit]   = useState("Stk");
  const [newMatMin,    setNewMatMin]    = useState("5");
  const [newMatPrice,  setNewMatPrice]  = useState("0");

  // Edit Material
  const [editMat,   setEditMat]    = useState<any|null>(null);
  const [editName,  setEditName]   = useState("");
  const [editQty,   setEditQty]    = useState("0");
  const [editUnit,  setEditUnit]   = useState("Stk");
  const [editMin,   setEditMin]    = useState("5");
  const [editPrice, setEditPrice]  = useState("0");

  // Delete Material confirm
  const [deleteMat, setDeleteMat] = useState<any|null>(null);

  // Set Qty modal (replaces Alert.prompt)
  const [setQtyMat, setSetQtyMat] = useState<any|null>(null);
  const [setQtyVal, setSetQtyVal] = useState("");

  // Add Task
  const [showAddTask,  setShowAddTask]  = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc,  setNewTaskDesc]  = useState("");
  const [newTaskPrio,  setNewTaskPrio]  = useState<"high"|"medium"|"low">("medium");
  const [newTaskDue,   setNewTaskDue]   = useState("");

  // Delete Task confirm
  const [deleteTask, setDeleteTask] = useState<any|null>(null);

  const syncTimeout = useRef<any>(null);

  const canEdit = userRole !== "readonly";
  const currentUsers = activeUsers[warehouseId ?? ""] ?? [];

  useEffect(() => {
    init();
    return () => {
      if (warehouseId) disconnectWebSocket(warehouseId);
      if (syncTimeout.current) clearTimeout(syncTimeout.current);
    };
  }, []);

  const init = async () => {
    try {
      const raw = await AsyncStorage.getItem("eg-profile-v1");
      if (!raw) { setLoading(false); return; }
      const p = JSON.parse(raw);
      setMyEmail(p.email ?? ""); setMyName(p.userName || p.email || "");
      setLoading(true);
      const data = await loadWarehouse(warehouseId ?? "");
      if (data) {
        setMaterials(data.materials ?? []);
        setTasks(data.tasks ?? []);
        setActivities(data.activities ?? []);
        setUserRole(data.userRole ?? "member");
      }
      setLoading(false);
      if (warehouseId) {
        connectWebSocket(warehouseId, p.email ?? "", p.userName || p.email || "", handleWsUpdate);
      }
    } catch {
      setLoading(false);
    }
  };

  const handleWsUpdate = (data: any) => {
    if (data.type === "warehouse_updated") {
      setMaterials(data.materials ?? []);
      setTasks(data.tasks ?? []);
      setActivities(data.activities ?? []);
      showLive(`${data.updatedBy} hat synchronisiert`);
    } else if (data.type === "material_change") {
      setMaterials(prev => prev.map(m =>
        m.id === data.materialId ? { ...m, qty: data.qty } : m
      ));
      showLive(`${data.changedByName || data.changedBy} hat Bestand geändert`);
    } else if (data.type === "task_change") {
      setTasks(prev => prev.map(t =>
        t.id === data.taskId ? { ...t, status: data.status } : t
      ));
      showLive(`Aufgabe wurde aktualisiert`);
    }
  };

  const showLive = (msg: string) => {
    setLiveMsg(msg);
    setTimeout(() => setLiveMsg(null), 3000);
  };

  const autoSync = (newMats: any[], newTasks: any[], newActs: any[]) => {
    if (syncTimeout.current) clearTimeout(syncTimeout.current);
    syncTimeout.current = setTimeout(async () => {
      if (!warehouseId || !canEdit) return;
      setSyncing(true);
      await syncWarehouse(warehouseId, newMats, newTasks, newActs);
      setSyncing(false);
    }, 500);
  };

  const handleChangeQty = (mat: any, delta: number) => {
    if (!canEdit) return;
    const newQty = Math.max(0, (mat.qty || 0) + delta);
    const now = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
    const updatedMats = materials.map(m => m.id === mat.id ? { ...m, qty: newQty } : m);
    const newAct = { type: delta > 0 ? "add" : "remove", name: mat.name, amount: (delta > 0 ? "+" : "") + delta + " " + mat.unit, time: now, by: myName || myEmail };
    const updatedActs = [newAct, ...activities].slice(0, 40);
    setMaterials(updatedMats); setActivities(updatedActs);
    if (warehouseId) sendMaterialChange(warehouseId, mat.id, newQty);
    autoSync(updatedMats, tasks, updatedActs);
  };

  const handleSetQty = (mat: any, newQty: number) => {
    if (!canEdit) return;
    const now = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
    const diff = newQty - (mat.qty || 0);
    const updatedMats = materials.map(m => m.id === mat.id ? { ...m, qty: newQty } : m);
    const newAct = { type: diff >= 0 ? "add" : "remove", name: mat.name, amount: (diff >= 0 ? "+" : "") + diff + " " + mat.unit, time: now, by: myName || myEmail };
    const updatedActs = [newAct, ...activities].slice(0, 40);
    setMaterials(updatedMats); setActivities(updatedActs);
    if (warehouseId) sendMaterialChange(warehouseId, mat.id, newQty);
    autoSync(updatedMats, tasks, updatedActs);
  };

  const handleAddMaterial = () => {
    if (!newMatName.trim()) return;
    const newMat = { id: Date.now(), name: newMatName.trim(), qty: parseInt(newMatQty)||0, unit: newMatUnit, cat: "sonstiges", min: parseInt(newMatMin)||5, price: parseFloat(newMatPrice)||0, note: "" };
    const updatedMats = [...materials, newMat];
    const now = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
    const newAct = { type: "add", name: newMat.name, amount: `+${newMat.qty} ${newMat.unit}`, time: now, by: myName || myEmail };
    const updatedActs = [newAct, ...activities].slice(0, 40);
    setMaterials(updatedMats); setActivities(updatedActs);
    setShowAddMat(false); setNewMatName(""); setNewMatQty("0"); setNewMatUnit("Stk"); setNewMatMin("5"); setNewMatPrice("0");
    autoSync(updatedMats, tasks, updatedActs);
  };

  // ── Material bearbeiten ────────────────────────────
  const openEditMat = (mat: any) => {
    setEditMat(mat);
    setEditName(mat.name || "");
    setEditQty(String(mat.qty || 0));
    setEditUnit(mat.unit || "Stk");
    setEditMin(String(mat.min || 5));
    setEditPrice(String(mat.price || 0));
  };

  const saveEditMat = () => {
    if (!editMat || !editName.trim()) return;
    const updatedMats = materials.map(m => m.id === editMat.id ? {
      ...m, name: editName.trim(), qty: parseInt(editQty)||0, unit: editUnit, min: parseInt(editMin)||5, price: parseFloat(editPrice)||0,
    } : m);
    const now = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
    const newAct = { type:"add", name:editName.trim(), amount:"bearbeitet", time:now, by:myName||myEmail };
    const updatedActs = [newAct, ...activities].slice(0, 40);
    setMaterials(updatedMats); setActivities(updatedActs);
    setEditMat(null);
    autoSync(updatedMats, tasks, updatedActs);
  };

  // ── Material löschen (Modal statt Alert) ──────────
  const confirmDeleteMat = () => {
    if (!deleteMat) return;
    const updatedMats = materials.filter(m => m.id !== deleteMat.id);
    const now = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
    const newAct = { type:"remove", name:deleteMat.name, amount:"gelöscht", time:now, by:myName||myEmail };
    const updatedActs = [newAct, ...activities].slice(0, 40);
    setMaterials(updatedMats); setActivities(updatedActs);
    setDeleteMat(null);
    autoSync(updatedMats, tasks, updatedActs);
  };

  // ── Menge setzen Modal ─────────────────────────────
  const openSetQty = (mat: any) => {
    setSetQtyMat(mat);
    setSetQtyVal(String(mat.qty || 0));
  };

  const confirmSetQty = () => {
    if (!setQtyMat) return;
    const n = parseInt(setQtyVal);
    if (!isNaN(n) && n >= 0) handleSetQty(setQtyMat, n);
    setSetQtyMat(null);
  };

  // ── Aufgaben ───────────────────────────────────────
  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask = { id: Date.now(), title: newTaskTitle.trim(), description: newTaskDesc, priority: newTaskPrio, status: "open", dueDate: newTaskDue, assignedTo: myName||myEmail, createdAt: new Date().toISOString().slice(0,10) };
    const updatedTasks = [...tasks, newTask];
    const now = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
    const newAct = { type:"task", name:newTask.title, amount:"erstellt", time:now, by:myName||myEmail };
    const updatedActs = [newAct, ...activities].slice(0, 40);
    setTasks(updatedTasks); setActivities(updatedActs);
    setShowAddTask(false); setNewTaskTitle(""); setNewTaskDesc(""); setNewTaskDue("");
    autoSync(materials, updatedTasks, updatedActs);
  };

  const handleTaskStatus = (task: any) => {
    if (!canEdit) return;
    const cycle: any = { open: "inprogress", inprogress: "done", done: "open" };
    const newStatus = cycle[task.status];
    const labelMap: any = { inprogress:"In Arbeit", done:"Erledigt", open:"Offen" };
    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
    const now = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
    const newAct = { type:"task", name:task.title, amount:`→ ${labelMap[newStatus]||newStatus}`, time:now, by:myName||myEmail };
    const updatedActs = [newAct, ...activities].slice(0, 40);
    setTasks(updatedTasks); setActivities(updatedActs);
    if (warehouseId) useTeamStore.getState().sendTaskChange(warehouseId, task.id, newStatus);
    autoSync(materials, updatedTasks, updatedActs);
  };

  const confirmDeleteTask = () => {
    if (!deleteTask) return;
    const updatedTasks = tasks.filter(t => t.id !== deleteTask.id);
    const now = new Date().toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit" });
    const newAct = { type:"remove", name:deleteTask.title, amount:"gelöscht", time:now, by:myName||myEmail };
    const updatedActs = [newAct, ...activities].slice(0, 40);
    setTasks(updatedTasks); setActivities(updatedActs);
    setDeleteTask(null);
    autoSync(materials, updatedTasks, updatedActs);
  };

  // ── Verlauf Übersetzung ───────────────────────────
  const translateAmt = (amount: string): string => amount
    .replace("→ inprogress", "→ In Arbeit")
    .replace("→ done", "→ Erledigt")
    .replace("→ open", "→ Offen")
    .replace("erstellt", "Erstellt")
    .replace("bearbeitet", "Bearbeitet")
    .replace("gelöscht", "Gelöscht");

  const TASK_STATUS: any = {
    open:       { label:"Offen",    color:C.accent, bg:"rgba(245,166,35,0.15)" },
    inprogress: { label:"In Arbeit",color:C.blue,   bg:"rgba(79,163,247,0.15)" },
    done:       { label:"Erledigt", color:C.green,  bg:"rgba(63,185,80,0.15)" },
  };
  const TASK_PRIO: any = {
    high:   { label:"Hoch",    color:C.red },
    medium: { label:"Mittel",  color:C.accent },
    low:    { label:"Niedrig", color:C.green },
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={["top","left","right"]}>
        <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
          <ActivityIndicator color={C.accent} size="large"/>
          <Text style={{ color:C.text2, marginTop:12 }}>Lade Lager...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const lowCount = materials.filter(m => (m.qty||0) < (m.min||0)).length;
  const openTasks = tasks.filter(t => t.status !== "done").length;

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/company")}>
          <ArrowLeft size={18} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={s.headerTitle} numberOfLines={1}>{warehouseName || "Lager"}</Text>
          <Text style={s.headerSub}>{materials.length} Mat. · {userRole==="readonly"?" Lesen":" Bearbeiten"}{syncing?" · Sync...":""}</Text>
        </View>
        {canEdit && (
          <TouchableOpacity style={s.addBtn} onPress={() => activeTab==="tasks" ? setShowAddTask(true) : setShowAddMat(true)}>
            <Plus size={18} color={C.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* LIVE UPDATE */}
      {liveMsg && (
        <View style={s.liveBanner}>
          <View style={s.liveDot}/>
          <Text style={s.liveText}>{liveMsg}</Text>
        </View>
      )}

      {/* AKTIVE NUTZER */}
      {currentUsers.length > 0 && (
        <View style={s.activeRow}>
          <View style={s.liveDot}/>
          <Text style={s.activeText}>Aktiv: </Text>
          <Text style={[s.activeText, { color:C.green, fontWeight:"600" }]}>
            {currentUsers.map((u:any) => u.name||u.email).join(", ")}
          </Text>
        </View>
      )}

      {/* TABS */}
      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, activeTab==="materials"&&s.tabActive]} onPress={()=>setActiveTab("materials")}>
          <Text style={[s.tabText, activeTab==="materials"&&s.tabTextActive]}>
            Material ({materials.length}){lowCount>0?` [${lowCount}]`:""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab==="tasks"&&s.tabActive]} onPress={()=>setActiveTab("tasks")}>
          <Text style={[s.tabText, activeTab==="tasks"&&s.tabTextActive]}>
            Aufgaben ({openTasks})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab==="activity"&&s.tabActive]} onPress={()=>setActiveTab("activity")}>
          <Text style={[s.tabText, activeTab==="activity"&&s.tabTextActive]}>Verlauf</Text>
        </TouchableOpacity>
      </View>

      {/* ── MATERIALIEN ── */}
      {activeTab === "materials" && (
        <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad+20 }}>
          {materials.length === 0 ? (
            <View style={s.emptyState}>
              <Package size={42} color={C.text3} />
              <Text style={s.emptyTitle}>{canEdit?"Noch keine Materialien":"Lager ist leer"}</Text>
              {canEdit&&<TouchableOpacity style={[s.bigBtn,{backgroundColor:C.accent,marginTop:12}]} onPress={()=>setShowAddMat(true)}>
                <Text style={{color:"#000",fontWeight:"700",fontSize:13}}>+ Material hinzufügen</Text>
              </TouchableOpacity>}
            </View>
          ) : materials.map(mat => {
            const isLow = (mat.qty||0) < (mat.min||0) && (mat.qty||0) > 0;
            const isEmpty = (mat.qty||0) === 0;
            return (
              <TouchableOpacity
                key={mat.id}
                style={s.matCard}
                onLongPress={() => canEdit && openEditMat(mat)}
                delayLongPress={500}
                activeOpacity={0.8}>
                <View style={[s.matIcon, { backgroundColor: isEmpty?"rgba(248,81,73,0.12)":isLow?"rgba(245,166,35,0.12)":C.accentBg }]}>
                  <Package size={18} color={isEmpty?C.red:isLow?C.accent:C.green} />
                </View>
                <View style={s.matInfo}>
                  <Text style={s.matName}>{mat.name}</Text>
                  <View style={{ flexDirection:"row", gap:6, flexWrap:"wrap" }}>
                    <View style={[s.badge, { backgroundColor: isEmpty?"rgba(248,81,73,0.15)":isLow?"rgba(245,166,35,0.15)":"rgba(63,185,80,0.15)" }]}>
                      <Text style={[s.badgeText, { color: isEmpty?C.red:isLow?C.accent:C.green }]}>{isEmpty?"Leer":isLow?"Niedrig":"OK"}</Text>
                    </View>
                    <Text style={{ fontSize:10, color:C.text3 }}>Min: {mat.min||0} {mat.unit}</Text>
                    {(mat.price||0)>0&&<Text style={{ fontSize:10, color:C.text2 }}>€{((mat.qty||0)*(mat.price||0)).toFixed(0)}</Text>}
                  </View>
                </View>
                {canEdit ? (
                  <View style={s.qtyCtrl}>
                    <TouchableOpacity style={s.qtyBtn} onPress={()=>handleChangeQty(mat,-1)}>
                      <Text style={{color:C.red,fontSize:20,fontWeight:"700"}}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onLongPress={()=>openSetQty(mat)} delayLongPress={400}>
                      <Text style={s.qtyNum}>{mat.qty||0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.qtyBtn} onPress={()=>handleChangeQty(mat,1)}>
                      <Text style={{color:C.green,fontSize:20,fontWeight:"700"}}>+</Text>
                    </TouchableOpacity>
                    <Text style={s.qtyUnit}>{mat.unit}</Text>
                    <TouchableOpacity style={s.editBtn} onPress={()=>openEditMat(mat)}>
                      <Pencil size={11} color={C.text2} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.deleteBtn} onPress={()=>setDeleteMat(mat)}>
                      <Trash2 size={11} color={C.red} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignItems:"flex-end" }}>
                    <Text style={{ fontSize:18, fontWeight:"700", color:C.text }}>{mat.qty||0}</Text>
                    <Text style={{ fontSize:10, color:C.text3 }}>{mat.unit}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── AUFGABEN ── */}
      {activeTab === "tasks" && (
        <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad+20 }}>
          {tasks.length === 0 ? (
            <View style={s.emptyState}>
              <ListChecks size={42} color={C.text3} />
              <Text style={s.emptyTitle}>Noch keine Aufgaben</Text>
              {canEdit&&<TouchableOpacity style={[s.bigBtn,{backgroundColor:C.accent,marginTop:12}]} onPress={()=>setShowAddTask(true)}>
                <Text style={{color:"#000",fontWeight:"700",fontSize:13}}>+ Aufgabe erstellen</Text>
              </TouchableOpacity>}
            </View>
          ) : tasks.map(task=>(
            <View key={task.id} style={s.taskCard}>
              <TouchableOpacity style={[s.taskStatus, { backgroundColor: TASK_STATUS[task.status]?.bg }]} onPress={()=>canEdit&&handleTaskStatus(task)}>
                <Text style={{ fontSize:11, fontWeight:"700", color: TASK_STATUS[task.status]?.color }}>{TASK_STATUS[task.status]?.label}</Text>
              </TouchableOpacity>
              <View style={{ flex:1 }}>
                <Text style={[s.taskTitle, task.status==="done"&&{textDecorationLine:"line-through",color:C.text3}]}>{task.title}</Text>
                {task.description?<Text style={s.taskDesc}>{task.description}</Text>:null}
                <View style={{ flexDirection:"row", gap:8, marginTop:4 }}>
                  <Text style={{ fontSize:10, color: TASK_PRIO[task.priority]?.color }}>{TASK_PRIO[task.priority]?.label}</Text>
                  {task.dueDate?<Text style={{ fontSize:10, color:C.text3 }}>Fällig: {task.dueDate}</Text>:null}
                  {task.assignedTo?<Text style={{ fontSize:10, color:C.text2 }}>{task.assignedTo}</Text>:null}
                </View>
              </View>
              <View style={{flexDirection:"row",gap:6,alignItems:"center"}}>
                {canEdit&&<TouchableOpacity onPress={()=>canEdit&&handleTaskStatus(task)} style={{padding:4}}>
                  <RotateCcw size={14} color={C.text3} />
                </TouchableOpacity>}
                {canEdit&&<TouchableOpacity onPress={()=>setDeleteTask(task)} style={s.deleteBtn}>
                  <Trash2 size={11} color={C.red} />
                </TouchableOpacity>}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── VERLAUF ── */}
      {activeTab === "activity" && (
        <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPad+20 }}>
          {activities.length === 0 ? (
            <View style={s.emptyState}><Activity size={42} color={C.text3} /><Text style={s.emptyTitle}>Noch keine Aktivitäten</Text></View>
          ) : activities.map((act,i)=>(
            <View key={i} style={s.actItem}>
              <View style={[s.actIcon, { backgroundColor: act.type==="add"?"rgba(63,185,80,0.12)":act.type==="task"?"rgba(79,163,247,0.12)":"rgba(248,81,73,0.12)" }]}>
                {act.type==="add"?<Package size={14} color={C.green}/>:act.type==="task"?<CheckCircle size={14} color={C.blue}/>:<Trash2 size={14} color={C.red}/>}
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.actName}>{act.name}</Text>
                {act.by?<Text style={s.actBy}>von {act.by}</Text>:null}
              </View>
              <View style={{ alignItems:"flex-end" }}>
                <Text style={[s.actAmount, { color:act.type==="add"?"":act.type==="task"?C.blue:C.red }]}>{translateAmt(act.amount)}</Text>
                <Text style={s.actTime}>{act.time}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── MATERIAL HINZUFÜGEN MODAL ── */}
      <Modal visible={showAddMat} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowAddMat(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet, { paddingBottom: bottomPad+16 }]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>Material hinzufügen</Text>
            <Text style={s.formLabel}>NAME *</Text>
            <TextInput style={s.formInput} placeholder="z.B. NYM-J 3x1,5" placeholderTextColor={C.text3} value={newMatName} onChangeText={setNewMatName} autoFocus/>
            <View style={{ flexDirection:"row", gap:10 }}>
              <View style={{ flex:1 }}>
                <Text style={s.formLabel}>BESTAND</Text>
                <TextInput style={s.formInput} keyboardType="numeric" value={newMatQty} onChangeText={setNewMatQty}/>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.formLabel}>EINHEIT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection:"row", gap:6 }}>
                    {["m","Stk","Pkg","Rolle","kg"].map(u=>(
                      <TouchableOpacity key={u} onPress={()=>setNewMatUnit(u)} style={[s.chip, newMatUnit===u&&{borderColor:C.accent,backgroundColor:C.accentBg}]}>
                        <Text style={{ fontSize:11, color:newMatUnit===u?C.accent:C.text2 }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
            <View style={{ flexDirection:"row", gap:10 }}>
              <View style={{ flex:1 }}>
                <Text style={s.formLabel}>MINDESTBESTAND</Text>
                <TextInput style={s.formInput} keyboardType="numeric" value={newMatMin} onChangeText={setNewMatMin}/>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.formLabel}>PREIS / EINHEIT</Text>
                <TextInput style={s.formInput} keyboardType="decimal-pad" value={newMatPrice} onChangeText={setNewMatPrice}/>
              </View>
            </View>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:newMatName.trim()?C.accent:C.surface3}]} onPress={handleAddMaterial} disabled={!newMatName.trim()}>
              <Text style={[s.btnPrimaryText,{color:newMatName.trim()?"#000":C.text2}]}>Hinzufügen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowAddMat(false)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MATERIAL BEARBEITEN MODAL ── */}
      <Modal visible={!!editMat} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setEditMat(null)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet, { paddingBottom: bottomPad+16 }]}>
            <View style={s.modalHandle}/>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:14}}>
              <Pencil size={16} color={C.accent}/>
              <Text style={s.modalTitle}>Material bearbeiten</Text>
            </View>
            <Text style={s.formLabel}>NAME *</Text>
            <TextInput style={s.formInput} value={editName} onChangeText={setEditName} autoFocus/>
            <View style={{ flexDirection:"row", gap:10 }}>
              <View style={{ flex:1 }}>
                <Text style={s.formLabel}>BESTAND</Text>
                <TextInput style={s.formInput} keyboardType="numeric" value={editQty} onChangeText={setEditQty}/>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.formLabel}>EINHEIT</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection:"row", gap:6 }}>
                    {["m","Stk","Pkg","Rolle","kg"].map(u=>(
                      <TouchableOpacity key={u} onPress={()=>setEditUnit(u)} style={[s.chip, editUnit===u&&{borderColor:C.accent,backgroundColor:C.accentBg}]}>
                        <Text style={{ fontSize:11, color:editUnit===u?C.accent:C.text2 }}>{u}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>
            <View style={{ flexDirection:"row", gap:10 }}>
              <View style={{ flex:1 }}>
                <Text style={s.formLabel}>MINDESTBESTAND</Text>
                <TextInput style={s.formInput} keyboardType="numeric" value={editMin} onChangeText={setEditMin}/>
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.formLabel}>PREIS / EINHEIT</Text>
                <TextInput style={s.formInput} keyboardType="decimal-pad" value={editPrice} onChangeText={setEditPrice}/>
              </View>
            </View>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.accent}]} onPress={saveEditMat}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                <Check size={14} color="#000"/>
                <Text style={s.btnPrimaryText}>Speichern</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setEditMat(null)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── MENGE SETZEN MODAL ── */}
      <Modal visible={!!setQtyMat} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <Text style={s.dialogTitle}>Menge setzen</Text>
            <Text style={s.dialogSub}>{setQtyMat?.name} — aktuelle Menge: {setQtyMat?.qty||0} {setQtyMat?.unit}</Text>
            <TextInput
              style={[s.formInput,{fontSize:20,textAlign:"center",marginBottom:16}]}
              keyboardType="numeric"
              value={setQtyVal}
              onChangeText={setSetQtyVal}
              autoFocus
              selectTextOnFocus
            />
            <View style={{flexDirection:"row",gap:10}}>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2,flex:1}]} onPress={()=>setSetQtyMat(null)}>
                <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.accent,flex:1}]} onPress={confirmSetQty}>
                <Text style={{color:"#000",fontWeight:"700"}}>Setzen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MATERIAL LÖSCHEN CONFIRM ── */}
      <Modal visible={!!deleteMat} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:6}}>
              <Trash2 size={18} color={C.red}/>
              <Text style={s.dialogTitle}>Material löschen</Text>
            </View>
            <Text style={s.dialogSub}>"{deleteMat?.name}" aus dem Lager entfernen?</Text>
            <View style={{flexDirection:"row",gap:10}}>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2,flex:1}]} onPress={()=>setDeleteMat(null)}>
                <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:"rgba(248,81,73,0.15)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)",flex:1}]} onPress={confirmDeleteMat}>
                <Text style={{color:C.red,fontWeight:"700"}}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── AUFGABE HINZUFÜGEN MODAL ── */}
      <Modal visible={showAddTask} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowAddTask(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet, { paddingBottom: bottomPad+16 }]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>Aufgabe erstellen</Text>
            <Text style={s.formLabel}>TITEL *</Text>
            <TextInput style={s.formInput} placeholder="z.B. Kabel verlegen" placeholderTextColor={C.text3} value={newTaskTitle} onChangeText={setNewTaskTitle} autoFocus/>
            <Text style={s.formLabel}>BESCHREIBUNG</Text>
            <TextInput style={[s.formInput,{height:64,textAlignVertical:"top"}]} placeholder="Details..." placeholderTextColor={C.text3} multiline value={newTaskDesc} onChangeText={setNewTaskDesc}/>
            <Text style={s.formLabel}>PRIORITÄT</Text>
            <View style={{ flexDirection:"row", gap:8, marginBottom:12 }}>
              {(["high","medium","low"] as const).map(p=>(
                <TouchableOpacity key={p} onPress={()=>setNewTaskPrio(p)}
                  style={[s.chip, newTaskPrio===p&&{borderColor:TASK_PRIO[p].color,backgroundColor:`${TASK_PRIO[p].color}15`}]}>
                  <Text style={{ fontSize:11, color:newTaskPrio===p?TASK_PRIO[p].color:C.text2 }}>{TASK_PRIO[p].label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.formLabel}>FÄLLIG AM</Text>
            <TextInput style={s.formInput} placeholder="z.B. 2026-04-01" placeholderTextColor={C.text3} value={newTaskDue} onChangeText={setNewTaskDue}/>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:newTaskTitle.trim()?C.accent:C.surface3}]} onPress={handleAddTask} disabled={!newTaskTitle.trim()}>
              <Text style={[s.btnPrimaryText,{color:newTaskTitle.trim()?"#000":C.text2}]}>Aufgabe erstellen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowAddTask(false)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── AUFGABE LÖSCHEN CONFIRM ── */}
      <Modal visible={!!deleteTask} transparent animationType="fade">
        <View style={s.overlayCenter}>
          <View style={s.dialogBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:6}}>
              <Trash2 size={18} color={C.red}/>
              <Text style={s.dialogTitle}>Aufgabe löschen</Text>
            </View>
            <Text style={s.dialogSub}>"{deleteTask?.title}" wirklich löschen?</Text>
            <View style={{flexDirection:"row",gap:10}}>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:C.surface2,flex:1}]} onPress={()=>setDeleteTask(null)}>
                <Text style={{color:C.text2,fontWeight:"600"}}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn,{backgroundColor:"rgba(248,81,73,0.15)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)",flex:1}]} onPress={confirmDeleteTask}>
                <Text style={{color:C.red,fontWeight:"700"}}>Löschen</Text>
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
  headerTitle:{fontSize:15,fontWeight:"700",color:C.text},
  headerSub:{fontSize:10,color:C.text2},
  addBtn:{width:34,height:34,backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:10,alignItems:"center",justifyContent:"center"},
  liveBanner:{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(63,185,80,0.1)",borderBottomWidth:0.5,borderBottomColor:"rgba(63,185,80,0.2)",paddingHorizontal:14,paddingVertical:8},
  liveDot:{width:8,height:8,backgroundColor:C.green,borderRadius:4},
  liveText:{fontSize:12,color:C.green,fontWeight:"600"},
  activeRow:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:14,paddingVertical:5,backgroundColor:"rgba(63,185,80,0.05)",borderBottomWidth:0.5,borderBottomColor:C.border},
  activeText:{fontSize:11,color:C.text2},
  tabRow:{flexDirection:"row",borderBottomWidth:0.5,borderBottomColor:C.border,backgroundColor:C.surface},
  tab:{flex:1,paddingVertical:10,alignItems:"center"},
  tabActive:{borderBottomWidth:2,borderBottomColor:C.accent},
  tabText:{fontSize:10,fontWeight:"500",color:C.text3,textAlign:"center"},
  tabTextActive:{color:C.accent,fontWeight:"700"},
  content:{flex:1,padding:14},
  matCard:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:12,marginBottom:8,flexDirection:"row",alignItems:"center",gap:10},
  matIcon:{width:42,height:42,borderRadius:10,alignItems:"center",justifyContent:"center"},
  matInfo:{flex:1,minWidth:0},
  matName:{fontSize:13,fontWeight:"600",color:C.text,marginBottom:3},
  badge:{paddingHorizontal:7,paddingVertical:2,borderRadius:20},
  badgeText:{fontSize:10,fontWeight:"600"},
  qtyCtrl:{flexDirection:"row",alignItems:"center",gap:4},
  qtyBtn:{width:28,height:28,backgroundColor:C.surface2,borderRadius:14,alignItems:"center",justifyContent:"center"},
  qtyNum:{fontSize:16,fontWeight:"700",color:C.text,minWidth:24,textAlign:"center"},
  qtyUnit:{fontSize:10,color:C.text3},
  editBtn:{width:26,height:26,backgroundColor:C.surface2,borderRadius:7,alignItems:"center",justifyContent:"center"},
  deleteBtn:{width:26,height:26,backgroundColor:"rgba(248,81,73,0.1)",borderRadius:7,alignItems:"center",justifyContent:"center"},
  taskCard:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:14,marginBottom:8,flexDirection:"row",alignItems:"center",gap:10},
  taskStatus:{paddingHorizontal:8,paddingVertical:4,borderRadius:10,alignSelf:"flex-start"},
  taskTitle:{fontSize:13,fontWeight:"600",color:C.text,marginBottom:3},
  taskDesc:{fontSize:11,color:C.text2,marginBottom:2},
  actItem:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:10,borderBottomWidth:0.5,borderBottomColor:C.border},
  actIcon:{width:34,height:34,borderRadius:9,alignItems:"center",justifyContent:"center"},
  actName:{fontSize:12,fontWeight:"500",color:C.text},
  actBy:{fontSize:10,color:C.text3},
  actAmount:{fontSize:11,fontWeight:"700",color:C.green},
  actTime:{fontSize:10,color:C.text3},
  emptyState:{alignItems:"center",paddingVertical:40,gap:10},
  emptyTitle:{fontSize:18,fontWeight:"700",color:C.text},
  bigBtn:{borderRadius:12,padding:13,alignItems:"center"},
  modalOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end"},
  modalSheet:{backgroundColor:C.surface,borderTopLeftRadius:22,borderTopRightRadius:22,padding:20,borderTopWidth:0.5,borderTopColor:C.border2,maxHeight:"90%"},
  modalHandle:{width:34,height:3,backgroundColor:C.border2,borderRadius:2,alignSelf:"center",marginBottom:16},
  modalTitle:{fontSize:15,fontWeight:"700",color:C.text},
  formLabel:{fontSize:10,fontWeight:"600",color:C.text3,textTransform:"uppercase",letterSpacing:0.7,marginBottom:5,marginTop:10},
  formInput:{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8,padding:10,fontSize:13,color:C.text,marginBottom:6},
  chip:{paddingHorizontal:10,paddingVertical:6,backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8},
  btnPrimary:{borderRadius:8,padding:13,alignItems:"center",marginTop:8},
  btnPrimaryText:{color:"#000",fontWeight:"700",fontSize:14},
  overlayCenter:{flex:1,backgroundColor:"rgba(0,0,0,0.75)",alignItems:"center",justifyContent:"center"},
  dialogBox:{width:"85%",maxWidth:340,backgroundColor:C.surface,borderRadius:16,padding:20,borderWidth:0.5,borderColor:C.border2},
  dialogTitle:{fontSize:15,fontWeight:"700",color:C.text},
  dialogSub:{fontSize:13,color:C.text2,marginBottom:16,lineHeight:18,marginTop:4},
  dialogBtn:{padding:12,borderRadius:10,alignItems:"center"},
});
