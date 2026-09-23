"use client";

import React, { useState, useEffect } from 'react';
import {
    Flame,
    Palmtree,
    CheckCircle2,
    Clock,
    TrendingUp,
    Play,
    Calendar,
    Sparkles,
    ArrowRight,
    Sun,
    ShoppingBag,
    Award
} from 'lucide-react';

interface GrowthOverviewProps {
    onNavigateTab: (tab: string) => void;
    onOpenHolidayModal: () => void;
    onStartFocusTimer: () => void;
}

export function GrowthOverview({
    onNavigateTab,
    onOpenHolidayModal,
    onStartFocusTimer
}: GrowthOverviewProps) {
    const [overview, setOverview] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchOverview = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/overview`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOverview(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, []);

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const userName = user?.full_name || user?.name || 'Partner';

    return (
        <div className="space-y-6">
            {/* Top Welcome & Streak Card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-indigo-900/50 shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1.5 shadow-sm">
                                <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                                {overview?.streakDays || 7} Day Discipline Streak
                            </span>
                            {overview?.isHolidayToday && (
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                                    <Palmtree className="w-4 h-4 text-emerald-400" />
                                    Holiday Mode Active: {overview?.currentHoliday?.label || 'Store Holiday'}
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Welcome Back, {userName} 👋
                        </h1>
                        <p className="text-slate-300 text-sm mt-1 max-w-xl">
                            "Discipline is choosing between what you want now and what you want most." 
                            You are in control of your business across Daraz, Facebook, TikTok, and Instagram.
                        </p>
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={onStartFocusTimer}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                        >
                            <Play className="w-3.5 h-3.5 fill-slate-950" />
                            Start Focus Sprint (25m)
                        </button>
                        <button
                            onClick={onOpenHolidayModal}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <Palmtree className="w-3.5 h-3.5 text-emerald-400" />
                            {overview?.isHolidayToday ? 'Manage Holiday' : 'Set Holiday Mode'}
                        </button>
                    </div>
                </div>

                {/* Routine Completion Progress Bar */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400">Today's Routine</div>
                            <div className="text-sm font-bold text-white">
                                {overview?.routineProgress?.completed || 0} of {overview?.routineProgress?.total || 8} Tasks Done
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400">Master Growth Goal</div>
                            <div className="text-sm font-bold text-white">Multi-Channel Freedom (40/35/15/10)</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs text-slate-400">Saturday Automated Report</div>
                            <div className="text-sm font-bold text-white">Sunday Strategy Review</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Daily Routine Card */}
                <div 
                    onClick={() => onNavigateTab('routine')}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Clock className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Open Routine <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        Daily Disciplined Routine
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        6:30 AM to 10:00 PM structured checklist. Automatic rollover for incomplete tasks to tomorrow.
                    </p>
                </div>

                {/* 2. Order Progress Report Card */}
                <div 
                    onClick={() => onNavigateTab('order-report')}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            View Report <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        Order Progress & Saturday Report
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Real-time daily tracking across Daraz + all channels. Saturday automated snapshot & Sunday executive review.
                    </p>
                </div>

                {/* 3. 90-Day Master Planner */}
                <div 
                    onClick={() => onNavigateTab('planner')}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md hover:border-purple-400 dark:hover:border-purple-500 transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Open Planner <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        90-Day Master Growth Plan
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Daily milestones: Month 1 (Foundation) ➔ Month 2 (Scale FB/TikTok) ➔ Month 3 (Mastery). Focus timer integrated.
                    </p>
                </div>
            </div>

            {/* Nepali Festival Smart Suggestion Card */}
            <div className="bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-700 dark:text-amber-400 shrink-0">
                        <Sun className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                            Smart Nepali Festival & Holiday Assistant
                        </h4>
                        <p className="text-xs text-amber-800/80 dark:text-amber-300/70 mt-0.5">
                            When holidays like Dashain, Tihar, or team off-days arrive, activate Holiday Mode with 1-click so tasks don't show as incomplete and your streak is protected.
                        </p>
                    </div>
                </div>
                <button
                    onClick={onOpenHolidayModal}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
                >
                    Schedule Holiday
                </button>
            </div>
        </div>
    );
}
