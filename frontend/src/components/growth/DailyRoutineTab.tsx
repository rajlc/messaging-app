"use client";

import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Circle,
    Clock,
    Plus,
    RotateCcw,
    AlertTriangle,
    Calendar,
    Trash2,
    Edit3,
    Check,
    X,
    Sun,
    Briefcase,
    Moon,
    Target,
    FileText,
    Save,
    Lock,
    Coffee,
    Sparkles,
    Flame
} from 'lucide-react';

interface RoutineTask {
    id: string;
    time_block: string;
    task_name: string;
    category: 'morning' | 'work' | 'evening';
    auto_rollover: boolean;
    sort_order: number;
    completed?: boolean;
    rolled_from?: string | null;
    rollover_count?: number;
}

export function DailyRoutineTab() {
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [tasks, setTasks] = useState<RoutineTask[]>([]);
    const [isLocked, setIsLocked] = useState(false);
    const [activeGoal, setActiveGoal] = useState('');
    const [priorityFocus, setPriorityFocus] = useState('');
    const [dayTheme, setDayTheme] = useState<string | null>(null);
    const [dayTarget, setDayTarget] = useState<string | null>(null);
    const [dayNumber, setDayNumber] = useState<number | null>(null);
    const [totalDays, setTotalDays] = useState<number | null>(null);
    const [dailySummary, setDailySummary] = useState('');
    const [savingSummary, setSavingSummary] = useState(false);
    const [summarySaved, setSummarySaved] = useState(false);
    const [loading, setLoading] = useState(true);

    // New / Edit task state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [taskForm, setTaskForm] = useState({
        time_block: '',
        task_name: '',
        category: 'work' as 'morning' | 'work' | 'evening',
        auto_rollover: true,
    });

    // Rollover Modal
    const [rolloverTargetTask, setRolloverTargetTask] = useState<RoutineTask | null>(null);
    const [targetRolloverDate, setTargetRolloverDate] = useState('');

    const fetchRoutine = async (date: string) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/routine/${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data.tasks || []);
                setIsLocked(!!data.isLocked);
                setActiveGoal(data.activeGoal || '');
                setPriorityFocus(data.priorityFocus || '');
                setDayTheme(data.dayTheme || null);
                setDayTarget(data.dayTarget || null);
                setDayNumber(data.dayNumber || null);
                setTotalDays(data.totalDays || null);
                setDailySummary(data.dailySummary || '');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutine(selectedDate);
    }, [selectedDate]);

    const handleToggleTask = async (task: RoutineTask) => {
        if (isLocked) return;

        const newCompleted = !task.completed;
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: newCompleted } : t));

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
                const err = await res.json();
                alert(err.message || 'Action cannot be completed.');
                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !newCompleted } : t));
            }
        } catch (e) {
            console.error(e);
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !newCompleted } : t));
        }
    };

    const handleSaveSummary = async () => {
        setSavingSummary(true);
        setSummarySaved(false);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/routine/summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    date: selectedDate,
                    summary: dailySummary,
                })
            });
            if (res.ok) {
                setSummarySaved(true);
                setTimeout(() => setSummarySaved(false), 3000);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSavingSummary(false);
        }
    };

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.task_name.trim() || isLocked) return;

        let updatedList: RoutineTask[];
        if (editingTaskId) {
            updatedList = tasks.map(t => t.id === editingTaskId ? {
                ...t,
                time_block: taskForm.time_block,
                task_name: taskForm.task_name,
                category: taskForm.category,
                auto_rollover: taskForm.auto_rollover,
            } : t);
        } else {
            const newTask: RoutineTask = {
                id: `rt_${Date.now()}`,
                time_block: taskForm.time_block,
                task_name: taskForm.task_name,
                category: taskForm.category,
                auto_rollover: taskForm.auto_rollover,
                sort_order: tasks.length + 1,
                completed: false,
            };
            updatedList = [...tasks, newTask];
        }

        setTasks(updatedList);
        setIsAddModalOpen(false);
        setEditingTaskId(null);
        setTaskForm({ time_block: '', task_name: '', category: 'work', auto_rollover: true });

        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/routine/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tasks: updatedList })
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteTask = async (id: string) => {
        if (isLocked) return;
        if (!confirm('Are you sure you want to remove this task from your routine template?')) return;
        const updatedList = tasks.filter(t => t.id !== id);
        setTasks(updatedList);

        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/routine/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tasks: updatedList })
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleExecuteRollover = async () => {
        if (!rolloverTargetTask || !targetRolloverDate || isLocked) return;

        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/routine/rollover`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fromDate: selectedDate,
                    toDate: targetRolloverDate,
                    taskId: rolloverTargetTask.id,
                })
            });

            setRolloverTargetTask(null);
            fetchRoutine(selectedDate);
        } catch (e) {
            console.error(e);
        }
    };

    const completedCount = tasks.filter(t => t.completed).length;
    const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

    const morningTasks = tasks.filter(t => t.category === 'morning');
    const workTasks = tasks.filter(t => t.category === 'work');
    const eveningTasks = tasks.filter(t => t.category === 'evening');

    return (
        <div className="space-y-6">
            {/* Top Strategic Goal & Priority Focus Banner */}
            {activeGoal && (
                <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-indigo-800/60 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1 w-full">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-indigo-400" />
                                Current Strategic Target Focus
                            </span>
                            <h3 className="text-base font-extrabold text-white">
                                {activeGoal}
                            </h3>
                            {priorityFocus && (
                                <p className="text-xs text-indigo-200/90 whitespace-pre-line mt-1">
                                    {priorityFocus}
                                </p>
                            )}

                            {/* Day-Specific Theme & Target if active strategy day */}
                            {dayTheme && (
                                <div className="mt-3 p-3.5 rounded-xl bg-white/10 border border-white/15 flex items-start gap-2.5">
                                    <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                                    <div className="text-xs">
                                        <span className="font-extrabold text-white block">
                                            {dayNumber ? `Day ${dayNumber} of ${totalDays || 7} Focus: ` : 'Daily Focus: '}{dayTheme}
                                        </span>
                                        {dayTarget && (
                                            <span className="text-indigo-200 text-[11px] block mt-0.5">
                                                🎯 Target: {dayTarget}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Header & Date Controls */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Daily Disciplined Routine
                        </h2>
                        {isLocked ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                                <Lock className="w-3 h-3 text-slate-500" />
                                Locked (Past Date Archive)
                            </span>
                        ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                🟢 Active (Editable until 11:59 PM NPT)
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Work hours strictly 9:00 AM – 6:00 PM. Checked tasks lock at Nepal midnight to preserve truthful historical progress.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <Calendar className="w-4 h-4 text-slate-500 ml-1" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                        />
                        {selectedDate !== todayStr && (
                            <button
                                onClick={() => setSelectedDate(todayStr)}
                                className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded-lg cursor-pointer"
                            >
                                Today
                            </button>
                        )}
                    </div>

                    {!isLocked && (
                        <button
                            onClick={() => {
                                setEditingTaskId(null);
                                setTaskForm({ time_block: '', task_name: '', category: 'work', auto_rollover: true });
                                setIsAddModalOpen(true);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                            <Plus className="w-4 h-4" />
                            Add Custom Task
                        </button>
                    )}
                </div>
            </div>

            {/* Lock Warning Notice if past date */}
            {isLocked && (
                <div className="p-3.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>This date has passed midnight Nepal Time. Routine checkboxes and edits are locked to preserve truthful progress records for your Daily AI Report.</span>
                </div>
            )}

            {/* Progress Overview Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Routine Execution: {completedCount} / {tasks.length} Completed ({progressPercent}%)
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {progressPercent === 100 ? '🎉 Perfect Day Complete!' : `${tasks.length - completedCount} tasks remaining`}
                    </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>

            {/* Task Sections */}
            <div className="space-y-6">
                {/* 1. Morning Routine */}
                {morningTasks.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            <Sun className="w-4 h-4" />
                            Morning Clarity & Energy (6:30 AM – 9:00 AM)
                        </div>
                        <div className="space-y-2">
                            {morningTasks.map(task => renderTaskRow(task))}
                        </div>
                    </div>
                )}

                {/* 2. High-Impact Work Hours */}
                {workTasks.length > 0 && (() => {
                    const morningWork = workTasks.filter(t => t.time_block.includes('AM') || t.time_block.startsWith('12:'));
                    const afternoonWork = workTasks.filter(t => !morningWork.some(m => m.id === t.id));

                    return (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    <Briefcase className="w-4 h-4" />
                                    High-Impact Work Hours (9:00 AM – 6:00 PM)
                                </div>
                                <span className="text-[11px] text-slate-400">
                                    8 Hourly Execution Blocks
                                </span>
                            </div>

                            <div className="space-y-2">
                                {morningWork.map(task => renderTaskRow(task))}

                                {/* Protected Lunch Break Marker */}
                                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-900 dark:text-amber-300 my-2">
                                    <div className="flex items-center gap-2">
                                        <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span className="font-bold">1:00 PM – 2:00 PM: Lunch & Mental Reset</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/40">
                                        Protected Rest Period
                                    </span>
                                </div>

                                {afternoonWork.map(task => renderTaskRow(task))}
                            </div>
                        </div>
                    );
                })()}

                {/* 3. Evening Personal Recovery */}
                {eveningTasks.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            <Moon className="w-4 h-4" />
                            Personal Recovery & Family Time (7:30 PM – 10:00 PM)
                        </div>
                        <div className="space-y-2">
                            {eveningTasks.map(task => renderTaskRow(task))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Section: Daily Work Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                                Daily Work Summary & Review ({selectedDate})
                            </h3>
                            <p className="text-xs text-slate-500">
                                Type your day's achievements, dispatch counts, ad testing notes, or blockers. AI uses this tomorrow morning for your Daily Report.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleSaveSummary}
                        disabled={savingSummary}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {savingSummary ? 'Saving...' : 'Save Daily Summary'}
                    </button>
                </div>

                {summarySaved && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Daily work summary saved successfully!
                    </div>
                )}

                <textarea
                    value={dailySummary}
                    onChange={(e) => setDailySummary(e.target.value)}
                    rows={4}
                    placeholder="Example: Confirmed 18 Daraz orders and 5 Facebook orders. Tested new TikTok 3-second hook video. Courier handover completed by 4:30 PM. One customer returned delivery on Pathao..."
                    className="w-full text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* Add / Edit Task Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            {editingTaskId ? 'Edit Routine Task' : 'Add Routine Task'}
                        </h3>
                        <form onSubmit={handleSaveTask} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Time Block</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 10:00 AM - 11:30 AM"
                                    value={taskForm.time_block}
                                    onChange={(e) => setTaskForm({ ...taskForm, time_block: e.target.value })}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Task Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Film 1 product demonstration video"
                                    value={taskForm.task_name}
                                    onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
                                    required
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Section</label>
                                <select
                                    value={taskForm.category}
                                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value as any })}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="morning">Morning Clarity (6:30 - 9:00 AM)</option>
                                    <option value="work">High-Impact Work (9:00 AM - 6:00 PM)</option>
                                    <option value="evening">Personal Recovery (7:30 - 10:00 PM)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="auto_rollover"
                                    checked={taskForm.auto_rollover}
                                    onChange={(e) => setTaskForm({ ...taskForm, auto_rollover: e.target.checked })}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="auto_rollover" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                    Auto-rollover to next day if not completed
                                </label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                                >
                                    Save Task
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manual Rollover Modal */}
            {rolloverTargetTask && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                            <RotateCcw className="w-5 h-5" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Rollover Task
                            </h3>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                            Move <strong>"{rolloverTargetTask.task_name}"</strong> to another day without breaking momentum:
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Date</label>
                                <input
                                    type="date"
                                    value={targetRolloverDate}
                                    onChange={(e) => setTargetRolloverDate(e.target.value)}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setRolloverTargetTask(null)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExecuteRollover}
                                    disabled={!targetRolloverDate}
                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50"
                                >
                                    Confirm Rollover
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    function renderTaskRow(task: RoutineTask) {
        const isPostponed3Times = (task.rollover_count || 0) >= 3;

        return (
            <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                    task.completed
                        ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-75'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
            >
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        disabled={isLocked}
                        className={`mt-0.5 transition-colors focus:outline-none ${
                            isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:text-blue-600'
                        }`}
                    >
                        {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-100 dark:fill-emerald-950/50" />
                        ) : (
                            <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                        )}
                    </button>

                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            {task.time_block && (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {task.time_block}
                                </span>
                            )}
                            {task.rolled_from && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                    <RotateCcw className="w-3 h-3" />
                                    Rolled from {task.rolled_from}
                                </span>
                            )}
                            {isPostponed3Times && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Postponed 3+ times
                                </span>
                            )}
                        </div>

                        <p className={`text-sm font-medium mt-1 ${task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                            {task.task_name}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                {!isLocked && (
                    <div className="flex items-center gap-1 shrink-0">
                        {!task.completed && (
                            <button
                                type="button"
                                onClick={() => {
                                    setRolloverTargetTask(task);
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    setTargetRolloverDate(tomorrow.toISOString().split('T')[0]);
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                                title="Roll to another date"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setEditingTaskId(task.id);
                                setTaskForm({
                                    time_block: task.time_block,
                                    task_name: task.task_name,
                                    category: task.category,
                                    auto_rollover: task.auto_rollover,
                                });
                                setIsAddModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Edit Task"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete Task"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        );
    }
}
