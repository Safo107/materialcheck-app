// app/profile.tsx - Profil komplett
import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Image, ActivityIndicator, Linking, Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLang, LANGUAGES, t, Language } from "../i18n";
import { useStore } from "../store";
import { useTeamStore } from "../teamStore";
import BottomNav from "../components/BottomNav";
import { Globe, Building2, User, Pencil, Cloud, Download, Lock, Unlock, AlertTriangle, Mail, Users, Settings, Smartphone, X, KeyRound, Info, LogOut, Warehouse, Crown, Zap, CreditCard } from "lucide-react-native";
import { useProStore } from "../proStore";

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d", surface3:"#2d333b",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", blue:"#4fa3f7", purple:"#a371f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

const BACKEND = "https://materialcheck-backend2.onrender.com";
const PROFILE_KEY = "eg-profile-v1";
const DEVICE_KEY = "eg-device-id";
const APP_PIN_KEY = "eg-app-pin";
const APP_LOCK_KEY = "eg-app-lock-enabled";

interface Profile {
  firmName:string; userName:string; email:string;
  logoUri:string|null; deviceId:string; updatedAt:string;
  hasPin?:boolean; companyId?:string; companyRole?:string;
}

// ── FETCH MIT TIMEOUT ────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("TIMEOUT");
    }
    throw err;
  }
}

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const ex = await AsyncStorage.getItem(DEVICE_KEY);
    if (ex) return ex;
    const id = "device_"+Date.now()+"_"+Math.random().toString(36).substr(2,6);
    await AsyncStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch { return "device_fallback"; }
}

// ── PIN PAD ──────────────────────────────────────
function PinPad({ title, subtitle, pin, onDigit, onDelete, status, statusMsg }:any) {
  return (
    <View style={pp.wrap}>
      <Text style={pp.title}>{title}</Text>
      {subtitle?<Text style={pp.sub}>{subtitle}</Text>:null}
      <View style={pp.dots}>
        {[0,1,2,3,4,5].map(i=>(
          <View key={i} style={[pp.dot, (pin||"").length>i&&pp.dotFilled]}/>
        ))}
      </View>
      {statusMsg?<Text style={[pp.status,{color:status==="ok"?C.green:C.red}]}>{statusMsg}</Text>:<View style={{height:20}}/>}
      <View style={pp.grid}>
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>(
          <TouchableOpacity key={i}
            style={[pp.key, k===""&&{opacity:0}, k==="⌫"&&pp.keyDel]}
            onPress={()=>k==="⌫"?onDelete():k!==""?onDigit(k):null}
            disabled={k===""}>
            <Text style={[pp.keyText, k==="⌫"&&{color:C.red}]}>{k}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
const pp = StyleSheet.create({
  wrap:{alignItems:"center",paddingVertical:8},
  title:{fontSize:17,fontWeight:"700",color:C.text,textAlign:"center",marginBottom:4},
  sub:{fontSize:12,color:C.text2,textAlign:"center",marginBottom:14},
  dots:{flexDirection:"row",gap:14,marginBottom:6},
  dot:{width:14,height:14,borderRadius:7,borderWidth:2,borderColor:C.border2},
  dotFilled:{backgroundColor:C.accent,borderColor:C.accent},
  status:{fontSize:12,fontWeight:"600",marginBottom:8,textAlign:"center"},
  grid:{flexDirection:"row",flexWrap:"wrap",width:240,gap:10,justifyContent:"center",marginTop:8},
  key:{width:70,height:58,backgroundColor:C.surface2,borderRadius:12,alignItems:"center",justifyContent:"center",borderWidth:0.5,borderColor:C.border2},
  keyDel:{backgroundColor:"rgba(248,81,73,0.1)",borderColor:"rgba(248,81,73,0.2)"},
  keyText:{fontSize:22,fontWeight:"600",color:C.text},
});

export default function ProfileScreen() {
  const router = useRouter();
  const {lang, setLang} = useLang();
  const T = t(lang);
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;

  const _store = useStore();
  const folders = _store?.folders ?? [];
  const materials = _store?.materials ?? [];
  const tasks = _store?.tasks ?? [];
  const suppliers = _store?.suppliers ?? [];
  const loans = _store?.loans ?? [];
  const restoreFromCloud = _store?.restoreFromCloud;

  // Abo-Status
  const { isPro, inTrial, trialEndsAt, load: loadPro } = useProStore();
  const [aboLoading, setAboLoading] = useState(false);
  const [aboError, setAboError] = useState("");

  const trialDaysLeft = useMemo(() => {
    if (!inTrial || !trialEndsAt) return 0;
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [inTrial, trialEndsAt]);

  const handleCheckout = async () => {
    const raw = await AsyncStorage.getItem(PROFILE_KEY).catch(() => null);
    const p = raw ? JSON.parse(raw) : null;
    const userEmail = p?.email || "";
    const deviceId = p?.deviceId || "";
    if (!userEmail) { setAboError("Bitte zuerst E-Mail im Profil speichern."); return; }
    setAboLoading(true); setAboError("");
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/stripe/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, deviceId }),
      }, 20000);
      const data = await res.json();
      if (data.url) { await Linking.openURL(data.url); }
      else { setAboError(data.detail || "Checkout konnte nicht gestartet werden."); }
    } catch { setAboError("Netzwerkfehler – Internetverbindung prüfen."); }
    finally { setAboLoading(false); }
  };

  const handlePortal = async () => {
    const raw = await AsyncStorage.getItem(PROFILE_KEY).catch(() => null);
    const p = raw ? JSON.parse(raw) : null;
    const userEmail = p?.email || "";
    if (!userEmail) { setAboError("Kein Profil gefunden."); return; }
    setAboLoading(true); setAboError("");
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/stripe/create-portal-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      }, 20000);
      const data = await res.json();
      if (data.url) { await Linking.openURL(data.url); }
      else { setAboError(data.detail || "Portal konnte nicht geöffnet werden."); }
    } catch { setAboError("Netzwerkfehler – Internetverbindung prüfen."); }
    finally { setAboLoading(false); }
  };

  // isPro nicht mehr benötigt — Sync ist für alle Nutzer kostenlos

  const company = useTeamStore(s => s?.company ?? null);
  const createCompany = useTeamStore(s => s?.createCompany);
  const loadCompany = useTeamStore(s => s?.loadCompany);
  const inviteMember = useTeamStore(s => s?.inviteMember);
  const loadCompanyByEmail = useTeamStore(s => s?.loadCompanyByEmail);
  const resetTeamData = useTeamStore(s => s?.resetTeamData);
  const dissolveCompany = useTeamStore(s => s?.dissolveCompany);

  const [profile, setProfile] = useState<Profile>({firmName:"",userName:"",email:"",logoUri:null,deviceId:"",updatedAt:""});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncStatus, setSyncStatus] = useState<"none"|"ok"|"error">("none");
  const [hasCloudPin, setHasCloudPin] = useState(false);

  // Edit Felder
  const [firmName, setFirmName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [logoUri, setLogoUri] = useState<string|null>(null);

  // Email PIN Prüfung
  const [showEmailPinModal, setShowEmailPinModal] = useState(false);
  const [emailPinInput, setEmailPinInput] = useState("");
  const [emailPinMsg, setEmailPinMsg] = useState("");
  const [emailPinStatus, setEmailPinStatus] = useState<"none"|"ok"|"error">("none");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Cloud PIN
  const [showCloudPinModal, setShowCloudPinModal] = useState(false);
  const [cloudPinStep, setCloudPinStep] = useState<"set"|"confirm">("set");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Profil laden
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadStep, setLoadStep] = useState<"email"|"pin">("email");
  const [loadEmail, setLoadEmail] = useState("");
  const [loadPin, setLoadPin] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [loadStatus, setLoadStatus] = useState<"none"|"ok"|"error">("none");
  const [foundFirm, setFoundFirm] = useState("");

  // Firma erstellen
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Firma auflösen
  const [showDissolveModal, setShowDissolveModal] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [dissolveMsg, setDissolveMsg] = useState("");

  // Info Modal (ersetzt Alert.alert)
  const [infoModal, setInfoModal] = useState(false);
  const [infoTitle, setInfoTitle] = useState("");
  const [infoText, setInfoText] = useState("");

  // Mitarbeiter einladen
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWarehouseId, setInviteWarehouseId] = useState("");
  const [inviteWarehouseName, setInviteWarehouseName] = useState("");
  const [inviteRole, setInviteRole] = useState<"member"|"readonly"|"admin">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"none"|"ok"|"error">("none");

  // App Lock
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [appPin, setAppPin] = useState("");
  const [showAppPinModal, setShowAppPinModal] = useState(false);
  const [appPinStep, setAppPinStep] = useState<"set"|"confirm"|"disable">("set");
  const [appPinInput, setAppPinInput] = useState("");
  const [appPinConfirm, setAppPinConfirm] = useState("");

  // Material Sync
  const [matSyncing, setMatSyncing] = useState(false);
  const [matSyncMsg, setMatSyncMsg] = useState("");
  const [matSyncStatus, setMatSyncStatus] = useState<"none"|"ok"|"error">("none");

  // Sprache
  const [showLangModal, setShowLangModal] = useState(false);

  // PIN Reset
  const [showPinResetModal, setShowPinResetModal] = useState(false);
  const [pinResetStep, setPinResetStep] = useState<"email"|"code"|"newpin"|"confirm">("email");
  const [pinResetEmail, setPinResetEmail] = useState("");
  const [pinResetCode, setPinResetCode] = useState("");
  const [pinResetNewPin, setPinResetNewPin] = useState("");
  const [pinResetConfirm, setPinResetConfirm] = useState("");
  const [pinResetLoading, setPinResetLoading] = useState(false);
  const [pinResetMsg, setPinResetMsg] = useState("");
  const [pinResetStatus, setPinResetStatus] = useState<"none"|"ok"|"error">("none");

  useEffect(() => { loadLocal(); loadAppLock(); }, []);

  const loadLocal = async () => {
    try {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Profile;
        setProfile(p);
        setFirmName(p.firmName||"");
        setUserName(p.userName||"");
        setEmail(p.email||"");
        setLogoUri(p.logoUri||null);
        setHasCloudPin(p.hasPin??false);
        setCompanyNameInput(p.firmName||"");
        if (p.email) {
          if (p.companyId) {
            loadCompany?.(p.companyId, p.email);
          } else {
            loadCompanyByEmail?.(p.email);
          }
        }
        // Kein Firmenname → sofort Bearbeiten öffnen
        if (!p.firmName) setEditing(true);
      } else {
        // Noch gar kein Profil → sofort Bearbeiten öffnen
        setEditing(true);
      }
    } catch {}
  };

  const loadAppLock = async () => {
    try {
      const lock = await AsyncStorage.getItem(APP_LOCK_KEY);
      const pin = await AsyncStorage.getItem(APP_PIN_KEY);
      setAppLockEnabled(lock==="true");
      setAppPin(pin??"");
    } catch {}
  };

  const saveLocal = async (p: Profile) => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  };

  // ── Logout ───────────────────────────────────────
  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([PROFILE_KEY, DEVICE_KEY, APP_PIN_KEY, APP_LOCK_KEY, "eg-last-portal"]);
      resetTeamData?.();
      restoreFromCloud?.([], [], [], [], []);
      setProfile({firmName:"",userName:"",email:"",logoUri:null,deviceId:"",updatedAt:""});
      setFirmName(""); setUserName(""); setEmail(""); setLogoUri(null); setHasCloudPin(false);
      router.replace("/portal_select");
    } catch {}
  };

  // ── Email Prüfung vor Speichern ──────────────────
  const checkEmailBeforeSave = async (): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase();
    const oldEmail = (profile.email||"").toLowerCase();
    if (trimmedEmail === oldEmail || !trimmedEmail) return true;
    setCheckingEmail(true);
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/profile/check/${encodeURIComponent(trimmedEmail)}`, {}, 20000);
      if (res.ok) {
        const data = await res.json();
        if (data.hasPin) {
          // Email existiert bereits mit PIN — PIN-Bestätigung erforderlich
          setPendingEmail(trimmedEmail);
          setEmailPinInput(""); setEmailPinMsg(""); setEmailPinStatus("none");
          setShowEmailPinModal(true);
          setCheckingEmail(false);
          return false;
        }
        // Email existiert ohne PIN — trotzdem PIN anfordern (Sicherheit)
        setPendingEmail(trimmedEmail);
        setEmailPinInput(""); setEmailPinMsg("Diese Email gehört bereits einem anderen Konto. PIN eingeben um zu übernehmen."); setEmailPinStatus("error");
        setShowEmailPinModal(true);
        setCheckingEmail(false);
        return false;
      } else if (res.status === 404) {
        // Neue Email — erlaubt
        setCheckingEmail(false);
        return true;
      }
      setCheckingEmail(false);
      Alert.alert("Fehler", "Email-Prüfung fehlgeschlagen. Bitte erneut versuchen.");
      return false;
    } catch (err: any) {
      setCheckingEmail(false);
      Alert.alert("Keine Verbindung", "Server nicht erreichbar. Bitte Internetverbindung prüfen und nochmal versuchen.");
      return false;
    }
  };

  const handleEmailPinDigit = async (digit: string) => {
    const updated = emailPinInput + digit;
    setEmailPinInput(updated);
    if (updated.length === 6) {
      setEmailPinMsg("Überprüfe...");
      try {
        const res = await fetchWithTimeout(`${BACKEND}/api/profile/load`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ email:pendingEmail, pin:updated, deviceId:profile.deviceId }),
        });
        if (res.ok) {
          setEmailPinStatus("ok"); setEmailPinMsg("Bestätigt!");
          await resetTeamData?.();
          setTimeout(() => {
            setShowEmailPinModal(false);
            setEmail(pendingEmail);
            doSave(pendingEmail);
          }, 800);
        } else if (res.status === 401) {
          setEmailPinStatus("error"); setEmailPinMsg("Falscher PIN");
          setEmailPinInput("");
        } else {
          setEmailPinStatus("error"); setEmailPinMsg("Fehler");
          setEmailPinInput("");
        }
      } catch (err: any) {
        if (err.message === "TIMEOUT") {
          setEmailPinStatus("error"); setEmailPinMsg("Server startet, nochmal versuchen");
        } else {
          setEmailPinStatus("error"); setEmailPinMsg("Keine Verbindung");
        }
        setEmailPinInput("");
      }
    }
  };

  // ── Speichern ────────────────────────────────────
  const handleSave = async () => {
    if (!firmName.trim()) { Alert.alert(T.required, T.enterName); return; }
    const ok = await checkEmailBeforeSave();
    if (ok) doSave(email.trim().toLowerCase());
  };

  const doSave = async (finalEmail: string) => {
    setSaving(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const p: Profile = {
        firmName: firmName.trim(),
        userName: userName.trim(),
        email: finalEmail,
        logoUri,
        deviceId,
        updatedAt: new Date().toISOString(),
        hasPin: hasCloudPin,
        companyId: profile.companyId,
        companyRole: profile.companyRole,
      };
      await saveLocal(p);
      setProfile(p);
      setEditing(false);
      syncProfileToCloud(p);
    } catch {
      Alert.alert("Fehler", "Speichern fehlgeschlagen");
    }
    finally { setSaving(false); }
  };

  // ── Cloud Sync ───────────────────────────────────
  const syncProfileToCloud = async (p?: Profile, pin?: string) => {
    const data = p ?? profile;
    if (!data.firmName) return;
    setSyncing(true); setSyncStatus("none"); setSyncMsg("Wird hochgeladen...");
    try {
      const deviceId = await getOrCreateDeviceId();
      const payload: any = { ...data, deviceId };
      if (pin) payload.pin = pin;
      const res = await fetchWithTimeout(`${BACKEND}/api/profile`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify(payload),
      });
      if (res.ok) {
        setSyncStatus("ok"); setSyncMsg("In Cloud gespeichert");
        const updated = { ...data, deviceId, hasPin: pin ? true : hasCloudPin };
        await saveLocal(updated); setProfile(updated); setHasCloudPin(updated.hasPin??false);
      } else {
        setSyncStatus("error"); setSyncMsg("Fehler beim Speichern");
      }
    } catch (err: any) {
      if (err.message === "TIMEOUT") {
        setSyncStatus("error"); setSyncMsg("Server startet – nochmal versuchen");
      } else {
        setSyncStatus("error"); setSyncMsg("Keine Verbindung");
      }
    }
    finally { setSyncing(false); }
  };

  // ── Materialien Sync ─────────────────────────────
  const syncMaterialsToCloud = async () => {
    if (!profile.email) { Alert.alert("Fehler","Bitte zuerst Email eingeben"); return; }
    if (!hasCloudPin) { Alert.alert("Fehler","Bitte zuerst Cloud-PIN festlegen"); return; }
    setMatSyncing(true); setMatSyncStatus("none"); setMatSyncMsg("Wird hochgeladen...");
    try {
      const deviceId = await getOrCreateDeviceId();
      const res = await fetchWithTimeout(`${BACKEND}/api/materials/sync`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ deviceId, email:profile.email, folders, materials, tasks, suppliers, loans, syncedAt:new Date().toISOString() }),
      });
      if (res.ok) {
        setMatSyncStatus("ok");
        setMatSyncMsg(`${materials.length} Materialien, ${folders.length} Ordner gesichert`);
      } else {
        setMatSyncStatus("error"); setMatSyncMsg("Fehler beim Sync");
      }
    } catch (err: any) {
      if (err.message === "TIMEOUT") {
        setMatSyncStatus("error"); setMatSyncMsg("Server startet – nochmal versuchen");
      } else {
        setMatSyncStatus("error"); setMatSyncMsg("Keine Verbindung");
      }
    }
    finally { setMatSyncing(false); }
  };

  // ── Cloud PIN ────────────────────────────────────
  const handleCloudPinDigit = (digit: string) => {
    if (cloudPinStep==="set") {
      const u = newPin+digit; setNewPin(u);
      if (u.length===6) setCloudPinStep("confirm");
    } else {
      const u = confirmPin+digit; setConfirmPin(u);
      if (u.length===6) {
        if (u===newPin) {
          setShowCloudPinModal(false);
          syncProfileToCloud(profile, newPin);
          setHasCloudPin(true);
          setNewPin(""); setConfirmPin(""); setCloudPinStep("set");
          Alert.alert("PIN gesetzt!", "Dein Cloud-PIN ist aktiv.");
        } else {
          Alert.alert("PINs stimmen nicht überein");
          setCloudPinStep("set"); setNewPin(""); setConfirmPin("");
        }
      }
    }
  };

  // ── Profil laden ─────────────────────────────────
  const handleCheckEmail = async () => {
    if (!loadEmail.trim()) { setLoadMsg("Email eingeben"); setLoadStatus("error"); return; }
    setLoadingProfile(true); setLoadMsg("Suche... (bis 30 Sek.)"); setLoadStatus("none");
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/profile/check/${encodeURIComponent(loadEmail.trim().toLowerCase())}`);
      if (res.ok) {
        const data = await res.json();
        if (!data.hasPin) {
          setLoadStatus("error"); setLoadMsg("Kein PIN gesetzt — Laden nicht möglich");
          setLoadingProfile(false); return;
        }
        setFoundFirm(data.firmName||""); setLoadStep("pin"); setLoadMsg(""); setLoadStatus("none");
      } else if (res.status===404) {
        setLoadStatus("error"); setLoadMsg("Kein Profil gefunden");
      } else {
        setLoadStatus("error"); setLoadMsg("Fehler");
      }
    } catch (err: any) {
      if (err.message === "TIMEOUT") {
        setLoadStatus("error"); setLoadMsg("Server startet gerade – nochmal versuchen!");
      } else {
        setLoadStatus("error"); setLoadMsg("Keine Verbindung");
      }
    }
    finally { setLoadingProfile(false); }
  };

  const handleLoadPinDigit = (digit: string) => {
    const u = loadPin+digit; setLoadPin(u);
    if (u.length===6) setTimeout(()=>loadProfileWithPin(u), 100);
  };

  const loadProfileWithPin = async (pin: string) => {
    setLoadingProfile(true); setLoadMsg("Überprüfe PIN...");
    try {
      const deviceId = await getOrCreateDeviceId();
      const res = await fetchWithTimeout(`${BACKEND}/api/profile/load`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ email:loadEmail.trim().toLowerCase(), pin, deviceId }),
      });
      if (res.ok) {
        const data = await res.json() as Profile;
        const merged = { ...data, deviceId, hasPin:true };
        await saveLocal(merged);
        setProfile(merged);
        setFirmName(merged.firmName); setUserName(merged.userName);
        setEmail(merged.email); setLogoUri(merged.logoUri||null); setHasCloudPin(true);
        await resetTeamData?.();
        // Materialien aus Cloud laden (Account-Wechsel: alte Daten ersetzen)
        try {
          const matRes = await fetchWithTimeout(`${BACKEND}/api/materials/load`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({ email:loadEmail.trim().toLowerCase(), pin }),
          }, 30000);
          if (matRes.ok) {
            const matData = await matRes.json();
            if (matData.materials && restoreFromCloud) {
              restoreFromCloud(matData.folders||[], matData.materials||[], matData.tasks||[], matData.suppliers||[], matData.loans||[]);
            }
          }
        } catch {}
        if (merged.companyId) {
          await loadCompany?.(merged.companyId, merged.email);
        } else {
          await loadCompanyByEmail?.(merged.email);
        }
        setLoadStatus("ok"); setLoadMsg("Profil + Materialien geladen!");
        setTimeout(() => {
          setShowLoadModal(false);
          setLoadEmail(""); setLoadPin(""); setLoadStep("email");
          setLoadMsg(""); setLoadStatus("none"); setFoundFirm("");
        }, 1500);
      } else if (res.status===401) {
        setLoadStatus("error"); setLoadMsg("Falscher PIN"); setLoadPin("");
      } else {
        setLoadStatus("error"); setLoadMsg("Fehler"); setLoadPin("");
      }
    } catch (err: any) {
      if (err.message === "TIMEOUT") {
        setLoadStatus("error"); setLoadMsg("Server startet – nochmal versuchen!"); setLoadPin("");
      } else {
        setLoadStatus("error"); setLoadMsg("Keine Verbindung"); setLoadPin("");
      }
    }
    finally { setLoadingProfile(false); }
  };

  // ── Firma erstellen ──────────────────────────────
  const handleCreateCompany = async () => {
    if (!companyNameInput.trim()) { setInfoTitle("Fehler"); setInfoText("Firmenname eingeben"); setInfoModal(true); return; }
    if (!profile.email) { setInfoTitle("Fehler"); setInfoText("Bitte zuerst Email im Profil speichern und in Cloud synchronisieren"); setInfoModal(true); return; }
    if (!hasCloudPin) { setInfoTitle("Fehler"); setInfoText("Bitte zuerst Cloud-PIN festlegen — das Profil muss in der Cloud gespeichert sein"); setInfoModal(true); return; }
    setCreatingCompany(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const ok = await createCompany?.(profile.email, profile.userName||profile.firmName, companyNameInput.trim(), deviceId);
      if (ok) {
        const c = useTeamStore.getState().company;
        if (c) {
          const updated = { ...profile, companyId: c.companyId, companyRole: "owner" };
          await saveLocal(updated); setProfile(updated);
          await syncProfileToCloud(updated);
        }
        setShowCompanyModal(false);
        setInfoTitle("Firma erstellt!");
        setInfoText(`"${companyNameInput}" wurde erstellt. Du kannst jetzt Kollegen einladen.`);
        setInfoModal(true);
      } else {
        const err = useTeamStore.getState().error;
        setInfoTitle("Fehler"); setInfoText(err || "Firma konnte nicht erstellt werden."); setInfoModal(true);
      }
    } catch {
      setInfoTitle("Fehler"); setInfoText("Keine Verbindung"); setInfoModal(true);
    }
    finally { setCreatingCompany(false); }
  };

  // ── Firma auflösen ───────────────────────────────
  const handleDissolveCompany = async () => {
    setDissolving(true); setDissolveMsg("Wird aufgelöst...");
    const result = await dissolveCompany?.();
    setDissolving(false);
    if (result?.ok) {
      // Profil lokal aktualisieren
      const updatedProfile = { ...profile };
      delete (updatedProfile as any).companyId;
      delete (updatedProfile as any).companyRole;
      await saveLocal(updatedProfile); setProfile(updatedProfile);
      setShowDissolveModal(false);
      if (result.action === "transferred" && result.newOwner) {
        setInfoTitle("Übergeben"); setInfoText(`Die Firma wurde an ${result.newOwner} übergeben. Du bist nun kein Mitglied mehr.`); setInfoModal(true);
      } else {
        setInfoTitle("Aufgelöst"); setInfoText("Die Firma wurde aufgelöst."); setInfoModal(true);
      }
    } else {
      setDissolveMsg("Fehler — bitte nochmal versuchen");
    }
  };

  // ── Mitarbeiter einladen ─────────────────────────
  const handleInvite = async () => {
    if (!inviteEmail.trim()) { setInviteMsg("Email eingeben"); setInviteStatus("error"); return; }
    if (!inviteWarehouseId) { setInviteMsg("Lager auswählen"); setInviteStatus("error"); return; }
    setInviting(true); setInviteMsg("Wird gesendet..."); setInviteStatus("none");
    const result = await inviteMember?.(inviteEmail.trim().toLowerCase(), inviteWarehouseId, inviteWarehouseName, inviteRole);
    if (result?.ok) {
      setInviteMsg(`Einladung an ${inviteEmail} gesendet!`);
      setInviteStatus("ok");
      setInviteEmail(""); setInviteWarehouseId(""); setInviteWarehouseName("");
    } else {
      setInviteMsg(`${result?.error || "Fehler. Hat der Kollege ein Konto?"}`);
      setInviteStatus("error");
    }
    setInviting(false);
  };

  // ── App Lock ─────────────────────────────────────
  const handleToggleAppLock = () => {
    if (appLockEnabled) { setAppPinStep("disable"); setAppPinInput(""); setShowAppPinModal(true); }
    else { setAppPinStep("set"); setAppPinInput(""); setAppPinConfirm(""); setShowAppPinModal(true); }
  };

  const handleAppPinDigit = (digit: string) => {
    if (appPinStep==="set") {
      const u = appPinInput+digit; setAppPinInput(u);
      if (u.length===6) setAppPinStep("confirm");
    } else if (appPinStep==="confirm") {
      const u = appPinConfirm+digit; setAppPinConfirm(u);
      if (u.length===6) {
        if (u===appPinInput) {
          AsyncStorage.setItem(APP_PIN_KEY, appPinInput);
          AsyncStorage.setItem(APP_LOCK_KEY, "true");
          setAppPin(appPinInput); setAppLockEnabled(true); setShowAppPinModal(false);
          Alert.alert("App-Sperre aktiv!");
        } else {
          Alert.alert("PINs stimmen nicht");
          setAppPinStep("set"); setAppPinInput(""); setAppPinConfirm("");
        }
      }
    } else {
      const u = appPinInput+digit; setAppPinInput(u);
      if (u.length===6) {
        if (u===appPin) {
          AsyncStorage.removeItem(APP_PIN_KEY);
          AsyncStorage.setItem(APP_LOCK_KEY, "false");
          setAppPin(""); setAppLockEnabled(false); setShowAppPinModal(false);
          Alert.alert("App-Sperre deaktiviert");
        } else {
          Alert.alert("Falscher PIN"); setAppPinInput("");
        }
      }
    }
  };


  // ── PIN Reset ────────────────────────────────────
  const handlePinResetRequest = async () => {
    if (!pinResetEmail.trim()) { setPinResetMsg("Email eingeben"); setPinResetStatus("error"); return; }
    const normalizedEmail = pinResetEmail.trim().toLowerCase();
    setPinResetLoading(true); setPinResetMsg("Sende Code..."); setPinResetStatus("none");
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/profile/reset-pin/request`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ email:normalizedEmail }),
      });
      if (res.ok) {
        setPinResetStatus("ok"); setPinResetMsg("Code gesendet!");
        setTimeout(() => { setPinResetStep("code"); setPinResetMsg(""); setPinResetStatus("none"); }, 1000);
      } else if (res.status === 404) {
        setPinResetStatus("error"); setPinResetMsg("Kein Profil gefunden");
      } else {
        setPinResetStatus("error"); setPinResetMsg("Fehler beim Senden");
      }
    } catch { setPinResetStatus("error"); setPinResetMsg("Keine Verbindung"); }
    finally { setPinResetLoading(false); }
  };

  const handlePinResetCodeDigit = (digit: string) => {
    const u = pinResetCode + digit; setPinResetCode(u);
    if (u.length === 6) setTimeout(() => setPinResetStep("newpin"), 100);
  };

  const handlePinResetNewPinDigit = (digit: string) => {
    const u = pinResetNewPin + digit; setPinResetNewPin(u);
    if (u.length === 6) setPinResetStep("confirm");
  };

  const handlePinResetConfirmDigit = async (digit: string) => {
    const u = pinResetConfirm + digit; setPinResetConfirm(u);
    if (u.length === 6) {
      if (u !== pinResetNewPin) {
        setPinResetMsg("PINs stimmen nicht"); setPinResetStatus("error");
        setPinResetStep("newpin"); setPinResetNewPin(""); setPinResetConfirm(""); return;
      }
      setPinResetLoading(true); setPinResetMsg("Überprüfe...");
      try {
        const deviceId = await getOrCreateDeviceId();
        const res = await fetchWithTimeout(`${BACKEND}/api/profile/reset-pin/confirm`, {
          method:"POST", headers:{"Content-Type":"application/json"},
          body:JSON.stringify({ email:pinResetEmail.trim().toLowerCase(), code:pinResetCode, newPin:u, deviceId }),
        });
        if (res.ok) {
          const data = await res.json();
          setPinResetStatus("ok"); setPinResetMsg("PIN erfolgreich geändert!");
          if (data.profile) {
            const merged = { ...data.profile, deviceId, hasPin:true };
            await saveLocal(merged); setProfile(merged);
            setFirmName(merged.firmName); setUserName(merged.userName);
            setEmail(merged.email); setHasCloudPin(true);
          }
          setTimeout(() => {
            setShowPinResetModal(false);
            setPinResetStep("email"); setPinResetEmail(""); setPinResetCode("");
            setPinResetNewPin(""); setPinResetConfirm(""); setPinResetMsg(""); setPinResetStatus("none");
          }, 1500);
        } else if (res.status === 401) {
          setPinResetStatus("error"); setPinResetMsg("Falscher Code"); setPinResetStep("code"); setPinResetCode("");
        } else {
          setPinResetStatus("error"); setPinResetMsg("Fehler");
        }
      } catch { setPinResetStatus("error"); setPinResetMsg("Keine Verbindung"); }
      finally { setPinResetLoading(false); }
    }
  };
  const pickLogo = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status!=="granted") { Alert.alert("Fehler","Berechtigung fehlt"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect:[1,1], quality:0.5,
    });
    if (!result.canceled && result.assets[0]) setLogoUri(result.assets[0].uri);
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleDateString("de-DE")+" "+d.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
  };

  const isChef = profile.companyRole === "owner" || profile.companyRole === "admin";
  const warehouses = Array.isArray(company?.warehouses) ? company!.warehouses : [];
  const currentLang = LANGUAGES.find(l => l.code === lang);

  // ── EDIT VIEW ────────────────────────────────────
  if (editing) {
    return (
      <SafeAreaView style={s.container} edges={["top","left","right"]}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={()=>setEditing(false)}>
            <Text style={{color:C.text,fontSize:16}}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profil bearbeiten</Text>
        </View>
        <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:bottomPad+20}}>
          <View style={s.logoSection}>
            <TouchableOpacity style={s.logoPicker} onPress={pickLogo}>
              {logoUri
                ? <Image source={{uri:logoUri}} style={s.logoImg}/>
                : <View style={s.logoEmpty}><Building2 size={32} color={C.text3}/><Text style={{fontSize:10,color:C.text3}}>Logo wählen</Text></View>
              }
            </TouchableOpacity>
            {logoUri && <TouchableOpacity onPress={()=>setLogoUri(null)} style={{marginTop:8}}><Text style={{fontSize:11,color:C.red}}>Logo entfernen</Text></TouchableOpacity>}
          </View>

          <Text style={s.formLabel}>FIRMENNAME *</Text>
          <TextInput style={s.formInput} placeholder="z.B. Elektro Mustermann GmbH" placeholderTextColor={C.text3} value={firmName} onChangeText={setFirmName} autoFocus/>

          <Text style={s.formLabel}>DEIN NAME</Text>
          <TextInput style={s.formInput} placeholder="z.B. Max Mustermann" placeholderTextColor={C.text3} value={userName} onChangeText={setUserName}/>

          <Text style={s.formLabel}>E-MAIL</Text>
          <TextInput style={s.formInput} placeholder="z.B. info@firma.de" placeholderTextColor={C.text3} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>

          <View style={s.infoBox}>
            <AlertTriangle size={14} color={C.accent}/>
            <Text style={s.infoBoxText}>Wenn du eine andere Email eingibst die bereits ein Konto hat, musst du deren PIN bestätigen.</Text>
          </View>

          {checkingEmail && (
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:12}}>
              <ActivityIndicator color={C.accent} size="small"/>
              <Text style={{color:C.text2,fontSize:12}}>Prüfe Email...</Text>
            </View>
          )}

          <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.accent}]} onPress={handleSave} disabled={saving||checkingEmail}>
            {saving ? <ActivityIndicator color="#000"/> : <Text style={s.btnPrimaryText}>Speichern & Synchronisieren</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setEditing(false)}>
            <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PROFIL VIEW ──────────────────────────────────
  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.badge}><Text style={s.badgeText}>EG</Text></View>
          <View><Text style={s.headerTitle}>Profil</Text><Text style={s.headerSub}>ElektroGenius</Text></View>
        </View>
        <TouchableOpacity style={s.webBtn} onPress={()=>Linking.openURL("https://elektrogenius.de")}>
          <Globe size={16} color={C.accent}/>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:bottomPad+120}}>

        {/* Profil Karte */}
        <View style={s.profileCard}>
          {profile.logoUri
            ? <Image source={{uri:profile.logoUri}} style={s.profileAvatar}/>
            : <View style={s.profileAvatarEmpty}><Building2 size={44} color={C.text3}/></View>
          }
          {profile.firmName ? <>
            <Text style={s.firmNameText}>{profile.firmName}</Text>
            {profile.userName?<Text style={s.userNameText}>{profile.userName}</Text>:null}
            {profile.email?<Text style={s.emailText}>{profile.email}</Text>:null}
            {profile.updatedAt?<Text style={s.updatedText}>Gespeichert: {formatDate(profile.updatedAt)}</Text>:null}
            <View style={{flexDirection:"row",gap:6,flexWrap:"wrap",justifyContent:"center",marginTop:8}}>
              {hasCloudPin && <View style={s.pinBadge}><Text style={s.pinBadgeText}>PIN aktiv</Text></View>}
              {profile.companyRole && (
                <View style={[s.pinBadge,{backgroundColor:"rgba(79,163,247,0.15)"}]}>
                  <Text style={[s.pinBadgeText,{color:C.blue}]}>
                    {profile.companyRole==="owner" ? T.roleOwner : profile.companyRole==="admin" ? T.roleAdmin : T.roleMember}
                  </Text>
                </View>
              )}
            </View>
          </> : <>
            <Text style={s.emptyText}>{T.noProfileYet}</Text>
            <Text style={s.emptySub}>{T.tapToStart}</Text>
          </>}
          {syncMsg ? (
            <View style={[s.syncBadge,{backgroundColor:syncStatus==="ok"?"rgba(63,185,80,0.1)":"rgba(248,81,73,0.1)",borderColor:syncStatus==="ok"?"rgba(63,185,80,0.3)":"rgba(248,81,73,0.3)"}]}>
              {syncing?<ActivityIndicator size="small" color={C.accent}/>:null}
              <Text style={[s.syncText,{color:syncStatus==="ok"?C.green:C.red}]}>{syncMsg}</Text>
            </View>
          ):null}
          {matSyncMsg ? (
            <View style={[s.syncBadge,{backgroundColor:matSyncStatus==="ok"?"rgba(63,185,80,0.1)":"rgba(248,81,73,0.1)",borderColor:matSyncStatus==="ok"?"rgba(63,185,80,0.3)":"rgba(248,81,73,0.3)",marginTop:6}]}>
              {matSyncing?<ActivityIndicator size="small" color={C.accent}/>:null}
              <Text style={[s.syncText,{color:matSyncStatus==="ok"?C.green:C.red}]}>{matSyncMsg}</Text>
            </View>
          ):null}
        </View>

        {/* PERSÖNLICH */}
        <View style={{flexDirection:"row",alignItems:"center",gap:6,marginBottom:10}}><User size={12} color={C.text3}/><Text style={[s.sectionLabel,{marginBottom:0}]}>{T.sectionPersonal}</Text></View>

        <TouchableOpacity style={s.actionRow} onPress={()=>setEditing(true)}>
          <Pencil size={20} color={C.text}/>
          <View style={{flex:1}}><Text style={s.actionTitle}>{T.editProfile}</Text><Text style={s.actionSub}>{T.firmName}, Logo, {T.yourName}, {T.email}</Text></View>
          <Text style={{color:C.text3}}>›</Text>
        </TouchableOpacity>

        {/* Warnung wenn Email/PIN fehlt */}
        {(!profile.email || !hasCloudPin) && (
          <View style={{backgroundColor:"rgba(245,166,35,0.08)",borderWidth:0.5,borderColor:"rgba(245,166,35,0.25)",borderRadius:10,padding:12,marginBottom:8,flexDirection:"row",alignItems:"flex-start",gap:8}}>
            <AlertTriangle size={14} color={C.accent} style={{marginTop:2}}/>
            <Text style={{color:C.accent,fontSize:12,flex:1,lineHeight:18}}>
              {!profile.email
                ? "Bitte Email eingeben (Profil bearbeiten) um Cloud-Funktionen zu nutzen."
                : "Bitte Cloud-PIN festlegen um Materialien zu sichern und zu laden."}
            </Text>
          </View>
        )}

        <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(63,185,80,0.3)",backgroundColor:"rgba(63,185,80,0.05)",opacity:(!profile.email||!hasCloudPin)?0.5:1}]}
          onPress={syncMaterialsToCloud} disabled={matSyncing||!profile.email||!hasCloudPin}>
          {matSyncing ? <ActivityIndicator size="small" color={C.green}/> : <Cloud size={20} color={C.green}/>}
          <View style={{flex:1}}>
            <Text style={[s.actionTitle,{color:C.green}]}>{T.syncMaterials}</Text>
            <Text style={s.actionSub}>{materials.length} {T.materials} · {folders.length} {T.folders}</Text>
          </View>
          {matSyncing?<ActivityIndicator size="small" color={C.green}/>:<Text style={{color:C.text3}}>›</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(79,163,247,0.3)",backgroundColor:"rgba(79,163,247,0.05)",opacity:(!profile.email||!hasCloudPin)?0.5:1}]}
          onPress={()=>{
            if (!profile.email||!hasCloudPin) return;
            setShowLoadModal(true); setLoadStep("pin"); setLoadEmail(profile.email);
            setLoadMsg("PIN eingeben um Materialien zu laden"); setLoadStatus("none");
          }}
          disabled={!profile.email||!hasCloudPin}>
          <Download size={20} color={C.blue}/>
          <View style={{flex:1}}>
            <Text style={[s.actionTitle,{color:C.blue}]}>{T.loadMaterialsCloud}</Text>
            <Text style={s.actionSub}>{T.loadProfileDesc}</Text>
          </View>
          <Text style={{color:C.text3}}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(163,113,247,0.3)",backgroundColor:"rgba(163,113,247,0.05)"}]}
          onPress={()=>{setCloudPinStep("set");setNewPin("");setConfirmPin("");setShowCloudPinModal(true);}}>
          <KeyRound size={20} color={C.purple}/>
          <View style={{flex:1}}>
            <Text style={[s.actionTitle,{color:C.purple}]}>{hasCloudPin?T.cloudPinChange:T.cloudPinSet}</Text>
            <Text style={s.actionSub}>{hasCloudPin?"PIN schützt Profil + Materialien":"Ohne PIN kein Sichern/Laden möglich"}</Text>
          </View>
          <Text style={{color:C.text3}}>›</Text>
        </TouchableOpacity>

        {/* Profil auf neuem Gerät laden */}
        <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(79,163,247,0.3)",backgroundColor:"rgba(79,163,247,0.05)"}]}
          onPress={()=>{
            setShowLoadModal(true); setLoadStep("email"); setLoadEmail(""); setLoadPin(""); setLoadMsg(""); setLoadStatus("none"); setFoundFirm("");
          }}>
          <Smartphone size={20} color={C.blue}/>
          <View style={{flex:1}}>
            <Text style={[s.actionTitle,{color:C.blue}]}>{profile.email ? T.loadOnNewDevice : "Mit Konto anmelden"}</Text>
            <Text style={s.actionSub}>{profile.email ? "Auf jedem Gerät kostenlos nutzbar" : "Email + PIN eingeben"}</Text>
          </View>
          <Text style={{color:C.text3}}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionRow,{borderColor:appLockEnabled?"rgba(248,81,73,0.3)":"rgba(63,185,80,0.3)",backgroundColor:appLockEnabled?"rgba(248,81,73,0.05)":"rgba(63,185,80,0.05)"}]}
          onPress={handleToggleAppLock}>
          {appLockEnabled ? <Lock size={20} color={C.red}/> : <Unlock size={20} color={C.green}/>}
          <View style={{flex:1}}>
            <Text style={[s.actionTitle,{color:appLockEnabled?C.red:C.green}]}>{appLockEnabled?T.appLockOff:T.appLockOn}</Text>
            <Text style={s.actionSub}>{appLockEnabled?"PIN beim Öffnen erforderlich":"App ist ohne PIN zugänglich"}</Text>
          </View>
          <View style={[s.toggleBadge,{backgroundColor:appLockEnabled?"rgba(248,81,73,0.15)":"rgba(63,185,80,0.15)"}]}>
            <Text style={{fontSize:11,fontWeight:"700",color:appLockEnabled?C.red:C.green}}>{appLockEnabled?"AN":"AUS"}</Text>
          </View>
        </TouchableOpacity>

        {/* FIRMA & TEAM */}
        <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:16,marginBottom:10}}><Building2 size={12} color={C.text3}/><Text style={[s.sectionLabel,{marginBottom:0,marginTop:0}]}>{T.sectionCompany}</Text></View>

        {!company ? (
          <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(245,166,35,0.5)",backgroundColor:"rgba(245,166,35,0.08)"}]}
            onPress={()=>{setCompanyNameInput(profile.firmName||"");setShowCompanyModal(true);}}>
            <Building2 size={20} color={C.accent}/>
            <View style={{flex:1}}>
              <Text style={[s.actionTitle,{color:C.accent}]}>{T.createCompany}</Text>
              <Text style={s.actionSub}>Team einladen, Lager teilen, Echtzeit-Sync</Text>
            </View>
            <Text style={{color:C.accent,fontSize:22,fontWeight:"700"}}>+</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={[s.actionRow,{borderColor:"rgba(245,166,35,0.3)"}]}>
              <Building2 size={20} color={C.accent}/>
              <View style={{flex:1}}>
                <Text style={s.actionTitle}>{company.companyName}</Text>
                <Text style={s.actionSub}>
                  {company.members?.length??0} {T.roleMember}s · {warehouses.length} {T.folders} ·{" "}
                  {profile.companyRole==="owner"?T.roleOwner:profile.companyRole==="admin"?T.roleAdmin:T.roleMember}
                </Text>
              </View>
            </View>

            {isChef && (
              <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(63,185,80,0.3)",backgroundColor:"rgba(63,185,80,0.05)"}]}
                onPress={()=>{setInviteEmail("");setInviteWarehouseId("");setInviteWarehouseName("");setInviteRole("member");setInviteMsg("");setInviteStatus("none");setShowInviteModal(true);}}>
                <Mail size={20} color={C.green}/>
                <View style={{flex:1}}>
                  <Text style={[s.actionTitle,{color:C.green}]}>{T.inviteEmployee}</Text>
                  <Text style={s.actionSub}>Email + Lager + Rolle auswählen</Text>
                </View>
                <Text style={{color:C.text3}}>›</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(79,163,247,0.3)",backgroundColor:"rgba(79,163,247,0.05)"}]}
              onPress={()=>router.push("/team")}>
              <Users size={20} color={C.blue}/>
              <View style={{flex:1}}>
                <Text style={[s.actionTitle,{color:C.blue}]}>{T.manageTeam}</Text>
                <Text style={s.actionSub}>{company.members?.length??0} {T.roleMember}s</Text>
              </View>
              <Text style={{color:C.text3}}>›</Text>
            </TouchableOpacity>

            {/* Firma auflösen — nur Owner */}
            {profile.companyRole === "owner" && (
              <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(248,81,73,0.3)",backgroundColor:"rgba(248,81,73,0.05)"}]}
                onPress={()=>{ setDissolveMsg(""); setShowDissolveModal(true); }}>
                <X size={20} color={C.red}/>
                <View style={{flex:1}}>
                  <Text style={[s.actionTitle,{color:C.red}]}>Firma auflösen</Text>
                  <Text style={s.actionSub}>
                    {(company.members?.length??0) > 1
                      ? `${(company.members?.length??1)-1} Mitglied(er) übernehmen automatisch`
                      : "Firma wird komplett gelöscht"}
                  </Text>
                </View>
                <Text style={{color:C.red}}>›</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── ABONNEMENT ────────────────────────────────────────────── */}
        <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:16,marginBottom:10}}>
          <Crown size={12} color={C.accent}/>
          <Text style={[s.sectionLabel,{marginBottom:0,marginTop:0,color:C.accent}]}>ABONNEMENT</Text>
        </View>

        {/* Trial-Banner */}
        {inTrial && (
          <View style={{backgroundColor:"rgba(0,198,255,0.08)",borderWidth:0.5,borderColor:"rgba(0,198,255,0.3)",borderRadius:12,padding:14,marginBottom:10,flexDirection:"row",alignItems:"center",gap:10}}>
            <Zap size={18} color="#00c6ff"/>
            <View style={{flex:1}}>
              <Text style={{color:"#00c6ff",fontSize:13,fontWeight:"700"}}>
                Testphase aktiv — noch {trialDaysLeft} {trialDaysLeft===1?"Tag":"Tage"} kostenlos
              </Text>
              <Text style={{color:C.text2,fontSize:11,marginTop:2}}>
                Danach 19,99 €/Monat · Jederzeit kündbar
              </Text>
            </View>
          </View>
        )}

        {/* Pro-Status */}
        {isPro && !inTrial && (
          <View style={{backgroundColor:"rgba(245,166,35,0.08)",borderWidth:0.5,borderColor:"rgba(245,166,35,0.3)",borderRadius:12,padding:14,marginBottom:10,flexDirection:"row",alignItems:"center",gap:10}}>
            <Crown size={18} color={C.accent}/>
            <View style={{flex:1}}>
              <Text style={{color:C.accent,fontSize:13,fontWeight:"700"}}>MaterialCheck+ aktiv</Text>
              <Text style={{color:C.text2,fontSize:11,marginTop:2}}>Alle Premium-Features freigeschaltet</Text>
            </View>
          </View>
        )}

        {/* Checkout-Button (Free-User) */}
        {!isPro && (
          <TouchableOpacity
            style={{backgroundColor:"#22c55e",borderRadius:12,paddingVertical:14,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8,opacity:aboLoading?0.7:1}}
            onPress={handleCheckout} disabled={aboLoading}>
            {aboLoading ? <ActivityIndicator size="small" color="#000"/> : <Zap size={16} color="#000"/>}
            <Text style={{color:"#000",fontWeight:"800",fontSize:15}}>
              {aboLoading ? "Wird gestartet…" : "7 Tage kostenlos testen"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Portal-Button (Pro/Trial-User) */}
        {isPro && (
          <TouchableOpacity
            style={{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:12,paddingVertical:13,flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,marginBottom:8,opacity:aboLoading?0.7:1}}
            onPress={handlePortal} disabled={aboLoading}>
            {aboLoading ? <ActivityIndicator size="small" color={C.text}/> : <CreditCard size={16} color={C.text}/>}
            <Text style={{color:C.text,fontWeight:"600",fontSize:14}}>
              {aboLoading ? "Wird geöffnet…" : "Abo verwalten"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Fehler-Meldung */}
        {aboError ? (
          <View style={{backgroundColor:"rgba(239,68,68,0.1)",borderRadius:8,borderWidth:0.5,borderColor:"rgba(239,68,68,0.3)",padding:10,marginBottom:8}}>
            <Text style={{color:"#ef4444",fontSize:12,textAlign:"center"}}>{aboError}</Text>
          </View>
        ) : null}

        <Text style={{color:C.text3,fontSize:11,textAlign:"center",marginBottom:4}}>
          Keine Zahlung heute · Kündigung jederzeit möglich
        </Text>

        {/* SPRACHE */}
        <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:16,marginBottom:10}}><Settings size={12} color={C.text3}/><Text style={[s.sectionLabel,{marginBottom:0,marginTop:0}]}>{T.sectionSettings}</Text></View>

        <TouchableOpacity style={[s.actionRow,{borderColor:"rgba(163,113,247,0.3)",backgroundColor:"rgba(163,113,247,0.05)"}]} onPress={()=>setShowLangModal(true)}>
          <Globe size={20} color={C.purple}/>
          <View style={{flex:1}}>
            <Text style={[s.actionTitle,{color:C.purple}]}>{T.selectLanguage}</Text>
            <Text style={s.actionSub}>{currentLang?.flag} {currentLang?.name}</Text>
          </View>
          <Text style={{color:C.text3}}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionRow} onPress={()=>Linking.openURL("https://elektrogenius.de")}>
          <Globe size={20} color={C.text}/>
          <View style={{flex:1}}><Text style={s.actionTitle}>Website</Text><Text style={s.actionSub}>elektrogenius.de</Text></View>
          <Text style={{color:C.text3}}>›</Text>
        </TouchableOpacity>

        <View style={[s.actionRow,{marginTop:4}]}>
          <View style={s.badge}><Text style={s.badgeText}>EG</Text></View>
          <View><Text style={s.actionTitle}>MaterialCheck</Text><Text style={s.actionSub}>von ElektroGenius · v1.5.0</Text></View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <LogOut size={16} color={C.red} />
          <Text style={s.logoutBtnText}>Abmelden & Daten verbergen</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomNav active="profile"/>


      {/* EMAIL PIN CHECK */}
      <Modal visible={showEmailPinModal} transparent animationType="slide">
        <View style={s.pinOverlay}>
          <View style={s.pinSheet}>
            <TouchableOpacity style={s.pinClose} onPress={()=>setShowEmailPinModal(false)}>
              <X size={18} color={C.text2}/>
            </TouchableOpacity>
            <View style={s.warningBox}>
              <AlertTriangle size={20} color={C.red}/>
              <Text style={s.warningText}>Diese Email gehört bereits jemandem. Gib den PIN ein um sie zu übernehmen. Dies meldet das andere Gerät ab.</Text>
            </View>
            <PinPad title="Email bestätigen" subtitle={`Email: ${pendingEmail}`}
              pin={emailPinInput} onDigit={handleEmailPinDigit}
              onDelete={()=>setEmailPinInput(p=>p.slice(0,-1))}
              status={emailPinStatus} statusMsg={emailPinMsg}/>
            <TouchableOpacity style={{alignItems:"center",marginTop:4,marginBottom:4}} onPress={()=>{
              setShowEmailPinModal(false);
              setPinResetEmail(pendingEmail);
              setShowPinResetModal(true);
              setPinResetStep("email");
              setPinResetMsg(""); setPinResetStatus("none");
            }}>
              <Text style={{color:C.accent,fontSize:12,fontWeight:"600"}}>PIN vergessen?</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:4}]} onPress={()=>setShowEmailPinModal(false)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CLOUD PIN */}
      <Modal visible={showCloudPinModal} transparent animationType="slide">
        <View style={s.pinOverlay}>
          <View style={s.pinSheet}>
            <TouchableOpacity style={s.pinClose} onPress={()=>setShowCloudPinModal(false)}>
              <X size={18} color={C.text2}/>
            </TouchableOpacity>
            <PinPad
              title={cloudPinStep==="set"?"PIN festlegen":"PIN bestätigen"}
              subtitle={cloudPinStep==="set"?"Wähle einen 6-stelligen PIN":"PIN nochmal eingeben"}
              pin={cloudPinStep==="set"?newPin:confirmPin}
              onDigit={handleCloudPinDigit}
              onDelete={()=>{if(cloudPinStep==="set")setNewPin(p=>p.slice(0,-1));else setConfirmPin(p=>p.slice(0,-1));}}
            />
          </View>
        </View>
      </Modal>

      {/* PROFIL LADEN */}
      <Modal visible={showLoadModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowLoadModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet,{paddingBottom:bottomPad+20}]}>
            <View style={s.modalHandle}/>
            {loadStep==="email" ? <>
              <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Smartphone size={16} color={C.text}/><Text style={s.modalTitle}>Profil laden</Text></View>
              <Text style={s.formLabel}>E-MAIL</Text>
              <TextInput style={s.formInput} placeholder="z.B. info@firma.de" placeholderTextColor={C.text3}
                value={loadEmail} onChangeText={setLoadEmail} keyboardType="email-address" autoCapitalize="none" autoFocus/>
              {loadMsg?<Text style={[s.msgText,{color:loadStatus==="ok"?C.green:C.red}]}>{loadMsg}</Text>:null}
              <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.accent}]} onPress={handleCheckEmail} disabled={loadingProfile}>
                {loadingProfile?<ActivityIndicator color="#000"/>:<Text style={s.btnPrimaryText}>Weiter</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowLoadModal(false)}>
                <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
              </TouchableOpacity>
            </> : <>
              {foundFirm?<View style={s.foundCard}><Building2 size={24} color={C.text3}/><View><Text style={s.foundName}>{foundFirm}</Text><Text style={s.foundSub}>{loadEmail}</Text></View></View>:null}
              <PinPad title="PIN eingeben" subtitle="6-stelligen PIN eingeben"
                pin={loadPin} onDigit={handleLoadPinDigit}
                onDelete={()=>setLoadPin(p=>p.slice(0,-1))}
                status={loadStatus} statusMsg={loadMsg}/>
              {loadingProfile?<ActivityIndicator color={C.accent} style={{marginTop:10}}/>:null}
              <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:10}]} onPress={()=>{setLoadStep("email");setLoadPin("");setLoadMsg("");setLoadStatus("none");}}>
                <Text style={[s.btnPrimaryText,{color:C.text2}]}>← Zurück</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{alignItems:"center",marginTop:12}} onPress={()=>{setShowLoadModal(false);setPinResetEmail(loadEmail);setShowPinResetModal(true);setPinResetStep("email");}}>
                <Text style={{color:"#f5a623",fontSize:12,fontWeight:"600"}}>PIN vergessen?</Text>
              </TouchableOpacity>
            </>}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* FIRMA ERSTELLEN */}
      <Modal visible={showCompanyModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowCompanyModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet,{paddingBottom:bottomPad+20}]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>Firma erstellen</Text>
            <View style={s.infoBox}>
              <Info size={14} color={C.accent}/>
              <Text style={s.infoBoxText}>Als Chef kannst du Kollegen einladen und ihnen Zugriff auf bestimmte Lager geben.</Text>
            </View>
            <Text style={s.formLabel}>FIRMENNAME *</Text>
            <TextInput style={s.formInput} placeholder="z.B. Elektro Mustermann GmbH"
              placeholderTextColor={C.text3} value={companyNameInput} onChangeText={setCompanyNameInput} autoFocus/>
            {creatingCompany && (
              <View style={{backgroundColor:"rgba(245,166,35,0.1)",borderWidth:0.5,borderColor:"rgba(245,166,35,0.3)",borderRadius:10,padding:12,marginBottom:10,flexDirection:"row",alignItems:"center",gap:10}}>
                <ActivityIndicator color={C.accent} size="small"/>
                <Text style={{color:C.accent,fontSize:12,flex:1}}>Server wird gestartet (kann bis zu 60 Sek. dauern)...</Text>
              </View>
            )}
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.accent,opacity:creatingCompany?0.7:1}]} onPress={handleCreateCompany} disabled={creatingCompany}>
              {creatingCompany?<ActivityIndicator color="#000"/>:<View style={{flexDirection:"row",alignItems:"center",gap:8}}><Building2 size={16} color="#000"/><Text style={s.btnPrimaryText}>Firma erstellen</Text></View>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowCompanyModal(false)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* MITARBEITER EINLADEN */}
      <Modal visible={showInviteModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowInviteModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet,{paddingBottom:bottomPad+20}]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>Mitarbeiter einladen</Text>
            <Text style={s.formLabel}>EMAIL DES KOLLEGEN *</Text>
            <TextInput style={s.formInput} placeholder="z.B. max@firma.de" placeholderTextColor={C.text3}
              value={inviteEmail} onChangeText={setInviteEmail} keyboardType="email-address" autoCapitalize="none" autoFocus/>
            <Text style={s.formLabel}>WELCHES LAGER? *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
              <View style={{flexDirection:"row",gap:8}}>
                {warehouses.length === 0 ? (
                  <View style={{padding:12,backgroundColor:C.surface2,borderRadius:10}}>
                    <Text style={{color:C.text3,fontSize:12}}>Zuerst ein Lager im Firmen Portal erstellen</Text>
                  </View>
                ) : warehouses.map(w=>(
                  <TouchableOpacity key={w.warehouseId}
                    onPress={()=>{setInviteWarehouseId(w.warehouseId);setInviteWarehouseName(w.warehouseName);}}
                    style={[s.whChip, inviteWarehouseId===w.warehouseId&&s.whChipActive]}>
                    <Warehouse size={14} color={inviteWarehouseId===w.warehouseId?C.accent:C.text2}/>
                    <Text style={{fontSize:12,color:inviteWarehouseId===w.warehouseId?C.accent:C.text2}}>{w.warehouseName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={s.formLabel}>ROLLE *</Text>
            <View style={{flexDirection:"row",gap:8,marginBottom:14}}>
              {([
                {role:"member" as const, label:"Mitarbeiter", color:C.green},
                {role:"readonly" as const, label:"Nur lesen", color:C.text2},
                {role:"admin" as const, label:"Admin", color:C.accent},
              ]).map(r=>(
                <TouchableOpacity key={r.role} onPress={()=>setInviteRole(r.role)}
                  style={[s.roleChip, inviteRole===r.role&&{borderColor:r.color,backgroundColor:`${r.color}15`}]}>
                  <Text style={{fontSize:11,color:inviteRole===r.role?r.color:C.text2}}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {inviteMsg?<Text style={[s.msgText,{color:inviteStatus==="ok"?C.green:C.red,marginBottom:10}]}>{inviteMsg}</Text>:null}
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.accent}]} onPress={handleInvite} disabled={inviting}>
              {inviting?<ActivityIndicator color="#000"/>:<Text style={s.btnPrimaryText}>Einladung senden</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowInviteModal(false)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* APP LOCK */}
      <Modal visible={showAppPinModal} transparent animationType="slide">
        <View style={s.pinOverlay}>
          <View style={s.pinSheet}>
            <TouchableOpacity style={s.pinClose} onPress={()=>setShowAppPinModal(false)}>
              <X size={18} color={C.text2}/>
            </TouchableOpacity>
            <PinPad
              title={appPinStep==="set"?"PIN festlegen":appPinStep==="confirm"?"PIN bestätigen":"PIN eingeben"}
              subtitle={appPinStep==="set"?"6-stelligen PIN wählen":appPinStep==="confirm"?"PIN nochmal eingeben":"Aktuellen PIN eingeben"}
              pin={appPinStep==="confirm"?appPinConfirm:appPinInput}
              onDigit={handleAppPinDigit}
              onDelete={()=>{if(appPinStep==="confirm")setAppPinConfirm(p=>p.slice(0,-1));else setAppPinInput(p=>p.slice(0,-1));}}
            />
          </View>
        </View>
      </Modal>

      {/* SPRACHE */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowLangModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet,{paddingBottom:bottomPad+20}]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>Sprache wählen</Text>
            {LANGUAGES.map(l=>(
              <TouchableOpacity key={l.code} style={[s.langRow,lang===l.code&&s.langRowActive]}
                onPress={()=>{setLang(l.code as Language);setShowLangModal(false);}}>
                <Text style={{fontSize:24}}>{l.flag}</Text>
                <Text style={[s.langName,lang===l.code&&{color:C.accent}]}>{l.name}</Text>
                {lang===l.code&&<Text style={{color:C.accent}}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:12}]} onPress={()=>setShowLangModal(false)}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* PIN RESET */}
      <Modal visible={showPinResetModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>setShowPinResetModal(false)}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet,{paddingBottom:bottomPad+20}]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>PIN zurücksetzen</Text>
            {pinResetStep==="email" && <>
              <Text style={s.formLabel}>E-MAIL</Text>
              <TextInput style={s.formInput} placeholder="z.B. info@firma.de" placeholderTextColor={C.text3}
                value={pinResetEmail} onChangeText={setPinResetEmail} keyboardType="email-address" autoCapitalize="none" autoFocus/>
              <View style={s.infoBox}>
                <Mail size={14} color={C.accent}/>
                <Text style={s.infoBoxText}>Wir schicken dir einen 6-stelligen Reset-Code an deine Email.</Text>
              </View>
              {pinResetMsg?<Text style={[s.msgText,{color:pinResetStatus==="ok"?C.green:C.red}]}>{pinResetMsg}</Text>:null}
              <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.accent}]} onPress={handlePinResetRequest} disabled={pinResetLoading}>
                {pinResetLoading?<ActivityIndicator color="#000"/>:<Text style={s.btnPrimaryText}>Code senden</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowPinResetModal(false)}>
                <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
              </TouchableOpacity>
            </>}
            {pinResetStep==="code" && <>
              <PinPad title="Code eingeben" subtitle="6-stelligen Code aus der Email"
                pin={pinResetCode} onDigit={handlePinResetCodeDigit}
                onDelete={()=>setPinResetCode(p=>p.slice(0,-1))}
                status={pinResetStatus} statusMsg={pinResetMsg}/>
              <TouchableOpacity style={{alignItems:"center",marginTop:12}} onPress={()=>{setPinResetStep("email");setPinResetCode("");}}>
                <Text style={{color:C.accent,fontSize:12}}>← Zurück</Text>
              </TouchableOpacity>
            </>}
            {pinResetStep==="newpin" && <>
              <PinPad title="Neuen PIN festlegen" subtitle="6-stelligen PIN wählen"
                pin={pinResetNewPin} onDigit={handlePinResetNewPinDigit}
                onDelete={()=>setPinResetNewPin(p=>p.slice(0,-1))}
                status="none" statusMsg=""/>
            </>}
            {pinResetStep==="confirm" && <>
              <PinPad title="PIN bestätigen" subtitle="PIN nochmal eingeben"
                pin={pinResetConfirm} onDigit={handlePinResetConfirmDigit}
                onDelete={()=>setPinResetConfirm(p=>p.slice(0,-1))}
                status={pinResetStatus} statusMsg={pinResetMsg}/>
              {pinResetLoading?<ActivityIndicator color={C.accent} style={{marginTop:10}}/>:null}
            </>}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* INFO MODAL (ersetzt Alert.alert) */}
      <Modal visible={infoModal} transparent animationType="fade">
        <View style={[s.modalOverlay,{justifyContent:"center",paddingHorizontal:24}]}>
          <View style={[s.modalSheet,{borderRadius:18}]}>
            <View style={s.modalHandle}/>
            <Text style={s.modalTitle}>{infoTitle}</Text>
            <Text style={[s.actionSub,{marginBottom:20,fontSize:13,lineHeight:20}]}>{infoText}</Text>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.accent}]} onPress={()=>setInfoModal(false)}>
              <Text style={s.btnPrimaryText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* FIRMA AUFLÖSEN BESTÄTIGUNG */}
      <Modal visible={showDissolveModal} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={()=>{ if(!dissolving) setShowDissolveModal(false); }}>
          <TouchableOpacity activeOpacity={1} style={[s.modalSheet,{paddingBottom:32}]}>
            <View style={s.modalHandle}/>
            <Text style={[s.modalTitle,{color:C.red}]}>Firma auflösen</Text>
            <View style={s.warningBox}>
              <AlertTriangle size={16} color={C.red}/>
              <Text style={s.warningText}>
                Diese Aktion kann nicht rückgängig gemacht werden.{"\n"}
                {(company?.members?.length??0) > 1
                  ? "Der älteste Admin (oder älteste Mitglied) wird automatisch neuer Chef."
                  : "Die Firma wird vollständig gelöscht, da du das einzige Mitglied bist."}
              </Text>
            </View>
            {dissolveMsg ? <Text style={[s.msgText,{color:dissolving?C.text2:C.red}]}>{dissolveMsg}</Text> : null}
            <TouchableOpacity
              style={[s.btnPrimary,{backgroundColor:"rgba(248,81,73,0.15)",borderWidth:1,borderColor:"rgba(248,81,73,0.4)"}]}
              onPress={handleDissolveCompany}
              disabled={dissolving}>
              {dissolving
                ? <ActivityIndicator color={C.red}/>
                : <Text style={[s.btnPrimaryText,{color:C.red}]}>Ja, Firma auflösen</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnPrimary,{backgroundColor:C.surface3,marginTop:8}]} onPress={()=>setShowDissolveModal(false)} disabled={dissolving}>
              <Text style={[s.btnPrimaryText,{color:C.text2}]}>Abbrechen</Text>
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
  headerLeft:{flexDirection:"row",alignItems:"center",gap:10},
  badge:{width:36,height:36,backgroundColor:"#1c2c55",borderWidth:1.5,borderColor:C.accent,borderRadius:10,alignItems:"center",justifyContent:"center"},
  badgeText:{color:C.accent,fontWeight:"700",fontSize:12},
  headerTitle:{fontSize:16,fontWeight:"700",color:C.text},
  headerSub:{fontSize:10,color:C.text2},
  webBtn:{width:34,height:34,backgroundColor:C.accentBg,borderWidth:0.5,borderColor:"rgba(245,166,35,0.3)",borderRadius:10,alignItems:"center",justifyContent:"center"},
  backBtn:{width:32,height:32,backgroundColor:C.surface2,borderRadius:8,alignItems:"center",justifyContent:"center"},
  content:{flex:1,padding:14},
  sectionLabel:{fontSize:10,fontWeight:"700",color:C.text3,textTransform:"uppercase",letterSpacing:0.9,marginBottom:8,marginTop:4},
  profileCard:{backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:16,padding:20,alignItems:"center",marginBottom:14},
  profileAvatar:{width:80,height:80,borderRadius:40,borderWidth:2,borderColor:C.accent,marginBottom:12},
  profileAvatarEmpty:{width:80,height:80,borderRadius:40,backgroundColor:C.surface2,borderWidth:1.5,borderColor:C.border2,alignItems:"center",justifyContent:"center",marginBottom:12},
  firmNameText:{fontSize:18,fontWeight:"700",color:C.text,textAlign:"center",marginBottom:3},
  userNameText:{fontSize:13,color:C.text2,marginBottom:2},
  emailText:{fontSize:12,color:C.blue,marginBottom:4},
  updatedText:{fontSize:10,color:C.text3,marginTop:3},
  pinBadge:{flexDirection:"row",backgroundColor:"rgba(163,113,247,0.15)",paddingHorizontal:10,paddingVertical:4,borderRadius:20},
  pinBadgeText:{fontSize:11,fontWeight:"600",color:C.purple},
  emptyText:{fontSize:15,fontWeight:"600",color:C.text2,marginBottom:4},
  emptySub:{fontSize:12,color:C.text3},
  syncBadge:{flexDirection:"row",alignItems:"center",gap:6,borderWidth:0.5,borderRadius:12,paddingHorizontal:12,paddingVertical:8,marginTop:10,width:"100%"},
  syncText:{fontSize:12,fontWeight:"600"},
  actionRow:{flexDirection:"row",alignItems:"center",gap:14,backgroundColor:C.surface,borderWidth:0.5,borderColor:C.border2,borderRadius:12,padding:14,marginBottom:8},
  logoutBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:10,backgroundColor:"rgba(248,81,73,0.08)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)",borderRadius:12,padding:14,marginTop:8,marginBottom:8},
  logoutBtnText:{fontSize:14,fontWeight:"700",color:"#f85149"},
  actionTitle:{fontSize:13,fontWeight:"600",color:C.text,marginBottom:2},
  actionSub:{fontSize:11,color:C.text2},
  toggleBadge:{paddingHorizontal:10,paddingVertical:4,borderRadius:20},
  logoSection:{alignItems:"center",marginBottom:18},
  logoPicker:{width:90,height:90,borderRadius:45,overflow:"hidden",borderWidth:2,borderColor:C.accent,borderStyle:"dashed"},
  logoImg:{width:90,height:90},
  logoEmpty:{width:90,height:90,backgroundColor:C.surface2,alignItems:"center",justifyContent:"center",gap:4},
  formLabel:{fontSize:10,fontWeight:"600",color:C.text3,textTransform:"uppercase",letterSpacing:0.7,marginBottom:5},
  formInput:{backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8,padding:11,fontSize:13,color:C.text,marginBottom:12},
  infoBox:{flexDirection:"row",alignItems:"flex-start",gap:8,backgroundColor:C.accentBg,borderWidth:0.5,borderColor:"rgba(245,166,35,0.25)",borderRadius:10,padding:12,marginBottom:14},
  infoBoxText:{flex:1,fontSize:12,color:C.text2,lineHeight:18},
  warningBox:{flexDirection:"row",alignItems:"flex-start",gap:8,backgroundColor:"rgba(248,81,73,0.1)",borderWidth:0.5,borderColor:"rgba(248,81,73,0.3)",borderRadius:10,padding:12,marginBottom:14},
  warningText:{flex:1,fontSize:12,color:C.text2,lineHeight:18},
  msgText:{fontSize:12,fontWeight:"600",textAlign:"center",marginBottom:8},
  modalOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end"},
  modalSheet:{backgroundColor:C.surface,borderTopLeftRadius:22,borderTopRightRadius:22,padding:20,borderTopWidth:0.5,borderTopColor:C.border2,maxHeight:"90%"},
  modalHandle:{width:36,height:3,backgroundColor:C.border2,borderRadius:2,alignSelf:"center",marginBottom:18},
  modalTitle:{fontSize:16,fontWeight:"700",color:C.text,marginBottom:14},
  foundCard:{flexDirection:"row",alignItems:"center",gap:12,backgroundColor:C.surface2,borderRadius:12,padding:12,marginBottom:16},
  foundName:{fontSize:14,fontWeight:"700",color:C.text},
  foundSub:{fontSize:11,color:C.text2},
  pinOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.9)",justifyContent:"center",alignItems:"center"},
  pinSheet:{width:"90%",backgroundColor:C.surface,borderRadius:20,padding:20,borderWidth:0.5,borderColor:C.border2},
  pinClose:{position:"absolute",top:14,right:14,zIndex:10},
  whChip:{flexDirection:"row",alignItems:"center",gap:6,paddingHorizontal:12,paddingVertical:8,backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:10},
  whChipActive:{borderColor:C.accent,backgroundColor:C.accentBg},
  roleChip:{flex:1,alignItems:"center",paddingVertical:8,backgroundColor:C.surface2,borderWidth:0.5,borderColor:C.border2,borderRadius:8},
  langRow:{flexDirection:"row",alignItems:"center",gap:14,padding:12,borderRadius:10,marginBottom:4},
  langRowActive:{backgroundColor:C.accentBg,borderWidth:0.5,borderColor:"rgba(245,166,35,0.3)"},
  langName:{flex:1,fontSize:15,fontWeight:"500",color:C.text},
  btnPrimary:{borderRadius:8,padding:13,alignItems:"center",marginTop:4},
  btnPrimaryText:{color:"#000",fontWeight:"700",fontSize:14},
});
