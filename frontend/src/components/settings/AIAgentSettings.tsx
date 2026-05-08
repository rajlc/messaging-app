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
        <div className="p-6 text-white max-w-4xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Bot className="text-indigo-400" />
                    AI Agent Configuration
                </h2>
                <p className="text-slate-400">Configure your automated AI responses for social media messages.</p>
            </div>

            {/* Global Settings Card */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4 text-indigo-300">Global Settings</h3>

                <div className="space-y-6">
                    {/* Master Switch */}
                    <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                        <div>
                            <h4 className="font-medium text-white">Enable AI Agent</h4>
                            <p className="text-sm text-slate-400">Master switch to turn AI responses on/off globally</p>
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
                        <label className="block text-sm font-medium mb-1 text-slate-300">AI Provider</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="aiProvider"
                                    value="openai"
                                    checked={aiProvider === 'openai'}
                                    onChange={(e) => setAiProvider(e.target.value)}
                                    className="accent-indigo-500"
                                />
                                <span className="text-white">OpenAI (GPT-4o)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="aiProvider"
                                    value="gemini"
                                    checked={aiProvider === 'gemini'}
                                    onChange={(e) => setAiProvider(e.target.value)}
                                    className="accent-indigo-500"
                                />
                                <span className="text-white">Google Gemini</span>
                            </label>
                        </div>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-300">
                            {aiProvider === 'openai' ? 'OpenAI API Key' : 'Gemini API Key'}
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={aiProvider === 'openai' ? apiKey : geminiApiKey}
                                onChange={(e) => aiProvider === 'openai' ? setApiKey(e.target.value) : setGeminiApiKey(e.target.value)}
                                placeholder={aiProvider === 'openai' ? "sk-..." : "AIza..."}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 pl-10 text-white focus:border-indigo-500 outline-none transition-colors"
                            />
                            <Shield className="absolute left-3 top-2.5 text-slate-500" size={16} />
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
                <h3 className="text-lg font-semibold mb-4 text-indigo-300">Page Configuration</h3>
                <p className="text-sm text-slate-400 mb-4">Customize AI behavior for each connected page. Define unique personas and instructions.</p>

                {isLoadingPages ? (
                    <div className="flex items-center gap-2 text-slate-400">
                        <RefreshCw className="animate-spin" size={18} /> Loading pages...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {pages.map(page => (
                            <div key={page.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-lg">{page.page_name}</h4>
                                            {page.is_ai_enabled ? (
                                                <span className="px-2 py-0.5 bg-green-900/50 text-green-400 text-xs rounded border border-green-800">AI Active</span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">AI Paused</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 font-mono mb-2">ID: {page.page_id} • {page.platform}</p>

                                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50 mt-2 max-w-2xl">
                                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Current Instruction:</p>
                                            <p className="text-sm text-slate-300 italic line-clamp-2">
                                                {page.custom_prompt || "Using default system prompt..."}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => openEditModal(page)}
                                        className="bg-slate-700 hover:bg-indigo-600 text-white p-2 rounded-lg transition-colors"
                                        title="Edit AI Settings"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {pages.length === 0 && (
                            <div className="text-center p-8 bg-slate-800/50 rounded-xl border border-dashed border-slate-700 text-slate-500">
                                No pages connected. Go to "Connected Pages" settings to add one.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingPage && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <h3 className="text-xl font-bold text-white">Configure AI for {editingPage.page_name}</h3>
                            <button onClick={closeEditModal} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePageConfig} className="p-6 space-y-6">
                            {/* Toggle */}
                            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
                                <div>
                                    <h4 className="font-medium text-white">Enable AI for this Page</h4>
                                    <p className="text-sm text-slate-400">Allow AI to reply to messages on this page</p>
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
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-300 flex items-center gap-2">
                                    <Zap size={14} className="text-yellow-400" />
                                    Custom System Prompt
                                </label>
                                <textarea
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    rows={8}
                                    placeholder="You are a friendly support agent for a shoe store. Your name is 'ShoeBot'. Always be polite and ask for shoe size..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none leading-relaxed"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    Define the persona, tone, and specific instructions for the AI. This will be the "System Prompt" passed to the model.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-4 py-2 text-slate-300 hover:text-white font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingPage}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                                >
                                    {isSavingPage ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
