import React, { useState, useEffect } from 'react';
import { TariffRates, DEFAULT_TARIFFS, User, UserObject, CustomFieldConfig } from '../types';
import { getTariffs, saveTariffs } from '../services/db';
import { Save, Loader2, CheckCircle2, Gauge, Coins, Plus, Trash2, Tag, Layers, Globe } from 'lucide-react';
import { useLanguage, Language } from '../i18n';

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
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2 text-slate-500 text-sm">
          <span>{t.settings.settingsFor}</span>
          <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{currentObject.name}</span>
        </div>

        {/* Language Selector */}
        <div className="flex items-center space-x-2 bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
            <Coins className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t.settings.standardTariffs}</h2>
              <p className="text-sm text-slate-500">{t.settings.standardTariffsDesc}</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Electricity */}
            <div className="group">
              <label className="block text-sm font-bold text-slate-700 mb-2">{t.calculator.electricity}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">₴</div>
                <input
                  type="number" step="0.01" required value={rates.electricityRate}
                  onChange={(e) => handleRateChange('electricityRate', e.target.value)}
                  className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">/ {t.common.units.kwh}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* Water */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t.settings.waterRate}</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">₴</div>
                  <input
                    type="number" step="0.01" required value={rates.waterRate}
                    onChange={(e) => handleRateChange('waterRate', e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">/ {t.common.units.m3}</span>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t.settings.waterSubFee}</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">₴</div>
                  <input
                    type="number" step="0.01" required value={rates.waterSubscriptionFee}
                    onChange={(e) => handleRateChange('waterSubscriptionFee', e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">{t.common.units.fixed}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* Gas */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t.settings.gasRate}</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">₴</div>
                  <input
                    type="number" step="0.01" required value={rates.gasRate}
                    onChange={(e) => handleRateChange('gasRate', e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">/ {t.common.units.m3}</span>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2">{t.settings.gasDistFee}</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">₴</div>
                  <input
                    type="number" step="0.01" required value={rates.gasDistributionFee}
                    onChange={(e) => handleRateChange('gasDistributionFee', e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">{t.common.units.fixed}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Fields Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
            <Layers className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">{t.settings.additionalServices}</h2>
              <p className="text-sm text-slate-500">{t.settings.additionalServicesDesc}</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* List Existing Custom Fields */}
            {rates.customFields.map((field) => (
              <div key={field.id} className="flex flex-col md:flex-row md:items-end gap-3 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1">{field.name} ({field.type === 'fee' ? t.settings.types.fee : t.settings.types.rate})</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">₴</div>
                    <input
                      type="number" step="0.01" required 
                      value={field.price}
                      onChange={(e) => handleCustomFieldPriceChange(field.id, e.target.value)}
                      className="block w-full pl-8 pr-12 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-slate-50"
                    />
                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                      <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">
                        {field.type === 'rate' ? `/ ${field.unit}` : t.common.units.fixed}
                      </span>
                    </div>
                  </div>
                </div>
                {field.type === 'rate' && (
                   <div className="w-full md:w-32">
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t.settings.currentReading}</label>
                      <input 
                         type="number"
                         step="1"
                         value={rates.lastReadings[field.id] || 0}
                         onChange={(e) => handleReadingChange(field.id, e.target.value)}
                         className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 bg-slate-50"
                         placeholder="0"
                      />
                   </div>
                )}
                <button
                  type="button"
                  onClick={() => handleDeleteCustomField(field.id)}
                  className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors self-end"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))}

            {/* Add New Field Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center">
                <Plus className="h-4 w-4 mr-1" /> {t.settings.addService}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t.settings.serviceName}</label>
                    <input
                      type="text"
                      placeholder="e.g. Internet"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{t.settings.type}</label>
                    <select
                      value={newFieldType}
                      onChange={(e) => setNewFieldType(e.target.value as 'rate' | 'fee')}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="fee">{t.settings.types.fee}</option>
                      <option value="rate">{t.settings.types.rate}</option>
                    </select>
                  </div>
                </div>
                
                {/* Conditional Inputs based on Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                   {newFieldType === 'fee' ? (
                     <div className="md:col-span-3">
                        <label className="block text-xs font-medium text-slate-500 mb-1">{t.settings.feeAmount} (₴)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={newFieldPrice}
                          onChange={(e) => setNewFieldPrice(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                        />
                     </div>
                   ) : (
                     <>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">{t.settings.unit}</label>
                          <input
                            type="text"
                            placeholder="e.g. kWh"
                            value={newFieldUnit}
                            onChange={(e) => setNewFieldUnit(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">{t.settings.ratePrice} (₴)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={newFieldPrice}
                            onChange={(e) => setNewFieldPrice(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">{t.settings.startReading}</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={newFieldStartReading}
                            onChange={(e) => setNewFieldStartReading(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                          />
                        </div>
                     </>
                   )}
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomField}
                  disabled={!newFieldName}
                  className="w-full mt-2 bg-white text-slate-700 border border-slate-300 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 shadow-sm"
                >
                  {t.settings.addService}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Standard Meter Readings Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
            <Gauge className="h-5 w-5 text-indigo-600" />
             <div>
              <h2 className="text-lg font-bold text-slate-800">{t.settings.meterReadings}</h2>
              <p className="text-sm text-slate-500">{t.settings.meterReadingsDesc}</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.calculator.electricity} ({t.common.units.kwh})</label>
                  <input
                    type="number" step="1" required
                    value={rates.lastReadings.electricity}
                    onChange={(e) => handleReadingChange('electricity', e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.calculator.water} ({t.common.units.m3})</label>
                  <input
                    type="number" step="1" required
                    value={rates.lastReadings.water}
                    onChange={(e) => handleReadingChange('water', e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.calculator.gas} ({t.common.units.m3})</label>
                  <input
                    type="number" step="1" required
                    value={rates.lastReadings.gas}
                    onChange={(e) => handleReadingChange('gas', e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  />
                </div>
             </div>
          </div>
        </div>

        <div className="pt-2">
           {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-center text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.includes('success') && <CheckCircle2 className="h-4 w-4 mr-2" />}
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className={`w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-xl text-sm font-bold text-white shadow-md transition-all
            ${saving 
              ? 'bg-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
            }`}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> <span>{t.settings.saveButton}</span></>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
