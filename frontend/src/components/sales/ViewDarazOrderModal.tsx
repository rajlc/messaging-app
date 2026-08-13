"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Clock, Loader2 } from 'lucide-react';
import { getDarazOrderByIdAction } from '@/app/actions/daraz-actions';

interface ViewDarazOrderModalProps {
    order: any | null;
    isOpen: boolean;
    onClose: () => void;
    onRefresh?: () => void;
}

export function ViewDarazOrderModal({ order, isOpen, onClose }: ViewDarazOrderModalProps) {
    const [fullOrder, setFullOrder] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (order?.id && isOpen) {
            setIsLoading(true);
            getDarazOrderByIdAction(order.id)
                .then((data) => setFullOrder(data || order))
                .catch(() => setFullOrder(order))
                .finally(() => setIsLoading(false));
        } else {
            setFullOrder(order);
        }
    }, [order, isOpen]);

    const activeOrder = fullOrder || order;

    // Extract customer email from items_detail if present
    const customerEmail = useMemo(() => {
        if (!activeOrder) return null;
        if (activeOrder.customer_email || activeOrder.email) {
            return activeOrder.customer_email || activeOrder.email;
        }
        if (Array.isArray(activeOrder.items_detail)) {
            const itemWithEmail = activeOrder.items_detail.find(
                (item: any) => item.digital_delivery_info && item.digital_delivery_info.trim()
            );
            if (itemWithEmail) return itemWithEmail.digital_delivery_info.trim();
        }
        return null;
    }, [activeOrder]);

    if (!isOpen || !order) return null;

    const items = activeOrder?.items || activeOrder?.daraz_order_items || [];

    const formatTimestamp = (timestamp: string | null | undefined, userName?: string | null, userEmail?: string | null) => {
        if (!timestamp) return null;
        const dt = new Date(timestamp).toLocaleString('en-US', {
            month: 'numeric', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true
        });
        const by = userName || userEmail || 'Daraz sync';
        return `${dt} by ${by}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
                {/* Header — Header only has Title, Invoice subtitle and Close button. NO Edit, NO Delete, NO Print */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Order Details</h2>
                        <p className="text-xs text-slate-500 font-mono">{activeOrder?.invoice_number || order.invoice_number}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {isLoading ? (
                        <div className="py-16 text-center text-slate-400">
                            <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                            Loading order details...
                        </div>
                    ) : (
                        <>
                            {/* Card 1: Order Information */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Information</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Invoice Number</span>
                                        <strong className="font-mono text-blue-600 dark:text-blue-400 font-bold text-sm">
                                            {activeOrder?.invoice_number || '-'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Order Number</span>
                                        <strong className="font-mono text-slate-900 dark:text-white font-bold text-sm">
                                            {activeOrder?.order_number || '-'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Tracking Number</span>
                                        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                            {activeOrder?.tracking_number || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Order Date</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {activeOrder?.order_date ? new Date(activeOrder.order_date).toLocaleDateString('en-US') : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Customer & Status */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer & Status</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Customer Name</span>
                                        <strong className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                                            {activeOrder?.customer_name || 'Unknown'}
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Customer Phone</span>
                                        {activeOrder?.shipping_phone || activeOrder?.customer_phone || activeOrder?.phone ? (
                                            <a
                                                href={`tel:${activeOrder?.shipping_phone || activeOrder?.customer_phone || activeOrder?.phone}`}
                                                className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline select-all"
                                                title="Click or double click to select phone"
                                            >
                                                {activeOrder?.shipping_phone || activeOrder?.customer_phone || activeOrder?.phone}
                                            </a>
                                        ) : (
                                            <span className="font-mono text-slate-400">-</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Customer Email</span>
                                        {customerEmail ? (
                                            <a
                                                href={`mailto:${customerEmail}`}
                                                className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline select-all break-all"
                                                title="Click or double click to select email"
                                            >
                                                {customerEmail}
                                            </a>
                                        ) : (
                                            <span className="font-mono text-slate-400">-</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Order Date</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {activeOrder?.created_at || activeOrder?.daraz_created_at || activeOrder?.order_date
                                                ? new Date(activeOrder.daraz_created_at || activeOrder.created_at || activeOrder.order_date).toLocaleString('en-US')
                                                : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Status</span>
                                        <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                                            {activeOrder?.order_status || 'Pending'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block mb-0.5">Remarks</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                            {activeOrder?.remarks || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Order Items */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Items</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                                <th className="py-2 pr-2">#</th>
                                                <th className="py-2 pr-2">Seller SKU</th>
                                                <th className="py-2 pr-2">Product Name</th>
                                                <th className="py-2 pr-2">Product ID</th>
                                                <th className="py-2 pr-2">Seller Account</th>
                                                <th className="py-2 pr-2">Status</th>
                                                <th className="py-2 pr-2 text-right">Qty</th>
                                                <th className="py-2 pr-2 text-right">Amount</th>
                                                <th className="py-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                                            {items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="py-4 text-center text-slate-400">No items listed</td>
                                                </tr>
                                            ) : (
                                                items.map((item: any, idx: number) => {
                                                    const prodCode = item.product_code || (item.product?.product_id ? String(item.product.product_id) : null);
                                                    const itemQty = Number(item.quantity || 1);
                                                    const itemAmt = Number(item.amount || 0);
                                                    const itemTot = itemQty * itemAmt;

                                                    return (
                                                        <tr key={idx}>
                                                            <td className="py-2 pr-2 font-mono text-slate-400">{idx + 1}</td>
                                                            <td className="py-2 pr-2 font-mono font-bold text-slate-800 dark:text-slate-200">{item.seller_sku}</td>
                                                            <td className="py-2 pr-2 font-medium text-slate-700 dark:text-slate-300">{item.product_name || item.seller_sku}</td>
                                                            <td className="py-2 pr-2 font-mono text-slate-600 dark:text-slate-400 font-semibold">
                                                                {prodCode ? `#${prodCode}` : '-'}
                                                            </td>
                                                            <td className="py-2 pr-2 text-slate-600 dark:text-slate-400">{item.seller_account || activeOrder?.seller_account || 'Bagmati Traders'}</td>
                                                            <td className="py-2 pr-2">
                                                                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                                    {item.item_status || activeOrder?.order_status || 'Pending'}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 pr-2 text-right font-bold">{itemQty}</td>
                                                            <td className="py-2 pr-2 text-right font-mono">Rs. {itemAmt.toLocaleString('en-NP')}</td>
                                                            <td className="py-2 text-right font-mono font-bold">Rs. {itemTot.toLocaleString('en-NP')}</td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                        {items.length > 0 && (
                                            <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 font-bold bg-slate-100/50 dark:bg-slate-800/50">
                                                <tr>
                                                    <td colSpan={6} className="py-2 pr-2 text-right uppercase text-[10px] text-slate-500">Total:</td>
                                                    <td className="py-2 pr-2 text-right text-xs">{activeOrder?.total_quantity || items.reduce((s: number, i: any) => s + Number(i.quantity || 1), 0)}</td>
                                                    <td colSpan={2} className="py-2 text-right text-xs font-mono text-blue-600 dark:text-blue-400">
                                                        Rs. {Number(activeOrder?.grand_total || activeOrder?.total_amount || 0).toLocaleString('en-NP')}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>

                            {/* Card 4: Audit Trail */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Audit Trail</h3>
                                <div className="space-y-2 text-xs">
                                    {(activeOrder?.created_at || activeOrder?.order_date) && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-slate-400 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">Created: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.created_at || activeOrder.order_date, activeOrder.created_by_name, activeOrder.created_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.edited_at && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-slate-400 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">Edited: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.edited_at, activeOrder.edited_by_name, activeOrder.edited_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.shipped_at && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-blue-500 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-blue-600 dark:text-blue-400">Shipped: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.shipped_at, activeOrder.shipped_by_name, activeOrder.shipped_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.delivered_at && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-emerald-500 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Delivered: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.delivered_at, activeOrder.delivered_by_name, activeOrder.delivered_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.delivered_by_daraz && (
                                        <div className="flex items-start gap-2">
                                            <Clock size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-emerald-800 dark:text-emerald-300">Delivered by Daraz: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.delivered_by_daraz)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.delivery_failed_at && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-red-500 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-red-600 dark:text-red-400">Delivery Failed: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.delivery_failed_at, activeOrder.delivery_failed_by_name, activeOrder.delivery_failed_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.returning_to_seller_at && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-orange-500 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-orange-600 dark:text-orange-400">Returning to Seller: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.returning_to_seller_at, activeOrder.returning_to_seller_by_name, activeOrder.returning_to_seller_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.customer_return_at && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-purple-500 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-purple-600 dark:text-purple-400">Customer Return: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.customer_return_at, activeOrder.customer_return_by_name, activeOrder.customer_return_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.customer_return_delivered_at && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-purple-500 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-purple-600 dark:text-purple-400">Customer Return Delivered: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.customer_return_delivered_at, activeOrder.customer_return_delivered_by_name, activeOrder.customer_return_delivered_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {activeOrder?.cancelled_at && (
                                        <div className="flex items-start gap-2">
                                            <Calendar size={14} className="mt-0.5 text-slate-400 shrink-0" />
                                            <div>
                                                <span className="font-semibold text-slate-600 dark:text-slate-400">Cancelled: </span>
                                                <span className="text-slate-600 dark:text-slate-400">
                                                    {formatTimestamp(activeOrder.cancelled_at, activeOrder.cancelled_by_name, activeOrder.cancelled_by_email)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
