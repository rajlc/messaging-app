"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Loader, CheckCircle, AlertCircle, Bot, Clock, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';

interface FollowUpTemplate {
    status: string;
    instruction: string;
    delay_hours: number;
    is_active: boolean;
    updated_at?: string;
}

const RISK_STATUSES = [
    {
        status: 'Delivery Failed',
        label: 'Delivery Failed',
        description: 'Triggers when courier reports unsuccessful delivery attempt',
        defaultDelay: 8
    },
    {
        status: 'Hold',
        label: 'Hold',
        description: 'Triggers when an order is placed on temporary hold at courier branch',
        defaultDelay: 4
    },
    {
        status: 'Return Process',
        label: 'Return Process',
        description: 'Triggers when an order is initiated for return to warehouse',
        defaultDelay: 2
    }
];

const DELAY_OPTIONS = [
    { value: 0, label: '0 hrs (Immediate upon status change)' },
    { value: 1, label: '1 Hour after status change' },
    { value: 2, label: '2 Hours after status change' },
    { value: 4, label: '4 Hours after status change' },
    { value: 6, label: '6 Hours after status change' },
    { value: 8, label: '8 Hours after status change' },
    { value: 12, label: '12 Hours after status change' },
    { value: 24, label: '24 Hours after status change' }
];

const CONTEXT_VARIABLES = [
    { tag: '{{customer_name}}', desc: 'Customer full name' },
    { tag: '{{order_number}}', desc: 'Order ID / Number' },
    { tag: '{{product_name}}', desc: 'Purchased items & quantity' },
    { tag: '{{total_amount}}', desc: 'Total order amount' },
    { tag: '{{delivery_branch}}', desc: 'Branch / Hub location' },
    { tag: '{{courier_remarks}}', desc: 'Remarks from courier webhook' },
    { tag: '{{delivery_attempt_summary}}', desc: 'Attempt count / audit trail' }
];

export default function FollowUpTemplatesSettings() {
    const [templates, setTemplates] = useState<Record<string, FollowUpTemplate>>({});
    const [selectedStatus, setSelectedStatus] = useState<string>(RISK_STATUSES[0].status);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/follow-up-templates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (Array.isArray(res.data)) {
                const map: Record<string, FollowUpTemplate> = {};
                res.data.forEach((t: FollowUpTemplate) => {
                    map[t.status] = t;
                });
                setTemplates(map);
            }
        } catch (error) {
            console.error('Failed to fetch follow-up templates', error);
        } finally {
            setLoading(false);
        }
    };

    const currentTemplate: FollowUpTemplate = templates[selectedStatus] || {
        status: selectedStatus,
        instruction: '',
        delay_hours: RISK_STATUSES.find(r => r.status === selectedStatus)?.defaultDelay || 8,
        is_active: true
    };

    const handleInstructionChange = (text: string) => {
        setTemplates(prev => ({
            ...prev,
            [selectedStatus]: {
                ...currentTemplate,
                instruction: text
            }
        }));
    };

    const handleDelayChange = (hours: number) => {
        setTemplates(prev => ({
            ...prev,
            [selectedStatus]: {
                ...currentTemplate,
                delay_hours: hours
            }
        }));
    };

    const handleToggleActive = async (newActiveState: boolean) => {
        const updated = {
            ...currentTemplate,
            is_active: newActiveState
        };
        setTemplates(prev => ({ ...prev, [selectedStatus]: updated }));
        await handleSave(updated);
    };

    const insertVariable = (tag: string) => {
        const currentText = currentTemplate.instruction || '';
        handleInstructionChange(currentText + ' ' + tag + ' ');
    };

    const handleSave = async (override?: FollowUpTemplate) => {
        setSaving(true);
        setStatusMessage(null);
        try {
            const target = override || currentTemplate;
            const token = localStorage.getItem('token');
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/follow-up-templates`,
                {
                    status: target.status,
                    instruction: target.instruction,
                    delay_hours: target.delay_hours,
                    is_active: target.is_active
                },
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            setStatusMessage({ type: 'success', text: `Template for "${target.status}" saved successfully!` });
            setTimeout(() => setStatusMessage(null), 3500);
        } catch (error) {
            console.error('Failed to save follow-up template', error);
            setStatusMessage({ type: 'error', text: 'Failed to save template. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
            {/* Sidebar - Risk Statuses */}
            <div className="w-72 bg-slate-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-widest text-xs">
                        <Bot size={18} className="text-rose-500" />
                        Risk Status Templates
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Autonomous AI follow-up for delivery at risk orders
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                    {RISK_STATUSES.map(item => {
                        const t = templates[item.status];
                        const isActive = t ? t.is_active : true;
                        const delay = t ? t.delay_hours : item.defaultDelay;
                        const isSelected = selectedStatus === item.status;

                        return (
                            <button
                                key={item.status}
                                onClick={() => {
                                    setSelectedStatus(item.status);
                                    setStatusMessage(null);
                                }}
                                className={`w-full text-left p-3.5 rounded-xl transition-all border ${isSelected
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 shadow-sm'
                                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-sm">{item.label}</span>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                        }`}>
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-1 font-medium">
                                    <Clock size={12} />
                                    <span>Delay: {delay === 0 ? 'Immediate' : `${delay} hrs`}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Info Box */}
                <div className="p-4 m-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-[12px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <Sparkles size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                        <div className="font-bold mb-0.5">AI Auto Recovery</div>
                        Our AI checks order details, delivery branch, courier audit trail & past chat history before messaging.
                    </div>
                </div>
            </div>

            {/* Main Content - Editor */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/50 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800/20">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg">
                                <ShieldAlert size={18} />
                            </span>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">{selectedStatus} Follow-up</h2>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                            {RISK_STATUSES.find(r => r.status === selectedStatus)?.description}
                        </p>
                    </div>

                    {/* Active / Inactive Toggle */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700">
                        <button
                            onClick={() => handleToggleActive(true)}
                            disabled={saving}
                            className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${currentTemplate.is_active
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => handleToggleActive(false)}
                            disabled={saving}
                            className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${!currentTemplate.is_active
                                ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5">
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader className="animate-spin text-rose-500" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Delay Setting Bar */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <Clock size={16} className="text-indigo-500" />
                                        <span>Trigger Delay Time</span>
                                    </div>
                                    <div className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                                        Hours to wait after order enters &ldquo;{selectedStatus}&rdquo; before AI automatically sends follow-up
                                    </div>
                                </div>

                                <select
                                    value={currentTemplate.delay_hours}
                                    onChange={(e) => handleDelayChange(Number(e.target.value))}
                                    disabled={!currentTemplate.is_active}
                                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2 text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 outline-none"
                                >
                                    {DELAY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Prompt / Instruction Box */}
                            <div className="flex-1 flex flex-col gap-2 min-h-[300px]">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Bot size={15} className="text-rose-500" />
                                        AI Agent System Instruction / Prompt
                                    </label>
                                    <span className="text-[11px] text-slate-400">
                                        Personalized response crafted based on order & remarks
                                    </span>
                                </div>

                                <div className="flex-1 relative">
                                    <textarea
                                        value={currentTemplate.instruction}
                                        onChange={(e) => handleInstructionChange(e.target.value)}
                                        disabled={!currentTemplate.is_active}
                                        placeholder={`Enter custom AI instructions for ${selectedStatus}...`}
                                        className={`w-full h-full min-h-[260px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-slate-800 dark:text-slate-100 font-medium text-sm leading-relaxed outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all resize-y ${!currentTemplate.is_active ? 'opacity-40 grayscale cursor-not-allowed' : ''
                                            }`}
                                    />

                                    {!currentTemplate.is_active && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-6 py-3 rounded-2xl border border-gray-200 dark:border-slate-600 shadow-2xl flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                                                <AlertCircle size={20} className="text-amber-500" />
                                                <span>Template is Deactivated & Locked</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Variable Insertion Pills */}
                            <div>
                                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                    <HelpCircle size={13} />
                                    Click variables to insert into instruction:
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {CONTEXT_VARIABLES.map(v => (
                                        <button
                                            key={v.tag}
                                            type="button"
                                            onClick={() => insertVariable(v.tag)}
                                            disabled={!currentTemplate.is_active}
                                            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 disabled:opacity-40"
                                            title={v.desc}
                                        >
                                            {v.tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Bottom Save Bar */}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
                                <div className="min-h-[24px]">
                                    {statusMessage && (
                                        <div className={`flex items-center gap-2 text-sm font-bold animate-in fade-in duration-300 ${statusMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                            }`}>
                                            {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                            {statusMessage.text}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleSave()}
                                    disabled={saving || !currentTemplate.is_active}
                                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                                >
                                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                                    Save Template
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
