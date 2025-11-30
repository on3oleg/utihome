
export interface TariffRates {
  electricityRate: number; // Price per kWh
  waterRate: number;       // Price per m³
  gasRate: number;         // Price per m³
  waterSubscriptionFee: number; // Fixed monthly fee
  gasDistributionFee: number;   // Fixed monthly fee
  lastReadings: {
    electricity: number;
    water: number;
    gas: number;
  };
}

export interface ConsumptionData {
  electricity: number;
  water: number;
  gas: number;
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
  date: number; // Unix timestamp (milliseconds)
  electricityConsumption: number;
  waterConsumption: number;
  gasConsumption: number;
  breakdown: CostBreakdown;
  totalCost: number;
}

export type ViewState = 'calculator' | 'history' | 'settings';

export const DEFAULT_TARIFFS: TariffRates = {
  electricityRate: 4.32,
  waterRate: 20.47,
  gasRate: 7.95,
  waterSubscriptionFee: 5.38,
  gasDistributionFee: 289.04,
  lastReadings: {
    electricity: 18329,
    water: 1224,
    gas: 12994
  }
};
