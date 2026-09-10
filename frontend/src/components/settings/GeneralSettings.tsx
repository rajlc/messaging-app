import { useState, useEffect } from 'react';
import { 
    Save, CheckCircle, XCircle, ChevronDown, Store, 
    MessageSquare, Trash2, Calendar, Clock, AlertTriangle, 
    ShieldAlert, RefreshCw, Layers 
} from 'lucide-react';

type MessageRetentionData = {
    auto_delete_enabled: boolean;
    auto_delete_days: number;
    fixed_cutoff_date: string | null;
    last_cleanup_at: string | null;
    total_messages: number;
};

export default function GeneralSettings() {
    // Store Details State
    const [config, setConfig] = useState({
        store_name: '',
        store_location: '',
        contact_number: ''
    });
    const [isStoreDetailsOpen, setIsStoreDetailsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Messages Settings State
    const [isMessagesSettingsOpen, setIsMessagesSettingsOpen] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [msgSettings, setMsgSettings] = useState<MessageRetentionData>({
        auto_delete_enabled: false,
        auto_delete_days: 30,
        fixed_cutoff_date: null,
        last_cleanup_at: null,
        total_messages: 0
    });
    const [selectedCutoffDate, setSelectedCutoffDate] = useState('');
    const [showOverlay, setShowOverlay] = useState(false);
    const [overlayText, setOverlayText] = useState('Processing... Please wait.');
    const [retentionNotice, setRetentionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; date: string } | null>(null);

    useEffect(() => {
        fetchSettings();
        fetchMessageRetention();
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

    const fetchMessageRetention = async () => {
        setMsgLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settings/messages-retention`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const resData = await res.json();
            if (resData.success && resData.data) {
                setMsgSettings(resData.data);
                if (resData.data.fixed_cutoff_date) {
                    setSelectedCutoffDate(resData.data.fixed_cutoff_date);
                }
            }
        } catch (error) {
            console.error('Failed to fetch message retention settings:', error);
        } finally {
            setMsgLoading(false);
        }
    };

    const handleSaveStoreDetails = async (e: React.FormEvent) => {
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

    // Calculate dynamic cutoff date for preview
    const calculateCutoffDatePreview = (days: number) => {
        if (!days || days <= 0) return 'Invalid days';
        const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Save Rolling Auto-Delete Settings
    const handleSaveAutoDelete = async (e: React.FormEvent) => {
        e.preventDefault();
        setRetentionNotice(null);
        setOverlayText(
            msgSettings.auto_delete_enabled
                ? `Saving settings & running auto-delete for messages older than ${msgSettings.auto_delete_days} days...`
                : 'Saving message retention settings...'
        );
        setShowOverlay(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settings/messages-retention`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    auto_delete_enabled: msgSettings.auto_delete_enabled,
                    auto_delete_days: msgSettings.auto_delete_days
                })
            });

            const data = await res.json();
            if (data.success && data.data) {
                setMsgSettings(data.data);
                const deletedCount = data.data.cleanupResult?.deletedCount ?? 0;
                if (msgSettings.auto_delete_enabled) {
                    setRetentionNotice({
                        type: 'success',
                        message: `Auto-delete enabled! Removed ${deletedCount} messages older than ${msgSettings.auto_delete_days} days. Daily rolling auto-delete is now active.`
                    });
                } else {
                    setRetentionNotice({
                        type: 'success',
                        message: 'Auto-delete has been disabled. Messages will not be deleted automatically.'
                    });
                }
            } else {
                setRetentionNotice({
                    type: 'error',
                    message: data.error || 'Failed to save message retention settings.'
                });
            }
        } catch (err: any) {
            console.error('Error saving retention settings:', err);
            setRetentionNotice({
                type: 'error',
                message: err.message || 'An error occurred while saving message retention settings.'
            });
        } finally {
            setShowOverlay(false);
        }
    };

    // Handle One-Time Fixed Date Cleanup
    const handleExecuteDeleteBeforeDate = async () => {
        if (!selectedCutoffDate) return;
        setConfirmModal(null);
        setRetentionNotice(null);

        const formattedDate = new Date(selectedCutoffDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        setOverlayText(`Permanently deleting messages sent before ${formattedDate}... Please wait.`);
        setShowOverlay(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settings/messages-retention/delete-before-date`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date: selectedCutoffDate })
            });

            const resData = await res.json();
            if (resData.success && resData.data) {
                const count = resData.data.deletedCount;
                setRetentionNotice({
                    type: 'success',
                    message: `Success! Permanently deleted ${count} message(s) created before ${formattedDate}. Next days will not delete unless you change this date.`
                });
                // Refresh message count
                await fetchMessageRetention();
            } else {
                setRetentionNotice({
                    type: 'error',
                    message: resData.error || 'Failed to delete messages.'
                });
            }
        } catch (err: any) {
            console.error('Error deleting messages before date:', err);
            setRetentionNotice({
                type: 'error',
                message: err.message || 'An error occurred while executing message deletion.'
            });
        } finally {
            setShowOverlay(false);
        }
    };

    return (
        <div className="relative h-full flex flex-col transition-colors">
            {/* Full-Screen Loading Overlay */}
            {showOverlay && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-700 flex flex-col items-center text-center space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-200 dark:border-indigo-900 rounded-full animate-spin border-t-indigo-600 dark:border-t-indigo-400"></div>
                            <Trash2 size={24} className="text-indigo-600 dark:text-indigo-400 absolute inset-0 m-auto" />
                        </div>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white">Database Operation in Progress</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                            {overlayText}
                        </p>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog Modal */}
            {confirmModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-red-200 dark:border-red-900/50 space-y-5">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Confirm Permanent Deletion</h3>
                                <p className="text-xs text-red-500 font-bold">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            Are you sure you want to permanently delete all messages created before{' '}
                            <span className="font-extrabold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                {new Date(confirmModal.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                            ? Once deleted, these messages cannot be recovered.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setConfirmModal(null)}
                                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteDeleteBeforeDate}
                                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
                            >
                                Delete Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black mb-1 text-slate-900 dark:text-white">General Settings</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Configure store preferences, retention rules, and system defaults.</p>
                </div>
            </div>

            <div className="space-y-6 pb-12">
                {/* ─────────────────────────────────────────────────────────────
                    1. Messages Settings Collapsible Accordion (NEW)
                   ───────────────────────────────────────────────────────────── */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl shadow-indigo-500/5 transition-all">
                    {/* Trigger Button */}
                    <button
                        onClick={() => setIsMessagesSettingsOpen(!isMessagesSettingsOpen)}
                        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left focus:outline-none cursor-pointer"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
                                <MessageSquare size={22} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Messages Settings</h3>
                                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 tabular-nums">
                                        {msgSettings.total_messages.toLocaleString()} msgs in DB
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Configure auto-deletion by days, retention period, and fixed date message clean-up.
                                </p>
                            </div>
                        </div>
                        <ChevronDown
                            size={20}
                            className={`text-slate-400 transition-transform duration-200 ${isMessagesSettingsOpen ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Collapsible Content */}
                    {isMessagesSettingsOpen && (
                        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20 space-y-8">
                            {msgLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : (
                                <>
                                    {/* Retention Notice Banner */}
                                    {retentionNotice && (
                                        <div
                                            className={`p-4 rounded-xl flex items-start gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-2 border ${
                                                retentionNotice.type === 'success'
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                            }`}
                                        >
                                            {retentionNotice.type === 'success' ? (
                                                <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                                            ) : (
                                                <XCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1">
                                                <p>{retentionNotice.message}</p>
                                                {msgSettings.last_cleanup_at && (
                                                    <p className="text-xs font-normal opacity-80 mt-1">
                                                        Last cleanup executed: {new Date(msgSettings.last_cleanup_at).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setRetentionNotice(null)}
                                                className="text-xs opacity-60 hover:opacity-100 font-bold ml-2 cursor-pointer"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    )}

                                    {/* SECTION 1: Rolling Auto-Delete by Days */}
                                    <form onSubmit={handleSaveAutoDelete} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-slate-700">
                                            <div className="flex items-start gap-3">
                                                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mt-0.5">
                                                    <Clock size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                                                        Auto-Delete Messages (Rolling Days)
                                                    </h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                        When enabled, messages older than your specified days are continuously cleaned up each day.
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Enable / Disable Toggle Switch */}
                                            <label className="relative inline-flex items-center cursor-pointer select-none self-start sm:self-center">
                                                <input
                                                    type="checkbox"
                                                    checked={msgSettings.auto_delete_enabled}
                                                    onChange={(e) => setMsgSettings({ ...msgSettings, auto_delete_enabled: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-14 h-7 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                                                <span className="ml-3 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                    {msgSettings.auto_delete_enabled ? (
                                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">Enabled</span>
                                                    ) : (
                                                        <span className="text-slate-400">Disabled</span>
                                                    )}
                                                </span>
                                            </label>
                                        </div>

                                        {/* Configuration details when enabled */}
                                        <div className={`space-y-4 transition-opacity ${msgSettings.auto_delete_enabled ? 'opacity-100' : 'opacity-50'}`}>
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                    Retain Messages For (Days)
                                                </label>
                                                <div className="flex items-center gap-3 max-w-xs">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={365}
                                                        disabled={!msgSettings.auto_delete_enabled}
                                                        value={msgSettings.auto_delete_days || 30}
                                                        onChange={(e) => setMsgSettings({ ...msgSettings, auto_delete_days: parseInt(e.target.value, 10) || 1 })}
                                                        className="w-32 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-extrabold text-base text-center focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none"
                                                    />
                                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Days</span>
                                                </div>
                                            </div>

                                            {/* Dynamic Explanation Card */}
                                            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-xl space-y-1.5 text-xs text-indigo-900 dark:text-indigo-200">
                                                <div className="flex items-center gap-2 font-bold">
                                                    <Layers size={15} className="text-indigo-600 dark:text-indigo-400" />
                                                    <span>How this works:</span>
                                                </div>
                                                <p className="leading-relaxed">
                                                    Messages sent before{' '}
                                                    <strong className="underline decoration-indigo-400">
                                                        {calculateCutoffDatePreview(msgSettings.auto_delete_days)}
                                                    </strong>{' '}
                                                    will be removed from the database immediately when you save. When tomorrow begins, messages older than {msgSettings.auto_delete_days} days will automatically be removed in the background.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                                            <button
                                                type="submit"
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs flex items-center gap-2 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 cursor-pointer"
                                            >
                                                <Save size={16} />
                                                Save & Run Auto-Delete
                                            </button>
                                        </div>
                                    </form>

                                    {/* SECTION 2: Delete Messages Before Specific Date (Fixed Cutoff) */}
                                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
                                        <div className="flex items-start gap-3 pb-5 border-b border-gray-100 dark:border-slate-700">
                                            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 mt-0.5">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                                                    Delete Messages Before Specific Date (Fixed Cutoff)
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                    Pick any fixed date to permanently remove all messages created before that date. This is fixed and does NOT shift on subsequent days.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                            <div>
                                                <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                                    Select Cutoff Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={selectedCutoffDate}
                                                    onChange={(e) => setSelectedCutoffDate(e.target.value)}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white font-medium focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none"
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                disabled={!selectedCutoffDate}
                                                onClick={() => setConfirmModal({ isOpen: true, date: selectedCutoffDate })}
                                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer h-[42px]"
                                            >
                                                <Trash2 size={16} />
                                                Delete Messages Before Date
                                            </button>
                                        </div>

                                        {selectedCutoffDate && (
                                            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50">
                                                ⚠️ Clicking delete will permanently remove all chat messages sent before{' '}
                                                <strong>
                                                    {new Date(selectedCutoffDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </strong>
                                                . Your customer contact profiles and orders will remain safe.
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ─────────────────────────────────────────────────────────────
                    2. Store Details Collapsible Accordion (Existing)
                   ───────────────────────────────────────────────────────────── */}
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
                                <form onSubmit={handleSaveStoreDetails} className="space-y-6">
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
