"use client";

import { useMemo, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    BarChart3,
    TrendingUp,
    ArrowUpRight,
    Clock,
    CreditCard,
    Truck,
    ChevronRight,
    Plus,
    Wallet,
    DollarSign,
    ExternalLink,
    ArrowLeft,
    Calendar,
    FileText,
    Search,
    ChevronDown,
    Save,
    Edit,
    X
} from 'lucide-react';
import BoostingCostView from './BoostingCostView';
import AddBoostingModal from './AddBoostingModal';

interface Order {
    id: string;
    order_number: string;
    order_status: string;
    total_amount: number;
    courier_provider: string;
    logistic_name?: string;
    courier_delivery_fee?: number;
    delivery_charge?: number;
    created_at: string;
    delivery_branch?: string;
    customer_name?: string;
    phone_number?: string;
    price_changelog?: any[];
    status_history?: any[];
}

interface Settlement {
    id: string;
    logistic_id: string;
    amount: number;
    date: string;
    remarks: string;
    created_at?: string;
}

interface FinanceViewProps {
    orders: Order[];
}

// Logistics list moved outside to prevent infinite re-render loops
const LOGISTICS = [
    { id: 'ncm', name: 'Nepal Can Move', color: 'blue', providerKey: 'ncm' },
    { id: 'pathao', name: 'Pathao', color: 'red', providerKey: 'pathao' },
    { id: 'pickdrop', name: 'Pick & Drop', color: 'orange', providerKey: 'pickdrop' },
    { id: 'local', name: 'Local', color: 'emerald', providerKey: 'local' },
    { id: 'self', name: 'Self Delivery', color: 'teal', providerKey: 'self' }
];

export default function FinanceView({ orders }: FinanceViewProps) {
    const [selectedLogistic, setSelectedLogistic] = useState<any>(null);
    const [isAddBoostingOpen, setIsAddBoostingOpen] = useState(false);
    const [isBoostingDetailOpen, setIsBoostingDetailOpen] = useState(false);
    const [allSettlements, setAllSettlements] = useState<Record<string, Settlement[]>>({});
    const [adsSpends, setAdsSpends] = useState<any[]>([]);
    const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);
    const [adsMainTab, setAdsMainTab] = useState<'ads' | 'profit'>('ads');
    const [dailyProfitData, setDailyProfitData] = useState<any[]>([]);
    const [viewingDailyBreakdown, setViewingDailyBreakdown] = useState<any>(null);
    const [isLoadingProfit, setIsLoadingProfit] = useState(false);


    const fetchAdsSpends = useCallback(async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/spends`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                setAdsSpends(res.data.data.slice(0, 3));
            }
        } catch (error) {
            console.error('Failed to fetch ads spends:', error);
        }
    }, []);

    const fetchAllSettlements = useCallback(async () => {
        setIsLoadingSettlements(true);
        try {
            const results: Record<string, Settlement[]> = {};
            await Promise.all(LOGISTICS.map(async (log: any) => {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/cod-settlements/${log.id}`);
                if (res.data.success) {
                    results[log.id] = res.data.data;
                }
            }));
            setAllSettlements(results);
        } catch (error) {
            console.error('Failed to fetch settlements:', error);
        } finally {
            setIsLoadingSettlements(false);
        }
    }, [LOGISTICS]);

    const fetchDailyProfitAnalysis = useCallback(async () => {
        setIsLoadingProfit(true);
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/daily-profit-analysis`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (res.data.success) {
                setDailyProfitData(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch daily profit analysis:', error);
        } finally {
            setIsLoadingProfit(false);
        }
    }, []);

    useEffect(() => {
        fetchAdsSpends();
        fetchAllSettlements();
        fetchDailyProfitAnalysis();
    }, [fetchAdsSpends, fetchAllSettlements, fetchDailyProfitAnalysis]);

    const refreshLogisticSettlements = useCallback(async (logisticId: string) => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/cod-settlements/${logisticId}`);
            if (res.data.success) {
                setAllSettlements(prev => ({ ...prev, [logisticId]: res.data.data }));
            }
        } catch (error) {
            console.error('Failed to refresh settlements:', error);
        }
    }, []);

    // Calculate metrics per logistic (Dashboard view) - Aligned with Detail View logic
    const logisticStats = useMemo(() => {
        const stats: Record<string, any> = {};
        const pendingStatuses = ['shipped', 'arrived at branch', 'delivery process', 'delivery failed', 'hold', 'return process'];

        LOGISTICS.forEach((log: any) => {
            const logOrders = orders.filter(o => (o.courier_provider === log.id || o.courier_provider === log.providerKey));

            // 1. Pending Value (Sum of transit/failed orders)
            const pendingValue = logOrders
                .filter(o => pendingStatuses.includes(o.order_status?.toLowerCase()))
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            // 2. Delivery Charges (Sum only for delivered orders)
            const deliveryCharges = logOrders
                .filter(o => o.order_status?.toLowerCase() === 'delivered')
                .reduce((sum, o) => sum + Number(o.courier_delivery_fee || o.delivery_charge || 0), 0);

            // 3. Last COD Amount (From lifted settlement state)
            const settlements = allSettlements[log.id] || [];
            const lastCodAmount = settlements[0] ? Number(settlements[0].amount) : 0;

            // 4. Pending COD = (Delivered Orders Amt - Deliv Charges) - Last COD
            const deliveredOrdersAmt = logOrders
                .filter(o => o.order_status?.toLowerCase() === 'delivered')
                .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

            const pendingCod = (deliveredOrdersAmt - deliveryCharges) - lastCodAmount;

            stats[log.id] = {
                pendingValue,
                pendingCod,
                deliveryCharges,
                lastCodAmount
            };
        });

        return stats;
    }, [orders, allSettlements, LOGISTICS]);

    // Find logistic with highest pending value
    const highestPendingLogistic = useMemo(() => {
        let maxVal = -1;
        let maxId = '';
        LOGISTICS.forEach((log: any) => {
            if (logisticStats[log.id].pendingValue > maxVal) {
                maxVal = logisticStats[log.id].pendingValue;
                maxId = log.id;
            }
        });
        return maxId;
    }, [logisticStats]);

    const sortedLogistics = useMemo(() => {
        return [...LOGISTICS].sort((a: any, b: any) => (logisticStats[b.id]?.pendingCod || 0) - (logisticStats[a.id]?.pendingCod || 0));
    }, [logisticStats]);

    if (isBoostingDetailOpen) {
        return (
            <BoostingCostView
                onBack={() => setIsBoostingDetailOpen(false)}
            />
        );
    }

    if (selectedLogistic) {
        return (
            <LogisticDetailView
                logistic={selectedLogistic}
                orders={orders}
                settlements={allSettlements[selectedLogistic.id] || []}
                onBack={() => setSelectedLogistic(null)}
                onSettlementAdded={() => refreshLogisticSettlements(selectedLogistic.id)}
            />
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                        <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={24} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Finance Dashboard</h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 active:scale-95 opacity-50 cursor-not-allowed"
                        title="Select a logistic partner first"
                    >
                        <Plus size={18} />
                        Add Settlement
                    </button>
                    <button
                        onClick={() => setIsAddBoostingOpen(true)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        <TrendingUp size={18} />
                        Add Boosting Cost
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto space-y-8">

                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <Truck className="text-blue-500" size={20} /> Logistic Finance
                            </h2>
                            <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                View Overall Report <ArrowUpRight size={12} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {sortedLogistics.map(log => {
                                const stats = logisticStats[log.id];
                                const isHighest = log.id === highestPendingLogistic;

                                return (
                                    <div
                                        key={log.id}
                                        className={`bg-white dark:bg-slate-800 border ${isHighest ? 'border-blue-400 dark:border-blue-500 shadow-xl shadow-blue-500/5 ring-1 ring-blue-500/20' : 'border-gray-200 dark:border-slate-700 shadow-sm'} rounded-2xl overflow-hidden transition-all hover:shadow-md`}
                                    >
                                        <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-inner ${log.color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                                    log.color === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                                                        log.color === 'orange' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600' :
                                                            log.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                                                                'bg-teal-100 dark:bg-teal-900/30 text-teal-600'
                                                    }`}>
                                                    {log.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                                        {log.name}
                                                        {isHighest && (
                                                            <span className="bg-blue-600 text-[9px] text-white px-1.5 py-0.5 rounded-full uppercase tracking-widest font-black">Top Pending</span>
                                                        )}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">Settlement overview for {log.name}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedLogistic(log)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all text-xs font-bold text-slate-600 dark:text-slate-300 border border-transparent hover:border-gray-200 dark:hover:border-slate-600 shadow-sm"
                                            >
                                                View More <ChevronRight size={14} />
                                            </button>
                                        </div>
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <MetricCard
                                                label="Pending Value"
                                                amount={stats.pendingValue}
                                                icon={<Wallet className="text-blue-500" size={16} />}
                                                color="blue"
                                            />
                                            <MetricCard
                                                label="Pending COD"
                                                amount={stats.pendingCod}
                                                icon={<DollarSign className="text-orange-500" size={16} />}
                                                color="orange"
                                            />
                                            <MetricCard
                                                label="Delivery Charges"
                                                amount={stats.deliveryCharges}
                                                icon={<Truck className="text-red-500" size={16} />}
                                                color="red"
                                            />
                                            <MetricCard
                                                label="Last Cod Amount"
                                                amount={stats.lastCodAmount}
                                                icon={<CreditCard className="text-emerald-500" size={16} />}
                                                color="emerald"
                                                isMock
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-6">
                                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <TrendingUp className="text-emerald-500" size={20} /> Ads & Profit Management
                                </h2>
                                <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-xl">
                                    <button
                                        onClick={() => setAdsMainTab('ads')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${adsMainTab === 'ads' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Ads Management
                                    </button>
                                    <button
                                        onClick={() => setAdsMainTab('profit')}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${adsMainTab === 'profit' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        Profit Management
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsBoostingDetailOpen(true)}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 group"
                            >
                                View More <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </div>

                        {adsMainTab === 'ads' ? (
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                <div className="p-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                                <th className="px-8 py-3">Date</th>
                                                <th className="px-8 py-3">Campaign Name</th>
                                                <th className="px-8 py-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                            {adsSpends.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-8 py-8 text-center text-slate-400 text-xs italic">
                                                        No ads spend records found.
                                                    </td>
                                                </tr>
                                            ) : adsSpends.map((spend) => (
                                                <tr key={spend.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors">
                                                    <td className="px-8 py-3 text-xs font-bold text-slate-500">{spend.date}</td>
                                                    <td className="px-8 py-3 text-xs font-black text-indigo-600">{spend.ads_campaigns?.name || 'Unknown'}</td>
                                                    <td className="px-8 py-3 text-sm font-black text-slate-900 dark:text-white text-right">Rs. {Number(spend.amount).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-8 shadow-sm text-center">
                                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <DollarSign className="text-emerald-600" size={24} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">Profit Management</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-sm mx-auto">
                                    The Profit Management system is coming soon. You'll be able to track your net profit margins and financial performance here.
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Profit Analysis Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <DollarSign className="text-indigo-500" size={20} /> Profit Analysis
                            </h2>
                            <button 
                                onClick={fetchDailyProfitAnalysis}
                                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                            >
                                Refresh Data <Clock size={12} />
                            </button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                            <div className="space-y-4">
                                {isLoadingProfit ? (
                                    <div className="py-20 text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Calculating Profits...</p>
                                    </div>
                                ) : dailyProfitData.length === 0 ? (
                                    <div className="py-20 text-center text-slate-400 italic text-sm">
                                        No profit data available for the last 60 days.
                                    </div>
                                ) : (
                                    dailyProfitData.slice(0, 7).map((day, i) => (
                                        <div key={day.date} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-900/30 rounded-2xl border border-gray-100 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-800 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                                                    <Calendar size={18} className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-500">{new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">Daily Profit Summary</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Net Profit</p>
                                                    <p className={`text-lg font-black ${day.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {day.totalProfit >= 0 ? '' : '-'} Rs. {Math.abs(Math.round(day.totalProfit)).toLocaleString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => setViewingDailyBreakdown(day)}
                                                    className="px-4 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                                                >
                                                    View Breakdown
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                {dailyProfitData.length > 7 && (
                                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest pt-2">Showing last 7 days only</p>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            {/* Daily Profit Breakdown Modal */}
            {viewingDailyBreakdown && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/30">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Daily Breakdown</h2>
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1">
                                    {new Date(viewingDailyBreakdown.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <button 
                                onClick={() => setViewingDailyBreakdown(null)}
                                className="p-3 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {Object.values(viewingDailyBreakdown.campaignBreakdown).map((camp: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-900/30 rounded-2xl border border-gray-100 dark:border-slate-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border border-gray-100 dark:border-slate-700">
                                                <TrendingUp size={14} className="text-indigo-500" />
                                            </div>
                                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{camp.name}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-base font-black ${camp.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {camp.profit >= 0 ? '+' : '-'} Rs. {Math.abs(Math.round(camp.profit)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Daily Profit</span>
                            <span className={`text-2xl font-black ${viewingDailyBreakdown.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {viewingDailyBreakdown.totalProfit >= 0 ? '' : '-'} Rs. {Math.abs(Math.round(viewingDailyBreakdown.totalProfit)).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function LogisticDetailView({ logistic, orders, settlements, onBack, onSettlementAdded }: {
    logistic: any,
    orders: Order[],
    settlements: Settlement[],
    onBack: () => void,
    onSettlementAdded: () => void
}) {
    const [activeTab, setActiveTab] = useState<'orders' | 'cod' | 'changelogs'>('orders');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;
    const [isAddCodOpen, setIsAddCodOpen] = useState(false);
    const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
    const [isEditSettlementOpen, setIsEditSettlementOpen] = useState(false);
    const [changelogs, setChangelogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [newCod, setNewCod] = useState({ amount: '', date: new Date().toISOString().split('T')[0], remarks: '' });

    // Reset page on filter or tab change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, activeTab]);

    const excludedStatuses = ['new order', 'confirmed order', 'confirm order', 'packed', 'cancelled', 'cancel', 'canceled'];

    const logisticOrders = useMemo(() => {
        return orders.filter(o =>
            (o.courier_provider === logistic.id || o.courier_provider === logistic.providerKey) &&
            !excludedStatuses.includes(o.order_status?.toLowerCase())
        );
    }, [orders, logistic]);

    const filteredOrders = useMemo(() => {
        if (statusFilter === 'ALL') return logisticOrders;
        return logisticOrders.filter(o => o.order_status?.toLowerCase() === statusFilter.toLowerCase());
    }, [logisticOrders, statusFilter]);

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredOrders.slice(start, start + pageSize);
    }, [filteredOrders, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredOrders.length / pageSize);

    const fetchChangelogs = useCallback(async () => {
        setIsLoadingLogs(true);
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/order-changelogs/${logistic.id}`);
            if (res.data.success) {
                setChangelogs(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch changelogs:', error);
        } finally {
            setIsLoadingLogs(false);
        }
    }, [logistic.id]);

    useEffect(() => {
        if (activeTab === 'changelogs') {
            fetchChangelogs();
        }
    }, [activeTab, fetchChangelogs]);

    const calculations = useMemo(() => {
        const orderValue = logisticOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const deliveredOrders = logisticOrders.filter(o => o.order_status?.toLowerCase() === 'delivered');
        const deliveredValueTotalAmt = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const returnDeliveredValue = logisticOrders
            .filter(o => o.order_status?.toLowerCase() === 'return delivered')
            .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        const pendingStatuses = ['shipped', 'arrived at branch', 'delivery process', 'delivery failed', 'hold', 'return process'];
        const pendingValue = logisticOrders
            .filter(o => pendingStatuses.includes(o.order_status?.toLowerCase()))
            .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        const pendingQty = logisticOrders
            .filter(o => pendingStatuses.includes(o.order_status?.toLowerCase()))
            .length;

        const totalDeliveryCharges = logisticOrders
            .filter(o => o.order_status?.toLowerCase() === 'delivered')
            .reduce((sum, o) => sum + Number(o.courier_delivery_fee || o.delivery_charge || 0), 0);

        const deliveredValue = deliveredValueTotalAmt - totalDeliveryCharges;
        const lastSettlement = settlements[0];
        const lastCodDate = lastSettlement ? new Date(lastSettlement.date).toLocaleDateString() : 'N/A';
        const lastCodAmount = lastSettlement ? Number(lastSettlement.amount) : 0;
        const pendingCod = deliveredValue - lastCodAmount;

        const packedOrders = orders.filter(o =>
            (o.courier_provider === logistic.id || o.courier_provider === logistic.providerKey) &&
            o.order_status?.toLowerCase() === 'packed'
        );
        const packedValue = packedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

        const nonDeliveredEstCharge = logisticOrders
            .filter(o => o.order_status?.toLowerCase() !== 'delivered' && o.order_status?.toLowerCase() !== 'return delivered')
            .reduce((sum, o) => sum + Number(o.courier_delivery_fee || o.delivery_charge || 0), 0);

        // Today's Stats
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

        let todayOrders = 0;
        let todayDeliveredOrders = 0;
        let todayDeliveredAmount = 0;
        let todayDeliveryCharge = 0;
        let todayRtvOrders = 0;

        logisticOrders.forEach(order => {
            const history = order.status_history || [];
            history.forEach((h: any) => {
                const changeTime = new Date(h.changed_at).getTime();
                if (changeTime >= startOfToday && changeTime < endOfToday) {
                    const status = h.status?.toLowerCase();
                    if (status === 'shipped') {
                        todayOrders++;
                    } else if (status === 'delivered') {
                        todayDeliveredOrders++;
                        todayDeliveredAmount += Number(order.total_amount || 0);
                        todayDeliveryCharge += Number(order.courier_delivery_fee || order.delivery_charge || 0);
                    } else if (status === 'return delivered') {
                        todayRtvOrders++;
                    }
                }
            });
        });

        return {
            orderValue,
            deliveredValue,
            returnDeliveredValue,
            pendingValue,
            lastCodDate,
            lastCodAmount,
            pendingCod,
            totalDeliveryCharges,
            packedValue,
            nonDeliveredEstCharge,
            todayOrders,
            todayDeliveredOrders,
            todayDeliveredAmount,
            todayDeliveryCharge,
            netAmount: todayDeliveredAmount - todayDeliveryCharge,
            todayRtvOrders,
            pendingQty
        };
    }, [logisticOrders, settlements, orders, logistic]);

    const handleSaveCod = async () => {
        if (!newCod.amount || !newCod.date) return;
        try {
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/logistics/cod-settlements`, {
                logisticId: logistic.id,
                ...newCod
            });
            setIsAddCodOpen(false);
            setNewCod({ amount: '', date: new Date().toISOString().split('T')[0], remarks: '' });
            onSettlementAdded();
        } catch (error) {
            console.error('Failed to save settlement:', error);
        }
    };

    const handleUpdateCod = async () => {
        if (!editingSettlement) return;
        try {
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/logistics/cod-settlements/${editingSettlement.id}`, {
                amount: Number(editingSettlement.amount),
                date: editingSettlement.date,
                remarks: editingSettlement.remarks
            });
            setIsEditSettlementOpen(false);
            setEditingSettlement(null);
            onSettlementAdded();
        } catch (error) {
            console.error('Failed to update settlement:', error);
        }
    };

    const canEditSettlement = (createdAt?: string) => {
        if (!createdAt) return false;
        const createdDate = new Date(createdAt).getTime();
        const now = new Date().getTime();
        const diffHours = (now - createdDate) / (1000 * 60 * 60);
        return diffHours <= 24;
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-all text-slate-500">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{logistic.name} Details</h1>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Logistic Finance & Settlements</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-[1600px] mx-auto space-y-8">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Value Compartment */}
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-2">
                                <Wallet className="text-indigo-500" size={16} /> Value
                            </h3>
                            <div className="space-y-3">
                                <MetricLine label="Order Value" value={`Rs. ${calculations.orderValue.toLocaleString()}`} subValue={calculations.packedValue > 0 ? `(Packed: Rs. ${calculations.packedValue.toLocaleString()})` : undefined} />
                                <MetricLine label="Delivered Value" value={`Rs. ${calculations.deliveredValue.toLocaleString()}`} valueColor="text-emerald-600" />
                                <MetricLine label="Returned Value" value={`Rs. ${calculations.returnDeliveredValue.toLocaleString()}`} valueColor="text-red-500" />
                                <MetricLine label="Pending Value" value={`Rs. ${calculations.pendingValue.toLocaleString()}`} valueColor="text-orange-500" subValue={`(Pending Qty: ${calculations.pendingQty})`} />
                            </div>
                        </div>

                        {/* COD Info Compartment */}
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-2">
                                <CreditCard className="text-emerald-500" size={16} /> COD Info
                            </h3>
                            <div className="space-y-3">
                                <MetricLine label="Last Cod Date" value={calculations.lastCodDate} textSize="text-base" />
                                <MetricLine label="Last Cod Amount" value={`Rs. ${calculations.lastCodAmount.toLocaleString()}`} valueColor="text-indigo-600" textSize="text-base" />
                                <MetricLine label="Pending Cod" value={`Rs. ${calculations.pendingCod.toLocaleString()}`} valueColor="text-orange-600" textSize="text-base" />
                                <MetricLine
                                    label="Total Delivery Charges"
                                    value={`Rs. ${calculations.totalDeliveryCharges.toLocaleString()}`}
                                    subValue={calculations.nonDeliveredEstCharge > 0 ? `(Other: Rs. ${calculations.nonDeliveredEstCharge.toLocaleString()})` : undefined}
                                    valueColor="text-red-600"
                                    textSize="text-base"
                                />
                            </div>
                        </div>

                        {/* Today Details Compartment */}
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-700 pb-2">
                                <Clock className="text-blue-500" size={16} /> Today Details
                            </h3>
                            <div className="space-y-3">
                                <MetricLine label="Today's Order" value={calculations.todayOrders} />
                                <MetricLine label="Today's Delivered Orders" value={calculations.todayDeliveredOrders} valueColor="text-emerald-600" />
                                <MetricLine label="Today's Delivered Amount" value={`Rs. ${calculations.todayDeliveredAmount.toLocaleString()}`} valueColor="text-emerald-600" />
                                <MetricLine label="Today's Delivery Charge" value={`Rs. ${calculations.todayDeliveryCharge.toLocaleString()}`} valueColor="text-red-500" />
                                <MetricLine label="Net Amount" value={`Rs. ${calculations.netAmount.toLocaleString()}`} valueColor="text-emerald-700 font-extrabold underline decoration-emerald-500/30" />
                                <MetricLine label="Today's RTV Delivered Orders" value={calculations.todayRtvOrders} valueColor="text-purple-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                        <div className="px-8 py-5 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between bg-gray-50/30 dark:bg-slate-800/50">
                            <div className="flex p-1 bg-gray-200/50 dark:bg-slate-900/50 rounded-2xl">
                                <button onClick={() => setActiveTab('orders')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'orders' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Order List</button>
                                <button onClick={() => setActiveTab('cod')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'cod' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>COD Details</button>
                                <button onClick={() => setActiveTab('changelogs')} className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'changelogs' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Order Changelogs</button>
                            </div>

                            {activeTab === 'orders' ? (
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-10 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 ring-indigo-500/10 outline-none pr-10">
                                            <option value="ALL">ALL Status</option>
                                            <option value="Shipped">Shipped</option>
                                            <option value="Arrived at Branch">Arrived at Branch</option>
                                            <option value="Delivery Process">Delivery Process</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Delivery Failed">Delivery Failed</option>
                                            <option value="Hold">Hold</option>
                                            <option value="Return Process">Return Process</option>
                                            <option value="Return Delivered">Return Delivered</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            ) : activeTab === 'cod' ? (
                                <button onClick={() => setIsAddCodOpen(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95">
                                    <Plus size={18} /> Add COD
                                </button>
                            ) : null}
                        </div>

                        <div className="overflow-x-auto min-h-[400px]">
                            {activeTab === 'orders' ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                            <th className="px-6 py-4">#</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Order ID</th>
                                            <th className="px-6 py-4">Branch</th>
                                            <th className="px-6 py-4">Customer</th>
                                            <th className="px-6 py-4">Phone</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Est. Charge</th>
                                            <th className="px-6 py-4">Balance</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                        {paginatedOrders.map((order, idx) => (
                                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{(currentPage - 1) * pageSize + idx + 1}</td>
                                                <td className="px-6 py-4 text-xs text-slate-500 font-medium">{new Date(order.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-xs font-black text-indigo-600 dark:text-indigo-400">{order.order_number}</td>
                                                <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-300 font-bold">
                                                    {(order as any).delivery_branch || (order as any).city_name || 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-300 font-bold max-w-[120px] truncate">{order.customer_name}</td>
                                                <td className="px-6 py-4 text-xs text-slate-500 font-medium tracking-tighter">{order.phone_number}</td>
                                                <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white">Rs. {order.total_amount?.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-red-500">Rs. {(order.courier_delivery_fee || order.delivery_charge || 0).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-xs font-bold text-emerald-600">Rs. {((order.total_amount || 0) - (order.courier_delivery_fee || order.delivery_charge || 0)).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-tight ${getStatusStyle(order.order_status)}`}>
                                                        {order.order_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : activeTab === 'cod' ? (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                            <th className="px-8 py-4 w-16">#</th>
                                            <th className="px-8 py-4">Date</th>
                                            <th className="px-8 py-4 text-right">COD Amount</th>
                                            <th className="px-8 py-4">Remarks</th>
                                            <th className="px-8 py-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                        {settlements.map((settlement, idx) => (
                                            <tr key={settlement.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="px-8 py-5 text-sm font-bold text-slate-400">{idx + 1}</td>
                                                <td className="px-8 py-5 text-sm font-black text-slate-900 dark:text-white flex items-center gap-3">
                                                    <Calendar size={16} className="text-slate-400" />
                                                    {new Date(settlement.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-8 py-5 text-lg font-black text-emerald-600 text-right">Rs. {Number(settlement.amount).toLocaleString()}</td>
                                                <td className="px-8 py-5 text-sm text-slate-500 font-medium italic">{settlement.remarks || '-'}</td>
                                                <td className="px-8 py-5 text-center">
                                                    {canEditSettlement(settlement.created_at) ? (
                                                        <button onClick={() => { setEditingSettlement(settlement); setIsEditSettlementOpen(true); }} className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors">
                                                            <Edit size={16} />
                                                        </button>
                                                    ) : <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Locked</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                            <th className="px-6 py-4">#</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Order ID</th>
                                            <th className="px-6 py-4">Receiver</th>
                                            <th className="px-6 py-4 text-emerald-600">COD (New)</th>
                                            <th className="px-6 py-4 text-red-500">Charge (New)</th>
                                            <th className="px-6 py-4">Logs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                        {changelogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-slate-500 text-sm italic">
                                                    {isLoadingLogs ? 'Loading change logs...' : 'No order change logs found.'}
                                                </td>
                                            </tr>
                                        ) : changelogs.map((log, idx) => (
                                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                                                <td className="px-6 py-4 text-xs text-slate-500 font-medium">{new Date(log.created_at).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-xs font-black text-indigo-600">{log.orders?.order_number || 'N/A'}</td>
                                                <td className="px-6 py-4 text-xs text-slate-700 dark:text-slate-300 font-bold">{log.orders?.customer_name || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm font-black text-emerald-600">{log.new_amount ? `Rs. ${log.new_amount.toLocaleString()}` : '-'}</td>
                                                <td className="px-6 py-4 text-sm font-black text-red-500">{log.new_delivery_charge ? `Rs. ${log.new_delivery_charge.toLocaleString()}` : '-'}</td>
                                                <td className="px-6 py-4 text-xs text-slate-500 font-medium max-w-[300px]">{log.log_details}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination Footer */}
                        {activeTab === 'orders' && totalPages > 1 && (
                            <div className="px-8 py-4 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                                <div className="text-xs font-bold text-slate-500">
                                    Showing <span className="text-indigo-600 font-black">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-indigo-600 font-black">{Math.min(currentPage * pageSize, filteredOrders.length)}</span> of <span className="text-indigo-600 font-black">{filteredOrders.length}</span> orders
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-xl text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ArrowLeft size={16} />
                                    </button>

                                    {getPaginationRange(currentPage, totalPages).map((p, i) => (
                                        typeof p === 'number' ? (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(p)}
                                                className={`min-w-[36px] h-9 rounded-xl text-xs font-black transition-all ${currentPage === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                            >
                                                {p}
                                            </button>
                                        ) : (
                                            <span key={i} className="px-2 text-slate-400 text-xs font-bold">...</span>
                                        )
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-xl text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modals for LogisticDetailView */}
            {isAddCodOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-white/20">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Add COD Settlement</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount (Rs.)</label>
                                <input type="number" value={newCod.amount} onChange={(e) => setNewCod({ ...newCod, amount: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                                <input type="date" value={newCod.date} onChange={(e) => setNewCod({ ...newCod, date: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks</label>
                                <textarea value={newCod.remarks} onChange={(e) => setNewCod({ ...newCod, remarks: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setIsAddCodOpen(false)} className="flex-1 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-gray-100 transition-all">Cancel</button>
                            <button onClick={handleSaveCod} className="flex-1 py-4 rounded-2xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">Save COD</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditSettlementOpen && editingSettlement && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl border border-white/20">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Edit COD Settlement</h2>
                            <span className="text-[10px] px-3 py-1 bg-amber-100 text-amber-600 rounded-full font-black uppercase tracking-tight">24h Window Active</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount (Rs.)</label>
                                <input type="number" value={editingSettlement.amount} onChange={(e) => setEditingSettlement({ ...editingSettlement, amount: Number(e.target.value) })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date</label>
                                <input type="date" value={editingSettlement.date} onChange={(e) => setEditingSettlement({ ...editingSettlement, date: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks</label>
                                <textarea value={editingSettlement.remarks} onChange={(e) => setEditingSettlement({ ...editingSettlement, remarks: e.target.value })} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-24 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-8">
                            <button onClick={() => { setIsEditSettlementOpen(false); setEditingSettlement(null); }} className="flex-1 py-4 rounded-2xl text-sm font-black text-slate-500 hover:bg-gray-100 transition-all">Cancel</button>
                            <button onClick={handleUpdateCod} className="flex-1 py-4 rounded-2xl text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">Update COD</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricLine({ label, value, valueColor = "text-slate-900 dark:text-white", subValue, textSize = "text-[16px]" }: { label: string, value: any, valueColor?: string, subValue?: string, textSize?: string }) {
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-slate-700/30 last:border-0 hover:bg-gray-50/50 dark:hover:bg-slate-700/20 px-1 -mx-1 rounded-lg transition-colors">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 capitalize">{label} =</span>
            <div className="text-right">
                <span className={`${textSize} font-black tracking-tight ${valueColor}`}>
                    {value}
                </span>
                {subValue && (
                    <span className="block text-[10px] font-bold text-slate-400 opacity-80 leading-none mt-0.5">
                        {subValue}
                    </span>
                )}
            </div>
        </div>
    );
}

function DetailMetric({ label, amount, isAmount = true, color, subValue }: { label: string, amount: any, isAmount?: boolean, color: string, subValue?: string }) {
    return (
        <div className="bg-gray-50/50 dark:bg-slate-900/30 p-4 rounded-3xl border border-gray-100 dark:border-slate-700/50">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight mb-1">{label}</p>
            <div className="flex flex-col gap-0.5">
                <span className={`text-sm font-black ${color}`}>
                    {isAmount && typeof amount === 'number' ? `Rs. ${amount.toLocaleString()}` : amount}
                </span>
                {subValue && (
                    <span className="text-[9px] font-bold text-slate-400 leading-none mt-1">{subValue}</span>
                )}
            </div>
        </div>
    );
}

function getPaginationRange(current: number, total: number) {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);
    for (let i = current - delta; i <= current + delta; i++) {
        if (i < total && i > 1) {
            range.push(i);
        }
    }
    if (total > 1) range.push(total);

    for (let i of range) {
        if (l) {
            if (i - l === 2) {
                rangeWithDots.push(l + 1);
            } else if (i - l !== 1) {
                rangeWithDots.push('...');
            }
        }
        rangeWithDots.push(i);
        l = i;
    }

    return rangeWithDots;
}

function MetricCard({ label, amount, icon, color, isMock }: { label: string, amount: number, icon: React.ReactNode, color: string, isMock?: boolean }) {
    return (
        <div className="bg-gray-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/50 flex flex-col gap-2.5 group hover:bg-white dark:hover:bg-slate-800 transition-all hover:border-gray-200 dark:hover:border-slate-600 shadow-sm hover:shadow-md">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20' :
                color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20' :
                    color === 'red' ? 'bg-red-50 dark:bg-red-900/20' :
                        'bg-emerald-50 dark:bg-emerald-900/20'
                }`}>
                {icon}
            </div>
            <div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight mb-0.5">{label}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Rs. {amount.toLocaleString()}</p>
                {isMock && <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">(Simulation)</span>}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                <ArrowUpRight size={10} />
                <span>Steady growth</span>
            </div>
        </div>
    );
}

function getStatusStyle(status: string) {
    if (!status) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    switch (status.toLowerCase()) {
        case 'delivered': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        case 'shipped': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'arrived at branch': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
        case 'delivery failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        case 'hold': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
        case 'return process': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        case 'return delivered': return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
}
