"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, X, RefreshCw, ChevronLeft, ChevronRight,
    Loader2, ShoppingCart, Printer, CheckSquare, Square
} from 'lucide-react';
import {
    getAllDarazOrdersAction,
    getSellerAccountsAction,
    updateDarazOrderStatusAction,
} from '@/app/actions/daraz-actions';
import { ViewDarazOrderModal } from '@/components/sales/ViewDarazOrderModal';

// ---------------------------------------------------------------------------
// Status badge style — mirrors inventory-webapp exactly
// ---------------------------------------------------------------------------
function getStatusStyle(status: string) {
    if (status === 'Pending') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200';
    if (status === 'Unpaid') return 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-gray-300';
    if (status === 'Packed') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200';
    if (status === 'Ready to Ship') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200';
    if (status === 'Shipped') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
    if (status === 'Delivered') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
    if (['Returning to Seller', 'Customer Return'].includes(status)) return 'bg-orange-50 text-orange-700 border border-orange-200';
    if (['Returned Delivered', 'Customer Return Delivered'].includes(status)) return 'bg-orange-100 text-orange-800 border border-orange-300';
    if (status === 'Cancel' || status === 'Cancelled') return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';
    return 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-gray-200';
}

function getItemStatusStyle(status: string) {
    const s = status.toLowerCase();
    if (s === 'pending') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (s === 'packed') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s === 'ready to ship' || s === 'ready_to_ship') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'shipped') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'delivered') return 'bg-green-50 text-green-700 border-green-200';
    if (['returning to seller', 'returning_to_seller', 'customer return', 'customer_return'].includes(s)) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (['returned delivered', 'returned_delivered', 'customer return delivered', 'customer_return_delivered'].includes(s)) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (s === 'cancel' || s === 'cancelled') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
}

// ---------------------------------------------------------------------------
// Normalize item_status label
// ---------------------------------------------------------------------------
function normalizeItemStatus(raw: string): string {
    if (!raw) return '';
    const map: Record<string, string> = {
        ready_to_ship: 'Ready to Ship',
        returned_delivered: 'Returned Delivered',
        customer_return_delivered: 'Customer Return Delivered',
        returning_to_seller: 'Returning to Seller',
        customer_return: 'Customer Return',
    };
    return map[raw.toLowerCase()] ?? raw;
}

// ---------------------------------------------------------------------------
// Pagination component
// ---------------------------------------------------------------------------
function Pagination({ page, totalPages, total, limit, onPageChange }: {
    page: number; totalPages: number; total: number; limit: number; onPageChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;

    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (page <= 3) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
    }

    return (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            <p className="text-xs text-slate-500">
                Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-0.5">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={i} className="px-1.5 text-xs text-slate-400">…</span>
                    ) : (
                        <button
                            key={i}
                            onClick={() => onPageChange(p as number)}
                            className={`min-w-[28px] h-7 rounded text-xs font-medium cursor-pointer ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function DarazOrderListView() {
    // Filters
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sellerAccountFilter, setSellerAccountFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [page, setPage] = useState(1);

    // Data
    const [orders, setOrders] = useState<any[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [sellerAccounts, setSellerAccounts] = useState<string[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState('');
    const [viewingOrder, setViewingOrder] = useState<any | null>(null);

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounce search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(searchInput);
            setPage(1);
        }, 400);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchInput]);

    // Load seller accounts once
    useEffect(() => {
        getSellerAccountsAction().then(setSellerAccounts);
    }, []);

    // Load orders when filters change
    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getAllDarazOrdersAction({
                page,
                limit: 50,
                search,
                status: statusFilter,
                sellerAccount: sellerAccountFilter,
                fromDate: startDate,
                toDate: endDate,
            });
            setOrders(result.orders);
            setPagination(result.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, statusFilter, sellerAccountFilter, startDate, endDate]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // Group by date (en-GB format: DD/MM/YYYY)
    const groupedOrders = orders.reduce<Record<string, any[]>>((acc, order) => {
        const date = new Date(order.order_date).toLocaleDateString('en-GB');
        if (!acc[date]) acc[date] = [];
        acc[date].push(order);
        return acc;
    }, {});

    // Customer frequency for duplicate highlighting
    const customerCounts = orders.reduce<Record<string, number>>((acc, o) => {
        acc[o.customer_name] = (acc[o.customer_name] || 0) + 1;
        return acc;
    }, {});
    const today = new Date().toISOString().split('T')[0];
    const customerCountsToday = orders.reduce<Record<string, number>>((acc, o) => {
        const d = new Date(o.order_date).toLocaleDateString('en-CA');
        if (d === today) acc[o.customer_name] = (acc[o.customer_name] || 0) + 1;
        return acc;
    }, {});

    const getCustomerClass = (name: string, dateStr: string) => {
        const d = new Date(dateStr).toLocaleDateString('en-CA');
        if (d === today && (customerCountsToday[name] || 0) > 1) return 'text-green-600 dark:text-green-400 font-bold';
        if ((customerCounts[name] || 0) > 1) return 'text-blue-600 dark:text-blue-400 font-bold';
        return 'text-slate-700 dark:text-slate-300';
    };

    const clearAll = () => {
        setSearchInput(''); setSearch('');
        setStatusFilter('all'); setSellerAccountFilter('all');
        setStartDate(''); setEndDate('');
        setPage(1); setSelectedIds(new Set());
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = (checked: boolean) => {
        setSelectedIds(checked ? new Set(orders.map(o => o.id)) : new Set());
    };

    const handleBulkStatus = async () => {
        if (!bulkStatus || selectedIds.size === 0) return;
        await updateDarazOrderStatusAction([...selectedIds], bulkStatus);
        setBulkStatus('');
        setSelectedIds(new Set());
        loadOrders();
    };

    const hasFilter = statusFilter !== 'all' || sellerAccountFilter !== 'all' || startDate || endDate || searchInput;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* ── Filter Bar ── */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 sticky top-0 z-10 shadow-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                    {/* Status */}
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 bg-white font-medium cursor-pointer"
                    >
                        <option value="all">All Status</option>
                        <option value="Unpaid">Unpaid</option>
                        <option value="Pending">Pending</option>
                        <option value="Packed">Packed</option>
                        <option value="Ready to Ship">Ready to Ship</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Returning to Seller">Returning to Seller</option>
                        <option value="Returned Delivered">Returned Delivered</option>
                        <option value="Customer Return">Customer Return</option>
                        <option value="Customer Return Delivered">Customer Return Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>

                    {/* Seller Account */}
                    <select
                        value={sellerAccountFilter}
                        onChange={e => { setSellerAccountFilter(e.target.value); setPage(1); }}
                        className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 bg-white cursor-pointer"
                    >
                        <option value="all">All Accounts</option>
                        {sellerAccounts.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    {/* Date Range */}
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => { setStartDate(e.target.value); setPage(1); }}
                        onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                        className="w-32 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 bg-white cursor-pointer"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => { setEndDate(e.target.value); setPage(1); }}
                        onClick={e => (e.currentTarget as HTMLInputElement).showPicker?.()}
                        className="w-32 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 bg-white cursor-pointer"
                    />

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                            type="text"
                            placeholder="Search order#, tracking#..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            className="w-full pl-7 pr-6 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100 bg-white"
                        />
                        {searchInput && (
                            <button onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Clear All */}
                    {hasFilter && (
                        <button
                            onClick={clearAll}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                            <X size={13} strokeWidth={2.5} /> Clear All
                        </button>
                    )}

                    {/* Refresh */}
                    <button
                        onClick={loadOrders}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Refresh"
                    >
                        {isLoading ? <Loader2 size={13} className="animate-spin text-slate-500" /> : <RefreshCw size={13} className="text-slate-500" />}
                    </button>

                    {/* Total count */}
                    <div className="ml-auto flex items-center gap-1 px-3 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
                        <span className="text-slate-500">Total:</span>
                        <span className="text-blue-600 dark:text-blue-400">{pagination.total}</span>
                    </div>
                </div>

                {/* Bulk actions */}
                {selectedIds.size > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{selectedIds.size} selected</span>
                        <select
                            value={bulkStatus}
                            onChange={e => setBulkStatus(e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded-lg dark:bg-slate-800 dark:text-slate-100 bg-white cursor-pointer"
                        >
                            <option value="">Change Status...</option>
                            {['Pending','Packed','Ready to Ship','Shipped','Delivered','Returning to Seller','Returned Delivered','Customer Return','Customer Return Delivered','Cancelled'].map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleBulkStatus}
                            disabled={!bulkStatus}
                            className="px-3 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Update
                        </button>
                        <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            <div className="flex-1 overflow-auto">
                <div className="bg-white dark:bg-slate-900">
                    <table className="w-full table-fixed border-collapse text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="px-1.5 py-2 w-8 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === orders.length && orders.length > 0}
                                        onChange={e => toggleSelectAll(e.target.checked)}
                                        className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                    />
                                </th>
                                <th className="px-1.5 py-2 w-9 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">SN</th>
                                <th className="px-1.5 py-2 w-20 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Date</th>
                                <th className="px-1.5 py-2 w-28 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Invoice</th>
                                <th className="px-1.5 py-2 w-32 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Order</th>
                                <th className="px-1.5 py-2 w-36 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Customer</th>
                                <th className="px-1.5 py-2 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Product</th>
                                <th className="px-1.5 py-2 w-20 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Product ID</th>
                                <th className="px-1.5 py-2 w-12 text-right text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Qty</th>
                                <th className="px-1.5 py-2 w-24 text-right text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Amount</th>
                                <th className="px-1.5 py-2 w-24 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Status</th>
                                <th className="px-1.5 py-2 w-44 text-left text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400">Item Statuses</th>
                            </tr>
                        </thead>

                        {isLoading ? (
                            <tbody>
                                <tr>
                                    <td colSpan={12} className="py-16 text-center text-slate-400">
                                        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                                        Loading orders...
                                    </td>
                                </tr>
                            </tbody>
                        ) : orders.length === 0 ? (
                            <tbody>
                                <tr>
                                    <td colSpan={12} className="py-16 text-center text-slate-400">
                                        <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
                                        No orders found.
                                    </td>
                                </tr>
                            </tbody>
                        ) : (
                            Object.entries(groupedOrders).map(([date, groupOrders]) => (
                                <tbody
                                    key={date}
                                    className="divide-y divide-slate-100 dark:divide-slate-800 border-b-4 border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900"
                                >
                                    {/* Date group header */}
                                    <tr className="bg-slate-50 dark:bg-slate-800/50">
                                        <td colSpan={12} className="px-2 py-1.5 border-y border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[13px] text-slate-700 dark:text-slate-300">{date}</span>
                                                <span className="text-xs px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-500 font-medium">
                                                    Total: {groupOrders.length}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Order rows */}
                                    {groupOrders.map((order, idx) => (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            {/* Checkbox */}
                                            <td className="px-1.5 py-1 text-center align-middle">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(order.id)}
                                                    onChange={() => toggleSelect(order.id)}
                                                    className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer"
                                                />
                                            </td>

                                            {/* SN */}
                                            <td className="px-1.5 py-1 text-xs text-slate-400 align-middle">
                                                {((page - 1) * 50) + idx + 1}
                                            </td>

                                            {/* Date */}
                                            <td className="px-1.5 py-1 text-xs text-slate-600 dark:text-slate-400 align-middle whitespace-nowrap">
                                                {new Date(order.order_date).toLocaleDateString('en-GB')}
                                            </td>

                                            {/* Invoice — clickable */}
                                            <td className="px-1.5 py-1 align-middle">
                                                <button
                                                    onClick={() => setViewingOrder(order)}
                                                    className="text-[12px] font-mono text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline cursor-pointer text-left break-all"
                                                    title={order.invoice_number}
                                                >
                                                    {order.invoice_number}
                                                </button>
                                            </td>

                                            {/* Order number */}
                                            <td className="px-1.5 py-1 text-xs text-slate-700 dark:text-slate-300 align-middle break-all">
                                                {order.order_number}
                                            </td>

                                            {/* Customer — colored if duplicate */}
                                            <td
                                                className={`px-1.5 py-1 text-xs align-middle truncate ${getCustomerClass(order.customer_name, order.order_date)}`}
                                                title={order.customer_name}
                                            >
                                                {order.customer_name}
                                            </td>

                                            {/* Product — truncated with +N more on hover */}
                                            <td className="px-1.5 py-1 text-xs align-middle">
                                                <div
                                                    className="truncate max-w-full"
                                                    title={order.item_count > 1
                                                        ? (order.items || []).map((i: any) => i.product_name || i.seller_sku).join(', ')
                                                        : order.first_product_name}
                                                >
                                                    <span className={order.first_product_name === 'Product Not Found'
                                                        ? 'text-red-600 font-semibold'
                                                        : 'text-slate-700 dark:text-slate-300'}>
                                                        {order.first_product_name}
                                                    </span>
                                                    {order.item_count > 1 && (
                                                        <span className="ml-1 text-[10px] text-blue-500 whitespace-nowrap">
                                                            +{order.item_count - 1} more
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Product ID */}
                                            <td className="px-1.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 align-middle">
                                                {order.first_product_code ? `#${order.first_product_code}` : '-'}
                                            </td>

                                            {/* Qty */}
                                            <td className="px-1.5 py-1 text-xs text-right text-slate-700 dark:text-slate-300 align-middle">
                                                {order.total_quantity}
                                            </td>

                                            {/* Amount */}
                                            <td className="px-1.5 py-1 text-xs text-right font-medium text-slate-700 dark:text-slate-300 align-middle whitespace-nowrap">
                                                Rs. {Number(order.grand_total || 0).toLocaleString('en-NP')}
                                            </td>

                                            {/* Status badge */}
                                            <td className="px-1.5 py-1 align-middle">
                                                <span className={`px-1.5 py-0.5 text-[11px] font-semibold rounded ${getStatusStyle(order.order_status)}`}>
                                                    {order.order_status}
                                                </span>
                                            </td>

                                            {/* Item Statuses */}
                                            <td className="px-1.5 py-1 align-middle">
                                                <div className="flex flex-wrap gap-0.5">
                                                    {(order.item_statuses || []).length > 0 ? (
                                                        order.item_statuses.map((rawSt: string, si: number) => {
                                                            const st = normalizeItemStatus(rawSt);
                                                            if (!st) return null;
                                                            return (
                                                                <span
                                                                    key={si}
                                                                    className={`px-1 py-0.5 text-[10px] font-medium rounded border ${getItemStatusStyle(st)}`}
                                                                >
                                                                    &quot;{st}&quot;
                                                                </span>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-slate-600 text-xs">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            ))
                        )}
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    limit={pagination.limit}
                    onPageChange={p => setPage(p)}
                />
            </div>

            {/* Order Details Modal */}
            {viewingOrder && (
                <ViewDarazOrderModal
                    order={viewingOrder}
                    isOpen={!!viewingOrder}
                    onClose={() => setViewingOrder(null)}
                    onRefresh={loadOrders}
                />
            )}
        </div>
    );
}
