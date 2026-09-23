"use client";

import React, { useState, useEffect } from 'react';
import {
    Palmtree,
    Calendar,
    X,
    Trash2,
    Plus,
    Sparkles,
    CheckCircle2
} from 'lucide-react';

interface HolidayItem {
    id: string;
    start_date: string;
    end_date: string;
    label: string;
    mode: 'full' | 'reduced';
    store_closed: boolean;
}

interface HolidayModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHolidayUpdated?: () => void;
}

const PRESET_FESTIVALS = [
    { label: 'Dashain Festival', days: 5 },
    { label: 'Tihar & Bhai Tika', days: 3 },
    { label: 'Chhath Puja', days: 2 },
    { label: 'Holi Festival', days: 1 },
    { label: 'Nepali New Year (Baisakh 1)', days: 1 },
    { label: 'Team Vacation / Off', days: 2 },
];

export function HolidayModal({ isOpen, onClose, onHolidayUpdated }: HolidayModalProps) {
    const today = new Date().toISOString().split('T')[0];
    const [holidays, setHolidays] = useState<HolidayItem[]>([]);
    const [label, setLabel] = useState('');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [mode, setMode] = useState<'full' | 'reduced'>('full');
    const [storeClosed, setStoreClosed] = useState(true);
    const [loading, setLoading] = useState(false);

    const fetchHolidays = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/holidays`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHolidays(data || []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHolidays();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/holidays`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    label,
                    start_date: startDate,
                    end_date: endDate,
                    mode,
                    store_closed: storeClosed,
                })
            });

            if (res.ok) {
                setLabel('');
                fetchHolidays();
                if (onHolidayUpdated) onHolidayUpdated();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHoliday = async (id: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/holidays/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchHolidays();
                if (onHolidayUpdated) onHolidayUpdated();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSelectPreset = (preset: { label: string; days: number }) => {
        setLabel(preset.label);
        const start = new Date();
        const end = new Date();
        end.setDate(start.getDate() + (preset.days - 1));
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Palmtree className="w-5 h-5" />
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            Holiday Mode & Festival Planner
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Quick Presets */}
                    <div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                            Nepali Festival Quick Presets
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_FESTIVALS.map((p, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectPreset(p)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 border border-slate-200 dark:border-slate-700 transition-colors"
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Schedule Form */}
                    <form onSubmit={handleAddHoliday} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Holiday Label</label>
                            <input
                                type="text"
                                placeholder="e.g. Dashain Vacation, Family Event"
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                required
                                className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full text-xs p-2.5 mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                            <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">Store Closed Flag</div>
                                <div className="text-[11px] text-slate-500">Show "Store Closed" status banner during holiday</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={storeClosed}
                                onChange={(e) => setStoreClosed(e.target.checked)}
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4" />
                            Schedule Holiday Mode
                        </button>
                    </form>

                    {/* Active Holidays List */}
                    {holidays.length > 0 && (
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                                Scheduled Holiday Periods
                            </span>
                            {holidays.map(h => (
                                <div
                                    key={h.id}
                                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                                >
                                    <div>
                                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <Palmtree className="w-3.5 h-3.5 text-emerald-500" />
                                            {h.label}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            {h.start_date} to {h.end_date} {h.store_closed ? '• Store Closed' : ''}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteHoliday(h.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
