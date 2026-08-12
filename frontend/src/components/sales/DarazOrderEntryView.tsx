"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Search,
    Plus,
    Upload,
    Download,
    RefreshCw,
    X,
    ArrowLeft,
    Trash2,
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Package,
    CheckSquare,
    Square,
    Printer,
    FileX,
    List
} from 'lucide-react';
import {
    getDarazOrdersAction,
    getDarazOrderStatsAction,
    getOrdersStockInfoAction,
    updateDarazOrderStatusAction,
    deleteDarazOrderAction,
    syncDarazOrderProductsAction
} from '@/app/actions/daraz-actions';
import { AddDarazOrderModal } from '@/components/sales/AddDarazOrderModal';
import { ViewDarazOrderModal } from '@/components/sales/ViewDarazOrderModal';

interface CustomerRemarksTooltipProps {
    remarks: string;
}

function CustomerRemarksTooltip({ remarks }: CustomerRemarksTooltipProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    return (
        <div
            className="relative z-20 hover:z-30 inline-block shrink-0"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={(e) => {
                e.stopPropagation();
                alert(`Remarks / Note:\n\n${remarks}`);
            }}
        >
            <button
                type="button"
                className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors focus:outline-none flex items-center justify-center p-0.5 cursor-pointer"
                title="Click to view full note"
            >
                <MessageSquare size={13} />
            </button>

            {showTooltip && (
                <div className="absolute z-50 bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-900 text-white border border-slate-700 rounded-lg shadow-lg p-2.5 min-w-[200px] max-w-[300px] whitespace-normal text-left text-[11px] leading-snug font-normal">
                    <div className="font-bold text-amber-400 mb-0.5">Remarks / Note:</div>
                    <div className="italic break-words text-slate-200">{remarks}</div>
                </div>
            )}
        </div>
    );
}

export function DarazOrderEntryView() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Query & Pagination states
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(1000);
    const [searchInput, setSearchInput] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sellerAccountFilter, setSellerAccountFilter] = useState('all');
    const [unprintedOnly, setUnprintedOnly] = useState(false);
    const [bulkStatus, setBulkStatus] = useState('');

    // Data states
    const [orders, setOrders] = useState<any[]>([]);
    const [stockInfo, setStockInfo] = useState<Record<string, any>>({});
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Stats
    const [stats, setStats] = useState({ pending: 0, packed: 0, readyToShip: 0, shipped: 0 });

    // Modals & Selections
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [viewingOrder, setViewingOrder] = useState<any | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Debounce search input (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchInput);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getDarazOrdersAction({
                page,
                limit,
                status: statusFilter,
                search: searchQuery,
                sellerAccount: sellerAccountFilter,
                unprintedOnly,
                todayOnly: true,
            });

            setOrders(data.orders);
            setTotalCount(data.pagination.total);
            setTotalPages(data.pagination.totalPages);

            const statsData = await getDarazOrderStatsAction('all');
            setStats(statsData);

            // Fetch stock info for loaded order IDs
            const orderIds = data.orders.map((o: any) => o.id);
            if (orderIds.length > 0) {
                const stockData = await getOrdersStockInfoAction(orderIds);
                setStockInfo(stockData);
            }
        } catch (err: any) {
            console.error('Error fetching Daraz orders:', err);
            setError(err.message || 'Failed to load Daraz orders');
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, statusFilter, searchQuery, sellerAccountFilter, unprintedOnly]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const handleClearFilters = () => {
        setSearchInput('');
        setSearchQuery('');
        setStatusFilter('all');
        setSellerAccountFilter('all');
        setUnprintedOnly(false);
        setBulkStatus('');
        setPage(1);
    };

    const handleBackToSales = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', 'sales');
        params.set('subView', 'daraz');
        router.push(`/?${params.toString()}`);
    };

    const handleDeleteOrder = async (order: any) => {
        const confirmed = window.confirm(`Are you sure to delete order #${order.order_number}?`);
        if (!confirmed) return;

        try {
            await deleteDarazOrderAction(order.id);
            alert('Delete successful!');
            loadOrders();
        } catch (err: any) {
            alert(`Failed to delete order: ${err.message}`);
        }
    };

    const handleSyncSingleProduct = async (order: any) => {
        if (!window.confirm(`Sync inventory product details for order #${order.order_number}?`)) return;
        try {
            const res = await syncDarazOrderProductsAction(order.id);
            alert(res.message);
            loadOrders();
        } catch (err: any) {
            alert(`Sync error: ${err.message}`);
        }
    };

    const handleBulkStatusUpdate = async () => {
        if (selectedIds.size === 0 || !bulkStatus) {
            alert('Please select orders and a status');
            return;
        }

        try {
            await updateDarazOrderStatusAction(Array.from(selectedIds), bulkStatus);
            alert(`Updated ${selectedIds.size} orders to ${bulkStatus}`);
            setSelectedIds(new Set());
            setBulkStatus('');
            loadOrders();
        } catch (err: any) {
            alert(err.message || 'Failed to update status');
        }
    };

    const toggleSelectGroup = (checked: boolean, groupOrders: any[]) => {
        const groupIds = groupOrders.map((o) => o.id);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) {
                groupIds.forEach((id) => next.add(id));
            } else {
                groupIds.forEach((id) => next.delete(id));
            }
            return next;
        });
    };

    const toggleSelectRow = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Calculate customer frequency for highlight
    const customerCounts = useMemo(() => {
        return orders.reduce((acc: { [key: string]: number }, order) => {
            const name = order.customer_name?.toLowerCase().trim() || '';
            if (name) acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {});
    }, [orders]);

    const customerCountsByDate = useMemo(() => {
        return orders.reduce((acc: { [key: string]: number }, order) => {
            const name = order.customer_name?.toLowerCase().trim() || '';
            const date = new Date(order.order_date).toLocaleDateString('en-CA');
            const key = `${name}|${date}`;
            if (name) acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }, [orders]);

    const getCustomerClass = (name: string, dateStr: string) => {
        const n = name?.toLowerCase().trim() || '';
        const date = new Date(dateStr).toLocaleDateString('en-CA');
        const dateKey = `${n}|${date}`;

        if (customerCountsByDate[dateKey] > 1) {
            return 'text-emerald-600 dark:text-emerald-400 font-bold';
        }
        if (customerCounts[n] > 1) {
            return 'text-blue-600 dark:text-blue-400 font-bold';
        }
        return 'text-slate-800 dark:text-slate-200';
    };

    // Memoize duplicate order numbers
    const duplicateOrderNumbers = useMemo(() => {
        const counts: { [key: string]: number } = {};
        orders.forEach((order) => {
            counts[order.order_number] = (counts[order.order_number] || 0) + 1;
        });
        return Object.keys(counts).filter((orderNumber) => counts[orderNumber] > 1);
    }, [orders]);

    // Grouping Orders by Seller Account
    const groupedOrders = useMemo(() => {
        if (!orders.length) return [];

        const statusPriority: Record<string, number> = {
            pending: 1,
            packed: 2,
            'ready to ship': 3,
            shipped: 4,
            cancelled: 5,
            delivered: 6,
        };

        const getStatusRank = (st: string) => statusPriority[(st || '').toLowerCase()] || 99;

        const groups: Record<string, typeof orders> = {};
        orders.forEach((order) => {
            const seller = order.seller_account || 'Bagmati Traders';
            if (!groups[seller]) groups[seller] = [];
            groups[seller].push(order);
        });

        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (a === 'Account Not Found') return -1;
            if (b === 'Account Not Found') return 1;
            return (groups[b]?.length || 0) - (groups[a]?.length || 0);
        });

        sortedKeys.forEach((key) => {
            groups[key].sort((a, b) => {
                const rankA = getStatusRank(a.order_status);
                const rankB = getStatusRank(b.order_status);
                if (rankA !== rankB) return rankA - rankB;
                return new Date(b.order_date).getTime() - new Date(a.order_date).getTime();
            });
        });

        return sortedKeys.map((key) => ({
            seller: key,
            orders: groups[key],
        }));
    }, [orders]);

    const getStatusColor = (status: string) => {
        const s = (status || '').toLowerCase();
        if (s === 'pending') return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
        if (s === 'packed') return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50';
        if (s === 'ready to ship') return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
        if (s === 'shipped') return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
        if (s === 'delivered') return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
        if (s === 'cancelled' || s === 'cancel') return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    };

    // Stock Indicator Component
    const StockIndicator = ({ orderId, order }: { orderId: string; order: any }) => {
        const orderStockInfo = stockInfo[orderId];
        const [showTooltip, setShowTooltip] = useState(false);

        if (order?.order_status?.toLowerCase() === 'shipped') return null;
        if (!orderStockInfo || orderStockInfo.total_count === 0) return null;

        const { products, in_stock_count, total_count } = orderStockInfo;

        const getStockColor = (stock: number) => {
            if (stock > 10) return 'text-emerald-600 dark:text-emerald-400';
            if (stock > 0) return 'text-amber-600 dark:text-amber-400';
            return 'text-rose-600 dark:text-rose-400';
        };

        if (total_count === 1) {
            const stock = products[0].total_stock;
            return (
                <div className={`flex items-center gap-1 text-[11px] font-bold ${getStockColor(stock)}`} title={`Stock: ${stock}`}>
                    <Package size={14} />
                    <span>{stock}</span>
                </div>
            );
        }

        const allInStock = in_stock_count === total_count;
        const someInStock = in_stock_count > 0 && in_stock_count < total_count;
        const badgeColor = allInStock
            ? 'text-emerald-600 dark:text-emerald-400'
            : someInStock
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-rose-600 dark:text-rose-400';

        return (
            <div className="relative" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
                <div className={`flex items-center gap-1 text-[11px] font-bold cursor-help ${badgeColor}`}>
                    <Package size={15} />
                    <span>{in_stock_count}/{total_count}</span>
                </div>

                {showTooltip && (
                    <div className="absolute z-50 bottom-full mb-2 right-0 bg-slate-900 text-white border border-slate-700 rounded-lg shadow-lg p-2.5 min-w-[180px]">
                        <div className="text-[11px] font-bold mb-1 text-amber-400">Stock Details:</div>
                        <div className="space-y-1">
                            {products.map((p: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[10px]">
                                    <span className="truncate max-w-[120px] text-slate-300" title={p.product_name}>
                                        {p.product_name}
                                    </span>
                                    <span className={`font-bold ml-2 ${getStockColor(p.total_stock)}`}>
                                        {p.total_stock}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Fallback stats computation directly from loaded orders
    const displayStats = useMemo(() => {
        if (stats.pending > 0 || stats.packed > 0 || stats.readyToShip > 0 || stats.shipped > 0) {
            return stats;
        }
        const counts = { pending: 0, packed: 0, readyToShip: 0, shipped: 0 };
        orders.forEach((o) => {
            const st = (o.order_status || '').trim();
            if (st === 'Pending') counts.pending++;
            else if (st === 'Packed') counts.packed++;
            else if (st === 'Ready to Ship') counts.readyToShip++;
            else if (st === 'Shipped') counts.shipped++;
        });
        return counts;
    }, [stats, orders]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 overflow-y-auto">
            {/* Top Bar Header */}
            <div className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between gap-3">
                {/* Left: Title */}
                <div className="w-1/4">
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Daraz Sales</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Order Management</p>
                </div>

                {/* Center: Stats Pills Bar for All Sellers */}
                <div className="flex items-center justify-center gap-2 flex-1">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-xs font-semibold">
                        Pending: <strong>{displayStats.pending}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50 text-xs font-semibold">
                        Packed: <strong>{displayStats.packed}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold">
                        Ready: <strong>{displayStats.readyToShip}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 text-xs font-semibold">
                        Shipped: <strong>{displayStats.shipped}</strong>
                    </span>
                </div>

                {/* Right: Back to Sales Button */}
                <div className="w-1/4 flex justify-end">
                    <button
                        onClick={handleBackToSales}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                        <ArrowLeft size={14} /> Back to Sales
                    </button>
                </div>
            </div>

            {/* Toolbar & Filters */}
            <div className="p-4 space-y-3">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left Filters */}
                    <div className="flex flex-wrap items-center gap-2 flex-1">
                        {/* Seller Account Selector */}
                        <select
                            value={sellerAccountFilter}
                            onChange={(e) => {
                                setSellerAccountFilter(e.target.value);
                                setPage(1);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Sellers</option>
                            <option value="Bagmati Traders">Bagmati Traders</option>
                            <option value="BTAS">BTAS</option>
                            <option value="Balaju Shop">Balaju Shop</option>
                            <option value="Prakash Shop">Prakash Shop</option>
                            <option value="Subash Store">Subash Store</option>
                        </select>

                        {/* Order Status Selector */}
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="Pending">Pending</option>
                            <option value="Packed">Packed</option>
                            <option value="Ready to Ship">Ready to Ship</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>

                        {/* Unprinted Toggle */}
                        <button
                            type="button"
                            onClick={() => setUnprintedOnly(!unprintedOnly)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                                unprintedOnly
                                    ? 'bg-amber-500 text-white border-amber-600'
                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <FileX size={13} /> Unprinted Invoices
                        </button>

                        {/* Search Bar */}
                        <div className="relative flex-1 min-w-[180px] max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search order#, tracking#..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none"
                            />
                            {searchInput && (
                                <button
                                    onClick={() => setSearchInput('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Add Button */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                            <Plus size={14} /> Add
                        </button>

                        {/* Clear Filters */}
                        <button
                            onClick={handleClearFilters}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <X size={13} /> Clear
                        </button>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBackToSales}
                            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <List size={13} /> Sales Dashboard
                        </button>

                        <button
                            onClick={loadOrders}
                            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-200 transition-colors cursor-pointer"
                            title="Refresh orders"
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        </button>

                        <span className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold font-mono">
                            Total: {totalCount}
                        </span>
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedIds.size > 0 && (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-200">
                            {selectedIds.size} selected
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="px-2 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg cursor-pointer"
                        >
                            Unselect All
                        </button>
                        <button
                            onClick={() => {
                                const ids = Array.from(selectedIds).join(',');
                                window.open(`/print/daraz-invoice/bulk?ids=${ids}`, '_blank');
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 font-semibold border rounded-lg bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                            <Printer size={13} /> Print
                        </button>
                        <select
                            value={bulkStatus}
                            onChange={(e) => setBulkStatus(e.target.value)}
                            className="px-2 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 cursor-pointer"
                        >
                            <option value="">Change Status...</option>
                            <option value="Pending">Pending</option>
                            <option value="Packed">Packed</option>
                            <option value="Ready to Ship">Ready to Ship</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                        <button
                            onClick={handleBulkStatusUpdate}
                            disabled={!bulkStatus}
                            className="px-3 py-1 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 cursor-pointer"
                        >
                            Update
                        </button>
                    </div>
                )}
            </div>

            {/* Orders Area — Grouped by Seller Account */}
            <div className="p-4 pt-0 space-y-6 flex-1">
                {isLoading ? (
                    <div className="py-16 text-center text-slate-400 font-semibold animate-pulse">
                        Loading Daraz orders...
                    </div>
                ) : error ? (
                    <div className="py-16 text-center text-rose-500 font-semibold">
                        {error}
                    </div>
                ) : groupedOrders.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-medium">
                        No orders found matching current filters.
                    </div>
                ) : (
                    groupedOrders.map((group) => {
                        const displayedOrders = group.orders.filter((order) => {
                            const s = (order.order_status || '').toLowerCase();
                            return s !== 'cancelled' && s !== 'cancel' && s !== 'unpaid';
                        });

                        if (displayedOrders.length === 0) return null;

                        const groupStats = displayedOrders.reduce((acc: any, order) => {
                            const st = order.order_status || 'Pending';
                            acc[st] = (acc[st] || 0) + 1;
                            return acc;
                        }, {});

                        return (
                            <div key={group.seller} className="space-y-2">
                                {/* Seller Group Header */}
                                <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-1 sticky top-[57px] z-10 bg-slate-50 dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-black tracking-wide uppercase text-slate-800 dark:text-slate-100">
                                            {group.seller}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                                            Total: {displayedOrders.length}
                                        </span>
                                    </div>

                                    {/* Per-Seller Status Pills */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
                                        {Object.entries(groupStats).map(([st, cnt]) => (
                                            <span
                                                key={st}
                                                className={`px-2 py-0.5 rounded border font-semibold ${
                                                    st === 'Pending'
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : st === 'Packed'
                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                        : st === 'Ready to Ship'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : st === 'Shipped'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}
                                            >
                                                {st}: {cnt as number}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Seller Table */}
                                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold uppercase tracking-wider text-[11px]">
                                                    <th className="p-2.5 pl-3 w-10">
                                                        <button
                                                            onClick={() => toggleSelectGroup(!displayedOrders.every((o) => selectedIds.has(o.id)), displayedOrders)}
                                                            className="cursor-pointer text-slate-400 hover:text-slate-600"
                                                        >
                                                            {displayedOrders.length > 0 && displayedOrders.every((o) => selectedIds.has(o.id)) ? (
                                                                <CheckSquare size={16} className="text-blue-600" />
                                                            ) : (
                                                                <Square size={16} />
                                                            )}
                                                        </button>
                                                    </th>
                                                    <th className="p-2.5 text-center w-10">SN</th>
                                                    <th className="p-2.5 w-24">Date</th>
                                                    <th className="p-2.5 w-32">Invoice</th>
                                                    <th className="p-2.5 w-36">Order</th>
                                                    <th className="p-2.5 w-44">Customer</th>
                                                    <th className="p-2.5 w-52">Product</th>
                                                    <th className="p-2.5 text-right w-14">Qty</th>
                                                    <th className="p-2.5 text-right w-24">Amount</th>
                                                    <th className="p-2.5 text-center w-28">Status</th>
                                                    <th className="p-2.5 text-center w-36">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                                                {displayedOrders.map((order, idx) => {
                                                    const isSelected = selectedIds.has(order.id);
                                                    const custName = order.customer_name || 'Unknown Customer';
                                                    const isDuplicateOrder = duplicateOrderNumbers.includes(order.order_number);

                                                    return (
                                                        <tr
                                                            key={order.id}
                                                            className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/40 ${
                                                                isSelected ? 'bg-blue-50/50 dark:bg-blue-950/30' : ''
                                                            }`}
                                                        >
                                                            {/* Checkbox */}
                                                            <td className="p-2.5 pl-3">
                                                                <button onClick={() => toggleSelectRow(order.id)} className="cursor-pointer text-slate-400 hover:text-slate-600">
                                                                    {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                                                                </button>
                                                            </td>

                                                            {/* SN */}
                                                            <td className="p-2.5 text-center font-semibold text-slate-500">{idx + 1}</td>

                                                            {/* Date */}
                                                            <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">
                                                                {order.order_date ? new Date(order.order_date).toLocaleDateString('en-GB') : '-'}
                                                            </td>

                                                            {/* Invoice */}
                                                            <td className="p-2.5 font-mono font-semibold">
                                                                <button
                                                                    onClick={() => setViewingOrder(order)}
                                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                                                    title="Click to view order details"
                                                                >
                                                                    {order.invoice_number || '-'}
                                                                </button>
                                                            </td>

                                                            {/* Order Number */}
                                                            <td className="p-2.5 font-mono font-bold text-slate-800 dark:text-slate-100">
                                                                <div className="flex items-center gap-1">
                                                                    <span>{order.order_number}</span>
                                                                    {isDuplicateOrder && <span title="Duplicate order number">⚠️</span>}
                                                                </div>
                                                            </td>

                                                            {/* Customer */}
                                                            <td className="p-2.5">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={`font-semibold truncate max-w-[150px] ${getCustomerClass(custName, order.order_date)}`}>
                                                                        {custName}
                                                                    </span>
                                                                    {order.remarks && <CustomerRemarksTooltip remarks={order.remarks} />}
                                                                </div>
                                                            </td>

                                                            {/* Product */}
                                                            <td
                                                                className="p-2.5"
                                                                title={
                                                                    order.items && order.items.length > 1
                                                                        ? order.items.map((i: any) => i.product_name || i.seller_sku).join('\n')
                                                                        : order.first_product_name
                                                                }
                                                            >
                                                                <div className="flex flex-col max-w-[200px]">
                                                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                                        {order.first_product_name}
                                                                    </span>
                                                                    {order.item_count > 1 && (
                                                                        <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                                                            (+{order.item_count - 1} more)
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>

                                                            {/* Qty */}
                                                            <td className="p-2.5 text-right font-bold text-slate-800 dark:text-slate-100">
                                                                {order.total_quantity || 1}
                                                            </td>

                                                            {/* Amount */}
                                                            <td className="p-2.5 text-right font-bold text-slate-900 dark:text-white font-mono">
                                                                Rs. {Number(order.grand_total || order.total_amount || 0).toLocaleString()}
                                                            </td>

                                                            {/* Status */}
                                                            <td className="p-2.5 text-center">
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${getStatusColor(order.order_status)}`}>
                                                                    {order.order_status}
                                                                </span>
                                                            </td>

                                                            {/* ACTIONS Column */}
                                                            <td className="p-2.5 text-center">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    {/* Stock Indicator */}
                                                                    <StockIndicator orderId={order.id} order={order} />

                                                                    {/* Print Button */}
                                                                    <button
                                                                        onClick={() => window.open(`/print/daraz-invoice/${order.id}`, '_blank')}
                                                                        className={`p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer ${
                                                                            order.is_printed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                                                                        }`}
                                                                        title={order.is_printed ? 'Printed' : 'Print Invoice'}
                                                                    >
                                                                        <Printer size={14} />
                                                                    </button>

                                                                    {/* Sync Product Button */}
                                                                    <button
                                                                        onClick={() => handleSyncSingleProduct(order)}
                                                                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors cursor-pointer"
                                                                        title="Sync products from inventory"
                                                                    >
                                                                        <RefreshCw size={14} />
                                                                    </button>

                                                                    {/* Delete Button */}
                                                                    <button
                                                                        onClick={() => handleDeleteOrder(order)}
                                                                        className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                                                        title="Delete order"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modals */}
            <AddDarazOrderModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    alert('Daraz Order Entry saved successfully!');
                    loadOrders();
                }}
            />

            <ViewDarazOrderModal
                isOpen={!!viewingOrder}
                order={viewingOrder}
                onClose={() => setViewingOrder(null)}
                onRefresh={loadOrders}
            />
        </div>
    );
}
