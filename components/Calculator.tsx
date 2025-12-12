import React, { useState, useEffect } from 'react';
import { TariffRates, ConsumptionData, CostBreakdown, DEFAULT_TARIFFS, User, UserObject, CustomBillRecord } from '../types';
import { getTariffs, saveBill, saveTariffs } from '../services/db';
import { Zap, Droplets, Flame, Save, Loader2, Layers, BoxSelect, ArrowRight } from 'lucide-react';
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
  const { t } = useLanguage();

  const [currentReadings, setCurrentReadings] = useState({
    electricity: '',
    water: '',
    gas: '',
  });

  const [customReadings, setCustomReadings] = useState<Record<string, string>>({});
  const [customBillRecords, setCustomBillRecords] = useState<CustomBillRecord[]>([]);

  // Consumption & Breakdown State
  const [consumption, setConsumption] = useState<ConsumptionData>({ electricity: 0, water: 0, gas: 0 });
  const [breakdown, setBreakdown] = useState<CostBreakdown>({
    electricityCost: 0, waterCost: 0, waterSubscriptionFee: 0, gasCost: 0, gasDistributionFee: 0
  });
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
            ...DEFAULT_TARIFFS,
            ...data,
            customFields: data.customFields || [],
            lastReadings: { ...DEFAULT_TARIFFS.lastReadings, ...(data.lastReadings || {}) }
          };
          setRates(mergedData);
          setCurrentReadings({ electricity: '', water: '', gas: '' });
          setCustomReadings({});
        }
      } catch (err) {
        console.error("Error loading tariffs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, [currentObject.id]);

  useEffect(() => {
    // 1. Standard Calcs
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
    
    setBreakdown({
      electricityCost: elecCost,
      waterCost: waterCost,
      waterSubscriptionFee: rates.waterSubscriptionFee,
      gasCost: gasCost,
      gasDistributionFee: rates.gasDistributionFee
    });

    // 2. Custom Fields Calcs
    let customTotal = 0;
    const records: CustomBillRecord[] = [];

    rates.customFields.forEach(field => {
      let cost = 0;
      let cons = 0;

      if (field.type === 'fee') {
        cost = field.price;
        records.push({ fieldId: field.id, name: field.name, type: 'fee', cost });
      } else if (field.type === 'rate') {
        const currVal = parseFloat(customReadings[field.id]);
        const prevVal = rates.lastReadings[field.id] || 0;
        cons = !isNaN(currVal) ? Math.max(0, currVal - prevVal) : 0;
        cost = cons * field.price;
        records.push({ fieldId: field.id, name: field.name, type: 'rate', unit: field.unit, consumption: cons, cost });
      }
      customTotal += cost;
    });

    setCustomBillRecords(records);
    setTotalCost(elecCost + waterCost + rates.waterSubscriptionFee + gasCost + rates.gasDistributionFee + customTotal);

  }, [currentReadings, customReadings, rates]);

  const handleInputChange = (field: keyof typeof currentReadings, value: string) => {
    setCurrentReadings(prev => ({ ...prev, [field]: value }));
  };
  
  const handleCustomReadingChange = (id: string, value: string) => {
    setCustomReadings(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = async () => {
    if (totalCost === 0 && consumption.electricity === 0) return;
    setSaving(true);
    try {
      const billData = {
        date: Date.now(),
        electricityConsumption: safeNumber(consumption.electricity),
        waterConsumption: safeNumber(consumption.water),
        gasConsumption: safeNumber(consumption.gas),
        breakdown,
        customRecords: customBillRecords,
        totalCost: safeNumber(totalCost)
      };

      await saveBill(currentObject.id, user.id, billData);

      // Update Readings
      const newReadings: any = {
        electricity: currentReadings.electricity ? safeNumber(currentReadings.electricity) : rates.lastReadings.electricity,
        water: currentReadings.water ? safeNumber(currentReadings.water) : rates.lastReadings.water,
        gas: currentReadings.gas ? safeNumber(currentReadings.gas) : rates.lastReadings.gas,
      };
      
      rates.customFields.forEach(field => {
        if (field.type === 'rate') {
          newReadings[field.id] = customReadings[field.id] ? safeNumber(customReadings[field.id]) : (rates.lastReadings[field.id] || 0);
        }
      });

      const newRates = { ...rates, lastReadings: { ...rates.lastReadings, ...newReadings } };
      await saveTariffs(currentObject.id, newRates);
      setRates(newRates);
      setCurrentReadings({ electricity: '', water: '', gas: '' });
      setCustomReadings({});
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => val.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  if (loading) return <div className="flex justify-center h-64 items-center"><Loader2 className="h-8 w-8 animate-spin text-slate-400"/></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* SECTION 1: New Readings */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 mb-4">New readings</h2>
        <div className="space-y-6">

          {/* Electricity Row */}
          <div className="flex items-start gap-4">
            <Zap className="h-7 w-7 text-black shrink-0 mt-1" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="bg-slate-200 rounded-lg flex items-center px-4 py-3">
                <input 
                   type="number"
                   value={currentReadings.electricity}
                   onChange={(e) => handleInputChange('electricity', e.target.value)}
                   placeholder={rates.lastReadings.electricity.toString()}
                   className="bg-transparent w-full text-lg font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
                />
                <span className="text-slate-500 text-sm ml-2 font-medium">kWh</span>
              </div>
              <div className="flex justify-between mt-1 px-1">
                 <span className="text-xs text-slate-400">Rate: {rates.electricityRate}</span>
              </div>
            </div>
            <div className="text-right pt-2 min-w-[70px]">
               <div className="text-xs text-slate-400 mb-1">Prev <span className="text-slate-600 font-medium">{rates.lastReadings.electricity}</span></div>
               <div className="text-xs text-slate-400">Usage <span className="text-slate-800 font-bold">{consumption.electricity}</span></div>
            </div>
          </div>

          {/* Water Row */}
          <div className="flex items-start gap-4">
            <Droplets className="h-7 w-7 text-black shrink-0 mt-1" strokeWidth={1.5} />
            <div className="flex-1">
              <div className="bg-slate-200 rounded-lg flex items-center px-4 py-3">
                <input 
                   type="number"
                   value={currentReadings.water}
                   onChange={(e) => handleInputChange('water', e.target.value)}
                   placeholder={rates.lastReadings.water.toString()}
                   className="bg-transparent w-full text-lg font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
                />
                <span className="text-slate-500 text-sm ml-2 font-medium">m³</span>
              </div>
               <div className="flex justify-between mt-1 px-1">
                 <span className="text-xs text-slate-400">+ fixed fee: {rates.waterSubscriptionFee}</span>
              </div>
            </div>
             <div className="text-right pt-2 min-w-[70px]">
               <div className="text-xs text-slate-400 mb-1">Prev <span className="text-slate-600 font-medium">{rates.lastReadings.water}</span></div>
               <div className="text-xs text-slate-400">Usage <span className="text-slate-800 font-bold">{consumption.water}</span></div>
            </div>
          </div>

          {/* Gas Row */}
          <div className="flex items-start gap-4">
            <Flame className="h-7 w-7 text-black shrink-0 mt-1" strokeWidth={1.5} />
             <div className="flex-1">
              <div className="bg-slate-200 rounded-lg flex items-center px-4 py-3">
                <input 
                   type="number"
                   value={currentReadings.gas}
                   onChange={(e) => handleInputChange('gas', e.target.value)}
                   placeholder={rates.lastReadings.gas.toString()}
                   className="bg-transparent w-full text-lg font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
                />
                <span className="text-slate-500 text-sm ml-2 font-medium">m³</span>
              </div>
               <div className="flex justify-between mt-1 px-1">
                 <span className="text-xs text-slate-400">+ fixed fee: {rates.gasDistributionFee}</span>
              </div>
            </div>
             <div className="text-right pt-2 min-w-[70px]">
               <div className="text-xs text-slate-400 mb-1">Prev <span className="text-slate-600 font-medium">{rates.lastReadings.gas}</span></div>
               <div className="text-xs text-slate-400">Usage <span className="text-slate-800 font-bold">{consumption.gas}</span></div>
            </div>
          </div>

          {/* Custom Metered Fields */}
          {rates.customFields.filter(f => f.type === 'rate').map(field => (
             <div key={field.id} className="flex items-start gap-4">
                <Layers className="h-7 w-7 text-black shrink-0 mt-1" strokeWidth={1.5} />
                <div className="flex-1">
                  <div className="bg-slate-200 rounded-lg flex items-center px-4 py-3">
                    <input 
                       type="number"
                       value={customReadings[field.id] || ''}
                       onChange={(e) => handleCustomReadingChange(field.id, e.target.value)}
                       placeholder={(rates.lastReadings[field.id] || 0).toString()}
                       className="bg-transparent w-full text-lg font-medium text-slate-800 focus:outline-none placeholder:text-slate-400"
                    />
                    <span className="text-slate-500 text-sm ml-2 font-medium">{field.unit}</span>
                  </div>
                  <div className="mt-1 px-1"><span className="text-xs text-slate-400">{field.name}</span></div>
                </div>
                 <div className="text-right pt-2 min-w-[70px]">
                   <div className="text-xs text-slate-400">Prev <span className="text-slate-600 font-medium">{rates.lastReadings[field.id] || 0}</span></div>
                </div>
             </div>
          ))}

        </div>
      </section>

      <hr className="border-slate-100" />

      {/* SECTION 2: Bill */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 mb-4">Bill</h2>
        <div className="space-y-4 px-2">
          
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-black" strokeWidth={1.5}/>
                <span className="text-lg font-medium">{formatCurrency(breakdown.electricityCost)}</span>
             </div>
             <span className="text-slate-400 text-sm">{consumption.electricity} kWh</span>
          </div>

          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Droplets className="h-5 w-5 text-black" strokeWidth={1.5}/>
                <span className="text-lg font-medium">{formatCurrency(breakdown.waterCost + breakdown.waterSubscriptionFee)}</span>
             </div>
             <span className="text-slate-400 text-sm">{consumption.water} m³</span>
          </div>

           <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-black" strokeWidth={1.5}/>
                <span className="text-lg font-medium">{formatCurrency(breakdown.gasCost + breakdown.gasDistributionFee)}</span>
             </div>
             <span className="text-slate-400 text-sm">{consumption.gas} m³</span>
          </div>

          {customBillRecords.map(rec => (
            <div key={rec.fieldId} className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                  {rec.type === 'fee' ? <BoxSelect className="h-5 w-5 text-black" strokeWidth={1.5}/> : <Layers className="h-5 w-5 text-black" strokeWidth={1.5}/>}
                  <span className="text-lg font-medium">{formatCurrency(rec.cost)}</span>
               </div>
               {rec.type === 'rate' ? (
                  <span className="text-slate-400 text-sm">{rec.consumption} {rec.unit}</span>
               ) : (
                  <span className="text-slate-400 text-sm">{t.common.units.fixed}</span>
               )}
            </div>
          ))}

        </div>

        {/* TOTAL */}
        <div className="mt-8 mb-8 text-center">
           <div className="text-5xl font-bold text-black tracking-tight">
             {totalCost.toFixed(2)}
           </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || totalCost <= 0}
          className={`w-full py-4 rounded-xl text-lg font-semibold flex items-center justify-center space-x-2 transition-all
            ${saving || totalCost <= 0 
              ? 'bg-slate-100 text-slate-300' 
              : 'bg-black text-white active:scale-[0.98]'}`}
        >
          {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <span>Save Bill</span>}
        </button>

      </section>
    </div>
  );
};

export default Calculator;