
export interface User {
  id: number;
  email: string;
}

export interface UserObject {
  id: number;
  userId: number;
  name: string;
  description: string;
}

export interface CustomFieldConfig {
  id: string;
  name: string;
  type: 'rate' | 'fee'; // 'rate' = metered (per unit), 'fee' = fixed monthly
  unit?: string; // e.g. 'kWh', 'm3' - only for rates
  price: number;
}

export interface TariffRates {
  electricityRate: number; // Price per kWh
  waterRate: number;       // Price per m³
  gasRate: number;         // Price per m³
  waterSubscriptionFee: number; // Fixed monthly fee
  gasDistributionFee: number;   // Fixed monthly fee
  customFields: CustomFieldConfig[];
  lastReadings: {
    electricity: number;
    water: number;
    gas: number;
    [key: string]: number; // Allow dynamic keys for custom field IDs
  };
}

export interface ConsumptionData {
  electricity: number;
  water: number;
  gas: number;
}

export interface CustomBillRecord {
  fieldId: string;
  name: string;
  type: 'rate' | 'fee';
  unit?: string;
  consumption?: number;
  cost: number;
}

export interface CostBreakdown {
  electricityCost: number;
  waterCost: number;
  waterSubscriptionFee: number;
  gasCost: number;
  gasDistributionFee: number;
}

export interface BillRecord {
  id?: string;
  userId?: number;
  objectId?: number; 
  date: number; // Unix timestamp (milliseconds)
  name?: string; // User defined name for the bill
  electricityConsumption: number;
  waterConsumption: number;
  gasConsumption: number;
  breakdown: CostBreakdown;
  customRecords?: CustomBillRecord[]; // New field for custom items
  totalCost: number;
}

export type ViewState = 'calculator' | 'history' | 'settings' | 'profile';

export const LEGACY_TARIFFS: TariffRates = {
  electricityRate: 4.32,
  waterRate: 20.47,
  gasRate: 7.95,
  waterSubscriptionFee: 5.38,
  gasDistributionFee: 289.04,
  customFields: [],
  lastReadings: {
    electricity: 18329,
    water: 1224,
    gas: 12994
  }
};

export const DEFAULT_TARIFFS: TariffRates = {
  electricityRate: 0,
  waterRate: 0,
  gasRate: 0,
  waterSubscriptionFee: 0,
  gasDistributionFee: 0,
  customFields: [],
  lastReadings: {
    electricity: 0,
    water: 0,
    gas: 0
  }
};