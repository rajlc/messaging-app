"use client";

import { useState, useEffect } from 'react';
import { Bot, Save, Shield, RefreshCw, Zap, Check, AlertCircle, Edit2, X } from 'lucide-react';

type Page = {
    id: string;
    platform: string;
    page_name: string;
    page_id: string;
    is_active: boolean;
    is_ai_enabled: boolean;
    custom_prompt: string;
};

export default function AIAgentSettings() {
    // Global Settings State
    const [isGlobalEnabled, setIsGlobalEnabled] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [aiProvider, setAiProvider] = useState('openai'); // 'openai' | 'gemini'
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [globalMessage, setGlobalMessage] = useState('');

    // Pages State
    const [pages, setPages] = useState<Page[]>([]);
    const [isLoadingPages, setIsLoadingPages] = useState(false);

    // Edit Modal State
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [editAiEnabled, setEditAiEnabled] = useState(false);
    const [isSavingPage, setIsSavingPage] = useState(false);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    useEffect(() => {
        fetchSettings();
        fetchPages();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/settings`);
            const data = await res.json();
            setIsGlobalEnabled(data.is_ai_global_enabled === 'true');
            setApiKey(data.openai_api_key || '');
            setGeminiApiKey(data.gemini_api_key || '');
            setAiProvider(data.ai_provider || 'openai');
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    };

    const fetchPages = async () => {
        setIsLoadingPages(true);
        try {
            const res = await fetch(`${API_URL}/api/pages`);
            const data = await res.json();
            setPages(data || []);
        } catch (err) {
            console.error('Failed to fetch pages:', err);
        } finally {
            setIsLoadingPages(false);
        }
    };

    const handleSaveGlobal = async () => {
        setIsGlobalLoading(true);
        setGlobalMessage('');
        try {
            const res = await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_ai_global_enabled: String(isGlobalEnabled),
                    openai_api_key: apiKey,
                    gemini_api_key: geminiApiKey,
                    ai_provider: aiProvider
                })
            });

            if (res.ok) {
                setGlobalMessage('Settings saved successfully');
                setTimeout(() => setGlobalMessage(''), 3000);
            } else {
                setGlobalMessage('Failed to save settings');
            }
        } catch (err) {
            console.error(err);
            setGlobalMessage('Error saving settings');
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const openEditModal = (page: Page) => {
        setEditingPage(page);
        setEditPrompt(page.custom_prompt || '');
        setEditAiEnabled(page.is_ai_enabled || false);
    };

    const closeEditModal = () => {
        setEditingPage(null);
    };

    const handleSavePageConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPage) return;

        setIsSavingPage(true);
        try {
            const res = await fetch(`${API_URL}/api/pages/${editingPage.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_ai_enabled: editAiEnabled,
                    custom_prompt: editPrompt
                })
            });

            if (res.ok) {
                // Update local state
                setPages(pages.map(p =>
                    p.id === editingPage.id
                        ? { ...p, is_ai_enabled: editAiEnabled, custom_prompt: editPrompt }
                        : p
                ));
                closeEditModal();
            } else {
                alert('Failed to update page settings');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating page');
        } finally {
            setIsSavingPage(false);
        }
    };

    return (
        <div className="p-6 text-slate-900 dark:text-white transition-colors">
            <div className="mb-8">
                <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
                    <Bot className="text-indigo-500" />
                    AI Agent Configuration
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Configure your automated AI responses for social media messages.</p>
            </div>

            {/* Global Settings Card */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-200 dark:border-slate-700/50 p-8 mb-8 shadow-sm">
                <h3 className="text-lg font-black mb-6 text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Global Settings</h3>

                <div className="space-y-6">
                    {/* Master Switch */}
                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Enable AI Agent</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Master switch to turn AI responses on/off globally</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isGlobalEnabled}
                                onChange={(e) => setIsGlobalEnabled(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>

                    {/* AI Provider Selection */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest mb-3 text-slate-400">AI Provider</label>
                        <div className="flex gap-6">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="aiProvider"
                                    value="openai"
                                    checked={aiProvider === 'openai'}
                                    onChange={(e) => setAiProvider(e.target.value)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">OpenAI (GPT-4o)</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="aiProvider"
                                    value="gemini"
                                    checked={aiProvider === 'gemini'}
                                    onChange={(e) => setAiProvider(e.target.value)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">Google Gemini</span>
                            </label>
                        </div>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-400">
                            {aiProvider === 'openai' ? 'OpenAI API Key' : 'Gemini API Key'}
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={aiProvider === 'openai' ? apiKey : geminiApiKey}
                                onChange={(e) => aiProvider === 'openai' ? setApiKey(e.target.value) : setGeminiApiKey(e.target.value)}
                                placeholder={aiProvider === 'openai' ? "sk-..." : "AIza..."}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pl-11 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-mono text-sm"
                            />
                            <Shield className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Your key is stored securely. Used for {aiProvider === 'openai' ? 'GPT-4o' : 'Gemini 1.5 Flash'} access.
                        </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSaveGlobal}
                            disabled={isGlobalLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                            {isGlobalLoading ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Configuration
                        </button>
                        {globalMessage && (
                            <span className="text-green-400 text-sm flex items-center gap-1">
                                <Check size={16} /> {globalMessage}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Page Configuration */}
            <div>
                <h3 className="text-lg font-black mb-6 text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Page Configuration</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6">Customize AI behavior for each connected page. Define unique personas and instructions.</p>

                {isLoadingPages ? (
                    <div className="flex items-center gap-2 text-slate-400">
                        <RefreshCw className="animate-spin" size={18} /> Loading pages...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {pages.map(page => (
                            <div key={page.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 hover:shadow-lg transition-all group">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-black text-lg text-slate-900 dark:text-white">{page.page_name}</h4>
                                            {page.is_ai_enabled ? (
                                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-black uppercase rounded-lg border border-emerald-200 dark:border-emerald-500/20">AI Active</span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-500 text-[10px] font-black uppercase rounded-lg border border-slate-200 dark:border-slate-800">AI Paused</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-4">ID: {page.page_id} • {page.platform}</p>

                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 mt-2 max-w-2xl relative">
                                            <div className="absolute top-4 right-4 text-indigo-500 opacity-20">
                                                <Zap size={24} />
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Current Instruction:</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-300 italic line-clamp-2 leading-relaxed">
                                                {page.custom_prompt || "Using default system prompt..."}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => openEditModal(page)}
                                        className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        title="Edit AI Settings"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {pages.length === 0 && (
                            <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
                                No pages connected. Go to "Connected Pages" settings to add one.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingPage && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-2xl w-full border border-gray-100 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Configure AI Personality</h3>
                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{editingPage.page_name}</p>
                            </div>
                            <button onClick={closeEditModal} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-900 rounded-xl">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePageConfig} className="p-8 space-y-8">
                            {/* Toggle */}
                            <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-700">
                                <div>
                                    <h4 className="font-bold text-slate-900 dark:text-white">Enable AI Responses</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Allow AI to autonomously reply on this page</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={editAiEnabled}
                                        onChange={(e) => setEditAiEnabled(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>

                            {/* Prompt Editor */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                    <Zap size={14} className="text-yellow-500" />
                                    Custom System Instructions
                                </label>
                                <textarea
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    rows={8}
                                    placeholder="Define your bot's personality here..."
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none leading-relaxed text-sm font-medium transition-all"
                                />
                                <p className="text-[10px] text-slate-500 font-medium">
                                    Describe your store's tone, rules, and personality. This effectively becomes the bot's core operating manual.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-6 py-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white font-bold text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPage}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                                >
                                    {isSavingPage ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                                    Save Instructions
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
