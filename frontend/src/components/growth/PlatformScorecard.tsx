"use client";

import React, { useState, useEffect } from 'react';
import {
    Award,
    TrendingUp,
    DollarSign,
    Save,
    CheckCircle2,
    Calendar,
    Target,
    HelpCircle,
    ShoppingBag
} from 'lucide-react';

interface PlatformKpi {
    platform: string;
    orders: number;
    revenue: number;
    adSpend: number;
    targetOrders: number;
    notes: string;
}

const DEFAULT_PLATFORMS: PlatformKpi[] = [
    { platform: 'Daraz Store', orders: 85, revenue: 65000, adSpend: 3000, targetOrders: 80, notes: 'Maintain current steady flow' },
    { platform: 'Facebook Ads', orders: 35, revenue: 32000, adSpend: 8000, targetOrders: 40, notes: 'Scale winning video creative' },
    { platform: 'TikTok Shop / DMs', orders: 15, revenue: 14000, adSpend: 0, targetOrders: 20, notes: 'Organic demo videos' },
    { platform: 'Instagram DM & Feed', orders: 10, revenue: 9500, adSpend: 1500, targetOrders: 15, notes: 'Reels and stories engagement' },
    { platform: 'Bagmati Website', orders: 5, revenue: 6000, adSpend: 0, targetOrders: 10, notes: 'Direct customer orders' },
];

export function PlatformScorecard() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const [platforms, setPlatforms] = useState<PlatformKpi[]>(DEFAULT_PLATFORMS);
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    useEffect(() => {
        const fetchScorecard = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/scorecard/${weekStartStr}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && Array.isArray(data.platforms) && data.platforms.length > 0) {
                        setPlatforms(data.platforms);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchScorecard();
    }, [weekStartStr]);

    const handleUpdate = (index: number, field: keyof PlatformKpi, val: any) => {
        setPlatforms(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setSavedSuccess(false);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/scorecard/${weekStartStr}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    weekStart: weekStartStr,
                    platforms: platforms,
                })
            });
            if (res.ok) {
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const totalOrders = platforms.reduce((acc, p) => acc + Number(p.orders || 0), 0);
    const totalRevenue = platforms.reduce((acc, p) => acc + Number(p.revenue || 0), 0);
    const totalAdSpend = platforms.reduce((acc, p) => acc + Number(p.adSpend || 0), 0);
    const overallRoas = totalAdSpend > 0 ? (totalRevenue / totalAdSpend).toFixed(2) : 'N/A';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Weekly Platform Scorecard & Targets
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Track orders, ad spend, and ROAS across all channels for the week starting <strong>{weekStartStr}</strong>.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {savedSuccess && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Saved!
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        Save Scorecard
                    </button>
                </div>
            </div>

            {/* Aggregated Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Total Weekly Orders</span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">{totalOrders}</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Total Revenue</span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">Rs. {totalRevenue.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Total Ad Spend</span>
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">Rs. {totalAdSpend.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Blended ROAS</span>
                    <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{overallRoas}x</div>
                </div>
            </div>

            {/* Editable Platform Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                        Channel Performance & Target Inputs
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="p-3.5">Platform</th>
                                <th className="p-3.5">Actual Orders</th>
                                <th className="p-3.5">Target Orders</th>
                                <th className="p-3.5">Revenue (Rs.)</th>
                                <th className="p-3.5">Ad Spend (Rs.)</th>
                                <th className="p-3.5">ROAS</th>
                                <th className="p-3.5">Strategy Notes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {platforms.map((p, idx) => {
                                const roas = Number(p.adSpend) > 0 ? (Number(p.revenue) / Number(p.adSpend)).toFixed(2) + 'x' : 'Organic';

                                return (
                                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                                            {p.platform}
                                        </td>
                                        <td className="p-3.5">
                                            <input
                                                type="number"
                                                value={p.orders}
                                                onChange={(e) => handleUpdate(idx, 'orders', Number(e.target.value))}
                                                className="w-20 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                                            />
                                        </td>
                                        <td className="p-3.5">
                                            <input
                                                type="number"
                                                value={p.targetOrders}
                                                onChange={(e) => handleUpdate(idx, 'targetOrders', Number(e.target.value))}
                                                className="w-20 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500"
                                            />
                                        </td>
                                        <td className="p-3.5">
                                            <input
                                                type="number"
                                                value={p.revenue}
                                                onChange={(e) => handleUpdate(idx, 'revenue', Number(e.target.value))}
                                                className="w-28 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-emerald-600"
                                            />
                                        </td>
                                        <td className="p-3.5">
                                            <input
                                                type="number"
                                                value={p.adSpend}
                                                onChange={(e) => handleUpdate(idx, 'adSpend', Number(e.target.value))}
                                                className="w-24 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                            />
                                        </td>
                                        <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300">
                                            {roas}
                                        </td>
                                        <td className="p-3.5">
                                            <input
                                                type="text"
                                                value={p.notes}
                                                onChange={(e) => handleUpdate(idx, 'notes', e.target.value)}
                                                className="w-full min-w-[200px] p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                placeholder="Observations or key changes"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
