import React, { useEffect, useState } from 'react';
import { BillRecord, User, UserObject } from '../types';
import { subscribeToHistory } from '../services/db';
import { Calendar, ChevronDown, ChevronUp, Zap, Droplets, Flame, TrendingUp, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonSpinner } from '@ionic/react';
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      <IonCard className="m-0 shadow-none border border-slate-200 rounded-2xl">
        <IonCardHeader>
           <IonCardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{t.history.costBreakdown}</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} 
                  formatter={(value: number) => [formatFullCurrency(value)]} 
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px', fontSize: '12px'}} />
                <Bar dataKey={t.history.electricity} stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey={t.history.water} stackId="a" fill="#06b6d4" />
                <Bar dataKey={t.history.gas} stackId="a" fill="#f97316" />
                <Bar dataKey={t.history.services} stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </IonCardContent>
      </IonCard>

      <div className="space-y-3">
        {bills.map((bill) => (
          <div key={bill.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
            <button onClick={() => toggleExpand(bill.id!)} className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600"><Calendar className="h-5 w-5" /></div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">{new Date(bill.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-xs text-slate-500">{new Date(bill.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-900 text-lg">{formatFullCurrency(bill.totalCost)}</span>
                {expandedId === bill.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </div>
            </button>

            {expandedId === bill.id && (
              <div className="bg-slate-50 border-t border-slate-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                
                {/* Standard Cards */}
                <div className="flex flex-col p-3 bg-white rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2 text-slate-600"><Zap className="h-4 w-4 text-blue-500"/><span className="text-sm font-medium">{t.calculator.electricity}</span></div>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{bill.electricityConsumption} {t.common.units.kwh}</span>
                  </div>
                  <div className="text-right border-t border-slate-50 pt-2 mt-auto">
                    <p className="text-sm font-bold text-slate-900">{formatFullCurrency(bill.breakdown.electricityCost)}</p>
                  </div>
                </div>

                <div className="flex flex-col p-3 bg-white rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2 text-slate-600"><Droplets className="h-4 w-4 text-cyan-500"/><span className="text-sm font-medium">{t.calculator.water}</span></div>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{bill.waterConsumption} {t.common.units.m3}</span>
                  </div>
                  <div className="text-right border-t border-slate-50 pt-2 mt-auto">
                     <p className="text-sm font-bold text-slate-900">{formatFullCurrency(bill.breakdown.waterCost + bill.breakdown.waterSubscriptionFee)}</p>
                  </div>
                </div>

                <div className="flex flex-col p-3 bg-white rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2 text-slate-600"><Flame className="h-4 w-4 text-orange-500"/><span className="text-sm font-medium">{t.calculator.gas}</span></div>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{bill.gasConsumption} {t.common.units.m3}</span>
                  </div>
                  <div className="text-right border-t border-slate-50 pt-2 mt-auto">
                     <p className="text-sm font-bold text-slate-900">{formatFullCurrency(bill.breakdown.gasCost + bill.breakdown.gasDistributionFee)}</p>
                  </div>
                </div>

                {/* Custom Records */}
                {bill.customRecords?.map(rec => (
                   <div key={rec.fieldId} className="flex flex-col p-3 bg-white rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2 text-slate-600">
                        <Layers className="h-4 w-4 text-purple-500"/>
                        <span className="text-sm font-medium truncate">{rec.name}</span>
                      </div>
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                        {rec.type === 'rate' ? `${rec.consumption} ${rec.unit}` : t.history.fixed}
                      </span>
                    </div>
                    <div className="text-right border-t border-slate-50 pt-2 mt-auto">
                      <p className="text-sm font-bold text-slate-900">{formatFullCurrency(rec.cost)}</p>
                    </div>
                  </div>
                ))}

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;