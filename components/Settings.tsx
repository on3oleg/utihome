import React, { useState, useEffect } from 'react';
import { TariffRates, DEFAULT_TARIFFS, User, UserObject, CustomFieldConfig } from '../types';
import { getTariffs, saveTariffs } from '../services/db';
import { Save, CheckCircle2, Gauge, Coins, Plus, Trash2, Layers, Globe, AlertCircle } from 'lucide-react';
import { useLanguage, Language } from '../i18n';
import { IonInput, IonItem, IonList, IonListHeader, IonLabel, IonButton, IonSelect, IonSelectOption, IonNote, IonSpinner } from '@ionic/react';

interface SettingsProps {
  user: User;
  currentObject: UserObject;
}

const Settings: React.FC<SettingsProps> = ({ user, currentObject }) => {
  const [rates, setRates] = useState<TariffRates>(DEFAULT_TARIFFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Changed from string to object for explicit type checking
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  const { t, language, setLanguage } = useLanguage();

  // Local state for inputs to allow comma editing before parsing
  // We track the raw string values for inputs
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // New Field State
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'rate' | 'fee'>('fee');
  const [newFieldUnit, setNewFieldUnit] = useState('');
  const [newFieldPrice, setNewFieldPrice] = useState('');
  const [newFieldStartReading, setNewFieldStartReading] = useState('');

  const sanitizeNumber = (val: string) => val.replace(',', '.');

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const data = await getTariffs(currentObject.id);
        const mergedData = data ? {
            ...DEFAULT_TARIFFS,
            ...data,
            customFields: data.customFields || [],
            lastReadings: {
              ...DEFAULT_TARIFFS.lastReadings,
              ...(data.lastReadings || {})
            }
          } : DEFAULT_TARIFFS;
          
          setRates(mergedData);
          
          // Initialize input strings
          const initials: Record<string, string> = {
             electricityRate: mergedData.electricityRate.toString(),
             waterRate: mergedData.waterRate.toString(),
             waterSubscriptionFee: mergedData.waterSubscriptionFee.toString(),
             gasRate: mergedData.gasRate.toString(),
             gasDistributionFee: mergedData.gasDistributionFee.toString(),
             reading_electricity: mergedData.lastReadings.electricity.toString(),
             reading_water: mergedData.lastReadings.water.toString(),
             reading_gas: mergedData.lastReadings.gas.toString()
          };
          
          mergedData.customFields.forEach(f => {
            initials[`custom_price_${f.id}`] = f.price.toString();
            if (f.type === 'rate') {
               initials[`reading_${f.id}`] = (mergedData.lastReadings[f.id] || 0).toString();
            }
          });
          
          setInputValues(initials);

      } catch (err) {
        console.error("Failed to load rates", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, [currentObject.id]);

  const updateRate = (field: keyof TariffRates, rawValue: string) => {
    const sanitized = sanitizeNumber(rawValue);
    setInputValues(prev => ({ ...prev, [field]: sanitized }));
    setRates(prev => ({ ...prev, [field]: parseFloat(sanitized) || 0 }));
    setStatus(null);
  };

  const updateReading = (field: string, rawValue: string) => {
    const sanitized = sanitizeNumber(rawValue);
    setInputValues(prev => ({ ...prev, [`reading_${field}`]: sanitized }));
    setRates(prev => ({
      ...prev,
      lastReadings: {
        ...prev.lastReadings,
        [field]: parseFloat(sanitized) || 0
      }
    }));
    setStatus(null);
  };

  const updateCustomPrice = (id: string, rawValue: string) => {
    const sanitized = sanitizeNumber(rawValue);
    setInputValues(prev => ({ ...prev, [`custom_price_${id}`]: sanitized }));
    setRates(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => f.id === id ? { ...f, price: parseFloat(sanitized) || 0 } : f)
    }));
  };

  // Custom Fields Logic
  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;
    
    const priceVal = parseFloat(sanitizeNumber(newFieldPrice)) || 0;
    const startReadingVal = parseFloat(sanitizeNumber(newFieldStartReading)) || 0;

    const newField: CustomFieldConfig = {
      id: Date.now().toString(),
      name: newFieldName.trim(),
      type: newFieldType,
      unit: newFieldType === 'rate' ? (newFieldUnit || 'units') : undefined,
      price: priceVal
    };

    setRates(prev => ({
      ...prev,
      customFields: [...prev.customFields, newField],
      lastReadings: newFieldType === 'rate' ? {
        ...prev.lastReadings,
        [newField.id]: startReadingVal
      } : prev.lastReadings
    }));

    setInputValues(prev => ({
        ...prev,
        [`custom_price_${newField.id}`]: newFieldPrice,
        ...(newFieldType === 'rate' ? { [`reading_${newField.id}`]: newFieldStartReading } : {})
    }));

    setNewFieldName('');
    setNewFieldUnit('');
    setNewFieldType('fee');
    setNewFieldPrice('');
    setNewFieldStartReading('');
  };

  const handleDeleteCustomField = (id: string) => {
    setRates(prev => {
      const newReadings = { ...prev.lastReadings };
      delete newReadings[id]; 

      return {
        ...prev,
        customFields: prev.customFields.filter(f => f.id !== id),
        lastReadings: newReadings
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveTariffs(currentObject.id, rates);
      setStatus({ type: 'success', message: t.settings.saveSuccess });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', message: t.settings.saveError });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return (
      <div className="flex justify-center items-center h-64">
        <IonSpinner color="primary" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 space-y-8">
      
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <span>{t.settings.settingsFor}</span>
          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{currentObject.name}</span>
        </div>

        {/* Language Selector */}
        <div className="flex items-center space-x-2 bg-white rounded-lg px-2 py-1 shadow-sm border border-slate-200">
           <Globe className="h-4 w-4 text-slate-400" />
           <select 
             value={language}
             onChange={(e) => setLanguage(e.target.value as Language)}
             className="text-sm font-medium text-slate-700 bg-transparent outline-none cursor-pointer"
           >
             <option value="en">English</option>
             <option value="uk">Українська</option>
           </select>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

        {/* Standard Tariffs Section */}
        <section>
          <div className="flex items-center space-x-2 mb-4 px-1">
             <Coins className="h-6 w-6 text-indigo-600" strokeWidth={1.5} />
             <h3 className="text-lg font-bold text-slate-900">{t.settings.standardTariffs}</h3>
          </div>
          
          <div className="space-y-4">
            
            {/* Electricity */}
            <div className="bg-white p-1 rounded-xl">
               <div className="mb-2 px-1 flex justify-between">
                  <span className="font-bold text-slate-700">{t.calculator.electricity}</span>
                  <span className="text-xs text-slate-400 mt-1">₴ / {t.common.units.kwh}</span>
               </div>
               <IonItem className="rounded-xl overflow-hidden" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                  <IonInput 
                     type="text" inputmode="decimal"
                     value={inputValues.electricityRate} 
                     onIonInput={e => updateRate('electricityRate', e.detail.value!)}
                     className="text-lg font-bold"
                  />
               </IonItem>
            </div>

            {/* Water */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="mb-2 px-1 flex justify-between">
                     <span className="font-bold text-slate-700 text-sm">{t.settings.waterRate}</span>
                  </div>
                  <IonItem className="rounded-xl overflow-hidden" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                     <IonInput 
                        type="text" inputmode="decimal"
                        value={inputValues.waterRate} 
                        onIonInput={e => updateRate('waterRate', e.detail.value!)}
                        className="text-lg font-bold"
                     />
                     <IonNote slot="end" className="text-xs">/{t.common.units.m3}</IonNote>
                  </IonItem>
               </div>
               <div>
                  <div className="mb-2 px-1 flex justify-between">
                     <span className="font-bold text-slate-700 text-sm">{t.settings.waterSubFee}</span>
                  </div>
                  <IonItem className="rounded-xl overflow-hidden" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                     <IonInput 
                        type="text" inputmode="decimal"
                        value={inputValues.waterSubscriptionFee} 
                        onIonInput={e => updateRate('waterSubscriptionFee', e.detail.value!)}
                        className="text-lg font-bold"
                     />
                     <IonNote slot="end" className="text-xs">{t.common.units.fixed}</IonNote>
                  </IonItem>
               </div>
            </div>

            {/* Gas */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <div className="mb-2 px-1 flex justify-between">
                     <span className="font-bold text-slate-700 text-sm">{t.settings.gasRate}</span>
                  </div>
                  <IonItem className="rounded-xl overflow-hidden" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                     <IonInput 
                        type="text" inputmode="decimal"
                        value={inputValues.gasRate} 
                        onIonInput={e => updateRate('gasRate', e.detail.value!)}
                        className="text-lg font-bold"
                     />
                     <IonNote slot="end" className="text-xs">/{t.common.units.m3}</IonNote>
                  </IonItem>
               </div>
               <div>
                  <div className="mb-2 px-1 flex justify-between">
                     <span className="font-bold text-slate-700 text-sm">{t.settings.gasDistFee}</span>
                  </div>
                  <IonItem className="rounded-xl overflow-hidden" style={{ '--background': '#f1f5f9', '--padding-start': '16px' }}>
                     <IonInput 
                        type="text" inputmode="decimal"
                        value={inputValues.gasDistributionFee} 
                        onIonInput={e => updateRate('gasDistributionFee', e.detail.value!)}
                        className="text-lg font-bold"
                     />
                     <IonNote slot="end" className="text-xs">{t.common.units.fixed}</IonNote>
                  </IonItem>
               </div>
            </div>

          </div>
        </section>

        {/* Custom Fields Section */}
        <section>
           <div className="flex items-center space-x-2 mb-4 px-1">
             <Layers className="h-6 w-6 text-indigo-600" strokeWidth={1.5} />
             <h3 className="text-lg font-bold text-slate-900">{t.settings.additionalServices}</h3>
           </div>

           <div className="space-y-3">
             {rates.customFields.map((field) => (
                <div key={field.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                   <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-800">{field.name}</span>
                      <button type="button" onClick={() => handleDeleteCustomField(field.id)} className="text-red-400 bg-white p-1 rounded-full shadow-sm">
                         <Trash2 className="h-4 w-4" />
                      </button>
                   </div>
                   
                   <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs text-slate-400 block mb-1">{t.settings.placeholders.price}</label>
                        <IonItem className="rounded-xl overflow-hidden" style={{ '--background': '#ffffff', '--padding-start': '12px', '--min-height': '40px' }}>
                           <IonInput 
                             type="text" inputmode="decimal"
                             value={inputValues[`custom_price_${field.id}`]}
                             onIonInput={e => updateCustomPrice(field.id, e.detail.value!)}
                             className="text-sm font-bold"
                           />
                        </IonItem>
                      </div>
                      
                      {field.type === 'rate' && (
                        <div className="flex-1">
                           <label className="text-xs text-slate-400 block mb-1">{t.settings.currentReading}</label>
                           <IonItem className="rounded-xl overflow-hidden" style={{ '--background': '#ffffff', '--padding-start': '12px', '--min-height': '40px' }}>
                             <IonInput 
                               type="text" inputmode="decimal"
                               value={inputValues[`reading_${field.id}`]}
                               onIonInput={e => updateReading(field.id, e.detail.value!)}
                               className="text-sm font-bold"
                             />
                           </IonItem>
                        </div>
                      )}
                   </div>
                </div>
             ))}

              <div className="p-4 bg-white rounded-2xl border border-slate-200 border-dashed">
                 <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Plus className="h-4 w-4 mr-1"/> {t.settings.addService}</h4>
                 <div className="space-y-3">
                    <input type="text" placeholder={t.settings.placeholders.serviceName} value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none font-medium"/>
                    
                    <div className="flex gap-2">
                       <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)} className="w-1/2 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none font-medium">
                          <option value="fee">{t.settings.types.fee}</option>
                          <option value="rate">{t.settings.types.rate}</option>
                       </select>
                       
                       {newFieldType === 'fee' ? (
                          <input type="text" inputMode="decimal" placeholder={t.settings.placeholders.feeAmount} value={newFieldPrice} onChange={e => setNewFieldPrice(sanitizeNumber(e.target.value))} className="w-1/2 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none font-medium"/>
                       ) : (
                          <input type="text" placeholder={t.settings.placeholders.unit} value={newFieldUnit} onChange={e => setNewFieldUnit(e.target.value)} className="w-1/2 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none font-medium"/>
                       )}
                    </div>
                    
                    {newFieldType === 'rate' && (
                       <div className="flex gap-2">
                          <input type="text" inputMode="decimal" placeholder={t.settings.placeholders.price} value={newFieldPrice} onChange={e => setNewFieldPrice(sanitizeNumber(e.target.value))} className="w-1/2 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none font-medium"/>
                          <input type="text" inputMode="decimal" placeholder={t.settings.placeholders.start} value={newFieldStartReading} onChange={e => setNewFieldStartReading(sanitizeNumber(e.target.value))} className="w-1/2 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm outline-none font-medium"/>
                       </div>
                    )}

                    <button onClick={handleAddCustomField} disabled={!newFieldName} className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm mt-2 disabled:opacity-50">
                       {t.common.add}
                    </button>
                 </div>
              </div>
           </div>
        </section>

        <div className="pt-2 sticky bottom-0 bg-slate-50 pb-4">
           {status && (
            <div className={`mb-4 p-3 rounded-xl flex items-center text-sm font-medium ${
              status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="h-5 w-5 mr-2" /> : <AlertCircle className="h-5 w-5 mr-2" />}
              {status.message}
            </div>
          )}

          <IonButton 
             expand="block" 
             type="submit" 
             disabled={saving} 
             className="h-14 font-bold text-lg"
             style={{ '--border-radius': '12px', '--background': '#000000', '--color': '#ffffff' }}
          >
            {saving ? <IonSpinner name="crescent" /> : t.settings.saveButton}
          </IonButton>
        </div>
      </form>
    </div>
  );
};

export default Settings;