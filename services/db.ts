import localforage from 'localforage';
import { TariffRates, BillRecord, DEFAULT_TARIFFS, User, UserObject } from "../types";

const API_URL = '/api';

const getHeaders = async () => {
  const user = await restoreSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) headers['x-user-id'] = user.id.toString();
  return headers;
};

// Health Check
export const checkHealth = async (): Promise<{ status: string, database: string, error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/health`);
    return await response.json();
  } catch (e: any) {
    return { status: 'error', database: 'disconnected', error: e.message };
  }
};

// Auth
export const loginUser = async (email: string, password: string): Promise<User | null> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) { return null; }
};

export const registerUser = async (email: string, password: string): Promise<User | null> => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (e) { return null; }
};

// Objects
export const getObjects = async (userId: number): Promise<UserObject[]> => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/objects`, { headers });
    if (response.ok) return await response.json();
    return [];
  } catch (e) { return []; }
};

export const createObject = async (userId: number, name: string, description: string): Promise<UserObject> => {
  const headers = await getHeaders();
  const response = await fetch(`${API_URL}/objects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, description })
  });
  const newObj = await response.json();
  await saveTariffs(newObj.id, DEFAULT_TARIFFS);
  return newObj;
};

export const updateObject = async (id: number, name: string): Promise<void> => {
  const headers = await getHeaders();
  await fetch(`${API_URL}/objects/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name })
  });
};

// Data
export const getTariffs = async (objectId: number): Promise<TariffRates | null> => {
  try {
    const headers = await getHeaders();
    const response = await fetch(`${API_URL}/objects/${objectId}/tariffs`, { headers });
    if (response.ok) return await response.json();
    return DEFAULT_TARIFFS;
  } catch (e) { return DEFAULT_TARIFFS; }
};

export const saveTariffs = async (objectId: number, rates: TariffRates): Promise<void> => {
  const headers = await getHeaders();
  await fetch(`${API_URL}/objects/${objectId}/tariffs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rates)
  });
};

export const saveBill = async (objectId: number, userId: number, bill: Omit<BillRecord, 'id'>): Promise<void> => {
  const headers = await getHeaders();
  await fetch(`${API_URL}/objects/${objectId}/bills`, {
    method: 'POST',
    headers,
    body: JSON.stringify(bill)
  });
};

export const updateBillName = async (objectId: number, billId: string, newName: string): Promise<void> => {
  const headers = await getHeaders();
  await fetch(`${API_URL}/bills/${billId}/name`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: newName })
  });
};

export const updateBillHistoryServiceName = async (objectId: number, fieldId: string, newName: string): Promise<void> => {
  const headers = await getHeaders();
  await fetch(`${API_URL}/objects/${objectId}/bills/update-service-name`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ fieldId, newName })
  });
};

// History polling
export const subscribeToHistory = (objectId: number, callback: (bills: BillRecord[]) => void) => {
  let active = true;
  const fetchHistory = async () => {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_URL}/objects/${objectId}/bills`, { headers });
      if (response.ok && active) {
        const data = await response.json();
        callback(data);
      }
    } catch (e) { console.error(e); }
  };
  fetchHistory();
  const interval = setInterval(fetchHistory, 5000);
  return () => {
    active = false;
    clearInterval(interval);
  };
};

// Session
const SESSION_KEY = 'utihome_session_user_v1';
export const saveSession = async (user: User): Promise<void> => {
  await localforage.setItem(SESSION_KEY, { user, expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) });
};
export const restoreSession = async (): Promise<User | null> => {
  try {
    const session = await localforage.getItem<{ user: User, expiresAt: number }>(SESSION_KEY);
    if (!session || !session.user || (session.expiresAt && Date.now() > session.expiresAt)) {
      await localforage.removeItem(SESSION_KEY);
      return null;
    }
    return session.user;
  } catch (e) { return null; }
};
export const clearSession = async (): Promise<void> => {
  await localforage.removeItem(SESSION_KEY);
};