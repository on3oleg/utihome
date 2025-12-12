import React, { useState, useEffect } from 'react';
import { TariffRates, DEFAULT_TARIFFS, User, UserObject, CustomFieldConfig } from '../types';
import { getTariffs, saveTariffs } from '../services/db';
import { Save, CheckCircle2, Gauge, Coins, Plus, Trash2, Layers, Globe } from 'lucide-react';
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
  const [message, setMessage] = useState<string | null>(null);
  const { t, language, setLanguage } = useLanguage();

  // New Field State
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'rate' | 'fee'>('fee');
  const [newFieldUnit, setNewFieldUnit] = useState('');
  const [newFieldPrice, setNewFieldPrice] = useState('');
  const [newFieldStartReading, setNewFieldStartReading] = useState('');

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const data = await getTariffs(currentObject.id);
        if (data) {
           const mergedData = {
            ...DEFAULT_TARIFFS,
            ...data,
            customFields: data.customFields || [],
            lastReadings: {
              ...DEFAULT_TARIFFS.lastReadings,
              ...(data.lastReadings || {})
            }
          };
          setRates(mergedData);
        }
      } catch (err) {
        console.error("Failed to load rates", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, [currentObject.id]);

  const handleRateChange = (field: keyof TariffRates, value: string) => {
    setRates(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    setMessage(null);
  };

  const handleReadingChange = (field: string, value: string) => {
    setRates(prev => ({
      ...prev,
      lastReadings: {
        ...prev.lastReadings,
        [field]: parseFloat(value) || 0
      }
    }));
    setMessage(null);
  };

  // Custom Fields Logic
  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;
    
    const priceVal = parseFloat(newFieldPrice) || 0;
    const startReadingVal = parseFloat(newFieldStartReading) || 0;

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

    setNewFieldName('');
    setNewFieldUnit('');
    setNewFieldType('fee');
    setNewFieldPrice('');
    setNewFieldStartReading('');
  };

  const handleDeleteCustomField = (id: string) => {
    setRates(prev => {
      const newReadings = { ...prev.lastReadings };
      delete newReadings[id]; // Cleanup reading if exists

      return {
        ...prev,
        customFields: prev.customFields.filter(f => f.id !== id),
        lastReadings: newReadings
      };
    });
  };

  const handleCustomFieldPriceChange = (id: string, value: string) => {
    setRates(prev => ({
      ...prev,
      customFields: prev.customFields.map(f => f.id === id ? { ...f, price: parseFloat(value) || 0 } : f)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveTariffs(currentObject.id, rates);
      setMessage(t.settings.saveSuccess);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage(t.settings.saveError);
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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="flex justify-between items-center mb-4 px-2">
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

      <form onSubmit={handleSave} className="space-y-6">

        {/* Standard Tariffs Section */}
        <IonList inset className="m-0 rounded-2xl shadow-sm border border-slate-200">
          <IonListHeader className="border-b border-slate-100 bg-slate-50 pl-4 py-2">
             <div className="flex items-center space-x-2 my-2">
                <Coins className="h-5 w-5 text-indigo-600" />
                <IonLabel className="font-bold text-slate-800">{t.settings.standardTariffs}</IonLabel>
             </div>
          </IonListHeader>
          
          <IonItem>
            <IonLabel position="stacked" className="font-bold text-slate-700">{t.calculator.electricity}</IonLabel>
            <IonInput 
               type="number" step="0.01" value={rates.electricityRate} 
               onIonInput={e => handleRateChange('electricityRate', e.detail.value!)}
               placeholder="0.00"
            />
            <IonNote slot="end">₴ / {t.common.units.kwh}</IonNote>
          </IonItem>

          <IonItem>
            <IonLabel position="stacked" className="font-bold text-slate-700">{t.settings.waterRate}</IonLabel>
            <IonInput 
               type="number" step="0.01" value={rates.waterRate} 
               onIonInput={e => handleRateChange('waterRate', e.detail.value!)}
            />
            <IonNote slot="end">₴ / {t.common.units.m3}</IonNote>
          </IonItem>

           <IonItem>
            <IonLabel position="stacked" className="font-bold text-slate-700">{t.settings.waterSubFee}</IonLabel>
            <IonInput 
               type="number" step="0.01" value={rates.waterSubscriptionFee} 
               onIonInput={e => handleRateChange('waterSubscriptionFee', e.detail.value!)}
            />
             <IonNote slot="end">₴ {t.common.units.fixed}</IonNote>
          </IonItem>

           <IonItem>
            <IonLabel position="stacked" className="font-bold text-slate-700">{t.settings.gasRate}</IonLabel>
            <IonInput 
               type="number" step="0.01" value={rates.gasRate} 
               onIonInput={e => handleRateChange('gasRate', e.detail.value!)}
            />
             <IonNote slot="end">₴ / {t.common.units.m3}</IonNote>
          </IonItem>

           <IonItem>
            <IonLabel position="stacked" className="font-bold text-slate-700">{t.settings.gasDistFee}</IonLabel>
            <IonInput 
               type="number" step="0.01" value={rates.gasDistributionFee} 
               onIonInput={e => handleRateChange('gasDistributionFee', e.detail.value!)}
            />
             <IonNote slot="end">₴ {t.common.units.fixed}</IonNote>
          </IonItem>
        </IonList>

        {/* Custom Fields Section */}
        <IonList inset className="m-0 rounded-2xl shadow-sm border border-slate-200">
           <IonListHeader className="border-b border-slate-100 bg-slate-50 pl-4 py-2">
             <div className="flex items-center space-x-2 my-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                <IonLabel className="font-bold text-slate-800">{t.settings.additionalServices}</IonLabel>
             </div>
          </IonListHeader>

           {rates.customFields.map((field) => (
             <IonItem key={field.id} lines="full">
                <div className="w-full py-2">
                   <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-slate-700">{field.name}</span>
                      <button type="button" onClick={() => handleDeleteCustomField(field.id)} className="text-red-400">
                         <Trash2 className="h-4 w-4" />
                      </button>
                   </div>
                   <div className="flex gap-2">
                      <div className="flex-1">
                        <IonInput 
                          label="Price" labelPlacement="stacked"
                          type="number" value={field.price}
                          onIonInput={e => handleCustomFieldPriceChange(field.id, e.detail.value!)}
                          className="bg-slate-50 rounded px-2"
                        />
                      </div>
                      {field.type === 'rate' && (
                        <div className="flex-1">
                           <IonInput 
                             label="Current" labelPlacement="stacked"
                             type="number" value={rates.lastReadings[field.id] || 0}
                             onIonInput={e => handleReadingChange(field.id, e.detail.value!)}
                             className="bg-slate-50 rounded px-2"
                           />
                        </div>
                      )}
                   </div>
                </div>
             </IonItem>
           ))}

            <div className="p-4 bg-slate-50">
               <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center"><Plus className="h-4 w-4 mr-1"/> {t.settings.addService}</h4>
               <div className="space-y-3">
                  <input type="text" placeholder="Service Name" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"/>
                  <select value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white">
                     <option value="fee">Fixed Fee</option>
                     <option value="rate">Metered Rate</option>
                  </select>
                  
                  {newFieldType === 'fee' ? (
                     <input type="number" placeholder="Fee Amount" value={newFieldPrice} onChange={e => setNewFieldPrice(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"/>
                  ) : (
                     <div className="grid grid-cols-3 gap-2">
                        <input type="text" placeholder="Unit" value={newFieldUnit} onChange={e => setNewFieldUnit(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"/>
                        <input type="number" placeholder="Price" value={newFieldPrice} onChange={e => setNewFieldPrice(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"/>
                        <input type="number" placeholder="Start" value={newFieldStartReading} onChange={e => setNewFieldStartReading(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"/>
                     </div>
                  )}

                  <IonButton fill="outline" expand="block" size="small" onClick={handleAddCustomField} disabled={!newFieldName}>Add</IonButton>
               </div>
            </div>
        </IonList>

        {/* Standard Meter Readings Section */}
        <IonList inset className="m-0 rounded-2xl shadow-sm border border-slate-200">
           <IonListHeader className="border-b border-slate-100 bg-slate-50 pl-4 py-2">
             <div className="flex items-center space-x-2 my-2">
                <Gauge className="h-5 w-5 text-indigo-600" />
                <IonLabel className="font-bold text-slate-800">{t.settings.meterReadings}</IonLabel>
             </div>
          </IonListHeader>
          <IonItem>
             <IonLabel position="stacked">{t.calculator.electricity} ({t.common.units.kwh})</IonLabel>
             <IonInput type="number" value={rates.lastReadings.electricity} onIonInput={e => handleReadingChange('electricity', e.detail.value!)} />
          </IonItem>
          <IonItem>
             <IonLabel position="stacked">{t.calculator.water} ({t.common.units.m3})</IonLabel>
             <IonInput type="number" value={rates.lastReadings.water} onIonInput={e => handleReadingChange('water', e.detail.value!)} />
          </IonItem>
          <IonItem>
             <IonLabel position="stacked">{t.calculator.gas} ({t.common.units.m3})</IonLabel>
             <IonInput type="number" value={rates.lastReadings.gas} onIonInput={e => handleReadingChange('gas', e.detail.value!)} />
          </IonItem>
        </IonList>

        <div className="pt-2">
           {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-center text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.includes('success') && <CheckCircle2 className="h-4 w-4 mr-2" />}
              {message}
            </div>
          )}

          <IonButton 
             expand="block" 
             type="submit" 
             disabled={saving} 
             className="h-12 font-bold"
             style={{ '--border-radius': '12px' }}
          >
            {saving ? <IonSpinner /> : t.settings.saveButton}
          </IonButton>
        </div>
      </form>
    </div>
  );
};

export default Settings;