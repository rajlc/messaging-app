"use client";

import { useState, useEffect } from 'react';
import { Bot, Save, Shield, RefreshCw, Zap, Check, AlertCircle, Edit2, X, Upload, Trash2, Search, FileText } from 'lucide-react';

type Page = {
    id: string;
    platform: string;
    page_name: string;
    page_id: string;
    is_active: boolean;
    is_ai_enabled: boolean;
    custom_prompt: string;
    cutoff_messages?: string;
    ai_max_message_count?: number;
    ai_cutoff_time_minutes?: number;
};

export default function AIAgentSettings() {
    // Global Settings State
    const [isGlobalEnabled, setIsGlobalEnabled] = useState(false);
    const [isMarketplaceEnabled, setIsMarketplaceEnabled] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [aiProvider, setAiProvider] = useState('openai'); // 'openai' | 'gemini'
    const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [globalMessage, setGlobalMessage] = useState('');

    // Pages State
    const [pages, setPages] = useState<Page[]>([]);
    const [isLoadingPages, setIsLoadingPages] = useState(false);

    // Edit Modal State
    const [editingPage, setEditingPage] = useState<Page | null>(null);
    const [editTab, setEditTab] = useState<'page' | 'posts'>('page');
    const [editPrompt, setEditPrompt] = useState('');
    const [editAiEnabled, setEditAiEnabled] = useState(false);
    const [editCutoffMessages, setEditCutoffMessages] = useState<string[]>([]);
    const [cutoffInput, setCutoffInput] = useState('');
    const [editMaxMessageCount, setEditMaxMessageCount] = useState(5);
    const [editCutoffTimeMinutes, setEditCutoffTimeMinutes] = useState(60);
    const [isSavingPage, setIsSavingPage] = useState(false);

    // Post/Ad Instructions State (Inside Edit Modal)
    type PostConfig = { id: string; page_id: string; post_id: string; label?: string; ai_instructions: string; is_active: boolean };
    const [postConfigs, setPostConfigs] = useState<PostConfig[]>([]);
    const [isLoadingPostConfigs, setIsLoadingPostConfigs] = useState(false);
    const [showPostForm, setShowPostForm] = useState(false);
    const [editingPostConfigId, setEditingPostConfigId] = useState<string | null>(null);
    const [postFormPostId, setPostFormPostId] = useState('');
    const [postFormLabel, setPostFormLabel] = useState('');
    const [postFormInstructions, setPostFormInstructions] = useState('');
    const [isSavingPostConfig, setIsSavingPostConfig] = useState(false);

    // Catalog State
    const [catalogProducts, setCatalogProducts] = useState<{ id: string; product_name?: string | null; title?: string | null; price?: number | null; profile_data?: any }[]>([]);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [isCatalogLoading, setIsCatalogLoading] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [catalogMessage, setCatalogMessage] = useState('');
    const [catalogError, setCatalogError] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    useEffect(() => {
        fetchSettings();
        fetchPages();
        fetchCatalog();
    }, []);

    const fetchCatalog = async () => {
        setIsCatalogLoading(true);
        setCatalogError('');
        try {
            const res = await fetch(`${API_URL}/api/settings/marketplace-products`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setCatalogProducts(data);
            } else {
                setCatalogProducts([]);
            }
        } catch (err) {
            console.error('Failed to fetch catalog:', err);
            setCatalogError('Failed to load marketplace product catalog');
        } finally {
            setIsCatalogLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        setCatalogMessage('');
        setCatalogError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_URL}/api/settings/marketplace-products/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setCatalogMessage(`Successfully imported ${data.count} products!`);
                fetchCatalog();
                setTimeout(() => setCatalogMessage(''), 4000);
            } else {
                setCatalogError(data.error || 'Failed to upload spreadsheet.');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setCatalogError('Error uploading file. Please try again.');
        } finally {
            setUploadingFile(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product from the catalog?')) return;
        try {
            const res = await fetch(`${API_URL}/api/settings/marketplace-products/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setCatalogProducts(catalogProducts.filter(p => p.id !== id));
            } else {
                alert(data.error || 'Failed to delete product.');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Error deleting product.');
        }
    };

    const handleClearCatalog = async () => {
        if (!confirm('Are you sure you want to clear the entire marketplace product catalog? This cannot be undone.')) return;
        try {
            const res = await fetch(`${API_URL}/api/settings/marketplace-products/clear`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setCatalogProducts([]);
                setCatalogMessage('Catalog cleared successfully.');
                setTimeout(() => setCatalogMessage(''), 3000);
            } else {
                alert(data.error || 'Failed to clear catalog.');
            }
        } catch (err) {
            console.error('Clear catalog error:', err);
            alert('Error clearing catalog.');
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch(`${API_URL}/api/settings`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await res.json();
            setIsGlobalEnabled(data.is_ai_global_enabled === 'true');
            setIsMarketplaceEnabled(data.is_ai_marketplace_enabled === 'true');
            setApiKey(data.openai_api_key || '');
            setGeminiApiKey(data.gemini_api_key || '');
            setAiProvider(data.ai_provider || 'openai');
            setOpenaiModel(data.openai_model || 'gpt-4o-mini');
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        }
    };

    const fetchPages = async () => {
        setIsLoadingPages(true);
        try {
            const res = await fetch(`${API_URL}/api/pages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    is_ai_global_enabled: String(isGlobalEnabled),
                    is_ai_marketplace_enabled: String(isMarketplaceEnabled),
                    openai_api_key: apiKey,
                    gemini_api_key: geminiApiKey,
                    ai_provider: aiProvider,
                    openai_model: openaiModel
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

    const fetchPostConfigs = async (pageId: string) => {
        setIsLoadingPostConfigs(true);
        try {
            const res = await fetch(`${API_URL}/api/settings/post-configs/${pageId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            setPostConfigs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch post configs:', err);
            setPostConfigs([]);
        } finally {
            setIsLoadingPostConfigs(false);
        }
    };

    const openEditModal = (page: Page) => {
        setEditingPage(page);
        setEditTab('page');
        setEditPrompt(page.custom_prompt || '');
        setEditAiEnabled(page.is_ai_enabled || false);
        setEditCutoffMessages(page.cutoff_messages ? page.cutoff_messages.split(',').filter(m => m.trim()).map(m => m.trim()) : []);
        setEditMaxMessageCount(typeof page.ai_max_message_count === 'number' ? page.ai_max_message_count : 5);
        setEditCutoffTimeMinutes(typeof page.ai_cutoff_time_minutes === 'number' ? page.ai_cutoff_time_minutes : 60);
        setShowPostForm(false);
        setEditingPostConfigId(null);
        fetchPostConfigs(page.page_id);
    };

    const closeEditModal = () => {
        setEditingPage(null);
        setShowPostForm(false);
        setEditingPostConfigId(null);
    };

    const handleOpenAddPostForm = () => {
        setEditingPostConfigId(null);
        setPostFormPostId('');
        setPostFormLabel('');
        setPostFormInstructions('');
        setShowPostForm(true);
    };

    const handleOpenEditPostForm = (config: PostConfig) => {
        setEditingPostConfigId(config.id);
        setPostFormPostId(config.post_id);
        setPostFormLabel(config.label || '');
        setPostFormInstructions(config.ai_instructions || '');
        setShowPostForm(true);
    };

    const handleSavePostConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPage || !postFormPostId.trim() || !postFormInstructions.trim()) return;

        setIsSavingPostConfig(true);
        try {
            if (editingPostConfigId) {
                // Update existing
                const res = await fetch(`${API_URL}/api/settings/post-configs/${editingPostConfigId}/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        postId: postFormPostId.trim(),
                        label: postFormLabel.trim(),
                        aiInstructions: postFormInstructions.trim()
                    })
                });
                const data = await res.json();
                if (data.success) {
                    fetchPostConfigs(editingPage.page_id);
                    setShowPostForm(false);
                } else {
                    alert(data.error || 'Failed to update post config');
                }
            } else {
                // Create new
                const res = await fetch(`${API_URL}/api/settings/post-configs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        pageId: editingPage.page_id,
                        postId: postFormPostId.trim(),
                        label: postFormLabel.trim(),
                        aiInstructions: postFormInstructions.trim()
                    })
                });
                const data = await res.json();
                if (data.success) {
                    fetchPostConfigs(editingPage.page_id);
                    setShowPostForm(false);
                } else {
                    alert(data.error || 'Failed to create post config');
                }
            }
        } catch (err) {
            console.error('Error saving post config:', err);
            alert('Error saving post instructions');
        } finally {
            setIsSavingPostConfig(false);
        }
    };

    const handleDeletePostConfig = async (id: string) => {
        if (!confirm('Are you sure you want to delete instructions for this post?')) return;
        try {
            const res = await fetch(`${API_URL}/api/settings/post-configs/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success && editingPage) {
                fetchPostConfigs(editingPage.page_id);
            }
        } catch (err) {
            console.error('Failed to delete post config:', err);
        }
    };

    const handleSavePageConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPage) return;

        setIsSavingPage(true);
        try {
            const res = await fetch(`${API_URL}/api/pages/${editingPage.id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    is_ai_enabled: editAiEnabled,
                    custom_prompt: editPrompt,
                    cutoff_messages: editCutoffMessages.join(','),
                    ai_max_message_count: editMaxMessageCount,
                    ai_cutoff_time_minutes: editCutoffTimeMinutes
                })
            });

            if (res.ok) {
                // Update local state
                setPages(pages.map(p =>
                    p.id === editingPage.id
                        ? {
                            ...p,
                            is_ai_enabled: editAiEnabled,
                            custom_prompt: editPrompt,
                            cutoff_messages: editCutoffMessages.join(','),
                            ai_max_message_count: editMaxMessageCount,
                            ai_cutoff_time_minutes: editCutoffTimeMinutes
                        }
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

                    {/* Marketplace Switch */}
                    <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                        <div>
                            <h4 className="font-bold text-slate-900 dark:text-white">Enable AI for Facebook Marketplace</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Autonomously reply to Facebook Marketplace personal messages using AI</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isMarketplaceEnabled}
                                onChange={(e) => setIsMarketplaceEnabled(e.target.checked)}
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

                    {/* OpenAI Model Selector (if OpenAI provider is active) */}
                    {aiProvider === 'openai' && (
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest mb-2 text-slate-400">
                                OpenAI Model
                            </label>
                            <select
                                value={openaiModel}
                                onChange={(e) => setOpenaiModel(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-sm"
                            >
                                <option value="gpt-4o-mini">gpt-4o-mini (Recommended — Ultra Fast & Low Cost)</option>
                                <option value="gpt-5.6-luna">gpt-5.6-luna (GPT-5.6 Luna — High Reasoning & $0.20/1M Cost)</option>
                                <option value="gpt-5.4-nano">gpt-5.4-nano (GPT-5.4 Nano — High Speed & $0.20/1M Cost)</option>
                                <option value="gpt-4o">gpt-4o (GPT-4o — Complex Reasoning)</option>
                                <option value="gpt-3.5-turbo">gpt-3.5-turbo (Standard Legacy)</option>
                            </select>
                            <p className="text-xs text-slate-500 mt-1">
                                Currently active: <span className="font-bold text-indigo-500">{openaiModel}</span>
                            </p>
                        </div>
                    )}

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
                            Your key is stored securely. Used for {aiProvider === 'openai' ? openaiModel : 'Gemini 1.5 Flash'} access.
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

            {/* Marketplace Product Catalog Section */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-200 dark:border-slate-700/50 p-8 mt-8 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                            Marketplace Product Catalog
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Upload a spreadsheet (.xlsx, .xls, or .csv) to train the AI on product pricing. The AI queries this catalog dynamically to reply to buyers.
                        </p>
                    </div>
                    {catalogProducts.length > 0 && (
                        <button
                            onClick={handleClearCatalog}
                            className="text-xs text-red-500 hover:text-white hover:bg-red-500 border border-red-500 px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 self-start md:self-auto"
                        >
                            <Trash2 size={14} />
                            Clear Catalog
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Panel: Upload spreadsheet */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center text-center relative hover:bg-slate-100/50 dark:hover:bg-slate-900 transition-colors group">
                            <input
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileUpload}
                                disabled={uploadingFile}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {uploadingFile ? (
                                <RefreshCw className="animate-spin text-indigo-500 mb-4" size={36} />
                            ) : (
                                <Upload className="text-slate-400 group-hover:text-indigo-500 transition-colors mb-4" size={36} />
                            )}
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">
                                {uploadingFile ? 'Uploading & parsing sheet...' : 'Upload catalog file'}
                            </h4>
                            <p className="text-xs text-slate-400 font-medium mb-3">
                                Drag & drop or click to choose
                            </p>
                            <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-lg">
                                Supports Excel / CSV
                            </span>
                        </div>

                        {/* Formatting instructions */}
                        <div className="p-5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
                            <h5 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider mb-2 flex items-center gap-1.5">
                                <AlertCircle size={14} />
                                Sheet Guidelines
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                                Ensure your file contains headers similar to:
                            </p>
                            <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                                <li><strong>Product Name</strong> (or Name / Product)</li>
                                <li><strong>Price</strong> (or Rate / Cost / Amount)</li>
                            </ul>
                            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
                                Uploading a new catalog will overwrite any existing catalog products in the database.
                            </p>
                        </div>

                        {/* Status Message */}
                        {catalogMessage && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-medium flex items-center gap-2">
                                <Check size={16} />
                                {catalogMessage}
                            </div>
                        )}
                        {catalogError && (
                            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium flex items-center gap-2">
                                <AlertCircle size={16} />
                                {catalogError}
                            </div>
                        )}
                    </div>

                    {/* Right Panel: Catalog List & Search */}
                    <div className="lg:col-span-2 flex flex-col h-[350px] bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-6">
                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Search catalog products..."
                                value={catalogSearch}
                                onChange={(e) => setCatalogSearch(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                            />
                            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                            {isCatalogLoading ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                    <RefreshCw className="animate-spin text-indigo-500" size={24} />
                                    <span className="text-xs font-medium">Loading catalog items...</span>
                                </div>
                            ) : catalogProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400 p-6 text-center">
                                    <FileText size={32} className="mb-2 text-slate-300 dark:text-slate-700" />
                                    <span className="text-xs font-bold mb-1 text-slate-500 dark:text-slate-400">No Catalog Products</span>
                                    <p className="text-[10px] text-slate-400 max-w-[240px]">
                                        Upload a spreadsheet on the left to add items to your AI-assisted sales catalog.
                                    </p>
                                </div>
                            ) : (() => {
                                const searchLower = (catalogSearch || '').toLowerCase().trim();
                                const getProductName = (p: any): string => {
                                    if (p?.product_name && typeof p.product_name === 'string') return p.product_name;
                                    if (p?.title && typeof p.title === 'string') return p.title;
                                    if (p?.profile_data && typeof p.profile_data === 'object') {
                                        const values = Object.values(p.profile_data);
                                        const found = values.find((v: any) => typeof v === 'object' && v !== null && v?.title) as any;
                                        if (found?.title) return String(found.title);
                                    }
                                    return 'Unnamed Product';
                                };
                                const getProductPrice = (p: any): number => {
                                    if (p?.price !== null && p?.price !== undefined && !isNaN(Number(p.price))) return Number(p.price);
                                    if (p?.profile_data && typeof p.profile_data === 'object') {
                                        const values = Object.values(p.profile_data);
                                        const found = values.find((v: any) => typeof v === 'object' && v !== null && v?.price !== undefined) as any;
                                        if (found && !isNaN(Number(found.price))) return Number(found.price);
                                    }
                                    return 0;
                                };

                                const filtered = catalogProducts.filter(p => {
                                    const name = getProductName(p);
                                    return name.toLowerCase().includes(searchLower);
                                });
                                if (filtered.length === 0) {
                                    return (
                                        <div className="text-center py-8 text-slate-400 text-xs font-medium">
                                            No products match your search.
                                        </div>
                                    );
                                }
                                return filtered.map(product => (
                                    <div key={product.id} className="flex justify-between items-center bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 px-5 py-3 rounded-xl border border-slate-200/50 dark:border-slate-700/30 transition-all group">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                {getProductName(product)}
                                            </h5>
                                            <span className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                                                Rs {getProductPrice(product)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteProduct(product.id)}
                                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                            title="Delete product"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ));
                            })()}
                        </div>

                        {catalogProducts.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Total Products</span>
                                <span>{catalogProducts.length} items</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingPage && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] max-w-2xl w-full border border-gray-100 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col">
                        
                        {/* Modal Header & Tabs */}
                        <div className="p-8 border-b border-gray-100 dark:border-slate-700 flex flex-col gap-4 flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Configure AI Settings</h3>
                                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">{editingPage.page_name}</p>
                                </div>
                                <button onClick={closeEditModal} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-900 rounded-xl">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tab Switcher */}
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl gap-1">
                                <button
                                    onClick={() => setEditTab('page')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                        editTab === 'page'
                                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <Zap size={14} /> Page Instructions
                                </button>
                                <button
                                    onClick={() => setEditTab('posts')}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                        editTab === 'posts'
                                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <FileText size={14} /> Post & Ad Instructions ({postConfigs.length})
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                            {editTab === 'page' ? (
                                <form onSubmit={handleSavePageConfig} className="space-y-8">
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
                                            Custom Page System Instructions
                                        </label>
                                        <textarea
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                            rows={8}
                                            placeholder="Define your bot's personality here..."
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none leading-relaxed text-sm font-medium transition-all"
                                        />
                                        <p className="text-[10px] text-slate-500 font-medium">
                                            Describe your store's tone, rules, and personality. This acts as the default prompt for all general messages.
                                        </p>
                                    </div>

                                    {/* Per-Customer Rate Limit Configuration */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                        <h5 className="font-bold text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                            <Shield size={16} />
                                            Per-Customer AI Message Rate Limiting
                                        </h5>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    AI Message Cut-Off Count
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={100}
                                                    value={editMaxMessageCount}
                                                    onChange={(e) => setEditMaxMessageCount(parseInt(e.target.value) || 5)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-bold"
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    Max AI replies per customer before pause (e.g. 5)
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    AI Cut-Off Time (Minutes)
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={1440}
                                                    value={editCutoffTimeMinutes}
                                                    onChange={(e) => setEditCutoffTimeMinutes(parseInt(e.target.value) || 60)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-bold"
                                                />
                                                <p className="text-[10px] text-slate-500 mt-1">
                                                    Pause duration for that customer (e.g. 60 min = 1 hr)
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Cut-off Messages */}
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                                            <X size={14} className="text-red-500" />
                                            AI Cut-off Messages
                                        </label>

                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {editCutoffMessages.map((msg, index) => (
                                                <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100 dark:border-indigo-500/20 text-xs font-bold animate-in fade-in zoom-in duration-200">
                                                    {msg}
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditCutoffMessages(editCutoffMessages.filter((_, i) => i !== index))}
                                                        className="hover:text-red-500 transition-colors"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={cutoffInput}
                                                onChange={(e) => setCutoffInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (cutoffInput.trim()) {
                                                            if (!editCutoffMessages.includes(cutoffInput.trim())) {
                                                                setEditCutoffMessages([...editCutoffMessages, cutoffInput.trim()]);
                                                            }
                                                            setCutoffInput('');
                                                        }
                                                    }
                                                }}
                                                placeholder="Type message and press Enter..."
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium transition-all"
                                            />
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-tighter">Enter</div>
                                        </div>

                                        <p className="text-[10px] text-slate-500 font-medium">
                                            Type a message and press **Enter** to add it. If a customer sends any of these messages exactly, the AI will not reply.
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
                                            Save Page Instructions
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-6">
                                    {/* Post/Ad Instructions Tab Content */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white text-base">Per-Post & Ad Instructions</h4>
                                            <p className="text-xs text-slate-500 font-medium">When customers click "Send Message" on a post, the AI uses these specific instructions as highest priority.</p>
                                        </div>
                                        {!showPostForm && (
                                            <button
                                                onClick={handleOpenAddPostForm}
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
                                            >
                                                + Add Post Instruction
                                            </button>
                                        )}
                                    </div>

                                    {/* Add / Edit Form */}
                                    {showPostForm ? (
                                        <form onSubmit={handleSavePostConfig} className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3">
                                                <h5 className="font-bold text-sm text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                    {editingPostConfigId ? 'Edit Post Instruction' : 'Add New Post Instruction'}
                                                </h5>
                                                <button type="button" onClick={() => setShowPostForm(false)} className="text-slate-400 hover:text-slate-600">
                                                    <X size={16} />
                                                </button>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Post Label (Friendly Title)</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Summer Jacket Sale Post"
                                                    value={postFormLabel}
                                                    onChange={(e) => setPostFormLabel(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none font-medium"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Facebook Post ID or Ad ID *</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 104508142519049_123456789"
                                                    value={postFormPostId}
                                                    onChange={(e) => setPostFormPostId(e.target.value)}
                                                    required
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none font-mono"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">Copy the Post ID from Facebook post URL or ad details.</p>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">AI Prompt / Instructions for this Post *</label>
                                                <textarea
                                                    rows={6}
                                                    placeholder="Write specific product details, price, features, or instructions for customers coming from this post..."
                                                    value={postFormInstructions}
                                                    onChange={(e) => setPostFormInstructions(e.target.value)}
                                                    required
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm outline-none leading-relaxed font-medium"
                                                />
                                            </div>

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPostForm(false)}
                                                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={isSavingPostConfig}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
                                                >
                                                    {isSavingPostConfig ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                                                    {editingPostConfigId ? 'Update Instruction' : 'Save Instruction'}
                                                </button>
                                            </div>
                                        </form>
                                    ) : null}

                                    {/* List of existing post instructions */}
                                    {isLoadingPostConfigs ? (
                                        <div className="flex items-center justify-center p-8 text-slate-400 text-xs gap-2">
                                            <RefreshCw className="animate-spin text-indigo-500" size={18} /> Loading post instructions...
                                        </div>
                                    ) : postConfigs.length === 0 ? (
                                        <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                                            No post-specific instructions created yet. Click <strong>"+ Add Post Instruction"</strong> to set custom prompts for specific Facebook posts or ads.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {postConfigs.map(config => (
                                                <div key={config.id} className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-start gap-4 hover:border-indigo-300 transition-all">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                                {config.label || 'Post Instruction'}
                                                            </h5>
                                                            <span className="text-[10px] font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800/40">
                                                                ID: {config.post_id}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-600 dark:text-slate-300 italic line-clamp-2 leading-relaxed mt-2">
                                                            "{config.ai_instructions}"
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <button
                                                            onClick={() => handleOpenEditPostForm(config)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePostConfig(config.id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

