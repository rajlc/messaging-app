"use client";

import React, { useState, useEffect, useCallback, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft, BarChart2, List, RefreshCw, PieChart,
    TrendingUp, Package, FileText, Download, AlertCircle,
    ShoppingCart, CheckCircle, RotateCcw, DollarSign, Loader2
} from 'lucide-react';
import { DarazOrderListView } from '@/components/sales/DarazOrderListView';
import {
    getDailySalesReportAction,
    getOrderSummaryReportAction,
    getOrderStatusSummaryAction,
    getOrderSummaryStatsAction,
    type DailySalesReportRow,
    type AccountSummaryRow,
    type OrderStatusSummaryRow,
    type OrderSummaryStats,
} from '@/app/actions/daraz-actions';

type ReportTab = 'order-list' | 'daily' | 'summary' | 'status-sync' | 'profit-tracker' | 'sales-report' | 'product-report';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatAmount = (amount: number) =>
    `Rs. ${amount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KpiCard({ label, value, color, icon: Icon }: {
    label: string; value: string | number; color: string; icon: React.ElementType;
}) {
    return (
        <div className={`flex flex-col gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm min-w-[120px]`}>
            <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-lg ${color}`}>
                    <Icon size={13} className="text-white" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white leading-none">{value}</span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function TableSkeleton({ rows = 6, cols = 7 }: { rows?: number; cols?: number }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800">
                        {Array.from({ length: cols }).map((_, i) => (
                            <th key={i} className="px-3 py-2">
                                <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <tr key={r} className="border-b border-slate-100 dark:border-slate-800">
                            {Array.from({ length: cols }).map((_, c) => (
                                <td key={c} className="px-3 py-2">
                                    <div className={`h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse`}
                                        style={{ width: `${60 + Math.random() * 40}%` }} />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Qty Badge
// ---------------------------------------------------------------------------
function QtyBadge({ value, variant = 'default' }: { value: number; variant?: 'blue' | 'green' | 'orange' | 'red' | 'default' }) {
    const styles: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        default: value > 0
            ? 'bg-orange-50 text-orange-700 border border-orange-200'
            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
    };
    return (
        <span className={`inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-xs font-semibold ${styles[variant]}`}>
            {value}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Daily Sales Report Tab
// ---------------------------------------------------------------------------
function DailySalesReportTab() {
    const [data, setData] = useState<DailySalesReportRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDailySalesReportAction().then((rows) => {
            setData(rows);
            setLoading(false);
        });
    }, []);

    const totals = data.reduce(
        (acc, row) => ({
            shipped_qty: acc.shipped_qty + row.shipped_qty,
            shipped_amount: acc.shipped_amount + row.shipped_amount,
            delivered_qty: acc.delivered_qty + row.delivered_qty,
            returning_to_seller_qty: acc.returning_to_seller_qty + row.returning_to_seller_qty,
            returned_delivered_qty: acc.returned_delivered_qty + row.returned_delivered_qty,
            return_qty: acc.return_qty + row.return_qty,
            customer_return_delivered_qty: acc.customer_return_delivered_qty + row.customer_return_delivered_qty,
        }),
        { shipped_qty: 0, shipped_amount: 0, delivered_qty: 0, returning_to_seller_qty: 0, returned_delivered_qty: 0, return_qty: 0, customer_return_delivered_qty: 0 }
    );

    // Group by date
    const grouped = data.reduce((acc, row) => {
        if (!acc[row.date]) acc[row.date] = [];
        acc[row.date].push(row);
        return acc;
    }, {} as Record<string, DailySalesReportRow[]>);

    return (
        <div className="flex flex-col h-full">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {loading ? (
                    <TableSkeleton rows={8} cols={9} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    {['S.N', 'Date', 'Seller Account', 'Shipped Qty', 'Shipped Amount', 'Returning', 'Returned Delivered', 'Delivered', 'Cust. Return', 'Cust. Return Delivered'].map((h) => (
                                        <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {Object.keys(grouped).length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-12 text-center text-slate-400">
                                            <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
                                            No report data available. Orders with Shipped, Delivered, or Return status will appear here.
                                        </td>
                                    </tr>
                                ) : (
                                    Object.entries(grouped).map(([date, rows]) => {
                                        const dateTotals = rows.reduce((acc, r) => ({
                                            shipped_qty: acc.shipped_qty + r.shipped_qty,
                                            shipped_amount: acc.shipped_amount + r.shipped_amount,
                                            delivered_qty: acc.delivered_qty + r.delivered_qty,
                                            returning_to_seller_qty: acc.returning_to_seller_qty + r.returning_to_seller_qty,
                                            returned_delivered_qty: acc.returned_delivered_qty + r.returned_delivered_qty,
                                            return_qty: acc.return_qty + r.return_qty,
                                            customer_return_delivered_qty: acc.customer_return_delivered_qty + r.customer_return_delivered_qty,
                                        }), { shipped_qty: 0, shipped_amount: 0, delivered_qty: 0, returning_to_seller_qty: 0, returned_delivered_qty: 0, return_qty: 0, customer_return_delivered_qty: 0 });

                                        return (
                                            <Fragment key={date}>
                                                {rows.map((row, idx) => (
                                                    <tr key={`${date}-${row.seller_account}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="px-2 py-1.5 text-xs text-slate-400">{idx + 1}</td>
                                                        <td className="px-2 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatDate(date)}</td>
                                                        <td className="px-2 py-1.5 text-xs text-slate-600 dark:text-slate-400">{row.seller_account}</td>
                                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.shipped_qty} variant="blue" /></td>
                                                        <td className="px-2 py-1.5 text-xs text-right font-mono text-blue-600 dark:text-blue-400">{formatAmount(row.shipped_amount)}</td>
                                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.returning_to_seller_qty} /></td>
                                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.returned_delivered_qty} /></td>
                                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.delivered_qty} variant="green" /></td>
                                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.return_qty} /></td>
                                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.customer_return_delivered_qty} /></td>
                                                    </tr>
                                                ))}
                                                {/* Date subtotal row */}
                                                <tr className="bg-slate-200 dark:bg-slate-700 font-bold border-b-2 border-slate-300 dark:border-slate-600">
                                                    <td colSpan={2} />
                                                    <td className="px-2 py-1.5 text-xs uppercase tracking-wide text-slate-600 dark:text-slate-300">Total</td>
                                                    <td className="px-2 py-1.5 text-center text-xs text-blue-800 dark:text-blue-300">{dateTotals.shipped_qty}</td>
                                                    <td className="px-2 py-1.5 text-right text-xs font-mono text-blue-800 dark:text-blue-300">{formatAmount(dateTotals.shipped_amount)}</td>
                                                    <td className="px-2 py-1.5 text-center text-xs text-orange-800 dark:text-orange-300">{dateTotals.returning_to_seller_qty}</td>
                                                    <td className="px-2 py-1.5 text-center text-xs text-orange-900 dark:text-orange-200">{dateTotals.returned_delivered_qty}</td>
                                                    <td className="px-2 py-1.5 text-center text-xs text-emerald-800 dark:text-emerald-300">{dateTotals.delivered_qty}</td>
                                                    <td className="px-2 py-1.5 text-center text-xs text-orange-800">{dateTotals.return_qty}</td>
                                                    <td className="px-2 py-1.5 text-center text-xs text-orange-900">{dateTotals.customer_return_delivered_qty}</td>
                                                </tr>
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                            {data.length > 0 && (
                                <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-bold">
                                    <tr>
                                        <td colSpan={3} className="px-2 py-2 text-xs uppercase text-slate-600 dark:text-slate-400">Grand Total</td>
                                        <td className="px-2 py-2 text-center text-xs text-blue-700 dark:text-blue-400">{totals.shipped_qty}</td>
                                        <td className="px-2 py-2 text-right text-xs font-mono text-blue-700 dark:text-blue-400">{formatAmount(totals.shipped_amount)}</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-700">{totals.returning_to_seller_qty}</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-800">{totals.returned_delivered_qty}</td>
                                        <td className="px-2 py-2 text-center text-xs text-emerald-700">{totals.delivered_qty}</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-700">{totals.return_qty}</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-800">{totals.customer_return_delivered_qty}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Account Summary Tab
// ---------------------------------------------------------------------------
function AccountSummaryTab() {
    const [data, setData] = useState<AccountSummaryRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getOrderSummaryReportAction().then((rows) => {
            setData(rows);
            setLoading(false);
        });
    }, []);

    const totals = data.reduce(
        (acc, row) => ({
            shipped_qty: acc.shipped_qty + row.shipped_qty,
            shipped_amount: acc.shipped_amount + row.shipped_amount,
            delivered_qty: acc.delivered_qty + row.delivered_qty,
            returning_to_seller_qty: acc.returning_to_seller_qty + row.returning_to_seller_qty,
            returned_delivered_qty: acc.returned_delivered_qty + row.returned_delivered_qty,
            return_qty: acc.return_qty + row.return_qty,
            customer_return_delivered_qty: acc.customer_return_delivered_qty + row.customer_return_delivered_qty,
            remain_qty: acc.remain_qty + row.remain_qty,
        }),
        { shipped_qty: 0, shipped_amount: 0, delivered_qty: 0, returning_to_seller_qty: 0, returned_delivered_qty: 0, return_qty: 0, customer_return_delivered_qty: 0, remain_qty: 0 }
    );

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            {loading ? (
                <TableSkeleton rows={4} cols={9} />
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                {['S.N', 'Seller Account', 'Shipped Qty', 'Shipped Amount', 'Returning', 'Returned Del.', 'Delivered', 'Cust. Return', 'Cust. Return Del.', 'Remain'].map((h) => (
                                    <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-3 py-12 text-center text-slate-400">
                                        <PieChart size={36} className="mx-auto mb-2 opacity-30" />
                                        No account summary data available.
                                    </td>
                                </tr>
                            ) : (
                                data.map((row, idx) => (
                                    <tr key={row.seller_account} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-2 py-1.5 text-xs text-slate-400">{idx + 1}</td>
                                        <td className="px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{row.seller_account}</td>
                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.shipped_qty} variant="blue" /></td>
                                        <td className="px-2 py-1.5 text-xs text-right font-mono text-blue-600 dark:text-blue-400">{formatAmount(row.shipped_amount)}</td>
                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.returning_to_seller_qty} /></td>
                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.returned_delivered_qty} /></td>
                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.delivered_qty} variant="green" /></td>
                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.return_qty} /></td>
                                        <td className="px-2 py-1.5 text-center"><QtyBadge value={row.customer_return_delivered_qty} /></td>
                                        <td className="px-2 py-1.5 text-center">
                                            <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                                {row.remain_qty}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {data.length > 0 && (
                            <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-bold">
                                <tr>
                                    <td colSpan={2} className="px-2 py-2 text-xs uppercase text-slate-600 dark:text-slate-400">Grand Total</td>
                                    <td className="px-2 py-2 text-center text-xs text-blue-700">{totals.shipped_qty}</td>
                                    <td className="px-2 py-2 text-right text-xs font-mono text-blue-700">{formatAmount(totals.shipped_amount)}</td>
                                    <td className="px-2 py-2 text-center text-xs text-orange-700">{totals.returning_to_seller_qty}</td>
                                    <td className="px-2 py-2 text-center text-xs text-orange-800">{totals.returned_delivered_qty}</td>
                                    <td className="px-2 py-2 text-center text-xs text-emerald-700">{totals.delivered_qty}</td>
                                    <td className="px-2 py-2 text-center text-xs text-orange-700">{totals.return_qty}</td>
                                    <td className="px-2 py-2 text-center text-xs text-orange-800">{totals.customer_return_delivered_qty}</td>
                                    <td className="px-2 py-2 text-center text-xs text-amber-700">{totals.remain_qty}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Order Status Sync Tab
// ---------------------------------------------------------------------------
function OrderStatusSyncTab() {
    const [data, setData] = useState<OrderStatusSummaryRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        const rows = await getOrderStatusSummaryAction();
        setData(rows);
        setLoading(false);
        setRefreshing(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const totals = data.reduce(
        (acc, row) => ({
            pending: acc.pending + row.pending,
            packed: acc.packed + row.packed,
            ready_to_ship: acc.ready_to_ship + row.ready_to_ship,
            shipped: acc.shipped + row.shipped,
            delivered: acc.delivered + row.delivered,
            returning_to_seller: acc.returning_to_seller + row.returning_to_seller,
            returned_delivered: acc.returned_delivered + row.returned_delivered,
            customer_return: acc.customer_return + row.customer_return,
            customer_return_delivered: acc.customer_return_delivered + row.customer_return_delivered,
        }),
        { pending: 0, packed: 0, ready_to_ship: 0, shipped: 0, delivered: 0, returning_to_seller: 0, returned_delivered: 0, customer_return: 0, customer_return_delivered: 0 }
    );

    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-end">
                <button
                    onClick={() => load(true)}
                    disabled={loading || refreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
                >
                    {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {loading ? (
                    <TableSkeleton rows={4} cols={10} />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    {['Seller Account', 'Pending', 'Packed', 'Ready to Ship', 'Shipped', 'Delivered', 'Returning', 'Returned Del.', 'Cust. Return', 'Cust. Return Del.'].map((h) => (
                                        <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-3 py-12 text-center text-slate-400">
                                            <RefreshCw size={36} className="mx-auto mb-2 opacity-30" />
                                            No status data available.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((row) => (
                                        <tr key={row.seller_account} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-2 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">{row.seller_account}</td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.pending} variant={row.pending > 0 ? 'orange' : 'default'} /></td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.packed} variant={row.packed > 0 ? 'blue' : 'default'} /></td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.ready_to_ship} variant={row.ready_to_ship > 0 ? 'green' : 'default'} /></td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.shipped} variant="blue" /></td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.delivered} variant="green" /></td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.returning_to_seller} /></td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.returned_delivered} /></td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.customer_return} /></td>
                                            <td className="px-2 py-1.5 text-center"><QtyBadge value={row.customer_return_delivered} /></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {data.length > 0 && (
                                <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 font-bold">
                                    <tr>
                                        <td className="px-2 py-2 text-xs uppercase text-slate-600">Total</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-700">{totals.pending}</td>
                                        <td className="px-2 py-2 text-center text-xs text-blue-700">{totals.packed}</td>
                                        <td className="px-2 py-2 text-center text-xs text-emerald-700">{totals.ready_to_ship}</td>
                                        <td className="px-2 py-2 text-center text-xs text-blue-700">{totals.shipped}</td>
                                        <td className="px-2 py-2 text-center text-xs text-emerald-700">{totals.delivered}</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-700">{totals.returning_to_seller}</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-800">{totals.returned_delivered}</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-700">{totals.customer_return}</td>
                                        <td className="px-2 py-2 text-center text-xs text-orange-800">{totals.customer_return_delivered}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Placeholder Tab (for profit-tracker, sales-report, product-report)
// ---------------------------------------------------------------------------
function PlaceholderTab({ title, icon: Icon, description }: { title: string; icon: React.ElementType; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 mb-4">
                <Icon size={32} />
            </div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">{title}</h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm">{description}</p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------
export function DarazOrderSummaryView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState<ReportTab>('order-list');
    const [stats, setStats] = useState<OrderSummaryStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Load KPI stats on mount
    useEffect(() => {
        getOrderSummaryStatsAction().then((s) => {
            setStats(s);
            setStatsLoading(false);
        });
    }, []);

    const handleBack = () => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', 'sales');
        params.set('subView', 'daraz');
        router.push(`/?${params.toString()}`);
    };

    const tabs: { id: ReportTab; label: string; icon: React.ElementType }[] = [
        { id: 'order-list', label: 'Order List', icon: List },
        { id: 'daily', label: 'Daily Sales Report', icon: BarChart2 },
        { id: 'summary', label: 'Account Summary', icon: PieChart },
        { id: 'status-sync', label: 'Order Status Sync', icon: RefreshCw },
        { id: 'profit-tracker', label: 'Profit Tracker', icon: TrendingUp },
        { id: 'sales-report', label: 'Sales Report Details', icon: FileText },
        { id: 'product-report', label: 'Product Report Details', icon: Package },
    ];

    const isOrderList = activeTab === 'order-list';

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* ── Sticky Header ── */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight">Sales Dashboard</h1>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400">Performance Reports</p>
                </div>
                <button
                    onClick={handleBack}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                    <ArrowLeft size={12} /> Back to Dashboard
                </button>
            </div>

            {/* ── Tab Bar ── */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-1.5 overflow-x-auto sticky top-[52px] z-10">
                <div className="flex items-center gap-1.5 min-w-max">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${activeTab === id
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            <Icon size={12} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Tab Content ── */}
            <div className={`flex-1 ${isOrderList ? 'overflow-hidden' : 'overflow-auto p-4'}`}>
                {activeTab === 'order-list' && (
                    // New Order List view — grouped by date, exact inventory-webapp columns & filters
                    <DarazOrderListView />
                )}
                {activeTab === 'daily' && <DailySalesReportTab />}
                {activeTab === 'summary' && <AccountSummaryTab />}
                {activeTab === 'status-sync' && <OrderStatusSyncTab />}
                {activeTab === 'profit-tracker' && (
                    <PlaceholderTab
                        title="Profit Tracker"
                        icon={TrendingUp}
                        description="Profit Tracker will be available in the next migration step. Use the Inventory Web App in the meantime."
                    />
                )}
                {activeTab === 'sales-report' && (
                    <PlaceholderTab
                        title="Sales Report Details"
                        icon={FileText}
                        description="Detailed sales reports will be available in the next migration step."
                    />
                )}
                {activeTab === 'product-report' && (
                    <PlaceholderTab
                        title="Product Report Details"
                        icon={Package}
                        description="Product-level sales reports will be available in the next migration step."
                    />
                )}
            </div>
        </div>
    );
}
