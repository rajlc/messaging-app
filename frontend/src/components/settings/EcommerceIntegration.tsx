'use client';

import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Globe,
    Database,
    Key,
    CheckCircle,
    XCircle,
    RefreshCw,
    Save,
    ExternalLink,
    ShieldCheck,
    Info,
    Sparkles
} from 'lucide-react';

interface SampleProduct {
    id: string;
    name: string;
    slug: string;
    price: number;
    category?: string;
    url: string;
    image?: string | null;
}

export default function EcommerceIntegration() {
    const [websiteUrl, setWebsiteUrl] = useState('https://www.bagmati.shop');
    const [supabaseUrl, setSupabaseUrl] = useState('https://cukcxhvfgzaayjypykny.supabase.co');
    const [supabaseKey, setSupabaseKey] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a2N4aHZmZ3phYXlqeXB5a255Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYyNTk0MCwiZXhwIjoyMDk0MjAxOTQwfQ.Rm4kJ88_hn5VkN09_EolseHMHT9lqeuTYlEGORDeZG8');

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const [testResult, setTestResult] = useState<{
        success: boolean;
        message: string;
        sampleProducts?: SampleProduct[];
        count?: number;
    } | null>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.ECOMMERCE_WEBSITE_URL) setWebsiteUrl(data.ECOMMERCE_WEBSITE_URL);
                if (data.ECOMMERCE_SUPABASE_URL) setSupabaseUrl(data.ECOMMERCE_SUPABASE_URL);
                if (data.ECOMMERCE_SUPABASE_KEY) setSupabaseKey(data.ECOMMERCE_SUPABASE_KEY);
            }
        } catch (err: any) {
            console.error('Error loading ecommerce settings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage('');
        setErrorMessage('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ECOMMERCE_WEBSITE_URL: websiteUrl.trim().replace(/\/+$/, ''),
                    ECOMMERCE_SUPABASE_URL: supabaseUrl.trim(),
                    ECOMMERCE_SUPABASE_KEY: supabaseKey.trim()
                })
            });

            if (res.ok) {
                setSaveMessage('E-commerce integration settings saved successfully!');
                setTimeout(() => setSaveMessage(''), 4000);
                // Auto-run connection test
                handleTestConnection();
            } else {
                setErrorMessage('Failed to save settings. Please try again.');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Error saving settings');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/ai/ecommerce/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            setTestResult(data);
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || 'Connection test failed. Verify server is reachable.'
            });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <div className="max-w-5xl space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <ShoppingBag size={24} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            E-commerce Website Integration
                        </h2>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                        Connect the AI messaging assistant to your live e-commerce website to look up real-time prices, specifications, and product links.
                    </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={isTesting ? 'animate-spin' : ''} size={15} />
                        {isTesting ? 'Testing Connection...' : 'Test Connection'}
                    </button>
                </div>
            </div>

            {/* How it works info banner */}
            <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-4">
                <div className="p-2 bg-indigo-600 text-white rounded-xl flex-shrink-0 mt-0.5">
                    <Sparkles size={18} />
                </div>
                <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                        Per-Page Control Notice
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        Configuring this connection enables the database sync. To allow the AI to actively check products for a specific page (e.g. <strong>Bagmati Shop</strong>), make sure <strong>"AI For Ecommerce"</strong> is enabled in that page&apos;s AI settings under <strong>AI &amp; Messages &gt; Page Configuration</strong>. Pages without this toggle enabled will strictly not access the website.
                    </p>
                </div>
            </div>

            {/* Settings Form */}
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm space-y-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Database size={16} className="text-indigo-600 dark:text-indigo-400" />
                    Website Database Credentials
                </h3>

                <div className="space-y-4">
                    {/* Website URL */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            <Globe size={14} className="text-slate-400" />
                            Store Website URL
                        </label>
                        <input
                            type="url"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            placeholder="https://www.bagmati.shop"
                            required
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Used by the AI to generate direct product purchase links (e.g. {websiteUrl || 'https://www.bagmati.shop'}/products/product-name).
                        </p>
                    </div>

                    {/* Supabase URL */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            <Database size={14} className="text-slate-400" />
                            E-commerce Supabase Project URL
                        </label>
                        <input
                            type="text"
                            value={supabaseUrl}
                            onChange={(e) => setSupabaseUrl(e.target.value)}
                            placeholder="https://cukcxhvfgzaayjypykny.supabase.co"
                            required
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                        />
                    </div>

                    {/* Supabase Service / Anon Key */}
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            <Key size={14} className="text-slate-400" />
                            Supabase API Key (Anon / Service Role)
                        </label>
                        <input
                            type="password"
                            value={supabaseKey}
                            onChange={(e) => setSupabaseKey(e.target.value)}
                            placeholder="Enter Supabase Key..."
                            required
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                            Grants read access to the <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-[10px]">ecommerce_products</code> table.
                        </p>
                    </div>
                </div>

                {/* Feedback Messages */}
                {saveMessage && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <CheckCircle size={16} />
                        {saveMessage}
                    </div>
                )}
                {errorMessage && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <XCircle size={16} />
                        {errorMessage}
                    </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
                    >
                        {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                        Save E-commerce Settings
                    </button>
                </div>
            </form>

            {/* Test Connection Results & Live Preview */}
            {testResult && (
                <div className={`p-6 rounded-2xl border ${
                    testResult.success 
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40' 
                        : 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                } space-y-4`}>
                    <div className="flex items-center gap-2.5">
                        {testResult.success ? (
                            <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        ) : (
                            <XCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                        )}
                        <div>
                            <h4 className={`text-sm font-black ${
                                testResult.success ? 'text-emerald-900 dark:text-emerald-200' : 'text-red-900 dark:text-red-200'
                            }`}>
                                {testResult.success ? 'Connection Verified' : 'Connection Error'}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                {testResult.message}
                            </p>
                        </div>
                    </div>

                    {testResult.success && testResult.sampleProducts && testResult.sampleProducts.length > 0 && (
                        <div className="pt-3 border-t border-emerald-200/50 dark:border-emerald-800/30">
                            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-3">
                                Live Database Preview ({testResult.sampleProducts.length} Sample Products):
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {testResult.sampleProducts.map(prod => (
                                    <div
                                        key={prod.id}
                                        className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-emerald-100 dark:border-slate-700 flex items-start gap-3 shadow-sm"
                                    >
                                        {prod.image ? (
                                            <img
                                                src={prod.image}
                                                alt={prod.name}
                                                className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-400">
                                                <ShoppingBag size={20} />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                                {prod.name}
                                            </h5>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                    Rs. {prod.price.toLocaleString()}
                                                </span>
                                                {prod.category && (
                                                    <span className="text-[10px] text-slate-400 truncate">
                                                        • {prod.category}
                                                    </span>
                                                )}
                                            </div>
                                            <a
                                                href={prod.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold mt-1"
                                            >
                                                View Live Product <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
