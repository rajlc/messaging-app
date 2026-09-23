"use client";

import React, { useState, useEffect } from 'react';
import {
    Calendar,
    CheckCircle2,
    Circle,
    Play,
    Pause,
    RotateCcw,
    Sparkles,
    Flame,
    Target,
    Award,
    ChevronRight,
    ChevronLeft,
    Check,
    Volume2,
    Bell
} from 'lucide-react';

interface PlannerDayTask {
    id: string;
    text: string;
    completed: boolean;
}

// Master 90-day core curriculum themes
const MONTH_THEMES = [
    {
        month: 1,
        title: "Month 1: Multi-Channel Foundation (Days 1–30)",
        description: "Set up Facebook Pixel & Ads Catalog, revive TikTok organic, optimize Daraz listings to build immediate cashflow safety outside Daraz.",
        target: "Goal: 20-25 orders/week from Facebook & TikTok combined"
    },
    {
        month: 2,
        title: "Month 2: Scale Facebook & TikTok (Days 31–60)",
        description: "Scale winning ad creatives, test Advantage+ shopping campaigns, implement WhatsApp/Messenger automated followups.",
        target: "Goal: 40% Daraz / 35% FB / 15% TikTok / 10% IG distribution"
    },
    {
        month: 3,
        title: "Month 3: Systematization & Freedom (Days 61–90)",
        description: "Standard operating procedures (SOPs) for order dispatch, customer care delegation, personal work-life balance solidified.",
        target: "Goal: Scalable 350+ orders/week with guilt-free personal routine"
    },
];

export function NinetyDayPlanner() {
    const [activeMonth, setActiveMonth] = useState<number>(1);
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [dayTasks, setDayTasks] = useState<PlannerDayTask[]>([]);
    const [dayNotes, setDayNotes] = useState<string>('');

    // Focus Timer state (25 minutes = 1500s)
    const [timerSeconds, setTimerSeconds] = useState(25 * 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerCompleted, setTimerCompleted] = useState(false);

    // Timer effect
    useEffect(() => {
        let interval: any = null;
        if (isTimerRunning && timerSeconds > 0) {
            interval = setInterval(() => {
                setTimerSeconds(s => s - 1);
            }, 1000);
        } else if (timerSeconds === 0 && isTimerRunning) {
            setIsTimerRunning(false);
            setTimerCompleted(true);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timerSeconds]);

    // Load tasks for selected day
    useEffect(() => {
        const key = `growth_planner_day_${selectedDay}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setDayTasks(parsed.tasks || []);
                setDayNotes(parsed.notes || '');
                return;
            } catch (e) { }
        }

        // Default tasks based on day
        const defaultTasks: PlannerDayTask[] = [
            { id: '1', text: `Execute Day ${selectedDay} platform growth sprint (2 hours focus)`, completed: false },
            { id: '2', text: 'Film or review 1 short product creative (Reels / TikTok)', completed: false },
            { id: '3', text: 'Audit courier delivery status for pending parcels', completed: false },
            { id: '4', text: 'Daily reflection: Log wins & sleep on time (10:30 PM)', completed: false },
        ];
        setDayTasks(defaultTasks);
        setDayNotes('');
    }, [selectedDay]);

    const handleToggleTask = (id: string) => {
        const updated = dayTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        setDayTasks(updated);
        localStorage.setItem(`growth_planner_day_${selectedDay}`, JSON.stringify({ tasks: updated, notes: dayNotes }));
    };

    const handleSaveNotes = (text: string) => {
        setDayNotes(text);
        localStorage.setItem(`growth_planner_day_${selectedDay}`, JSON.stringify({ tasks: dayTasks, notes: text }));
    };

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const currentTheme = MONTH_THEMES[activeMonth - 1];

    return (
        <div className="space-y-6">
            {/* Header & Month Tabs */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                                90-Day Transformation
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                                Currently on Day {selectedDay} of 90
                            </span>
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {currentTheme.title}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                            {currentTheme.description}
                        </p>
                    </div>

                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold text-purple-900 dark:text-purple-200">
                        {currentTheme.target}
                    </div>
                </div>

                {/* Month Selector Buttons */}
                <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                    {[1, 2, 3].map(m => (
                        <button
                            key={m}
                            onClick={() => {
                                setActiveMonth(m);
                                setSelectedDay((m - 1) * 30 + 1);
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeMonth === m
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            Month {m} (Days {(m - 1) * 30 + 1}–{m * 30})
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Days Grid & Selected Day Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Days Ribbon / Grid */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Select Day (Month {activeMonth})
                            </span>
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                                Day {selectedDay} Selected
                            </span>
                        </div>

                        <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                            {Array.from({ length: 30 }, (_, i) => {
                                const dayNum = (activeMonth - 1) * 30 + i + 1;
                                const isSelected = dayNum === selectedDay;
                                const isSaturdayHoliday = dayNum % 7 === 0;

                                return (
                                    <button
                                        key={dayNum}
                                        onClick={() => setSelectedDay(dayNum)}
                                        className={`p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer ${
                                            isSelected
                                                ? 'bg-purple-600 text-white shadow-md scale-105'
                                                : isSaturdayHoliday
                                                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 hover:border-amber-400'
                                                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 hover:border-purple-300'
                                        }`}
                                    >
                                        <span>D{dayNum}</span>
                                        {isSaturdayHoliday && <span className="text-[9px] font-normal">Off</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Day Task Checklist */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    Day {selectedDay} Actionable Sprint
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Mark each item as you finish. Keep focus intense and single-threaded.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {dayTasks.map(task => (
                                <div
                                    key={task.id}
                                    onClick={() => handleToggleTask(task.id)}
                                    className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 cursor-pointer ${
                                        task.completed
                                            ? 'bg-purple-50/40 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/50 text-slate-400 dark:text-slate-500'
                                            : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white hover:border-purple-300'
                                    }`}
                                >
                                    {task.completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 shrink-0" />
                                    )}
                                    <span className={`text-sm font-medium ${task.completed ? 'line-through' : ''}`}>
                                        {task.text}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Day Notes */}
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 block">
                                Day {selectedDay} Key Observations & Ideas
                            </label>
                            <textarea
                                value={dayNotes}
                                onChange={(e) => handleSaveNotes(e.target.value)}
                                rows={3}
                                placeholder="Write down any breakthrough, customer objection, winning video hook, or notes for tomorrow..."
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Col: Deep Work Focus Timer (Pomodoro 25m) */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 border border-purple-900/40 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                                Focus Sprint (Pomodoro)
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-white mb-1">
                            Single-Task Deep Work
                        </h3>
                        <p className="text-xs text-purple-200 mb-6">
                            Pick ONE task above. Put your phone away. Work for 25 minutes uninterrupted.
                        </p>

                        {/* Circular Timer Display */}
                        <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10 mb-6">
                            <span className="text-5xl font-mono font-extrabold tracking-widest text-white mb-2">
                                {formatTimer(timerSeconds)}
                            </span>
                            <span className="text-xs text-purple-300 font-medium">
                                {isTimerRunning ? '🔥 Sprint in progress — zero distractions' : timerCompleted ? '🎉 Sprint Complete! Take a 5m break.' : 'Ready to start 25m sprint'}
                            </span>
                        </div>

                        {/* Timer Controls */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setIsTimerRunning(!isTimerRunning)}
                                className={`px-6 py-3 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                                    isTimerRunning
                                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                        : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white'
                                }`}
                            >
                                {isTimerRunning ? (
                                    <>
                                        <Pause className="w-4 h-4 fill-slate-950" />
                                        Pause Sprint
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 fill-white" />
                                        Start Sprint (25m)
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    setIsTimerRunning(false);
                                    setTimerSeconds(25 * 60);
                                    setTimerCompleted(false);
                                }}
                                className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                                title="Reset Timer"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Anti-Burnout Rule */}
                    <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs mb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Saturday Rest Rule
                        </div>
                        <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80">
                            Every Saturday is marked as an off-day. Taking proper rest protects your mental energy so you don't feel tired and stuck throughout the week.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
