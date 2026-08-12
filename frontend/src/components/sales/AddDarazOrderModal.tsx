"use client";

import React, { useState } from 'react';
import { X, Plus, Package, Trash2 } from 'lucide-react';
import { createDarazOrderAction } from '@/app/actions/daraz-actions';

interface AddDarazOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface OrderItemInput {
    seller_sku: string;
    seller_account: string;
    product_name: string;
    quantity: number;
    amount: number;
    total_amount: number;
}

export function AddDarazOrderModal({ isOpen, onClose, onSuccess }: AddDarazOrderModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [orderNumber, setOrderNumber] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [orderStatus, setOrderStatus] = useState('Pending');
    const [sellerAccount, setSellerAccount] = useState('Bagmati Traders');
    const [remarks, setRemarks] = useState('');

    const [items, setItems] = useState<OrderItemInput[]>([
        {
            seller_sku: '',
            seller_account: '',
            product_name: '',
            quantity: 1,
            amount: 0,
            total_amount: 0,
        },
    ]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        setItems((prev) => [
            ...prev,
            {
                seller_sku: '',
                seller_account: sellerAccount,
                product_name: '',
                quantity: 1,
                amount: 0,
                total_amount: 0,
            },
        ]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) {
            setError('At least one item is required');
            return;
        }
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof OrderItemInput, value: any) => {
        setItems((prev) => {
            const updated = [...prev];
            const currentItem = { ...updated[index], [field]: value };
            if (field === 'quantity' || field === 'amount') {
                currentItem.total_amount = (currentItem.quantity || 0) * (currentItem.amount || 0);
            }
            updated[index] = currentItem;
            return updated;
        });
    };

    const calculateTotals = () => {
        const totalQty = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        const totalAmount = items.reduce((sum, item) => sum + (item.total_amount || 0), 0);
        return { totalQty, totalAmount };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!orderNumber.trim()) {
            setError('Order number is required');
            return;
        }
        if (!customerName.trim()) {
            setError('Customer name is required');
            return;
        }
        if (items.some((i) => !i.seller_sku.trim())) {
            setError('All items must have a Seller SKU');
            return;
        }

        setIsSubmitting(true);
        try {
            await createDarazOrderAction({
                order_number: orderNumber.trim(),
                tracking_number: trackingNumber.trim() || undefined,
                customer_name: customerName.trim(),
                order_date: orderDate,
                order_status: orderStatus,
                seller_account: sellerAccount,
                remarks: remarks.trim() || undefined,
                items: items.map((i) => ({
                    seller_sku: i.seller_sku.trim(),
                    product_name: i.product_name.trim() || undefined,
                    quantity: i.quantity || 1,
                    amount: i.amount || 0,
                    seller_account: i.seller_account || sellerAccount,
                })),
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create order');
        } finally {
            setIsSubmitting(false);
        }
    };

    const { totalQty, totalAmount } = calculateTotals();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2">
                        <Package className="text-orange-500" size={20} />
                        <h2 className="text-lg font-bold tracking-tight">Add Daraz Order Entry</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                            {error}
                        </div>
                    )}

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Order Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Order Number <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="216322781832060"
                                value={orderNumber}
                                onChange={(e) => setOrderNumber(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Tracking Number
                            </label>
                            <input
                                type="text"
                                placeholder="Optional tracking #"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Customer Name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Enter customer name"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Seller Account <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={sellerAccount}
                                onChange={(e) => setSellerAccount(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer"
                            >
                                <option value="Bagmati Traders">Bagmati Traders</option>
                                <option value="BTAS">BTAS</option>
                                <option value="Balaju Shop">Balaju Shop</option>
                                <option value="Prakash Shop">Prakash Shop</option>
                                <option value="Subash Store">Subash Store</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Order Status <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={orderStatus}
                                onChange={(e) => setOrderStatus(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer"
                            >
                                <option value="Pending">Pending</option>
                                <option value="Packed">Packed</option>
                                <option value="Ready to Ship">Ready to Ship</option>
                                <option value="Shipped">Shipped</option>
                                <option value="Delivered">Delivered</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Order Items Table Section */}
                    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Order Items
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="px-3 py-1 text-xs font-bold rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <Plus size={13} /> Add Item
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 items-end"
                                >
                                    <div className="sm:col-span-4">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                            Seller SKU *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="SKU Code"
                                            value={item.seller_sku}
                                            onChange={(e) => handleItemChange(idx, 'seller_sku', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                        />
                                    </div>

                                    <div className="sm:col-span-4">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                            Product Name
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Item name (optional)"
                                            value={item.product_name}
                                            onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                                        />
                                    </div>

                                    <div className="sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1 text-center">
                                            Qty
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-center"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                                            Price (Rs.)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={item.amount}
                                            onChange={(e) => handleItemChange(idx, 'amount', Number(e.target.value))}
                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-right"
                                        />
                                    </div>

                                    <div className="sm:col-span-1 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(idx)}
                                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Remarks Section */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Remarks / Notes
                        </label>
                        <textarea
                            rows={2}
                            placeholder="Add any specific delivery or order instructions..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 resize-none"
                        />
                    </div>

                    {/* Order Summary Total Bar */}
                    <div className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/40 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                            Total Quantity: <strong className="text-orange-600 dark:text-orange-400 font-mono text-sm">{totalQty}</strong>
                        </span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                            Total Amount: <strong className="text-orange-600 dark:text-orange-400 font-mono text-sm">Rs. {totalAmount.toLocaleString()}</strong>
                        </span>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-2 text-xs font-bold rounded-xl bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-orange-500/20"
                        >
                            {isSubmitting ? 'Saving Order...' : 'Save Order Entry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
