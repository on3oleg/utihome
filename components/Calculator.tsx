
import React, { useState, useEffect } from 'react';
import { TariffRates, ConsumptionData, CostBreakdown, DEFAULT_TARIFFS, User } from '../types';
import { getTariffs, saveBill, saveTariffs } from '../services/db';
import { Zap, Droplets, Flame, Save, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

interface CalculatorProps {
  user: User;
  onSaved: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ user, onSaved }) => {
  const [rates, setRates] = useState<TariffRates>(DEFAULT_TARIFFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We now track Current Readings input by user
  const [currentReadings, setCurrentReadings] = useState({
    electricity: '',
    water: '',
    gas: '',
  });

  // Calculated consumption based on (Current - Previous)
  const [consumption, setConsumption] = useState<ConsumptionData>({
    electricity: 0,
    water: 0,
    gas: 0,
  });

  const [breakdown, setBreakdown] = useState<CostBreakdown>({
    electricityCost: 0,
    waterCost: 0,
    waterSubscriptionFee: 0,
    gasCost: 0,
    gasDistributionFee: 0,
  });

  const [totalCost, setTotalCost] = useState(0);

  // Helper to ensure values are numbers
  const safeNumber = (val: any, fallback: number = 0): number => {
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  // Load tariffs and last readings on mount or user change
  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const data = await getTariffs(user.id);
        if (data) {
          // Ensure structure compatibility if old data exists and force types to Number
          const mergedData: TariffRates = {
            electricityRate: safeNumber(data.electricityRate, DEFAULT_TARIFFS.electricityRate),
            waterRate: safeNumber(data.waterRate, DEFAULT_TARIFFS.waterRate),
            gasRate: safeNumber(data.gasRate, DEFAULT_TARIFFS.gasRate),
            // Load fixed fees or default
            waterSubscriptionFee: safeNumber(data.waterSubscriptionFee, DEFAULT_TARIFFS.waterSubscriptionFee),
            gasDistributionFee: safeNumber(data.gasDistributionFee, DEFAULT_TARIFFS.gasDistributionFee),
            
            lastReadings: {
              electricity: safeNumber(data.lastReadings?.electricity, DEFAULT_TARIFFS.lastReadings.electricity),
              water: safeNumber(data.lastReadings?.water, DEFAULT_TARIFFS.lastReadings.water),
              gas: safeNumber(data.lastReadings?.gas, DEFAULT_TARIFFS.lastReadings.gas),
            }
          };
          setRates(mergedData);
        }
      } catch (err) {
        console.error("Error loading tariffs:", err);
        setError("Failed to load tariff rates from database.");
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, [user.id]);

  // Calculate consumption and costs
  useEffect(() => {
    // Parse inputs or default to 0
    const currElec = parseFloat(currentReadings.electricity);
    const currWater = parseFloat(currentReadings.water);
    const currGas = parseFloat(currentReadings.gas);

    // Calculate consumption: Current - Previous
    const elecCons = !isNaN(currElec) ? Math.max(0, currElec - rates.lastReadings.electricity) : 0;
    const waterCons = !isNaN(currWater) ? Math.max(0, currWater - rates.lastReadings.water) : 0;
    const gasCons = !isNaN(currGas) ? Math.max(0, currGas - rates.lastReadings.gas) : 0;

    setConsumption({
      electricity: elecCons,
      water: waterCons,
      gas: gasCons
    });

    const elecCost = elecCons * rates.electricityRate;
    const waterCost = waterCons * rates.waterRate;
    const gasCost = gasCons * rates.gasRate;

    // Add fixed fees
    const waterFixed = rates.waterSubscriptionFee;
    const gasFixed = rates.gasDistributionFee;

    setBreakdown({
      electricityCost: elecCost,
      waterCost: waterCost,
      waterSubscriptionFee: waterFixed,
      gasCost: gasCost,
      gasDistributionFee: gasFixed
    });

    setTotalCost(elecCost + waterCost + waterFixed + gasCost + gasFixed);
  }, [currentReadings, rates]);

  const handleInputChange = (field: keyof typeof currentReadings, value: string) => {
    setCurrentReadings(prev => ({ ...prev, [field]: value }));
    setError(null); // Clear error on edit
  };

  const handleSave = async () => {
    if (totalCost === 0 && consumption.electricity === 0 && consumption.water === 0 && consumption.gas === 0) {
      return; 
    }

    setSaving(true);
    setError(null);

    try {
      const billData = {
        date: Date.now(),
        electricityConsumption: safeNumber(consumption.electricity),
        waterConsumption: safeNumber(consumption.water),
        gasConsumption: safeNumber(consumption.gas),
        breakdown: {
          electricityCost: safeNumber(breakdown.electricityCost),
          waterCost: safeNumber(breakdown.waterCost),
          waterSubscriptionFee: safeNumber(breakdown.waterSubscriptionFee),
          gasCost: safeNumber(breakdown.gasCost),
          gasDistributionFee: safeNumber(breakdown.gasDistributionFee),
        },
        totalCost: safeNumber(totalCost)
      };

      await saveBill(user.id, billData);

      const newReadings = {
        electricity: currentReadings.electricity ? safeNumber(currentReadings.electricity) : rates.lastReadings.electricity,
        water: currentReadings.water ? safeNumber(currentReadings.water) : rates.lastReadings.water,
        gas: currentReadings.gas ? safeNumber(currentReadings.gas) : rates.lastReadings.gas,
      };

      const newRates = {
        ...rates,
        lastReadings: newReadings
      };

      await saveTariffs(user.id, newRates);
      
      setRates(newRates);
      setCurrentReadings({ electricity: '', water: '', gas: '' });
      onSaved();
    } catch (err: any) {
      console.error("Save failed:", err);
      setError(err?.message || "Failed to save bill. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasMissingRates = rates.electricityRate === 0 && rates.waterRate === 0 && rates.gasRate === 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {(error || hasMissingRates) && (
        <div className={`border-l-4 p-4 rounded-md shadow-sm ${error ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
          <div className="flex">
            <AlertCircle className={`h-5 w-5 ${error ? 'text-red-500' : 'text-amber-500'}`} />
            <div className="ml-3">
              <p className={`text-sm ${error ? 'text-red-700' : 'text-amber-700'}`}>
                {error || "Your tariff rates are set to 0. Please update rates in Settings."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inputs Section */}
      <div className="grid grid-cols-1 gap-4">
        
        {/* Electricity */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-2">
               <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Electricity</h3>
                <p className="text-xs text-slate-400">Rate: {formatCurrency(rates.electricityRate)} /kWh</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-xs font-semibold text-slate-500 uppercase">Prev Reading</p>
               <p className="font-mono text-slate-700">{rates.lastReadings.electricity}</p>
            </div>
          </div>
          
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Current Reading</label>
              <input
                type="number"
                min={rates.lastReadings.electricity}
                step="1"
                value={currentReadings.electricity}
                onChange={(e) => handleInputChange('electricity', e.target.value)}
                placeholder={rates.lastReadings.electricity.toString()}
                className="block w-full text-xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none border-b-2 border-slate-100 focus:border-blue-500 transition-colors bg-transparent pb-1"
              />
            </div>
            <div className="pb-2">
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
            <div className="flex-1 text-right pb-2">
               <span className="block text-xs font-medium text-slate-500 mb-1">Usage</span>
               <span className={`text-xl font-bold ${consumption.electricity > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                 {consumption.electricity.toLocaleString()} <span className="text-sm font-normal text-slate-400">kWh</span>
               </span>
            </div>
          </div>
        </div>

        {/* Water */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative transition-all hover:shadow-md">
           <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-2">
               <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Water</h3>
                <p className="text-xs text-slate-400">
                  Rate: {formatCurrency(rates.waterRate)} /m³ <br/>
                  <span className="text-slate-400">Fixed: {formatCurrency(rates.waterSubscriptionFee)}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-xs font-semibold text-slate-500 uppercase">Prev Reading</p>
               <p className="font-mono text-slate-700">{rates.lastReadings.water}</p>
            </div>
          </div>
          
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Current Reading</label>
              <input
                type="number"
                min={rates.lastReadings.water}
                step="1"
                value={currentReadings.water}
                onChange={(e) => handleInputChange('water', e.target.value)}
                placeholder={rates.lastReadings.water.toString()}
                className="block w-full text-xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none border-b-2 border-slate-100 focus:border-cyan-500 transition-colors bg-transparent pb-1"
              />
            </div>
             <div className="pb-2">
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
            <div className="flex-1 text-right pb-2">
               <span className="block text-xs font-medium text-slate-500 mb-1">Usage</span>
               <span className={`text-xl font-bold ${consumption.water > 0 ? 'text-cyan-600' : 'text-slate-300'}`}>
                 {consumption.water.toLocaleString()} <span className="text-sm font-normal text-slate-400">m³</span>
               </span>
            </div>
          </div>
        </div>

        {/* Gas */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 relative transition-all hover:shadow-md">
           <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-2">
               <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-700">Gas</h3>
                <p className="text-xs text-slate-400">
                  Rate: {formatCurrency(rates.gasRate)} /m³ <br/>
                  <span className="text-slate-400">Fixed: {formatCurrency(rates.gasDistributionFee)}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-xs font-semibold text-slate-500 uppercase">Prev Reading</p>
               <p className="font-mono text-slate-700">{rates.lastReadings.gas}</p>
            </div>
          </div>
          
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Current Reading</label>
              <input
                type="number"
                min={rates.lastReadings.gas}
                step="1"
                value={currentReadings.gas}
                onChange={(e) => handleInputChange('gas', e.target.value)}
                placeholder={rates.lastReadings.gas.toString()}
                className="block w-full text-xl font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none border-b-2 border-slate-100 focus:border-orange-500 transition-colors bg-transparent pb-1"
              />
            </div>
             <div className="pb-2">
              <ArrowRight className="h-4 w-4 text-slate-300" />
            </div>
            <div className="flex-1 text-right pb-2">
               <span className="block text-xs font-medium text-slate-500 mb-1">Usage</span>
               <span className={`text-xl font-bold ${consumption.gas > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
                 {consumption.gas.toLocaleString()} <span className="text-sm font-normal text-slate-400">m³</span>
               </span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Estimated Bill</h2>
          <div className="mt-2 flex items-baseline">
            <span className="text-4xl font-extrabold text-slate-900">
              {formatCurrency(totalCost)}
            </span>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center text-slate-600">
              <Zap className="h-4 w-4 mr-2 text-blue-500" /> Electricity
            </div>
            <span className="font-medium text-slate-900">
              {formatCurrency(breakdown.electricityCost)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
             <div className="flex items-center text-slate-600">
              <Droplets className="h-4 w-4 mr-2 text-cyan-500" /> Water
              <span className="ml-1 text-xs text-slate-400">(incl. fixed {formatCurrency(breakdown.waterSubscriptionFee)})</span>
            </div>
            <span className="font-medium text-slate-900">
              {formatCurrency(breakdown.waterCost + breakdown.waterSubscriptionFee)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
             <div className="flex items-center text-slate-600">
              <Flame className="h-4 w-4 mr-2 text-orange-500" /> Gas
              <span className="ml-1 text-xs text-slate-400">(incl. fixed {formatCurrency(breakdown.gasDistributionFee)})</span>
            </div>
            <span className="font-medium text-slate-900">
              {formatCurrency(breakdown.gasCost + breakdown.gasDistributionFee)}
            </span>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving || totalCost <= 0}
            className={`w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl text-sm font-bold shadow-md transition-all
              ${saving || totalCost <= 0 
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
              }`}
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Bill & Update Readings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
