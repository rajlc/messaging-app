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
    Target,
    Award,
    Clock,
    Plus,
    Save,
    ChevronRight,
    Coffee,
    Lock,
    Zap,
    Flame
} from 'lucide-react';

interface DayTask {
    id: string;
    time_block: string;
    task_name: string;
    category: string;
    completed: boolean;
}

interface ScheduleDay {
    date: string;
    dayNumber: number | null;
    totalDays: number | null;
    dayTheme: string;
    dailyTarget: string | null;
    totalTasks: number;
    completedTasks: number;
    isLocked: boolean;
    isToday: boolean;
    isSaturday: boolean;
    isHoliday: boolean;
    holidayLabel: string | null;
    hasPlan: boolean;
}

export function DailyPlanTab() {
    const todayNepal = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayNepal);
    const [routineData, setRoutineData] = useState<any>(null);
    const [scheduleList, setScheduleList] = useState<ScheduleDay[]>([]);
    const [loading, setLoading] = useState(true);

    // Focus Timer state (25 minutes = 1500s)
    const [timerSeconds, setTimerSeconds] = useState(25 * 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [timerCompleted, setTimerCompleted] = useState(false);

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

    const fetchScheduleOverview = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/plan/schedule?days=14`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setScheduleList(data);
            }
        } catch (e) {
            console.error('Failed to fetch schedule overview:', e);
        }
    };

    const fetchRoutine = async (date: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/routine/${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setRoutineData(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchScheduleOverview();
    }, []);

    useEffect(() => {
        fetchRoutine(selectedDate);
    }, [selectedDate]);

    const handleToggleTask = async (task: DayTask) => {
        if (routineData?.isLocked) {
            alert('This routine is locked after midnight Nepal Time.');
            return;
        }

        const newCompleted = !task.completed;
        // Optimistic update
        setRoutineData((prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                tasks: prev.tasks.map((t: DayTask) => t.id === task.id ? { ...t, completed: newCompleted } : t)
            };
        });

        // Update schedule strip optimistic count
        setScheduleList(prev => prev.map(s => {
            if (s.date === selectedDate) {
                return {
                    ...s,
                    completedTasks: newCompleted ? s.completedTasks + 1 : Math.max(0, s.completedTasks - 1)
                };
            }
            return s;
        }));

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/routine/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: selectedDate,
                    taskId: task.id,
                    completed: newCompleted,
                })
            });
            if (!res.ok) {
                // Revert
                fetchRoutine(selectedDate);
                fetchScheduleOverview();
            }
        } catch (e) {
            console.error(e);
            fetchRoutine(selectedDate);
            fetchScheduleOverview();
        }
    };

    const formatTimer = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const tasks: DayTask[] = routineData?.tasks || [];
    const workTasks = tasks.filter(t => t.category === 'work');
    const completedWorkCount = workTasks.filter(t => t.completed).length;
    const workPercent = workTasks.length > 0 ? Math.round((completedWorkCount / workTasks.length) * 100) : 0;

    // Split work tasks: Morning blocks (before 1 PM) and Afternoon blocks (after 2 PM)
    const morningWork = workTasks.filter(t => t.time_block.includes('AM') || t.time_block.startsWith('12:'));
    const afternoonWork = workTasks.filter(t => !morningWork.some(m => m.id === t.id));

    return (
        <div className="space-y-6">
            {/* Header & Date Selector */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Daily Plan & Calendar
                        </span>
                        {routineData?.isLocked && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Locked (Historical)
                            </span>
                        )}
                        {selectedDate === todayNepal && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                                Today
                            </span>
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Daily Strategic Schedule
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Inspect day-by-day hourly execution routines created by your AI strategy.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Date:</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                        />
                    </div>
                    {selectedDate !== todayNepal && (
                        <button
                            onClick={() => setSelectedDate(todayNepal)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                        >
                            Today
                        </button>
                    )}
                </div>
            </div>

            {/* Interactive Multi-Day Sprint Roadmap Strip */}
            {scheduleList.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                            <Flame className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Multi-Day Strategic Sprint Roadmap
                            </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                            Click any day card to inspect its hourly plan
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                        {scheduleList.map((day) => {
                            const isSelected = day.date === selectedDate;
                            const isDone = day.totalTasks > 0 && day.completedTasks === day.totalTasks;
                            const dayDateObj = new Date(day.date);
                            const dayName = dayDateObj.toLocaleDateString('en-US', { weekday: 'short' });
                            const monthDay = day.date.slice(5);

                            return (
                                <button
                                    key={day.date}
                                    onClick={() => setSelectedDate(day.date)}
                                    className={`shrink-0 p-3 rounded-xl border text-left transition-all cursor-pointer min-w-[155px] ${
                                        isSelected
                                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm ring-1 ring-blue-500'
                                            : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-[11px] font-extrabold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {dayName} {monthDay}
                                        </span>
                                        {day.isSaturday ? (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                                                Off
                                            </span>
                                        ) : day.isHoliday ? (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400">
                                                Holiday
                                            </span>
                                        ) : day.dayNumber ? (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                                                Day {day.dayNumber}
                                            </span>
                                        ) : null}
                                    </div>

                                    <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate mb-2" title={day.dayTheme}>
                                        {day.dayTheme}
                                    </p>

                                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                        {day.totalTasks > 0 ? (
                                            <>
                                                <span>{day.completedTasks}/{day.totalTasks} Done</span>
                                                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                            </>
                                        ) : (
                                            <span className="italic">Rest / Flex</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Selected Day Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Day Theme & Strategic Target Banner */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 text-white shadow-lg space-y-2 relative overflow-hidden">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white">
                                {routineData?.dayNumber ? `Day ${routineData.dayNumber} of ${routineData.totalDays || 7} Plan` : 'Strategic Agenda'}
                            </span>
                            <span className="text-xs text-blue-200 font-medium">
                                {selectedDate}
                            </span>
                        </div>

                        <h3 className="text-lg font-bold text-white leading-tight">
                            {routineData?.dayTheme || routineData?.activeGoal || 'High-Impact Multi-Channel Execution'}
                        </h3>

                        {routineData?.dayTarget && (
                            <div className="flex items-start gap-2 pt-1 border-t border-white/10 text-xs text-blue-100">
                                <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <span>
                                    <strong>Must-Win Target:</strong> {routineData.dayTarget}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Work Hours Schedule (Hourly) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div>
                                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                    Hourly Work Schedule (9:00 AM – 6:00 PM)
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    8 dedicated 1-hour sprints with protected 1–2 PM lunch reset
                                </p>
                            </div>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full">
                                {completedWorkCount} / {workTasks.length} Done ({workPercent}%)
                            </span>
                        </div>

                        {/* Progress bar */}
                        {workTasks.length > 0 && (
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${workPercent}%` }}
                                />
                            </div>
                        )}

                        {workTasks.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 text-xs">
                                No hourly work tasks scheduled for {selectedDate}. Generate a strategy in Strategy Board to populate this day.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Morning Work Blocks */}
                                {morningWork.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleToggleTask(task)}
                                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                                            task.completed
                                                ? 'bg-slate-50/70 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 text-slate-400'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 text-slate-900 dark:text-white'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {task.completed ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-blue-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 mr-2">
                                                {task.time_block}
                                            </span>
                                            <span className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {task.task_name}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {/* Protected Lunch Break Marker */}
                                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-900 dark:text-amber-300">
                                    <div className="flex items-center gap-2">
                                        <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span className="font-bold">1:00 PM – 2:00 PM: Lunch & Mental Reset</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/40">
                                        Protected Rest Period
                                    </span>
                                </div>

                                {/* Afternoon Work Blocks */}
                                {afternoonWork.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleToggleTask(task)}
                                        className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 cursor-pointer select-none ${
                                            task.completed
                                                ? 'bg-slate-50/70 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 text-slate-400'
                                                : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 text-slate-900 dark:text-white'
                                        }`}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {task.completed ? (
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                                            ) : (
                                                <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600 hover:text-blue-500" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 mr-2">
                                                {task.time_block}
                                            </span>
                                            <span className={`text-xs font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {task.task_name}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Col: Deep Work Pomodoro Focus Timer */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 border border-purple-900/40 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                                Focus Sprint (Pomodoro)
                            </span>
                        </div>

                        <h3 className="text-base font-bold text-white mb-1">
                            Single-Task Deep Work
                        </h3>
                        <p className="text-xs text-purple-200 mb-6">
                            Put your phone away. Work on today's priority for 25 minutes uninterrupted.
                        </p>

                        <div className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-2xl border border-white/10 mb-6">
                            <span className="text-5xl font-mono font-extrabold tracking-widest text-white mb-2">
                                {formatTimer(timerSeconds)}
                            </span>
                            <span className="text-xs text-purple-300 font-medium">
                                {isTimerRunning ? '🔥 Sprint active — zero distractions' : timerCompleted ? '🎉 Sprint complete! Take a 5m break.' : 'Ready to start 25m sprint'}
                            </span>
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setIsTimerRunning(!isTimerRunning)}
                                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                                    isTimerRunning
                                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                        : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white'
                                }`}
                            >
                                {isTimerRunning ? (
                                    <>
                                        <Pause className="w-4 h-4 fill-slate-950" /> Pause
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 fill-white" /> Start Sprint
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => {
                                    setIsTimerRunning(false);
                                    setTimerSeconds(25 * 60);
                                    setTimerCompleted(false);
                                }}
                                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                                title="Reset"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
