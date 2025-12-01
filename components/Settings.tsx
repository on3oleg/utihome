
import React, { useState, useEffect } from 'react';
import { TariffRates, DEFAULT_TARIFFS, User, UserObject } from '../types';
import { getTariffs, saveTariffs } from '../services/db';
import { Save, Loader2, CheckCircle2, Gauge, Coins } from 'lucide-react';

interface SettingsProps {
  user: User;
  currentObject: UserObject;
}

const Settings: React.FC<SettingsProps> = ({ user, currentObject }) => {
  const [rates, setRates] = useState<TariffRates>(DEFAULT_TARIFFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        // FETCH BY OBJECT ID
        const data = await getTariffs(currentObject.id);
        if (data) {
           const mergedData = {
            ...DEFAULT_TARIFFS,
            ...data,
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

  const handleReadingChange = (field: keyof TariffRates['lastReadings'], value: string) => {
    setRates(prev => ({
      ...prev,
      lastReadings: {
        ...prev.lastReadings,
        [field]: parseFloat(value) || 0
      }
    }));
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // SAVE BY OBJECT ID
      await saveTariffs(currentObject.id, rates);
      setMessage("Settings updated successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage("Failed to save settings.");
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
      
      <div className="flex items-center space-x-2 text-slate-500 text-sm mb-4">
        <span>Settings for:</span>
        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{currentObject.name}</span>
      </div>

      <form onSubmit={handleSave} className="space-y-6">

        {/* Tariffs Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
            <Coins className="h-5 w-5 text-indigo-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Tariffs & Fees</h2>
              <p className="text-sm text-slate-500">Manage unit prices and fixed monthly fees.</p>
            </div>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Electricity */}
            <div className="group">
              <label className="block text-sm font-bold text-slate-700 mb-2">Electricity</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₴
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rates.electricityRate}
                  onChange={(e) => handleRateChange('electricityRate', e.target.value)}
                  className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">/ kWh</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* Water */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2">Water Rate</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₴
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rates.waterRate}
                    onChange={(e) => handleRateChange('waterRate', e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">/ m³</span>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2">Water Subscription Fee</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₴
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rates.waterSubscriptionFee}
                    onChange={(e) => handleRateChange('waterSubscriptionFee', e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">fixed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            {/* Gas */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2">Gas Rate</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₴
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rates.gasRate}
                    onChange={(e) => handleRateChange('gasRate', e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">/ m³</span>
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-bold text-slate-700 mb-2">Gas Distribution Fee</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-bold">
                    ₴
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={rates.gasDistributionFee}
                    onChange={(e) => handleRateChange('gasDistributionFee', e.target.value)}
                    className="block w-full pl-8 pr-12 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-slate-900 bg-slate-50 group-hover:bg-white"
                    placeholder="0.00"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded">fixed</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Meter Readings Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center space-x-3">
            <Gauge className="h-5 w-5 text-indigo-600" />
             <div>
              <h2 className="text-lg font-bold text-slate-800">Meter Readings</h2>
              <p className="text-sm text-slate-500">Initial or previous meter values.</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Electricity (kWh)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={rates.lastReadings.electricity}
                    onChange={(e) => handleReadingChange('electricity', e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Water (m³)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={rates.lastReadings.water}
                    onChange={(e) => handleReadingChange('water', e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-slate-900 bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gas (m³)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={rates.lastReadings.gas}
                    onChange={(e) => handleReadingChange('gas', e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-900 bg-slate-50"
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
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> <span>Save All Settings</span></>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
