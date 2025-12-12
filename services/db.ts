import localforage from 'localforage';
import { TariffRates, BillRecord, DEFAULT_TARIFFS, User, UserObject } from "../types";

// Type definition for sql.js
declare global {
  interface Window {
    initSqlJs: (config: any) => Promise<any>;
  }
}

let db: any = null;
let initPromise: Promise<void> | null = null;
const DB_STORAGE_KEY = 'utihome_db_v1'; 

// Config localforage for IndexedDB storage
localforage.config({
  name: 'UtiHome',
  storeName: 'database'
});

// Observer for history changes
const listeners: ((bills: BillRecord[]) => void)[] = [];

// Debounce helper for persistence to avoid thrashing disk
let saveTimeout: any = null;
const persistDB = () => {
  if (!db) return;
  
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    try {
      const data = db.export();
      // localforage handles Uint8Array natively
      await localforage.setItem(DB_STORAGE_KEY, data);
    } catch (e) {
      console.error("Failed to persist DB:", e);
    }
  }, 500);
};

const notifyListeners = async (objectId: number) => {
  const bills = await getBills(objectId);
  listeners.forEach(cb => cb(bills));
};

const _initializeDB = async () => {
  if (db) return;

  try {
    // Check if SQL.js script loaded
    if (typeof window.initSqlJs !== 'function') {
      throw new Error("SQL.js library not loaded. Please check your internet connection.");
    }

    const SQL = await window.initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });

    let dbInstance = null;
    try {
      // Load binary data directly from IndexedDB
      const saved = await localforage.getItem<Uint8Array>(DB_STORAGE_KEY);
      if (saved) {
        dbInstance = new SQL.Database(saved);
      }
    } catch (e) {
      console.error("Failed to load existing DB, starting fresh", e);
    }

    if (!dbInstance) {
      dbInstance = new SQL.Database();
    }
    db = dbInstance;

    // --- Schema Migration & Setup ---

    // 1. Users Table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT
      );
    `);

    // 2. Objects Table
    db.run(`
      CREATE TABLE IF NOT EXISTS objects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        description TEXT
      );
    `);

    // 3. Tariffs Table
    db.run(`
      CREATE TABLE IF NOT EXISTS tariffs (
        id INTEGER PRIMARY KEY,
        data TEXT
      );
    `);

    // 4. Bills Table
    db.run(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        object_id INTEGER,
        date INTEGER,
        totalCost REAL,
        data TEXT
      );
    `);
    
    // Ensure object_id column exists (migration for older versions)
    try {
      db.exec("SELECT object_id FROM bills LIMIT 1");
    } catch (e) {
      try {
        db.run("ALTER TABLE bills ADD COLUMN object_id INTEGER");
      } catch(alterErr) {
        // Ignore if already exists
      }
    }

    // --- Seed Default User & Migration Logic ---
    // Use INSERT OR IGNORE to avoid constraint errors on reload
    db.run("INSERT OR IGNORE INTO users (id, email, password) VALUES (1, 'on3oleg@gmail.com', '123456')");

    // --- Specific Migration for on3oleg@gmail.com ---
    const userRes = db.exec("SELECT id FROM users WHERE email = 'on3oleg@gmail.com'");
    if (userRes.length > 0) {
      const userId = userRes[0].values[0][0] as number;

      // Check if objects exist for this user
      const objCheck = db.exec(`SELECT count(*) FROM objects WHERE user_id = ${userId}`);
      const objCount = objCheck[0].values[0][0] as number;

      if (objCount === 0) {
        console.log("Migrating on3oleg data to new objects...");

        // 1. Retrieve existing tariff data if any
        let existingTariffs = DEFAULT_TARIFFS;
        try {
            const oldTariffStmt = db.prepare("SELECT data FROM tariffs WHERE id = ?");
            oldTariffStmt.bind([userId]);
            if (oldTariffStmt.step()) {
               const raw = oldTariffStmt.get()[0];
               if (typeof raw === 'string') existingTariffs = JSON.parse(raw);
            }
            oldTariffStmt.free();
        } catch(e) { /* ignore */ }

        // 2. Create "Home Bucha"
        db.run("INSERT INTO objects (user_id, name, description) VALUES (?, ?, ?)", [userId, "Home Bucha", "Primary Residence"]);
        const buchaIdRes = db.exec("SELECT last_insert_rowid()");
        const buchaId = buchaIdRes[0].values[0][0] as number;

        // 3. Create "Home KR"
        db.run("INSERT INTO objects (user_id, name, description) VALUES (?, ?, ?)", [userId, "Home KR", "Secondary Residence"]);
        const krIdRes = db.exec("SELECT last_insert_rowid()");
        const krId = krIdRes[0].values[0][0] as number;

        // 4. Copy rates to both objects using INSERT OR REPLACE
        const insertRate = db.prepare("INSERT OR REPLACE INTO tariffs (id, data) VALUES (?, ?)");
        const rateString = JSON.stringify(existingTariffs);
        
        insertRate.run([buchaId, rateString]);
        insertRate.run([krId, rateString]); 
        insertRate.free();

        // 5. Update any existing bills to link to the first object
        db.run(`UPDATE bills SET object_id = ${buchaId} WHERE user_id = ${userId} AND (object_id IS NULL OR object_id = 0)`);
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
  
  // Safety check: if db is still null (rare race condition), try once more
  if (!db) {
      initPromise = _initializeDB();
      await initPromise;
  }
};

// --- Auth Services ---

export const loginUser = async (email: string, password: string): Promise<User | null> => {
  await ensureInitialized();
  if (!db) return null;
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
    return loginUser(email, password);
  } catch (e) {
    console.error("Registration failed", e);
    return null; 
  }
};

// --- Object Services ---

export const getObjects = async (userId: number): Promise<UserObject[]> => {
  await ensureInitialized();
  if (!db) return [];
  
  const stmt = db.prepare("SELECT id, user_id, name, description FROM objects WHERE user_id = ?");
  stmt.bind([userId]);
  
  const results: UserObject[] = [];
  while(stmt.step()) {
    const row = stmt.get();
    results.push({
      id: row[0],
      userId: row[1],
      name: row[2],
      description: row[3]
    });
  }
  stmt.free();
  return results;
};

export const createObject = async (userId: number, name: string, description: string): Promise<UserObject> => {
  await ensureInitialized();
  if (!db) throw new Error("DB not init");

  const stmt = db.prepare("INSERT INTO objects (user_id, name, description) VALUES (?, ?, ?)");
  stmt.run([userId, name, description]);
  stmt.free();
  
  const idRes = db.exec("SELECT last_insert_rowid()");
  const newId = idRes[0].values[0][0];

  // Initialize with default tariffs
  const rateStmt = db.prepare("INSERT INTO tariffs (id, data) VALUES (?, ?)");
  rateStmt.run([newId, JSON.stringify(DEFAULT_TARIFFS)]);
  rateStmt.free();

  persistDB();

  return { id: newId, userId, name, description };
};

// --- Data Services (Scoped by Object ID) ---

export const getTariffs = async (objectId: number): Promise<TariffRates | null> => {
  await ensureInitialized();
  if (!db) return null;

  try {
    const stmt = db.prepare("SELECT data FROM tariffs WHERE id = ?");
    stmt.bind([objectId]);
    
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

export const saveTariffs = async (objectId: number, rates: TariffRates): Promise<void> => {
  await ensureInitialized();
  if (!db) throw new Error("Database not initialized");

  const stmt = db.prepare("INSERT OR REPLACE INTO tariffs (id, data) VALUES (?, ?)");
  stmt.run([objectId, JSON.stringify(rates)]);
  stmt.free();
  persistDB();
};

export const saveBill = async (objectId: number, userId: number, bill: Omit<BillRecord, 'id'>): Promise<void> => {
  await ensureInitialized();
  if (!db) throw new Error("Database not initialized");

  const timestamp = bill.date; 
  const billWithObject = { ...bill, objectId };

  const stmt = db.prepare("INSERT INTO bills (user_id, object_id, date, totalCost, data) VALUES (?, ?, ?, ?, ?)");
  stmt.run([userId, objectId, timestamp, bill.totalCost, JSON.stringify(billWithObject)]);
  stmt.free();
  persistDB();
  
  notifyListeners(objectId);
};

// Helper to get bills internally
const getBills = async (objectId: number): Promise<BillRecord[]> => {
  await ensureInitialized();
  if (!db) return [];

  const stmt = db.prepare("SELECT id, data FROM bills WHERE object_id = ? ORDER BY date DESC");
  stmt.bind([objectId]);
  
  const results: BillRecord[] = [];
  while(stmt.step()) {
    const row = stmt.get();
    const id = row[0].toString();
    const data = JSON.parse(row[1]);
    results.push({ ...data, id });
  }
  stmt.free();
  return results;
};

export const subscribeToHistory = (objectId: number, callback: (bills: BillRecord[]) => void) => {
  const wrapper = (allBills: BillRecord[]) => {
    callback(allBills);
  };

  listeners.push(wrapper);
  getBills(objectId).then(callback);

  return () => {
    const index = listeners.indexOf(wrapper);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

// --- Session Services (Persist Login) ---

const SESSION_KEY = 'utihome_session_user_v1';

export const saveSession = async (user: User): Promise<void> => {
  try {
    // Save user session with expiration
    await localforage.setItem(SESSION_KEY, {
      user,
      createdAt: Date.now(),
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 365 days
    });
  } catch (e) {
    console.error("Failed to save session", e);
  }
};

export const restoreSession = async (): Promise<User | null> => {
  try {
    const session = await localforage.getItem<{ user: User, expiresAt: number }>(SESSION_KEY);
    if (!session || !session.user) return null;
    
    // Check expiration
    if (session.expiresAt && Date.now() > session.expiresAt) {
      await localforage.removeItem(SESSION_KEY);
      return null;
    }
    
    return session.user;
  } catch (e) {
    console.error("Failed to restore session", e);
    return null;
  }
};

export const clearSession = async (): Promise<void> => {
  await localforage.removeItem(SESSION_KEY);
};