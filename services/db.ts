
import { TariffRates, BillRecord, DEFAULT_TARIFFS, User, UserObject } from "../types";

const API_BASE = '/api';

const getHeaders = (userId?: number) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) {
    headers['x-user-id'] = userId.toString();
  }
  return headers;
};

// Auth
export const loginUser = async (email: string, password: string): Promise<User | null> => {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("API Login Error", e);
    return null;
  }
};

export const registerUser = async (email: string, password: string): Promise<User | null> => {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("API Register Error", e);
    return null;
  }
};

// Objects
export const getObjects = async (userId: number): Promise<UserObject[]> => {
  try {
    const res = await fetch(`${API_BASE}/objects`, {
      headers: getHeaders(userId)
    });
    return await res.json();
  } catch (e) {
    console.error("API Fetch Objects Error", e);
    return [];
  }
};

export const createObject = async (userId: number, name: string, description: string): Promise<UserObject> => {
  const res = await fetch(`${API_BASE}/objects`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify({ name, description })
  });
  return await res.json();
};

export const updateObject = async (id: number, name: string): Promise<void> => {
  const userId = JSON.parse(localStorage.getItem('utihome_user') || '{}').id;
  await fetch(`${API_BASE}/objects/${id}`, {
    method: 'PUT',
    headers: getHeaders(userId),
    body: JSON.stringify({ name })
  });
};

// Tariffs
export const getTariffs = async (objectId: number): Promise<TariffRates | null> => {
  try {
    const res = await fetch(`${API_BASE}/objects/${objectId}/tariffs`);
    const data = await res.json();
    return data || DEFAULT_TARIFFS;
  } catch (e) {
    return DEFAULT_TARIFFS;
  }
};

export const saveTariffs = async (objectId: number, rates: TariffRates): Promise<void> => {
  await fetch(`${API_BASE}/objects/${objectId}/tariffs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(rates)
  });
};

// Bills
export const saveBill = async (objectId: number, userId: number, bill: Omit<BillRecord, 'id'>): Promise<void> => {
  await fetch(`${API_BASE}/objects/${objectId}/bills`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: JSON.stringify(bill)
  });
};

export const updateBillName = async (objectId: number, billId: string, newName: string): Promise<void> => {
  const userId = JSON.parse(localStorage.getItem('utihome_user') || '{}').id;
  await fetch(`${API_BASE}/bills/${billId}/name`, {
    method: 'PUT',
    headers: getHeaders(userId),
    body: JSON.stringify({ name: newName })
  });
};

export const updateBillHistoryServiceName = async (objectId: number, fieldId: string, newName: string): Promise<void> => {
  const userId = JSON.parse(localStorage.getItem('utihome_user') || '{}').id;
  await fetch(`${API_BASE}/objects/${objectId}/bills/update-service-name`, {
    method: 'PUT',
    headers: getHeaders(userId),
    body: JSON.stringify({ fieldId, newName })
  });
};

// History polling
export const subscribeToHistory = (objectId: number, callback: (bills: BillRecord[]) => void) => {
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/objects/${objectId}/bills`);
      const data = await res.json();
      callback(data);
    } catch (e) {
      console.error("History fetch error", e);
    }
  };
  fetchHistory();
  const interval = setInterval(fetchHistory, 5000);
  return () => clearInterval(interval);
};

// Session
export const saveSession = (user: User): void => {
  localStorage.setItem('utihome_user', JSON.stringify(user));
};

export const restoreSession = async (): Promise<User | null> => {
  const userStr = localStorage.getItem('utihome_user');
  if (!userStr) return null;
  return JSON.parse(userStr);
};

export const clearSession = (): void => {
  localStorage.removeItem('utihome_user');
};
