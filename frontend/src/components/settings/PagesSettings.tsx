import { useState, useEffect } from 'react';
import { Plus, Trash, Globe, Shield, RefreshCw } from 'lucide-react';

type Page = {
    id: string;
    platform: string;
    page_name: string;
    page_id: string;
    is_active: boolean;
    created_at: string;
};

export default function PagesSettings() {
    const [pages, setPages] = useState<Page[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [newPageId, setNewPageId] = useState('');
    const [newAccessToken, setNewAccessToken] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPages();
    }, []);

    const fetchPages = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages`);
            const data = await res.json();
            setPages(data || []);
        } catch (err) {
            console.error('Failed to fetch pages:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPage = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pageId: newPageId,
                    accessToken: newAccessToken,
                    platform: 'facebook'
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to add page');
            }

            setPages([data, ...pages]);
            setIsAdding(false);
            setNewPageId('');
            setNewAccessToken('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePage = async (id: string) => {
        if (!confirm('Are you sure you want to disconnect this page?')) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setPages(pages.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete page:', err);
        }
    };

    return (
        <div className="text-slate-900 dark:text-white transition-colors">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-black mb-1">Connected Pages</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage your connected Facebook/Instagram pages</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest text-xs transition-all shadow-lg ${
                        isAdding 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                    }`}
                >
                    {isAdding ? 'Cancel' : <><Plus size={18} /> Connect Page</>}
                </button>
            </div>

            {isAdding && (
                <div className="mb-8 bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleAddPage} className="space-y-6 max-w-lg">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Page ID</label>
                            <input
                                type="text"
                                value={newPageId}
                                onChange={e => setNewPageId(e.target.value)}
                                placeholder="e.g. 104568142519349"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">Access Token</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={newAccessToken}
                                    onChange={e => setNewAccessToken(e.target.value)}
                                    placeholder="Paste your Page Access Token here"
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none pr-10 transition-all font-mono"
                                    required
                                />
                                <Shield className="absolute right-3 top-3.5 text-slate-400" size={18} />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 ml-1">
                                <span className="w-1 h-1 bg-amber-500 rounded-full" />
                                Token must have <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">pages_messaging</code> and <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">pages_manage_metadata</code> permissions.
                            </p>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-10 py-3.5 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                        >
                            {isLoading ? 'Verifying...' : 'Connect System'}
                        </button>
                    </form>
                </div>
            )}

            {isLoading && !isAdding && (
                <div className="flex items-center gap-3 text-slate-500 py-10 justify-center">
                    <RefreshCw className="animate-spin text-indigo-500" size={24} /> 
                    <span className="font-bold text-sm">Synchronizing pages...</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pages.map(page => (
                    <div key={page.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => handleDeletePage(page.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-gray-100 dark:border-slate-700"
                            >
                                <Trash size={18} />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20">
                                <Globe size={28} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white truncate pr-8">{page.page_name || 'Unknown Page'}</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{page.platform}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-700/50">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Page ID</span>
                                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">{page.page_id}</span>
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${page.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-red-500 shadow-lg shadow-red-500/40'}`}></span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        {page.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {new Date(page.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {!isLoading && pages.length === 0 && !isAdding && (
                    <div className="col-span-full py-20 text-center text-slate-400 border-2 border-slate-100 dark:border-slate-800 border-dashed rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/20">
                        <Globe className="mx-auto mb-6 opacity-20" size={64} />
                        <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">No Social Pages Connected</h4>
                        <p className="text-sm font-medium mb-8">Connect your Facebook or Instagram page to start automating your messages.</p>
                        <button 
                            onClick={() => setIsAdding(true)} 
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all"
                        >
                            Connect your first page
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
