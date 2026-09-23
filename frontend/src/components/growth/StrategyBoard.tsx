"use client";

import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Share2,
    Video,
    Camera,
    Globe,
    CheckCircle2,
    Sparkles,
    Lightbulb,
    ChevronDown,
    ChevronUp,
    Play,
    RefreshCw,
    AlertTriangle,
    Clock,
    Calendar,
    Target,
    Save,
    Check,
    ArrowRight
} from 'lucide-react';

interface StrategySection {
    id: string;
    title: string;
    subtitle: string;
    icon: any;
    color: string;
    tag: string;
    actionablePoints: {
        title: string;
        description: string;
        proTip: string;
    }[];
}

const STRATEGIES: StrategySection[] = [
    {
        id: 'daraz',
        title: 'Daraz Defense & Optimization',
        subtitle: 'Maintain steady cashflow while maximizing margin and eliminating policy risks',
        icon: ShoppingBag,
        color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        tag: 'Base Cashflow (40% Target)',
        actionablePoints: [
            {
                title: '1. Flash Sale & Mega Campaign Participation',
                description: 'Lock in stock for upcoming Daraz campaigns 7 days in advance. Never discount top sellers below minimum margin; use bundle discounts instead.',
                proTip: 'Use Flexi-Combo (Buy 2 Get 5% Off) to raise average order value from Rs. 800 to Rs. 1,400.'
            },
            {
                title: '2. Search Ranking (SEO) in Seller Center',
                description: 'Audit product titles: Structure them as [Brand/Bagmati] + [Main Keyword in English & Nepali Roman] + [Key Feature/Color] + [Model/Size].',
                proTip: 'Fill in 100% of product attributes (Material, Warranty, Size) — Daraz algorithm favors complete listings by 40%.'
            },
            {
                title: '3. Rating Defense (Keep Above 90%)',
                description: 'Include a printed "Thank You & Free Gift / Review Request" card inside every parcel. Address customer chat queries within 15 minutes during work hours.',
                proTip: 'If a negative review happens, message the customer immediately via Daraz IM to offer replacement or resolution.'
            }
        ]
    },
    {
        id: 'facebook',
        title: 'Facebook Ads & Messenger Selling',
        subtitle: 'The primary growth engine to liberate your business from Daraz dependence',
        icon: Share2,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        tag: 'Main Growth Engine (35% Target)',
        actionablePoints: [
            {
                title: '1. 3-Hook Video Ad Formula',
                description: 'Never run static image ads alone. Film 15-second mobile videos with 3 different opening 3-second hooks: (A) Problem callout, (B) Unboxing curiosity, (C) Extreme benefit demo.',
                proTip: 'Nepal audience responds strongest to raw, handheld smartphone videos with natural Nepali voiceover over studio ads.'
            },
            {
                title: '2. Advantage+ Broad Campaign Structure',
                description: 'Stop micro-targeting narrow interests. Run 1 Advantage+ Shopping campaign targeted to All Nepal (exclude remote mountains if logistics cost is high), ages 20-50.',
                proTip: 'Start with $5-$10/day test budget per winning product. Kill ad sets if cost per order exceeds Rs. 250 after 500 impressions.'
            },
            {
                title: '3. 5-Minute Messenger Close Rate',
                description: 'Integrate quick reply templates for pricing, COD options, and delivery time. Customers buy from whoever replies first with complete reassurance.',
                proTip: 'Always ask: "Hazur ko delivery address ra phone number share garnu bhaye ma aaja nai parcel dispatch garchhu."'
            }
        ]
    },
    {
        id: 'tiktok',
        title: 'TikTok Viral Organic & Ads',
        subtitle: 'Fastest platform for viral discovery and low-cost customer acquisition in Nepal',
        icon: Video,
        color: 'text-pink-600 bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
        tag: 'Fast Scaling (15% Target)',
        actionablePoints: [
            {
                title: '1. Problem-Solution Demonstration',
                description: 'Show the product solving a real everyday problem in the first 2 seconds. Use text overlay on screen and trending background sound.',
                proTip: 'Post at 12:30 PM (lunch break) or 7:30 PM (evening leisure) for maximum initial algorithm boost.'
            },
            {
                title: '2. Bio Link & WhatsApp Direct Order',
                description: 'Place your Bagmati store link or direct WhatsApp order chat in your bio. Mention "Link in bio to order with Cash On Delivery across Nepal" at the end of each video.',
                proTip: 'Pin your top 3 best-selling product videos with price and ordering instructions.'
            }
        ]
    },
    {
        id: 'instagram',
        title: 'Instagram Aesthetics & Micro-Influencers',
        subtitle: 'Build brand equity, premium customer perception, and higher average order values',
        icon: Camera,
        color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
        tag: 'Brand Equity (10% Target)',
        actionablePoints: [
            {
                title: '1. Clean Visual Grid & Story Dispatch Proof',
                description: 'Post daily stories showing packed orders with courier slips. "Social proof" of dozens of packages being shipped builds instant buyer trust.',
                proTip: 'Save Story Highlights: "Reviews", "Dispatch Proof", "How to Order", "Bestsellers".'
            },
            {
                title: '2. Micro-Influencer Barter Collabs',
                description: 'Send free products to local Nepali micro-creators (5k–25k followers) in exchange for 1 Reel + 2 Stories tagging your page.',
                proTip: 'Micro-influencer followers have 3x higher engagement than celebrities in Nepal.'
            }
        ]
    },
    {
        id: 'website',
        title: 'Bagmati Shop (Direct Website)',
        subtitle: 'Zero-commission direct sales and owned customer database for repeat purchases',
        icon: Globe,
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
        tag: 'Owned Asset',
        actionablePoints: [
            {
                title: '1. Frictionless 1-Page Checkout',
                description: 'Minimize checkout fields: Customer Name, Phone, Delivery City, Address. No forced account creation or password hassle.',
                proTip: 'Default to Cash On Delivery (COD) with clear note: "Pay when you receive and inspect your parcel".'
            },
            {
                title: '2. Repeat Customer SMS & WhatsApp Remarketing',
                description: 'Export customer phone numbers once a month. Send an exclusive festival discount or new arrival alert via WhatsApp/SMS to past buyers.',
                proTip: 'Repeat customers cost Rs. 0 in ad spend and convert at 4x higher rates.'
            }
        ]
    }
];

export function StrategyBoard() {
    const todayNepal = new Date().toISOString().split('T')[0];

    // Generator inputs
    const [instruction, setInstruction] = useState('Strategy for accelerated sales growth with multi-channel video ads and bundle offers');
    const [platform, setPlatform] = useState('Daraz');
    const [startDate, setStartDate] = useState(todayNepal);
    const [daysDuration, setDaysDuration] = useState(7);
    const [generating, setGenerating] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [generatedDaysPreview, setGeneratedDaysPreview] = useState<any[] | null>(null);

    // Active strategy state
    const [activeStrategy, setActiveStrategy] = useState<any>(null);
    const [isEditingStrategy, setIsEditingStrategy] = useState(false);
    const [editGoal, setEditGoal] = useState('');
    const [editPriority, setEditPriority] = useState('');

    // Smart Conflict Resolution state
    const [conflictData, setConflictData] = useState<any | null>(null);

    // Accordion state
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        daraz: true,
        facebook: true,
        tiktok: false,
        instagram: false,
        website: false,
    });

    const fetchActiveStrategy = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/strategy`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setActiveStrategy(data);
                setEditGoal(data.targetedGoal || '');
                setEditPriority(data.priorityWork || '');
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchActiveStrategy();
    }, []);

    const handleGenerateStrategy = async (resolution?: 'merge' | 'overwrite') => {
        setGenerating(true);
        setSuccessMessage(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/strategy/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    instruction,
                    platform,
                    startDate,
                    days: daysDuration,
                    resolution,
                })
            });

            const data = await res.json();

            if (data.status === 'conflict') {
                setConflictData(data);
            } else if (data.status === 'success') {
                setConflictData(null);
                setSuccessMessage(data.message);
                if (data.dailyPlans && Array.isArray(data.dailyPlans)) {
                    setGeneratedDaysPreview(data.dailyPlans);
                }
                fetchActiveStrategy();
                setTimeout(() => setSuccessMessage(null), 6000);
            } else if (!res.ok) {
                alert(data.message || 'Generation failed');
            }
        } catch (e: any) {
            console.error(e);
            alert(e.message || 'Failed to generate strategy');
        } finally {
            setGenerating(false);
        }
    };

    const handleSaveManualStrategy = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/growth/strategy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    targetedGoal: editGoal,
                    priorityWork: editPriority,
                    platform,
                })
            });
            setIsEditingStrategy(false);
            fetchActiveStrategy();
        } catch (e) {
            console.error(e);
        }
    };

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="space-y-6">
            {/* Top AI Strategy Generator Form */}
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white rounded-2xl p-6 border border-indigo-800/60 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                            AI Strategy Engine
                        </span>
                        <span className="text-xs text-slate-400">
                            Strict Work Bounds: 9 AM – 6 PM | 1–2 PM Lunch Skipped | Saturdays Skipped
                        </span>
                    </div>

                    <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-white">
                            Autonomous Multi-Platform Strategy Generator
                        </h2>
                        <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                            Input your growth goals or campaign focus. AI will generate your targeted goals, daily priorities, and schedule work-hour routines directly into your database.
                        </p>
                    </div>

                    {/* Instruction & Inputs Form */}
                    <div className="space-y-3 pt-2">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1">
                                Strategy Instruction & Campaign Focus
                            </label>
                            <textarea
                                value={instruction}
                                onChange={(e) => setInstruction(e.target.value)}
                                rows={2}
                                placeholder="e.g. Strategy for growth in Daraz with bundle deals, or scaling FB Ads for new arrivals"
                                className="w-full text-xs p-3.5 rounded-xl border border-white/20 bg-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Platform Selector */}
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Channel / Platform</label>
                                <select
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-white/20 bg-slate-900 text-white focus:outline-none cursor-pointer"
                                >
                                    <option value="Daraz">🛒 Daraz Store</option>
                                    <option value="Facebook">📘 Facebook Ads / Page</option>
                                    <option value="TikTok">📱 TikTok Shop / Videos</option>
                                    <option value="Instagram">📸 Instagram DM & Reels</option>
                                    <option value="Website">🌐 Bagmati Shop (Website)</option>
                                    <option value="Multi-Platform">🚀 All Platforms</option>
                                </select>
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Start Date (No Past Dates)</label>
                                <input
                                    type="date"
                                    min={todayNepal}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full text-xs p-2.5 rounded-xl border border-white/20 bg-slate-900 text-white focus:outline-none cursor-pointer"
                                />
                            </div>

                            {/* Duration */}
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">Duration Period</label>
                                <select
                                    value={daysDuration}
                                    onChange={(e) => setDaysDuration(Number(e.target.value))}
                                    className="w-full text-xs p-2.5 rounded-xl border border-white/20 bg-slate-900 text-white focus:outline-none cursor-pointer"
                                >
                                    <option value={7}>7 Days (1 Week Sprint)</option>
                                    <option value={14}>14 Days (2 Weeks Sprint)</option>
                                    <option value={30}>30 Days (Full Month)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                            <div className="text-[11px] text-indigo-200/80 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Routines populate 9:00 AM – 6:00 PM only (morning personal & evening family hours protected).</span>
                            </div>

                            <button
                                onClick={() => handleGenerateStrategy()}
                                disabled={generating || !instruction.trim()}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                            >
                                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Generate AI Strategy & Apply to Routine
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Success Notification */}
            {successMessage && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* AI Results Section: Active Targeted Goal & Daily Priority Work */}
            {activeStrategy && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                AI Strategic Goal & Daily Priorities (Active)
                            </h3>
                        </div>
                        <button
                            onClick={() => {
                                if (isEditingStrategy) {
                                    handleSaveManualStrategy();
                                } else {
                                    setIsEditingStrategy(true);
                                }
                            }}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            {isEditingStrategy ? <Save className="w-3.5 h-3.5" /> : null}
                            {isEditingStrategy ? 'Save Changes' : 'Edit Strategy'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Targeted Goal */}
                        <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                                Targeted Goal (KPI)
                            </span>
                            {isEditingStrategy ? (
                                <textarea
                                    value={editGoal}
                                    onChange={(e) => setEditGoal(e.target.value)}
                                    rows={3}
                                    className="w-full text-xs p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                                />
                            ) : (
                                <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    {activeStrategy.targetedGoal}
                                </p>
                            )}
                            <div className="text-[11px] text-slate-400 pt-1">
                                Platform Focus: <strong>{activeStrategy.platform || 'Multi-Platform'}</strong>
                            </div>
                        </div>

                        {/* Priority Work */}
                        <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                                Priority Work for Selected Period
                            </span>
                            {isEditingStrategy ? (
                                <textarea
                                    value={editPriority}
                                    onChange={(e) => setEditPriority(e.target.value)}
                                    rows={3}
                                    className="w-full text-xs p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                                />
                            ) : (
                                <pre className="text-xs font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                                    {activeStrategy.priorityWork}
                                </pre>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Generated Multi-Day Progressive Plan Preview */}
            {generatedDaysPreview && generatedDaysPreview.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 dark:border-emerald-900/40 pb-3">
                        <div className="flex items-center gap-2">
                            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                <Sparkles className="w-5 h-5" />
                            </span>
                            <div>
                                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                    AI-Generated Progressive Roadmap ({generatedDaysPreview.length} Working Days)
                                </h3>
                                <p className="text-[11px] text-slate-400">
                                    Each day has distinct hourly execution blocks. Check them off in Daily Routine or Daily Plan.
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                            Applied to Database ✅
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                        {generatedDaysPreview.map((dp: any, idx: number) => (
                            <div
                                key={dp.date}
                                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 space-y-1.5"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300">
                                        Day {dp.dayNumber || idx + 1} ({dp.date})
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400">
                                        {dp.hourlyTasks?.length || 8} Hourly Tasks
                                    </span>
                                </div>
                                <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">
                                    {dp.dayTheme}
                                </h4>
                                {dp.dailyTarget && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        <strong>Target:</strong> {dp.dailyTarget}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Smart Conflict Resolution Modal */}
            {conflictData && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-5 h-5" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Schedule Conflict Detected ({conflictData.conflicts.length} Slots)
                            </h3>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            Some work hours in the selected <strong>{daysDuration}-day period</strong> already have tasks booked in your routine.
                            Choose how you would like AI to apply the new strategy:
                        </p>

                        {/* Conflict preview table */}
                        <div className="overflow-y-auto max-h-48 border border-slate-200 dark:border-slate-800 rounded-xl p-2 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                            {conflictData.conflicts.map((c: any, idx: number) => (
                                <div key={idx} className="py-2 px-1 flex items-center justify-between gap-2">
                                    <div>
                                        <span className="font-bold text-slate-900 dark:text-white">{c.date}</span>
                                        <span className="text-slate-400 ml-1">({c.time_block})</span>
                                        <div className="text-[11px] text-slate-500">Existing: {c.existingTask}</div>
                                    </div>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 shrink-0">
                                        Overlap
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Action choices */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <button
                                onClick={() => handleGenerateStrategy('merge')}
                                className="p-3.5 rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-left hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                            >
                                <div className="font-bold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                    <Check className="w-4 h-4 text-indigo-600" />
                                    Smart Merge (Recommended)
                                </div>
                                <div className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-1">
                                    Keep your existing booked tasks and slot new AI tasks into remaining free hours.
                                </div>
                            </button>

                            <button
                                onClick={() => handleGenerateStrategy('overwrite')}
                                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <RefreshCw className="w-4 h-4 text-slate-500" />
                                    Fresh Start (Overwrite)
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                    Clear existing work tasks on those dates and apply the new strategy.
                                </div>
                            </button>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={() => setConflictData(null)}
                                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tactical Playbooks Sections */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Tactical Execution Playbooks
                    </h3>
                </div>

                {STRATEGIES.map(strat => {
                    const isExpanded = expandedSections[strat.id];
                    const Icon = strat.icon;

                    return (
                        <div
                            key={strat.id}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all"
                        >
                            <div
                                onClick={() => toggleSection(strat.id)}
                                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className={`p-2.5 rounded-xl border ${strat.color}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                                {strat.title}
                                            </h3>
                                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {strat.tag}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {strat.subtitle}
                                        </p>
                                    </div>
                                </div>

                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </button>
                            </div>

                            {isExpanded && (
                                <div className="p-5 pt-0 border-t border-slate-100 dark:border-slate-800/80 space-y-4 mt-2">
                                    {strat.actionablePoints.map((pt, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 space-y-2"
                                        >
                                            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                                                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                                {pt.title}
                                            </h4>
                                            <p className="text-xs text-slate-600 dark:text-slate-300 pl-5">
                                                {pt.description}
                                            </p>
                                            <div className="ml-5 p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-300">
                                                <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                                <span><strong>Pro Execution:</strong> {pt.proTip}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
