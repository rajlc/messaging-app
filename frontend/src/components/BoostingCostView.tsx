import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    Plus,
    TrendingUp,
    Calendar,
    Package,
    DollarSign,
    Search,
    Loader2,
    LayoutGrid,
    Megaphone,
    Edit3,
    Clock,
    CheckCircle2,
    ArrowUpRight,
    FileText,
    BarChart3,
    ShoppingBag,
    Lock,
    Eye,
    Trash2
} from 'lucide-react';
import axios from 'axios';
import AddAdsCampaignModal from './AddAdsCampaignModal';
import AddAdsSpendModal from './AddAdsSpendModal';

interface AdsCampaign {
    id: string;
    name: string;
    product_names: string[];
    total_spend: number;
    status: 'On' | 'Off';
    start_date: string;
    end_date?: string;
    created_at: string;
    is_virtual?: boolean;
}

interface AdsSpend {
    id: string;
    campaign_id: string;
    date: string;
    amount: number;
    remarks: string;
    created_at: string;
    ads_campaigns?: { name: string };
}

interface ProductMetric {
    product_name: string;
    est_purchase_cost: number;
    shipped_qty: number;
    delivered_qty: number;
}

interface BoostingCostViewProps {
    onBack: () => void;
}

export default function BoostingCostView({ onBack }: BoostingCostViewProps) {
    const [mainTab, setMainTab] = useState<'ads' | 'profit'>('ads');
    const [activeTab, setActiveTab] = useState<'spend' | 'campaign' | 'product'>('spend');
    const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
    const [spends, setSpends] = useState<AdsSpend[]>([]);
    const [productMetrics, setProductMetrics] = useState<ProductMetric[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingMetric, setIsSavingMetric] = useState<string | null>(null);
    const [viewingCampaign, setViewingCampaign] = useState<any>(null);
    const [viewingProfitReport, setViewingProfitReport] = useState<AdsCampaign | null>(null);
    const [reportSubTab, setReportSubTab] = useState<'orders' | 'analysis'>('orders');
    const [profitTab, setProfitTab] = useState<'campaignProfit'>('campaignProfit');
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    // Modals state
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isSpendModalOpen, setIsSpendModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };

            if (activeTab === 'campaign') {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/campaigns`, { headers });
                if (res.data.success) setCampaigns(res.data.data);
            } else if (activeTab === 'spend') {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/spends`, { headers });
                if (res.data.success) setSpends(res.data.data);
            } else if (activeTab === 'product') {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/product-metrics`, { headers });
                if (res.data.success) setProductMetrics(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch ads management data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, mainTab]);

    const isEditable = (createdAt: string) => {
        const created = new Date(createdAt).getTime();
        const now = new Date().getTime();
        return (now - created) / (1000 * 60 * 60) <= 24;
    };

    const handleUpdateEstCost = async (productName: string, cost: number) => {
        setIsSavingMetric(productName);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/product-metrics`, {
                product_name: productName,
                est_purchase_cost: cost
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                setProductMetrics(prev => prev.map(p => p.product_name === productName ? { ...p, est_purchase_cost: cost } : p));
                // Also update campaign metrics if viewing
                if (viewingCampaign) {
                    setViewingCampaign((prev: any) => ({
                        ...prev,
                        metrics: prev.metrics.map((m: any) => m.product_name === productName ? { ...m, est_purchase_cost: cost } : m)
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to update product metric:', error);
        } finally {
            setIsSavingMetric(null);
        }
    };

    const handleToggleStatus = async (campaign: any) => {
        if (campaign.is_virtual) return;
        try {
            const token = localStorage.getItem('token');
            const newStatus = campaign.status === 'On' ? 'Off' : 'On';
            const res = await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/campaigns/${campaign.id}`, {
                status: newStatus
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const handleDeleteCampaign = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this campaign?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/campaigns/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.success) {
                fetchData();
            }
        } catch (error) {
            console.error('Failed to delete campaign:', error);
        }
    };

    const fetchCampaignDetails = async (id: string) => {
        setIsLoadingDetails(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/ads-management/campaigns/${id}/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.success) {
                setViewingCampaign(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch campaign details:', error);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    useEffect(() => {
        if (viewingProfitReport) {
            fetchCampaignDetails(viewingProfitReport.id);
        }
    }, [viewingProfitReport]);

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 flex flex-col gap-6 shadow-sm sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={viewingProfitReport ? () => setViewingProfitReport(null) : viewingCampaign ? () => setViewingCampaign(null) : onBack}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                                <TrendingUp className="text-indigo-600 dark:text-indigo-400" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 dark:text-white">
                                    {viewingProfitReport ? `Order Report of ${viewingProfitReport.name}` : viewingCampaign ? `${viewingCampaign.campaign?.name || 'Campaign'} Details` : 'Ads & Profit Management'}
                                </h1>
                                <p className="text-xs text-slate-500 font-medium tracking-tight">
                                    {viewingProfitReport ? 'Detailed order-level profitability analysis' : viewingCampaign ? 'Individual campaign metrics and performance' : 'Track campaigns and advertising spendings'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!viewingCampaign && mainTab === 'ads' && activeTab === 'spend' && (
                            <button
                                onClick={() => { setEditingItem(null); setIsSpendModalOpen(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                <Plus size={18} /> Add Ads Spend
                            </button>
                        )}
                        {!viewingCampaign && mainTab === 'ads' && activeTab === 'campaign' && (
                            <button
                                onClick={() => { setEditingItem(null); setIsCampaignModalOpen(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                <Plus size={18} /> Add Ads Campaign
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Section Tabs */}
                {!viewingCampaign && !viewingProfitReport && (
                    <div className="flex items-center gap-6 border-b border-gray-100 dark:border-slate-700/50">
                        <button
                            onClick={() => setMainTab('ads')}
                            className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${mainTab === 'ads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Ads Management
                        </button>
                        <button
                            onClick={() => setMainTab('profit')}
                            className={`pb-4 px-2 text-sm font-black transition-all border-b-2 ${mainTab === 'profit' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            Profit Management
                        </button>
                    </div>
                )}

                {/* Sub-tabs (Ads Management Only) */}
                {!viewingCampaign && mainTab === 'ads' && (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-2xl w-fit">
                        <button
                            onClick={() => setActiveTab('spend')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'spend' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <DollarSign size={14} /> Ads Spend
                        </button>
                        <button
                            onClick={() => setActiveTab('campaign')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'campaign' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Megaphone size={14} /> Ads Campaign
                        </button>
                        <button
                            onClick={() => setActiveTab('product')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'product' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Package size={14} /> Product Ads
                        </button>
                    </div>
                )}

                {/* Sub-tabs (Profit Management Only) */}
                {!viewingCampaign && !viewingProfitReport && mainTab === 'profit' && (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-2xl w-fit">
                        <button
                            onClick={() => setProfitTab('campaignProfit')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${profitTab === 'campaignProfit' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid size={14} /> Campaign Profit
                        </button>
                    </div>
                )}

                {/* Report Sub-tabs (When viewing any campaign report) */}
                {(viewingCampaign || viewingProfitReport) && (
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-2xl w-fit">
                        <button
                            onClick={() => setReportSubTab('orders')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${reportSubTab === 'orders' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FileText size={14} /> Order List
                        </button>
                        <button
                            onClick={() => setReportSubTab('analysis')}
                            className={`px-6 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${reportSubTab === 'analysis' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <BarChart3 size={14} /> Ads Analysis
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-1 overflow-y-auto pl-4 pr-8 py-6 custom-scrollbar">
                <div className="max-w-full ml-0">
                    {mainTab === 'ads' && viewingCampaign ? (
                        <div className="space-y-6">
                            {reportSubTab === 'orders' ? (
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order List of {viewingCampaign.campaign?.name || 'Campaign'}</h3>
                                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[10px] font-black uppercase">
                                            {(viewingCampaign?.orders || []).length} Orders Found
                                        </span>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                                <th className="px-8 py-4">Order Id</th>
                                                <th className="px-8 py-4">Status</th>
                                                <th className="px-8 py-4">Product Name</th>
                                                <th className="px-8 py-4">Sales Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                            {isLoadingDetails ? (
                                                <tr>
                                                    <td colSpan={4} className="px-8 py-20 text-center">
                                                        <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                                    </td>
                                                </tr>
                                            ) : (
                                                (viewingCampaign?.orders || []).map((o: any) => (
                                                    <tr key={o.order_number} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                        <td className="px-8 py-4 text-sm font-black text-indigo-600">#{o.order_number}</td>
                                                        <td className="px-8 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                                o.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                {o.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">{o.product_names}</td>
                                                        <td className="px-8 py-4 text-sm font-black text-indigo-600">Rs. {(o.sales_price || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                            {!(viewingCampaign.orders || []).length && !isLoadingDetails && (
                                                <tr>
                                                    <td colSpan={4} className="px-8 py-20 text-center text-sm font-black text-slate-400 italic">
                                                        No orders found for this campaign's filters.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary Card */}
                                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-8 shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Campaign Profit</p>
                                            <h4 className={`text-3xl font-black ${(viewingCampaign?.total_profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                Rs. {(viewingCampaign?.total_profit || 0).toLocaleString()}
                                            </h4>
                                        </div>
                                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                            <TrendingUp size={28} />
                                        </div>
                                    </div>

                                    {/* Product Metrics Table */}
                                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700/50">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Product Ads Metrics</h3>
                                        </div>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                                    <th className="px-8 py-4">Product Name</th>
                                                    <th className="px-8 py-4">Est Purchase Cost</th>
                                                    <th className="px-8 py-4">Shipped Qty</th>
                                                    <th className="px-8 py-4">Est Ads Cost</th>
                                                    <th className="px-8 py-4">Delivered Qty</th>
                                                    <th className="px-8 py-4">Actual Ads Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                                {isLoadingDetails ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-8 py-20 text-center">
                                                            <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (viewingCampaign?.metrics || []).map((p: any) => (
                                                        <tr key={p.product_name} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                            <td className="px-8 py-4 text-sm font-black text-indigo-600">{p.product_name}</td>
                                                            <td className="px-8 py-4">
                                                                <div className="relative w-32">
                                                                    <input
                                                                        type="number"
                                                                        defaultValue={p.est_purchase_cost}
                                                                        onBlur={(e) => handleUpdateEstCost(p.product_name, parseFloat(e.target.value) || 0)}
                                                                        disabled={isSavingMetric === p.product_name}
                                                                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none transition-all disabled:opacity-50"
                                                                        placeholder="0"
                                                                    />
                                                                    {isSavingMetric === p.product_name && (
                                                                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" size={12} />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">{p.shipped_qty}</td>
                                                            <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">
                                                                {p.est_ads_cost > 0 ? p.est_ads_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                                            </td>
                                                            <td className="px-8 py-4 text-sm font-black text-emerald-600">{p.delivered_qty}</td>
                                                            <td className="px-8 py-4 text-sm font-black text-emerald-600">
                                                                {p.actual_ads_cost > 0 ? p.actual_ads_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : mainTab === 'ads' ? (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    {activeTab === 'spend' ? (
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                            <th className="px-8 py-4">Date</th>
                                            <th className="px-8 py-4">Campaign Name</th>
                                            <th className="px-8 py-4">Amount</th>
                                            <th className="px-8 py-4">Ads Spend</th>
                                            <th className="px-8 py-4 text-right">Actions</th>
                                        </tr>
                                    ) : activeTab === 'campaign' ? (
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                            <th className="px-8 py-4">Campaign Name</th>
                                            <th className="px-8 py-4">Products</th>
                                            <th className="px-8 py-4">Dates</th>
                                            <th className="px-8 py-4">Ads Spend</th>
                                            <th className="px-8 py-4">Status</th>
                                            <th className="px-8 py-4 text-right">Actions</th>
                                        </tr>
                                    ) : (
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                            <th className="px-8 py-4">Product Name</th>
                                            <th className="px-8 py-4">Est Purchase Cost</th>
                                            <th className="px-8 py-4">Shipped Qty</th>
                                            <th className="px-8 py-4">Est Ads Cost</th>
                                            <th className="px-8 py-4">Delivered Qty</th>
                                            <th className="px-8 py-4">Actual Ads Cost</th>
                                        </tr>
                                    )}
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                                                    <span className="text-sm font-bold text-slate-400">Loading data...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : activeTab === 'spend' ? (
                                        spends.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-sm italic font-medium">No ads spend records found.</td>
                                            </tr>
                                        ) : (
                                            spends.map((spend) => {
                                                const editable = isEditable(spend.created_at);
                                                return (
                                                    <tr key={spend.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                        <td className="px-8 py-4 text-sm font-bold text-slate-500">{spend.date}</td>
                                                        <td className="px-8 py-4 text-sm font-black text-indigo-600">{spend.ads_campaigns?.name || 'Unknown'}</td>
                                                        <td className="px-8 py-4 text-sm font-black text-slate-900 dark:text-white">Rs. {Number(spend.amount).toLocaleString()}</td>
                                                        <td className="px-8 py-4 text-xs font-medium text-slate-500 max-w-xs truncate">{spend.remarks || '-'}</td>
                                                        <td className="px-8 py-4 text-right">
                                                            {editable ? (
                                                                <button
                                                                    onClick={() => { setEditingItem(spend); setIsSpendModalOpen(true); }}
                                                                    className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 rounded-lg transition-colors inline-flex items-center gap-1.5 text-[10px] font-black uppercase"
                                                                >
                                                                    <Edit3 size={14} /> Edit
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] font-black text-slate-300 uppercase flex items-center justify-end gap-1.5">
                                                                    <CheckCircle2 size={14} /> Locked
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )
                                    ) : activeTab === 'campaign' ? (
                                        campaigns.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-20 text-center text-slate-400 text-sm italic font-medium">No ads campaigns found.</td>
                                            </tr>
                                        ) : (
                                            campaigns.map((camp) => (
                                                <tr key={camp.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                    <td className="px-8 py-4 text-sm font-black text-indigo-600">{camp.name}</td>
                                                    <td className="px-8 py-4">
                                                        <div className="flex flex-wrap gap-1">
                                                            {camp.product_names.map(p => (
                                                                <span key={p} className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                                    {p}
                                                                </span>
                                                            ))}
                                                            {camp.product_names.length === 0 && <span className="text-slate-300 italic text-[10px]">No products</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                                <Calendar size={10} className="text-indigo-500" /> {camp.start_date}
                                                            </span>
                                                            {camp.end_date && (
                                                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                                    to {camp.end_date}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-sm font-black text-slate-900 dark:text-white">
                                                        Rs. {Number(camp.total_spend || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-8 py-4">
                                                        <button
                                                            onClick={() => handleToggleStatus(camp)}
                                                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${camp.status === 'On' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}
                                                        >
                                                            {camp.status}
                                                        </button>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => fetchCampaignDetails(camp.id)}
                                                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-slate-500 rounded-lg transition-colors inline-flex items-center gap-1.5 text-[10px] font-black uppercase"
                                                            >
                                                                View
                                                            </button>
                                                            {!camp.is_virtual && (
                                                                <button
                                                                    onClick={() => { setEditingItem(camp); setIsCampaignModalOpen(true); }}
                                                                    className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 rounded-lg transition-colors inline-flex items-center gap-1.5 text-[10px] font-black uppercase"
                                                                >
                                                                    <Edit3 size={14} /> Edit
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )
                                    ) : (
                                        productMetrics.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-8 py-20 text-center text-slate-400 text-sm italic font-medium">No product ads metrics found.</td>
                                            </tr>
                                        ) : (
                                            productMetrics.map((p) => (
                                                <tr key={p.product_name} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                    <td className="px-8 py-4 text-sm font-black text-indigo-600">{p.product_name}</td>
                                                    <td className="px-8 py-4">
                                                        <div className="relative w-32">
                                                            <input
                                                                type="number"
                                                                defaultValue={p.est_purchase_cost}
                                                                onBlur={(e) => handleUpdateEstCost(p.product_name, parseFloat(e.target.value) || 0)}
                                                                disabled={isSavingMetric === p.product_name}
                                                                className="w-full px-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-transparent focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none transition-all disabled:opacity-50"
                                                                placeholder="0"
                                                            />
                                                            {isSavingMetric === p.product_name && (
                                                                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-indigo-600" size={12} />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">{p.shipped_qty}</td>
                                                    <td className="px-8 py-4 text-[10px] font-bold text-slate-300 italic tracking-wider">TBD</td>
                                                    <td className="px-8 py-4 text-sm font-black text-emerald-600">{p.delivered_qty}</td>
                                                    <td className="px-8 py-4 text-[10px] font-bold text-slate-300 italic tracking-wider">TBD</td>
                                                </tr>
                                            ))
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : viewingProfitReport ? (
                        <div className="space-y-6">
                            {reportSubTab === 'orders' ? (
                                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order List of {viewingProfitReport.name}</h3>
                                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[10px] font-black uppercase">
                                            {(viewingCampaign?.orders || []).length} Orders Found
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                                    <th className="px-6 py-4 whitespace-nowrap">Date</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Order No</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Product Name</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Branch/City</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Est. Delivery</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Total Amount</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Purchase Cost</th>
                                                    <th className="px-6 py-4 whitespace-nowrap">Ads Cost</th>
                                                    <th className="px-8 py-4 whitespace-nowrap text-right">Profit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                                {isLoadingDetails ? (
                                                    <tr>
                                                        <td colSpan={10} className="px-6 py-20 text-center">
                                                            <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (viewingCampaign?.orders || []).map((o: any) => (
                                                        <tr key={o.order_number} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                            <td className="px-6 py-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                                                                {o.created_at ? new Date(o.created_at).toLocaleDateString() : 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-black text-indigo-600">#{o.order_number}</span>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{o.courier || 'No Partner'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col gap-0.5 min-w-[150px]">
                                                                    {(o.campaign_items || []).map((item: any, idx: number) => (
                                                                        <span key={idx} className="text-xs font-black text-slate-600 dark:text-slate-400">
                                                                            {item.product_name} <span className="text-indigo-600">x{item.qty}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-xs font-black text-slate-600 dark:text-slate-400 whitespace-nowrap">{o.city || '---'}</td>
                                                            <td className="px-6 py-4 text-sm font-black text-slate-500 whitespace-nowrap">Rs. {(o.est_delivery_charge || 0).toLocaleString()}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                                    o.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {o.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm font-black text-indigo-600 whitespace-nowrap">Rs. {(o.sales_price || 0).toLocaleString()}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {(() => {
                                                                    const totalQty = (o.campaign_items || []).reduce((sum: number, item: any) => sum + Number(item.qty || 0), 0);
                                                                    return (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-sm font-black text-slate-600 dark:text-slate-400">
                                                                                Rs. {(o.est_purchase_cost || 0).toLocaleString()}
                                                                            </span>
                                                                            {totalQty > 1 && (
                                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                                    (<span className="text-indigo-500">{totalQty} Pcs</span>)
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-sm font-black text-slate-600 dark:text-slate-400">Rs. {(o.ads_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                                    {o.is_past ? (
                                                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                                                            <Lock size={8} /> Locked
                                                                        </div>
                                                                    ) : (
                                                                        <div className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 rounded text-[9px] font-black text-indigo-500 uppercase tracking-tighter">
                                                                            Live Est.
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-4 text-right whitespace-nowrap">
                                                                <div className="flex flex-col items-end">
                                                                    {o.profit_label && (
                                                                        <span className={`text-[9px] font-black uppercase tracking-tighter mb-0.5 ${o.profit_label.includes('Profit') ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                            {o.profit_label}
                                                                        </span>
                                                                    )}
                                                                    <span className={`text-sm font-black ${o.profit > 0 ? 'text-emerald-600' : o.profit < 0 ? 'text-rose-600' : 'text-slate-400 italic'}`}>
                                                                        {o.profit !== 0 ? `Rs. ${o.profit.toLocaleString()}` : 'TBD'}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                                {!isLoadingDetails && (!viewingCampaign?.orders || viewingCampaign.orders.length === 0) && (
                                                    <tr>
                                                        <td colSpan={10} className="px-6 py-20 text-center text-sm font-black text-slate-400 italic">
                                                            No orders found for this campaign with current filters.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-8 shadow-sm flex items-center justify-between group hover:border-emerald-500/50 transition-all">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Campaign Profit</p>
                                                <h4 className="text-3xl font-black text-emerald-600">Rs. {(viewingCampaign?.total_profit || 0).toLocaleString()}</h4>
                                            </div>
                                            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                                                <TrendingUp size={28} />
                                            </div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-8 shadow-sm flex items-center justify-between group hover:border-indigo-500/50 transition-all">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
                                                <h4 className="text-3xl font-black text-indigo-600">{(viewingCampaign?.orders || []).length}</h4>
                                            </div>
                                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                <ShoppingBag size={28} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ads Management Compartment */}
                                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm mb-6">
                                        <div className="px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Ads Management</h3>
                                            <div className="flex items-center gap-2">
                                                {viewingCampaign && !viewingCampaign.is_virtual && (
                                                    <button 
                                                        onClick={() => setIsSpendModalOpen(true)}
                                                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-1.5"
                                                    >
                                                        <Plus size={12} /> Add Ads Spend
                                                    </button>
                                                )}
                                                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[10px] font-black uppercase">
                                                    Rate: Rs. {(viewingCampaign?.ads_management?.ads_amount || 0).toFixed(2)} / Order
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-gray-100 dark:divide-slate-700/50">
                                            <div className="p-6 text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ads Amount</p>
                                                <p className="text-xl font-black text-slate-700 dark:text-white">Rs. {(viewingCampaign?.ads_management?.total_ads_amount || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="p-6 text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ads Order</p>
                                                <p className="text-xl font-black text-slate-700 dark:text-white">{viewingCampaign?.ads_management?.ads_orders || 0}</p>
                                            </div>
                                            <div className="p-6 text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ads Spend (Past)</p>
                                                <p className="text-xl font-black text-indigo-600">Rs. {(viewingCampaign?.ads_management?.ads_spend || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="p-6 text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Past Order</p>
                                                <p className="text-xl font-black text-indigo-600">{viewingCampaign?.ads_management?.past_orders || 0}</p>
                                            </div>
                                            <div className="p-6 text-center bg-indigo-50/30 dark:bg-indigo-900/10">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Ads Amount</p>
                                                <p className="text-xl font-black text-indigo-600">Rs. {(viewingCampaign?.ads_management?.ads_amount || 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Order Status Breakdown */}
                                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Status Breakdown</h3>
                                        </div>
                                        <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                                            <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/50 dark:border-blue-900/20">
                                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Shipped Group</p>
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{(viewingCampaign?.status_breakdown?.shipped?.qty || 0)} Pcs</span>
                                                    <span className="text-xs font-bold text-blue-600">Rs. {(viewingCampaign?.status_breakdown?.shipped?.amount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl border border-amber-100/50 dark:border-amber-900/20">
                                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Returning Group</p>
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{(viewingCampaign?.status_breakdown?.returning?.qty || 0)} Pcs</span>
                                                    <span className="text-xs font-bold text-amber-600">Rs. {(viewingCampaign?.status_breakdown?.returning?.amount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/20">
                                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Delivered Group</p>
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{(viewingCampaign?.status_breakdown?.delivered?.qty || 0)} Pcs</span>
                                                    <span className="text-xs font-bold text-emerald-600">Rs. {(viewingCampaign?.status_breakdown?.delivered?.amount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="p-6 bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100/50 dark:border-rose-900/20">
                                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Returned Delivered</p>
                                                <div className="flex flex-col">
                                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{(viewingCampaign?.status_breakdown?.returned?.qty || 0)} Pcs</span>
                                                    <span className="text-xs font-bold text-rose-600">Rs. {(viewingCampaign?.status_breakdown?.returned?.amount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product Metrics Table */}
                                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                        <div className="px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700/50">
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Product Ads Metrics</h3>
                                        </div>
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                                    <th className="px-8 py-4">Product Name</th>
                                                    <th className="px-8 py-4">Shipped Qty</th>
                                                    <th className="px-8 py-4">Delivered Qty</th>
                                                    <th className="px-8 py-4">Est. Ads Cost</th>
                                                    <th className="px-8 py-4">Actual Ads Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                                {isLoadingDetails ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-8 py-10 text-center">
                                                            <Loader2 className="animate-spin text-indigo-600 mx-auto" size={24} />
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    (viewingCampaign?.metrics || []).map((m: any) => (
                                                        <tr key={m.product_name} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors">
                                                            <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">{m.product_name}</td>
                                                            <td className="px-8 py-4 text-sm font-bold text-slate-500">{m.shipped_qty}</td>
                                                            <td className="px-8 py-4 text-sm font-bold text-emerald-600">{m.delivered_qty}</td>
                                                            <td className="px-8 py-4 text-sm font-bold text-indigo-600">Rs. {(viewingCampaign?.ads_management?.ads_amount || 0).toFixed(1)}</td>
                                                            <td className="px-8 py-4 text-sm font-black text-indigo-600">Rs. {(viewingCampaign?.ads_management?.ads_amount || 0).toFixed(1)}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : profitTab === 'campaignProfit' ? (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                        <th className="px-8 py-4">Campaign Name</th>
                                        <th className="px-8 py-4">Campaign Status</th>
                                        <th className="px-8 py-4">Quantity</th>
                                        <th className="px-8 py-4">Amount</th>
                                        <th className="px-8 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                    {campaigns.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-sm italic font-medium">No campaigns found. Create a campaign in Ads Management first.</td>
                                        </tr>
                                    ) : (
                                        campaigns.map((camp) => (
                                            <tr key={camp.id} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                <td className="px-8 py-4 text-sm font-black text-indigo-600">{camp.name}</td>
                                                <td className="px-8 py-4">
                                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${camp.status === 'On' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                                                        {camp.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-4 text-[10px] font-bold text-slate-300 italic tracking-wider">TBD</td>
                                                <td className="px-8 py-4 text-[10px] font-bold text-slate-300 italic tracking-wider">TBD</td>
                                                <td className="px-8 py-4 text-right">
                                                    <div className="flex items-center justify-end">
                                                        <button
                                                            onClick={() => setViewingProfitReport(camp)}
                                                            className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-wider hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all flex items-center gap-1.5"
                                                        >
                                                            <Eye size={14} /> View Details
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-12 shadow-sm text-center">
                            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <DollarSign className="text-indigo-600" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Profit Management</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
                                This module is currently under development. Soon you'll be able to track detailed profit margins, net revenue, and financial health here.
                            </p>
                            <div className="mt-8">
                                <span className="px-4 py-2 bg-amber-50 text-amber-600 dark:bg-amber-900/20 rounded-full text-xs font-black uppercase tracking-widest">
                                    Coming Soon
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            {/* Modals */}
            <AddAdsCampaignModal
                isOpen={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
                onSuccess={() => {
                    setIsCampaignModalOpen(false);
                    fetchData();
                }}
                editingCampaign={editingItem}
            />

            <AddAdsSpendModal
                isOpen={isSpendModalOpen}
                onClose={() => setIsSpendModalOpen(false)}
                onSuccess={() => {
                    setIsSpendModalOpen(false);
                    fetchData();
                }}
                editingSpend={editingItem}
            />
        </div>
    );
}
