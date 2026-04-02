// app/portal_select.tsx
import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Modal, Platform, Linking, TextInput, KeyboardAvoidingView, ScrollView } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTeamStore } from "../teamStore";
import { useStore } from "../store";
import { useLang, t } from "../i18n";
import { Mail, Building2, Lock, Package, BarChart2, ShoppingCart, Cpu, Users, X, Check, Shield, LogIn, ArrowLeft, KeyRound, UserPlus, Settings, Zap, Crown } from "lucide-react-native";
import { useProStore } from "../proStore";

const BACKEND = "https://materialcheck-backend2.onrender.com";

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer); return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("TIMEOUT");
    throw err;
  }
}

const C = {
  bg:"#0d1117", surface:"#161b22", surface2:"#21262d",
  border:"rgba(255,255,255,0.08)", border2:"rgba(255,255,255,0.14)",
  accent:"#f5a623", accentBg:"rgba(245,166,35,0.12)",
  green:"#3fb950", red:"#f85149", purple:"#a371f7",
  text:"#e6edf3", text2:"#8b949e", text3:"#6e7681",
};

const COOKIE_KEY = "eg-cookie-consent";

export default function PortalSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom > 0 ? insets.bottom : 12;
  const { lang } = useLang();
  const T = t(lang);
  const isWeb = Platform.OS === "web";

  const company = useTeamStore(s => s?.company ?? null);
  const rawInvitations = useTeamStore(s => s?.invitations);
  const invitations = Array.isArray(rawInvitations) ? rawInvitations : [];
  const rejectInvite = useTeamStore(s => s?.rejectInvite);
  const checkInvitations = useTeamStore(s => s?.checkInvitations);
  const loadCompanyByEmail = useTeamStore(s => s?.loadCompanyByEmail);
  const loadCompany = useTeamStore(s => s?.loadCompany);

  const members = Array.isArray(company?.members) ? company!.members : [];
  const warehouses = Array.isArray(company?.warehouses) ? company!.warehouses : [];

  const isPro = useProStore(s => s.isPro);
  const inTrial = useProStore(s => s.inTrial);

  const [firmName, setFirmName] = useState("");
  const [userName, setUserName] = useState("");
  const [logoUri, setLogoUri] = useState<string|null>(null);
  const [ready, setReady] = useState(false);
  const restoreFromCloud = useStore(s => s?.restoreFromCloud);

  // ── Login Flow ───────────────────────────────────
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginStep, setLoginStep] = useState<"email"|"pin">("email");
  const [loginPin, setLoginPin] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginStatus, setLoginStatus] = useState<"none"|"ok"|"error">("none");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginFirm, setLoginFirm] = useState("");

  const handleLoginEmailSubmit = async () => {
    const email = loginEmail.trim().toLowerCase();
    if (!email) { setLoginMsg("Email eingeben"); setLoginStatus("error"); return; }
    setLoginLoading(true); setLoginMsg("Suche..."); setLoginStatus("none");
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/profile/check/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setLoginFirm(data.firmName||"");
        if (!data.hasPin) { setLoginMsg("Kein PIN gesetzt — in Einstellungen PIN erstellen"); setLoginStatus("error"); setLoginLoading(false); return; }
        setLoginStep("pin"); setLoginPin(""); setLoginMsg(""); setLoginStatus("none");
      } else if (res.status === 404) {
        setLoginMsg("Kein Konto mit dieser Email gefunden"); setLoginStatus("error");
      } else {
        setLoginMsg("Fehler beim Suchen"); setLoginStatus("error");
      }
    } catch (err: any) {
      setLoginMsg(err.message === "TIMEOUT" ? "Server startet — bitte nochmal versuchen" : "Keine Verbindung");
      setLoginStatus("error");
    }
    setLoginLoading(false);
  };

  const handleLoginPinDigit = async (digit: string) => {
    const updated = loginPin + digit;
    setLoginPin(updated);
    if (updated.length < 6) return;
    setLoginLoading(true); setLoginMsg("PIN wird geprüft..."); setLoginStatus("none");
    try {
      const deviceId = "device_"+Date.now()+"_"+Math.random().toString(36).substr(2,6);
      const email = loginEmail.trim().toLowerCase();
      const res = await fetchWithTimeout(`${BACKEND}/api/profile/load`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ email, pin:updated, deviceId }),
      });
      if (res.ok) {
        const profile = await res.json();
        const merged = { ...profile, deviceId, hasPin:true };
        await AsyncStorage.setItem("eg-profile-v1", JSON.stringify(merged));
        await AsyncStorage.setItem("eg-device-id", deviceId);
        setLoginMsg("Erfolgreich angemeldet!"); setLoginStatus("ok");
        // Materialien laden
        try {
          const matRes = await fetchWithTimeout(`${BACKEND}/api/materials/load`, {
            method:"POST", headers:{"Content-Type":"application/json"},
            body:JSON.stringify({ email, pin:updated }),
          }, 20000);
          if (matRes.ok) {
            const matData = await matRes.json();
            if (matData.materials && restoreFromCloud) {
              restoreFromCloud(matData.folders||[], matData.materials||[], matData.tasks||[], matData.suppliers||[], matData.loans||[]);
            }
          }
        } catch {}
        setFirmName(merged.firmName||""); setUserName(merged.userName||""); setLogoUri(merged.logoUri||null);
        setTimeout(() => { setShowLogin(false); setLoginStep("email"); setLoginPin(""); setLoginMsg(""); setLoginStatus("none"); }, 1200);
      } else if (res.status === 401) {
        setLoginMsg("Falscher PIN"); setLoginStatus("error"); setLoginPin("");
      } else {
        setLoginMsg("Fehler"); setLoginStatus("error"); setLoginPin("");
      }
    } catch (err: any) {
      setLoginMsg(err.message === "TIMEOUT" ? "Server startet — nochmal versuchen" : "Keine Verbindung");
      setLoginStatus("error"); setLoginPin("");
    }
    setLoginLoading(false);
  };

  // ── Cookie Banner ────────────────────────────────
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  // ── Confirm Dialog State ─────────────────────────
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmInviteId, setConfirmInviteId] = useState("");
  const [confirmCompanyName, setConfirmCompanyName] = useState("");

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      const raw = await AsyncStorage.getItem("eg-profile-v1");
      if (raw) {
        const p = JSON.parse(raw);
        setFirmName(p?.firmName ?? "");
        setUserName(p?.userName ?? "");
        setLogoUri(p?.logoUri ?? null);
        if (p?.email) {
          checkInvitations?.(p.email);
          if (!company) {
            if (p?.companyId) {
              loadCompany?.(p.companyId, p.email);
            } else {
              loadCompanyByEmail?.(p.email);
            }
          }
        }
        // Auto-Login: Zuletzt genutztes Portal automatisch öffnen
        const lastPortal = await AsyncStorage.getItem("eg-last-portal");
        if (lastPortal === "private") {
          setTimeout(() => router.replace("/private"), 100);
          return;
        } else if (lastPortal === "company") {
          setTimeout(() => router.replace("/company"), 100);
          return;
        }
      }
      // Cookie Banner nur auf Web anzeigen
      if (isWeb) {
        const consent = await AsyncStorage.getItem(COOKIE_KEY);
        if (!consent) setShowCookieBanner(true);
      }
    } catch {}
    setTimeout(() => setReady(true), 400);
  };

  const acceptCookies = async () => {
    await AsyncStorage.setItem(COOKIE_KEY, "accepted");
    setShowCookieBanner(false);
  };

  const rejectCookies = async () => {
    await AsyncStorage.setItem(COOKIE_KEY, "rejected");
    setShowCookieBanner(false);
  };

  const handleReject = (inviteId: string, companyName: string) => {
    setConfirmInviteId(inviteId);
    setConfirmCompanyName(companyName);
    setConfirmVisible(true);
  };

  const confirmReject = async () => {
    setConfirmVisible(false);
    await rejectInvite?.(confirmInviteId);
  };

  if (!ready) {
    return (
      <View style={{ flex:1, backgroundColor:C.bg, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator color={C.accent} size="large"/>
      </View>
    );
  }

  const inviteCount = invitations.length;

  return (
    <SafeAreaView style={s.container} edges={["top","left","right"]}>
      <View style={[s.content, { paddingBottom: bottomPad + 20 }]}>

        {/* Begrüßung */}
        <View style={s.greetSection}>
          {logoUri
            ? <Image source={{ uri: logoUri }} style={s.logo}/>
            : <View style={s.logoBadge}>
                <Text style={s.logoText}>{userName ? userName.slice(0,2).toUpperCase() : "EG"}</Text>
              </View>
          }
          <View style={{ flexDirection:"row", alignItems:"center", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
            <Text style={s.greeting}>{T.welcome || "Willkommen"}{userName ? `, ${userName}` : ""}!</Text>
            {isPro && (
              <View style={{ flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:8, paddingVertical:3, borderRadius:20, backgroundColor:"rgba(245,166,35,0.15)", borderWidth:1, borderColor:"rgba(245,166,35,0.35)" }}>
                <Crown size={11} color={C.accent} />
                <Text style={{ fontSize:10, fontWeight:"700", color:C.accent }}>{inTrial ? "TRIAL" : "PRO"}</Text>
              </View>
            )}
          </View>
          {firmName ? <Text style={s.subGreeting}>{firmName}</Text> : null}
          <Text style={s.question}>Wo möchtest du arbeiten?</Text>
        </View>

        {/* PROFIL ERSTELLEN / ANMELDEN (wenn kein Profil) */}
        {!firmName && !showLogin && (
          <View style={{gap:10,marginBottom:4}}>
            <TouchableOpacity style={[s.loginBtn,{backgroundColor:"rgba(245,166,35,0.15)",borderColor:"rgba(245,166,35,0.5)"}]}
              onPress={()=>router.push("/profile")}>
              <UserPlus size={16} color={C.accent}/>
              <Text style={s.loginBtnText}>Neues Profil erstellen</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.loginBtn} onPress={()=>{ setShowLogin(true); setLoginStep("email"); setLoginEmail(""); setLoginPin(""); setLoginMsg(""); setLoginStatus("none"); }}>
              <LogIn size={16} color={C.accent}/>
              <Text style={s.loginBtnText}>Mit bestehendem Konto anmelden</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EINSTELLUNGEN Button (wenn Profil vorhanden) */}
        {firmName && (
          <TouchableOpacity style={[s.loginBtn,{marginBottom:4,backgroundColor:"transparent",borderColor:C.border}]}
            onPress={()=>router.push("/profile")}>
            <Settings size={14} color={C.text3}/>
            <Text style={[s.loginBtnText,{color:C.text3,fontSize:12}]}>Einstellungen · Profil bearbeiten</Text>
          </TouchableOpacity>
        )}

        {/* INLINE LOGIN FLOW */}
        {showLogin && (
          <View style={s.loginBox}>
            <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:14}}>
              {loginStep==="pin" && (
                <TouchableOpacity onPress={()=>{ setLoginStep("email"); setLoginPin(""); setLoginMsg(""); setLoginStatus("none"); }}>
                  <ArrowLeft size={18} color={C.text2}/>
                </TouchableOpacity>
              )}
              <KeyRound size={16} color={C.accent}/>
              <Text style={s.loginBoxTitle}>{loginStep==="email"?"Anmelden":"PIN eingeben"}</Text>
              <TouchableOpacity style={{marginLeft:"auto"}} onPress={()=>setShowLogin(false)}>
                <X size={16} color={C.text3}/>
              </TouchableOpacity>
            </View>

            {loginStep==="email" ? (
              <>
                {loginFirm ? <View style={{backgroundColor:"rgba(63,185,80,0.1)",borderRadius:8,padding:10,marginBottom:10}}><Text style={{color:C.green,fontSize:13,fontWeight:"600"}}>{loginFirm}</Text><Text style={{color:C.text2,fontSize:11}}>{loginEmail}</Text></View> : null}
                <TextInput
                  style={s.loginInput}
                  placeholder="Email-Adresse"
                  placeholderTextColor={C.text3}
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                  returnKeyType="go"
                  onSubmitEditing={handleLoginEmailSubmit}
                />
                {loginMsg ? <Text style={[s.loginMsg,{color:loginStatus==="ok"?C.green:C.red}]}>{loginMsg}</Text> : null}
                <TouchableOpacity style={s.loginSubmitBtn} onPress={handleLoginEmailSubmit} disabled={loginLoading}>
                  {loginLoading ? <ActivityIndicator color="#000" size="small"/> : <Text style={s.loginSubmitText}>Weiter →</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {loginFirm ? <View style={{backgroundColor:"rgba(63,185,80,0.1)",borderRadius:8,padding:10,marginBottom:12}}><Text style={{color:C.green,fontSize:13,fontWeight:"600"}}>{loginFirm}</Text><Text style={{color:C.text2,fontSize:11}}>{loginEmail}</Text></View> : null}
                <View style={{flexDirection:"row",justifyContent:"center",gap:10,marginBottom:14}}>
                  {[0,1,2,3,4,5].map(i=>(
                    <View key={i} style={[s.pinDot, loginPin.length>i&&s.pinDotFilled]}/>
                  ))}
                </View>
                {loginMsg ? <Text style={[s.loginMsg,{color:loginStatus==="ok"?C.green:C.red,textAlign:"center",marginBottom:10}]}>{loginMsg}</Text> : null}
                {loginLoading ? <ActivityIndicator color={C.accent} style={{marginBottom:10}}/> : (
                  <View style={s.pinGrid}>
                    {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>(
                      <TouchableOpacity key={i}
                        style={[s.pinKey, k===""&&{opacity:0}, k==="⌫"&&{backgroundColor:"rgba(248,81,73,0.1)"}]}
                        onPress={()=>{ if(k==="⌫"){ setLoginPin(p=>p.slice(0,-1)); setLoginMsg(""); } else if(k!==""){ handleLoginPinDigit(k); } }}
                        disabled={loginPin.length>=6&&loginStatus==="none"}>
                        <Text style={[s.pinKeyText, k==="⌫"&&{color:C.red}]}>{k}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Einladungen */}
        {inviteCount > 0 && (
          <View style={s.inviteSection}>
            <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Mail size={12} color={C.accent}/><Text style={s.inviteSectionTitle}>Offene Einladungen ({inviteCount})</Text></View>
            {invitations.map(inv => (
              <View key={inv.inviteId} style={s.inviteCard}>
                <View style={{ flex:1 }}>
                  <Text style={s.inviteCompany}>{inv.companyName}</Text>
                  <Text style={s.inviteDetail}>{inv.warehouseName} · von {inv.inviterName||inv.inviterEmail}</Text>
                </View>
                <View style={{ flexDirection:"row", gap:8 }}>
                  <TouchableOpacity style={s.rejectBtn}
                    onPress={() => handleReject(inv.inviteId, inv.companyName)}>
                    <X size={12} color={C.red} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.acceptBtn}
                    onPress={() => router.push("/invites")}>
                    <Text style={{ color:"#000", fontSize:12, fontWeight:"700" }}>Beitreten</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* PRIVATER BEREICH */}
        <TouchableOpacity style={s.card} onPress={async () => { await AsyncStorage.setItem("eg-last-portal","private"); router.push("/private"); }}>
          <View style={s.cardTop}>
            <View style={[s.cardIcon, { backgroundColor:"rgba(163,113,247,0.15)" }]}>
              <Lock size={38} color="#a371f7" />
            </View>
            <View style={{ flex:1 }}>
              <Text style={s.cardTitle}>Privater Bereich</Text>
              <Text style={s.cardSub}>Nur für dich sichtbar</Text>
            </View>
          </View>
          <View style={s.pills}>
            {["Material","Aufgaben","Statistik","Einkauf","KI"].map(f => (
              <View key={f} style={[s.pill, { backgroundColor:"rgba(163,113,247,0.1)", borderColor:"rgba(163,113,247,0.25)" }]}>
                <Text style={[s.pillText, { color:C.purple }]}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={[s.btn, { backgroundColor:"rgba(163,113,247,0.2)", borderColor:"rgba(163,113,247,0.4)" }]}>
            <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Lock size={14} color={C.purple}/><Text style={[s.btnText, { color:C.purple }]}>Privaten Bereich öffnen →</Text></View>
          </View>
        </TouchableOpacity>

        {/* FIRMEN PORTAL */}
        <TouchableOpacity
          style={[s.card, { borderColor:"rgba(245,166,35,0.3)" }]}
          onPress={async () => { await AsyncStorage.setItem("eg-last-portal","company"); router.push("/company"); }}>
          <View style={s.cardTop}>
            <View style={[s.cardIcon, { backgroundColor:"rgba(245,166,35,0.15)" }]}>
              <Building2 size={38} color={C.accent} />
            </View>
            <View style={{ flex:1 }}>
              <Text style={s.cardTitle}>
                {company ? company.companyName : "Firmen Portal"}
              </Text>
              <Text style={s.cardSub}>
                {company
                  ? `${members.length} Mitglieder · ${warehouses.length} Lager`
                  : "Firma erstellen oder Einladung annehmen"}
              </Text>
            </View>
          </View>
          {company && (
            <View style={s.pills}>
              {[
                { label:"Lager", forAll:true },
                { label:"Aufgaben", forAll:true },
                { label:"Team", forAll:true },
                { label:"Statistik", forAll:false },
                { label:"Einkauf", forAll:false },
              ].map(f => (
                <View key={f.label} style={[s.pill,
                  f.forAll
                    ? { backgroundColor:"rgba(245,166,35,0.1)", borderColor:"rgba(245,166,35,0.25)" }
                    : { backgroundColor:"rgba(79,163,247,0.1)", borderColor:"rgba(79,163,247,0.25)" }
                ]}>
                  <Text style={[s.pillText, { color: f.forAll ? C.accent : C.text2 }]}>
                    {f.label}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {company && (
            <Text style={s.adminNote}>Statistik & Einkauf nur für Chef & Admin</Text>
          )}
          <View style={[s.btn, { backgroundColor:"rgba(245,166,35,0.15)", borderColor:"rgba(245,166,35,0.4)" }]}>
            <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Building2 size={14} color={C.accent}/><Text style={[s.btnText, { color:C.accent }]}>Firmen Portal öffnen →</Text></View>
          </View>
        </TouchableOpacity>

        {/* MaterialCheck+ Upgrade Card — nur für Nicht-Pro-User */}
        {!isPro && firmName ? (
          <View style={{ borderRadius:20, padding:18, marginBottom:14, backgroundColor:"rgba(245,166,35,0.06)", borderWidth:1.5, borderColor:"rgba(245,166,35,0.35)", position:"relative", overflow:"visible" }}>
            {/* Empfohlen Badge */}
            <View style={{ position:"absolute", top:-11, alignSelf:"center", backgroundColor:"#f5a623", paddingHorizontal:12, paddingVertical:3, borderRadius:20, flexDirection:"row", alignItems:"center", gap:4 }}>
              <Crown size={10} color="#0d1117" />
              <Text style={{ fontSize:10, fontWeight:"800", color:"#0d1117", letterSpacing:0.5 }}>EMPFOHLEN</Text>
            </View>
            <View style={{ flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:12, marginTop:4 }}>
              <View>
                <Text style={{ fontSize:16, fontWeight:"800", color:C.text, marginBottom:2 }}>MaterialCheck+</Text>
                <Text style={{ fontSize:12, color:C.text2 }}>7 Tage kostenlos testen</Text>
              </View>
              <View style={{ alignItems:"flex-end" }}>
                <Text style={{ fontSize:22, fontWeight:"800", color:C.accent }}>19,99 €</Text>
                <Text style={{ fontSize:11, color:C.text3 }}>/Monat</Text>
              </View>
            </View>
            <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:14 }}>
              {["Unbegrenzte Projekte","PDF-Export","Statistiken","Sync & Backup","Team-Features"].map(f => (
                <View key={f} style={{ flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:8, paddingVertical:3, borderRadius:12, backgroundColor:"rgba(245,166,35,0.1)", borderWidth:1, borderColor:"rgba(245,166,35,0.2)" }}>
                  <Check size={10} color={C.accent} />
                  <Text style={{ fontSize:10, color:C.accent }}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={{ backgroundColor:C.accent, borderRadius:14, paddingVertical:13, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8 }}
              onPress={() => router.push("/profile")}
            >
              <Zap size={15} color="#0d1117" />
              <Text style={{ fontWeight:"800", fontSize:14, color:"#0d1117" }}>Jetzt 7 Tage kostenlos testen</Text>
            </TouchableOpacity>
            <Text style={{ fontSize:10, color:C.text3, textAlign:"center", marginTop:8 }}>Danach 19,99 €/Monat · Jederzeit kündbar</Text>
          </View>
        ) : null}

        {/* FOOTER — nur auf Web */}
        {isWeb && (
          <View style={s.footer}>
            <TouchableOpacity onPress={() => Linking.openURL("https://materialcheck.elektrogenius.de/impressum.html")}>
              <Text style={s.footerLink}>Impressum</Text>
            </TouchableOpacity>
            <Text style={s.footerDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL("https://materialcheck.elektrogenius.de/datenschutz-app.html")}>
              <Text style={s.footerLink}>Datenschutz</Text>
            </TouchableOpacity>
            <Text style={s.footerDot}>·</Text>
            <TouchableOpacity onPress={() => setShowCookieBanner(true)}>
              <Text style={s.footerLink}>Cookie-Einstellungen</Text>
            </TouchableOpacity>
            <Text style={s.footerDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL("https://elektrogenius.de")}>
              <Text style={s.footerLink}>elektrogenius.de</Text>
            </TouchableOpacity>
          </View>
        )}

      </View>

      {/* ── Cookie Banner ── */}
      {isWeb && showCookieBanner && (
        <View style={s.cookieBanner}>
          <View style={s.cookieContent}>
            <View style={{flexDirection:"row",alignItems:"center",gap:6}}><Shield size={14} color="#00c6ff"/><Text style={s.cookieTitle}>Cookies & Datenschutz</Text></View>
            <Text style={s.cookieText}>
              Diese Web-App verwendet notwendige Cookies für die Funktionalität (Profil, Sync). Weitere Informationen in unserer{" "}
              <Text style={s.cookieLinkText}
                onPress={() => Linking.openURL("https://materialcheck.elektrogenius.de/datenschutz-app.html")}>
                Datenschutzerklärung
              </Text>.
            </Text>
          </View>
          <View style={s.cookieBtns}>
            <TouchableOpacity style={s.cookieBtnReject} onPress={rejectCookies}>
              <Text style={s.cookieBtnRejectText}>Nur notwendige</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.cookieBtnAccept} onPress={acceptCookies}>
              <Text style={s.cookieBtnAcceptText}>Alle akzeptieren</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Confirm Dialog ── */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>Einladung ablehnen</Text>
            <Text style={s.confirmText}>
              Einladung von "{confirmCompanyName}" wirklich ablehnen?
            </Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor:C.surface2 }]}
                onPress={() => setConfirmVisible(false)}>
                <Text style={{ color:C.text2, fontWeight:"600" }}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor:"rgba(248,81,73,0.2)", borderWidth:0.5, borderColor:"rgba(248,81,73,0.4)" }]}
                onPress={confirmReject}>
                <Text style={{ color:C.red, fontWeight:"700" }}>Ablehnen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, backgroundColor:C.bg },
  content:{ flex:1, padding:20, justifyContent:"center" },
  greetSection:{ alignItems:"center", marginBottom:20 },
  logo:{ width:70, height:70, borderRadius:35, borderWidth:2, borderColor:C.accent, marginBottom:12 },
  logoBadge:{ width:70, height:70, backgroundColor:"#1c2c55", borderWidth:2, borderColor:C.accent, borderRadius:16, alignItems:"center", justifyContent:"center", marginBottom:12 },
  logoText:{ color:C.accent, fontWeight:"700", fontSize:24 },
  greeting:{ fontSize:24, fontWeight:"700", color:C.text, textAlign:"center" },
  subGreeting:{ fontSize:13, color:C.text2, marginTop:4 },
  question:{ fontSize:15, color:C.text2, marginTop:12, textAlign:"center" },
  inviteSection:{ backgroundColor:"rgba(245,166,35,0.06)", borderWidth:0.5, borderColor:"rgba(245,166,35,0.3)", borderRadius:14, padding:12, marginBottom:14 },
  inviteSectionTitle:{ fontSize:12, fontWeight:"700", color:C.accent, marginBottom:10 },
  inviteCard:{ flexDirection:"row", alignItems:"center", gap:8, backgroundColor:C.surface, borderRadius:10, padding:10, marginBottom:6 },
  inviteCompany:{ fontSize:13, fontWeight:"700", color:C.text },
  inviteDetail:{ fontSize:11, color:C.text2, marginTop:2 },
  rejectBtn:{ width:32, height:32, backgroundColor:"rgba(248,81,73,0.15)", borderWidth:0.5, borderColor:"rgba(248,81,73,0.3)", borderRadius:8, alignItems:"center", justifyContent:"center" },
  acceptBtn:{ paddingHorizontal:12, height:32, backgroundColor:C.accent, borderRadius:8, alignItems:"center", justifyContent:"center" },
  card:{ backgroundColor:C.surface, borderWidth:0.5, borderColor:C.border2, borderRadius:20, padding:16, marginBottom:14 },
  cardTop:{ flexDirection:"row", alignItems:"center", gap:12, marginBottom:12 },
  cardIcon:{ width:66, height:66, borderRadius:16, alignItems:"center", justifyContent:"center" },
  cardTitle:{ fontSize:17, fontWeight:"700", color:C.text, marginBottom:3 },
  cardSub:{ fontSize:12, color:C.text2 },
  pills:{ flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:10 },
  pill:{ borderWidth:0.5, borderRadius:20, paddingHorizontal:9, paddingVertical:4 },
  pillText:{ fontSize:11, fontWeight:"500" },
  adminNote:{ fontSize:10, color:C.text3, marginBottom:8, fontStyle:"italic" },
  btn:{ borderWidth:0.5, borderRadius:12, padding:12, alignItems:"center" },
  btnText:{ fontSize:14, fontWeight:"700" },
  // Footer
  footer:{ flexDirection:"row", flexWrap:"wrap", justifyContent:"center", alignItems:"center", gap:6, paddingTop:16, borderTopWidth:0.5, borderTopColor:C.border, marginTop:8 },
  footerLink:{ fontSize:11, color:C.text3 },
  footerDot:{ fontSize:11, color:C.text3 },
  // Cookie Banner
  cookieBanner:{ position:"absolute", bottom:0, left:0, right:0, backgroundColor:"#161b22", borderTopWidth:0.5, borderTopColor:"rgba(0,198,255,0.3)", padding:16, zIndex:999 },
  cookieContent:{ marginBottom:12 },
  cookieTitle:{ fontSize:14, fontWeight:"700", color:C.text, marginBottom:6 },
  cookieText:{ fontSize:12, color:C.text2, lineHeight:18 },
  cookieLinkText:{ color:"#00c6ff", textDecorationLine:"underline" },
  cookieBtns:{ flexDirection:"row", gap:10 },
  cookieBtnReject:{ flex:1, backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:8, padding:10, alignItems:"center" },
  cookieBtnRejectText:{ fontSize:12, fontWeight:"600", color:C.text2 },
  cookieBtnAccept:{ flex:1, backgroundColor:"#f5a623", borderRadius:8, padding:10, alignItems:"center" },
  cookieBtnAcceptText:{ fontSize:12, fontWeight:"700", color:"#000" },
  // Confirm Dialog
  confirmOverlay:{ flex:1, backgroundColor:"rgba(0,0,0,0.7)", alignItems:"center", justifyContent:"center" },
  confirmBox:{ width:"80%", backgroundColor:C.surface, borderRadius:16, padding:20, borderWidth:0.5, borderColor:C.border2 },
  confirmTitle:{ fontSize:16, fontWeight:"700", color:C.text, marginBottom:8 },
  confirmText:{ fontSize:13, color:C.text2, marginBottom:20, lineHeight:20 },
  confirmBtns:{ flexDirection:"row", gap:10 },
  confirmBtn:{ flex:1, padding:12, borderRadius:10, alignItems:"center" },
  // Login
  loginBtn:{ flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, backgroundColor:"rgba(245,166,35,0.08)", borderWidth:0.5, borderColor:"rgba(245,166,35,0.3)", borderRadius:12, padding:14, marginBottom:14 },
  loginBtnText:{ color:C.accent, fontSize:14, fontWeight:"600" },
  loginBox:{ backgroundColor:C.surface, borderWidth:0.5, borderColor:"rgba(245,166,35,0.25)", borderRadius:16, padding:18, marginBottom:16 },
  loginBoxTitle:{ fontSize:15, fontWeight:"700", color:C.text },
  loginInput:{ backgroundColor:C.surface2, borderWidth:0.5, borderColor:C.border2, borderRadius:10, padding:14, color:C.text, fontSize:15, marginBottom:10 },
  loginMsg:{ fontSize:12, marginBottom:8 },
  loginSubmitBtn:{ backgroundColor:C.accent, borderRadius:10, padding:14, alignItems:"center" },
  loginSubmitText:{ color:"#000", fontWeight:"700", fontSize:15 },
  pinDot:{ width:14, height:14, borderRadius:7, backgroundColor:C.surface2, borderWidth:1.5, borderColor:C.border2 },
  pinDotFilled:{ backgroundColor:C.accent, borderColor:C.accent },
  pinGrid:{ flexDirection:"row", flexWrap:"wrap", justifyContent:"center", gap:10 },
  pinKey:{ width:72, height:52, backgroundColor:C.surface2, borderRadius:10, alignItems:"center", justifyContent:"center" },
  pinKeyText:{ color:C.text, fontSize:20, fontWeight:"600" },
});
