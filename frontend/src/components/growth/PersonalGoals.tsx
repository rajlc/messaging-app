"use client";

import React, { useState, useEffect } from 'react';
import {
    Heart,
    Moon,
    Activity,
    Smile,
    Save,
    CheckCircle2,
    Plus,
    Trash2,
    Sparkles,
    Calendar,
    BookOpen
} from 'lucide-react';

interface PersonalGoal {
    id: string;
    goal_text: string;
    category: 'health' | 'business' | 'social' | 'personal';
    target_score: number;
    is_active: boolean;
    sort_order: number;
}

export function PersonalGoals() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const [goals, setGoals] = useState<PersonalGoal[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [whatWorked, setWhatWorked] = useState('');
    const [whatDidnt, setWhatDidnt] = useState('');
    const [nextWeekChange, setNextWeekChange] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    // New goal modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newGoalText, setNewGoalText] = useState('');
    const [newGoalCategory, setNewGoalCategory] = useState<'health' | 'business' | 'social' | 'personal'>('health');

    const fetchGoalsAndLog = async () => {
        try {
            const token = localStorage.getItem('token');
            const [goalsRes, logRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/goals`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/goals/log/${weekStartStr}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (goalsRes.ok) {
                const data = await goalsRes.json();
                setGoals(data || []);
            }

            if (logRes.ok) {
                const logData = await logRes.json();
                if (logData) {
                    setScores(logData.scores || {});
                    setWhatWorked(logData.reflection_what_worked || '');
                    setWhatDidnt(logData.reflection_what_didnt || '');
                    setNextWeekChange(logData.reflection_next_week || '');
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchGoalsAndLog();
    }, [weekStartStr]);

    const handleScoreChange = (goalId: string, val: number) => {
        setScores(prev => ({ ...prev, [goalId]: val }));
    };

    const handleSaveLog = async () => {
        setSaving(true);
        setSavedSuccess(false);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/goals/log/${weekStartStr}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    weekStart: weekStartStr,
                    scores: scores,
                    reflection_what_worked: whatWorked,
                    reflection_what_didnt: whatDidnt,
                    reflection_next_week: nextWeekChange,
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

    const handleAddGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoalText.trim()) return;

        const newGoal: PersonalGoal = {
            id: `goal_${Date.now()}`,
            goal_text: newGoalText,
            category: newGoalCategory,
            target_score: 8,
            is_active: true,
            sort_order: goals.length + 1,
        };

        const updated = [...goals, newGoal];
        setGoals(updated);
        setIsAddModalOpen(false);
        setNewGoalText('');

        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ goals: updated })
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteGoal = async (id: string) => {
        if (!confirm('Remove this personal goal?')) return;
        const updated = goals.filter(g => g.id !== id);
        setGoals(updated);

        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/goals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ goals: updated })
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
                            Personal Energy & Anti-Burnout
                        </span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Personal Life, Sleep & Weekly Reflection
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                        You've worked in ecommerce for 7 years. Your business cannot outgrow your personal energy and physical health.
                        Log your weekly score and 2-minute journal to stay energized.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Add Goal
                    </button>
                    <button
                        onClick={handleSaveLog}
                        disabled={saving}
                        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        Save Reflection
                    </button>
                </div>
            </div>

            {savedSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Weekly wellness scores and personal reflection saved!
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Goals 1-10 Scoring Sliders */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-pink-600" />
                            Weekly Wellness Scorecard (1 to 10)
                        </h3>
                        <span className="text-[11px] text-slate-400">Week of {weekStartStr}</span>
                    </div>

                    <div className="space-y-4">
                        {goals.map(goal => {
                            const score = scores[goal.id] !== undefined ? scores[goal.id] : 8;

                            return (
                                <div
                                    key={goal.id}
                                    className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            {goal.goal_text}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${score >= 8 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}>
                                                {score} / 10
                                            </span>
                                            <button
                                                onClick={() => handleDeleteGoal(goal.id)}
                                                className="text-slate-400 hover:text-rose-500 p-1 rounded transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-1">
                                        <span className="text-[10px] text-slate-400">1</span>
                                        <input
                                            type="range"
                                            min="1"
                                            max="10"
                                            value={score}
                                            onChange={(e) => handleScoreChange(goal.id, Number(e.target.value))}
                                            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-600"
                                        />
                                        <span className="text-[10px] text-slate-400">10</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right: 2-Minute Reflection Journal */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            2-Minute Weekly Reflection Journal
                        </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Writing creates clarity. Answer these 3 short prompts every weekend to prevent the feeling of being stuck:
                    </p>

                    <div className="space-y-4 pt-2">
                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                1. What worked well this week? (Celebrate progress)
                            </label>
                            <textarea
                                value={whatWorked}
                                onChange={(e) => setWhatWorked(e.target.value)}
                                rows={2}
                                placeholder="e.g. Consistently slept at 10:30 PM, closed 8 orders on Messenger without getting distracted..."
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                2. What felt heavy or didn't work? (Honest awareness)
                            </label>
                            <textarea
                                value={whatDidnt}
                                onChange={(e) => setWhatDidnt(e.target.value)}
                                rows={2}
                                placeholder="e.g. Scrolled phone for 1 hour after lunch, delayed dispatch tracking..."
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                3. One single thing I will do differently next week
                            </label>
                            <textarea
                                value={nextWeekChange}
                                onChange={(e) => setNextWeekChange(e.target.value)}
                                rows={2}
                                placeholder="e.g. Use the 25m Focus Timer for courier dispatch so I finish before 5:00 PM..."
                                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Goal Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                            Add Personal Goal
                        </h3>
                        <form onSubmit={handleAddGoal} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Goal Description</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Drink 3L water daily, Read 10 pages before sleep"
                                    value={newGoalText}
                                    onChange={(e) => setNewGoalText(e.target.value)}
                                    required
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Category</label>
                                <select
                                    value={newGoalCategory}
                                    onChange={(e) => setNewGoalCategory(e.target.value as any)}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                >
                                    <option value="health">Physical Health & Sleep</option>
                                    <option value="personal">Personal Time & Hobbies</option>
                                    <option value="business">Work Focus Discipline</option>
                                    <option value="social">Family & Social Connection</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                                >
                                    Save Goal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
