'use client';

import { useMemo } from 'react';
import { Package, Truck, FileText, ArrowLeft, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReportViewProps {
    orders: any[];
    userRole?: string;
    userName?: string;
    userEmail?: string;
}

export default function ReportView({ orders, userRole = 'user', userName = '', userEmail = '' }: ReportViewProps) {
    const router = useRouter();

    // Generate Report Data for Ready to Ships
    const reportData = useMemo(() => {
        const today = new Date();
        let confirmedOrders = orders.filter(order => {
            const orderDate = new Date(order.created_at || order.order_date);
            const isCreatedTodayAndConfirmed =
                orderDate.getDate() === today.getDate() &&
                orderDate.getMonth() === today.getMonth() &&
                orderDate.getFullYear() === today.getFullYear() &&
                order.order_status === 'Ready to Ship';

            let isShippedToday = false;
            if (order.order_status === 'Shipped' && order.shipped_at) {
                const shippedDate = new Date(order.shipped_at);
                isShippedToday =
                    shippedDate.getDate() === today.getDate() &&
                    shippedDate.getMonth() === today.getMonth() &&
                    shippedDate.getFullYear() === today.getFullYear();
            }

            return isCreatedTodayAndConfirmed || isShippedToday;
        });

        // Role-based filtering for User role
        if (userRole === 'user') {
            // For users, only show orders they created or from their allowed pages
            confirmedOrders = confirmedOrders.filter(order => {
                const isCreator = order.created_by === userName || order.created_by === userEmail;
                return isCreator;
            });
        }

        // Total orders
        const totalOrders = confirmedOrders.length;

        // Total products quantity
        const totalProductQty = confirmedOrders.reduce((sum, order) => {
            return sum + (order.items?.reduce((itemSum: number, item: any) => itemSum + item.qty, 0) || 0);
        }, 0);

        // Logistics breakdown
        const localOrders = confirmedOrders.filter(o => o.courier_provider === 'local');
        const pathaoOrders = confirmedOrders.filter(o => o.courier_provider === 'pathao');

        // Branch details (for local logistics)
        const branchStats: { [key: string]: number } = {};
        localOrders.forEach(order => {
            const branch = order.delivery_branch || 'Unknown';
            branchStats[branch] = (branchStats[branch] || 0) + 1;
        });

        // City details (for Pathao)
        const cityStats: { [key: string]: number } = {};
        pathaoOrders.forEach(order => {
            const city = order.city_name || order.city || 'Unknown';
            cityStats[city] = (cityStats[city] || 0) + 1;
        });

        // Platform breakdown
        const platformStats: { [key: string]: number } = {};
        confirmedOrders.forEach(order => {
            const platform = order.platform || 'Direct';
            platformStats[platform] = (platformStats[platform] || 0) + 1;
        });

        // Page/Account breakdown
        const pageStats: { [key: string]: number } = {};
        confirmedOrders.forEach(order => {
            const page = order.page_name || order.platform_account || 'Unknown';
            pageStats[page] = (pageStats[page] || 0) + 1;
        });

        // Created By breakdown
        const createdByStats: { [key: string]: number } = {};
        confirmedOrders.forEach(order => {
            const creator = order.created_by || 'System';
            createdByStats[creator] = (createdByStats[creator] || 0) + 1;
        });

        // Product breakdown
        const productStats: { [key: string]: { qty: number; orders: number } } = {};
        confirmedOrders.forEach(order => {
            order.items?.forEach((item: any) => {
                if (!productStats[item.product_name]) {
                    productStats[item.product_name] = { qty: 0, orders: 0 };
                }
                productStats[item.product_name].qty += item.qty;
                productStats[item.product_name].orders += 1;
            });
        });

        // Total revenue
        const totalRevenue = confirmedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

        return {
            totalOrders,
            totalProductQty,
            totalRevenue,
            localOrders: localOrders.length,
            pathaoOrders: pathaoOrders.length,
            branchStats,
            cityStats,
            platformStats,
            pageStats,
            createdByStats,
            productStats
        };
    }, [orders, userRole, userName, userEmail]);

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
                        <div className="p-1.5 bg-indigo-600/20 rounded-lg">
                            <FileText className="text-indigo-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Today's Ready to Ships Report</h1>
                            <p className="text-xs text-slate-400">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    <FileText size={16} />
                    Print Report
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="max-w-7xl mx-auto space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-blue-400 font-semibold uppercase tracking-wide">Total Orders</p>
                                    <p className="text-3xl font-bold text-white mt-1">{reportData.totalOrders}</p>
                                </div>
                                <Package className="text-blue-400 opacity-40" size={32} />
                            </div>
                        </div>

                        <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">Total Products</p>
                                    <p className="text-3xl font-bold text-white mt-1">{reportData.totalProductQty}</p>
                                </div>
                                <Package className="text-emerald-400 opacity-40" size={32} />
                            </div>
                        </div>

                        <div className="bg-indigo-900/20 border border-indigo-700/50 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wide">Total Revenue</p>
                                    <p className="text-3xl font-bold text-white mt-1">
                                        <span className="text-xl">Rs.</span> {reportData.totalRevenue.toLocaleString()}
                                    </p>
                                </div>
                                <Package className="text-indigo-400 opacity-40" size={32} />
                            </div>
                        </div>
                    </div>

                    {/* Logistics Breakdown */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                            <Truck className="text-orange-400" size={20} />
                            Logistics Breakdown
                        </h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3">
                                <p className="text-xs text-emerald-400 font-semibold mb-1 uppercase tracking-wide">Local Logistics</p>
                                <p className="text-2xl font-bold text-white">{reportData.localOrders} <span className="text-sm text-slate-400">orders</span></p>
                            </div>
                            <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                                <p className="text-xs text-red-400 font-semibold mb-1 uppercase tracking-wide">Pathao</p>
                                <p className="text-2xl font-bold text-white">{reportData.pathaoOrders} <span className="text-sm text-slate-400">orders</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Branch/City Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* Branch Details (Local) */}
                        {reportData.localOrders > 0 && (
                            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                                <h3 className="text-sm font-bold text-emerald-400 mb-2 uppercase tracking-wide">Local Branch Details</h3>
                                <div className="space-y-2">
                                    {Object.entries(reportData.branchStats)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([branch, count]) => (
                                            <div key={branch} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                                <span className="text-slate-200 text-sm font-medium">{branch}</span>
                                                <span className="text-white font-bold text-sm bg-emerald-900/40 px-2 py-1 rounded border border-emerald-700/50">
                                                    {count} <span className="text-xs text-emerald-300">orders</span>
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* City Details (Pathao) */}
                        {reportData.pathaoOrders > 0 && (
                            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                                <h3 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">Pathao City Details</h3>
                                <div className="space-y-2">
                                    {Object.entries(reportData.cityStats)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([city, count]) => (
                                            <div key={city} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                                <span className="text-slate-200 text-sm font-medium">{city}</span>
                                                <span className="text-white font-bold text-sm bg-red-900/40 px-2 py-1 rounded border border-red-700/50">
                                                    {count} <span className="text-xs text-red-300">orders</span>
                                                </span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Platform & Page Breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {/* Platform Stats */}
                        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                            <h3 className="text-sm font-bold text-blue-400 mb-2 uppercase tracking-wide">Platform Breakdown</h3>
                            <div className="space-y-2">
                                {Object.entries(reportData.platformStats)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([platform, count]) => (
                                        <div key={platform} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                            <span className="text-slate-200 text-sm font-medium">{platform}</span>
                                            <span className="text-white font-bold text-sm bg-blue-900/40 px-2 py-1 rounded border border-blue-700/50">
                                                {count} <span className="text-xs text-blue-300">orders</span>
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Page/Account Stats */}
                        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                            <h3 className="text-sm font-bold text-purple-400 mb-2 uppercase tracking-wide">Page/Account Details</h3>
                            <div className="space-y-2">
                                {Object.entries(reportData.pageStats)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([page, count]) => (
                                        <div key={page} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                            <span className="text-slate-200 text-sm font-medium">{page}</span>
                                            <span className="text-white font-bold text-sm bg-purple-900/40 px-2 py-1 rounded border border-purple-700/50">
                                                {count} <span className="text-xs text-purple-300">orders</span>
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Created By Audit Trail */}
                    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                            <User className="text-amber-400" size={20} />
                            Order Created By (Audit Trail)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {Object.entries(reportData.createdByStats)
                                .sort(([, a], [, b]) => b - a)
                                .map(([creator, count]) => (
                                    <div key={creator} className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-8 h-8 bg-amber-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                <User className="text-amber-400" size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-300 text-sm font-medium truncate" title={creator}>{creator}</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-slate-700/50">
                                            <p className="text-2xl font-bold text-white">
                                                {count} <span className="text-xs text-amber-400">orders</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Product Breakdown */}
                    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                            <Package className="text-blue-400" size={20} />
                            Product Breakdown
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900/50 border-b border-slate-700">
                                    <tr>
                                        <th className="text-left text-xs text-slate-400 font-bold uppercase tracking-wide py-2 px-3">#</th>
                                        <th className="text-left text-xs text-slate-400 font-bold uppercase tracking-wide py-2 px-3">Product Name</th>
                                        <th className="text-center text-xs text-slate-400 font-bold uppercase tracking-wide py-2 px-3">Total Qty</th>
                                        <th className="text-center text-xs text-slate-400 font-bold uppercase tracking-wide py-2 px-3">In Orders</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {Object.entries(reportData.productStats)
                                        .sort(([, a], [, b]) => b.qty - a.qty)
                                        .map(([product, stats], index) => (
                                            <tr key={product} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="py-2 px-3 text-slate-500 text-sm">{index + 1}</td>
                                                <td className="py-2 px-3 text-white text-sm font-medium">{product}</td>
                                                <td className="py-2 px-3 text-center">
                                                    <span className="text-blue-400 font-bold text-sm bg-blue-900/30 px-2 py-0.5 rounded">
                                                        {stats.qty}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-3 text-center text-slate-300 text-sm">{stats.orders}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
