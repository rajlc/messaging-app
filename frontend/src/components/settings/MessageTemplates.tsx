"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Loader, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';

interface Template {
    id: string;
    status: string;
    template: string;
}

const TEMPLATE_STATUSES = [
    'New Order',
    'Ready to Ship',
    'Delivered',
    'Cancel',
    'Follow up again',
    'Returned'
];

export default function MessageTemplates() {
    const [templates, setTemplates] = useState<Record<string, string>>({});
    const [selectedStatus, setSelectedStatus] = useState<string>(TEMPLATE_STATUSES[0]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [activeStatuses, setActiveStatuses] = useState<Record<string, boolean>>({});
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/templates`);
            // Map array to object for easier lookup
            if (Array.isArray(response.data)) {
                const fetchedTemplates: Record<string, string> = {};
                const fetchedActive: Record<string, boolean> = {};

                response.data.forEach((t: any) => {
                    fetchedTemplates[t.status] = t.template;
                    fetchedActive[t.status] = t.is_active ?? true;
                });

                setTemplates(fetchedTemplates);
                setActiveStatuses(fetchedActive);
            }
        } catch (error) {
            console.error('Failed to fetch templates', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (overrides?: { template?: string, isActive?: boolean }) => {
        setSaving(true);
        setStatusMessage(null);
        try {
            const templateText = overrides?.template ?? (templates[selectedStatus] || '');
            const isActive = overrides?.isActive ?? (activeStatuses[selectedStatus] ?? true);

            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/templates`, {
                status: selectedStatus,
                template: templateText,
                is_active: isActive
            });
            setStatusMessage({ type: 'success', text: 'Template saved successfully!' });

            // Update local state if overrides were used
            if (overrides) {
                if (overrides.template !== undefined) {
                    setTemplates(prev => ({ ...prev, [selectedStatus]: overrides.template! }));
                }
                if (overrides.isActive !== undefined) {
                    setActiveStatuses(prev => ({ ...prev, [selectedStatus]: overrides.isActive! }));
                }
            }

            // Clear success message after 3 seconds
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            console.error('Failed to save template', error);
            setStatusMessage({ type: 'error', text: 'Failed to save template. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    const handleTemplateChange = (text: string) => {
        setTemplates(prev => ({
            ...prev,
            [selectedStatus]: text
        }));
    };

    return (
        <div className="flex h-full bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
            {/* Sidebar - Status List */}
            <div className="w-64 bg-slate-50 dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
                <div className="p-6 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 uppercase tracking-widest text-xs">
                        <MessageSquare size={16} className="text-indigo-500" />
                        Templates
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {TEMPLATE_STATUSES.map(status => (
                        <button
                            key={status}
                            onClick={() => {
                                setSelectedStatus(status);
                                setStatusMessage(null);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${selectedStatus === status
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content - Editor */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900/50">
                <div className="p-8 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800/20">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">{selectedStatus}</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Customize the message sent for this status</p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-gray-200 dark:border-slate-700">
                        <button
                            onClick={() => handleSave({ isActive: true })}
                            disabled={saving}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeStatuses[selectedStatus] !== false
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => handleSave({ isActive: false })}
                            disabled={saving}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeStatuses[selectedStatus] === false
                                ? 'bg-red-600 text-white shadow-lg shadow-red-500/20'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            Inactive
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-8 relative flex flex-col">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 z-10 backdrop-blur-sm">
                            <Loader className="animate-spin text-indigo-500" size={32} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col gap-6">
                            <div className="flex-1 relative">
                                <textarea
                                    value={templates[selectedStatus] || ''}
                                    onChange={(e) => handleTemplateChange(e.target.value)}
                                    disabled={activeStatuses[selectedStatus] === false}
                                    placeholder={activeStatuses[selectedStatus] === false ? "Enable this template to edit the message..." : `Enter your template message for ${selectedStatus}...`}
                                    className={`w-full h-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none font-medium leading-relaxed text-lg transition-all ${activeStatuses[selectedStatus] === false ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                                ></textarea>
                                {activeStatuses[selectedStatus] === false && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-gray-200 dark:border-slate-600 shadow-2xl flex items-center gap-3 text-slate-500 dark:text-slate-400 font-bold">
                                            <AlertCircle size={20} className="text-amber-500" />
                                            <span>Template is Locked & Inactive</span>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-6 right-6 flex gap-2">
                                    {['{{customer_name}}', '{{order_number}}', '{{total_amount}}'].map(v => (
                                        <span key={v} className="text-[10px] font-black font-mono text-indigo-500 dark:text-indigo-400 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                                            {v}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="min-h-[24px]">
                                    {statusMessage && (
                                        <div className={`flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-left-2 duration-300 ${statusMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                                            }`}>
                                            {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                            {statusMessage.text}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleSave()}
                                    disabled={saving || activeStatuses[selectedStatus] === false}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                                >
                                    {saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                    Save Template
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
