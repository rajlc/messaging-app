import { useState, useEffect } from 'react';
import { Plus, Trash, Globe, Shield, RefreshCw, Facebook, Instagram, Music2, MessageCircle, Smartphone } from 'lucide-react';

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
    const [selectedPlatform, setSelectedPlatform] = useState('facebook');
    const [oauthPages, setOauthPages] = useState<any[]>([]);
    const [isOauthModalOpen, setIsOauthModalOpen] = useState(false);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'FB_PAGES_RECEIVED') {
                setOauthPages(event.data.pages || []);
                setIsOauthModalOpen(true);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleFacebookLoginConnect = () => {
        const appId = '900380315905703';
        const redirectUri = `${window.location.origin}/auth/facebook/callback`;
        const scope = 'pages_show_list,pages_messaging,pages_read_engagement,pages_manage_metadata,instagram_basic,instagram_manage_messages';
        
        const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code`;
        
        window.open(oauthUrl, 'Facebook Connect', 'width=600,height=650,status=no,toolbar=no,menubar=no,location=no');
    };

    const handleConnectOauthPage = async (page: { pageId: string; pageName: string; accessToken: string }) => {
        setError('');
        setIsLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    pageId: page.pageId,
                    accessToken: page.accessToken,
                    pageName: page.pageName,
                    platform: selectedPlatform
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to connect page');
            }

            setPages([data, ...pages]);
            
            // Remove from the list of connectable pages in state
            setOauthPages(prev => {
                const updated = prev.filter(p => {
                    if (selectedPlatform === 'facebook') {
                        return p.pageId !== page.pageId;
                    } else {
                        return p.instagramAccount?.id !== page.pageId;
                    }
                });
                if (updated.length === 0) {
                    setIsOauthModalOpen(false);
                }
                return updated;
            });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const platforms = [
        { id: 'facebook', label: 'Facebook Messenger', icon: Facebook, description: 'Connect Facebook Pages' },
        { id: 'instagram', label: 'Instagram', icon: Instagram, description: 'Connect Instagram Business' },
        { id: 'tiktok', label: 'TikTok', icon: Music2, description: 'Connect TikTok Shop/Account' },
        { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone, description: 'Connect WhatsApp Business' }
    ];

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
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/pages`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    pageId: newPageId,
                    accessToken: newAccessToken,
                    platform: selectedPlatform
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
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (res.ok) {
                setPages(pages.filter(p => p.id !== id));
            }
        } catch (err) {
            console.error('Failed to delete page:', err);
        }
    };

    const filteredPages = pages.filter(p => p.platform === selectedPlatform);

    return (
        <div className="flex flex-col h-full overflow-hidden -m-6">
            <div className="flex-1 flex overflow-hidden">
                {/* Platform Sidebar */}
                <div className="w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 flex flex-col p-4 gap-2">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">Social Platforms</h3>
                    {platforms.map((platform) => {
                        const active = selectedPlatform === platform.id;
                        return (
                            <button
                                key={platform.id}
                                onClick={() => {
                                    setSelectedPlatform(platform.id);
                                    setIsAdding(false);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                    active 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                    : 'text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <platform.icon size={18} />
                                <div className="text-left">
                                    <div className="leading-none">{platform.label}</div>
                                    {/* <div className={`text-[9px] font-medium mt-1 ${active ? 'text-indigo-200' : 'text-slate-400'}`}>{platform.description}</div> */}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Platform Content Area */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-gray-50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-2xl font-black mb-1">{platforms.find(p => p.id === selectedPlatform)?.label}</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                {selectedPlatform === 'facebook' 
                                    ? 'Manage your connected Facebook pages and tokens' 
                                    : `Connect and manage your ${selectedPlatform} integration`}
                            </p>
                        </div>
                        {(selectedPlatform === 'facebook' || selectedPlatform === 'instagram' || selectedPlatform === 'tiktok') && (
                            <div className="flex gap-3">
                                {(selectedPlatform === 'facebook' || selectedPlatform === 'instagram') && (
                                    <button
                                        onClick={handleFacebookLoginConnect}
                                        className={`px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest text-xs transition-all shadow-lg active:scale-95 ${
                                            selectedPlatform === 'instagram'
                                            ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white hover:opacity-90 shadow-pink-600/20'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/10'
                                        }`}
                                    >
                                        {selectedPlatform === 'instagram' ? <Instagram size={18} /> : <Facebook size={18} />}
                                        Connect {selectedPlatform === 'instagram' ? 'Instagram' : 'page'} by login
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAdding(!isAdding)}
                                    className={`px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold uppercase tracking-widest text-xs transition-all shadow-lg ${
                                        isAdding 
                                        ? 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700' 
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                                    }`}
                                >
                                    {isAdding ? 'Cancel' : <><Plus size={18} /> Connect {selectedPlatform === 'facebook' ? 'Page' : selectedPlatform === 'instagram' ? 'Instagram' : 'Account'}</>}
                                </button>
                            </div>
                        )}
                    </div>

                    {(selectedPlatform !== 'facebook' && selectedPlatform !== 'instagram' && selectedPlatform !== 'tiktok') ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-400 mb-6 border border-dashed border-slate-300 dark:border-slate-700">
                                {(() => {
                                    const Icon = platforms.find(p => p.id === selectedPlatform)?.icon || Globe;
                                    return <Icon size={32} />;
                                })()}
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{platforms.find(p => p.id === selectedPlatform)?.label} Coming Soon</h3>
                            <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">
                                We are currently working on {platforms.find(p => p.id === selectedPlatform)?.label} integration. Stay tuned for updates!
                            </p>
                        </div>
                    ) : (
                        <>
                            {isAdding && (
                                <div className="mb-8 bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-gray-200 dark:border-slate-700 shadow-xl animate-in zoom-in-95 duration-200">
                                    <form onSubmit={handleAddPage} className="space-y-6 max-w-lg">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                                {selectedPlatform === 'facebook' ? 'Page ID' : 'TikTok Seller/Account ID'}
                                            </label>
                                            <input
                                                type="text"
                                                value={newPageId}
                                                onChange={e => setNewPageId(e.target.value)}
                                                placeholder={selectedPlatform === 'facebook' ? "e.g. 104568142519349" : "e.g. 745123456789"}
                                                className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-mono"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                                                {selectedPlatform === 'facebook' ? 'Access Token' : 'TikTok API Access Token'}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="password"
                                                    value={newAccessToken}
                                                    onChange={e => setNewAccessToken(e.target.value)}
                                                    placeholder="Paste your access token here"
                                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none pr-10 transition-all font-mono"
                                                    required
                                                />
                                                <Shield className="absolute right-3 top-3.5 text-slate-400" size={18} />
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1 ml-1">
                                                <span className="w-1 h-1 bg-amber-500 rounded-full" />
                                                {selectedPlatform === 'facebook' 
                                                    ? 'Token must have pages_messaging and pages_manage_metadata permissions.'
                                                    : 'Token must have the required TikTok Business/Shop API permissions.'}
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

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredPages.map(page => (
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
                                                {page.platform === 'facebook' ? (
                                                    <Facebook size={28} />
                                                ) : page.platform === 'instagram' ? (
                                                    <Instagram size={28} />
                                                ) : (
                                                    <Music2 size={28} />
                                                )}
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

                                {!isLoading && filteredPages.length === 0 && !isAdding && (
                                    <div className="col-span-full py-20 text-center text-slate-400 border-2 border-slate-100 dark:border-slate-800 border-dashed rounded-[2.5rem] bg-white dark:bg-slate-800/50 shadow-sm">
                                        <Facebook className="mx-auto mb-6 opacity-10" size={64} />
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">No {platforms.find(p => p.id === selectedPlatform)?.label} Connected</h4>
                                        <p className="text-sm font-medium mb-8">Connect your page to start automating your messages.</p>
                                        <button 
                                            onClick={() => setIsAdding(true)} 
                                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all"
                                        >
                                            Connect your first page
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
            {/* Facebook Pages Selection Modal */}
            {isOauthModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Select Page to Connect</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Select the page you want to integrate with your dashboard.</p>
                            </div>
                            <button
                                onClick={() => setIsOauthModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold bg-gray-100 dark:bg-slate-700 p-2 rounded-xl"
                            >
                                Close
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 max-h-[30rem] overflow-y-auto custom-scrollbar space-y-4">
                            {oauthPages.length === 0 ? (
                                <p className="text-center py-8 text-slate-500 text-sm">No new connectable pages found.</p>
                            ) : (
                                selectedPlatform === 'facebook' ? (
                                    oauthPages.map((page) => {
                                        const isAlreadyConnected = pages.some(p => p.page_id === page.pageId);
                                        return (
                                            <div
                                                key={page.pageId}
                                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-slate-700"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                                                        <Facebook size={20} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[15rem]">{page.pageName}</h4>
                                                        <p className="text-[10px] text-slate-400 font-mono">ID: {page.pageId}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    disabled={isAlreadyConnected || isLoading}
                                                    onClick={() => handleConnectOauthPage(page)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                                                        isAlreadyConnected
                                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95'
                                                    }`}
                                                >
                                                    {isAlreadyConnected ? 'Connected' : 'Connect'}
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    oauthPages
                                        .filter(page => page.instagramAccount !== null && page.instagramAccount !== undefined)
                                        .map((page) => {
                                            const ig = page.instagramAccount;
                                            const isAlreadyConnected = pages.some(p => p.page_id === ig.id);
                                            return (
                                                <div
                                                    key={ig.id}
                                                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-gray-100 dark:border-slate-700"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-xl flex items-center justify-center">
                                                            <Instagram size={20} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[15rem]">{ig.name || ig.username}</h4>
                                                            <p className="text-[10px] text-slate-400 font-mono">@{ig.username} | ID: {ig.id}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        disabled={isAlreadyConnected || isLoading}
                                                        onClick={() => handleConnectOauthPage({
                                                            pageId: ig.id,
                                                            pageName: ig.name || ig.username,
                                                            accessToken: page.accessToken
                                                        })}
                                                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm ${
                                                            isAlreadyConnected
                                                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-95'
                                                        }`}
                                                    >
                                                        {isAlreadyConnected ? 'Connected' : 'Connect'}
                                                    </button>
                                                </div>
                                            );
                                        })
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
                </div>
            </div>
        </div>
    );
}
