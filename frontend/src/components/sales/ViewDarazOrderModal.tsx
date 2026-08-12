"use client";

import React, { useState } from 'react';
import { X, Package, Calendar, User, FileText, CheckCircle2, Clock } from 'lucide-react';
import { updateDarazOrderAction } from '@/app/actions/daraz-actions';

interface ViewDarazOrderModalProps {
    order: any | null;
    isOpen: boolean;
    onClose: () => void;
    onRefresh: () => void;
}

export function ViewDarazOrderModal({ order, isOpen, onClose, onRefresh }: ViewDarazOrderModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [orderNumber, setOrderNumber] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [orderDate, setOrderDate] = useState('');
    const [orderStatus, setOrderStatus] = useState('');
    const [sellerAccount, setSellerAccount] = useState('');
    const [remarks, setRemarks] = useState('');

    React.useEffect(() => {
        if (order) {
            setOrderNumber(order.order_number || '');
            setTrackingNumber(order.tracking_number || '');
            setCustomerName(order.customer_name || '');
            setOrderDate(order.order_date ? new Date(order.order_date).toISOString().split('T')[0] : '');
            setOrderStatus(order.order_status || 'Pending');
            setSellerAccount(order.seller_account || 'Bagmati Traders');
            setRemarks(order.remarks || '');
        }
    }, [order]);

    if (!isOpen || !order) return null;

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await updateDarazOrderAction(order.id, {
                order_number: orderNumber,
                tracking_number: trackingNumber,
                customer_name: customerName,
                order_date: orderDate,
                order_status: orderStatus,
                seller_account: sellerAccount,
                remarks: remarks,
            });
            alert('Order updated successfully');
            setIsEditing(false);
            onRefresh();
            onClose();
        } catch (err: any) {
            alert(err.message || 'Failed to update order');
        } finally {
            setIsSaving(false);
        }
    };

    const items = order.items || order.daraz_order_items || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                    <div>
                        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Order Details</h2>
                        <p className="text-xs text-slate-500 font-mono">{order.invoice_number}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                            >
                                Edit Order
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {isSaving ? 'Saving...' : 'Save'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Order Information Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Information</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 block mb-0.5">Invoice Number</span>
                                <strong className="font-mono text-blue-600 dark:text-blue-400 font-bold text-sm">
                                    {order.invoice_number || '-'}
                                </strong>
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Order Number</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                                    />
                                ) : (
                                    <strong className="font-mono text-slate-900 dark:text-white font-bold">
                                        {order.order_number}
                                    </strong>
                                )}
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Tracking Number</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={trackingNumber}
                                        onChange={(e) => setTrackingNumber(e.target.value)}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                                    />
                                ) : (
                                    <span className="font-mono font-medium">{order.tracking_number || '-'}</span>
                                )}
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Order Date</span>
                                {isEditing ? (
                                    <input
                                        type="date"
                                        value={orderDate}
                                        onChange={(e) => setOrderDate(e.target.value)}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                                    />
                                ) : (
                                    <span className="font-medium">
                                        {order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB') : '-'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Customer & Status Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer & Status</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 block mb-0.5">Customer Name</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                                    />
                                ) : (
                                    <strong className="font-semibold text-slate-900 dark:text-slate-100">
                                        {order.customer_name || 'Unknown'}
                                    </strong>
                                )}
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Seller Account</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={sellerAccount}
                                        onChange={(e) => setSellerAccount(e.target.value)}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                                    />
                                ) : (
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {order.seller_account || 'Bagmati Traders'}
                                    </span>
                                )}
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Status</span>
                                {isEditing ? (
                                    <select
                                        value={orderStatus}
                                        onChange={(e) => setOrderStatus(e.target.value)}
                                        className="w-full px-2 py-1 bg-white dark:bg-slate-900 border rounded-lg"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Packed">Packed</option>
                                        <option value="Ready to Ship">Ready to Ship</option>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                ) : (
                                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                                        {order.order_status}
                                    </span>
                                )}
                            </div>
                        </div>

                        {order.remarks && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                <span className="text-slate-400 block mb-0.5 text-xs">Remarks / Note</span>
                                <p className="text-xs italic text-slate-700 dark:text-slate-300">{order.remarks}</p>
                            </div>
                        )}
                    </div>

                    {/* Order Items Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Order Items</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                        <th className="py-2 pr-2">#</th>
                                        <th className="py-2 pr-2">Seller SKU</th>
                                        <th className="py-2 pr-2">Product Name</th>
                                        <th className="py-2 pr-2 text-center">Qty</th>
                                        <th className="py-2 pr-2 text-right">Amount</th>
                                        <th className="py-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-4 text-center text-slate-400">No items listed</td>
                                        </tr>
                                    ) : (
                                        items.map((item: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="py-2 pr-2 font-mono text-slate-400">{idx + 1}</td>
                                                <td className="py-2 pr-2 font-mono font-bold text-slate-800 dark:text-slate-200">{item.seller_sku}</td>
                                                <td className="py-2 pr-2 font-medium text-slate-700 dark:text-slate-300">{item.product_name || item.seller_sku}</td>
                                                <td className="py-2 pr-2 text-center font-bold">{item.quantity || 1}</td>
                                                <td className="py-2 pr-2 text-right font-mono">Rs. {Number(item.amount || 0).toLocaleString()}</td>
                                                <td className="py-2 text-right font-mono font-bold">Rs. {(Number(item.quantity || 1) * Number(item.amount || 0)).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
