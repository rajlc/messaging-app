import { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, ChevronDown, Store } from 'lucide-react';

export default function GeneralSettings() {
    const [config, setConfig] = useState({
        store_name: '',
        store_location: '',
        contact_number: ''
    });
    const [isStoreDetailsOpen, setIsStoreDetailsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data) {
                setConfig({
                    store_name: data.store_name || '',
                    store_location: data.store_location || '',
                    contact_number: data.contact_number || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch general settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatus('idle');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (res.ok) {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('Failed to save general settings:', error);
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="h-full flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black mb-1 text-slate-900 dark:text-white">General Settings</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure store preferences and settings.</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Store Details Collapsible Accordion */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/5">
                    {/* Trigger Button */}
                    <button
                        onClick={() => setIsStoreDetailsOpen(!isStoreDetailsOpen)}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left focus:outline-none cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Store size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Store Details</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Configure name, location, and contact details of your store.</p>
                            </div>
                        </div>
                        <ChevronDown
                            size={20}
                            className={`text-slate-400 transition-transform duration-200 ${isStoreDetailsOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Collapsible Content */}
                    {isStoreDetailsOpen && (
                        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
                            {loading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <form onSubmit={handleSave} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                                Store Name
                                            </label>
                                            <input
                                                type="text"
                                                value={config.store_name}
                                                onChange={(e) => setConfig({ ...config, store_name: e.target.value })}
                                                placeholder="Enter your store name"
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                            />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                                Store Location
                                            </label>
                                            <input
                                                type="text"
                                                value={config.store_location}
                                                onChange={(e) => setConfig({ ...config, store_location: e.target.value })}
                                                placeholder="e.g. Kathmandu, Nepal"
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                            />
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                                Contact Number
                                            </label>
                                            <input
                                                type="text"
                                                value={config.contact_number}
                                                onChange={(e) => setConfig({ ...config, contact_number: e.target.value })}
                                                placeholder="e.g. +977-9800000000"
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                            <Save size={16} />
                                            {saving ? 'Saving...' : 'Save Store Details'}
                                        </button>
                                    </div>

                                    {status === 'success' && (
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm animate-in fade-in slide-in-from-bottom-2">
                                            <CheckCircle size={18} className="text-emerald-500" />
                                            Store Details Saved Successfully
                                        </div>
                                    )}
                                    {status === 'error' && (
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 font-bold text-sm animate-in fade-in slide-in-from-bottom-2">
                                            <XCircle size={18} className="text-red-500" />
                                            Failed to Save Store Details
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
