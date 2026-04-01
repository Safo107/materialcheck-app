// teamStore.ts - ElektroGenius Team Store v3
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND = "https://materialcheck-backend2.onrender.com";
const TEAM_KEY = "eg-team-v2";

export type TeamRole = "owner" | "admin" | "member" | "readonly";

export interface TeamMember {
  email: string;
  name: string;
  role: TeamRole;
  joinedAt: string;
  isActive: boolean;
  deviceId?: string;
}

export interface Warehouse {
  warehouseId: string;
  warehouseName: string;
  warehouseIcon: string;
  access: { email: string; role: TeamRole }[];
  materials: any[];
  tasks: any[];
  activities: any[];
  lastSync: string;
  lastSyncBy: string;
  userRole?: TeamRole;
}

export interface Invitation {
  inviteId: string;
  companyId: string;
  companyName: string;
  inviterEmail: string;
  inviterName: string;
  warehouseId: string;
  warehouseName: string;
  role: TeamRole;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Company {
  companyId: string;
  companyName: string;
  ownerEmail: string;
  members: TeamMember[];
  warehouses: Warehouse[];
  userRole: TeamRole;
}

interface TeamState {
  company: Company | null;
  invitations: Invitation[];
  activeUsers: Record<string, any[]>;
  wsConnections: Record<string, WebSocket>;
  loading: boolean;
  error: string;
  lastLoadedEmail: string;

  loadTeamData: () => Promise<void>;
  saveTeamData: () => Promise<void>;
  resetTeamData: () => Promise<void>;
  loadCompanyByEmail: (email: string) => Promise<boolean>;

  createCompany: (ownerEmail: string, ownerName: string, companyName: string, deviceId: string) => Promise<boolean>;
  loadCompany: (companyId: string, email: string) => Promise<void>;
  createWarehouse: (name: string, icon: string) => Promise<string|null>;
  deleteWarehouse: (warehouseId: string) => Promise<boolean>;
  inviteMember: (inviteeEmail: string, warehouseId: string, warehouseName: string, role: TeamRole) => Promise<{ ok: boolean; error?: string }>;
  acceptInvite: (inviteId: string, userEmail: string, deviceId: string) => Promise<boolean>;
  rejectInvite: (inviteId: string) => Promise<void>;
  changeRole: (targetEmail: string, warehouseId: string, newRole: TeamRole) => Promise<boolean>;
  removeMember: (email: string) => Promise<boolean>;
  leaveCompany: () => Promise<boolean>;
  dissolveCompany: () => Promise<{ ok: boolean; action?: string; newOwner?: string | null }>;
  checkInvitations: (email: string) => Promise<void>;

  syncWarehouse: (warehouseId: string, materials: any[], tasks: any[], activities: any[]) => Promise<void>;
  loadWarehouse: (warehouseId: string) => Promise<Warehouse | null>;

  connectWebSocket: (warehouseId: string, email: string, name: string, onUpdate: (data: any) => void) => void;
  disconnectWebSocket: (warehouseId: string) => void;
  sendMaterialChange: (warehouseId: string, materialId: number, qty: number) => void;
  sendTaskChange: (warehouseId: string, taskId: number, status: string) => void;
}

// ── FETCH MIT TIMEOUT ────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 60000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("TIMEOUT");
    throw err;
  }
}

// Tracks warehouse IDs that were explicitly disconnected to prevent auto-reconnect
const intentionalDisconnects = new Set<string>();

export const useTeamStore = create<TeamState>((set, get) => ({
  company: null,
  invitations: [],
  activeUsers: {},
  wsConnections: {},
  loading: false,
  error: "",
  lastLoadedEmail: "",

  // ── Daten laden ─────────────────────────────────
  loadTeamData: async () => {
    try {
      const raw = await AsyncStorage.getItem(TEAM_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({
          company: data.company ?? null,
          invitations: Array.isArray(data.invitations) ? data.invitations : [],
          lastLoadedEmail: data.lastLoadedEmail ?? "",
        });
      }
    } catch {}
  },

  saveTeamData: async () => {
    try {
      const { company, invitations, lastLoadedEmail } = get();
      await AsyncStorage.setItem(TEAM_KEY, JSON.stringify({
        company,
        invitations: Array.isArray(invitations) ? invitations : [],
        lastLoadedEmail,
      }));
    } catch {}
  },

  // ── Account Wechsel → alles zurücksetzen ─────────
  resetTeamData: async () => {
    const { wsConnections } = get();
    Object.values(wsConnections).forEach(ws => {
      try { ws.close(); } catch {}
    });
    set({
      company: null,
      invitations: [],
      activeUsers: {},
      wsConnections: {},
      loading: false,
      error: "",
      lastLoadedEmail: "",
    });
    await AsyncStorage.removeItem(TEAM_KEY);
  },

  // ── Firma erstellen ──────────────────────────────
  createCompany: async (ownerEmail, ownerName, companyName, deviceId) => {
    set({ loading: true, error: "" });
    try {
      // Wake-up ping für Render.com free tier
      try { await fetchWithTimeout(`${BACKEND}/api/health`, {}, 5000); } catch {}
      const res = await fetchWithTimeout(`${BACKEND}/api/company/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerEmail, ownerName, companyName, deviceId }),
      }, 90000);
      if (!res.ok) {
        const txt = await res.text();
        let errMsg = txt;
        try { errMsg = JSON.parse(txt).detail || txt; } catch {}
        set({ error: errMsg, loading: false });
        return false;
      }
      const data = await res.json();
      const companyData = data.company ?? data;
      const company: Company = {
        companyId: companyData.companyId,
        companyName: companyData.companyName,
        ownerEmail,
        members: [{ email: ownerEmail, name: ownerName, role: "owner", joinedAt: new Date().toISOString(), isActive: true }],
        warehouses: [],
        userRole: "owner",
      };
      set({ company, loading: false, lastLoadedEmail: ownerEmail });
      get().saveTeamData();
      return true;
    } catch (err: any) {
      if (err.message === "TIMEOUT") {
        // Auto-retry: Server schläft, 2. Versuch
        set({ error: "Server startet... 2. Versuch läuft" });
        try {
          const res2 = await fetchWithTimeout(`${BACKEND}/api/company/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ownerEmail, ownerName, companyName, deviceId }),
          }, 90000);
          if (res2.ok) {
            const data = await res2.json();
            const companyData2 = data.company ?? data;
            const company: Company = {
              companyId: companyData2.companyId, companyName: companyData2.companyName, ownerEmail,
              members: [{ email: ownerEmail, name: ownerName, role: "owner", joinedAt: new Date().toISOString(), isActive: true }],
              warehouses: [], userRole: "owner",
            };
            set({ company, loading: false, lastLoadedEmail: ownerEmail });
            get().saveTeamData();
            return true;
          }
        } catch {}
        set({ error: "Server startet noch – bitte in 30 Sekunden nochmal versuchen.", loading: false });
      } else {
        set({ error: "Keine Verbindung", loading: false });
      }
      return false;
    }
  },

  // ── Firma anhand Email finden ────────────────────
  loadCompanyByEmail: async (email: string) => {
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/company/by-owner/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        await get().loadCompany(data.companyId, email);
        const profile = await AsyncStorage.getItem("eg-profile-v1");
        if (profile) {
          const p = JSON.parse(profile);
          if (!p.companyId) {
            p.companyId = data.companyId;
            p.companyRole = data.ownerEmail === email ? "owner" : "member";
            await AsyncStorage.setItem("eg-profile-v1", JSON.stringify(p));
          }
        }
        return true;
      }
      return false;
    } catch { return false; }
  },

  // ── Firma laden ──────────────────────────────────
  loadCompany: async (companyId, email) => {
    set({ loading: true });
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/company/${companyId}?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        const safeData = {
          ...data,
          members: Array.isArray(data.members) ? data.members : [],
          warehouses: Array.isArray(data.warehouses)
            ? data.warehouses.map((wh: any) => ({
                ...wh,
                warehouseName: wh.warehouseName ?? wh.name ?? "",
                warehouseIcon: wh.warehouseIcon ?? wh.icon ?? "warehouse",
              }))
            : [],
        };
        set({ company: safeData, loading: false, lastLoadedEmail: email });
        get().saveTeamData();
      } else if (res.status === 403) {
        set({ company: null, loading: false });
        const profile = await AsyncStorage.getItem("eg-profile-v1");
        if (profile) {
          const p = JSON.parse(profile);
          delete p.companyId;
          delete p.companyRole;
          await AsyncStorage.setItem("eg-profile-v1", JSON.stringify(p));
        }
        get().saveTeamData();
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  // ── Lager löschen ───────────────────────────────
  deleteWarehouse: async (warehouseId) => {
    const { company } = get();
    if (!company) return false;
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    try {
      const res = await fetchWithTimeout(
        `${BACKEND}/api/company/${company.companyId}/warehouse/${warehouseId}?email=${encodeURIComponent(p.email)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        set(s => ({
          company: s.company ? {
            ...s.company,
            warehouses: s.company.warehouses.filter(w => w.warehouseId !== warehouseId),
          } : null,
        }));
        get().saveTeamData();
        return true;
      }
      return false;
    } catch { return false; }
  },

  // ── Lager erstellen ──────────────────────────────
  createWarehouse: async (name, icon) => {
    const { company } = get();
    if (!company) return null;
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    try {
      const res = await fetchWithTimeout(
        `${BACKEND}/api/company/${company.companyId}/warehouse/create?email=${encodeURIComponent(p.email)}&name=${encodeURIComponent(name)}&icon=${encodeURIComponent(icon)}`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        await get().loadCompany(company.companyId, p.email);
        return data.warehouse?.warehouseId ?? data.warehouseId ?? "created";
      }
      return null;
    } catch { return null; }
  },

  // ── Einladen ─────────────────────────────────────
  inviteMember: async (inviteeEmail, warehouseId, warehouseName, role) => {
    const { company } = get();
    if (!company) return { ok: false, error: "Keine Firma" };
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/company/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.companyId,
          inviterEmail: p.email,
          inviteeEmail,
          warehouseId,
          warehouseName,
          role,
        }),
      });
      if (res.ok) return { ok: true };
      const txt = await res.text();
      try {
        const errData = JSON.parse(txt);
        return { ok: false, error: errData.detail || txt };
      } catch {
        return { ok: false, error: txt };
      }
    } catch (err: any) {
      if (err.message === "TIMEOUT") return { ok: false, error: "Server startet – bitte nochmal versuchen!" };
      return { ok: false, error: "Keine Verbindung" };
    }
  },

  // ── Einladung annehmen ───────────────────────────
  acceptInvite: async (inviteId, userEmail, deviceId) => {
    set({ loading: true });
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/company/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, email: userEmail, deviceId }),
      });
      if (res.ok) {
        const data = await res.json();
        const companyId = data.companyId ?? data.company?.companyId;
        set(s => ({
          invitations: (s.invitations || []).filter(i => i.inviteId !== inviteId),
          loading: false,
        }));
        if (companyId) await get().loadCompany(companyId, userEmail);
        const profile = await AsyncStorage.getItem("eg-profile-v1");
        if (profile) {
          const p = JSON.parse(profile);
          p.companyId = companyId;
          p.companyRole = "member";
          await AsyncStorage.setItem("eg-profile-v1", JSON.stringify(p));
        }
        get().saveTeamData();
        return true;
      }
      set({ loading: false });
      return false;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  rejectInvite: async (inviteId: string) => {
    set(s => ({ invitations: (s.invitations || []).filter(i => i.inviteId !== inviteId) }));
    get().saveTeamData();
    try {
      await fetchWithTimeout(`${BACKEND}/api/company/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
    } catch {}
  },

  // ── Firma verlassen ──────────────────────────────
  leaveCompany: async () => {
    const { company } = get();
    if (!company) return false;
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    if (!p.email) return false;
    try {
      await fetchWithTimeout(
        `${BACKEND}/api/company/${company.companyId}/leave?email=${encodeURIComponent(p.email)}`,
        { method: "POST" }
      );
      set({ company: null, invitations: [], activeUsers: {}, wsConnections: {} });
      const updatedProfile = { ...p };
      delete updatedProfile.companyId;
      delete updatedProfile.companyRole;
      await AsyncStorage.setItem("eg-profile-v1", JSON.stringify(updatedProfile));
      await AsyncStorage.removeItem("eg-team-v2");
      return true;
    } catch {
      set({ company: null });
      return false;
    }
  },

  // ── Firma auflösen ───────────────────────────────
  dissolveCompany: async () => {
    const { company } = get();
    if (!company) return { ok: false };
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    if (!p.email) return { ok: false };
    try {
      const res = await fetchWithTimeout(
        `${BACKEND}/api/company/${company.companyId}?owner_email=${encodeURIComponent(p.email)}`,
        { method: "DELETE" }
      );
      if (!res.ok) return { ok: false };
      const data = await res.json();
      set({ company: null, invitations: [], activeUsers: {}, wsConnections: {} });
      const updatedProfile = { ...p };
      delete updatedProfile.companyId;
      delete updatedProfile.companyRole;
      await AsyncStorage.setItem("eg-profile-v1", JSON.stringify(updatedProfile));
      await AsyncStorage.removeItem("eg-team-v2");
      return { ok: true, action: data.action, newOwner: data.newOwner };
    } catch {
      return { ok: false };
    }
  },

  // ── Rolle ändern ─────────────────────────────────
  changeRole: async (targetEmail, warehouseId, newRole) => {
    const { company } = get();
    if (!company) return false;
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/company/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.companyId,
          ownerEmail: p.email,
          targetEmail,
          warehouseId,
          newRole,
        }),
      });
      if (res.ok) {
        await get().loadCompany(company.companyId, p.email);
        return true;
      }
      return false;
    } catch { return false; }
  },

  // ── Mitglied entfernen ───────────────────────────
  removeMember: async (email) => {
    const { company } = get();
    if (!company) return false;
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    try {
      const res = await fetchWithTimeout(
        `${BACKEND}/api/company/${company.companyId}/member/${encodeURIComponent(email)}?owner_email=${encodeURIComponent(p.email)}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        set(s => ({
          company: s.company ? {
            ...s.company,
            members: s.company.members.filter(m => m.email !== email),
          } : null,
        }));
        await get().loadCompany(company.companyId, p.email);
        return true;
      }
      return false;
    } catch { return false; }
  },

  // ── Einladungen prüfen ───────────────────────────
  checkInvitations: async (email) => {
    if (!email) return;
    try {
      const res = await fetchWithTimeout(`${BACKEND}/api/company/invites/${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        set({ invitations: Array.isArray(data) ? data : [] });
        get().saveTeamData();
      }
    } catch {}
  },

  // ── Lager Sync ───────────────────────────────────
  syncWarehouse: async (warehouseId, materials, tasks, activities) => {
    const { company } = get();
    if (!company) return;
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    try {
      await fetchWithTimeout(`${BACKEND}/api/company/warehouse/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.companyId,
          warehouseId,
          userEmail: p.email,
          materials,
          tasks,
          activities,
          syncedAt: new Date().toISOString(),
        }),
      });
      set(s => ({
        company: s.company ? {
          ...s.company,
          warehouses: s.company.warehouses.map(w =>
            w.warehouseId === warehouseId
              ? { ...w, materials, tasks, activities, lastSync: new Date().toISOString(), lastSyncBy: p.email }
              : w
          ),
        } : null,
      }));
      get().saveTeamData();
    } catch {}
  },

  // ── Lager laden ──────────────────────────────────
  loadWarehouse: async (warehouseId) => {
    const { company } = get();
    if (!company) return null;
    const profile = await AsyncStorage.getItem("eg-profile-v1");
    const p = profile ? JSON.parse(profile) : {};
    try {
      const res = await fetchWithTimeout(
        `${BACKEND}/api/company/${company.companyId}/warehouse/${warehouseId}?email=${encodeURIComponent(p.email)}`
      );
      if (res.ok) {
        const data = await res.json();
        set(s => ({
          company: s.company ? {
            ...s.company,
            warehouses: s.company.warehouses.map(w =>
              w.warehouseId === warehouseId ? { ...w, ...data } : w
            ),
          } : null,
        }));
        return data;
      }
      return null;
    } catch { return null; }
  },

  // ── WebSocket ────────────────────────────────────
  connectWebSocket: (warehouseId, email, name, onUpdate) => {
    intentionalDisconnects.delete(warehouseId);
    const existing = get().wsConnections[warehouseId];
    if (existing && existing.readyState === WebSocket.OPEN) return;

    const wsUrl = BACKEND.replace("https://", "wss://").replace("http://", "ws://");
    const ws = new WebSocket(
      `${wsUrl}/ws/warehouse/${warehouseId}?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`
    );

    ws.onopen = () => {
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        else clearInterval(ping);
      }, 25000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "active_users") {
          set(s => ({ activeUsers: { ...s.activeUsers, [warehouseId]: data.users } }));
        }
        onUpdate(data);
      } catch {}
    };

    ws.onclose = () => {
      set(s => {
        const updated = { ...s.wsConnections };
        delete updated[warehouseId];
        return { wsConnections: updated };
      });
      setTimeout(() => {
        // Nur reconnecten wenn intentionalDisconnects diese warehouseId nicht enthält
        if (get().company && !intentionalDisconnects.has(warehouseId)) {
          get().connectWebSocket(warehouseId, email, name, onUpdate);
        }
      }, 3000);
    };

    set(s => ({ wsConnections: { ...s.wsConnections, [warehouseId]: ws } }));
  },

  disconnectWebSocket: (warehouseId) => {
    intentionalDisconnects.add(warehouseId);
    const ws = get().wsConnections[warehouseId];
    if (ws) { try { ws.close(); } catch {} }
    set(s => {
      const updated = { ...s.wsConnections };
      delete updated[warehouseId];
      return { wsConnections: updated };
    });
  },

  sendMaterialChange: (warehouseId, materialId, qty) => {
    const ws = get().wsConnections[warehouseId];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "material_change", materialId, qty }));
    }
  },

  sendTaskChange: (warehouseId, taskId, status) => {
    const ws = get().wsConnections[warehouseId];
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "task_change", taskId, status }));
    }
  },
}));
