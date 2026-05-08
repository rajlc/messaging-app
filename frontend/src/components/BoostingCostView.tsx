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
    ArrowUpRight
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
    created_at: string;
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
    const [activeTab, setActiveTab] = useState<'spend' | 'campaign' | 'product'>('spend');
    const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
    const [spends, setSpends] = useState<AdsSpend[]>([]);
    const [productMetrics, setProductMetrics] = useState<ProductMetric[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingMetric, setIsSavingMetric] = useState<string | null>(null);
    const [viewingCampaign, setViewingCampaign] = useState<any>(null);
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
    }, [activeTab]);

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

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-8 py-4 flex flex-col gap-6 shadow-sm sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={viewingCampaign ? () => setViewingCampaign(null) : onBack}
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
                                    {viewingCampaign ? `${viewingCampaign.campaign?.name || 'Campaign'} Details` : 'Ads Management'}
                                </h1>
                                <p className="text-xs text-slate-500 font-medium tracking-tight">
                                    {viewingCampaign ? 'Individual campaign metrics and performance' : 'Track campaigns and advertising spendings'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab === 'spend' && (
                            <button
                                onClick={() => { setEditingItem(null); setIsSpendModalOpen(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                <Plus size={18} /> Add Ads Spend
                            </button>
                        )}
                        {activeTab === 'campaign' && (
                            <button
                                onClick={() => { setEditingItem(null); setIsCampaignModalOpen(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                <Plus size={18} /> Add Ads Campaign
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                {!viewingCampaign && (
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
            </header>

            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-[1400px] mx-auto">
                    {viewingCampaign ? (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Total Campaign Profit</h2>
                                        <div className={`text-4xl font-black ${(viewingCampaign?.total_profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            Rs. {(viewingCampaign?.total_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2 font-black uppercase tracking-tighter">Based on Delivered orders only</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                                        <ArrowUpRight className="text-emerald-600" size={32} />
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
                                            <th className="px-8 py-4">Est Purchase Cost</th>
                                            <th className="px-8 py-4">Shipped Qty</th>
                                            <th className="px-8 py-4">Est Ads Cost</th>
                                            <th className="px-8 py-4">Delivered Qty</th>
                                            <th className="px-8 py-4">Actual Ads Cost</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                        {isLoadingDetails && !viewingCampaign?.metrics ? (
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

                            {/* Order List Table */}
                            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
                                <div className="px-8 py-4 bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700/50">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Campaign Order List</h3>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700/50">
                                            <th className="px-8 py-4">Order Id</th>
                                            <th className="px-8 py-4">Status</th>
                                            <th className="px-8 py-4">Product Name</th>
                                            <th className="px-8 py-4">Est Purchase Cost</th>
                                            <th className="px-8 py-4">Sales Price</th>
                                            <th className="px-8 py-4">Est Delivery Charge</th>
                                            <th className="px-8 py-4">Ads Cost</th>
                                            <th className="px-8 py-4">Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                        {isLoadingDetails && !viewingCampaign?.orders ? (
                                            <tr>
                                                <td colSpan={8} className="px-8 py-20 text-center">
                                                    <Loader2 className="animate-spin text-indigo-600 mx-auto" size={32} />
                                                </td>
                                            </tr>
                                        ) : (
                                            (viewingCampaign?.orders || []).map((o: any) => (
                                                <tr key={o.order_number} className="hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors group">
                                                    <td className="px-8 py-4 text-sm font-black text-indigo-600">#{o.order_number || 'N/A'}</td>
                                                    <td className="px-8 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${o.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                                            o.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {o.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">{o.product_names}</td>
                                                    <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">Rs. {(o.est_purchase_cost || 0).toLocaleString()}</td>
                                                    <td className="px-8 py-4 text-sm font-black text-indigo-600">Rs. {(o.sales_price || 0).toLocaleString()}</td>
                                                    <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">Rs. {(o.est_delivery_charge || 0).toLocaleString()}</td>
                                                    <td className="px-8 py-4 text-sm font-black text-slate-600 dark:text-slate-400">Rs. {(o.ads_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className={`px-8 py-4 text-sm font-black ${(o.profit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {o.status === 'Delivered' ? `Rs. ${(o.profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                        {!(viewingCampaign.orders || []).length && !isLoadingDetails && (
                                            <tr>
                                                <td colSpan={8} className="px-8 py-20 text-center text-sm font-black text-slate-400 italic">
                                                    No orders found for this campaign's filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
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
                                            <td colSpan={5} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                                                    <span className="text-sm font-bold text-slate-400">Loading data...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        activeTab === 'spend' ? (
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
                                                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 text-sm italic font-medium">No ads campaigns found.</td>
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
                                                                <button
                                                                    onClick={() => { setEditingItem(camp); setIsCampaignModalOpen(true); }}
                                                                    className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 rounded-lg transition-colors inline-flex items-center gap-1.5 text-[10px] font-black uppercase"
                                                                >
                                                                    <Edit3 size={14} /> Edit
                                                                </button>
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
                                        )
                                    )}
                                </tbody>
                            </table>
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
