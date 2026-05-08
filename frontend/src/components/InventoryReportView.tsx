'use client';

import { useMemo } from 'react';
import { ArrowLeft, FileText, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InventoryReportViewProps {
    orders: any[];
}

export default function InventoryReportView({ orders }: InventoryReportViewProps) {
    const router = useRouter();

    // Generate Inventory Report Data
    const inventoryReportData = useMemo(() => {
        const productStats: { [key: string]: { shippedQty: number; deliveredQty: number } } = {};

        orders.forEach(order => {
            if (!order.items) return;

            order.items.forEach((item: any) => {
                if (!productStats[item.product_name]) {
                    productStats[item.product_name] = { shippedQty: 0, deliveredQty: 0 };
                }

                // Count shipped quantities
                if (order.order_status === 'Shipped') {
                    productStats[item.product_name].shippedQty += item.qty;
                }

                // Count delivered quantities
                if (order.order_status === 'Delivered') {
                    productStats[item.product_name].deliveredQty += item.qty;
                }
            });
        });

        // Convert to array and sort by total quantity (shipped + delivered)
        return Object.entries(productStats)
            .map(([productName, stats]) => ({
                productName,
                ...stats,
                total: stats.shippedQty + stats.deliveredQty
            }))
            .sort((a, b) => b.total - a.total);
    }, [orders]);

    // Calculate totals
    const totals = useMemo(() => {
        return inventoryReportData.reduce((acc, product) => ({
            shippedQty: acc.shippedQty + product.shippedQty,
            deliveredQty: acc.deliveredQty + product.deliveredQty,
            total: acc.total + product.total,
        }), { shippedQty: 0, deliveredQty: 0, total: 0 });
    }, [inventoryReportData]);

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
                        <div className="p-1.5 bg-emerald-600/20 rounded-lg">
                            <Package className="text-emerald-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Inventory Sales Report</h1>
                            <p className="text-xs text-slate-400">Product-wise Shipped & Delivered Quantities</p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <FileText size={16} />
                    Print Report
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-7xl mx-auto">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                            <p className="text-xs text-blue-400 font-semibold uppercase">Total Shipped Qty</p>
                            <p className="text-2xl font-bold text-white mt-1">{totals.shippedQty}</p>
                        </div>
                        <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
                            <p className="text-xs text-emerald-400 font-semibold uppercase">Total Delivered Qty</p>
                            <p className="text-2xl font-bold text-white mt-1">{totals.deliveredQty}</p>
                        </div>
                        <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-3">
                            <p className="text-xs text-indigo-400 font-semibold uppercase">Total Products Moved</p>
                            <p className="text-2xl font-bold text-white mt-1">{totals.total}</p>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-slate-800 rounded-lg border border-slate-700">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900/50 border-b border-slate-700">
                                    <tr>
                                        <th className="text-left text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">#</th>
                                        <th className="text-left text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Product Name</th>
                                        <th className="text-center text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Shipped Qty</th>
                                        <th className="text-center text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Delivered Qty</th>
                                        <th className="text-center text-xs text-slate-400 font-bold uppercase tracking-wide py-3 px-4">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {inventoryReportData.length > 0 ? (
                                        inventoryReportData.map((product, index) => (
                                            <tr key={product.productName} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="py-3 px-4 text-slate-500 text-sm">{index + 1}</td>
                                                <td className="py-3 px-4 text-white text-sm font-medium">{product.productName}</td>
                                                <td className="py-3 px-4 text-center">
                                                    {product.shippedQty > 0 ? (
                                                        <span className="text-blue-400 font-bold text-sm bg-blue-900/30 px-2 py-1 rounded">
                                                            {product.shippedQty}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 text-sm">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {product.deliveredQty > 0 ? (
                                                        <span className="text-emerald-400 font-bold text-sm bg-emerald-900/30 px-2 py-1 rounded">
                                                            {product.deliveredQty}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 text-sm">-</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className="text-indigo-400 font-bold text-sm bg-indigo-900/30 px-3 py-1 rounded">
                                                        {product.total}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-500">
                                                No product data found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {inventoryReportData.length > 0 && (
                                    <tfoot className="bg-slate-900/50 border-t-2 border-slate-600">
                                        <tr className="font-bold">
                                            <td colSpan={2} className="py-3 px-4 text-white text-sm">TOTAL</td>
                                            <td className="py-3 px-4 text-center text-blue-300 text-sm">{totals.shippedQty}</td>
                                            <td className="py-3 px-4 text-center text-emerald-300 text-sm">{totals.deliveredQty}</td>
                                            <td className="py-3 px-4 text-center text-indigo-300 text-sm">{totals.total}</td>
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
