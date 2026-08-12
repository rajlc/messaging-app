"use client";

import React, { useState, useEffect } from 'react';
import { X, Package, Layers, ExternalLink, Check, Tag, Edit3 } from 'lucide-react';
import { getProductById, Product } from '@/services/inv-product-service';

interface ViewProductModalProps {
    productId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: (productId: string) => void;
}

export function ViewProductModal({ productId, isOpen, onClose, onEdit }: ViewProductModalProps) {
    const [product, setProduct] = useState<Product | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && productId) {
            setIsLoading(true);
            setError(null);
            getProductById(productId)
                .then((data) => {
                    setProduct(data);
                })
                .catch((err) => {
                    console.error('Failed to load product details:', err);
                    setError(err.message || 'Failed to load product details');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setProduct(null);
        }
    }, [isOpen, productId]);

    if (!isOpen || !productId) return null;

    const comboItems = (product?.product_combos && product.product_combos.length > 0)
        ? product.product_combos
        : (product as any)?.combo_items || [];
    const comboCount = comboItems.length;
    const isCombo = product?.product_type === 'combo' && comboCount > 1;
    const isVariation = product?.product_type === 'combo' && comboCount <= 1;
    const isSingle = product?.product_type === 'single';

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
                    <h2 className="text-lg font-bold tracking-tight">Product Details</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {isLoading ? (
                        <div className="py-16 text-center text-slate-400">Loading product details...</div>
                    ) : error ? (
                        <div className="py-16 text-center text-rose-500 font-semibold">{error}</div>
                    ) : !product ? (
                        <div className="py-16 text-center text-slate-400">Product not found</div>
                    ) : (
                        <>
                            {/* Top Title & Header */}
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Product Title
                                </label>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
                                    {product.product_name}
                                </h3>
                            </div>

                            {/* Main Grid: Image vs Attributes */}
                            <div className="grid grid-cols-1 sm:grid-cols-[130px_1fr] gap-5 items-center">
                                {/* Product Image */}
                                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                                    {product.image_url || (product.images && product.images[0]) ? (
                                        <img
                                            src={product.image_url || product.images![0]}
                                            alt={product.product_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Package size={32} />
                                    )}
                                </div>

                                {/* Meta Attributes */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            Product Type
                                        </span>
                                        <span
                                            className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${
                                                isVariation
                                                    ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50'
                                                    : isCombo
                                                    ? 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50'
                                                    : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                                            }`}
                                        >
                                            {isVariation ? <Layers size={13} /> : isCombo ? <Layers size={13} /> : <Package size={13} />}
                                            {isVariation ? 'Variation' : isCombo ? 'Combo' : 'Single'}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            Product ID
                                        </span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-base">
                                            #{product.product_id || product.id.substring(0, 6)}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            Selling Price
                                        </span>
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            Rs. {product.selling_price ?? 0}
                                        </span>
                                    </div>

                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                            Stock Level
                                        </span>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                            {product.quantity ?? 0} items
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Combo Components (Rendered if combo items exist) */}
                            {product.product_combos && product.product_combos.length > 0 && (
                                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Combo Components ({product.product_combos.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {product.product_combos.map((item: any, idx: number) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 text-xs"
                                            >
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-slate-100">
                                                        {item.child?.product_name || 'Component Item'}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {item.child?.product_id && (
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                ID: #{item.child.product_id}
                                                            </span>
                                                        )}
                                                        {item.child?.seller_sku1 && (
                                                            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                                SKU: {item.child.seller_sku1}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                                                    × {item.quantity}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Seller SKUs & Accounts Grid (Rendered if SKUs or Accounts exist) */}
                            {(product.seller_sku1 || product.seller_sku2 || product.seller_sku3 || product.seller_sku4 || product.seller_account1 || product.seller_account2 || product.seller_account3 || product.seller_account4) && (
                                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                        Seller SKUs & Accounts
                                    </h4>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[1, 2, 3, 4].map((num) => {
                                            const skuKey = `seller_sku${num}` as keyof Product;
                                            const accKey = `seller_account${num}` as keyof Product;
                                            const sku = product[skuKey] as string;
                                            const acc = product[accKey] as string;

                                            if (!sku && !acc) return null;

                                            return (
                                                <div
                                                    key={num}
                                                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
                                                >
                                                    <div className="flex justify-between">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                            Seller SKU {num}
                                                        </span>
                                                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                                            {sku || '-'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                            Store Account
                                                        </span>
                                                        <span className="font-medium text-slate-600 dark:text-slate-300">
                                                            {acc || '-'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Action */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/40">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                    {product && onEdit && (
                        <button
                            onClick={() => {
                                onClose();
                                onEdit(product.id);
                            }}
                            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                        >
                            <Edit3 size={14} /> Edit Product
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
