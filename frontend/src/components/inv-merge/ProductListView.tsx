"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Search,
    X,
    Filter,
    Upload,
    Download,
    RefreshCw,
    CheckSquare,
    Square,
    Package,
    Plus,
    Check,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Tag,
    Layers,
    MoreHorizontal,
    Star,
    Eye,
    Edit3,
    Trash2,
    Send,
    CheckCircle2
} from 'lucide-react';
import {
    getProducts,
    updateSyncStatuses,
    exportProducts,
    updateProduct,
    approveProduct,
    rejectProduct,
    deleteProduct,
    toggleProductStatus,
    Product
} from '@/services/inv-product-service';
import { fetchListedInventoryIds } from '@/lib/marketplace-supabase';
import { AddProductModal } from '@/components/inv-merge/AddProductModal';
import { ViewProductModal } from '@/components/inv-merge/ViewProductModal';
import { EditProductModal } from '@/components/inv-merge/EditProductModal';

const groupProductsByVariation = (productsList: Product[]) => {
    const variations = productsList.filter(
        (p) => p.product_type === 'combo' && (!p.product_combos || p.product_combos.length <= 1)
    );

    const childToVariationsMap = new Map<string, Product[]>();
    variations.forEach((v) => {
        const childId = v.product_combos?.[0]?.child_product_id;
        if (childId) {
            if (!childToVariationsMap.has(childId)) {
                childToVariationsMap.set(childId, []);
            }
            childToVariationsMap.get(childId)!.push(v);
        }
    });

    const processedIds = new Set<string>();
    const result: Product[] = [];

    productsList.forEach((product) => {
        if (processedIds.has(product.id)) return;

        if (childToVariationsMap.has(product.id)) {
            result.push(product);
            processedIds.add(product.id);

            const vars = childToVariationsMap.get(product.id) || [];
            vars.forEach((v) => {
                if (!processedIds.has(v.id)) {
                    result.push(v);
                    processedIds.add(v.id);
                }
            });
        } else if (
            product.product_type === 'combo' &&
            product.product_combos &&
            product.product_combos.length === 1
        ) {
            const childId = product.product_combos[0].child_product_id;
            const mainProductExists = productsList.some((p) => p.id === childId);

            if (!mainProductExists) {
                if (childId && childToVariationsMap.has(childId)) {
                    const vars = childToVariationsMap.get(childId) || [];
                    vars.forEach((v) => {
                        if (!processedIds.has(v.id)) {
                            result.push(v);
                            processedIds.add(v.id);
                        }
                    });
                } else {
                    result.push(product);
                    processedIds.add(product.id);
                }
            }
        } else {
            result.push(product);
            processedIds.add(product.id);
        }
    });

    return result;
};

export default function ProductListView() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Query & Pagination states
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [syncFilter, setSyncFilter] = useState<'all' | 'website_pending' | 'marketplace_pending' | 'variation_product'>('all');

    // Data states
    const [products, setProducts] = useState<Product[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal & Dropdown states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewProductId, setViewProductId] = useState<string | null>(null);
    const [editProductId, setEditProductId] = useState<string | null>(null);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [activeMoreMenuId, setActiveMoreMenuId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [updatingSyncId, setUpdatingSyncId] = useState<string | null>(null);
    const [listedMarketplaceIds, setListedMarketplaceIds] = useState<Set<string>>(new Set());

    const loadProducts = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [data, listedIds] = await Promise.all([
                getProducts({
                    page,
                    limit: 50,
                    search,
                    syncFilter,
                }),
                fetchListedInventoryIds()
            ]);
            setListedMarketplaceIds(listedIds);
            const grouped = groupProductsByVariation(data.products);
            setProducts(grouped);
            setTotalCount(data.totalCount);
            setTotalPages(data.totalPages);
        } catch (err: any) {
            console.error('Error fetching inventory products:', err);
            setError(err.message || 'Failed to load inventory products');
        } finally {
            setIsLoading(false);
        }
    }, [page, search, syncFilter]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const handleSearch = () => {
        setSearch(searchInput);
        setPage(1);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setSearch('');
        setPage(1);
    };

    const handleBackToHub = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', 'inventory');
        params.delete('subView');
        router.push(`/?${params.toString()}`);
    };

    const toggleSelectAll = () => {
        const visibleIds = products.map((p) => p.id);
        const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

        if (allSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                visibleIds.forEach((id) => next.delete(id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                visibleIds.forEach((id) => next.add(id));
                return next;
            });
        }
    };

    const toggleSelectRow = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSyncStatusChange = async (
        productId: string,
        currentMarketplace: string = 'Done',
        currentWebsite: string = 'Done',
        field: 'marketplace' | 'website',
        value: 'Pending' | 'Done'
    ) => {
        setUpdatingSyncId(productId);
        try {
            const newMarketplace = field === 'marketplace' ? value : currentMarketplace;
            const newWebsite = field === 'website' ? value : currentWebsite;
            await updateSyncStatuses(productId, newMarketplace, newWebsite);

            setProducts((prev) =>
                prev.map((p) =>
                    p.id === productId
                        ? {
                              ...p,
                              marketplace_sync_status: newMarketplace,
                              website_sync_status: newWebsite,
                          }
                        : p
                )
            );
        } catch (err: any) {
            alert(`Failed to update sync status: ${err.message}`);
        } finally {
            setUpdatingSyncId(null);
        }
    };

    const handleSetPriority = async (product: Product) => {
        try {
            const newPriority = !product.sales_priority;
            let prioritySellerAccount = product.priority_seller_account;
            if (newPriority && !prioritySellerAccount) {
                prioritySellerAccount =
                    product.seller_account1 ||
                    product.seller_account2 ||
                    product.seller_account3 ||
                    product.seller_account4 ||
                    undefined;
            }

            await updateProduct(product.id, {
                sales_priority: newPriority,
                priority_seller_account: prioritySellerAccount,
            });

            setProducts((prev) =>
                prev.map((p) =>
                    p.id === product.id
                        ? {
                              ...p,
                              sales_priority: newPriority,
                              priority_seller_account: prioritySellerAccount,
                          }
                        : p
                )
            );
        } catch (err: any) {
            alert(`Failed to set sales priority: ${err.message}`);
        }
    };

    const handleDeleteProduct = async (product: Product) => {
        setActiveMoreMenuId(null);
        const confirmed = window.confirm(`Are you sure to delete "${product.product_name}"?`);
        if (!confirmed) return;

        try {
            await deleteProduct(product.id);
            alert('Delete successful!');
            loadProducts();
        } catch (err: any) {
            alert(`Failed to delete product: ${err.message}`);
        }
    };

    const handleApprove = async (productId: string) => {
        try {
            await approveProduct(productId);
            loadProducts();
        } catch (err: any) {
            alert(`Approval failed: ${err.message}`);
        }
    };

    const handleReject = async (productId: string, name: string) => {
        if (!confirm(`Reject and delete product "${name}"?`)) return;
        try {
            await rejectProduct(productId);
            loadProducts();
        } catch (err: any) {
            alert(`Rejection failed: ${err.message}`);
        }
    };

    const handleExportCSV = async (filter: 'all' | 'marketplace_pending' | 'website_pending') => {
        setIsExportOpen(false);
        try {
            const csvData = await exportProducts(filter);
            if (!csvData || csvData.length === 0) {
                alert('No products found matching export filter.');
                return;
            }

            const headers = Object.keys(csvData[0]);
            const csvRows = [
                headers.join(','),
                ...csvData.map((row: any) =>
                    headers
                        .map((header) => {
                            const val = row[header];
                            return typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))
                                ? `"${val.replace(/"/g, '""')}"`
                                : val ?? '';
                        })
                        .join(',')
                ),
            ];

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `products_export_${filter}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(`Export failed: ${err.message}`);
        }
    };

    const allVisibleSelected =
        products.length > 0 && products.every((p) => selectedIds.has(p.id));

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-y-auto font-sans">
            {/* Header Bar */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-xs">
                <div>
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 text-slate-900 dark:text-white">
                        Inventory List
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                            {totalCount} items
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage and organize your product catalog
                    </p>
                </div>

                <div>
                    <button
                        onClick={handleBackToHub}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                    >
                        <ArrowLeft size={14} />
                        Back to Inventory
                    </button>
                </div>
            </div>

            {/* Action Bar / Controls Toolbar */}
            <div className="p-6 pb-2">
                <div className="p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    {/* Search & Filters */}
                    <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        {/* Filter Dropdown */}
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                            <Filter size={14} className="text-slate-400" />
                            <select
                                value={syncFilter}
                                onChange={(e) => {
                                    setSyncFilter(e.target.value as any);
                                    setPage(1);
                                }}
                                className="bg-transparent text-slate-700 dark:text-slate-200 font-medium outline-none cursor-pointer pr-1"
                            >
                                <option value="all">All</option>
                                <option value="website_pending">Website Pending</option>
                                <option value="marketplace_pending">Marketplace Pending</option>
                                <option value="variation_product">Variation Product</option>
                            </select>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                placeholder="Search by name, SKU, or..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            {searchInput && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Buttons Group */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Import CSV */}
                        <button
                            onClick={() => alert('Import CSV feature: Select CSV file to upload products.')}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                            <Upload size={14} className="text-slate-500" />
                            Import CSV
                        </button>

                        {/* Export Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsExportOpen(!isExportOpen)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                            >
                                <Download size={14} className="text-slate-500" />
                                Export
                            </button>
                            {isExportOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-30"
                                        onClick={() => setIsExportOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-40 py-1">
                                        <button
                                            onClick={() => handleExportCSV('all')}
                                            className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                                        >
                                            All Products
                                        </button>
                                        <button
                                            onClick={() => handleExportCSV('marketplace_pending')}
                                            className="w-full text-left px-4 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer"
                                        >
                                            Marketplace Pending
                                        </button>
                                        <button
                                            onClick={() => handleExportCSV('website_pending')}
                                            className="w-full text-left px-4 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer"
                                        >
                                            Website Pending
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Sync Buttons */}
                        <button
                            onClick={loadProducts}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                            Sync
                        </button>

                        <button
                            onClick={() => alert('Website sync completed!')}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl hover:bg-emerald-100 cursor-pointer"
                        >
                            <RefreshCw size={14} />
                            Sync Website
                        </button>

                        {/* + Add Product Button */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                        >
                            <Plus size={15} />
                            Add Product
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-6 my-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={loadProducts} className="underline font-bold cursor-pointer">
                        Retry
                    </button>
                </div>
            )}

            {/* Table Area */}
            <div className="p-6 pt-2">
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="p-3 pl-4 w-8">
                                        <button onClick={toggleSelectAll} className="cursor-pointer">
                                            {allVisibleSelected ? (
                                                <CheckSquare size={16} className="text-blue-600" />
                                            ) : (
                                                <Square size={16} className="text-slate-400" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="p-3 w-10 text-center">#</th>
                                    <th className="p-3 w-16">IMAGE</th>
                                    <th className="p-3 min-w-[220px]">PRODUCT</th>
                                    <th className="p-3">TYPE</th>
                                    <th className="p-3">STATUS</th>
                                    <th className="p-3">PRODUCT ID</th>
                                    <th className="p-3">WEBSITE</th>
                                    <th className="p-3">MARKETPLACE</th>
                                    <th className="p-3 text-center">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs">
                                {isLoading ? (
                                    /* Loading skeleton */
                                    [...Array(6)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="p-3 pl-4"><div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                            <td className="p-3"><div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></td>
                                            <td className="p-3"><div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" /></td>
                                            <td className="p-3"><div className="w-44 h-3 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                            <td className="p-3"><div className="w-14 h-5 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                            <td className="p-3"><div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                            <td className="p-3"><div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                            <td className="p-3"><div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                            <td className="p-3"><div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                            <td className="p-3"><div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg mx-auto" /></td>
                                        </tr>
                                    ))
                                ) : products.length === 0 ? (
                                    /* Empty State */
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center text-slate-400 dark:text-slate-500">
                                            <Package size={40} className="mx-auto mb-2 opacity-30" />
                                            <p className="font-semibold text-sm text-slate-700 dark:text-slate-300">
                                                No products found
                                            </p>
                                            <p className="text-xs mt-1">Try clearing search filters or click "+ Add Product" to create one.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    products.map((product, index) => {
                                        const sn = (page - 1) * 50 + index + 1;
                                        const isSelected = selectedIds.has(product.id);
                                        const isPendingApproval = product.approval_status === 'Pending';
                                        
                                        // Product Type Classification:
                                        // 1. Single: product_type === 'single'
                                        // 2. Variation: product_type === 'combo' && comboCount <= 1
                                        // 3. Combo: product_type === 'combo' && comboCount > 1
                                        const comboCount = product.product_combos?.length || 0;
                                        const isCombo = product.product_type === 'combo' && comboCount > 1;
                                        const isVariation = product.product_type === 'combo' && comboCount <= 1;
                                        const isSingle = product.product_type === 'single';

                                        return (
                                            <tr
                                                key={product.id}
                                                className={`transition-colors ${
                                                    isSelected
                                                        ? 'bg-blue-50/50 dark:bg-blue-950/30'
                                                        : isVariation
                                                        ? 'bg-blue-50/20 dark:bg-blue-950/10 border-l-2 border-l-blue-400 hover:bg-blue-50/40'
                                                        : isCombo
                                                        ? 'bg-purple-50/20 dark:bg-purple-950/10 border-l-2 border-l-purple-400 hover:bg-purple-50/40'
                                                        : 'hover:bg-slate-50/90 dark:hover:bg-slate-700/30'
                                                }`}
                                            >
                                                {/* Checkbox */}
                                                <td className="p-3 pl-4">
                                                    <button
                                                        onClick={() => toggleSelectRow(product.id)}
                                                        className="cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {isSelected ? (
                                                            <CheckSquare size={16} className="text-blue-600" />
                                                        ) : (
                                                            <Square size={16} />
                                                        )}
                                                    </button>
                                                </td>

                                                {/* # S.N. */}
                                                <td className="p-3 text-center font-semibold text-slate-500 dark:text-slate-400">
                                                    {sn}
                                                </td>

                                                {/* Image */}
                                                <td className="p-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden flex items-center justify-center text-slate-400 flex-shrink-0">
                                                        {product.image_url || (product.images && product.images[0]) ? (
                                                            <img
                                                                src={product.image_url || product.images![0]}
                                                                alt={product.product_name}
                                                                className="w-full h-full object-cover cursor-pointer"
                                                                onClick={() => setViewProductId(product.id)}
                                                            />
                                                        ) : (
                                                            <Package size={18} />
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Product Title (font-semibold) & SKU */}
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            onClick={() => setViewProductId(product.id)}
                                                            className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left truncate max-w-[240px] cursor-pointer"
                                                        >
                                                            {product.product_name}
                                                        </button>
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[240px]">
                                                        SKU: {product.seller_sku1 || 'Unassigned'}
                                                    </div>
                                                </td>

                                                {/* Type (Single / Variation / Combo) */}
                                                <td className="p-3 whitespace-nowrap">
                                                    {isVariation ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50">
                                                            <Layers size={11} />
                                                            Variation
                                                        </span>
                                                    ) : isCombo ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-600 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50">
                                                            <Layers size={11} />
                                                            Combo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                            <Package size={11} />
                                                            Single
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="p-3 whitespace-nowrap">
                                                    <span
                                                        onClick={() => toggleProductStatus(product.id, product.status || 'Active').then(loadProducts)}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border cursor-pointer ${
                                                            product.status === 'Inactive'
                                                                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50'
                                                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                                                        }`}
                                                    >
                                                        • {product.status || 'Active'}
                                                    </span>
                                                </td>

                                                {/* Product ID */}
                                                <td className="p-3 whitespace-nowrap font-mono font-bold text-slate-600 dark:text-slate-400">
                                                    #{product.product_id || product.id.substring(0, 6)}
                                                </td>

                                                {/* Website Sync Dropdown */}
                                                <td className="p-3 whitespace-nowrap">
                                                    <select
                                                        value={product.website_sync_status || 'Done'}
                                                        onChange={(e) =>
                                                            handleSyncStatusChange(
                                                                product.id,
                                                                product.marketplace_sync_status || 'Done',
                                                                product.website_sync_status || 'Done',
                                                                'website',
                                                                e.target.value as any
                                                            )
                                                        }
                                                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border outline-none cursor-pointer ${
                                                            product.website_sync_status === 'Pending'
                                                                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50'
                                                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50'
                                                        }`}
                                                    >
                                                        <option value="Done">Done</option>
                                                        <option value="Pending">Pending</option>
                                                    </select>
                                                </td>

                                                {/* Marketplace Column */}
                                                <td className="p-3 whitespace-nowrap">
                                                    {listedMarketplaceIds.has(String(product.id)) || (product.product_id && listedMarketplaceIds.has(String(product.product_id))) ? (
                                                        <span 
                                                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" 
                                                            title="Listed in Marketplace Listing"
                                                        >
                                                            <CheckCircle2 size={11} /> Listed
                                                        </span>
                                                    ) : (
                                                        <span 
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700" 
                                                            title="Not yet in Marketplace Listing"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                <td className="p-3 text-center whitespace-nowrap">
                                                    {isPendingApproval ? (
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleApprove(product.id)}
                                                                className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 cursor-pointer"
                                                                title="Approve Product"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(product.id, product.product_name)}
                                                                className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center hover:bg-rose-100 cursor-pointer"
                                                                title="Reject Product"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-2">
                                                            {/* Priority Button */}
                                                            <button
                                                                onClick={() => handleSetPriority(product)}
                                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                                                    product.sales_priority
                                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                Priority
                                                            </button>

                                                            {/* More Dropdown */}
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() =>
                                                                        setActiveMoreMenuId(
                                                                            activeMoreMenuId === product.id ? null : product.id
                                                                        )
                                                                    }
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 cursor-pointer"
                                                                >
                                                                    More
                                                                </button>

                                                                {activeMoreMenuId === product.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-30"
                                                                            onClick={() => setActiveMoreMenuId(null)}
                                                                        />
                                                                        <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-40 py-1 text-left">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveMoreMenuId(null);
                                                                                    setViewProductId(product.id);
                                                                                }}
                                                                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <Eye size={13} /> View Details
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveMoreMenuId(null);
                                                                                    setEditProductId(product.id);
                                                                                }}
                                                                                className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <Edit3 size={13} /> Edit Product
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActiveMoreMenuId(null);
                                                                                    alert(`Push to website triggered for "${product.product_name}".`);
                                                                                }}
                                                                                className="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <Send size={13} /> Push to Website
                                                                            </button>
                                                                            <div className="border-t border-slate-100 dark:border-slate-700/80 my-1" />
                                                                            <button
                                                                                onClick={() => handleDeleteProduct(product)}
                                                                                className="w-full text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                <Trash2 size={13} /> Delete Product
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                            Page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of{' '}
                            <strong className="text-slate-800 dark:text-slate-200">{totalPages || 1}</strong> ({totalCount} items)
                        </span>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                                disabled={page === 1 || isLoading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                                Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                                disabled={page >= totalPages || isLoading}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 cursor-pointer"
                            >
                                Next
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Product Modal */}
            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    alert('Product added successfully to database!');
                    loadProducts();
                }}
            />

            {/* Product Details Modal */}
            <ViewProductModal
                productId={viewProductId}
                isOpen={!!viewProductId}
                onClose={() => setViewProductId(null)}
                onEdit={(id) => setEditProductId(id)}
            />

            {/* Edit Product Modal */}
            <EditProductModal
                productId={editProductId}
                isOpen={!!editProductId}
                onClose={() => setEditProductId(null)}
                onSuccess={() => {
                    alert('Product updated successfully!');
                    loadProducts();
                }}
            />
        </div>
    );
}
