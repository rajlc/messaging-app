"use client";

import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    Calendar,
    Save,
    CheckCircle2,
    Clock,
    AlertCircle,
    ShoppingBag,
    Share2,
    RefreshCw,
    Sparkles,
    ShieldCheck,
    ArrowUpRight,
    Award,
    Filter,
    FileText,
    History
} from 'lucide-react';

interface DailyBreakdownItem {
    date: string;
    dayName: string;
    Daraz: number;
    Facebook: number;
    TikTok: number;
    Instagram: number;
    Website: number;
    Marketplace: number;
    Others: number;
    totalOrders: number;
    totalRevenue: number;
    darazRevenue: number;
    nonDarazRevenue: number;
}

interface PlatformItem {
    name: string;
    orders: number;
    revenue: number;
    sharePercent: number;
    targetPercent: number;
    cancelledCount: number;
}

interface WeeklyReportData {
    weekStart: string;
    weekEnd: string;
    totalOrders: number;
    totalRevenue: number;
    darazOrders: number;
    nonDarazOrders: number;
    darazRevenue: number;
    nonDarazRevenue: number;
    darazSharePercent: number;
    nonDarazSharePercent: number;
    totalCancelled: number;
    dailyBreakdown: DailyBreakdownItem[];
    platforms: PlatformItem[];
    sundaySummary?: string;
    actionPlanNextWeek?: string;
    isReviewed?: boolean;
    reviewedAt?: string | null;
}

export function OrderProgressReportTab() {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<WeeklyReportData | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [selectedHistoryWeek, setSelectedHistoryWeek] = useState<string>('current');

    // Sunday Review Form
    const [sundaySummary, setSundaySummary] = useState('');
    const [actionPlan, setActionPlan] = useState('');
    const [savingReview, setSavingReview] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const isSunday = new Date().getDay() === 0;
    const isSaturday = new Date().getDay() === 6;

    const fetchReport = async (weekStart?: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = weekStart && weekStart !== 'current'
                ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/order-reports/weekly?weekStart=${weekStart}`
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/order-reports/weekly`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setReportData(data);
                setSundaySummary(data.sundaySummary || '');
                setActionPlan(data.actionPlanNextWeek || '');
            }
        } catch (err) {
            console.error('Failed fetching weekly report:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/order-reports/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data || []);
            }
        } catch (err) {
            console.error('Failed fetching report history:', err);
        }
    };

    useEffect(() => {
        fetchReport();
        fetchHistory();
    }, []);

    const handleSaveSundayReview = async () => {
        if (!reportData) return;
        setSavingReview(true);
        setSaveSuccess(false);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/order-reports/weekly/summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    weekStart: reportData.weekStart,
                    summary: sundaySummary,
                    actionPlan: actionPlan,
                })
            });

            if (res.ok) {
                setSaveSuccess(true);
                fetchHistory();
                setTimeout(() => setSaveSuccess(false), 4000);
            }
        } catch (err) {
            console.error('Failed saving review:', err);
        } finally {
            setSavingReview(false);
        }
    };

    const handleSelectHistory = (weekStart: string) => {
        setSelectedHistoryWeek(weekStart);
        if (weekStart === 'current') {
            fetchReport();
        } else {
            fetchReport(weekStart);
        }
    };

    if (loading && !reportData) {
        return (
            <div className="flex flex-col items-center justify-center p-16 space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Aggregating orders from Daraz, Facebook, TikTok, Instagram & Website...
                </p>
            </div>
        );
    }

    const maxDailyOrders = reportData?.dailyBreakdown
        ? Math.max(...reportData.dailyBreakdown.map(d => d.totalOrders), 10)
        : 10;

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-100 border border-blue-400/30 flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                                Cancellation Filter Active
                            </span>
                            {isSaturday && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/40 text-amber-200 border border-amber-400/40 animate-pulse">
                                    📸 Saturday Auto-Report Ready
                                </span>
                            )}
                            {isSunday && (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/40 text-emerald-200 border border-emerald-400/40">
                                    🌟 Sunday Executive Review Day
                                </span>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            Multi-Platform Order Progress & Weekly Report
                        </h2>
                        <p className="text-blue-100 text-sm mt-1 max-w-2xl">
                            Live tracking across <strong>Daraz Store</strong> and all channels (<strong>Facebook Ads, Marketplace, TikTok, Instagram, Website</strong>).
                            Cancelled and unpaid orders are strictly excluded from calculations.
                        </p>
                    </div>

                    {/* Historical report dropdown */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchReport(selectedHistoryWeek === 'current' ? undefined : selectedHistoryWeek)}
                            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                            title="Refresh Data"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        {history.length > 0 && (
                            <div className="relative">
                                <select
                                    value={selectedHistoryWeek}
                                    onChange={(e) => handleSelectHistory(e.target.value)}
                                    className="bg-slate-900/80 text-white text-xs font-medium rounded-xl px-3 py-2 border border-white/20 focus:outline-none cursor-pointer"
                                >
                                    <option value="current">Current Week (Active)</option>
                                    {history.map((h: any, idx) => (
                                        <option key={idx} value={h.week_start}>
                                            Week of {h.week_start} {h.is_reviewed ? '✓ Reviewed' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Week Range Badge */}
                {reportData && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-6 text-xs text-blue-100">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-300" />
                            <span>Week Period: <strong>{reportData.weekStart}</strong> to <strong>{reportData.weekEnd}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Valid Orders Only: <strong>{reportData.totalOrders} total</strong></span>
                        </div>
                        {reportData.totalCancelled > 0 && (
                            <div className="flex items-center gap-1.5 text-rose-200">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-300" />
                                <span>Cancelled Excluded: <strong>{reportData.totalCancelled} orders</strong></span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Key KPI Cards */}
            {reportData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Valid Orders</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{reportData.totalOrders}</span>
                            <span className="text-xs font-medium text-slate-500">this week</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {reportData.totalRevenue > 0 && `Rs. ${reportData.totalRevenue.toLocaleString()} recorded volume`}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Daraz Orders</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                                <ShoppingBag className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{reportData.darazOrders}</span>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">({reportData.darazSharePercent}%)</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Target: reduce dependence to 40%
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Non-Daraz Orders</span>
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{reportData.nonDarazOrders}</span>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">({reportData.nonDarazSharePercent}%)</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            FB + TikTok + IG + Website
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Diversification</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <Award className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{reportData.nonDarazSharePercent}%</span>
                            <span className="text-xs font-medium text-slate-500">/ 60% goal</span>
                        </div>
                        <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (reportData.nonDarazSharePercent / 60) * 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Daily Order Progress Chart & Table (Sun–Sat) */}
            {reportData && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Daily Multi-Platform Order Flow (Sun–Sat)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Day-by-day order counts across all marketing and sales channels.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Daraz
                            </span>
                            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Facebook
                            </span>
                            <span className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" /> TikTok
                            </span>
                            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /> Instagram
                            </span>
                            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Website
                            </span>
                        </div>
                    </div>

                    {/* Bar Chart Representation */}
                    <div className="space-y-4">
                        {reportData.dailyBreakdown.map((day, idx) => {
                            const isToday = day.date === new Date().toISOString().split('T')[0];
                            const barWidth = maxDailyOrders > 0 ? (day.totalOrders / maxDailyOrders) * 100 : 0;

                            return (
                                <div key={idx} className={`p-3.5 rounded-xl border transition-colors ${isToday ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50' : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800/60'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {day.dayName}
                                            </span>
                                            <span className="text-[11px] text-slate-400">{day.date}</span>
                                            {isToday && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                                    TODAY
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-semibold">
                                            <span className="text-slate-900 dark:text-white">
                                                {day.totalOrders} {day.totalOrders === 1 ? 'order' : 'orders'}
                                            </span>
                                            {day.totalRevenue > 0 && (
                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                    Rs. {day.totalRevenue.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stacked Progress Bar */}
                                    <div className="h-3 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden flex">
                                        {day.Daraz > 0 && (
                                            <div
                                                className="bg-amber-500 h-full transition-all duration-300"
                                                style={{ width: `${(day.Daraz / Math.max(day.totalOrders, 1)) * 100}%` }}
                                                title={`Daraz: ${day.Daraz}`}
                                            />
                                        )}
                                        {day.Facebook > 0 && (
                                            <div
                                                className="bg-blue-600 h-full transition-all duration-300"
                                                style={{ width: `${(day.Facebook / Math.max(day.totalOrders, 1)) * 100}%` }}
                                                title={`Facebook: ${day.Facebook}`}
                                            />
                                        )}
                                        {day.TikTok > 0 && (
                                            <div
                                                className="bg-pink-500 h-full transition-all duration-300"
                                                style={{ width: `${(day.TikTok / Math.max(day.totalOrders, 1)) * 100}%` }}
                                                title={`TikTok: ${day.TikTok}`}
                                            />
                                        )}
                                        {day.Instagram > 0 && (
                                            <div
                                                className="bg-purple-600 h-full transition-all duration-300"
                                                style={{ width: `${(day.Instagram / Math.max(day.totalOrders, 1)) * 100}%` }}
                                                title={`Instagram: ${day.Instagram}`}
                                            />
                                        )}
                                        {day.Website > 0 && (
                                            <div
                                                className="bg-emerald-500 h-full transition-all duration-300"
                                                style={{ width: `${(day.Website / Math.max(day.totalOrders, 1)) * 100}%` }}
                                                title={`Website: ${day.Website}`}
                                            />
                                        )}
                                        {day.Others > 0 && (
                                            <div
                                                className="bg-slate-400 h-full transition-all duration-300"
                                                style={{ width: `${(day.Others / Math.max(day.totalOrders, 1)) * 100}%` }}
                                                title={`Others: ${day.Others}`}
                                            />
                                        )}
                                    </div>

                                    {/* Breakdown pill tags */}
                                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                                        {day.Daraz > 0 && <span className="text-amber-700 dark:text-amber-300">Daraz: <strong>{day.Daraz}</strong></span>}
                                        {day.Facebook > 0 && <span className="text-blue-700 dark:text-blue-300">FB: <strong>{day.Facebook}</strong></span>}
                                        {day.TikTok > 0 && <span className="text-pink-700 dark:text-pink-300">TikTok: <strong>{day.TikTok}</strong></span>}
                                        {day.Instagram > 0 && <span className="text-purple-700 dark:text-purple-300">IG: <strong>{day.Instagram}</strong></span>}
                                        {day.Website > 0 && <span className="text-emerald-700 dark:text-emerald-300">Web: <strong>{day.Website}</strong></span>}
                                        {day.totalOrders === 0 && <span className="text-slate-400 italic">No orders recorded</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Platform Distribution & Diversification Target Comparison */}
            {reportData && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        Platform Share vs 90-Day Master Targets
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                        Track progress toward your strategic goal: <strong>Daraz 40% | Facebook 35% | TikTok 15% | Instagram 10%</strong>.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {reportData.platforms.filter(p => p.orders > 0 || p.targetPercent > 0).map((plat, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">{plat.name}</span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                        {plat.orders} orders
                                    </span>
                                </div>

                                <div className="mt-3 flex items-baseline justify-between">
                                    <div>
                                        <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{plat.sharePercent}%</span>
                                        <span className="text-xs text-slate-400 ml-1">actual</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-slate-500">{plat.targetPercent}%</span>
                                        <span className="text-xs text-slate-400 ml-1">target</span>
                                    </div>
                                </div>

                                {/* Comparison bar */}
                                <div className="mt-2 space-y-1">
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${plat.sharePercent >= plat.targetPercent ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(100, plat.sharePercent)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sunday Executive Review & Strategy Adjustment */}
            {reportData && (
                <div className="bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-6 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    Sunday Strategy Ritual
                                </span>
                                {reportData.isReviewed && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Saved & Archived for this week
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                                Sunday Executive Summary & Next Week's Game Plan
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                Spend 5 minutes every Sunday reviewing the Saturday numbers. Logging this breaks the 1-year plateau by keeping you focused on what drives sales.
                            </p>
                        </div>

                        <button
                            onClick={handleSaveSundayReview}
                            disabled={savingReview}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold rounded-xl shadow transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                            {savingReview ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Sunday Summary
                        </button>
                    </div>

                    {saveSuccess && (
                        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Weekly executive review saved successfully! Archived into historical growth reports.
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                1. Weekly Sales Reflection & What Worked
                            </label>
                            <textarea
                                value={sundaySummary}
                                onChange={(e) => setSundaySummary(e.target.value)}
                                rows={4}
                                placeholder="Example: Facebook ads for product X had great ROAS. Daraz sales were steady at 12 orders/day. TikTok demo video got 2,000 views and brought 4 direct inquiries..."
                                className="w-full text-sm p-3.5 rounded-xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                                <ArrowUpRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                2. Next Week's Primary Focus & Platform Priority
                            </label>
                            <textarea
                                value={actionPlan}
                                onChange={(e) => setActionPlan(e.target.value)}
                                rows={4}
                                placeholder="Example: Scale FB Ads budget from $5 to $10/day on the winning creative. Post 2 product videos on TikTok. Test bundling on Daraz to increase average order value..."
                                className="w-full text-sm p-3.5 rounded-xl border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
