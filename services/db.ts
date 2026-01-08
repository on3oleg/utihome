import localforage from 'localforage';
import { TariffRates, BillRecord, DEFAULT_TARIFFS, User, UserObject } from "../types";

// Keys for local storage
const USERS_KEY = 'utihome_users_v1';
const OBJECTS_KEY = 'utihome_objects_v1';
const SESSION_KEY = 'utihome_session_user_v1';

// Helper to get item with fallback
const getLocal = async <T>(key: string, fallback: T): Promise<T> => {
  const val = await localforage.getItem<T>(key);
  return val !== null ? val : fallback;
};

// Health Check (Always healthy now since it's local)
export const checkHealth = async (): Promise<{ status: string, database: string }> => {
  return { status: 'ok', database: 'connected (local)' };
};

// Auth
export const loginUser = async (email: string, password: string): Promise<User | null> => {
  const users = await getLocal<User[]>(USERS_KEY, []);
  const user = users.find(u => u.email === email);
  // Simple simulation: in a real local-only app, we just check if exists
  if (user) return user;
  return null;
};

export const registerUser = async (email: string, password: string): Promise<User | null> => {
  const users = await getLocal<User[]>(USERS_KEY, []);
  if (users.find(u => u.email === email)) return null;
  
  const newUser: User = { id: Date.now(), email };
  await localforage.setItem(USERS_KEY, [...users, newUser]);
  return newUser;
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
  await localforage.setItem(SESSION_KEY, { user, expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) });
};

export const restoreSession = async (): Promise<User | null> => {
  const session = await localforage.getItem<{ user: User, expiresAt: number }>(SESSION_KEY);
  if (!session || Date.now() > session.expiresAt) {
    await localforage.removeItem(SESSION_KEY);
    return null;
  }
  return session.user;
};

export const clearSession = async (): Promise<void> => {
  await localforage.removeItem(SESSION_KEY);
};