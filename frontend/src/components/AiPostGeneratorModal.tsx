"use client";

import { useState, useEffect, useRef } from 'react';
import {
    Sparkles, X, Check, Copy, RefreshCw, AlertCircle,
    Upload, ArrowRight, Wand2, Trash2, Camera, Loader2
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || '';
}

interface AiPostGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentMediaUrl?: string;
    currentMediaType?: string;
    onApply: (caption: string, hashtags: string, mediaUrl?: string) => void;
}

export default function AiPostGeneratorModal({
    isOpen,
    onClose,
    currentMediaUrl = '',
    currentMediaType = 'none',
    onApply,
}: AiPostGeneratorModalProps) {
    const [productPhoto, setProductPhoto] = useState<string>('');
    const [photoBase64, setPhotoBase64] = useState<string>('');
    const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
    const [uploadedServerUrl, setUploadedServerUrl] = useState<string>('');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [productName, setProductName] = useState('');
    const [productSpecs, setProductSpecs] = useState('');
    const [extraNotes, setExtraNotes] = useState('');
    const [tone, setTone] = useState('High-Converting / Sales-Driven');
    const [engineChoice, setEngineChoice] = useState('auto');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedCaption, setGeneratedCaption] = useState('');
    const [generatedHashtags, setGeneratedHashtags] = useState('');
    const [copiedCaption, setCopiedCaption] = useState(false);
    const [copiedHashtags, setCopiedHashtags] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync mediaUrl when opened
    useEffect(() => {
        if (isOpen) {
            setError('');
            if (currentMediaType === 'photo' && currentMediaUrl) {
                setProductPhoto(currentMediaUrl);
                setUploadedServerUrl(currentMediaUrl);
            }
        }
    }, [isOpen, currentMediaUrl, currentMediaType]);

    if (!isOpen) return null;

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPEG, PNG, WEBP).');
            return;
        }
        setError('');
        setPhotoMime(file.type || 'image/jpeg');

        // 1. Process image locally for preview and base64 AI vision
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const img = new Image();
            img.onload = () => {
                const maxDim = 1200;
                let width = img.width;
                let height = img.height;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    setProductPhoto(compressedDataUrl);
                    setPhotoBase64(compressedDataUrl.split(',')[1] || '');
                } else {
                    setProductPhoto(dataUrl);
                    setPhotoBase64(dataUrl.split(',')[1] || '');
                }
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);

        // 2. Upload in background to /api/upload to obtain permanent Supabase URL
        setUploadingPhoto(true);
        const formData = new FormData();
        formData.append('file', file);
        fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
        })
            .then(res => res.json())
            .then(data => {
                if (data.url) {
                    setUploadedServerUrl(data.url);
                }
            })
            .catch(err => {
                console.error('Failed to upload image to storage:', err);
            })
            .finally(() => {
                setUploadingPhoto(false);
            });
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleRemovePhoto = () => {
        setProductPhoto('');
        setPhotoBase64('');
        setUploadedServerUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleGenerate = async () => {
        setError('');

        // Validation rule: At least one of Product Photo or Product Name is required
        if (!productPhoto && !productName.trim()) {
            setError('Please upload a Product Photo or enter a Product Name before generating.');
            return;
        }

        setLoading(true);

        try {
            let chosenProvider: 'gemini' | 'openai' | undefined = undefined;
            let chosenModel: string | undefined = undefined;

            if (engineChoice.startsWith('gemini:')) {
                chosenProvider = 'gemini';
                chosenModel = engineChoice.replace('gemini:', '');
            } else if (engineChoice.startsWith('openai:')) {
                chosenProvider = 'openai';
                chosenModel = engineChoice.replace('openai:', '');
            } else if (engineChoice === 'gemini') {
                chosenProvider = 'gemini';
            } else if (engineChoice === 'openai') {
                chosenProvider = 'openai';
            }

            const body: any = {
                productName: productName.trim() || undefined,
                productDetails: productSpecs.trim() || undefined,
                extraNotes: extraNotes.trim() || undefined,
                tone,
                provider: chosenProvider,
                model: chosenModel,
            };

            if (photoBase64) {
                body.imageBase64 = photoBase64;
                body.mimeType = photoMime;
            } else if (uploadedServerUrl || productPhoto) {
                body.imageUrl = uploadedServerUrl || productPhoto;
            }

            const res = await fetch(`${API_URL}/api/ai/generate-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to generate post content.');
            }

            let finalCaption = data.caption || '';
            let finalHashtags = data.hashtags || '';

            // Clean guard if AI returned JSON wrapper in caption string
            if (finalCaption.trim().startsWith('{') && finalCaption.includes('"caption"')) {
                try {
                    const parsed = JSON.parse(finalCaption.trim());
                    if (parsed.caption) {
                        finalCaption = parsed.caption;
                        if (parsed.hashtags && !finalHashtags) {
                            finalHashtags = parsed.hashtags;
                        }
                    }
                } catch { }
            }

            setGeneratedCaption(finalCaption);
            setGeneratedHashtags(finalHashtags);
        } catch (err: any) {
            setError(err.message || 'Error generating post with AI');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        const mediaToApply = uploadedServerUrl || productPhoto || undefined;
        onApply(generatedCaption, generatedHashtags, mediaToApply);
        onClose();
    };

    const copyToClipboard = (text: string, type: 'caption' | 'hashtags') => {
        navigator.clipboard.writeText(text);
        if (type === 'caption') {
            setCopiedCaption(true);
            setTimeout(() => setCopiedCaption(false), 2000);
        } else {
            setCopiedHashtags(true);
            setTimeout(() => setCopiedHashtags(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-pink-50/60 dark:from-slate-900 dark:to-slate-800 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                                AI Social Post Generator
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                    Gemini & ChatGPT
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">Generate viral captions and high-reach hashtags from photos, text, or both</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">
                    {/* 1. TOP: Upload Product Photo */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Camera size={13} className="text-indigo-500" />
                                <span>Upload Product Photo</span>
                            </label>
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                {productPhoto ? 'Photo ready for AI' : 'Optional if product name is provided'}
                            </span>
                        </div>

                        {productPhoto ? (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5 flex items-center gap-4 transition-all">
                                <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex-shrink-0 relative group">
                                    <img src={productPhoto} alt="Product preview" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg">
                                            <Check size={13} /> Photo Ready for AI Visual Analysis
                                        </span>
                                        {uploadingPhoto ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                                <Loader2 size={12} className="animate-spin" /> Uploading to storage...
                                            </span>
                                        ) : uploadedServerUrl ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                                ✓ Saved for post media
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        AI will read the product photo. This photo will automatically be added to your post media.
                                    </p>
                                    <div className="flex items-center gap-3 pt-0.5">
                                        <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                                            Change Photo
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileInputChange}
                                                className="hidden"
                                            />
                                        </label>
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:underline inline-flex items-center gap-1"
                                        >
                                            <Trash2 size={12} /> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center
                                    ${isDragging
                                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/30 ring-2 ring-indigo-400/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
                                    <Upload size={20} />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Upload Product Photo
                                    </span>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Click or drag a photo for AI visual scan
                                    </p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                />
                            </div>
                        )}
                    </div>

                    {/* 2. PRODUCT NAME / TITLE */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Product Name / Title
                            </label>
                            {!productPhoto && (
                                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    Required if no photo is uploaded
                                </span>
                            )}
                        </div>
                        <input
                            type="text"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="e.g. Wireless Noise-Cancelling Earbuds Pro"
                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                    </div>

                    {/* 3. SPECIFICATIONS, HIGHLIGHTS & PRICE */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Specifications, Highlights & Price
                        </label>
                        <textarea
                            value={productSpecs}
                            onChange={(e) => setProductSpecs(e.target.value)}
                            placeholder="e.g. Price: Rs. 1,499. Battery: 30 hours. Waterproof IPX7. Free delivery in Kathmandu, Cash on delivery all Nepal."
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* 4. EXTRA NOTE / OFFER DETAILS (OPTIONAL) */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Extra Note / Offer Details (Optional)
                        </label>
                        <input
                            type="text"
                            value={extraNotes}
                            onChange={(e) => setExtraNotes(e.target.value)}
                            placeholder="e.g. Mention 20% Dashain festive discount and 1-year replacement warranty"
                            className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 outline-none transition-all"
                        />
                    </div>

                    {/* 5. POST TONE & STYLE AND AI ENGINE */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                Post Tone & Style
                            </label>
                            <select
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="High-Converting / Sales-Driven">🔥 High-Converting / Sales-Driven</option>
                                <option value="Nepali Friendly / E-commerce">🇳🇵 Nepali Friendly / E-commerce</option>
                                <option value="Modern & Minimalist">✨ Modern & Minimalist</option>
                                <option value="Limited Offer / Urgency">⚡ Limited Offer / Urgency</option>
                                <option value="Premium / Luxury Brand">💎 Premium / Luxury Brand</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                AI Engine
                            </label>
                            <select
                                value={engineChoice}
                                onChange={(e) => setEngineChoice(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="auto">⚙️ Active in Settings (Default)</option>
                                <option value="gemini:gemini-3.6-flash">✨ Gemini 3.6 Flash (Free Tier — Fast Vision)</option>
                                <option value="gemini:gemini-3.5-flash-lite">⚡ Gemini 3.5 Flash Lite (Free Tier — Ultra-Fast)</option>
                                <option value="gemini:gemini-3.7-flash">🧠 Gemini 3.7 Flash (Free Tier — Reasoning)</option>
                                <option value="gemini:gemini-flash-latest">🔄 Gemini Flash Latest (Free Tier)</option>
                                <option value="openai:gpt-4o-mini">OpenAI (gpt-4o-mini)</option>
                                <option value="openai:gpt-4o">OpenAI (gpt-4o)</option>
                            </select>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2 animate-in fade-in duration-150">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* 6. GENERATE POST CONTENT BUTTON */}
                    <div>
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                        >
                            {loading ? (
                                <>
                                    <RefreshCw size={17} className="animate-spin" />
                                    <span>AI is writing your post...</span>
                                </>
                            ) : (
                                <>
                                    <Wand2 size={17} />
                                    <span>{generatedCaption ? 'Regenerate Post Content' : 'Generate Post Content'}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* 7. GENERATED RESULT SECTION */}
                    {generatedCaption && (
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Check size={14} /> Generated Result
                                </span>
                                <button
                                    type="button"
                                    onClick={handleApply}
                                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                                >
                                    <span>Apply to Post</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>

                            {/* Caption Box */}
                            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 relative group">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Caption</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(generatedCaption, 'caption')}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold hover:underline"
                                    >
                                        {copiedCaption ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                        {copiedCaption ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium max-h-52 overflow-y-auto">
                                    {generatedCaption}
                                </p>
                            </div>

                            {/* Hashtags Box */}
                            {generatedHashtags && (
                                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Hashtags</span>
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(generatedHashtags, 'hashtags')}
                                            className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-semibold hover:underline"
                                        >
                                            {copiedHashtags ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                            {copiedHashtags ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono break-words leading-relaxed font-semibold">
                                        {generatedHashtags}
                                    </p>
                                </div>
                            )}

                            {/* Info note regarding image transfer */}
                            {productPhoto && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-2.5 flex items-center gap-2">
                                    <Check size={14} className="text-emerald-500 flex-shrink-0" />
                                    <span>Applying will also set this product photo in the <strong>Media</strong> section of your post.</span>
                                </div>
                            )}

                            {/* Full width apply button */}
                            <button
                                type="button"
                                onClick={handleApply}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                            >
                                <Check size={17} />
                                <span>Apply Caption, Hashtags & Photo to Post</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
