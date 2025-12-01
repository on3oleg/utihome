import React, { useState, useEffect } from 'react';
import { TariffRates, ConsumptionData, CostBreakdown, DEFAULT_TARIFFS, User, UserObject, CustomBillRecord } from '../types';
import { getTariffs, saveBill, saveTariffs } from '../services/db';
import { Zap, Droplets, Flame, Save, Loader2, AlertCircle, ArrowRight, Layers, BoxSelect, CheckCircle2, Pencil } from 'lucide-react';
import { useLanguage } from '../i18n';

interface CalculatorProps {
  user: User;
  currentObject: UserObject;
  onSaved: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ user, currentObject, onSaved }) => {
  const [rates, setRates] = useState<TariffRates>(DEFAULT_TARIFFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  // Standard Readings Inputs
  const [currentReadings, setCurrentReadings] = useState({
    electricity: '',
    water: '',
    gas: '',
  });

  // Editable Fixed Fees State
  const [fixedFees, setFixedFees] = useState({
    water: '',
    gas: '',
  });

  // Custom Readings Inputs (Dynamic key: fieldId -> value string)
  const [customReadings, setCustomReadings] = useState<Record<string, string>>({});
  
  // Custom Fixed Fee Overrides (Dynamic key: fieldId -> value string)
  const [customFeeOverrides, setCustomFeeOverrides] = useState<Record<string, string>>({});

  // Calculated Consumption
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

  // New State for calculated custom records
  const [customBillRecords, setCustomBillRecords] = useState<CustomBillRecord[]>([]);

  const [totalCost, setTotalCost] = useState(0);

  const safeNumber = (val: any, fallback: number = 0): number => {
    const num = Number(val);
    return isNaN(num) ? fallback : num;
  };

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const data = await getTariffs(currentObject.id);
        if (data) {
          const mergedData: TariffRates = {
            electricityRate: safeNumber(data.electricityRate, DEFAULT_TARIFFS.electricityRate),
            waterRate: safeNumber(data.waterRate, DEFAULT_TARIFFS.waterRate),
            gasRate: safeNumber(data.gasRate, DEFAULT_TARIFFS.gasRate),
            waterSubscriptionFee: safeNumber(data.waterSubscriptionFee, DEFAULT_TARIFFS.waterSubscriptionFee),
            gasDistributionFee: safeNumber(data.gasDistributionFee, DEFAULT_TARIFFS.gasDistributionFee),
            customFields: data.customFields || [],
            lastReadings: {
              electricity: safeNumber(data.lastReadings?.electricity, DEFAULT_TARIFFS.lastReadings.electricity),
              water: safeNumber(data.lastReadings?.water, DEFAULT_TARIFFS.lastReadings.water),
              gas: safeNumber(data.lastReadings?.gas, DEFAULT_TARIFFS.lastReadings.gas),
              ...(data.lastReadings || {}) // Include dynamic readings
            }
          };
          setRates(mergedData);
          
          // Initialize Inputs
          setCurrentReadings({ electricity: '', water: '', gas: '' });
          setFixedFees({
            water: mergedData.waterSubscriptionFee.toString(),
            gas: mergedData.gasDistributionFee.toString()
          });
          
          // Initialize Custom inputs
          setCustomReadings({});
          const initialCustomFees: Record<string, string> = {};
          mergedData.customFields.forEach(f => {
            if (f.type === 'fee') initialCustomFees[f.id] = f.price.toString();
          });
          setCustomFeeOverrides(initialCustomFees);
        }
      } catch (err) {
        console.error("Error loading tariffs:", err);
        setError(t.calculator.loadError);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, [currentObject.id, t.calculator.loadError]);

  useEffect(() => {
    // 1. Calculate Standard Utilities
    const currElec = parseFloat(currentReadings.electricity);
    const currWater = parseFloat(currentReadings.water);
    const currGas = parseFloat(currentReadings.gas);

    const elecCons = !isNaN(currElec) ? Math.max(0, currElec - rates.lastReadings.electricity) : 0;
    const waterCons = !isNaN(currWater) ? Math.max(0, currWater - rates.lastReadings.water) : 0;
    const gasCons = !isNaN(currGas) ? Math.max(0, currGas - rates.lastReadings.gas) : 0;

    setConsumption({ electricity: elecCons, water: waterCons, gas: gasCons });

    const elecCost = elecCons * rates.electricityRate;
    const waterCost = waterCons * rates.waterRate;
    const gasCost = gasCons * rates.gasRate;
    
    // Use editable fixed fees
    const waterFixed = parseFloat(fixedFees.water) || 0;
    const gasFixed = parseFloat(fixedFees.gas) || 0;

    setBreakdown({
      electricityCost: elecCost,
      waterCost: waterCost,
      waterSubscriptionFee: waterFixed,
      gasCost: gasCost,
      gasDistributionFee: gasFixed
    });

    // 2. Calculate Custom Fields
    let customTotal = 0;
    const records: CustomBillRecord[] = [];

    rates.customFields.forEach(field => {
      let cost = 0;
      let cons = 0;

      if (field.type === 'fee') {
        // Use editable custom fee
        cost = parseFloat(customFeeOverrides[field.id]) || 0;
        records.push({
          fieldId: field.id,
          name: field.name,
          type: 'fee',
          cost
        });
      } else if (field.type === 'rate') {
        const currVal = parseFloat(customReadings[field.id]);
        const prevVal = rates.lastReadings[field.id] || 0;
        cons = !isNaN(currVal) ? Math.max(0, currVal - prevVal) : 0;
        cost = cons * field.price;
        records.push({
          fieldId: field.id,
          name: field.name,
          type: 'rate',
          unit: field.unit,
          consumption: cons,
          cost
        });
      }
      customTotal += cost;
    });

    setCustomBillRecords(records);
    setTotalCost(elecCost + waterCost + waterFixed + gasCost + gasFixed + customTotal);

  }, [currentReadings, customReadings, fixedFees, customFeeOverrides, rates]);

  const handleInputChange = (field: keyof typeof currentReadings, value: string) => {
    setCurrentReadings(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleFixedFeeChange = (field: keyof typeof fixedFees, value: string) => {
    setFixedFees(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomReadingChange = (id: string, value: string) => {
    setCustomReadings(prev => ({ ...prev, [id]: value }));
  };

  const handleCustomFeeOverrideChange = (id: string, value: string) => {
    setCustomFeeOverrides(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (totalCost === 0 && consumption.electricity === 0) return;

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
        customRecords: customBillRecords,
        totalCost: safeNumber(totalCost)
      };

      await saveBill(currentObject.id, user.id, billData);

      // Update Readings (Standard)
      const newReadings: any = {
        electricity: currentReadings.electricity ? safeNumber(currentReadings.electricity) : rates.lastReadings.electricity,
        water: currentReadings.water ? safeNumber(currentReadings.water) : rates.lastReadings.water,
        gas: currentReadings.gas ? safeNumber(currentReadings.gas) : rates.lastReadings.gas,
      };

      // Update Readings (Custom Metered)
      rates.customFields.forEach(field => {
        if (field.type === 'rate') {
          newReadings[field.id] = customReadings[field.id] ? safeNumber(customReadings[field.id]) : (rates.lastReadings[field.id] || 0);
        }
      });

      const newRates = {
        ...rates,
        lastReadings: { ...rates.lastReadings, ...newReadings }
      };

      await saveTariffs(currentObject.id, newRates);
      
      setRates(newRates);
      setCurrentReadings({ electricity: '', water: '', gas: '' });
      setCustomReadings({});
      onSaved();
    } catch (err: any) {
      console.error("Save failed:", err);
      setError(t.calculator.saveError);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' });
  };

  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      <div className="flex items-center space-x-2 text-slate-500 text-sm">
        <span>{t.calculator.calculatingFor}</span>
        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{currentObject.name}</span>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Main Standard Utilities */}
      <div className="grid grid-cols-1 gap-4">
        {/* Electricity */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-2">
               <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><Zap className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-slate-700">{t.calculator.electricity}</h3>
                <p className="text-xs text-slate-400">{t.calculator.rate}: {formatCurrency(rates.electricityRate)} /{t.common.units.kwh}</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-xs font-semibold text-slate-500 uppercase">{t.calculator.prev}</p>
               <p className="font-mono text-slate-700">{rates.lastReadings.electricity}</p>
            </div>
          </div>
          <div className="flex items-end space-x-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.current}</label>
              <input
                type="number" min={rates.lastReadings.electricity} step="1"
                value={currentReadings.electricity}
                onChange={(e) => handleInputChange('electricity', e.target.value)}
                placeholder={rates.lastReadings.electricity.toString()}
                className="block w-full text-xl font-bold text-slate-900 border-b-2 border-slate-100 focus:border-blue-500 focus:outline-none bg-transparent pb-1"
              />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 mb-2" />
            <div className="flex-1 text-right pb-2">
               <span className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.usage}</span>
               <span className={`text-xl font-bold ${consumption.electricity > 0 ? 'text-blue-600' : 'text-slate-300'}`}>
                 {consumption.electricity} <span className="text-sm font-normal text-slate-400">{t.common.units.kwh}</span>
               </span>
            </div>
          </div>
        </div>

        {/* Water */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-2">
               <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600"><Droplets className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-slate-700">{t.calculator.water}</h3>
                <p className="text-xs text-slate-400">{t.calculator.rate}: {formatCurrency(rates.waterRate)} /{t.common.units.m3}</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-xs font-semibold text-slate-500 uppercase">{t.calculator.prev}</p>
               <p className="font-mono text-slate-700">{rates.lastReadings.water}</p>
            </div>
          </div>
          <div className="flex items-end space-x-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.current}</label>
              <input
                type="number" min={rates.lastReadings.water} step="1"
                value={currentReadings.water}
                onChange={(e) => handleInputChange('water', e.target.value)}
                placeholder={rates.lastReadings.water.toString()}
                className="block w-full text-xl font-bold text-slate-900 border-b-2 border-slate-100 focus:border-cyan-500 focus:outline-none bg-transparent pb-1"
              />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 mb-2" />
            <div className="flex-1 text-right pb-2">
               <span className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.usage}</span>
               <span className={`text-xl font-bold ${consumption.water > 0 ? 'text-cyan-600' : 'text-slate-300'}`}>
                 {consumption.water} <span className="text-sm font-normal text-slate-400">{t.common.units.m3}</span>
               </span>
            </div>
          </div>
          {/* Editable Fixed Fee */}
          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
             <label className="text-xs font-medium text-slate-400 flex items-center"><Pencil className="h-3 w-3 mr-1" /> {t.calculator.fixedFee}</label>
             <div className="flex items-center space-x-1">
               <span className="text-xs font-bold text-slate-400">₴</span>
               <input 
                 type="number" step="0.01"
                 value={fixedFees.water}
                 onChange={(e) => handleFixedFeeChange('water', e.target.value)}
                 className="w-20 text-right text-sm font-semibold text-slate-600 bg-slate-50 rounded px-1 focus:bg-white focus:ring-1 focus:ring-cyan-300 outline-none"
               />
             </div>
          </div>
        </div>

        {/* Gas */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
           <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-2">
               <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><Flame className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-slate-700">{t.calculator.gas}</h3>
                <p className="text-xs text-slate-400">{t.calculator.rate}: {formatCurrency(rates.gasRate)} /{t.common.units.m3}</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-xs font-semibold text-slate-500 uppercase">{t.calculator.prev}</p>
               <p className="font-mono text-slate-700">{rates.lastReadings.gas}</p>
            </div>
          </div>
          <div className="flex items-end space-x-4 mb-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.current}</label>
              <input
                type="number" min={rates.lastReadings.gas} step="1"
                value={currentReadings.gas}
                onChange={(e) => handleInputChange('gas', e.target.value)}
                placeholder={rates.lastReadings.gas.toString()}
                className="block w-full text-xl font-bold text-slate-900 border-b-2 border-slate-100 focus:border-orange-500 focus:outline-none bg-transparent pb-1"
              />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 mb-2" />
            <div className="flex-1 text-right pb-2">
               <span className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.usage}</span>
               <span className={`text-xl font-bold ${consumption.gas > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
                 {consumption.gas} <span className="text-sm font-normal text-slate-400">{t.common.units.m3}</span>
               </span>
            </div>
          </div>
          {/* Editable Fixed Fee */}
          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
             <label className="text-xs font-medium text-slate-400 flex items-center"><Pencil className="h-3 w-3 mr-1" /> {t.calculator.fixedFee}</label>
             <div className="flex items-center space-x-1">
               <span className="text-xs font-bold text-slate-400">₴</span>
               <input 
                 type="number" step="0.01"
                 value={fixedFees.gas}
                 onChange={(e) => handleFixedFeeChange('gas', e.target.value)}
                 className="w-20 text-right text-sm font-semibold text-slate-600 bg-slate-50 rounded px-1 focus:bg-white focus:ring-1 focus:ring-orange-300 outline-none"
               />
             </div>
          </div>
        </div>

        {/* Custom Metered Fields */}
        {rates.customFields.filter(f => f.type === 'rate').map(field => {
           const prevVal = rates.lastReadings[field.id] || 0;
           const currValString = customReadings[field.id] || '';
           const currVal = parseFloat(currValString);
           const usage = !isNaN(currVal) ? Math.max(0, currVal - prevVal) : 0;
           
           return (
            <div key={field.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600"><Layers className="h-5 w-5" /></div>
                  <div>
                    <h3 className="font-semibold text-slate-700">{field.name}</h3>
                    <p className="text-xs text-slate-400">{t.calculator.rate}: {formatCurrency(field.price)} /{field.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-500 uppercase">{t.calculator.prev}</p>
                  <p className="font-mono text-slate-700">{prevVal}</p>
                </div>
              </div>
              <div className="flex items-end space-x-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.current}</label>
                  <input
                    type="number" min={prevVal} step="1"
                    value={currValString}
                    onChange={(e) => handleCustomReadingChange(field.id, e.target.value)}
                    placeholder={prevVal.toString()}
                    className="block w-full text-xl font-bold text-slate-900 border-b-2 border-slate-100 focus:border-purple-500 focus:outline-none bg-transparent pb-1"
                  />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 mb-2" />
                <div className="flex-1 text-right pb-2">
                  <span className="block text-xs font-medium text-slate-500 mb-1">{t.calculator.usage}</span>
                  <span className={`text-xl font-bold ${usage > 0 ? 'text-purple-600' : 'text-slate-300'}`}>
                    {usage} <span className="text-sm font-normal text-slate-400">{field.unit}</span>
                  </span>
                </div>
              </div>
            </div>
           );
        })}

        {/* Fixed Fee Fields Display (Editable) */}
        {rates.customFields.filter(f => f.type === 'fee').map(field => (
          <div key={field.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600"><BoxSelect className="h-5 w-5" /></div>
              <div>
                <h3 className="font-semibold text-slate-700">{field.name}</h3>
                <p className="text-xs text-slate-400 flex items-center">
                   {t.settings.types.fee}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
               <span className="text-sm font-bold text-indigo-600">₴</span>
               <input 
                 type="number" step="0.01"
                 value={customFeeOverrides[field.id] || ''}
                 onChange={(e) => handleCustomFeeOverrideChange(field.id, e.target.value)}
                 className="w-20 text-right text-lg font-bold text-indigo-700 bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1"
               />
               <CheckCircle2 className="h-4 w-4 text-indigo-400 ml-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{t.calculator.estimatedBill}</h2>
          <div className="mt-2 flex items-baseline">
            <span className="text-4xl font-extrabold text-slate-900">{formatCurrency(totalCost)}</span>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Standard Breakdown */}
          <div className="flex justify-between text-sm">
            <div className="flex items-center text-slate-600"><Zap className="h-4 w-4 mr-2 text-blue-500"/> {t.calculator.electricity}</div>
            <span className="font-medium text-slate-900">{formatCurrency(breakdown.electricityCost)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center text-slate-600"><Droplets className="h-4 w-4 mr-2 text-cyan-500"/> {t.calculator.water} <span className="text-xs text-slate-400 ml-1">(+ {formatCurrency(breakdown.waterSubscriptionFee)} {t.common.units.fixed})</span></div>
            <span className="font-medium text-slate-900">{formatCurrency(breakdown.waterCost + breakdown.waterSubscriptionFee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <div className="flex items-center text-slate-600"><Flame className="h-4 w-4 mr-2 text-orange-500"/> {t.calculator.gas} <span className="text-xs text-slate-400 ml-1">(+ {formatCurrency(breakdown.gasDistributionFee)} {t.common.units.fixed})</span></div>
            <span className="font-medium text-slate-900">{formatCurrency(breakdown.gasCost + breakdown.gasDistributionFee)}</span>
          </div>

          {/* Custom Records Breakdown */}
          {customBillRecords.length > 0 && <div className="border-t border-slate-100 my-2"></div>}
          
          {customBillRecords.map(rec => (
            <div key={rec.fieldId} className="flex justify-between text-sm">
              <div className="flex items-center text-slate-600">
                {rec.type === 'fee' ? <BoxSelect className="h-4 w-4 mr-2 text-slate-400"/> : <Layers className="h-4 w-4 mr-2 text-purple-500"/>}
                {rec.name}
              </div>
              <span className="font-medium text-slate-900">{formatCurrency(rec.cost)}</span>
            </div>
          ))}

        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving || totalCost <= 0}
            className={`w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl text-sm font-bold shadow-md transition-all
              ${saving || totalCost <= 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg'}`}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> <span>{t.calculator.saveButton}</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
