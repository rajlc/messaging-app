'use client';

import { useMemo } from 'react';
import { ArrowLeft, FileText, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DailyReportViewProps {
    orders: any[];
}

export default function DailyReportView({ orders }: DailyReportViewProps) {
    const router = useRouter();

    // Generate Daily Report Data
    const dailyReportData = useMemo(() => {
        // Group orders by shipped date and delivered date
        const dailyStats: { [key: string]: { shippedQty: number; shippedAmount: number; deliveredQty: number; deliveredAmount: number } } = {};

        orders.forEach(order => {
            // Process Shipped orders
            if (order.order_status === 'Shipped' && order.shipped_at) {
                const shippedDate = new Date(order.shipped_at).toLocaleDateString('en-CA'); // YYYY-MM-DD format
                if (!dailyStats[shippedDate]) {
                    dailyStats[shippedDate] = { shippedQty: 0, shippedAmount: 0, deliveredQty: 0, deliveredAmount: 0 };
                }
                dailyStats[shippedDate].shippedQty += 1;
                dailyStats[shippedDate].shippedAmount += order.total_amount || 0;
            }

            // Process Delivered orders
            if (order.order_status === 'Delivered' && order.delivered_at) {
                const deliveredDate = new Date(order.delivered_at).toLocaleDateString('en-CA'); // YYYY-MM-DD format
                if (!dailyStats[deliveredDate]) {
                    dailyStats[deliveredDate] = { shippedQty: 0, shippedAmount: 0, deliveredQty: 0, deliveredAmount: 0 };
                }
                dailyStats[deliveredDate].deliveredQty += 1;
                dailyStats[deliveredDate].deliveredAmount += order.total_amount || 0;
            }
        });

        // Convert to array and sort by date (newest first)
        return Object.entries(dailyStats)
            .map(([date, stats]) => ({ date, ...stats }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders]);

    // Calculate totals
    const totals = useMemo(() => {
        return dailyReportData.reduce((acc, day) => ({
            shippedQty: acc.shippedQty + day.shippedQty,
            shippedAmount: acc.shippedAmount + day.shippedAmount,
            deliveredQty: acc.deliveredQty + day.deliveredQty,
            deliveredAmount: acc.deliveredAmount + day.deliveredAmount,
        }), { shippedQty: 0, shippedAmount: 0, deliveredQty: 0, deliveredAmount: 0 });
    }, [dailyReportData]);

    return (
        <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 h-full overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push('/?view=orders')}
                        className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors text-slate-300 hover:text-white"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-600/20 rounded-lg">
                            <Calendar className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Daily Sales Report</h1>
                            <p className="text-xs text-slate-400">Shipped & Delivered Orders by Date</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <FileText size={16} />
                    Print Report
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-7xl mx-auto">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                            <p className="text-xs text-blue-400 font-semibold uppercase">Total Shipped</p>
                            <p className="text-2xl font-bold text-white mt-1">{totals.shippedQty}</p>
                        </div>
                        <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-3">
                            <p className="text-xs text-indigo-400 font-semibold uppercase">Shipped Amount</p>
                            <p className="text-2xl font-bold text-white mt-1">Rs. {totals.shippedAmount.toLocaleString()}</p>
                        </div>
                        <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
                            <p className="text-xs text-emerald-400 font-semibold uppercase">Total Delivered</p>
                            <p className="text-2xl font-bold text-white mt-1">{totals.deliveredQty}</p>
                        </div>
                        <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                            <p className="text-xs text-green-400 font-semibold uppercase">Delivered Amount</p>
                            <p className="text-2xl font-bold text-white mt-1">Rs. {totals.deliveredAmount.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-slate-800 rounded-lg border border-slate-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900/50 border-b border-slate-700">
                                    <tr>
                                        <th className="text-left text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Date</th>
                                        <th className="text-center text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Shipped Qty</th>
                                        <th className="text-right text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Shipped Amount</th>
                                        <th className="text-center text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Delivered Qty</th>
                                        <th className="text-right text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Delivered Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {dailyReportData.length > 0 ? (
                                        dailyReportData.map((day) => (
                                            <tr key={day.date} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="py-3 px-4 text-white text-sm font-medium">
                                                    {new Date(day.date).toLocaleDateString('en-US', { 
                                                        weekday: 'short', 
                                                        year: 'numeric', 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {day.shippedQty > 0 ? (
                                                        <span className="text-blue-400 font-bold text-sm bg-blue-900/30 px-2 py-1 rounded">
                                                            {day.shippedQty}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 text-sm">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right text-slate-200 text-sm font-medium">
                                                    {day.shippedAmount > 0 ? `Rs. ${day.shippedAmount.toLocaleString()}` : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {day.deliveredQty > 0 ? (
                                                        <span className="text-emerald-400 font-bold text-sm bg-emerald-900/30 px-2 py-1 rounded">
                                                            {day.deliveredQty}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 text-sm">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-right text-slate-200 text-sm font-medium">
                                                    {day.deliveredAmount > 0 ? `Rs. ${day.deliveredAmount.toLocaleString()}` : '-'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-500">
                                                No shipped or delivered orders found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {dailyReportData.length > 0 && (
                                    <tfoot className="bg-slate-900/50 border-t-2 border-slate-600">
                                        <tr className="font-bold">
                                            <td className="py-3 px-4 text-white text-sm">TOTAL</td>
                                            <td className="py-3 px-4 text-center text-blue-300 text-sm">{totals.shippedQty}</td>
                                            <td className="py-3 px-4 text-right text-blue-300 text-sm">Rs. {totals.shippedAmount.toLocaleString()}</td>
                                            <td className="py-3 px-4 text-center text-emerald-300 text-sm">{totals.deliveredQty}</td>
                                            <td className="py-3 px-4 text-right text-emerald-300 text-sm">Rs. {totals.deliveredAmount.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
