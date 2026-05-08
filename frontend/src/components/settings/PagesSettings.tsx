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
        <div className="p-6 text-white">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold mb-1">Connected Pages</h2>
                    <p className="text-slate-400 text-sm">Manage your connected Facebook/Instagram pages</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                    {isAdding ? 'Cancel' : <><Plus size={18} /> Connect Page</>}
                </button>
            </div>

            {isAdding && (
                <div className="mb-8 bg-slate-800 p-6 rounded-xl border border-slate-700">
                    <form onSubmit={handleAddPage} className="space-y-4 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-300">Page ID</label>
                            <input
                                type="text"
                                value={newPageId}
                                onChange={e => setNewPageId(e.target.value)}
                                placeholder="e.g. 104568142519349"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-300">Access Token</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={newAccessToken}
                                    onChange={e => setNewAccessToken(e.target.value)}
                                    placeholder="Paste your Page Access Token here"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:border-blue-500 outline-none pr-10"
                                    required
                                />
                                <Shield className="absolute right-3 top-2.5 text-slate-500" size={16} />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Token must have `pages_messaging`, `pages_manage_metadata` permissions.
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                            {isLoading ? 'Verifying...' : 'Connect'}
                        </button>
                    </form>
                </div>
            )}

            {isLoading && !isAdding && (
                <div className="flex items-center gap-2 text-slate-400 py-4">
                    <RefreshCw className="animate-spin" size={18} /> Loading pages...
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pages.map(page => (
                    <div key={page.id} className="bg-slate-800 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-12 h-12 bg-blue-900/50 rounded-full flex items-center justify-center text-blue-400">
                                <Globe size={24} />
                            </div>
                            <button
                                onClick={() => handleDeletePage(page.id)}
                                className="text-slate-500 hover:text-red-400 transition-colors bg-slate-900 p-2 rounded-lg"
                            >
                                <Trash size={16} />
                            </button>
                        </div>

                        <h3 className="text-lg font-bold mb-1">{page.page_name || 'Unknown Page'}</h3>
                        <p className="text-slate-400 text-xs font-mono mb-4">ID: {page.page_id}</p>

                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${page.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-xs text-slate-300">
                                {page.is_active ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-xs text-slate-500 ml-auto">
                                {page.platform}
                            </span>
                        </div>
                    </div>
                ))}

                {!isLoading && pages.length === 0 && !isAdding && (
                    <div className="col-span-full py-12 text-center text-slate-500 border border-slate-800 border-dashed rounded-xl">
                        <Globe className="mx-auto mb-3 opacity-50" size={32} />
                        <p>No pages connected yet.</p>
                        <button onClick={() => setIsAdding(true)} className="text-blue-400 hover:underline text-sm mt-2">
                            Connect your first page
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
