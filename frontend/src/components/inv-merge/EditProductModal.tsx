"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package } from 'lucide-react';
import { updateProduct, getProductById, getProducts, Product } from '@/services/inv-product-service';

interface EditProductModalProps {
    productId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ComboItemInput {
    child_product_id: string;
    child_product_name: string;
    quantity: number;
}

export function EditProductModal({ productId, isOpen, onClose, onSuccess }: EditProductModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form fields
    const [displayProductId, setDisplayProductId] = useState<number | string>('');
    const [productName, setProductName] = useState('');
    const [productType, setProductType] = useState<'single' | 'combo'>('single');
    const [imageUrl, setImageUrl] = useState('');

    // Seller SKUs & Accounts
    const [sellerSku1, setSellerSku1] = useState('');
    const [sellerAccount1, setSellerAccount1] = useState('');
    const [sellerSku2, setSellerSku2] = useState('');
    const [sellerAccount2, setSellerAccount2] = useState('');
    const [sellerSku3, setSellerSku3] = useState('');
    const [sellerAccount3, setSellerAccount3] = useState('');
    const [sellerSku4, setSellerSku4] = useState('');
    const [sellerAccount4, setSellerAccount4] = useState('');

    // Sales priority
    const [salesPriority, setSalesPriority] = useState(false);
    const [prioritySellerAccount, setPrioritySellerAccount] = useState('');

    // Combo items
    const [comboItems, setComboItems] = useState<ComboItemInput[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [selectedChild, setSelectedChild] = useState<Product | null>(null);
    const [comboQty, setComboQty] = useState<number>(1);

    useEffect(() => {
        if (isOpen && productId) {
            loadProductDetails(productId);
        } else {
            setError(null);
        }
    }, [isOpen, productId]);

    const loadProductDetails = async (id: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getProductById(id);
            if (data) {
                setDisplayProductId(data.product_id || '');
                setProductName(data.product_name || '');
                setProductType(data.product_type === 'combo' ? 'combo' : 'single');
                setImageUrl(data.image_url || '');

                setSellerSku1(data.seller_sku1 || '');
                setSellerAccount1(data.seller_account1 || '');
                setSellerSku2(data.seller_sku2 || '');
                setSellerAccount2(data.seller_account2 || '');
                setSellerSku3(data.seller_sku3 || '');
                setSellerAccount3(data.seller_account3 || '');
                setSellerSku4(data.seller_sku4 || '');
                setSellerAccount4(data.seller_account4 || '');

                setSalesPriority(!!data.sales_priority);
                setPrioritySellerAccount(data.priority_seller_account || '');

                const rawCombos = data.product_combos || (data as any).combo_items || [];
                const formattedCombos = rawCombos.map((item: any) => ({
                    child_product_id: item.child_product_id || item.child?.id,
                    child_product_name: item.child?.product_name || item.child_product_name || `Child Product`,
                    quantity: item.quantity || 1,
                }));
                setComboItems(formattedCombos);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load product details');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle combo search
    const handleSearchProducts = async (term: string) => {
        setSearchQuery(term);
        if (!term.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await getProducts({ search: term, limit: 10, productType: 'single' });
            setSearchResults(res.products.filter((p) => p.id !== productId));
        } catch (err) {
            console.error('Failed to search combo products:', err);
        }
    };

    const addComboItem = () => {
        if (!selectedChild) return;
        if (comboItems.some((item) => item.child_product_id === selectedChild.id)) {
            alert('This component product is already added to the combo.');
            return;
        }
        setComboItems((prev) => [
            ...prev,
            {
                child_product_id: selectedChild.id,
                child_product_name: selectedChild.product_name,
                quantity: comboQty > 0 ? comboQty : 1,
            },
        ]);
        setSelectedChild(null);
        setSearchQuery('');
        setSearchResults([]);
        setComboQty(1);
    };

    const removeComboItem = (id: string) => {
        setComboItems((prev) => prev.filter((item) => item.child_product_id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId) return;
        if (!productName.trim()) {
            setError('Product name is required');
            return;
        }

        if (productType === 'combo' && comboItems.length === 0) {
            setError('Combo product requires at least one component product');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await updateProduct(productId, {
                product_name: productName,
                product_type: productType,
                image_url: imageUrl || undefined,
                seller_sku1: sellerSku1 || undefined,
                seller_account1: sellerAccount1 || undefined,
                seller_sku2: sellerSku2 || undefined,
                seller_account2: sellerAccount2 || undefined,
                seller_sku3: sellerSku3 || undefined,
                seller_account3: sellerAccount3 || undefined,
                seller_sku4: sellerSku4 || undefined,
                seller_account4: sellerAccount4 || undefined,
                sales_priority: salesPriority,
                priority_seller_account: prioritySellerAccount || null,
                combo_items: comboItems.map((c) => ({
                    child_product_id: c.child_product_id,
                    quantity: c.quantity,
                })),
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update product');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !productId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
                onClick={onClose}
            />

            {/* Modal Box */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                    <h2 className="text-lg font-bold tracking-tight">Edit Product #{displayProductId}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
                    {error && (
                        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="py-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
                            Loading product details...
                        </div>
                    ) : (
                        <>
                            {/* General Details */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    General Details
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Product Name <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Enter product name"
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Image URL
                                        </label>
                                        <input
                                            type="url"
                                            placeholder="https://..."
                                            value={imageUrl}
                                            onChange={(e) => setImageUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Product ID
                                        </label>
                                        <input
                                            type="text"
                                            value={`#${displayProductId}`}
                                            disabled
                                            className="w-full px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 font-mono cursor-not-allowed"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Product Type <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={productType}
                                            onChange={(e) => setProductType(e.target.value as any)}
                                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                        >
                                            <option value="single">Single</option>
                                            <option value="combo">Combo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Combo Components Section */}
                            {productType === 'combo' && (
                                <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                                        Combo Components
                                    </h3>

                                    <div className="flex flex-wrap items-end gap-2">
                                        <div className="w-28 sm:w-32">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                                Product ID
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Search ID..."
                                                value={searchQuery}
                                                onChange={(e) => handleSearchProducts(e.target.value)}
                                                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                            />
                                        </div>

                                        <div className="relative flex-1 min-w-[200px]">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                                Product Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Search and select product..."
                                                value={selectedChild ? `${selectedChild.product_name} (ID: ${selectedChild.product_id})` : searchQuery}
                                                onChange={(e) => {
                                                    setSelectedChild(null);
                                                    handleSearchProducts(e.target.value);
                                                }}
                                                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                            />
                                            {searchResults.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-48 overflow-y-auto z-30">
                                                    {searchResults.map((prod) => (
                                                        <button
                                                            key={prod.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedChild(prod);
                                                                setSearchQuery(String(prod.product_id));
                                                                setSearchResults([]);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/30 border-b border-slate-100 dark:border-slate-700/50 last:border-none flex items-center justify-between cursor-pointer"
                                                        >
                                                            <span className="font-semibold truncate text-slate-800 dark:text-slate-200">{prod.product_name}</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">#{prod.product_id}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-20">
                                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                                Qty
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={comboQty}
                                                onChange={(e) => setComboQty(Number(e.target.value))}
                                                className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-center"
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={addComboItem}
                                            disabled={!selectedChild}
                                            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus size={14} /> Add
                                        </button>
                                    </div>

                                    {/* Added Combo Items List */}
                                    {comboItems.length > 0 && (
                                        <div className="space-y-2 pt-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Added Components:</p>
                                            {comboItems.map((item) => (
                                                <div
                                                    key={item.child_product_id}
                                                    className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Package size={14} className="text-purple-600 dark:text-purple-400" />
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {item.child_product_name}
                                                        </span>
                                                        <span className="text-purple-600 dark:text-purple-400 font-bold">
                                                            × {item.quantity}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeComboItem(item.child_product_id)}
                                                        className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Seller SKUs & Accounts Section (4 Rows) */}
                            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Seller SKUs & Accounts
                                </h3>

                                <div className="space-y-3">
                                    {[
                                        { sku: sellerSku1, setSku: setSellerSku1, acc: sellerAccount1, setAcc: setSellerAccount1, num: 1 },
                                        { sku: sellerSku2, setSku: setSellerSku2, acc: sellerAccount2, setAcc: setSellerAccount2, num: 2 },
                                        { sku: sellerSku3, setSku: setSellerSku3, acc: sellerAccount3, setAcc: setSellerAccount3, num: 3 },
                                        { sku: sellerSku4, setSku: setSellerSku4, acc: sellerAccount4, setAcc: setSellerAccount4, num: 4 },
                                    ].map(({ sku, setSku, acc, setAcc, num }) => (
                                        <div key={num} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    Seller SKU {num}
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Enter SKU"
                                                    value={sku}
                                                    onChange={(e) => setSku(e.target.value)}
                                                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                    Seller Account {num}
                                                </label>
                                                <select
                                                    value={acc}
                                                    onChange={(e) => setAcc(e.target.value)}
                                                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                                                >
                                                    <option value="">Select account...</option>
                                                    <option value="BTAS">BTAS</option>
                                                    <option value="Balaju Shop">Balaju Shop</option>
                                                    <option value="Bagmati Traders">Bagmati Traders</option>
                                                    <option value="Prakash Shop">Prakash Shop</option>
                                                    <option value="Subash Store">Subash Store</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sales Priority Section */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="salesPriorityEdit"
                                        checked={salesPriority}
                                        onChange={(e) => setSalesPriority(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                                    />
                                    <label htmlFor="salesPriorityEdit" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                                        Enable Sales Priority
                                    </label>
                                </div>
                                {salesPriority && (
                                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                                        <span className="text-xs text-slate-500 whitespace-nowrap">Priority Store:</span>
                                        <input
                                            type="text"
                                            placeholder="Account Name"
                                            value={prioritySellerAccount}
                                            onChange={(e) => setPrioritySellerAccount(e.target.value)}
                                            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isLoading}
                            className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-blue-500/20"
                        >
                            {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
