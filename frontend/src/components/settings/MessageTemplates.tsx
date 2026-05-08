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
        <div className="flex h-full bg-slate-900 text-slate-100 rounded-xl overflow-hidden border border-slate-700">
            {/* Sidebar - Status List */}
            <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
                <div className="p-4 border-b border-slate-700">
                    <h3 className="font-bold text-slate-300 flex items-center gap-2">
                        <MessageSquare size={18} />
                        Templates
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {TEMPLATE_STATUSES.map(status => (
                        <button
                            key={status}
                            onClick={() => {
                                setSelectedStatus(status);
                                setStatusMessage(null);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${selectedStatus === status
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content - Editor */}
            <div className="flex-1 flex flex-col">
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-bold">{selectedStatus}</h2>
                        <p className="text-xs text-slate-400 mt-1">Customize the message sent for this status</p>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-700/50 p-1.5 rounded-lg border border-slate-600">
                        <button
                            onClick={() => handleSave({ isActive: true })}
                            disabled={saving}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeStatuses[selectedStatus] !== false
                                ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => handleSave({ isActive: false })}
                            disabled={saving}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${activeStatuses[selectedStatus] === false
                                ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                                : 'text-slate-400 hover:text-slate-200'
                                }`}
                        >
                            Deactive
                        </button>
                    </div>
                </div>

                <div className="flex-1 p-6 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10">
                            <Loader className="animate-spin text-indigo-500" size={32} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col gap-4">
                            <div className="flex-1 relative">
                                <textarea
                                    value={templates[selectedStatus] || ''}
                                    onChange={(e) => handleTemplateChange(e.target.value)}
                                    disabled={activeStatuses[selectedStatus] === false}
                                    placeholder={activeStatuses[selectedStatus] === false ? "Enable this template to edit the message..." : `Enter your template message for ${selectedStatus}...`}
                                    className={`w-full h-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-sans leading-relaxed ${activeStatuses[selectedStatus] === false ? 'opacity-50 cursor-not-allowed bg-slate-900/50' : ''}`}
                                ></textarea>
                                {activeStatuses[selectedStatus] === false && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/10 rounded-xl pointer-events-none">
                                        <div className="bg-slate-800/90 px-4 py-2 rounded-lg border border-slate-600 shadow-xl flex items-center gap-2 text-slate-400">
                                            <Save size={16} className="text-slate-500" />
                                            <span>Template is Locked & Inactive</span>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute bottom-4 right-4 text-xs text-slate-500 bg-slate-900/80 px-2 py-1 rounded">
                                    Variables: {'{{customer_name}}'}, {'{{order_number}}'}, {'{{total_amount}}'}
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <div>
                                    {statusMessage && (
                                        <div className={`flex items-center gap-2 text-sm ${statusMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {statusMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                            {statusMessage.text}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleSave()}
                                    disabled={saving || activeStatuses[selectedStatus] === false}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/20"
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
