"use client";

import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Calendar,
    CheckCircle2,
    AlertTriangle,
    Target,
    Lightbulb,
    Copy,
    Check,
    RefreshCw,
    TrendingUp,
    FileText,
    Share2
} from 'lucide-react';

export function AiReportTab() {
    const todayNepal = new Date().toISOString().split('T')[0];
    const [subTab, setSubTab] = useState<'daily' | 'weekly'>('daily');

    // Daily Report state
    const [selectedDate, setSelectedDate] = useState(todayNepal);
    const [dailyReport, setDailyReport] = useState<any>(null);
    const [loadingDaily, setLoadingDaily] = useState(false);

    // Weekly Report state
    const [selectedWeek, setSelectedWeek] = useState(todayNepal);
    const [weeklyReport, setWeeklyReport] = useState<any>(null);
    const [loadingWeekly, setLoadingWeekly] = useState(false);

    const [copied, setCopied] = useState(false);

    const fetchDailyReport = async (date: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ai-report/daily/${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setDailyReport(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleGenerateDailyReport = async () => {
        setLoadingDaily(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ai-report/daily/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date: selectedDate })
            });
            if (res.ok) {
                const data = await res.json();
                setDailyReport(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingDaily(false);
        }
    };

    const fetchWeeklyReport = async (week: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ai-report/weekly/${week}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setWeeklyReport(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleGenerateWeeklyReport = async () => {
        setLoadingWeekly(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/ai-report/weekly/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ weekStart: selectedWeek })
            });
            if (res.ok) {
                const data = await res.json();
                setWeeklyReport(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingWeekly(false);
        }
    };

    useEffect(() => {
        if (subTab === 'daily') {
            fetchDailyReport(selectedDate);
        } else {
            fetchWeeklyReport(selectedWeek);
        }
    }, [subTab, selectedDate, selectedWeek]);

    const handleCopyWeeklySummary = () => {
        if (!weeklyReport) return;
        const text = `📊 **Bagmati Growth Weekly AI Synthesis (${weeklyReport.weekStart})**\n\n` +
            `🎯 **Strategy Goal**: ${weeklyReport.strategyGoal}\n\n` +
            `✅ **Key Accomplishments**:\n${weeklyReport.keyAccomplishments.map((a: string) => `- ${a}`).join('\n')}\n\n` +
            `⚠️ **Critical Bottlenecks**:\n${weeklyReport.criticalBottlenecks.map((b: string) => `- ${b}`).join('\n')}\n\n` +
            `🚀 **Next Week Directives**:\n${weeklyReport.nextWeekDirectives.map((d: string) => `- ${d}`).join('\n')}`;

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="space-y-6">
            {/* Header & Sub-Tab Switcher */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 fill-indigo-500 text-indigo-500" />
                            Autonomous Growth Synthesis
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        AI Executive Intelligence Report
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        AI analyzes your completed routines, daily summaries, strategy goals, and daily plans to keep you focused and eliminate distractions.
                    </p>
                </div>

                {/* Sub-Buttons: Daily Report | Weekly Report */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setSubTab('daily')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            subTab === 'daily'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Daily Report
                    </button>
                    <button
                        onClick={() => setSubTab('weekly')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            subTab === 'weekly'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        Weekly Report
                    </button>
                </div>
            </div>

            {/* Sub-Tab 1: Daily Report */}
            {subTab === 'daily' && (
                <div className="space-y-6">
                    {/* Date picker & Generate Action */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Date:</span>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateDailyReport}
                            disabled={loadingDaily}
                            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            {loadingDaily ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Generate Daily AI Report
                        </button>
                    </div>

                    {/* Report Output */}
                    {!dailyReport ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                            No report generated for {selectedDate} yet. Click "Generate Daily AI Report" to analyze yesterday's completed tasks, daily summary, and today's priorities!
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Section 1: Yesterday Audit */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            1. Yesterday's Execution Audit ({dailyReport.yesterdayDate})
                                        </h3>
                                    </div>
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                        dailyReport.yesterdayAudit.completionRate >= 70
                                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                                    }`}>
                                        {dailyReport.yesterdayAudit.completedCount} / {dailyReport.yesterdayAudit.totalTasks} Tasks Completed ({dailyReport.yesterdayAudit.completionRate}%)
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Completed list */}
                                    <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                                        <h4 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                            Completed Yesterday
                                        </h4>
                                        {dailyReport.yesterdayAudit.completedTaskNames.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic">No tasks completed yesterday</p>
                                        ) : (
                                            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                {dailyReport.yesterdayAudit.completedTaskNames.map((name: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                        <span>{name}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    {/* Dropped / Pending */}
                                    <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                                        <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                                            Pending / Rolled Over
                                        </h4>
                                        {dailyReport.yesterdayAudit.droppedTaskNames.length === 0 ? (
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">All scheduled tasks completed!</p>
                                        ) : (
                                            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                                                {dailyReport.yesterdayAudit.droppedTaskNames.map((name: string, i: number) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                        <span>{name}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>

                                {/* User's Written Summary */}
                                <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                                    <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                                        Yesterday's Written Daily Work Summary:
                                    </h4>
                                    <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                                        "{dailyReport.yesterdayAudit.userSummaryText}"
                                    </p>
                                </div>
                            </div>

                            {/* Section 2: Today's Strategic Focus */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                                    <Target className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                            2. Today's Must-Win Focus ({dailyReport.date})
                                        </h3>
                                        <p className="text-xs text-slate-500">Aligned with active Strategy & Daily Plan</p>
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    {dailyReport.todayFocus.topPriorities.map((item: string, idx: number) => (
                                        <div
                                            key={idx}
                                            className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex items-center gap-3"
                                        >
                                            <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                                                {item}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 3: Actionable Advice */}
                            <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
                                <Lightbulb className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider mb-1">
                                        Actionable Discipline Directive for Today
                                    </h4>
                                    <p className="text-xs text-amber-900/90 dark:text-amber-300">
                                        {dailyReport.strategicAdvice}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sub-Tab 2: Weekly Report */}
            {subTab === 'weekly' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Week Starting:</span>
                                <input
                                    type="date"
                                    value={selectedWeek}
                                    onChange={(e) => setSelectedWeek(e.target.value)}
                                    className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {weeklyReport && (
                                <button
                                    onClick={handleCopyWeeklySummary}
                                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    {copied ? 'Copied to Clipboard!' : 'Copy Summary for Partner'}
                                </button>
                            )}

                            <button
                                onClick={handleGenerateWeeklyReport}
                                disabled={loadingWeekly}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                                {loadingWeekly ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                                Generate Weekly AI Report
                            </button>
                        </div>
                    </div>

                    {!weeklyReport ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                            No weekly synthesis generated yet. Click "Generate Weekly AI Report" to summarize the full 7-day retrospective!
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Strategy Goal banner */}
                            <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                                    Strategic Focus This Week
                                </span>
                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                                    {weeklyReport.strategyGoal}
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Accomplishments */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        Key Accomplishments
                                    </h4>
                                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                        {weeklyReport.keyAccomplishments.map((a: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                                <span>{a}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Bottlenecks */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                                    <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                                        Critical Friction Points
                                    </h4>
                                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                        {weeklyReport.criticalBottlenecks.map((b: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Directives */}
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                                    <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Target className="w-4 h-4 text-blue-500" />
                                        Next Week Directives
                                    </h4>
                                    <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                                        {weeklyReport.nextWeekDirectives.map((d: string, i: number) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                                                <span>{d}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
