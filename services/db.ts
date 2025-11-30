import { TariffRates, BillRecord, DEFAULT_TARIFFS } from "../types";

// Type definition for sql.js
declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

let db: any = null;
let initPromise: Promise<void> | null = null;
const DB_STORAGE_KEY = 'utiltrack_sqlite_db';

// Observer for history changes
const listeners: ((bills: BillRecord[]) => void)[] = [];

// Base64 helpers for saving binary DB to localStorage
const toBase64 = (u8: Uint8Array): string => {
  let binary = '';
  const len = u8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
};

const fromBase64 = (str: string): Uint8Array => {
  const binaryString = atob(str);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const persistDB = () => {
  if (!db) return;
  const data = db.export();
  try {
    const str = toBase64(data);
    localStorage.setItem(DB_STORAGE_KEY, str);
  } catch (e) {
    console.error("Failed to save DB to localStorage", e);
  }
};

const notifyListeners = async () => {
  const bills = await getBills();
  listeners.forEach(cb => cb(bills));
};

const _initializeDB = async () => {
  if (db) return;

  try {
    const SQL = await window.initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    const saved = localStorage.getItem(DB_STORAGE_KEY);
    if (saved) {
      try {
        const u8 = fromBase64(saved);
        db = new SQL.Database(u8);
      } catch (e) {
        console.error("Failed to load existing DB, creating new one", e);
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }

    // Initialize Schema
    db.run(`
      CREATE TABLE IF NOT EXISTS tariffs (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT
      );
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date INTEGER,
        totalCost REAL,
        data TEXT
      );
    `);

    // Ensure default tariffs exist
    const result = db.exec("SELECT count(*) as count FROM tariffs WHERE id = 1");
    if (result[0].values[0][0] === 0) {
       const stmt = db.prepare("INSERT INTO tariffs (id, data) VALUES (1, ?)");
       stmt.run([JSON.stringify(DEFAULT_TARIFFS)]);
       stmt.free();
       persistDB();
    }

  } catch (err) {
    console.error("Failed to initialize SQLite", err);
    throw err;
  }
};

export const ensureInitialized = async () => {
  if (!initPromise) {
    initPromise = _initializeDB();
  }
  await initPromise;
};

export const getTariffs = async (): Promise<TariffRates | null> => {
  await ensureInitialized();
  if (!db) return null;

  try {
    const result = db.exec("SELECT data FROM tariffs WHERE id = 1");
    if (result.length > 0 && result[0].values.length > 0) {
      return JSON.parse(result[0].values[0][0] as string) as TariffRates;
    }
    return DEFAULT_TARIFFS;
  } catch (e) {
    console.error("Error fetching tariffs", e);
    return DEFAULT_TARIFFS;
  }
};

export const saveTariffs = async (rates: TariffRates): Promise<void> => {
  await ensureInitialized();
  if (!db) throw new Error("Database not initialized");

  const stmt = db.prepare("INSERT OR REPLACE INTO tariffs (id, data) VALUES (1, ?)");
  stmt.run([JSON.stringify(rates)]);
  stmt.free();
  persistDB();
};

export const saveBill = async (bill: Omit<BillRecord, 'id'>): Promise<void> => {
  await ensureInitialized();
  if (!db) throw new Error("Database not initialized");

  // We explicitly store the date as a timestamp in a separate column for sorting
  const timestamp = bill.date; 

  const stmt = db.prepare("INSERT INTO bills (date, totalCost, data) VALUES (?, ?, ?)");
  stmt.run([timestamp, bill.totalCost, JSON.stringify(bill)]);
  stmt.free();
  persistDB();
  
  notifyListeners();
};

const getBills = async (): Promise<BillRecord[]> => {
  await ensureInitialized();
  if (!db) return [];

  const result = db.exec("SELECT id, data FROM bills ORDER BY date DESC");
  if (result.length === 0) return [];

  return result[0].values.map((row: any[]) => {
    const id = row[0].toString();
    const data = JSON.parse(row[1]);
    return { ...data, id };
  });
};

export const subscribeToHistory = (callback: (bills: BillRecord[]) => void) => {
  listeners.push(callback);
  
  // Initial data
  getBills().then(callback);

  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};