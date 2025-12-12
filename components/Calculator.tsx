import React, { useState, useEffect } from 'react';
import { TariffRates, ConsumptionData, CostBreakdown, DEFAULT_TARIFFS, User, UserObject, CustomBillRecord } from '../types';
import { getTariffs, saveBill, saveTariffs } from '../services/db';
import { Zap, Droplets, Flame, Loader2, Box } from 'lucide-react';
import { IonList, IonItem, IonInput, IonNote, IonButton, IonSpinner, IonLabel } from '@ionic/react';
import { useLanguage } from '../i18n';
import OCRScanner from './OCRScanner';

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
  const [manualFees, setManualFees] = useState<Record<string, string>>({});
  const [customBillRecords, setCustomBillRecords] = useState<CustomBillRecord[]>([]);

  // Consumption & Breakdown State
  const [consumption, setConsumption] = useState<ConsumptionData>({ electricity: 0, water: 0, gas: 0 });
  const [breakdown, setBreakdown] = useState<CostBreakdown>({
    electricityCost: 0, waterCost: 0, waterSubscriptionFee: 0, gasCost: 0, gasDistributionFee: 0
  });
  const [totalCost, setTotalCost] = useState(0);

  const safeNumber = (val: any, fallback: number = 0): number => {
    if (typeof val === 'string') {
      val = val.replace(',', '.');
    }
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
          setManualFees({});
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
    const currElec = safeNumber(currentReadings.electricity);
    const currWater = safeNumber(currentReadings.water);
    const currGas = safeNumber(currentReadings.gas);

    const elecCons = currentReadings.electricity !== '' ? Math.max(0, currElec - rates.lastReadings.electricity) : 0;
    const waterCons = currentReadings.water !== '' ? Math.max(0, currWater - rates.lastReadings.water) : 0;
    const gasCons = currentReadings.gas !== '' ? Math.max(0, currGas - rates.lastReadings.gas) : 0;

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
        if (field.price === 0) {
           // If configured price is 0, use manual input
           cost = safeNumber(manualFees[field.id]);
        } else {
           cost = field.price;
        }
        records.push({ fieldId: field.id, name: field.name, type: 'fee', cost });
      } else if (field.type === 'rate') {
        const rawVal = customReadings[field.id];
        const currVal = safeNumber(rawVal);
        const prevVal = rates.lastReadings[field.id] || 0;
        cons = rawVal && rawVal !== '' ? Math.max(0, currVal - prevVal) : 0;
        cost = cons * field.price;
        records.push({ fieldId: field.id, name: field.name, type: 'rate', unit: field.unit, consumption: cons, cost });
      }
      customTotal += cost;
    });

    setCustomBillRecords(records);
    setTotalCost(elecCost + waterCost + rates.waterSubscriptionFee + gasCost + rates.gasDistributionFee + customTotal);

  }, [currentReadings, customReadings, manualFees, rates]);

  const sanitizeInput = (val: string) => {
    // Replace comma with dot
    return val.replace(',', '.');
  };

  const handleInputChange = (field: keyof typeof currentReadings, value: string) => {
    setCurrentReadings(prev => ({ ...prev, [field]: sanitizeInput(value) }));
  };
  
  const handleCustomReadingChange = (id: string, value: string) => {
    setCustomReadings(prev => ({ ...prev, [id]: sanitizeInput(value) }));
  };

  const handleManualFeeChange = (id: string, value: string) => {
    setManualFees(prev => ({ ...prev, [id]: sanitizeInput(value) }));
  };

  const handleSave = async () => {
    if (totalCost === 0 && consumption.electricity === 0) return;
    setSaving(true);
    try {
      const billData = {
        date: Date.now(),
        electricityConsumption: consumption.electricity,
        waterConsumption: consumption.water,
        gasConsumption: consumption.gas,
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
      setManualFees({});
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) => val.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + t.common.currency;
  
  if (loading) return <div className="flex justify-center h-64 items-center"><IonSpinner color="primary" /></div>;

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: New Readings */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 mb-4 pl-1">{t.calculator.newReadings}</h2>
        <IonList lines="none" className="bg-transparent space-y-4">

          {/* Electricity Row */}
          <div className="flex items-start gap-3">
            <Zap className="h-7 w-7 text-black shrink-0 mt-3" strokeWidth={1.5} />
            <div className="flex-1">
               {/* Ionic Item styled to look like the gray box */}
               <div className="flex gap-2">
                 <IonItem className="rounded-xl overflow-hidden flex-1" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                    <IonInput
                      type="text"
                      inputmode="decimal"
                      value={currentReadings.electricity}
                      onIonInput={(e) => handleInputChange('electricity', e.detail.value!)}
                      placeholder={rates.lastReadings.electricity.toString()}
                      className="text-lg font-bold"
                    ></IonInput>
                    <IonNote slot="end" className="text-slate-500 font-medium">{t.common.units.kwh}</IonNote>
                 </IonItem>
                 <OCRScanner onScanComplete={(val) => handleInputChange('electricity', val)} />
               </div>
               <div className="flex justify-between mt-1 px-1">
                 <span className="text-xs text-slate-400">{t.calculator.rate}: {rates.electricityRate} {t.common.currency}</span>
              </div>
            </div>
            <div className="text-right pt-2 min-w-[50px]">
               <div className="text-xs text-slate-400 mb-1 h-4 flex items-center justify-end"><span className="text-slate-600 font-medium">{rates.lastReadings.electricity}</span></div>
               <div className="text-xs text-slate-400 h-4 flex items-center justify-end"><span className="text-slate-800 font-bold">{consumption.electricity.toFixed(0)}</span></div>
            </div>
          </div>

          {/* Water Row */}
          <div className="flex items-start gap-3">
            <Droplets className="h-7 w-7 text-black shrink-0 mt-3" strokeWidth={1.5} />
            <div className="flex-1">
               <div className="flex gap-2">
                 <IonItem className="rounded-xl overflow-hidden flex-1" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                    <IonInput
                      type="text"
                      inputmode="decimal"
                      value={currentReadings.water}
                      onIonInput={(e) => handleInputChange('water', e.detail.value!)}
                      placeholder={rates.lastReadings.water.toString()}
                      className="text-lg font-bold"
                    ></IonInput>
                    <IonNote slot="end" className="text-slate-500 font-medium">{t.common.units.m3}</IonNote>
                 </IonItem>
                 <OCRScanner onScanComplete={(val) => handleInputChange('water', val)} />
               </div>
               <div className="flex justify-between mt-1 px-1">
                 <span className="text-xs text-slate-400">
                   {t.calculator.rate}: {rates.waterRate} {t.common.currency} + {t.calculator.fixedFee}: {rates.waterSubscriptionFee} {t.common.currency}
                 </span>
              </div>
            </div>
             <div className="text-right pt-2 min-w-[50px]">
               <div className="text-xs text-slate-400 mb-1 h-4 flex items-center justify-end"><span className="text-slate-600 font-medium">{rates.lastReadings.water}</span></div>
               <div className="text-xs text-slate-400 h-4 flex items-center justify-end"><span className="text-slate-800 font-bold">{consumption.water.toFixed(0)}</span></div>
            </div>
          </div>

          {/* Gas Row */}
          <div className="flex items-start gap-3">
            <Flame className="h-7 w-7 text-black shrink-0 mt-3" strokeWidth={1.5} />
             <div className="flex-1">
              <div className="flex gap-2">
                <IonItem className="rounded-xl overflow-hidden flex-1" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                    <IonInput
                      type="text"
                      inputmode="decimal"
                      value={currentReadings.gas}
                      onIonInput={(e) => handleInputChange('gas', e.detail.value!)}
                      placeholder={rates.lastReadings.gas.toString()}
                      className="text-lg font-bold"
                    ></IonInput>
                    <IonNote slot="end" className="text-slate-500 font-medium">{t.common.units.m3}</IonNote>
                 </IonItem>
                 <OCRScanner onScanComplete={(val) => handleInputChange('gas', val)} />
               </div>
               <div className="flex justify-between mt-1 px-1">
                 <span className="text-xs text-slate-400">
                   {t.calculator.rate}: {rates.gasRate} {t.common.currency} + {t.calculator.fixedFee}: {rates.gasDistributionFee} {t.common.currency}
                 </span>
              </div>
            </div>
             <div className="text-right pt-2 min-w-[50px]">
               <div className="text-xs text-slate-400 mb-1 h-4 flex items-center justify-end"><span className="text-slate-600 font-medium">{rates.lastReadings.gas}</span></div>
               <div className="text-xs text-slate-400 h-4 flex items-center justify-end"><span className="text-slate-800 font-bold">{consumption.gas.toFixed(0)}</span></div>
            </div>
          </div>

          {/* Custom Fields - Rate Type */}
          {rates.customFields.filter(f => f.type === 'rate').map(field => (
             <div key={field.id} className="flex items-start gap-3">
                <Box className="h-7 w-7 text-black shrink-0 mt-3" strokeWidth={1.5} />
                <div className="flex-1">
                  <div className="flex gap-2">
                    <IonItem className="rounded-xl overflow-hidden flex-1" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                        <IonInput
                          type="text"
                          inputmode="decimal"
                          value={customReadings[field.id] || ''}
                          onIonInput={(e) => handleCustomReadingChange(field.id, e.detail.value!)}
                          placeholder={(rates.lastReadings[field.id] || 0).toString()}
                          className="text-lg font-bold"
                        ></IonInput>
                        <IonNote slot="end" className="text-slate-500 font-medium">{field.unit}</IonNote>
                    </IonItem>
                    <OCRScanner onScanComplete={(val) => handleCustomReadingChange(field.id, val)} />
                  </div>
                  <div className="mt-1 px-1">
                    <span className="text-xs text-slate-400">
                      {field.name} • {t.calculator.rate}: {field.price} {t.common.currency}
                    </span>
                  </div>
                </div>
                 <div className="text-right pt-2 min-w-[50px]">
                   <div className="text-xs text-slate-400 mb-1 h-4 flex items-center justify-end"><span className="text-slate-600 font-medium">{rates.lastReadings[field.id] || 0}</span></div>
                </div>
             </div>
          ))}

          {/* Custom Fields - Fee Type with Zero Price (Manual Input) */}
          {rates.customFields.filter(f => f.type === 'fee' && f.price === 0).map(field => (
             <div key={field.id} className="flex items-start gap-3">
                <Box className="h-7 w-7 text-black shrink-0 mt-3" strokeWidth={1.5} />
                <div className="flex-1">
                  <IonItem className="rounded-xl overflow-hidden" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                      <IonInput
                        type="text"
                        inputmode="decimal"
                        value={manualFees[field.id] || ''}
                        onIonInput={(e) => handleManualFeeChange(field.id, e.detail.value!)}
                        placeholder="0.00"
                        className="text-lg font-bold"
                      ></IonInput>
                      <IonNote slot="end" className="text-slate-500 font-medium">{t.common.currency}</IonNote>
                  </IonItem>
                  <div className="mt-1 px-1">
                    <span className="text-xs text-slate-400">{field.name}</span>
                  </div>
                </div>
                 <div className="text-right pt-2 min-w-[50px]">
                   {/* No previous reading for fees */}
                </div>
             </div>
          ))}
        </IonList>
      </section>

      <hr className="border-slate-100" />

      {/* SECTION 2: Bill */}
      <section>
        <h2 className="text-sm font-medium text-slate-500 mb-4 pl-1">{t.calculator.bill}</h2>
        <div className="space-y-4 px-2">
          
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-black" strokeWidth={1.5}/>
                <span className="text-lg font-medium">{formatCurrency(breakdown.electricityCost)}</span>
             </div>
             <span className="text-slate-400 text-sm">{consumption.electricity.toFixed(0)} {t.common.units.kwh}</span>
          </div>

          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Droplets className="h-5 w-5 text-black" strokeWidth={1.5}/>
                <span className="text-lg font-medium">{formatCurrency(breakdown.waterCost + breakdown.waterSubscriptionFee)}</span>
             </div>
             <span className="text-slate-400 text-sm">{consumption.water.toFixed(0)} {t.common.units.m3}</span>
          </div>

           <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-black" strokeWidth={1.5}/>
                <span className="text-lg font-medium">{formatCurrency(breakdown.gasCost + breakdown.gasDistributionFee)}</span>
             </div>
             <span className="text-slate-400 text-sm">{consumption.gas.toFixed(0)} {t.common.units.m3}</span>
          </div>

          {customBillRecords.map(rec => (
            <div key={rec.fieldId} className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <Box className="h-5 w-5 text-black" strokeWidth={1.5}/>
                  <div>
                    <div className="text-lg font-medium leading-none">{formatCurrency(rec.cost)}</div>
                    <div className="text-xs text-slate-400 mt-1">{rec.name}</div>
                  </div>
               </div>
               {rec.type === 'rate' ? (
                  <span className="text-slate-400 text-sm">{rec.consumption?.toFixed(0)} {rec.unit}</span>
               ) : (
                  <span className="text-slate-400 text-sm">{t.common.units.fixed}</span>
               )}
            </div>
          ))}

        </div>

        {/* TOTAL */}
        <div className="mt-8 mb-8 text-center">
           <div className="text-5xl font-bold text-black tracking-tight">
             {formatCurrency(totalCost)}
           </div>
        </div>

        <IonButton
          expand="block"
          onClick={handleSave}
          disabled={saving || totalCost <= 0}
          className="ion-margin-top text-lg font-semibold h-14"
          style={{ '--border-radius': '12px', '--background': '#000000', '--color': '#ffffff' }}
        >
          {saving ? <IonSpinner name="crescent" /> : t.calculator.saveButton}
        </IonButton>

      </section>
    </div>
  );
};

export default Calculator;