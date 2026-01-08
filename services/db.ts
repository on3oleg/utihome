import localforage from 'localforage';
import { TariffRates, BillRecord, DEFAULT_TARIFFS, User, UserObject } from "../types";

// Keys for local storage
const USERS_KEY = 'utihome_users_v1';
const OBJECTS_KEY = 'utihome_objects_v1';
const SESSION_KEY = 'utihome_session_user_v1';

// Configure localforage
localforage.config({
  name: 'UtiHome',
  storeName: 'uti_store_v1'
});

// Helper to get item with fallback
const getLocal = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const val = await localforage.getItem<T>(key);
    return val !== null ? val : fallback;
  } catch (e) {
    console.error(`DB Error: Reading ${key}`, e);
    return fallback;
  }
};

// Auth
export const loginUser = async (email: string, password: string): Promise<User | null> => {
  console.log(`DB: Login attempt - ${email}`);
  const users = await getLocal<User[]>(USERS_KEY, []);
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (user) {
    console.log(`DB: Login success - Found user ID: ${user.id}`);
    return user;
  }
  
  console.warn(`DB: Login failed - User ${email} not found.`);
  return null;
};

export const registerUser = async (email: string, password: string): Promise<User | null> => {
  console.log(`DB: Registering - ${email}`);
  const users = await getLocal<User[]>(USERS_KEY, []);
  
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    console.warn(`DB: Registration failed - User ${email} exists.`);
    return null;
  }
  
  const newUser: User = { id: Date.now(), email };
  const updatedUsers = [...users, newUser];
  
  try {
    await localforage.setItem(USERS_KEY, updatedUsers);
    console.log(`DB: Registration success - Created user ID: ${newUser.id}`);
    return newUser;
  } catch (e) {
    console.error("DB: Failed to save users", e);
    throw e;
  }
};

// Objects
export const getObjects = async (userId: number): Promise<UserObject[]> => {
  const allObjects = await getLocal<UserObject[]>(OBJECTS_KEY, []);
  return allObjects.filter(o => o.userId === userId);
};

export const createObject = async (userId: number, name: string, description: string): Promise<UserObject> => {
  const allObjects = await getLocal<UserObject[]>(OBJECTS_KEY, []);
  const newObj: UserObject = { id: Date.now(), userId, name, description };
  await localforage.setItem(OBJECTS_KEY, [...allObjects, newObj]);
  await saveTariffs(newObj.id, DEFAULT_TARIFFS);
  return newObj;
};

export const updateObject = async (id: number, name: string): Promise<void> => {
  const allObjects = await getLocal<UserObject[]>(OBJECTS_KEY, []);
  const updated = allObjects.map(o => o.id === id ? { ...o, name } : o);
  await localforage.setItem(OBJECTS_KEY, updated);
};

// Data
export const getTariffs = async (objectId: number): Promise<TariffRates | null> => {
  return await getLocal<TariffRates>(`tariffs_${objectId}`, DEFAULT_TARIFFS);
};

export const saveTariffs = async (objectId: number, rates: TariffRates): Promise<void> => {
  await localforage.setItem(`tariffs_${objectId}`, rates);
};

export const saveBill = async (objectId: number, userId: number, bill: Omit<BillRecord, 'id'>): Promise<void> => {
  const history = await getLocal<BillRecord[]>(`history_${objectId}`, []);
  const newBill: BillRecord = { ...bill, id: Date.now().toString() };
  await localforage.setItem(`history_${objectId}`, [newBill, ...history]);
};

export const updateBillName = async (objectId: number, billId: string, newName: string): Promise<void> => {
  const history = await getLocal<BillRecord[]>(`history_${objectId}`, []);
  const updated = history.map(b => b.id === billId ? { ...b, name: newName } : b);
  await localforage.setItem(`history_${objectId}`, updated);
};

export const updateBillHistoryServiceName = async (objectId: number, fieldId: string, newName: string): Promise<void> => {
  const history = await getLocal<BillRecord[]>(`history_${objectId}`, []);
  const updated = history.map(bill => {
    if (!bill.customRecords) return bill;
    return {
      ...bill,
      customRecords: bill.customRecords.map(rec => 
        rec.fieldId === fieldId ? { ...rec, name: newName } : rec
      )
    };
  });
  await localforage.setItem(`history_${objectId}`, updated);
};

// History polling simulation
export const subscribeToHistory = (objectId: number, callback: (bills: BillRecord[]) => void) => {
  const fetch = async () => {
    const data = await getLocal<BillRecord[]>(`history_${objectId}`, []);
    callback(data);
  };
  fetch();
  const interval = setInterval(fetch, 2000);
  return () => clearInterval(interval);
};

// Session
export const saveSession = async (user: User): Promise<void> => {
  console.log(`DB: Saving session for ${user.email}`);
  await localforage.setItem(SESSION_KEY, { user, expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) });
};

export const restoreSession = async (): Promise<User | null> => {
  const session = await localforage.getItem<{ user: User, expiresAt: number }>(SESSION_KEY);
  if (!session || Date.now() > session.expiresAt) {
    if (session) {
      console.log("DB: Session expired, clearing.");
      await localforage.removeItem(SESSION_KEY);
    }
    return null;
  }
  console.log(`DB: Session restored for ${session.user.email}`);
  return session.user;
};

export const clearSession = async (): Promise<void> => {
  console.log("DB: Clearing session.");
  await localforage.removeItem(SESSION_KEY);
};