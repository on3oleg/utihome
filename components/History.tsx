
import React, { useEffect, useState } from 'react';
import { BillRecord, User, UserObject } from '../types';
import { subscribeToHistory } from '../services/db';
import { Loader2, Calendar, ChevronDown, ChevronUp, Zap, Droplets, Flame, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface HistoryProps {
  user: User;
  currentObject: UserObject;
}

const History: React.FC<HistoryProps> = ({ user, currentObject }) => {
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    // SUBSCRIBE TO OBJECT ID
    const unsubscribe = subscribeToHistory(currentObject.id, (data) => {
      setBills(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [currentObject.id]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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

  if (bills.length === 0) {
    return (
      <div className="text-center py-20 px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="mx-auto h-24 w-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-700">No History Yet</h3>
        <p className="text-slate-500 mt-2 max-w-xs mx-auto">
          Calculate and save your first bill for <strong>{currentObject.name}</strong> to see tracking here.
        </p>
      </div>
    );
  }

  // Format data for chart (reverse to show chronological order left-to-right)
  const chartData = [...bills].reverse().map(bill => ({
    date: new Date(bill.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    total: bill.totalCost
  }));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center space-x-2 text-slate-500 text-sm">
        <span>History for:</span>
        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{currentObject.name}</span>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-6">Cost Trend</h3>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{fontSize: 12, fill: '#64748b'}}
                dy={10}
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}
                formatter={(value: number) => [formatCurrency(value), 'Total']}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#4f46e5" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* List Section */}
      <div className="space-y-3">
        {bills.map((bill) => (
          <div 
            key={bill.id} 
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300"
          >
            <button 
              onClick={() => toggleExpand(bill.id!)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="bg-indigo-50 p-2.5 rounded-lg text-indigo-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-800">
                    {new Date(bill.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(bill.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-bold text-slate-900 text-lg">
                  {formatCurrency(bill.totalCost)}
                </span>
                {expandedId === bill.id ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
              </div>
            </button>

            {/* Expanded Details */}
            {expandedId === bill.id && (
              <div className="bg-slate-50 border-t border-slate-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200">
                
                {/* Electricity */}
                <div className="flex flex-col p-3 bg-white rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Electricity</span>
                    </div>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                      {bill.electricityConsumption} kWh
                    </span>
                  </div>
                  <div className="text-right border-t border-slate-50 pt-2 mt-auto">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(bill.breakdown.electricityCost)}</p>
                  </div>
                </div>

                {/* Water */}
                <div className="flex flex-col p-3 bg-white rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Droplets className="h-4 w-4 text-cyan-500" />
                      <span className="text-sm font-medium">Water</span>
                    </div>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                      {bill.waterConsumption} m³
                    </span>
                  </div>
                  <div className="space-y-1 text-right border-t border-slate-50 pt-2 mt-auto">
                    <div className="flex justify-between text-xs text-slate-400">
                       <span>Usage</span>
                       <span>{formatCurrency(bill.breakdown.waterCost)}</span>
                    </div>
                    {/* Check if fee exists for backward compatibility */}
                    {(bill.breakdown.waterSubscriptionFee > 0) && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Fixed</span>
                        <span>{formatCurrency(bill.breakdown.waterSubscriptionFee)}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold text-slate-900 border-t border-dashed border-slate-100 pt-1">
                      {formatCurrency(bill.breakdown.waterCost + (bill.breakdown.waterSubscriptionFee || 0))}
                    </p>
                  </div>
                </div>

                {/* Gas */}
                <div className="flex flex-col p-3 bg-white rounded-lg border border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2 text-slate-600">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium">Gas</span>
                    </div>
                    <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                      {bill.gasConsumption} m³
                    </span>
                  </div>
                   <div className="space-y-1 text-right border-t border-slate-50 pt-2 mt-auto">
                    <div className="flex justify-between text-xs text-slate-400">
                       <span>Usage</span>
                       <span>{formatCurrency(bill.breakdown.gasCost)}</span>
                    </div>
                    {(bill.breakdown.gasDistributionFee > 0) && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Fixed</span>
                        <span>{formatCurrency(bill.breakdown.gasDistributionFee)}</span>
                      </div>
                    )}
                    <p className="text-sm font-bold text-slate-900 border-t border-dashed border-slate-100 pt-1">
                      {formatCurrency(bill.breakdown.gasCost + (bill.breakdown.gasDistributionFee || 0))}
                    </p>
                  </div>
                </div>

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
