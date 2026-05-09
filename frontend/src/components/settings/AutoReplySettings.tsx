"use client";

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Globe, MessageSquare, Phone, ToggleLeft, ToggleRight, Loader2, ChevronRight, Facebook, Instagram } from 'lucide-react';

type AutoReplyRule = {
    id: string;
    page_id: string;
    trigger_type: 'exact' | 'keyword' | 'phone';
    trigger_text?: string;
    reply_text: string;
    is_active: boolean;
};

type Page = {
    id: string;
    page_name: string;
    page_id: string;
    platform: string;
    is_active: boolean;
};

export default function AutoReplySettings() {
    const [pages, setPages] = useState<Page[]>([]);
    const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
    const [rules, setRules] = useState<AutoReplyRule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
    const [newRule, setNewRule] = useState<Partial<AutoReplyRule>>({
        trigger_type: 'exact',
        is_active: true
    });

    useEffect(() => {
        fetchPages();
    }, []);

    useEffect(() => {
        if (selectedPageId) {
            fetchRules(selectedPageId);
        }
    }, [selectedPageId]);

    const fetchPages = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            setPages(Array.isArray(data) ? data : []);
            if (data.length > 0) {
                setSelectedPageId(data[0].page_id);
            }
        } catch (error) {
            console.error('Failed to fetch pages:', error);
        }
    };

    const fetchRules = async (pageId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/auto-reply?page_id=${pageId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            setRules(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch rules:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRule = async () => {
        if (!selectedPageId || !newRule.reply_text || (newRule.trigger_type === 'exact' && !newRule.trigger_text)) return;

        setIsSaving(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/auto-reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ ...newRule, page_id: selectedPageId })
            });

            if (res.ok) {
                const created = await res.json();
                setRules([created, ...rules]);
                setNewRule({ trigger_type: 'exact', is_active: true });
                setMessage({ text: 'Rule saved successfully!', type: 'success' });
            } else {
                const error = await res.json();
                setMessage({ text: `Error: ${error.message || 'Failed to save rule'}`, type: 'error' });
            }
        } catch (error: any) {
            console.error('Failed to add rule:', error);
            setMessage({ text: 'Network error. Please try again.', type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/auto-reply/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (res.ok) {
                setRules(rules.filter(r => r.id !== id));
            }
        } catch (error) {
            console.error('Failed to delete rule:', error);
        }
    };

    const handleToggleStatus = async (rule: AutoReplyRule) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/auto-reply/${rule.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ is_active: !rule.is_active })
            });

            if (res.ok) {
                setRules(rules.map(r => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const selectedPage = pages.find(p => p.page_id === selectedPageId);

    return (
        <div className="flex bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 h-full overflow-hidden shadow-sm">
            {/* Sidebar - Pages */}
            <div className="w-1/3 border-r border-gray-200 dark:border-slate-700 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Globe size={18} className="text-indigo-500" />
                        Select Page
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {pages.map(page => (
                        <button
                            key={page.id}
                            onClick={() => setSelectedPageId(page.page_id)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedPageId === page.page_id
                                ? 'bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 translate-x-1 shadow-sm'
                                : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 border border-transparent'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${page.platform === 'facebook' ? 'bg-blue-600' : 'bg-pink-600'
                                    }`}>
                                    {page.platform === 'facebook' ? <Facebook size={14} /> : <Instagram size={14} />}
                                </div>
                                <div className="text-left overflow-hidden">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{page.page_name}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{page.platform}</p>
                                </div>
                            </div>
                            <ChevronRight size={14} className={selectedPageId === page.page_id ? 'text-indigo-600' : 'text-slate-300'} />
                        </button>
                    ))}
                    {pages.length === 0 && (
                        <div className="p-4 text-center text-slate-500 italic text-sm">No connected pages found.</div>
                    )}
                </div>
            </div>

            {/* Main Content - Rules */}
            <div className="flex-1 flex flex-col bg-gray-50/30 dark:bg-slate-900/20">
                {selectedPageId ? (
                    <>
                        {/* Rules Header */}
                        <div className="p-4 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center shadow-sm">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    Auto Replies for <span className="text-indigo-600 dark:text-indigo-400">{selectedPage?.page_name}</span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Rules will trigger automatically when a customer messages this page.</p>
                            </div>

                            {message && (
                                <div className={`px-4 py-2 rounded-lg text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                    {message.text}
                                </div>
                            )}
                        </div>

                        {/* Rules List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* Create Rule Header/Box */}
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-md shadow-indigo-500/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Plus size={18} className="text-indigo-500" />
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">Create New Auto-Reply Rule</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Trigger Type</label>
                                        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-xl">
                                            <button
                                                onClick={() => setNewRule({ ...newRule, trigger_type: 'exact' })}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${newRule.trigger_type === 'exact'
                                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                <MessageSquare size={14} /> Exact Match
                                            </button>
                                            <button
                                                onClick={() => setNewRule({ ...newRule, trigger_type: 'keyword' })}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${newRule.trigger_type === 'keyword'
                                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                <Globe size={14} /> Keyword Match
                                            </button>
                                            <button
                                                onClick={() => setNewRule({ ...newRule, trigger_type: 'phone' })}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${newRule.trigger_type === 'phone'
                                                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700'
                                                    }`}
                                            >
                                                <Phone size={14} /> Phone Number
                                            </button>
                                        </div>
                                    </div>
                                    {(newRule.trigger_type === 'exact' || newRule.trigger_type === 'keyword') && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                                                {newRule.trigger_type === 'exact' ? 'Exact Message' : 'Keyword to Match'}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={newRule.trigger_type === 'exact' ? "e.g. Price" : "e.g. price, help, support"}
                                                value={newRule.trigger_text || ''}
                                                onChange={(e) => setNewRule({ ...newRule, trigger_text: e.target.value })}
                                                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="mb-4">
                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Auto Reply Message</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Type the auto-response here..."
                                        value={newRule.reply_text || ''}
                                        onChange={(e) => setNewRule({ ...newRule, reply_text: e.target.value })}
                                        className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white resize-none"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleAddRule}
                                        disabled={isSaving || !newRule.reply_text || ((newRule.trigger_type === 'exact' || newRule.trigger_type === 'keyword') && !newRule.trigger_text)}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                                        Save Rule
                                    </button>
                                </div>
                            </div>

                            <hr className="border-gray-100 dark:border-slate-800" />

                            <div className="space-y-3">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                        <Loader2 size={30} className="animate-spin mb-2" />
                                        <p className="text-sm">Loading rules...</p>
                                    </div>
                                ) : rules.length > 0 ? (
                                    rules.map(rule => (
                                        <div key={rule.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 hover:shadow-md transition-all group">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-4 flex-1">
                                                    <div className={`mt-1 p-2 rounded-lg ${rule.trigger_type === 'exact' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'}`}>
                                                        {rule.trigger_type === 'exact' ? <MessageSquare size={16} /> : <Phone size={16} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                                {rule.trigger_type === 'exact' ? 'Exact Match' :
                                                                    rule.trigger_type === 'keyword' ? 'Keyword Match' : 'Phone Match'}
                                                            </span>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${rule.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        </div>
                                                        {(rule.trigger_type === 'exact' || rule.trigger_type === 'keyword') && (
                                                            <p className="text-sm font-bold text-slate-800 dark:text-white mb-1.5 underline decoration-indigo-300 decoration-2 underline-offset-4">"{rule.trigger_text}"</p>
                                                        )}
                                                        <div className="bg-gray-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700/50">
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 italic mb-1 opacity-60">Automatic Reply:</p>
                                                            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{rule.reply_text}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`text-[9px] font-black uppercase tracking-tighter ${rule.is_active ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                            {rule.is_active ? 'Active' : 'Paused'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleToggleStatus(rule)}
                                                            className={`relative w-12 h-6 rounded-full transition-all duration-300 outline-none ${
                                                                rule.is_active 
                                                                ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' 
                                                                : 'bg-slate-200 dark:bg-slate-700'
                                                            }`}
                                                        >
                                                            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform ${
                                                                rule.is_active ? 'translate-x-6' : 'translate-x-0'
                                                            }`} />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteRule(rule.id)}
                                                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                        title="Delete Rule"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-3xl">
                                        <Bot size={48} className="mb-4 opacity-20" />
                                        <p className="text-base font-semibold opacity-60">No auto-reply rules set yet.</p>
                                        <p className="text-xs opacity-40">Create your first rule above to start saving time!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                            <Globe size={40} className="opacity-30" />
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Select a Page</h4>
                        <p className="text-sm text-center max-w-xs">Please select a connected page from the sidebar to manage its automatic replies.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const Bot = ({ size, className }: { size: number, className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
);
