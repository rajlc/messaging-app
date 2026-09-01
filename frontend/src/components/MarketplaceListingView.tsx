"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
    Store, Upload, Download, Plus, Settings as SettingsIcon, FileSpreadsheet,
    CheckCircle2, Clock, Trash2, Eye, Edit3, X, Check, Copy, ChevronRight,
    MapPin, Tag, Sparkles, AlertCircle, Search, Filter, Layers, ExternalLink,
    CheckSquare, Square, RefreshCw, AlertTriangle, ShieldCheck, ArrowUpDown,
    Folder, Play, MonitorPlay, CheckCheck, Info,
    Package, Link2, Unlink
} from 'lucide-react';
import * as xlsx from 'xlsx';
import {
    fetchMarketplaceSettings,
    addMarketplaceProfile,
    updateMarketplaceProfile,
    deleteMarketplaceProfile,
    addMarketplaceCategory,
    deleteMarketplaceCategory,
    addMarketplaceLocation,
    deleteMarketplaceLocation,
    fetchMarketplaceProducts,
    saveMarketplaceProduct,
    deleteMarketplaceProduct,
    batchUpdateProductStatus,
    fetchImageFolderSetting,
    saveImageFolderSetting,
    searchInventoryProducts,
    fetchPendingInventoryProducts,
    MarketplaceProfile,
    MarketplaceCategory,
    MarketplaceLocation,
    ProductItem,
    ImageFolderSetting,
    InventoryProductRef
} from '@/lib/marketplace-supabase';

export default function MarketplaceListingView() {
    // Core Data State
    const [profiles, setProfiles] = useState<MarketplaceProfile[]>([
        { id: 'default', name: 'Default', last_description: '' }
    ]);
    const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
    const [locations, setLocations] = useState<MarketplaceLocation[]>([]);
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Image Folder Settings
    const [imageFolderSetting, setImageFolderSetting] = useState<ImageFolderSetting>({
        folder_path: 'C:\\Users\\Bagmati Traders\\Downloads\\Marketplace_Images',
        auto_clean: true
    });

    // Companion Connection Status
    const [companionOnline, setCompanionOnline] = useState<boolean | null>(null);

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProfileFilter, setSelectedProfileFilter] = useState('all');
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

    // Selection State
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

    // Modals
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showAddListModal, setShowAddListModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState<ProductItem | null>(null);
    const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
    const [deleteConfirmItem, setDeleteConfirmItem] = useState<ProductItem | null>(null);
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showMarketplaceAddModal, setShowMarketplaceAddModal] = useState(false);
    const [showBulkListingModal, setShowBulkListingModal] = useState(false);

    // Settings Modal active tab
    const [settingsTab, setSettingsTab] = useState<'profile' | 'category' | 'location' | 'imageFolder'>('profile');

    /* ─── Initial Load (Direct from Supabase) ─── */
    useEffect(() => {
        loadAllData();
        checkCompanion();
    }, []);

    const checkCompanion = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/status', { method: 'GET' });
            if (res.ok) {
                setCompanionOnline(true);
            } else {
                setCompanionOnline(false);
            }
        } catch {
            setCompanionOnline(false);
        }
    };

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [settings, prods, folderSet] = await Promise.all([
                fetchMarketplaceSettings(),
                fetchMarketplaceProducts(),
                fetchImageFolderSetting()
            ]);

            if (settings.profiles?.length) setProfiles(settings.profiles);
            if (settings.categories?.length) setCategories(settings.categories);
            if (settings.locations?.length) setLocations(settings.locations);
            if (Array.isArray(prods)) setProducts(prods);
            if (folderSet) setImageFolderSetting(folderSet);
        } catch (e) {
            console.error('Failed to load marketplace data:', e);
        } finally {
            setLoading(false);
        }
    };

    /* ─── Selection Helpers ─── */
    const filteredProducts = products.filter(p => {
        const matchesSearch = !searchQuery || 
            Object.values(p.profile_data || {}).some(pd => pd.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
            p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.location?.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = true;
        if (selectedStatusFilter !== 'all') {
            if (selectedProfileFilter !== 'all') {
                matchesStatus = (p.status_map?.[selectedProfileFilter] || 'pending') === selectedStatusFilter;
            } else {
                matchesStatus = Object.values(p.status_map || {}).some(st => st === selectedStatusFilter);
            }
        }

        return matchesSearch && matchesStatus;
    });

    const toggleSelectAll = () => {
        if (selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0) {
            setSelectedProductIds(new Set());
        } else {
            setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedProductIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedProductIds(next);
    };

    /* ─── Delete Product ─── */
    const handleDeleteProduct = async (id: string) => {
        try {
            await deleteMarketplaceProduct(id);
            setProducts(prev => prev.filter(p => p.id !== id));
            setSelectedProductIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            setDeleteConfirmItem(null);
        } catch (e) {
            console.error('Failed to delete product:', e);
        }
    };

    return (
        <div className="flex-1 h-screen overflow-y-auto bg-slate-50 dark:bg-slate-900 p-4 md:p-6 pb-24">
            <div className="max-w-7xl mx-auto space-y-5">
                {/* ─── 1. TOP HEADER ─── */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
                            <Store size={26} />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
                                Marketplace Listing Products
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                                    {products.length} Products
                                </span>
                            </h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Manage, customize, export, and automate product listings for Facebook Marketplace
                                </p>
                                <span 
                                    onClick={checkCompanion}
                                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full cursor-pointer transition-colors ${
                                        companionOnline === true
                                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200'
                                            : companionOnline === false
                                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200'
                                            : 'bg-slate-100 text-slate-500'
                                    }`}
                                    title="Click to recheck local automation companion status"
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${companionOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                    {companionOnline ? 'Helper Online (3000)' : 'Helper Offline'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Header Action Buttons: Bulk Listing, Import, Export, Add List, Settings */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Direct Bulk Listing Button */}
                        <button
                            onClick={() => {
                                if (selectedProductIds.size === 0) {
                                    alert('Please select at least one product using the checkboxes below to launch bulk listing.');
                                    return;
                                }
                                setShowBulkListingModal(true);
                            }}
                            className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-bold transition-all border-none cursor-pointer active:scale-95 shadow-sm ${
                                selectedProductIds.size > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 ring-2 ring-emerald-500/30'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 hover:bg-emerald-100'
                            }`}
                            title="Directly launch selected products to Facebook Marketplace"
                        >
                            <Play size={14} className="fill-current" />
                            <span>Bulk Listing {selectedProductIds.size > 0 ? `(${selectedProductIds.size})` : ''}</span>
                        </button>

                        {/* Import Button */}
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-none cursor-pointer active:scale-95"
                            title="Import listings from Excel"
                        >
                            <Upload size={14} /> Import
                        </button>

                        {/* Export Button */}
                        <button
                            onClick={() => setShowExportModal(true)}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-none cursor-pointer active:scale-95"
                            title="Export listings to Excel"
                        >
                            <Download size={14} /> Export
                        </button>

                        {/* Add List Button */}
                        <button
                            onClick={() => {
                                setEditingProduct(null);
                                setShowAddListModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all border-none cursor-pointer active:scale-95"
                        >
                            <Plus size={16} /> Add List
                        </button>

                        {/* Settings Button */}
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-800/80 transition-all cursor-pointer active:scale-95"
                            title="Marketplace Settings (Profiles, Categories, Locations, Image Folder)"
                        >
                            <SettingsIcon size={14} /> Settings
                        </button>
                    </div>
                </div>

                {/* ─── 2. FILTER & SEARCH BAR ─── */}
                <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by product title, category, city..."
                                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Profile filter dropdown */}
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            <span>Profile:</span>
                            <select
                                value={selectedProfileFilter}
                                onChange={(e) => setSelectedProfileFilter(e.target.value)}
                                className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                            >
                                <option value="all">All Profiles</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status filter dropdown */}
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                            <span>Status:</span>
                            <select
                                value={selectedStatusFilter}
                                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                                className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                            >
                                <option value="all">All Status</option>
                                <option value="completed">Complete (Tick)</option>
                                <option value="pending">Pending (Red Dot)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ─── 3. MODERN LIST VIEW / TABLE ─── */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                    {loading ? (
                        <div className="py-20 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                            <RefreshCw size={18} className="animate-spin text-indigo-600" />
                            Loading marketplace listing products...
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="py-20 px-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50 shadow-inner">
                                <Store size={28} />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                {searchQuery ? `No products match "${searchQuery}"` : 'No marketplace products yet'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                                Click <strong>Add List</strong> to create your first product or use <strong>Import</strong> to upload products from Excel spreadsheet.
                            </p>
                            <div className="mt-5 flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setShowAddListModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95 transition-all border-none cursor-pointer"
                                >
                                    <Plus size={14} /> Add Product Now
                                </button>
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all border-none cursor-pointer"
                                >
                                    <Upload size={14} /> Import From Excel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        <th className="p-3.5 w-10 text-center">
                                            <button onClick={toggleSelectAll} className="cursor-pointer border-none bg-transparent text-slate-500">
                                                {selectedProductIds.size === filteredProducts.length && filteredProducts.length > 0 ? (
                                                    <CheckSquare size={16} className="text-indigo-600" />
                                                ) : (
                                                    <Square size={16} />
                                                )}
                                            </button>
                                        </th>
                                        <th className="p-3.5 w-16 text-center">Images</th>
                                        <th className="p-3.5 min-w-[220px]">Product Name (By Profile)</th>
                                        <th className="p-3.5 min-w-[140px]">Price</th>
                                        <th className="p-3.5 min-w-[150px]">Category & Location</th>
                                        <th className="p-3.5 min-w-[170px]">Status (By Profile)</th>
                                        <th className="p-3.5 w-32 text-right pr-5">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-xs">
                                    {filteredProducts.map(product => {
                                        const isSelected = selectedProductIds.has(product.id);
                                        return (
                                            <tr
                                                key={product.id}
                                                className={`hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors ${
                                                    isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                                }`}
                                            >
                                                {/* Selection Checkbox */}
                                                <td className="p-3.5 text-center">
                                                    <button onClick={() => toggleSelect(product.id)} className="cursor-pointer border-none bg-transparent text-slate-500">
                                                        {isSelected ? (
                                                            <CheckSquare size={16} className="text-indigo-600" />
                                                        ) : (
                                                            <Square size={16} />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* Image Thumbnail */}
                                                <td className="p-3.5 text-center">
                                                    <div 
                                                        onClick={() => setShowViewModal(product)}
                                                        className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 dark:border-slate-700 relative cursor-pointer group shadow-2xs mx-auto"
                                                        title="Click to view all images"
                                                    >
                                                        {product.images?.[0] ? (
                                                            <img src={product.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                                                No img
                                                            </div>
                                                        )}
                                                        {product.images && product.images.length > 1 && (
                                                            <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[9px] font-bold px-1 rounded-tl">
                                                                +{product.images.length - 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Column 1: Product Name in different profiles */}
                                                <td className="p-3.5">
                                                    <div className="space-y-1.5">
                                                        {product.inventory_id && (
                                                            <div className="mb-1">
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60" title={`Linked to Inventory #${product.inventory_id}`}>
                                                                    <Package size={10} /> #{product.inventory_id}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {profiles.map(prof => {
                                                            const pData = product.profile_data?.[prof.name] || {};
                                                            return (
                                                                <div key={prof.id} className="flex items-start gap-1.5 leading-snug">
                                                                    <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                                                                        {prof.name}:
                                                                    </span>
                                                                    <span className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1" title={pData.title || 'Untitled'}>
                                                                        {pData.title || <span className="text-slate-400 italic">Untitled</span>}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>

                                                {/* Column 2: Price in different profiles */}
                                                <td className="p-3.5">
                                                    <div className="space-y-1.5">
                                                        {profiles.map(prof => {
                                                            const pData = product.profile_data?.[prof.name] || {};
                                                            return (
                                                                <div key={prof.id} className="flex items-center gap-1.5 leading-snug">
                                                                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                                                        {prof.name}:
                                                                    </span>
                                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                                        Rs. {pData.price || 0}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>

                                                {/* Column 3: Category (top row) & Location (below category in same column) */}
                                                <td className="p-3.5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md w-fit">
                                                            <Tag size={10} /> {product.category || 'General'}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                                            <MapPin size={11} className="text-red-500" /> {product.location || 'Kathmandu'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Column 4: Status (Complete tick vs Pending red dot per profile) */}
                                                <td className="p-3.5">
                                                    <div className="space-y-1.5">
                                                        {profiles.map(prof => {
                                                            const isComplete = product.status_map?.[prof.name] === 'completed';
                                                            return (
                                                                <div key={prof.id} className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-slate-400 font-medium w-14 truncate">
                                                                        {prof.name}:
                                                                    </span>
                                                                    {isComplete ? (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                                                                            <CheckCircle2 size={11} className="text-emerald-600" /> Complete
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
                                                                            <span className="w-2 h-2 rounded-full bg-red-500" /> Pending
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>

                                                {/* Column 5: Action buttons: View, Edit, Delete */}
                                                <td className="p-3.5 text-right pr-5">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => setShowViewModal(product)}
                                                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border-none bg-transparent cursor-pointer"
                                                            title="View product details"
                                                        >
                                                            <Eye size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingProduct(product);
                                                                setShowAddListModal(true);
                                                            }}
                                                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border-none bg-transparent cursor-pointer"
                                                            title="Edit product"
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteConfirmItem(product)}
                                                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all border-none bg-transparent cursor-pointer"
                                                            title="Delete product"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── 4. FLOATING BOTTOM BAR: "MARKETPLACE ADD" & "BULK LISTING" ─── */}
            {selectedProductIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {selectedProductIds.size}
                        </span>
                        <span>selected</span>
                    </div>

                    <div className="h-4 w-px bg-slate-700" />

                    {/* Direct Launch Bulk Listing Button */}
                    <button
                        onClick={() => setShowBulkListingModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-md shadow-emerald-600/30 border-none cursor-pointer"
                    >
                        <Play size={13} className="fill-white" /> Launch Bulk Listing
                    </button>

                    {/* Button Name: "Marketplace Add" (Status Mark) */}
                    <button
                        onClick={() => setShowMarketplaceAddModal(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white transition-all shadow-md shadow-indigo-600/30 border-none cursor-pointer"
                    >
                        <CheckCircle2 size={13} /> Mark Complete
                    </button>

                    <button
                        onClick={() => setSelectedProductIds(new Set())}
                        className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* ─── 5. SETTINGS MODAL (TWO-COLUMN POPUP) ─── */}
            {showSettingsModal && (
                <SettingsModal
                    profiles={profiles}
                    categories={categories}
                    locations={locations}
                    imageFolderSetting={imageFolderSetting}
                    activeTab={settingsTab}
                    setActiveTab={setSettingsTab}
                    onProfilesChanged={(updated) => setProfiles(updated)}
                    onCategoriesChanged={(updated) => setCategories(updated)}
                    onLocationsChanged={(updated) => setLocations(updated)}
                    onImageFolderChanged={(updated) => setImageFolderSetting(updated)}
                    onClose={() => setShowSettingsModal(false)}
                />
            )}

            {/* ─── 6. ADD / EDIT LIST FORM MODAL ─── */}
            {showAddListModal && (
                <AddListModal
                    product={editingProduct}
                    profiles={profiles}
                    categories={categories}
                    locations={locations}
                    onSave={async (savedItem) => {
                        setProducts(prev => {
                            const idx = prev.findIndex(p => p.id === savedItem.id);
                            if (idx >= 0) {
                                const copy = [...prev];
                                copy[idx] = savedItem;
                                return copy;
                            }
                            return [savedItem, ...prev];
                        });
                        setShowAddListModal(false);
                    }}
                    onClose={() => {
                        setShowAddListModal(false);
                        setEditingProduct(null);
                    }}
                />
            )}

            {/* ─── 7. VIEW MODAL ─── */}
            {showViewModal && (
                <ViewProductModal
                    product={showViewModal}
                    profiles={profiles}
                    onClose={() => setShowViewModal(null)}
                />
            )}

            {/* ─── 8. DELETE CONFIRMATION POPUP ─── */}
            {deleteConfirmItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                    Confirm Deletion
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            Are you sure you want to permanently delete this marketplace product from your database?
                        </p>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                onClick={() => setDeleteConfirmItem(null)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-none bg-transparent cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteProduct(deleteConfirmItem.id)}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-md shadow-red-500/20 transition-all border-none cursor-pointer"
                            >
                                Yes, Delete Product
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── 9. MARKETPLACE ADD STATUS MODAL ─── */}
            {showMarketplaceAddModal && (
                <MarketplaceAddModal
                    profiles={profiles}
                    selectedCount={selectedProductIds.size}
                    onConfirm={async (targetProfile) => {
                        try {
                            await batchUpdateProductStatus(
                                Array.from(selectedProductIds),
                                targetProfile,
                                'completed',
                                profiles
                            );

                            // Update local state
                            setProducts(prev => prev.map(p => {
                                if (selectedProductIds.has(p.id)) {
                                    const nextMap = { ...p.status_map };
                                    if (targetProfile === 'all') {
                                        profiles.forEach(prof => { nextMap[prof.name] = 'completed'; });
                                    } else {
                                        nextMap[targetProfile] = 'completed';
                                    }
                                    return { ...p, status_map: nextMap };
                                }
                                return p;
                            }));
                            setSelectedProductIds(new Set());
                            setShowMarketplaceAddModal(false);
                        } catch (e) {
                            console.error('Batch status update error:', e);
                        }
                    }}
                    onClose={() => setShowMarketplaceAddModal(false)}
                />
            )}

            {/* ─── 10. LAUNCH BULK LISTING MODAL ─── */}
            {showBulkListingModal && (
                <LaunchBulkListingModal
                    selectedProducts={products.filter(p => selectedProductIds.has(p.id))}
                    profiles={profiles}
                    imageFolderSetting={imageFolderSetting}
                    companionOnline={companionOnline}
                    onLaunched={async (targetProfile) => {
                        // Mark selected products as completed
                        await batchUpdateProductStatus(
                            Array.from(selectedProductIds),
                            targetProfile,
                            'completed',
                            profiles
                        );
                        setProducts(prev => prev.map(p => {
                            if (selectedProductIds.has(p.id)) {
                                const nextMap = { ...p.status_map };
                                if (targetProfile === 'all') {
                                    profiles.forEach(prof => { nextMap[prof.name] = 'completed'; });
                                } else {
                                    nextMap[targetProfile] = 'completed';
                                }
                                return { ...p, status_map: nextMap };
                            }
                            return p;
                        }));
                        setSelectedProductIds(new Set());
                        setShowBulkListingModal(false);
                    }}
                    onClose={() => setShowBulkListingModal(false)}
                />
            )}

            {/* ─── 11. EXPORT MODAL ─── */}
            {showExportModal && (
                <ExportModal
                    profiles={profiles}
                    products={products}
                    onClose={() => setShowExportModal(false)}
                />
            )}

            {/* ─── 12. IMPORT MODAL ─── */}
            {showImportModal && (
                <ImportModal
                    profiles={profiles}
                    categories={categories}
                    locations={locations}
                    onSuccess={() => {
                        setShowImportModal(false);
                        loadAllData();
                    }}
                    onClose={() => setShowImportModal(false)}
                />
            )}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SETTINGS MODAL (Two-Column Layout: Left Sidebar + Right Details)
   Includes "Image Folder" Tab
   ───────────────────────────────────────────────────────────────────────────── */
function SettingsModal({
    profiles,
    categories,
    locations,
    imageFolderSetting,
    activeTab,
    setActiveTab,
    onProfilesChanged,
    onCategoriesChanged,
    onLocationsChanged,
    onImageFolderChanged,
    onClose
}: {
    profiles: MarketplaceProfile[];
    categories: MarketplaceCategory[];
    locations: MarketplaceLocation[];
    imageFolderSetting: ImageFolderSetting;
    activeTab: 'profile' | 'category' | 'location' | 'imageFolder';
    setActiveTab: (tab: 'profile' | 'category' | 'location' | 'imageFolder') => void;
    onProfilesChanged: (profiles: MarketplaceProfile[]) => void;
    onCategoriesChanged: (cats: MarketplaceCategory[]) => void;
    onLocationsChanged: (locs: MarketplaceLocation[]) => void;
    onImageFolderChanged: (setting: ImageFolderSetting) => void;
    onClose: () => void;
}) {
    const [localProfiles, setLocalProfiles] = useState<MarketplaceProfile[]>(profiles);
    const [localCategories, setLocalCategories] = useState<MarketplaceCategory[]>(categories);
    const [localLocations, setLocalLocations] = useState<MarketplaceLocation[]>(locations);

    // Image folder local state
    const [folderPath, setFolderPath] = useState(imageFolderSetting.folder_path || 'C:\\Users\\Bagmati Traders\\Downloads\\Marketplace_Images');
    const [autoClean, setAutoClean] = useState(imageFolderSetting.auto_clean ?? true);

    const [newProfileName, setNewProfileName] = useState('');
    const [showAddProfileInput, setShowAddProfileInput] = useState(false);

    const [newCategoryName, setNewCategoryName] = useState('');
    const [newLocationName, setNewLocationName] = useState('');

    const [saving, setSaving] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

    const triggerSaveFeedback = (msg: string) => {
        setSaveSuccessMsg(msg);
        setTimeout(() => setSaveSuccessMsg(''), 2500);
    };

    // Profiles Actions - Direct to Supabase
    const handleAddProfile = async () => {
        if (!newProfileName.trim()) return;
        const name = newProfileName.trim();
        if (localProfiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert('A profile with this name already exists.');
            return;
        }

        setSaving(true);
        try {
            const added = await addMarketplaceProfile(name, '');
            if (added) {
                const updated = [...localProfiles, added];
                setLocalProfiles(updated);
                onProfilesChanged(updated);
                setNewProfileName('');
                setShowAddProfileInput(false);
                triggerSaveFeedback(`Profile "${name}" added to database!`);
            }
        } catch (e: any) {
            alert(`Error adding profile: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateProfile = async (id: string, name: string, last_description: string) => {
        setSaving(true);
        try {
            await updateMarketplaceProfile(id, name, last_description);
            const updated = localProfiles.map(p => p.id === id ? { ...p, name, last_description } : p);
            setLocalProfiles(updated);
            onProfilesChanged(updated);
            triggerSaveFeedback('Saved changes to database!');
        } catch (e: any) {
            alert(`Error saving profile: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProfile = async (id: string) => {
        if (localProfiles.length <= 1) {
            alert('You must keep at least one profile.');
            return;
        }
        if (!confirm('Are you sure you want to delete this profile from database?')) return;
        setSaving(true);
        try {
            await deleteMarketplaceProfile(id);
            const updated = localProfiles.filter(p => p.id !== id);
            setLocalProfiles(updated);
            onProfilesChanged(updated);
            triggerSaveFeedback('Profile deleted from database.');
        } catch (e: any) {
            alert(`Error deleting profile: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Categories Actions - Direct to Supabase
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const name = newCategoryName.trim();
        if (localCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            alert('This category already exists.');
            return;
        }
        setSaving(true);
        try {
            const added = await addMarketplaceCategory(name);
            if (added) {
                const updated = [...localCategories, added];
                setLocalCategories(updated);
                onCategoriesChanged(updated);
                setNewCategoryName('');
                triggerSaveFeedback(`Category "${name}" saved!`);
            }
        } catch (e: any) {
            alert(`Error saving category: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        setSaving(true);
        try {
            await deleteMarketplaceCategory(id);
            const updated = localCategories.filter(c => c.id !== id);
            setLocalCategories(updated);
            onCategoriesChanged(updated);
        } catch (e: any) {
            alert(`Error deleting category: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Locations Actions - Direct to Supabase
    const handleAddLocation = async () => {
        if (!newLocationName.trim()) return;
        const name = newLocationName.trim();
        if (localLocations.some(l => l.name.toLowerCase() === name.toLowerCase())) {
            alert('This location already exists.');
            return;
        }
        setSaving(true);
        try {
            const added = await addMarketplaceLocation(name);
            if (added) {
                const updated = [...localLocations, added];
                setLocalLocations(updated);
                onLocationsChanged(updated);
                setNewLocationName('');
                triggerSaveFeedback(`Location "${name}" saved!`);
            }
        } catch (e: any) {
            alert(`Error saving location: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLocation = async (id: string) => {
        setSaving(true);
        try {
            await deleteMarketplaceLocation(id);
            const updated = localLocations.filter(l => l.id !== id);
            setLocalLocations(updated);
            onLocationsChanged(updated);
        } catch (e: any) {
            alert(`Error deleting location: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Image Folder Action - Direct to Supabase
    const handleSaveImageFolder = async () => {
        if (!folderPath.trim()) return;
        setSaving(true);
        try {
            const setting: ImageFolderSetting = {
                folder_path: folderPath.trim(),
                auto_clean: autoClean
            };
            await saveImageFolderSetting(setting);
            onImageFolderChanged(setting);
            triggerSaveFeedback('Image folder configuration saved!');
        } catch (e: any) {
            alert(`Error saving image folder: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full h-[640px] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <SettingsIcon size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                Marketplace Settings
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Configure profiles, last descriptions, categories, delivery locations, and image download folder
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {saveSuccessMsg && (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                                <Check size={14} /> {saveSuccessMsg}
                            </span>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-none bg-transparent cursor-pointer">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Two-Column Body: Left Sidebar + Right Content */}
                <div className="flex-1 flex min-h-0 overflow-hidden">
                    {/* LEFT SIDEBAR */}
                    <div className="w-56 border-r border-slate-100 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-850 p-3 space-y-1.5 flex-shrink-0">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border-none cursor-pointer ${
                                activeTab === 'profile'
                                    ? 'bg-white dark:bg-slate-750 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Store size={15} /> Marketplace Profile
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600">
                                {localProfiles.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('category')}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border-none cursor-pointer ${
                                activeTab === 'category'
                                    ? 'bg-white dark:bg-slate-750 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Tag size={15} /> Category
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {localCategories.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('location')}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border-none cursor-pointer ${
                                activeTab === 'location'
                                    ? 'bg-white dark:bg-slate-750 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <MapPin size={15} /> Location
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {localLocations.length}
                            </span>
                        </button>

                        {/* 4th Tab: Image Folder */}
                        <button
                            onClick={() => setActiveTab('imageFolder')}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border-none cursor-pointer ${
                                activeTab === 'imageFolder'
                                    ? 'bg-white dark:bg-slate-750 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <Folder size={15} /> Image Folder
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                                Active
                            </span>
                        </button>
                    </div>

                    {/* RIGHT CONTENT AREA */}
                    <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-800">
                        {/* TAB 1: MARKETPLACE PROFILE */}
                        {activeTab === 'profile' && (
                            <div className="space-y-6 max-w-2xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                            Marketplace Profiles & Last Descriptions
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            Manage your profile accounts. The "Last Description" will automatically be appended at the end of each listing description.
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setShowAddProfileInput(true)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm transition-all border-none cursor-pointer"
                                    >
                                        <Plus size={14} /> Add Profile
                                    </button>
                                </div>

                                {/* Add New Profile Box */}
                                {showAddProfileInput && (
                                    <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3 animate-in fade-in">
                                        <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                            Enter New Marketplace Profile Name
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={newProfileName}
                                                onChange={(e) => setNewProfileName(e.target.value)}
                                                placeholder="e.g. Bagmati 1, Profile 2..."
                                                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
                                                autoFocus
                                            />
                                            <button
                                                disabled={saving}
                                                onClick={handleAddProfile}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer disabled:opacity-50"
                                            >
                                                {saving ? 'Saving...' : 'Save Profile'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowAddProfileInput(false);
                                                    setNewProfileName('');
                                                }}
                                                className="px-3 py-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border-none cursor-pointer"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Profile Cards List */}
                                <div className="space-y-4">
                                    {localProfiles.map((prof) => (
                                        <ProfileCardEditor
                                            key={prof.id}
                                            profile={prof}
                                            canDelete={localProfiles.length > 1}
                                            onSave={(name, last_desc) => handleUpdateProfile(prof.id, name, last_desc)}
                                            onDelete={() => handleDeleteProfile(prof.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: CATEGORY */}
                        {activeTab === 'category' && (
                            <div className="space-y-5 max-w-2xl">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        Marketplace Categories
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Categories available in the product listing dropdown
                                    </p>
                                </div>

                                {/* Add Category */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="Add new category (e.g. Watches, Shoes, Cosmetics)..."
                                        className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
                                    />
                                    <button
                                        disabled={saving}
                                        onClick={handleAddCategory}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer shrink-0 disabled:opacity-50"
                                    >
                                        <Plus size={14} className="inline mr-1" /> Add Category
                                    </button>
                                </div>

                                {/* Category List */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                                    {localCategories.map(cat => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                                                {cat.name}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteCategory(cat.id)}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                                                title="Delete category"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: LOCATION */}
                        {activeTab === 'location' && (
                            <div className="space-y-5 max-w-2xl">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                        Marketplace Locations
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Default initial location is <strong>Kathmandu</strong>. You can add other target cities/areas below.
                                    </p>
                                </div>

                                {/* Add Location */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newLocationName}
                                        onChange={(e) => setNewLocationName(e.target.value)}
                                        placeholder="Add new location (e.g. Lalitpur, Butwal, Dharan)..."
                                        className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
                                    />
                                    <button
                                        disabled={saving}
                                        onClick={handleAddLocation}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold border-none cursor-pointer shrink-0 disabled:opacity-50"
                                    >
                                        <Plus size={14} className="inline mr-1" /> Add Location
                                    </button>
                                </div>

                                {/* Location List */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                                    {localLocations.map(loc => (
                                        <div key={loc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                                <MapPin size={12} className="text-red-500" /> {loc.name}
                                                {loc.name.toLowerCase() === 'kathmandu' && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">Default</span>
                                                )}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteLocation(loc.id)}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                                                title="Delete location"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: IMAGE FOLDER (NEW!) */}
                        {activeTab === 'imageFolder' && (
                            <div className="space-y-6 max-w-2xl">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <Folder size={17} className="text-indigo-600" /> Image Download Folder Settings
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                        When you launch listings from the webapp, images will be downloaded into this folder in <strong>100% full original quality</strong> before being uploaded to Facebook Marketplace.
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
                                    {/* Folder Path Field */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                            Local Computer Folder Path:
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={folderPath}
                                                onChange={(e) => setFolderPath(e.target.value)}
                                                placeholder="e.g. C:\Users\Bagmati Traders\Downloads\Marketplace_Images"
                                                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono focus:outline-hidden focus:border-indigo-500"
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            You can specify any local folder on your computer. If the folder does not exist, the helper will create it automatically.
                                        </p>
                                    </div>

                                    {/* Retention / Auto-Clean Options */}
                                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                                            Temporary File Clean-up Mode:
                                        </label>

                                        <label
                                            onClick={() => setAutoClean(true)}
                                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                                autoClean
                                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <input type="radio" checked={autoClean} onChange={() => setAutoClean(true)} className="mt-0.5" />
                                            <div>
                                                <strong className="block font-semibold">Auto-delete temporary images after upload (Recommended)</strong>
                                                <span className="text-[11px] text-slate-400">
                                                    Keeps your storage clean by automatically removing downloaded images once they are uploaded to Facebook.
                                                </span>
                                            </div>
                                        </label>

                                        <label
                                            onClick={() => setAutoClean(false)}
                                            className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                                !autoClean
                                                    ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <input type="radio" checked={!autoClean} onChange={() => setAutoClean(false)} className="mt-0.5" />
                                            <div>
                                                <strong className="block font-semibold">Keep downloaded images in folder</strong>
                                                <span className="text-[11px] text-slate-400">
                                                    Retains all downloaded images in this directory so you have a local photo archive on your computer.
                                                </span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        disabled={saving}
                                        onClick={handleSaveImageFolder}
                                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                                    >
                                        {saving ? 'Saving...' : 'Save Folder Settings'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileCardEditor({
    profile,
    canDelete,
    onSave,
    onDelete
}: {
    profile: MarketplaceProfile;
    canDelete: boolean;
    onSave: (name: string, lastDesc: string) => void;
    onDelete: () => void;
}) {
    const [name, setName] = useState(profile.name);
    const [lastDesc, setLastDesc] = useState(profile.last_description || '');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setName(profile.name);
        setLastDesc(profile.last_description || '');
        setIsDirty(false);
    }, [profile]);

    return (
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                    <label className="text-[11px] font-bold uppercase text-slate-400">Profile Name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setIsDirty(true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 max-w-xs focus:outline-hidden"
                    />
                </div>

                <div className="flex items-center gap-1.5">
                    {canDelete && (
                        <button
                            onClick={onDelete}
                            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                            title="Delete profile"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Field Name: "Last Description" */}
            <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Last Description ({name}):
                </label>
                <textarea
                    rows={2}
                    value={lastDesc}
                    onChange={(e) => {
                        setLastDesc(e.target.value);
                        setIsDirty(true);
                    }}
                    placeholder="Enter closing text for this marketplace profile (e.g. Contact: 9800000000 | Location: Bagmati Traders, Kathmandu | Free home delivery)..."
                    className="w-full p-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                />
            </div>

            <div className="flex justify-end">
                <button
                    disabled={!isDirty}
                    onClick={() => {
                        onSave(name, lastDesc);
                        setIsDirty(false);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all border-none cursor-pointer shadow-xs"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADD LIST / EDIT LIST MODAL (Directly saves to Supabase marketplace_products)
   ───────────────────────────────────────────────────────────────────────────── */
function AddListModal({
    product,
    profiles,
    categories,
    locations,
    onSave,
    onClose
}: {
    product: ProductItem | null;
    profiles: MarketplaceProfile[];
    categories: MarketplaceCategory[];
    locations: MarketplaceLocation[];
    onSave: (product: ProductItem) => Promise<void>;
    onClose: () => void;
}) {
    // Dynamic Product Name & Price per Profile
    const [profileRows, setProfileRows] = useState<Record<string, { title: string; price: string | number }>>(() => {
        const initial: Record<string, { title: string; price: string | number }> = {};
        for (const p of profiles) {
            const existing = product?.profile_data?.[p.name];
            initial[p.name] = {
                title: existing?.title || '',
                price: existing?.price ?? ''
            };
        }
        return initial;
    });

    // Image URLs (minimum 2)
    const [imageUrls, setImageUrls] = useState<string[]>(() => {
        if (product?.images && product.images.length >= 2) return product.images;
        if (product?.images && product.images.length === 1) return [product.images[0], ''];
        return ['', ''];
    });

    // Description, Category, Condition (New), Location (Kathmandu default)
    const [baseDescription, setBaseDescription] = useState(product?.description || '');
    const [category, setCategory] = useState(product?.category || categories[0]?.name || 'Electronics');
    const [condition] = useState('New'); // Always 'New'
    const [location, setLocation] = useState(product?.location || 'Kathmandu');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Inventory Link States
    const [inventoryId, setInventoryId] = useState<string | null>(product?.inventory_id || null);
    const [selectedInventoryProduct, setSelectedInventoryProduct] = useState<InventoryProductRef | null>(null);
    const [invSearchQuery, setInvSearchQuery] = useState('');
    const [invSearchResults, setInvSearchResults] = useState<InventoryProductRef[]>([]);
    const [isSearchingInv, setIsSearchingInv] = useState(false);
    const [showInvDropdown, setShowInvDropdown] = useState(false);

    useEffect(() => {
        if (!invSearchQuery.trim() || invSearchQuery.trim().length < 2) {
            setInvSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearchingInv(true);
            const results = await searchInventoryProducts(invSearchQuery);
            setInvSearchResults(results);
            setIsSearchingInv(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [invSearchQuery]);

    const handleSelectInventoryProduct = (invProd: InventoryProductRef) => {
        setSelectedInventoryProduct(invProd);
        const refId = String(invProd.product_id || invProd.id);
        setInventoryId(refId);
        setShowInvDropdown(false);
        setInvSearchQuery('');

        // Pre-fill profile rows with product name and price
        setProfileRows(prev => {
            const next = { ...prev };
            for (const p of profiles) {
                next[p.name] = {
                    title: invProd.product_name || '',
                    price: invProd.special_price || invProd.regular_price || ''
                };
            }
            return next;
        });

        // Pre-fill category
        if (invProd.marketplace_category) {
            setCategory(invProd.marketplace_category);
        } else if (invProd.category_name) {
            const matched = categories.find(c => c.name.toLowerCase() === invProd.category_name?.toLowerCase());
            if (matched) setCategory(matched.name);
        }

        // Pre-fill images
        const imgs: string[] = [];
        if (invProd.image_url) imgs.push(invProd.image_url);
        if (Array.isArray(invProd.other_images)) {
            imgs.push(...invProd.other_images.filter(Boolean));
        }
        if (imgs.length >= 2) {
            setImageUrls(imgs);
        } else if (imgs.length === 1) {
            setImageUrls([imgs[0], '']);
        }

        // Pre-fill description
        if (invProd.description) {
            const cleanDesc = invProd.description.replace(/<[^>]*>?/gm, '').trim();
            if (cleanDesc) setBaseDescription(cleanDesc);
        }
    };

    // "Copy Above" logic: copy title & price from the profile above it
    const handleCopyAbove = (currentIndex: number) => {
        if (currentIndex === 0) return;
        const prevProfile = profiles[currentIndex - 1];
        const currentProfile = profiles[currentIndex];
        const prevData = profileRows[prevProfile.name];

        if (prevData) {
            setProfileRows(prev => ({
                ...prev,
                [currentProfile.name]: {
                    title: prevData.title,
                    price: prevData.price
                }
            }));
        }
    };

    const handleAddImageField = () => {
        setImageUrls(prev => [...prev, '']);
    };

    const handleRemoveImageField = (idx: number) => {
        if (imageUrls.length <= 2) {
            alert('A minimum of 2 images is required.');
            return;
        }
        setImageUrls(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate images (minimum 2 non-empty)
        const cleanImages = imageUrls.map(u => u.trim()).filter(Boolean);
        if (cleanImages.length < 2) {
            setError('Please provide at least 2 image URLs (Image 1 and Image 2 are required).');
            return;
        }

        // Validate that at least first profile title is present
        const firstProfileName = profiles[0]?.name || 'Default';
        if (!profileRows[firstProfileName]?.title?.trim()) {
            setError(`Please enter a Product Name for ${firstProfileName}.`);
            return;
        }

        setSaving(true);
        try {
            // Build profile_data with final_description (base + last_description)
            const profileData: Record<string, any> = {};
            const statusMap: Record<string, 'pending' | 'completed'> = product?.status_map || {};

            for (const p of profiles) {
                const row = profileRows[p.name] || { title: profileRows[firstProfileName].title, price: profileRows[firstProfileName].price };
                const lastDesc = (p.last_description || '').trim();
                const finalDesc = [baseDescription.trim(), lastDesc].filter(Boolean).join('\n\n');

                profileData[p.name] = {
                    title: row.title.trim() || profileRows[firstProfileName].title.trim(),
                    price: Number(row.price) || 0,
                    final_description: finalDesc,
                };

                if (!statusMap[p.name]) {
                    statusMap[p.name] = 'pending';
                }
            }

            const payload: any = {
                id: product?.id,
                inventory_id: inventoryId,
                description: baseDescription.trim(),
                category,
                condition: 'New',
                location,
                images: cleanImages,
                profile_data: profileData,
                status_map: statusMap,
            };

            const savedItem = await saveMarketplaceProduct(payload);
            await onSave(savedItem);
        } catch (err: any) {
            setError(err.message || 'Failed to save');
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Plus size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                {product ? 'Edit Marketplace List' : 'Add Marketplace List'}
                            </h2>
                            <p className="text-[11px] text-slate-400">
                                Fill product details for all active marketplace profiles
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-none bg-transparent cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-300 flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Section 0: Link to Inventory Product */}
                    <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                                <Package size={14} /> Link to Inventory Product (Optional)
                            </label>
                            {inventoryId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setInventoryId(null);
                                        setSelectedInventoryProduct(null);
                                    }}
                                    className="text-[11px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 border-none bg-transparent cursor-pointer transition-colors"
                                >
                                    <Unlink size={12} /> Unlink
                                </button>
                            )}
                        </div>

                        {inventoryId ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 shadow-xs">
                                <div className="flex items-center gap-2.5 overflow-hidden">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono shrink-0">
                                        #{inventoryId}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {selectedInventoryProduct?.product_name || product?.profile_data?.[profiles[0]?.name]?.title || 'Linked Inventory Item'}
                                    </span>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 ml-2">
                                    <CheckCircle2 size={13} /> Active Link
                                </span>
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={invSearchQuery}
                                        onFocus={() => setShowInvDropdown(true)}
                                        onChange={(e) => {
                                            setInvSearchQuery(e.target.value);
                                            setShowInvDropdown(true);
                                        }}
                                        placeholder="Search inventory products by name or #ID to auto-fill details..."
                                        className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                                    />
                                    {isSearchingInv && (
                                        <RefreshCw size={13} className="animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                                    )}
                                </div>

                                {/* Dropdown results */}
                                {showInvDropdown && invSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 divide-y divide-slate-100 dark:divide-slate-700/60">
                                        {invSearchResults.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleSelectInventoryProduct(item)}
                                                className="p-2.5 flex items-center justify-between gap-3 hover:bg-indigo-50/60 dark:hover:bg-slate-700/60 cursor-pointer transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5 overflow-hidden">
                                                    {item.image_url ? (
                                                        <img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                            <Package size={14} className="text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="truncate">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                            {item.product_name}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-mono">
                                                            #{item.product_id} • {item.category_name || item.marketplace_category || 'General'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                                    Rs. {item.special_price || item.regular_price || 0}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 1: Product Name & Price per Profile */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                            Product Name & Price (Marketplace Profiles)
                        </label>

                        <div className="space-y-3">
                            {profiles.map((prof, idx) => {
                                const row = profileRows[prof.name] || { title: '', price: '' };
                                return (
                                    <div 
                                        key={prof.id} 
                                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                                <Store size={13} /> {prof.name} Profile
                                            </span>

                                            {idx > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyAbove(idx)}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline border-none bg-transparent cursor-pointer"
                                                    title={`Copy from ${profiles[idx - 1].name}`}
                                                >
                                                    <Copy size={12} /> Copy Above
                                                </button>
                                            )}
                                        </div>

                                        {/* Product Name & Price in Same Row */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="sm:col-span-2 space-y-1">
                                                <label className="text-[11px] font-medium text-slate-500">
                                                    Product Name ({prof.name}) <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    required={idx === 0}
                                                    value={row.title}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setProfileRows(prev => ({
                                                            ...prev,
                                                            [prof.name]: { ...row, title: val }
                                                        }));
                                                    }}
                                                    placeholder={`Product name for ${prof.name}...`}
                                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[11px] font-medium text-slate-500">
                                                    Price (Rs.) <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    required={idx === 0}
                                                    value={row.price}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setProfileRows(prev => ({
                                                            ...prev,
                                                            [prof.name]: { ...row, price: val }
                                                        }));
                                                    }}
                                                    placeholder="e.g. 1200"
                                                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 2: Image URLs (Minimum 2 required) */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Product Images (Minimum 2 URLs Required)
                            </label>
                            <button
                                type="button"
                                onClick={handleAddImageField}
                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline border-none bg-transparent cursor-pointer"
                            >
                                <Plus size={13} /> Add More Image
                            </button>
                        </div>

                        <div className="space-y-2">
                            {imageUrls.map((url, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400 w-16 shrink-0">
                                        Image {idx + 1} {idx < 2 && <span className="text-red-500">*</span>}:
                                    </span>
                                    <input
                                        type="url"
                                        required={idx < 2}
                                        value={url}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setImageUrls(prev => {
                                                const copy = [...prev];
                                                copy[idx] = val;
                                                return copy;
                                            });
                                        }}
                                        placeholder={`Enter absolute image URL ${idx + 1}...`}
                                        className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500"
                                    />
                                    {imageUrls.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImageField(idx)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors border-none bg-transparent cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Section 3: Description */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Base Description
                            </label>
                            <span className="text-[11px] text-slate-400 italic">
                                * Profile Last Description will be appended automatically
                            </span>
                        </div>
                        <textarea
                            rows={4}
                            value={baseDescription}
                            onChange={(e) => setBaseDescription(e.target.value)}
                            placeholder="Enter main product description, features, warranty, package details..."
                            className="w-full p-3.5 text-xs rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 leading-relaxed"
                        />
                    </div>

                    {/* Section 4: Category, Condition, Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Category Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Condition (Locked to New) */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500">Condition</label>
                            <input
                                type="text"
                                disabled
                                value={condition}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed font-semibold"
                            />
                        </div>

                        {/* Location Dropdown (Default Kathmandu) */}
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-500">Location</label>
                            <select
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-hidden"
                            >
                                {locations.map(l => (
                                    <option key={l.id} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border-none bg-transparent cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-500/20 transition-all border-none cursor-pointer disabled:opacity-50"
                        >
                            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                            {product ? 'Save Changes' : 'Save Marketplace Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LAUNCH BULK LISTING MODAL (Direct Playwright execution)
   ───────────────────────────────────────────────────────────────────────────── */
function LaunchBulkListingModal({
    selectedProducts,
    profiles,
    imageFolderSetting,
    companionOnline,
    onLaunched,
    onClose
}: {
    selectedProducts: ProductItem[];
    profiles: MarketplaceProfile[];
    imageFolderSetting: ImageFolderSetting;
    companionOnline: boolean | null;
    onLaunched: (profileName: string) => Promise<void>;
    onClose: () => void;
}) {
    const [targetProfile, setTargetProfile] = useState(profiles[0]?.name || 'Default');
    const [batchSize, setBatchSize] = useState<number>(3);
    const [publishMode, setPublishMode] = useState<'manual' | 'auto'>('manual');
    const [runBackground, setRunBackground] = useState<boolean>(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [launchError, setLaunchError] = useState('');

    const handleLaunch = async () => {
        setIsLaunching(true);
        setLaunchError('');

        // Prepare listings mapped to the selected profile's title, price, and appended last description
        const mappedListings = selectedProducts.map((p, idx) => {
            const pData = p.profile_data?.[targetProfile] || Object.values(p.profile_data || {})[0] || {};
            const title = pData.title || p.description?.slice(0, 30) || 'Untitled Item';
            const price = pData.price || 0;
            const description = pData.final_description || p.description || '';

            const cleanImages = (p.images || []).map(u => (typeof u === 'string' ? u.trim() : '')).filter(Boolean);

            return {
                id: idx + 1,
                productId: p.id,
                title,
                price,
                category: p.category || 'General',
                condition: p.condition || 'New',
                location: p.location || 'Kathmandu',
                description,
                images: cleanImages,
            };
        });

        try {
            // Send to local companion running on port 3000
            const res = await fetch('http://localhost:3000/api/launch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    listings: mappedListings.slice(0, batchSize),
                    publishMode,
                    runBackground,
                    imageFolder: imageFolderSetting.folder_path,
                    autoClean: imageFolderSetting.auto_clean
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to connect to local Marketplace Automation companion.');
            }

            // Successfully dispatched!
            await onLaunched(targetProfile);
        } catch (err: any) {
            console.error('Launch bulk listing error:', err);
            setLaunchError(
                err.message || 
                'Local Automation companion not running on port 3000. Open a terminal in "marketplace automation" and run "node server.js".'
            );
            setIsLaunching(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                            <Play size={20} className="fill-white ml-0.5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                Launch Bulk Marketplace Listing
                            </h3>
                            <p className="text-xs text-slate-400">
                                {selectedProducts.length} product(s) selected for direct publishing
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all border-none bg-transparent cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {launchError && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-amber-600 shrink-0" />
                            <span>Automation Companion Status</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                            {launchError}
                        </p>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Choose Marketplace Profile */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                            <span>Marketplace Profile:</span>
                            <span className="text-[11px] text-slate-400 font-normal">Uses this profile's title, price & last description</span>
                        </label>
                        <select
                            value={targetProfile}
                            onChange={(e) => setTargetProfile(e.target.value)}
                            className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-hidden"
                        >
                            {profiles.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Batch Size (Tabs to open) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Batch Size (Tabs per launch):
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 3, 5, 10].map(size => (
                                <button
                                    key={size}
                                    type="button"
                                    onClick={() => setBatchSize(size)}
                                    className={`py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                        batchSize === size
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-500 dark:bg-emerald-950/60 dark:text-emerald-300'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'
                                    }`}
                                >
                                    {size === 1 ? '1 (Login/Test)' : `${size} Tabs`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Publishing Mode: Manual Review vs Auto Publish */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Execution Mode:
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <label
                                onClick={() => setPublishMode('manual')}
                                className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                                    publishMode === 'manual'
                                        ? 'bg-indigo-50/60 border-indigo-500 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="font-bold flex items-center gap-1.5">
                                    <Eye size={13} /> Manual Review
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                                    Fills all fields and leaves tabs open so you can review and click Publish.
                                </p>
                            </label>

                            <label
                                onClick={() => setPublishMode('auto')}
                                className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                                    publishMode === 'auto'
                                        ? 'bg-indigo-50/60 border-indigo-500 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="font-bold flex items-center gap-1.5">
                                    <Sparkles size={13} /> Auto Publish
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                                    Fills fields, clicks "Next" and clicks "Publish" automatically.
                                </p>
                            </label>
                        </div>
                    </div>

                    {/* Run in Background Checkbox */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-200">
                            <input
                                type="checkbox"
                                checked={runBackground}
                                onChange={(e) => setRunBackground(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                            />
                            <span>Run in background (Headless Chrome mode)</span>
                        </label>
                    </div>

                    {/* Image Folder Summary note */}
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Folder size={13} className="text-indigo-500 shrink-0" />
                        <span className="truncate">Images will download to: <strong className="font-mono text-slate-600 dark:text-slate-300">{imageFolderSetting.folder_path}</strong></span>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 border-none bg-transparent cursor-pointer">
                        Cancel
                    </button>
                    <button
                        disabled={isLaunching}
                        onClick={handleLaunch}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                    >
                        {isLaunching ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} className="fill-white" />}
                        {isLaunching ? 'Launching Chrome...' : `Launch Batch (${Math.min(batchSize, selectedProducts.length)})`}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   VIEW DETAILS MODAL
   ───────────────────────────────────────────────────────────────────────────── */
function ViewProductModal({
    product,
    profiles,
    onClose
}: {
    product: ProductItem;
    profiles: MarketplaceProfile[];
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Eye size={17} className="text-indigo-600" /> Marketplace Product Details
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-all border-none bg-transparent cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Images preview gallery */}
                    <div>
                        <label className="text-xs font-bold uppercase text-slate-400 block mb-2">Images ({product.images?.length || 0})</label>
                        <div className="flex gap-2.5 overflow-x-auto pb-2">
                            {(product.images || []).map((img, i) => (
                                <img key={i} src={img} alt="" className="w-20 h-20 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                            ))}
                        </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 font-bold">
                            {product.category}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1">
                            <MapPin size={11} className="text-red-500" /> {product.location}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                            Condition: {product.condition || 'New'}
                        </span>
                    </div>

                    {/* Profiles details */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold uppercase text-slate-400 block">Variations By Profile</label>
                        <div className="space-y-3">
                            {profiles.map(prof => {
                                const pData = product.profile_data?.[prof.name] || {};
                                const isComplete = product.status_map?.[prof.name] === 'completed';
                                return (
                                    <div key={prof.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                {prof.name}
                                            </span>
                                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                isComplete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400'
                                            }`}>
                                                {isComplete ? '✓ Complete' : '● Pending'}
                                            </span>
                                        </div>

                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                            {pData.title || 'Untitled'}
                                        </p>
                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            Price: Rs. {pData.price || 0}
                                        </p>

                                        {pData.final_description && (
                                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Final Description (With Last Description Appended):</label>
                                                <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap mt-0.5 leading-relaxed bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    {pData.final_description}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border-none cursor-pointer">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MARKETPLACE ADD STATUS MODAL (Batch update status)
   ───────────────────────────────────────────────────────────────────────────── */
function MarketplaceAddModal({
    profiles,
    selectedCount,
    onConfirm,
    onClose
}: {
    profiles: MarketplaceProfile[];
    selectedCount: number;
    onConfirm: (profileName: string) => Promise<void>;
    onClose: () => void;
}) {
    const [chosenProfile, setChosenProfile] = useState('all');
    const [submitting, setSubmitting] = useState(false);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                            Marketplace Add
                        </h3>
                        <p className="text-xs text-slate-400">
                            Mark {selectedCount} selected product(s) as Complete
                        </p>
                    </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Choose which Marketplace Profile should be marked as <strong>Complete (green tick)</strong> for the selected products:
                </p>

                <div className="space-y-2">
                    <label
                        onClick={() => setChosenProfile('all')}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                            chosenProfile === 'all'
                                ? 'bg-indigo-50/70 border-indigo-500 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                        <span>All Profiles (Mark complete across all profiles)</span>
                        <input type="radio" checked={chosenProfile === 'all'} onChange={() => setChosenProfile('all')} />
                    </label>

                    {profiles.map(p => (
                        <label
                            key={p.id}
                            onClick={() => setChosenProfile(p.name)}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                chosenProfile === p.name
                                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <span>Only {p.name} Profile</span>
                            <input type="radio" checked={chosenProfile === p.name} onChange={() => setChosenProfile(p.name)} />
                        </label>
                    ))}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer">
                        Cancel
                    </button>
                    <button
                        disabled={submitting}
                        onClick={async () => {
                            setSubmitting(true);
                            await onConfirm(chosenProfile);
                            setSubmitting(false);
                        }}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                    >
                        {submitting ? 'Updating...' : 'Confirm Status Update'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT MODAL (Client-side fast Excel generation using xlsx)
   ───────────────────────────────────────────────────────────────────────────── */
function ExportModal({
    profiles,
    products,
    onClose
}: {
    profiles: MarketplaceProfile[];
    products: ProductItem[];
    onClose: () => void;
}) {
    const [profile, setProfile] = useState('all');
    const [status, setStatus] = useState<'all' | 'completed' | 'pending'>('all');
    const [exporting, setExporting] = useState(false);

    const handleExport = () => {
        setExporting(true);
        try {
            const exportRows: Record<string, any>[] = [];

            for (const p of products) {
                const profilesToProcess = profile === 'all'
                    ? profiles
                    : profiles.filter(prof => prof.name === profile || prof.id === profile);

                for (const prof of profilesToProcess) {
                    const currentStatus = p.status_map?.[prof.name] || 'pending';
                    if (status !== 'all' && currentStatus !== status) {
                        continue;
                    }

                    const pData = p.profile_data?.[prof.name] || {};
                    const title = pData.title || p.description?.slice(0, 30) || 'Untitled Item';
                    const price = pData.price || 0;
                    const desc = pData.final_description || p.description || '';

                    exportRows.push({
                        'Marketplace Profile': prof.name,
                        'Title': title,
                        'Price': price,
                        'Category': p.category,
                        'Condition': p.condition || 'New',
                        'Location': p.location || 'Kathmandu',
                        'Description': desc,
                        'Status': currentStatus === 'completed' ? 'Completed' : 'Pending',
                        'Image 1': p.images?.[0] || '',
                        'Image 2': p.images?.[1] || '',
                        'Image 3': p.images?.[2] || '',
                        'Image 4': p.images?.[3] || '',
                    });
                }
            }

            const wb = xlsx.utils.book_new();
            const ws = xlsx.utils.json_to_sheet(exportRows);
            xlsx.utils.book_append_sheet(wb, ws, 'Marketplace Export');

            xlsx.writeFile(wb, `Marketplace_Export_${profile}_${status}_${Date.now()}.xlsx`);
            onClose();
        } catch (e) {
            console.error('Export error:', e);
            alert('Failed to export. Please try again.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Download size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                            Export Marketplace Listings
                        </h3>
                        <p className="text-xs text-slate-400">
                            Download Excel spreadsheet ready for Marketplace Automation
                        </p>
                    </div>
                </div>

                <div className="space-y-3.5 pt-2">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Choose Marketplace Profile
                        </label>
                        <select
                            value={profile}
                            onChange={(e) => setProfile(e.target.value)}
                            className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-hidden"
                        >
                            <option value="all">All Profiles</option>
                            {profiles.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                            Choose Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold focus:outline-hidden"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending Only (Red Dot)</option>
                            <option value="completed">Complete Only (Green Tick)</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 border-none bg-transparent cursor-pointer">
                        Cancel
                    </button>
                    <button
                        disabled={exporting}
                        onClick={handleExport}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                    >
                        {exporting ? 'Generating Excel...' : 'Export Excel'}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────────
   IMPORT MODAL (Template download + Client-side Excel parser directly saving to Supabase)
   ───────────────────────────────────────────────────────────────────────────── */
function ImportModal({
    profiles,
    categories,
    locations,
    onSuccess,
    onClose
}: {
    profiles: MarketplaceProfile[];
    categories: MarketplaceCategory[];
    locations: MarketplaceLocation[];
    onSuccess: () => void;
    onClose: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [downloadingTemplate, setDownloadingTemplate] = useState(false);
    const [result, setResult] = useState<{ importedCount: number; errors: string[] } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dynamic 3-Sheet Template Generator (Pre-populated with pending inventory products)
    const handleDownloadTemplate = async () => {
        setDownloadingTemplate(true);
        try {
            const wb = xlsx.utils.book_new();

            // 1. Sheet 1: Listings Template
            const headers: string[] = ['Inventory ID', 'Product Name'];
            for (const prof of profiles) {
                headers.push(`Product Name (${prof.name})`);
                headers.push(`Price (${prof.name})`);
            }
            headers.push('Category', 'Condition', 'Location', 'Description', 'Image 1', 'Image 2', 'Image 3', 'Image 4');

            // Fetch pending inventory items from the inventory database!
            let dataRows: Record<string, any>[] = [];
            try {
                const pendingItems = await fetchPendingInventoryProducts();
                if (pendingItems && pendingItems.length > 0) {
                    dataRows = pendingItems.map(item => {
                        const row: Record<string, any> = {
                            'Inventory ID': item.product_id || item.id,
                            'Product Name': item.product_name,
                        };
                        for (const prof of profiles) {
                            row[`Product Name (${prof.name})`] = item.product_name;
                            row[`Price (${prof.name})`] = item.special_price || item.regular_price || 0;
                        }
                        row['Category'] = item.marketplace_category || item.category_name || categories[0]?.name || 'Electronics';
                        row['Condition'] = 'New';
                        row['Location'] = locations[0]?.name || 'Kathmandu';
                        row['Description'] = (item.description || '').replace(/<[^>]*>?/gm, '').trim();
                        row['Image 1'] = item.image_url || '';
                        row['Image 2'] = item.other_images?.[0] || '';
                        row['Image 3'] = item.other_images?.[1] || '';
                        row['Image 4'] = item.other_images?.[2] || '';
                        return row;
                    });
                }
            } catch (err) {
                console.warn('Could not fetch pending inventory products for template:', err);
            }

            if (dataRows.length === 0) {
                // Fallback sample row
                const sampleRow: Record<string, any> = {
                    'Inventory ID': 1001,
                    'Product Name': 'Sample Product Title',
                };
                for (const prof of profiles) {
                    sampleRow[`Product Name (${prof.name})`] = `Sample Item - ${prof.name}`;
                    sampleRow[`Price (${prof.name})`] = 1200;
                }
                sampleRow['Category'] = categories[0]?.name || 'Electronics';
                sampleRow['Condition'] = 'New';
                sampleRow['Location'] = locations[0]?.name || 'Kathmandu';
                sampleRow['Description'] = 'High quality brand new product with warranty.';
                sampleRow['Image 1'] = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e';
                sampleRow['Image 2'] = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30';
                sampleRow['Image 3'] = '';
                sampleRow['Image 4'] = '';
                dataRows = [sampleRow];
            }

            const wsListings = xlsx.utils.json_to_sheet(dataRows, { header: headers });
            xlsx.utils.book_append_sheet(wb, wsListings, 'Listings');

            // 2. Sheet 2: Categories
            const catRows = categories.map(c => ({ 'Category Name': c.name }));
            const wsCats = xlsx.utils.json_to_sheet(catRows);
            xlsx.utils.book_append_sheet(wb, wsCats, 'Categories');

            // 3. Sheet 3: Locations
            const locRows = locations.map(l => ({ 'Location Name': l.name }));
            const wsLocs = xlsx.utils.json_to_sheet(locRows);
            xlsx.utils.book_append_sheet(wb, wsLocs, 'Locations');

            xlsx.writeFile(wb, 'Marketplace_Listing_Template.xlsx');
        } catch (e) {
            console.error('Error generating template:', e);
        } finally {
            setDownloadingTemplate(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);

        try {
            const dataBuffer = await file.arrayBuffer();
            const wb = xlsx.read(dataBuffer, { type: 'array' });
            const sheetName = wb.SheetNames[0]; // Read Sheet 1 (Listings)
            if (!sheetName) throw new Error('Empty Excel workbook');

            const sheet = wb.Sheets[sheetName];
            const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet);

            if (!rawRows || rawRows.length === 0) {
                throw new Error('No product rows found in Sheet 1');
            }

            const findCol = (row: Record<string, any>, candidateKeys: string[]) => {
                for (const key of Object.keys(row)) {
                    const normKey = key.toLowerCase().trim();
                    for (const cand of candidateKeys) {
                        if (normKey === cand.toLowerCase().trim()) return row[key];
                    }
                }
                return '';
            };

            const errors: string[] = [];
            let importedCount = 0;

            for (let i = 0; i < rawRows.length; i++) {
                const row = rawRows[i];
                const rowNum = i + 2;

                const invId = findCol(row, ['inventory id', 'inventory_id', 'inv id', 'product id', 'product_id', 'id']);
                const category = findCol(row, ['category', 'category name', 'cat']) || categories[0]?.name || 'General';
                const condition = findCol(row, ['condition', 'item condition']) || 'New';
                const location = findCol(row, ['location', 'city', 'area']) || 'Kathmandu';
                const baseDescription = findCol(row, ['description', 'desc', 'details']) || '';

                // Extract Images (minimum 2)
                const images: string[] = [];
                for (let imgIdx = 1; imgIdx <= 10; imgIdx++) {
                    const val = findCol(row, [`image ${imgIdx}`, `image${imgIdx}`, `img ${imgIdx}`, `img${imgIdx}`, `photo ${imgIdx}`, `photo${imgIdx}`]);
                    if (val && typeof val === 'string' && val.trim() !== '') {
                        images.push(val.trim());
                    }
                }

                if (images.length < 2) {
                    errors.push(`Row ${rowNum}: At least 2 image URLs are required (Image 1 and Image 2).`);
                    continue;
                }

                // Extract Profile Titles & Prices
                const profileData: Record<string, any> = {};
                const statusMap: Record<string, 'pending' | 'completed'> = {};
                let hasValidTitle = false;

                for (const prof of profiles) {
                    const pTitle = findCol(row, [
                        `product name (${prof.name})`,
                        `product name ${prof.name}`,
                        `title (${prof.name})`,
                        `title ${prof.name}`,
                        'title',
                        'product name',
                        'name'
                    ]);

                    const pPrice = findCol(row, [
                        `price (${prof.name})`,
                        `price ${prof.name}`,
                        `rate (${prof.name})`,
                        `rate ${prof.name}`,
                        'price',
                        'rate'
                    ]);

                    if (pTitle && String(pTitle).trim() !== '') {
                        hasValidTitle = true;
                    }

                    const lastDesc = (prof.last_description || '').trim();
                    const finalDesc = [baseDescription, lastDesc].filter(Boolean).join('\n\n');

                    profileData[prof.name] = {
                        title: String(pTitle || '').trim(),
                        price: Number(pPrice) || 0,
                        final_description: finalDesc,
                    };
                    statusMap[prof.name] = 'pending';
                }

                if (!hasValidTitle) {
                    errors.push(`Row ${rowNum}: Product Name is missing.`);
                    continue;
                }

                await saveMarketplaceProduct({
                    inventory_id: invId ? String(invId) : null,
                    description: baseDescription,
                    category: String(category).trim(),
                    condition: String(condition).trim() || 'New',
                    location: String(location).trim() || 'Kathmandu',
                    images,
                    profile_data: profileData,
                    status_map: statusMap,
                });
                importedCount++;
            }

            setResult({ importedCount, errors });
            if (importedCount > 0) {
                setTimeout(() => {
                    onSuccess();
                }, 1800);
            }
        } catch (e: any) {
            setResult({
                importedCount: 0,
                errors: [e.message || 'Failed to process Excel spreadsheet']
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                                Import Marketplace Listings
                            </h3>
                            <p className="text-xs text-slate-400">
                                Upload Excel spreadsheet catalog into your listing database
                            </p>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition-all border-none bg-transparent cursor-pointer">
                        <X size={18} />
                    </button>
                </div>

                {/* Step 1: Download Template */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between gap-3">
                    <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                            Download Excel Sample Template
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Pre-populated with pending items from your Inventory (ID, Name, Price, Images)
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        disabled={downloadingTemplate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                        {downloadingTemplate ? (
                            <RefreshCw size={13} className="animate-spin" />
                        ) : (
                            <Download size={13} />
                        )}
                        {downloadingTemplate ? 'Preparing...' : 'Template (.xlsx)'}
                    </button>
                </div>

                {/* Step 2: Upload Dropzone */}
                <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-slate-400">Upload Spreadsheet</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                    />
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/20"
                    >
                        <FileSpreadsheet size={32} className="mx-auto text-indigo-500 mb-2" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {file ? file.name : 'Click to browse or drop .xlsx file'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Only Sheet 1 will be imported with validation
                        </p>
                    </div>
                </div>

                {/* Import Results & Errors Feedback */}
                {result && (
                    <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                        result.importedCount > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                        <div className="font-bold">
                            {result.importedCount > 0 ? `Successfully imported ${result.importedCount} product(s)!` : 'Import could not complete:'}
                        </div>
                        {result.errors && result.errors.length > 0 && (
                            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                                {result.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 border-none bg-transparent cursor-pointer">
                        Close
                    </button>
                    <button
                        disabled={!file || uploading}
                        onClick={handleUpload}
                        className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-500/20 active:scale-95 transition-all border-none cursor-pointer disabled:opacity-50"
                    >
                        {uploading ? 'Processing File...' : 'Upload & Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}
