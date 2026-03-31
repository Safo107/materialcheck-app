// store.ts - ElektroGenius MaterialCheck Private Store
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "eg-materialcheck-v4";

export type Category =
  | "kabel" | "sicherung" | "steckdose" | "schalter"
  | "verteiler" | "leitung" | "werkzeug" | "sonstiges";

export type TaskPriority = "high" | "medium" | "low";
export type TaskStatus = "open" | "inprogress" | "done";

export interface Folder {
  id: number; name: string; icon: string; createdAt: string;
}

export interface Material {
  id: number; name: string; qty: number; unit: string;
  cat: Category; folderId: number; min: number; price: number;
  note: string; added: string;
  serialNumber?: string;
  warrantyDate?: string;
  supplierId?: number;
}

export interface Task {
  id: number; folderId: number; title: string; description: string;
  priority: TaskPriority; status: TaskStatus; assignedTo: string;
  dueDate: string; createdAt: string;
}

export interface Supplier {
  id: number; name: string; phone: string; email: string;
  website: string; note: string; createdAt: string;
}

export interface LoanItem {
  id: number; materialId: number; materialName: string;
  fromFolderId: number; toFolderId: number; qty: number; unit: string;
  loanDate: string; returnDate: string; returned: boolean; note: string;
}

export interface ActivityLog {
  type: "add" | "remove" | "edit" | "folder" | "move" | "task" | "loan";
  name: string; amount: string; time: string;
}

export interface StoreState {
  folders: Folder[];
  materials: Material[];
  tasks: Task[];
  suppliers: Supplier[];
  loans: LoanItem[];
  activities: ActivityLog[];
  nextMatId: number;
  nextFolderId: number;
  nextTaskId: number;
  nextSupplierId: number;
  nextLoanId: number;
  loaded: boolean;

  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;

  addFolder: (name: string, icon: string) => void;
  updateFolder: (id: number, name: string, icon: string) => void;
  deleteFolder: (id: number) => void;

  addMaterial: (m: Omit<Material, "id" | "added">) => void;
  updateMaterial: (id: number, m: Partial<Material>) => void;
  deleteMaterial: (id: number) => void;
  changeQty: (id: number, delta: number) => void;
  setQty: (id: number, qty: number) => void;
  moveMaterial: (id: number, folderId: number) => void;

  addTask: (t: Omit<Task, "id" | "createdAt">) => void;
  updateTask: (id: number, t: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  completeTask: (id: number) => void;

  addSupplier: (s: Omit<Supplier, "id" | "createdAt">) => void;
  updateSupplier: (id: number, s: Partial<Supplier>) => void;
  deleteSupplier: (id: number) => void;

  addLoan: (l: Omit<LoanItem, "id" | "loanDate" | "returned">) => void;
  returnLoan: (id: number) => void;
  deleteLoan: (id: number) => void;

  getMaterialsByFolder: (folderId: number) => Material[];
  getTasksByFolder: (folderId: number) => Task[];
  getLowStockMaterials: () => Material[];
  getTotalValue: () => number;
  getOpenLoans: () => LoanItem[];
  getExpiringWarranties: () => Material[];

  restoreFromCloud: (
    folders: Folder[],
    materials: Material[],
    tasks: Task[],
    suppliers: Supplier[],
    loans: LoanItem[]
  ) => void;
}

const DEFAULT_FOLDERS: Folder[] = [
  { id:1, name:"Wagen 1", icon:"truck", createdAt:"2025-03-15" },
  { id:2, name:"Firmen Lager", icon:"factory", createdAt:"2025-03-15" },
  { id:3, name:"Baustelle A", icon:"building", createdAt:"2025-03-15" },
];

const DEFAULT_MATERIALS: Material[] = [
  { id:1, name:"NYM-J 3x1,5mm²", qty:150, unit:"m", cat:"kabel", folderId:1, min:50, price:1.2, note:"", added:"2025-03-15" },
  { id:2, name:"NYM-J 5x1,5mm²", qty:80, unit:"m", cat:"kabel", folderId:1, min:30, price:1.8, note:"", added:"2025-03-15" },
  { id:3, name:"Sicherungsautomat B16", qty:24, unit:"Stk", cat:"sicherung", folderId:2, min:10, price:4.5, note:"", added:"2025-03-14" },
  { id:4, name:"FI-Schalter 40A/30mA", qty:4, unit:"Stk", cat:"sicherung", folderId:2, min:5, price:28.0, note:"", added:"2025-03-13" },
  { id:5, name:"Schuko-Steckdose AP", qty:32, unit:"Stk", cat:"steckdose", folderId:2, min:15, price:3.2, note:"", added:"2025-03-12" },
  { id:6, name:"Wippschalter 10A", qty:18, unit:"Stk", cat:"schalter", folderId:1, min:10, price:2.1, note:"", added:"2025-03-10" },
  { id:7, name:"H07V-K 1,5mm² gelb-grün", qty:8, unit:"m", cat:"leitung", folderId:3, min:20, price:0.6, note:"", added:"2025-03-08" },
];

function nowTime(): string {
  const n = new Date();
  return "Heute, " + n.getHours().toString().padStart(2,"0") + ":" + n.getMinutes().toString().padStart(2,"0");
}
function today(): string { return new Date().toISOString().slice(0,10); }

export const useStore = create<StoreState>((set, get) => ({
  folders: DEFAULT_FOLDERS,
  materials: DEFAULT_MATERIALS,
  tasks: [],
  suppliers: [],
  loans: [],
  activities: [],
  nextMatId: 8,
  nextFolderId: 4,
  nextTaskId: 1,
  nextSupplierId: 1,
  nextLoanId: 1,
  loaded: false,

  // ── Storage ──────────────────────────────────────
  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ ...data, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  saveToStorage: async () => {
    try {
      const {
        folders, materials, tasks, suppliers, loans, activities,
        nextMatId, nextFolderId, nextTaskId, nextSupplierId, nextLoanId,
      } = get();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        folders, materials, tasks, suppliers, loans, activities,
        nextMatId, nextFolderId, nextTaskId, nextSupplierId, nextLoanId,
      }));
    } catch {}
  },

  // ── Ordner ───────────────────────────────────────
  addFolder: (name, icon) => {
    const folder: Folder = { id: get().nextFolderId, name, icon, createdAt: today() };
    set(s => ({
      folders: [...s.folders, folder],
      nextFolderId: s.nextFolderId + 1,
    }));
    get().saveToStorage();
  },

  updateFolder: (id, name, icon) => {
    set(s => ({ folders: s.folders.map(f => f.id===id ? {...f, name, icon} : f) }));
    get().saveToStorage();
  },

  deleteFolder: (id) => {
    const firstOther = get().folders.find(f => f.id !== id);
    set(s => ({
      folders: s.folders.filter(f => f.id !== id),
      materials: s.materials.map(m => m.folderId===id ? {...m, folderId: firstOther?.id ?? m.folderId} : m),
      tasks: s.tasks.filter(t => t.folderId !== id),
    }));
    get().saveToStorage();
  },

  // ── Materialien ──────────────────────────────────
  addMaterial: (m) => {
    const material: Material = { ...m, id: get().nextMatId, added: today() };
    const log: ActivityLog = { type:"add", name:m.name, amount:`+${m.qty} ${m.unit}`, time:nowTime() };
    set(s => ({
      materials: [...s.materials, material],
      nextMatId: s.nextMatId + 1,
      activities: [log, ...s.activities].slice(0, 40),
    }));
    get().saveToStorage();
  },

  updateMaterial: (id, updates) => {
    const m = get().materials.find(x => x.id === id);
    const log: ActivityLog = { type:"edit", name:m?.name??"Material", amount:"bearbeitet", time:nowTime() };
    set(s => ({
      materials: s.materials.map(x => x.id===id ? {...x, ...updates} : x),
      activities: [log, ...s.activities].slice(0, 40),
    }));
    get().saveToStorage();
  },

  deleteMaterial: (id) => {
    const m = get().materials.find(x => x.id === id);
    const log: ActivityLog = { type:"remove", name:m?.name??"Material", amount:"gelöscht", time:nowTime() };
    set(s => ({
      materials: s.materials.filter(x => x.id !== id),
      activities: [log, ...s.activities].slice(0, 40),
    }));
    get().saveToStorage();
  },

  changeQty: (id, delta) => {
    const m = get().materials.find(x => x.id === id);
    if (!m) return;
    const newQty = Math.max(0, m.qty + delta);
    const log: ActivityLog = {
      type: delta > 0 ? "add" : "remove",
      name: m.name,
      amount: (delta > 0 ? "+" : "") + delta + " " + m.unit,
      time: nowTime(),
    };
    set(s => ({
      materials: s.materials.map(x => x.id===id ? {...x, qty:newQty} : x),
      activities: [log, ...s.activities].slice(0, 40),
    }));
    get().saveToStorage();
  },

  setQty: (id, qty) => {
    const m = get().materials.find(x => x.id === id);
    if (!m) return;
    const diff = qty - m.qty;
    const log: ActivityLog = {
      type: diff >= 0 ? "add" : "remove",
      name: m.name,
      amount: (diff >= 0 ? "+" : "") + diff + " " + m.unit,
      time: nowTime(),
    };
    set(s => ({
      materials: s.materials.map(x => x.id===id ? {...x, qty} : x),
      activities: [log, ...s.activities].slice(0, 40),
    }));
    get().saveToStorage();
  },

  moveMaterial: (id, folderId) => {
    const folder = get().folders.find(f => f.id === folderId);
    const log: ActivityLog = { type:"move", name:"Material", amount:`→ ${folder?.name??""}`, time:nowTime() };
    set(s => ({
      materials: s.materials.map(x => x.id===id ? {...x, folderId} : x),
      activities: [log, ...s.activities].slice(0, 40),
    }));
    get().saveToStorage();
  },

  // ── Aufgaben ─────────────────────────────────────
  addTask: (t) => {
    const task: Task = { ...t, id: get().nextTaskId, createdAt: today() };
    set(s => ({ tasks: [...s.tasks, task], nextTaskId: s.nextTaskId + 1 }));
    get().saveToStorage();
  },

  updateTask: (id, t) => {
    set(s => ({ tasks: s.tasks.map(x => x.id===id ? {...x, ...t} : x) }));
    get().saveToStorage();
  },

  deleteTask: (id) => {
    set(s => ({ tasks: s.tasks.filter(x => x.id !== id) }));
    get().saveToStorage();
  },

  completeTask: (id) => {
    set(s => ({ tasks: s.tasks.map(x => x.id===id ? {...x, status:"done"} : x) }));
    get().saveToStorage();
  },

  // ── Lieferanten ──────────────────────────────────
  addSupplier: (s) => {
    const supplier: Supplier = { ...s, id: get().nextSupplierId, createdAt: today() };
    set(state => ({ suppliers: [...state.suppliers, supplier], nextSupplierId: state.nextSupplierId + 1 }));
    get().saveToStorage();
  },

  updateSupplier: (id, s) => {
    set(state => ({ suppliers: state.suppliers.map(x => x.id===id ? {...x, ...s} : x) }));
    get().saveToStorage();
  },

  deleteSupplier: (id) => {
    set(s => ({ suppliers: s.suppliers.filter(x => x.id !== id) }));
    get().saveToStorage();
  },

  // ── Ausleihen ────────────────────────────────────
  addLoan: (l) => {
    const loan: LoanItem = { ...l, id: get().nextLoanId, loanDate: today(), returned: false };
    set(s => ({ loans: [...s.loans, loan], nextLoanId: s.nextLoanId + 1 }));
    get().saveToStorage();
  },

  returnLoan: (id) => {
    set(s => ({
      loans: s.loans.map(l => l.id===id ? {...l, returned:true, returnDate:today()} : l),
    }));
    get().saveToStorage();
  },

  deleteLoan: (id) => {
    set(s => ({ loans: s.loans.filter(l => l.id !== id) }));
    get().saveToStorage();
  },

  // ── Helpers ──────────────────────────────────────
  getMaterialsByFolder: (folderId) => get().materials.filter(m => m.folderId === folderId),
  getTasksByFolder: (folderId) => get().tasks.filter(t => t.folderId === folderId),
  getLowStockMaterials: () => get().materials.filter(m => m.qty < m.min),
  getTotalValue: () => get().materials.reduce((sum, m) => sum + m.qty * (m.price || 0), 0),
  getOpenLoans: () => get().loans.filter(l => !l.returned),

  getExpiringWarranties: () => {
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return get().materials.filter(m => {
      if (!m.warrantyDate) return false;
      return new Date(m.warrantyDate) <= in30Days;
    });
  },

  restoreFromCloud: (folders, materials, tasks, suppliers, loans) => {
    const maxMatId = materials.reduce((max, m) => Math.max(max, m.id), 0) + 1;
    const maxFolderId = folders.reduce((max, f) => Math.max(max, f.id), 0) + 1;
    const maxTaskId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
    set({ folders, materials, tasks, suppliers, loans, nextMatId:maxMatId, nextFolderId:maxFolderId, nextTaskId:maxTaskId });
    get().saveToStorage();
  },
}));
