
import { TariffRates, BillRecord, DEFAULT_TARIFFS, User } from "../types";

// Type definition for sql.js
declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

let db: any = null;
let initPromise: Promise<void> | null = null;
const DB_STORAGE_KEY = 'utiltrack_sqlite_db';
const SCHEMA_VERSION = 2; // Incremented for User support

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
  try {
    const data = db.export();
    const str = toBase64(data);
    localStorage.setItem(DB_STORAGE_KEY, str);
  } catch (e) {
    console.error("Failed to save DB to localStorage. Quota might be exceeded.", e);
  }
};

const notifyListeners = async (userId: number) => {
  const bills = await getBills(userId);
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

    // --- Schema Migration & Setup ---

    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT
      );
    `);

    // 2. Tariffs Table (Modified to include user_id)
    // We use a trick: id will now represent user_id in the tariffs table logic, 
    // or we add a user_id column. Since sqlite alter table is limited in old versions,
    // we will check if column exists, if not add it.
    // However, simplest way for 'id=1' legacy support is to migrate it.
    
    db.run(`
      CREATE TABLE IF NOT EXISTS tariffs (
        id INTEGER PRIMARY KEY, -- We will use this as user_id
        data TEXT
      );
    `);

    // 3. Bills Table
    // Check if user_id column exists, if not add it
    try {
      db.exec("SELECT user_id FROM bills LIMIT 1");
    } catch (e) {
      // Column doesn't exist, add it
      // Create table if not exists first
      db.run(`
        CREATE TABLE IF NOT EXISTS bills (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date INTEGER,
          totalCost REAL,
          data TEXT
        );
      `);
      
      try {
        db.run("ALTER TABLE bills ADD COLUMN user_id INTEGER DEFAULT 1");
      } catch(alterErr) {
        // Ignore if already exists (double safety)
      }
    }

    // --- Seed Default User ---
    const checkUser = db.exec("SELECT count(*) FROM users WHERE email = 'on3oleg@gmail.com'");
    if (checkUser[0].values[0][0] === 0) {
      db.run("INSERT INTO users (email, password) VALUES (?, ?)", ['on3oleg@gmail.com', '123456']);
      
      // Get the ID of the new user (should be 1 usually)
      const res = db.exec("SELECT id FROM users WHERE email = 'on3oleg@gmail.com'");
      const newUserId = res[0].values[0][0];

      // Migrate existing legacy tariffs (id=1) to this user if they exist and aren't assigned
      // (This assumes single tenant legacy mode used ID 1)
      // Since tariffs table structure is "id, data", we just ensure id=newUserId exists
      const tariffCheck = db.exec(`SELECT count(*) FROM tariffs WHERE id = ${newUserId}`);
      if (tariffCheck[0].values[0][0] === 0) {
        // Copy default or legacy id=1 if user ID is different (rare case here)
         const stmt = db.prepare("INSERT INTO tariffs (id, data) VALUES (?, ?)");
         stmt.run([newUserId, JSON.stringify(DEFAULT_TARIFFS)]);
         stmt.free();
      }
    }

    persistDB();

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

// --- Auth Services ---

export const loginUser = async (email: string, password: string): Promise<User | null> => {
  await ensureInitialized();
  const stmt = db.prepare("SELECT id, email FROM users WHERE email = ? AND password = ?");
  stmt.bind([email, password]);
  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    return { id: row[0], email: row[1] } as User;
  }
  stmt.free();
  return null;
};

export const registerUser = async (email: string, password: string): Promise<User | null> => {
  await ensureInitialized();
  try {
    const stmt = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    stmt.run([email, password]);
    stmt.free();
    persistDB();
    
    // Auto-login after register
    return loginUser(email, password);
  } catch (e) {
    console.error("Registration failed", e);
    return null; // Likely email already exists
  }
};

// --- Data Services ---

export const getTariffs = async (userId: number): Promise<TariffRates | null> => {
  await ensureInitialized();
  if (!db) return null;

  try {
    const stmt = db.prepare("SELECT data FROM tariffs WHERE id = ?");
    stmt.bind([userId]);
    
    if (stmt.step()) {
      const row = stmt.get();
      stmt.free();
      return JSON.parse(row[0] as string) as TariffRates;
    }
    stmt.free();
    return DEFAULT_TARIFFS;
  } catch (e) {
    console.error("Error fetching tariffs", e);
    return DEFAULT_TARIFFS;
  }
};

export const saveTariffs = async (userId: number, rates: TariffRates): Promise<void> => {
  await ensureInitialized();
  if (!db) throw new Error("Database not initialized");

  const stmt = db.prepare("INSERT OR REPLACE INTO tariffs (id, data) VALUES (?, ?)");
  stmt.run([userId, JSON.stringify(rates)]);
  stmt.free();
  persistDB();
};

export const saveBill = async (userId: number, bill: Omit<BillRecord, 'id'>): Promise<void> => {
  await ensureInitialized();
  if (!db) throw new Error("Database not initialized");

  const timestamp = bill.date; 

  const stmt = db.prepare("INSERT INTO bills (user_id, date, totalCost, data) VALUES (?, ?, ?, ?)");
  stmt.run([userId, timestamp, bill.totalCost, JSON.stringify(bill)]);
  stmt.free();
  persistDB();
  
  notifyListeners(userId);
};

// Helper to get bills internally
const getBills = async (userId: number): Promise<BillRecord[]> => {
  await ensureInitialized();
  if (!db) return [];

  // Filter by user_id
  const stmt = db.prepare("SELECT id, data FROM bills WHERE user_id = ? ORDER BY date DESC");
  stmt.bind([userId]);
  
  const results: BillRecord[] = [];
  while(stmt.step()) {
    const row = stmt.get();
    const id = row[0].toString();
    const data = JSON.parse(row[1]);
    results.push({ ...data, id, userId });
  }
  stmt.free();
  return results;
};

export const subscribeToHistory = (userId: number, callback: (bills: BillRecord[]) => void) => {
  // Simple listener implementation. Note: In a real multi-user app with shared listeners
  // we would filter inside the listener, but here we just re-fetch.
  const wrapper = (allBills: BillRecord[]) => {
    // This receives bills from notifyListeners which calls getBills(userId)
    // So the data passed here is already correct for the user who triggered the save.
    // However, if User A saves, and we are User B, we shouldn't update UI with User A's data.
    // For this simple local-storage app, we assume single active session.
    callback(allBills);
  };

  listeners.push(wrapper);
  
  // Initial data fetch
  getBills(userId).then(callback);

  return () => {
    const index = listeners.indexOf(wrapper);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};
