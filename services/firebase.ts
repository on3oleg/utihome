// This service is deprecated.
// The application has migrated to a PostgreSQL backend provided by Aiven.
// See services/db.ts for the current implementation.

import { TariffRates, BillRecord } from "../types";

export const ensureInitialized = async () => {
  console.warn("Firebase service is deprecated");
};

export const getTariffs = async (): Promise<TariffRates | null> => {
  return null;
};

export const saveTariffs = async (rates: TariffRates): Promise<void> => {
  console.warn("Firebase service is deprecated");
};

export const saveBill = async (bill: Omit<BillRecord, 'id'>): Promise<void> => {
  console.warn("Firebase service is deprecated");
};

export const subscribeToHistory = (callback: (bills: BillRecord[]) => void) => {
  return () => {};
};
