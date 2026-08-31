"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Rss, Plus, Trash2, Edit3, Send, Clock, CheckCircle2, XCircle,
    AlertCircle, Facebook, Instagram, ImagePlus,
    X, Calendar, Hash, Globe,
    Loader2, RefreshCw,
    Image as ImageIcon, Film, Sparkles, Target, Check, Info,
    Download, ExternalLink, Copy, Eye
} from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

async function downloadMedia(url: string, defaultName?: string) {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        const name = defaultName || url.split('/').pop()?.split('?')[0] || 'social-media-post';
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 200);
    } catch {
        window.open(url, '_blank');
    }
}

/* ─────────────────── Types ─────────────────── */
type Platform = 'facebook' | 'instagram' | 'tiktok';
type MediaType = 'none' | 'photo' | 'video';
type PostStatus = 'draft' | 'queued' | 'processing' | 'partial' | 'published' | 'failed' | 'scheduled';

interface ConnectedPage {
    id: string;
    platform: Platform;
    page_name: string;
    page_id: string;
    username?: string;
    profile_picture_url?: string;
    is_active: boolean;
}

interface PlatformContent {
    caption: string;
    hashtags: string;
}

interface TargetPage {
    pageId: string;
    platform: Platform;
    pageName: string;
}

interface PostTarget {
    id: string;
    page_id?: string;
    platform: Platform;
    page_name: string;
    status: 'pending' | 'queued' | 'processing' | 'success' | 'failed' | 'retrying';
    platform_post_id?: string;
    error_message?: string;
    published_at?: string;
}

interface Post {
    id: string;
    caption: string;
    hashtags: string[];
    media_url?: string;
    media_type: MediaType;
    status: PostStatus;
    scheduled_at?: string;
    created_at: string;
    updated_at: string;
    targets: PostTarget[];
    platformContent?: Record<Platform, PlatformContent>;
}

/* ─────────────────── Platform Meta ─────────────────── */
function TikTokIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill={color} width={size} height={size}>
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.89a8.18 8.18 0 004.78 1.52V7a4.85 4.85 0 01-1.01-.31z" />
        </svg>
    );
}

const PLATFORM_META: Record<Platform, {
    label: string; color: string; bg: string;
    icon: (size?: number) => React.ReactNode; gradient: string;
}> = {
    facebook: {
        label: 'Facebook', color: '#1877F2',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        icon: (size = 16) => <Facebook size={size} />,
        gradient: 'from-blue-500 to-blue-700',
    },
    instagram: {
        label: 'Instagram', color: '#E1306C',
        bg: 'bg-pink-50 dark:bg-pink-950/30',
        icon: (size = 16) => <Instagram size={size} />,
        gradient: 'from-pink-500 via-red-500 to-yellow-500',
    },
    tiktok: {
        label: 'TikTok', color: '#010101',
        bg: 'bg-slate-50 dark:bg-slate-800/50',
        icon: (size = 16) => <TikTokIcon size={size} />,
        gradient: 'from-slate-700 to-slate-950',
    },
};

const DEFAULT_PLATFORM_META = {
    label: 'Social Account',
    color: '#6366F1',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
    icon: (size = 16) => <Globe size={size} />,
    gradient: 'from-indigo-500 to-indigo-700',
};

function getPlatformMeta(platform?: string) {
    const p = (platform || '').toLowerCase() as Platform;
    return PLATFORM_META[p] || DEFAULT_PLATFORM_META;
}

const STATUS_META: Record<PostStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    draft:      { label: 'Draft',      color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800',    icon: <Edit3 size={11} /> },
    queued:     { label: 'Queued',     color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/30',  icon: <Clock size={11} /> },
    processing: { label: 'Processing', color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/30',    icon: <Loader2 size={11} className="animate-spin" /> },
    partial:    { label: 'Partial',    color: 'text-orange-600',  bg: 'bg-orange-50 dark:bg-orange-900/30',icon: <AlertCircle size={11} /> },
    published:  { label: 'Published',  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/30', icon: <CheckCircle2 size={11} /> },
    failed:     { label: 'Failed',     color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/30',      icon: <XCircle size={11} /> },
    scheduled:  { label: 'Scheduled',  color: 'text-violet-600',  bg: 'bg-violet-50 dark:bg-violet-900/30',icon: <Calendar size={11} /> },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
const getToken = () => (typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function getPlatformWarnings(platform: Platform, mediaType: MediaType): string[] {
    const w: string[] = [];
    if (platform === 'instagram' && mediaType === 'none') w.push('Instagram requires a photo or video.');
    if (platform === 'tiktok' && mediaType === 'none') w.push('TikTok requires a photo or video.');
    if (platform === 'tiktok' && mediaType === 'video') w.push('TikTok video will be sent as Draft — user must open TikTok to publish.');
    if (platform === 'instagram' && mediaType === 'video') w.push('Video will publish as a Reel (9:16 recommended).');
    return w;
}

/* ─── StatusBadge ─── */
function StatusBadge({ status }: { status: PostStatus }) {
    const s = STATUS_META[status] ?? STATUS_META.draft;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.color}`}>
            {s.icon} {s.label}
        </span>
    );
}

/* ─── PlatformBadge ─── */
function PlatformBadge({ platform }: { platform: string }) {
    const m = getPlatformMeta(platform);
    return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ color: m.color, backgroundColor: m.color + '18' }}>
            {m.icon(12)} {m.label}
        </span>
    );
}

/* ─── MediaUploader ─── */
function MediaUploader({ onUploaded, currentMediaType }: {
    onUploaded: (url: string, type: MediaType) => void;
    currentMediaType: MediaType;
}) {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setError('');
        const isVideo = file.type.startsWith('video/');
        const isPhoto = file.type.startsWith('image/');
        if (!isVideo && !isPhoto) { setError('Only image or video files are supported.'); return; }
        if (file.size > 200 * 1024 * 1024) { setError('File must be under 200 MB.'); return; }
        setUploading(true); setProgress(10);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
                body: formData,
            });
            setProgress(85);
            const data = await res.json();
            if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');
            setProgress(100);
            onUploaded(data.url, isVideo ? 'video' : 'photo');
        } catch (e: any) {
            setError(e.message || 'Upload failed');
        } finally {
            setUploading(false);
            setTimeout(() => setProgress(0), 500);
        }
    };

    return (
        <div className="space-y-2">
            <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => !uploading && inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all
                    ${dragging ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-800/50'}
                    ${uploading ? 'pointer-events-none' : ''}`}
            >
                {uploading ? (
                    <>
                        <Loader2 size={28} className="text-indigo-500 animate-spin" />
                        <p className="text-sm text-slate-500 dark:text-slate-400">Uploading… {progress}%</p>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl text-indigo-600">
                                <ImageIcon size={20} />
                            </div>
                            <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-xl text-violet-600">
                                <Film size={20} />
                            </div>
                        </div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            {currentMediaType !== 'none' ? 'Replace media' : 'Add photo or video'}
                        </p>
                        <p className="text-xs text-slate-400">Drag & drop or click • Max 200 MB</p>
                    </>
                )}
            </div>
            {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                    <AlertCircle size={12} /> {error}
                </div>
            )}
            <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
    );
}

/* ─── PlatformEditor ─── */
function PlatformEditor({ platform, content, onChange, mediaType, baseCaption, baseHashtags }: {
    platform: Platform; content: PlatformContent; onChange: (v: PlatformContent) => void;
    mediaType: MediaType; baseCaption: string; baseHashtags: string;
}) {
    const meta = PLATFORM_META[platform];
    const warnings = getPlatformWarnings(platform, mediaType);
    const [useCustom, setUseCustom] = useState(
        content.caption !== baseCaption || content.hashtags !== baseHashtags
    );
    const caption = useCustom ? content.caption : baseCaption;
    const hashtags = useCustom ? content.hashtags : baseHashtags;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {useCustom ? 'Custom content for this platform' : 'Using shared caption & hashtags'}
                </span>
                <button onClick={() => {
                    if (!useCustom) { setUseCustom(true); onChange({ caption: baseCaption, hashtags: baseHashtags }); }
                    else { setUseCustom(false); onChange({ caption: baseCaption, hashtags: baseHashtags }); }
                }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useCustom ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform ${useCustom ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
            </div>
            {warnings.map((w, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 ${meta.bg}`} style={{ color: meta.color }}>
                    <Info size={12} className="mt-0.5 flex-shrink-0" /> <span>{w}</span>
                </div>
            ))}
            <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Caption</label>
                <textarea value={caption}
                    onChange={e => { setUseCustom(true); onChange({ ...content, caption: e.target.value }); }}
                    placeholder={`Caption for ${meta.label}…`} rows={4}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 outline-none resize-none transition-all" />
                <div className="text-right text-xs text-slate-400 mt-1">{caption.length} chars</div>
            </div>
            <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                    <Hash size={10} className="inline mr-1" />Hashtags
                </label>
                <input type="text" value={hashtags}
                    onChange={e => { setUseCustom(true); onChange({ ...content, hashtags: e.target.value }); }}
                    placeholder="#hashtag1 #hashtag2"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 outline-none transition-all" />
            </div>
            {platform === 'tiktok' && mediaType !== 'none' && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">TikTok Options</p>
                    <div className="flex items-center gap-4">
                        {['Allow Duet', 'Allow Stitch'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                                <input type="checkbox" className="rounded accent-indigo-500" defaultChecked /> {opt}
                            </label>
                        ))}
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Privacy</label>
                        <select className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 transition-all">
                            <option value="PUBLIC_TO_EVERYONE">Public</option>
                            <option value="MUTUAL_FOLLOW_FRIENDS">Friends</option>
                            <option value="SELF_ONLY">Only Me</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── AccountSelector ─── */
function AccountSelector({ pages, selected, onToggle }: {
    pages: ConnectedPage[]; selected: TargetPage[]; onToggle: (p: ConnectedPage) => void;
}) {
    // Only display accounts that can be published to (facebook, instagram, tiktok)
    const publishable = pages.filter(p => ['facebook', 'instagram', 'tiktok'].includes((p.platform || '').toLowerCase()));
    const grouped = publishable.reduce<Record<string, ConnectedPage[]>>((acc, p) => {
        const key = (p.platform || '').toLowerCase();
        acc[key] = [...(acc[key] || []), p]; return acc;
    }, {});

    if (publishable.length === 0) return (
        <div className="text-center py-8 text-slate-400 text-sm">
            <Globe size={28} className="mx-auto mb-2 opacity-30" />
            No connected Facebook, Instagram, or TikTok accounts.<br />
            <span className="text-indigo-500">Settings → Integrations</span>
        </div>
    );

    return (
        <div className="space-y-4">
            {Object.keys(grouped).map(platform => {
                const meta = getPlatformMeta(platform);
                return (
                    <div key={platform}>
                        <div className="flex items-center gap-2 mb-2">
                            <span style={{ color: meta.color }}>{meta.icon(14)}</span>
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{meta.label}</span>
                        </div>
                        <div className="space-y-1.5">
                            {grouped[platform].map(page => {
                                const isSel = selected.some(s => s.pageId === page.id || s.pageId === page.page_id);
                                return (
                                    <button key={page.id} onClick={() => onToggle(page)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${isSel ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'}`}
                                    >
                                        {page.profile_picture_url ? (
                                            <img src={page.profile_picture_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                                                <span className="text-xs font-bold">{page.page_name.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{page.page_name}</p>
                                            {page.username && <p className="text-xs text-slate-400 truncate">@{page.username}</p>}
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSel ? 'border-indigo-500 bg-indigo-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {isSel && <Check size={11} color="white" strokeWidth={3} />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── PostDetailsModal ─── */
function PostDetailsModal({
    post,
    onClose,
    onEdit,
    onDelete,
}: {
    post: Post;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleCopy = () => {
        const text = [post.caption, (post.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = async () => {
        if (!post.media_url) return;
        setDownloading(true);
        await downloadMedia(post.media_url, `${post.caption?.slice(0, 25) || 'media'}.${post.media_type === 'video' ? 'mp4' : 'jpg'}`);
        setDownloading(false);
    };

    const handleDelete = async () => {
        if (!confirm('Permanently delete this post and remove its media from storage to free up space?')) return;
        setDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/publish/${post.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) onDelete();
        } catch {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <StatusBadge status={post.status} />
                        <span className="text-xs text-slate-400">{fmtDate(post.created_at)}</span>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Media Preview & Download */}
                    <div className="space-y-3">
                        <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[220px] max-h-[360px]">
                            {post.media_url && post.media_type === 'photo' && (
                                <img src={post.media_url} alt="" className="w-full h-full max-h-[360px] object-contain" />
                            )}
                            {post.media_url && post.media_type === 'video' && (
                                <video src={post.media_url} controls className="w-full h-full max-h-[360px]" />
                            )}
                            {!post.media_url && (
                                <div className="py-16 text-center text-slate-500">
                                    <ImageIcon size={36} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-xs">Text-only post (No media)</p>
                                </div>
                            )}
                        </div>

                        {post.media_url && (
                            <button onClick={handleDownload} disabled={downloading}
                                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                Download Original Media ({post.media_type.toUpperCase()})
                            </button>
                        )}
                    </div>

                    {/* Post Details & Accounts */}
                    <div className="space-y-4 flex flex-col justify-between">
                        <div className="space-y-4">
                            {/* Caption */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Caption</label>
                                    {post.caption && (
                                        <button onClick={handleCopy} className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 font-semibold">
                                            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                                        </button>
                                    )}
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
                                    {post.caption || <span className="text-slate-400 italic">No caption</span>}
                                </div>
                            </div>

                            {/* Hashtags */}
                            {post.hashtags && post.hashtags.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Hashtags</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {post.hashtags.map((tag, i) => (
                                            <span key={i} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                                                {tag.startsWith('#') ? tag : `#${tag}`}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Target Accounts */}
                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                                    Published Accounts ({post.targets.length})
                                </label>
                                <div className="space-y-2">
                                    {post.targets.map(target => {
                                        const meta = getPlatformMeta(target.platform);
                                        return (
                                            <div key={target.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span style={{ color: meta.color }}>{meta.icon(16)}</span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{target.page_name}</p>
                                                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                                                            target.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' :
                                                            target.status === 'failed' ? 'text-red-500' : 'text-amber-500'
                                                        }`}>
                                                            {target.status === 'success' ? '✓ Published' : target.status === 'failed' ? '✕ Failed' : '● In progress'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {target.platform_post_id && (
                                                    <a href={`https://facebook.com/${target.platform_post_id}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex-shrink-0">
                                                        View on Facebook <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all border border-red-200 dark:border-red-800 disabled:opacity-50">
                                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                Delete Post & Storage
                            </button>

                            <div className="flex-1" />

                            {(post.status === 'draft' || post.status === 'failed') && (
                                <button onClick={onEdit}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all">
                                    <Edit3 size={13} /> Edit
                                </button>
                            )}

                            <button onClick={onClose}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── PostCard ─── */
function PostCard({
    post,
    onView,
    onEdit,
    onDelete,
}: {
    post: Post;
    onView: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Permanently delete this post and remove its media from storage to free up space?')) return;
        setDeleting(true);
        try {
            const res = await fetch(`${API_URL}/api/publish/${post.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (res.ok) onDelete();
        } catch { setDeleting(false); }
    };

    return (
        <div className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200 overflow-hidden flex flex-col justify-between">
            <div>
                {/* Thumbnail with Download Overlay */}
                <div className="relative overflow-hidden group/media">
                    {post.media_url && post.media_type === 'photo' && (
                        <div className="h-44 overflow-hidden bg-slate-950">
                            <img src={post.media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                    )}
                    {post.media_url && post.media_type === 'video' && (
                        <div className="h-44 bg-slate-950 flex items-center justify-center relative overflow-hidden">
                            <video src={post.media_url} className="h-full w-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300" muted />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 shadow-lg">
                                    <Film size={20} className="text-white" />
                                </div>
                            </div>
                        </div>
                    )}
                    {!post.media_url && (
                        <div className="h-20 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                            <ImageIcon size={24} className="text-indigo-200 dark:text-slate-600" />
                        </div>
                    )}

                    {/* Quick Download Button on media hover */}
                    {post.media_url && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                downloadMedia(post.media_url!, `${post.caption?.slice(0, 20) || 'media'}.${post.media_type === 'video' ? 'mp4' : 'jpg'}`);
                            }}
                            title="Download media in original quality"
                            className="absolute top-2.5 right-2.5 bg-black/65 hover:bg-black/90 text-white rounded-full p-2 opacity-0 group-hover/media:opacity-100 transition-all shadow-md backdrop-blur-sm active:scale-95">
                            <Download size={13} />
                        </button>
                    )}
                </div>

                <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <StatusBadge status={post.status} />
                        <span className="text-[11px] text-slate-400">{fmtDate(post.created_at)}</span>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed min-h-[40px]">
                        {post.caption || <span className="text-slate-400 italic">No caption</span>}
                    </p>

                    {/* Published Account Badges */}
                    <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Published Accounts</p>
                        <div className="flex flex-wrap gap-1.5">
                            {post.targets.length > 0 ? (
                                post.targets.map(t => {
                                    const m = getPlatformMeta(t.platform);
                                    return (
                                        <span key={t.id} title={`${t.page_name} • ${t.status}`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-600/60">
                                            <span style={{ color: m.color }}>{m.icon(12)}</span>
                                            <span className="truncate max-w-[120px]">{t.page_name}</span>
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                t.status === 'success' ? 'bg-emerald-500' :
                                                t.status === 'failed' ? 'bg-red-500' :
                                                t.status === 'processing' ? 'bg-blue-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-500'
                                            }`} />
                                        </span>
                                    );
                                })
                            ) : (
                                <span className="text-xs text-slate-400 italic">No accounts selected</span>
                            )}
                        </div>
                    </div>

                    {/* Target error messages if any failed */}
                    {post.targets.some(t => t.status === 'failed' && t.error_message) && (
                        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl p-2.5 space-y-1">
                            {post.targets.filter(t => t.status === 'failed' && t.error_message).map(t => (
                                <p key={t.id} className="truncate" title={t.error_message}>
                                    <span className="font-semibold">{t.page_name}:</span> {t.error_message}
                                </p>
                            ))}
                        </div>
                    )}

                    {post.scheduled_at && (
                        <div className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-lg px-2 py-1">
                            <Calendar size={10} /> {fmtDate(post.scheduled_at)}
                        </div>
                    )}
                </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 pt-0">
                <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                    <button onClick={onView}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all">
                        <Eye size={13} /> View Details
                    </button>

                    {(post.status === 'draft' || post.status === 'failed') && (
                        <button onClick={onEdit}
                            className="flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
                            title="Edit & Retry">
                            <Edit3 size={13} />
                        </button>
                    )}

                    {post.media_url && (
                        <button onClick={() => downloadMedia(post.media_url!, `${post.caption?.slice(0, 20) || 'media'}.${post.media_type === 'video' ? 'mp4' : 'jpg'}`)}
                            className="flex items-center justify-center text-xs font-semibold p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 transition-all"
                            title="Download media in original quality">
                            <Download size={13} />
                        </button>
                    )}

                    {/* Delete button available for ALL posts */}
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex items-center justify-center text-xs font-semibold p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all disabled:opacity-50"
                        title="Delete post and remove media from storage">
                        {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── ComposerPanel ─── */
function ComposerPanel({ pages, editPost, onClose, onSaved }: {
    pages: ConnectedPage[]; editPost: Post | null; onClose: () => void; onSaved: () => void;
}) {
    const isEditing = !!editPost;
    const [caption, setCaption] = useState(editPost?.caption || '');
    const [hashtags, setHashtags] = useState(editPost?.hashtags?.join(' ') || '');
    const [mediaUrl, setMediaUrl] = useState(editPost?.media_url || '');
    const [mediaType, setMediaType] = useState<MediaType>(editPost?.media_type || 'none');
    const [scheduledAt, setScheduledAt] = useState(editPost?.scheduled_at ? editPost.scheduled_at.slice(0, 16) : '');
    const [enableSchedule, setEnableSchedule] = useState(!!editPost?.scheduled_at);
    const [selectedTargets, setSelectedTargets] = useState<TargetPage[]>(
        editPost?.targets?.map(t => ({
            pageId: t.page_id || t.id,
            platform: t.platform,
            pageName: t.page_name
        })) || []
    );
    const [platformContent, setPlatformContent] = useState<Record<Platform, PlatformContent>>({
        facebook:  { caption: caption, hashtags: hashtags },
        instagram: { caption: caption, hashtags: hashtags },
        tiktok:    { caption: caption, hashtags: hashtags },
        ...(editPost?.platformContent || {}),
    });
    const [activeTab, setActiveTab] = useState<'shared' | Platform>('shared');
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState('');

    const selectedPlatforms = [...new Set(selectedTargets.map(t => t.platform))];

    const toggleTarget = (page: ConnectedPage) => {
        setSelectedTargets(prev => {
            const exists = prev.some(p => p.pageId === page.id || p.pageId === page.page_id);
            if (exists) return prev.filter(p => p.pageId !== page.id && p.pageId !== page.page_id);
            return [...prev, { pageId: page.id, platform: page.platform, pageName: page.page_name }];
        });
    };

    const save = async (action: 'draft' | 'publish') => {
        setError('');
        if (selectedTargets.length === 0) { setError('Select at least one account to post to.'); return; }
        const setter = action === 'draft' ? setSaving : setPublishing;
        setter(true);
        try {
            const url = isEditing ? `${API_URL}/api/publish/${editPost!.id}` : `${API_URL}/api/publish/create`;
            const method = isEditing ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
                body: JSON.stringify({
                    caption, hashtags: hashtags.split(/\s+/).filter(Boolean),
                    mediaUrl: mediaUrl || undefined, mediaType,
                    targets: selectedTargets.map(t => ({ pageId: t.pageId, platform: t.platform })),
                    platformContent,
                    scheduledAt: enableSchedule && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
                    action,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to save');
            onSaved();
        } catch (e: any) {
            setError(e.message || 'An error occurred');
            setter(false);
        }
    };

    const tabs = [
        { key: 'shared' as const, label: 'Shared Caption' },
        ...selectedPlatforms.map(p => ({ key: p, label: getPlatformMeta(p).label })),
    ];

    const allWarnings = selectedPlatforms.flatMap(p =>
        getPlatformWarnings(p, mediaType).map(w => ({ platform: p, warning: w }))
    );

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-all">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h2 className="font-bold text-slate-800 dark:text-white text-base">
                            {isEditing ? 'Edit Post' : 'Create New Post'}
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {selectedTargets.length === 0 ? 'Select accounts on the left' : `${selectedTargets.length} account${selectedTargets.length > 1 ? 's' : ''} selected`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => save('draft')} disabled={saving || publishing}
                        className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-all">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
                        {saving ? 'Saving…' : 'Save Draft'}
                    </button>
                    <button onClick={() => save('publish')} disabled={saving || publishing}
                        className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all">
                        {publishing ? <Loader2 size={14} className="animate-spin" /> : enableSchedule ? <Calendar size={14} /> : <Send size={14} />}
                        {publishing ? 'Publishing…' : enableSchedule ? 'Schedule Post' : 'Publish Now'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mx-6 mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex-shrink-0">
                    <AlertCircle size={16} /> {error}
                    <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {/* Two-column body */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT — Accounts + Schedule */}
                <div className="w-72 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 overflow-y-auto p-5 space-y-5 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <Target size={10} /> Publish To
                        </p>
                        <AccountSelector pages={pages} selected={selectedTargets} onToggle={toggleTarget} />
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                                <Calendar size={10} /> Schedule
                            </p>
                            <button onClick={() => setEnableSchedule(!enableSchedule)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enableSchedule ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform ${enableSchedule ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                        {enableSchedule ? (
                            <>
                                <input type="datetime-local" value={scheduledAt}
                                    onChange={e => setScheduledAt(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all" />
                                {scheduledAt && (
                                    <p className="text-xs text-violet-600 dark:text-violet-400 mt-1.5 flex items-center gap-1">
                                        <Calendar size={10} /> {fmtDate(scheduledAt)}
                                    </p>
                                )}
                                {selectedPlatforms.includes('tiktok') && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-2 py-1">
                                        ⚠️ TikTok doesn't support scheduling — will post immediately.
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-xs text-slate-400 dark:text-slate-500">Toggle to schedule for a future date.</p>
                        )}
                    </div>
                </div>

                {/* RIGHT — Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white dark:bg-slate-900">
                    {/* Media */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <ImagePlus size={10} /> Media
                        </p>
                        {mediaUrl ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                                {mediaType === 'photo'
                                    ? <img src={mediaUrl} alt="" className="w-full max-h-72 object-cover" />
                                    : <video src={mediaUrl} controls className="w-full max-h-72" />
                                }
                                <button onClick={() => { setMediaUrl(''); setMediaType('none'); }}
                                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:bg-red-600">
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <MediaUploader onUploaded={(url, type) => { setMediaUrl(url); setMediaType(type); }} currentMediaType={mediaType} />
                        )}
                    </div>

                    {/* Content tabs */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-2">
                            <Sparkles size={10} /> Caption & Hashtags
                        </p>

                        {/* Tabs */}
                        {tabs.length > 1 && (
                            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                                {tabs.map(tab => {
                                    const isActive = activeTab === tab.key;
                                    const hasWarn = tab.key !== 'shared' && getPlatformWarnings(tab.key as Platform, mediaType).length > 0;
                                    return (
                                        <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${isActive ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
                                            {tab.key !== 'shared' && (
                                                <span style={{ color: isActive ? undefined : getPlatformMeta(tab.key).color }}>
                                                    {getPlatformMeta(tab.key).icon(13)}
                                                </span>
                                            )}
                                            {tab.label}
                                            {hasWarn && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Tab content */}
                        {activeTab === 'shared' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">Caption</label>
                                    <textarea value={caption} onChange={e => setCaption(e.target.value)}
                                        placeholder="Write your caption here…" rows={5}
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 outline-none resize-none transition-all" />
                                    <div className="text-right text-xs text-slate-400 mt-1">{caption.length} chars</div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5 block">
                                        <Hash size={10} className="inline mr-1" />Hashtags
                                    </label>
                                    <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)}
                                        placeholder="#hashtag1 #hashtag2 #hashtag3"
                                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 outline-none transition-all" />
                                </div>
                                {selectedPlatforms.length > 1 && (
                                    <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5">
                                        <Info size={12} className="mt-0.5 flex-shrink-0" />
                                        This caption is shared across all platforms. Switch to a platform tab above to customize per-platform.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <PlatformEditor
                                platform={activeTab as Platform}
                                content={platformContent[activeTab as Platform]}
                                onChange={val => setPlatformContent(prev => ({ ...prev, [activeTab]: val }))}
                                mediaType={mediaType} baseCaption={caption} baseHashtags={hashtags}
                            />
                        )}
                    </div>

                    {/* Warnings summary */}
                    {allWarnings.length > 0 && (
                        <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 space-y-2">
                            <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                                <AlertCircle size={11} /> Platform Notes
                            </p>
                            {allWarnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                                    <PlatformBadge platform={w.platform} />
                                    <span className="mt-0.5">{w.warning}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────── Main ManagePostView ─────────────────── */
export default function ManagePostView() {
    const [view, setView] = useState<'list' | 'compose'>('list');
    const [posts, setPosts] = useState<Post[]>([]);
    const [pages, setPages] = useState<ConnectedPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [editPost, setEditPost] = useState<Post | null>(null);
    const [viewPost, setViewPost] = useState<Post | null>(null);
    const [filterStatus, setFilterStatus] = useState<PostStatus | 'all'>('all');
    const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [postsRes, pagesRes] = await Promise.all([
                fetch(`${API_URL}/api/publish`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch(`${API_URL}/api/pages`, { headers: { Authorization: `Bearer ${getToken()}` } }),
            ]);
            const postsData = postsRes.ok ? await postsRes.json() : { posts: [] };
            const pagesData = pagesRes.ok ? await pagesRes.json() : [];
            setPosts(Array.isArray(postsData) ? postsData : postsData.posts || []);
            setPages(Array.isArray(pagesData) ? pagesData : pagesData.pages || []);
        } catch (e) {
            console.error('ManagePostView fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh when any post is currently processing or queued
    useEffect(() => {
        const hasPending = posts.some(p => p.status === 'processing' || p.status === 'queued');
        if (!hasPending) return;

        const interval = setInterval(() => {
            fetchData();
        }, 3000);

        return () => clearInterval(interval);
    }, [posts, fetchData]);

    if (view === 'compose') {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
                <ComposerPanel pages={pages} editPost={editPost}
                    onClose={() => { setView('list'); setEditPost(null); }}
                    onSaved={() => { setView('list'); setEditPost(null); fetchData(); }} />
            </div>
        );
    }

    const filtered = posts.filter(p => {
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;
        if (filterPlatform !== 'all' && !p.targets.some(t => t.platform === filterPlatform)) return false;
        return true;
    });

    const counts: Record<string, number> = {
        all: posts.length,
        draft: posts.filter(p => p.status === 'draft').length,
        scheduled: posts.filter(p => p.status === 'scheduled').length,
        published: posts.filter(p => p.status === 'published').length,
        failed: posts.filter(p => p.status === 'failed').length,
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 h-full overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
                        <Rss size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-[15px] font-bold text-slate-800 dark:text-white">Manage Post</h1>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">Publish across Facebook, Instagram & TikTok</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all" title="Refresh">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={() => { setEditPost(null); setView('compose'); }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all">
                        <Plus size={16} /> New Post
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-3 flex items-center gap-3 flex-shrink-0 flex-wrap">
                {/* Status */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    {(['all', 'draft', 'scheduled', 'published', 'failed'] as const).map(s => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${filterStatus === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                            {s === 'all' ? 'All Posts' : s.charAt(0).toUpperCase() + s.slice(1)}
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filterStatus === s ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                {counts[s] ?? 0}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

                {/* Platform */}
                <div className="flex items-center gap-1.5">
                    {(['all', 'facebook', 'instagram', 'tiktok'] as const).map(p => {
                        const meta = p !== 'all' ? getPlatformMeta(p) : null;
                        const isActive = filterPlatform === p;
                        return (
                            <button key={p} onClick={() => setFilterPlatform(p)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border ${isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                                {meta && <span style={isActive ? { color: 'white' } : { color: meta.color }}>{meta.icon(12)}</span>}
                                {p === 'all' ? 'All Platforms' : meta!.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Post grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-3">
                        <Loader2 size={32} className="text-indigo-400 animate-spin" />
                        <p className="text-slate-400 text-sm">Loading posts…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/30 rounded-3xl flex items-center justify-center">
                            <Rss size={28} className="text-indigo-400 dark:text-indigo-300" />
                        </div>
                        <div>
                            <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                                {filterStatus !== 'all' || filterPlatform !== 'all' ? 'No posts match your filter' : 'No posts yet'}
                            </p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                                {filterStatus !== 'all' || filterPlatform !== 'all'
                                    ? 'Try adjusting the filters above.'
                                    : 'Create your first post to get started.'}
                            </p>
                        </div>
                        {filterStatus === 'all' && filterPlatform === 'all' && (
                            <button onClick={() => { setEditPost(null); setView('compose'); }}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all">
                                <Plus size={16} /> Create First Post
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(post => (
                            <PostCard key={post.id} post={post}
                                onView={() => setViewPost(post)}
                                onEdit={() => { setEditPost(post); setView('compose'); }}
                                onDelete={fetchData}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* View Details Modal */}
            {viewPost && (
                <PostDetailsModal
                    post={viewPost}
                    onClose={() => setViewPost(null)}
                    onEdit={() => {
                        setEditPost(viewPost);
                        setViewPost(null);
                        setView('compose');
                    }}
                    onDelete={() => {
                        setViewPost(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
}