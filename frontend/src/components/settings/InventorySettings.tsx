import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle, XCircle, Database } from 'lucide-react';

export default function InventorySettings() {
    const [config, setConfig] = useState({
        INV_APP_URL: '',
        INV_APP_API_KEY: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');

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
                    INV_APP_URL: data.INV_APP_URL || '',
                    INV_APP_API_KEY: data.INV_APP_API_KEY || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
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
                // Auto-test connection after save
                testConnection();
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('Failed to save settings:', error);
            setStatus('error');
        } finally {
            setSaving(false);
        }
    };

    const testConnection = async () => {
        setConnectionStatus('unknown');
        try {
            // We use the new endpoint to test or just check if we can fetch products
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/inventory-products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const products = await res.json();
                if (Array.isArray(products)) {
                    setConnectionStatus('connected');
                } else {
                    setConnectionStatus('failed');
                }
            } else {
                setConnectionStatus('failed');
            }
        } catch (error) {
            setConnectionStatus('failed');
        }
    };

    return (
        <div className="h-full flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black mb-1 text-slate-900 dark:text-white">Inventory Integration</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure connection to the main Inventory Management System.</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all shadow-sm ${
                    connectionStatus === 'connected' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400' :
                    connectionStatus === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400' :
                    'bg-slate-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                }`}>
                    {connectionStatus === 'connected' ? <CheckCircle size={16} /> :
                        connectionStatus === 'failed' ? <XCircle size={16} /> :
                            <Database size={16} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                        {connectionStatus === 'connected' ? 'System Connected' :
                            connectionStatus === 'failed' ? 'Connection Failed' :
                                'Not Tested'}
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-10 shadow-xl shadow-indigo-500/5">
                <form onSubmit={handleSave} className="space-y-8">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                Inventory App URL
                            </label>
                            <input
                                type="text"
                                value={config.INV_APP_URL}
                                onChange={(e) => setConfig({ ...config, INV_APP_URL: e.target.value })}
                                placeholder="e.g. https://inventory-app.vercel.app"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                            />
                            <p className="mt-2 text-[10px] text-slate-400 ml-1">
                                The base URL where your Inventory System is hosted.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                API Key
                            </label>
                            <input
                                type="password"
                                value={config.INV_APP_API_KEY}
                                onChange={(e) => setConfig({ ...config, INV_APP_API_KEY: e.target.value })}
                                placeholder="Enter the secure API key generated in Inventory App"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                            />
                            <p className="mt-2 text-[10px] text-slate-400 ml-1">
                                You can find this key in your Inventory App's .env file or settings.
                            </p>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={testConnection}
                            disabled={loading || saving}
                            className="flex items-center gap-2 px-5 py-2.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-500' : ''} />
                            Test Connection
                        </button>

                        <button
                            type="submit"
                            disabled={loading || saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>

                    {status === 'success' && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 font-bold text-sm animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle size={18} className="text-emerald-500" />
                            Configuration Securely Saved
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 font-bold text-sm animate-in fade-in slide-in-from-bottom-2">
                            <XCircle size={18} className="text-red-500" />
                            Failed to Save Configuration
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
