import React, { useEffect, useState } from 'react';
import { BillRecord, User, UserObject } from '../types';
import { subscribeToHistory } from '../services/db';
import { Calendar, ChevronDown, ChevronUp, Zap, Droplets, Flame, TrendingUp, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { IonSpinner } from '@ionic/react';
import { useLanguage } from '../i18n';

interface HistoryProps {
  user: User;
  currentObject: UserObject;
}

const History: React.FC<HistoryProps> = ({ user, currentObject }) => {
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToHistory(currentObject.id, (data) => {
      setBills(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [currentObject.id]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatFullCurrency = (val: number) => {
    return val.toLocaleString('uk-UA', { style: 'currency', currency: 'UAH' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <IonSpinner color="primary" />
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="text-center py-20 px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700">{t.history.noHistory}</h3>
        <p className="text-slate-500 mt-2 max-w-xs mx-auto">
          {t.history.noHistoryDesc} <strong>{currentObject.name}</strong> {t.history.toSeeTracking}
        </p>
      </div>
    );
  }

  const chartData = [...bills].reverse().map(bill => {
    const customTotal = bill.customRecords?.reduce((acc, curr) => acc + curr.cost, 0) || 0;
    return {
      date: new Date(bill.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      [t.history.electricity]: bill.breakdown.electricityCost,
      [t.history.water]: bill.breakdown.waterCost + bill.breakdown.waterSubscriptionFee,
      [t.history.gas]: bill.breakdown.gasCost + bill.breakdown.gasDistributionFee,
      [t.history.services]: customTotal
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Chart Section */}
      <section className="bg-white rounded-3xl p-4 border border-slate-100">
         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">{t.history.costBreakdown}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px'}} 
                  formatter={(value: number) => [formatFullCurrency(value)]} 
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '11px', color: '#64748b'}} />
                <Bar dataKey={t.history.electricity} stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey={t.history.water} stackId="a" fill="#06b6d4" />
                <Bar dataKey={t.history.gas} stackId="a" fill="#f97316" />
                <Bar dataKey={t.history.services} stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
      </section>

      {/* List Section */}
      <section className="space-y-3">
        {bills.map((bill) => (
          <div key={bill.id} className="bg-transparent overflow-hidden">
            <button 
              onClick={() => toggleExpand(bill.id!)} 
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-200 ${expandedId === bill.id ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-100'}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${expandedId === bill.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                   <Calendar className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">{new Date(bill.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-xs text-slate-400 font-medium">{new Date(bill.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-extrabold text-slate-900 text-lg">{Math.round(bill.totalCost).toLocaleString()} <span className="text-sm font-normal text-slate-400">₴</span></span>
                {expandedId === bill.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </div>
            </button>

            {expandedId === bill.id && (
              <div className="pt-2 px-2 pb-4 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2 duration-200">
                
                {/* Standard Cards */}
                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <Zap className="h-5 w-5 text-blue-500"/>
                      <span className="text-sm font-bold text-slate-700">{t.calculator.electricity}</span>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-slate-900">{formatFullCurrency(bill.breakdown.electricityCost)}</p>
                       <p className="text-xs text-slate-400">{bill.electricityConsumption} {t.common.units.kwh}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <Droplets className="h-5 w-5 text-cyan-500"/>
                      <span className="text-sm font-bold text-slate-700">{t.calculator.water}</span>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-slate-900">{formatFullCurrency(bill.breakdown.waterCost + bill.breakdown.waterSubscriptionFee)}</p>
                       <p className="text-xs text-slate-400">{bill.waterConsumption} {t.common.units.m3}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <Flame className="h-5 w-5 text-orange-500"/>
                      <span className="text-sm font-bold text-slate-700">{t.calculator.gas}</span>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-slate-900">{formatFullCurrency(bill.breakdown.gasCost + bill.breakdown.gasDistributionFee)}</p>
                       <p className="text-xs text-slate-400">{bill.gasConsumption} {t.common.units.m3}</p>
                    </div>
                </div>

                {/* Custom Records */}
                {(bill.customRecords || []).map((rec) => (
                   <div key={rec.fieldId} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-3">
                      <Layers className="h-5 w-5 text-purple-500"/>
                      <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{rec.name}</span>
                    </div>
                    <div className="text-right">
                       <p className="text-sm font-bold text-slate-900">{formatFullCurrency(rec.cost)}</p>
                       <p className="text-xs text-slate-400">
                        {rec.type === 'rate' ? `${rec.consumption ?? 0} ${rec.unit}` : t.history.fixed}
                       </p>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
};

export default History;