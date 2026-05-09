"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Loader, CheckCircle, AlertCircle, Truck } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

type Provider = 'pathao' | 'pickdrop' | 'ncm';

export default function LogisticIntegration() {
    const [activeProvider, setActiveProvider] = useState<Provider>('pathao');

    // Pathao state
    const [pathaoConfig, setPathaoConfig] = useState({
        base_url: '',
        client_id: '',
        client_secret: '',
        username: '',
        password: '',
        contact_name: '',
        contact_number: '',
        secondary_contact: '',
        otp_number: '',
        address: ''
    });

    // Pick & Drop state
    const [pickdropConfig, setPickdropConfig] = useState({
        base_url: 'https://pickndropnepal.com',
        client_id: '',      // api_key
        client_secret: '',  // api_secret
    });

    // NCM state
    const [ncmConfig, setNcmConfig] = useState({
        base_url: 'https://portal.nepalcanmove.com',
        client_id: '',      // api_token (stored as password/client_secret in DB, but client_id here for consistency in form)
        client_secret: '',  // alias for api_token
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, [activeProvider]);

    const fetchSettings = async () => {
        setLoading(true);
        setStatusMessage(null);
        try {
            if (activeProvider === 'pathao') {
                const response = await axios.get(`${API_URL}/api/settings/courier`);
                if (response.data) {
                    setPathaoConfig({
                        base_url: response.data.base_url || '',
                        client_id: response.data.client_id || '',
                        client_secret: response.data.client_secret || '',
                        username: response.data.username || '',
                        password: response.data.password || '',
                        contact_name: response.data.contact_name || '',
                        contact_number: response.data.contact_number || '',
                        secondary_contact: response.data.secondary_contact || '',
                        otp_number: response.data.otp_number || '',
                        address: response.data.address || ''
                    });
                }
            } else if (activeProvider === 'pickdrop') {
                const response = await axios.get(`${API_URL}/api/settings/courier/pickdrop`);
                if (response.data) {
                    setPickdropConfig({
                        base_url: response.data.base_url || 'https://pickndropnepal.com',
                        client_id: response.data.client_id || '',
                        client_secret: response.data.client_secret || '',
                    });
                }
            } else if (activeProvider === 'ncm') {
                const response = await axios.get(`${API_URL}/api/settings/courier/ncm`);
                if (response.data) {
                    setNcmConfig({
                        base_url: response.data.base_url || 'https://portal.nepalcanmove.com',
                        client_id: response.data.client_id || '',
                        client_secret: response.data.client_secret || '',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch courier settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatusMessage(null);
        try {
            if (activeProvider === 'pathao') {
                await axios.post(`${API_URL}/api/settings/courier`, pathaoConfig);
            } else if (activeProvider === 'pickdrop') {
                await axios.post(`${API_URL}/api/settings/courier/pickdrop`, pickdropConfig);
            } else if (activeProvider === 'ncm') {
                await axios.post(`${API_URL}/api/settings/courier/ncm`, ncmConfig);
            }
            setStatusMessage({ type: 'success', text: 'Settings saved successfully!' });
            setTimeout(() => setStatusMessage(null), 3000);
        } catch (error) {
            console.error('Failed to save settings', error);
            setStatusMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    const providerTabs: { id: Provider; label: string }[] = [
        { id: 'pathao', label: 'Pathao Parcel' },
        { id: 'pickdrop', label: 'Pick & Drop' },
        { id: 'ncm', label: 'Nepal Can Move (NCM)' },
    ];

    return (
        <div className="flex flex-col pb-10">
            {/* Header Area */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center">
                        <Truck className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Logistic Integrations</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Configure your courier API credentials for Pathao and Pick & Drop.</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs - Dedicated Row */}
            <div className="flex items-center gap-2 mb-8 bg-gray-100 dark:bg-slate-900/50 p-1 rounded-xl border border-gray-200 dark:border-slate-700/50 w-fit">
                {providerTabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => { setActiveProvider(tab.id); setStatusMessage(null); }}
                        className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeProvider === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                            }`}
                    >
                        <Truck size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-sm">
                    <Loader size={32} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Fetching configuration...</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-8 shadow-sm">
                        <form onSubmit={handleSave} className="space-y-10">

                        {/* ──── Pathao Parcel Fields ──── */}
                        {activeProvider === 'pathao' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="mb-8 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20">
                                        <Truck className="text-indigo-600 dark:text-indigo-400" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Pathao Parcel</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Main Courier Integration</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Base URL</label>
                                        <input
                                            type="text"
                                            value={pathaoConfig.base_url}
                                            onChange={(e) => setPathaoConfig({ ...pathaoConfig, base_url: e.target.value })}
                                            placeholder="https://api-hermes.pathao.com"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Client ID</label>
                                        <input
                                            type="text"
                                            value={pathaoConfig.client_id}
                                            onChange={(e) => setPathaoConfig({ ...pathaoConfig, client_id: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Client Secret</label>
                                        <input
                                            type="password"
                                            value={pathaoConfig.client_secret}
                                            onChange={(e) => setPathaoConfig({ ...pathaoConfig, client_secret: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Username (Email)</label>
                                        <input
                                            type="email"
                                            value={pathaoConfig.username}
                                            onChange={(e) => setPathaoConfig({ ...pathaoConfig, username: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                                        <input
                                            type="password"
                                            value={pathaoConfig.password}
                                            onChange={(e) => setPathaoConfig({ ...pathaoConfig, password: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="mt-10 pt-10 border-t border-gray-100 dark:border-slate-700">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-[10px]">Merchant Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Contact Name</label>
                                            <input
                                                type="text"
                                                value={pathaoConfig.contact_name}
                                                onChange={(e) => setPathaoConfig({ ...pathaoConfig, contact_name: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Contact Number</label>
                                            <input
                                                type="text"
                                                value={pathaoConfig.contact_number}
                                                onChange={(e) => setPathaoConfig({ ...pathaoConfig, contact_number: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Pickup Address</label>
                                            <input
                                                type="text"
                                                value={pathaoConfig.address}
                                                onChange={(e) => setPathaoConfig({ ...pathaoConfig, address: e.target.value })}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ──── Pick & Drop Fields ──── */}
                        {activeProvider === 'pickdrop' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="mb-8 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center border border-orange-100 dark:border-orange-500/20">
                                        <Truck className="text-orange-600 dark:text-orange-400" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Pick & Drop</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Courier Integration</p>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-6 mb-8 flex items-start gap-4">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <AlertCircle className="text-indigo-600 dark:text-indigo-400" size={20} />
                                    </div>
                                    <p className="text-indigo-700 dark:text-indigo-300 text-sm font-medium leading-relaxed">
                                        <strong>Authentication:</strong> Pick & Drop uses token-based authentication.
                                        Enter your <strong>API Key</strong> and <strong>API Secret</strong> from the Pick & Drop vendor dashboard to enable this integration.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Base URL</label>
                                        <input
                                            type="text"
                                            value={pickdropConfig.base_url}
                                            onChange={(e) => setPickdropConfig({ ...pickdropConfig, base_url: e.target.value })}
                                            placeholder="https://pickndropnepal.com"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">API Key</label>
                                        <input
                                            type="text"
                                            value={pickdropConfig.client_id}
                                            onChange={(e) => setPickdropConfig({ ...pickdropConfig, client_id: e.target.value })}
                                            placeholder="e.g. bf1a7ce75dacf51"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">API Secret</label>
                                        <input
                                            type="password"
                                            value={pickdropConfig.client_secret}
                                            onChange={(e) => setPickdropConfig({ ...pickdropConfig, client_secret: e.target.value })}
                                            placeholder="e.g. 63b8931e70aee27"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ──── NCM (Nepal Can Move) Fields ──── */}
                        {activeProvider === 'ncm' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="mb-8 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                        <Truck className="text-emerald-600 dark:text-emerald-400" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Nepal Can Move (NCM)</h2>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Courier Integration</p>
                                    </div>
                                </div>
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl p-6 mb-8 flex items-start gap-4">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <AlertCircle className="text-indigo-600 dark:text-indigo-400" size={20} />
                                    </div>
                                    <p className="text-indigo-700 dark:text-indigo-300 text-sm font-medium leading-relaxed">
                                        <strong>Authentication:</strong> Nepal Can Move uses an API Token.
                                        Enter your <strong>API Token</strong> and <strong>Base URL</strong> provided by NCM to enable this integration.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Base URL</label>
                                        <input
                                            type="text"
                                            value={ncmConfig.base_url}
                                            onChange={(e) => setNcmConfig({ ...ncmConfig, base_url: e.target.value })}
                                            placeholder="https://portal.nepalcanmove.com"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">API Token</label>
                                        <input
                                            type="password"
                                            value={ncmConfig.client_secret}
                                            onChange={(e) => setNcmConfig({ ...ncmConfig, client_secret: e.target.value, client_id: e.target.value })}
                                            placeholder="Enter your NCM API Token Key"
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-10 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between gap-4">
                            <div className="flex-1">
                                {statusMessage && (
                                    <div className={`flex items-center gap-3 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 ${statusMessage.type === 'success'
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/30 text-red-700 dark:text-red-400'
                                        }`}>
                                        {statusMessage.type === 'success' ? <CheckCircle size={20} className="text-emerald-500" /> : <AlertCircle size={20} className="text-red-500" />}
                                        <span className="text-sm font-bold uppercase tracking-wide">{statusMessage.text}</span>
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading || saving}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-indigo-600/30 active:scale-95"
                            >
                                {saving ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
                                Save Configuration
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
