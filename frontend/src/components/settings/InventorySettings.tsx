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
        <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold mb-2">Inventory Integration</h2>
                    <p className="text-slate-400">Configure connection to the main Inventory Management System.</p>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${connectionStatus === 'connected' ? 'bg-green-900/30 border-green-500/50 text-green-400' :
                    connectionStatus === 'failed' ? 'bg-red-900/30 border-red-500/50 text-red-400' :
                        'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                    {connectionStatus === 'connected' ? <CheckCircle size={16} /> :
                        connectionStatus === 'failed' ? <XCircle size={16} /> :
                            <Database size={16} />}
                    <span className="text-sm font-semibold">
                        {connectionStatus === 'connected' ? 'System Connected' :
                            connectionStatus === 'failed' ? 'Connection Failed' :
                                'Not Tested'}
                    </span>
                </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-sm">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Inventory App URL
                        </label>
                        <input
                            type="text"
                            value={config.INV_APP_URL}
                            onChange={(e) => setConfig({ ...config, INV_APP_URL: e.target.value })}
                            placeholder="e.g. https://inventory-app.vercel.app"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            The base URL where your Inventory System is hosted.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            API Key
                        </label>
                        <input
                            type="password"
                            value={config.INV_APP_API_KEY}
                            onChange={(e) => setConfig({ ...config, INV_APP_API_KEY: e.target.value })}
                            placeholder="Enter the secure API key generated in Inventory App"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                            You can find this key in your Inventory App's .env file or settings.
                        </p>
                    </div>

                    <div className="pt-6 border-t border-slate-700 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={testConnection}
                            disabled={loading || saving}
                            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                            Test Connection
                        </button>

                        <button
                            type="submit"
                            disabled={loading || saving}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>

                    {status === 'success' && (
                        <div className="p-4 bg-green-900/20 border border-green-900/50 rounded-lg flex items-center gap-2 text-green-400 animate-in fade-in slide-in-from-bottom-2">
                            <CheckCircle size={18} />
                            Settings saved successfully
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
