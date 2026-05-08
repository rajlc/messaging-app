"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { ArrowLeft, Package, User, Phone, MapPin, Calendar, Truck, History, CreditCard, MoreVertical, Edit2 } from 'lucide-react';
import EditOrderModal from '@/components/EditOrderModal';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { theme } = useTheme();
    const { id } = params;
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [courierSyncInfo, setCourierSyncInfo] = useState<any>(null);
    const auditTrailRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            fetchOrderDetails();
        }
    }, [id]);

    // Auto-scroll to bottom of audit trail when history loads or updates
    useEffect(() => {
        if (auditTrailRef.current) {
            auditTrailRef.current.scrollTop = auditTrailRef.current.scrollHeight;
        }
    }, [order?.status_history]);

    const fetchOrderDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setOrder(response.data);

            // If shipped, try fetching Pathao info
            if (response.data.courier_consignment_id) {
                fetchCourierInfo(response.data);
            }

        } catch (error) {
            console.error('Failed to fetch order details:', error);
            alert('Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const fetchCourierInfo = async (orderData: any) => {
        try {
            const provider = orderData.courier_provider || 'pathao';
            const endpoint = provider === 'pathao' ? 'pathao-info' : (provider === 'ncm' ? 'ncm-info' : null);

            if (!endpoint) return;

            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/orders/${orderData.id}/${endpoint}`);
            setCourierSyncInfo(res.data);
        } catch (e) {
            console.error("Courier sync failed", e);
        }
    };

    const getStatusColor = (status: string) => {
        // Light mode: Light grey highlight with black text (as requested)
        // Dark mode: Keep consistent semantic colors
        const lightBase = 'bg-gray-100 text-slate-900 border-gray-200';

        switch (status) {
            case 'New Order':
                return `${lightBase} dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700`;
            case 'Ready to Ship':
                return `${lightBase} dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700`;
            case 'Shipped':
                return `${lightBase} dark:bg-green-900/30 dark:text-green-200 dark:border-green-700`;
            case 'Delivered':
                return `${lightBase} dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700`;
            case 'Cancelled':
                return `${lightBase} dark:bg-red-900/30 dark:text-red-200 dark:border-red-700`;
            default:
                return `${lightBase} dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600`;
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white transition-colors duration-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white flex-col gap-4 transition-colors duration-200">
                <p className="text-xl text-slate-400">Order not found</p>
                <button onClick={() => router.back()} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">Go Back</button>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
            {/* Sidebar */}
            <Sidebar activeView="orders" />

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-6 h-screen overflow-y-auto">
                <div className="max-w-7xl mb-4 flex items-center justify-between gap-4">
                    {/* Left: Title */}
                    <div>
                        <h1 className="text-[21px] md:text-[25px] font-bold flex items-center gap-3">
                            Order #{order.order_number}
                            <span className={`text-[13px] px-2 py-1 rounded-full border ${getStatusColor(order.order_status)}`}>
                                {order.order_status}
                            </span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-[13px] md:text-[15px] mt-1">
                            Placed on {new Date(order.created_at || order.order_date).toLocaleString()}
                        </p>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        {(!user || user.role !== 'user' || order.courier_provider !== 'pathao') && (
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-all text-[15px] shadow-sm shadow-indigo-500/20"
                            >
                                <Edit2 size={16} />
                                Edit Order
                            </button>
                        )}
                        <button
                            onClick={() => router.back()}
                            className="p-1.5 bg-white dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700"
                        >
                            <ArrowLeft size={20} />
                        </button>
                    </div>
                </div>

                <div className="max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left Column - Details */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Customer & Delivery Info */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                            <h2 className="text-[19px] font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <User size={18} className="text-indigo-500" />
                                Customer & Delivery
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Customer Name</label>
                                    <p className="text-slate-900 dark:text-white font-medium">{order.customer_name}</p>
                                </div>
                                <div>
                                    <label className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Phone Number</label>
                                    <div className="space-y-1">
                                        <p className="text-slate-900 dark:text-white flex items-center gap-2"><Phone size={14} className="text-slate-400 dark:text-slate-500" /> {order.phone_number}</p>
                                        {order.alternative_phone && (
                                            <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2 text-[15px]"><Phone size={14} className="text-slate-400 dark:text-slate-600" /> {order.alternative_phone}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Delivery Address</label>
                                    <p className="text-slate-900 dark:text-white flex items-start gap-2">
                                        <MapPin size={16} className="text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                                        {order.address}
                                        {order.city && <span className="text-slate-500 dark:text-slate-400 ml-1">({order.city})</span>}
                                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full border ml-2 ${getStatusColor(order.order_status)}`}>
                                            {order.order_status}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">Est Delivery Charge</label>
                                    <p className="text-indigo-600 dark:text-indigo-400 font-bold text-[17px]">
                                        Rs. {order.courier_delivery_fee || 0}
                                    </p>
                                </div>

                                {order.price_changelog && (
                                    <div className="md:col-span-2 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-500/30">
                                        <label className="text-[12px] font-bold text-amber-700 dark:text-amber-500 uppercase block mb-1">Price Changelog (Latest Update)</label>
                                        <p className="text-[14px] text-amber-900 dark:text-amber-200 font-medium">
                                            {order.price_changelog}
                                        </p>
                                    </div>
                                )}

                                {order.courier_provider === 'pathao' && !order.courier_consignment_id && (order.city_name || order.zone_name || order.area_name) && (
                                    <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-500/30 mt-2">
                                        <div className="flex justify-between items-start">
                                            <div className="w-full">
                                                <label className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 uppercase block mb-2">Pathao Logistics</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {order.city_name && (
                                                        <div>
                                                            <span className="text-[13px] text-slate-500 dark:text-slate-400 block">City</span>
                                                            <p className="text-slate-900 dark:text-white font-medium text-[15px]">{order.city_name}</p>
                                                        </div>
                                                    )}
                                                    {order.zone_name && (
                                                        <div>
                                                            <span className="text-[13px] text-slate-500 dark:text-slate-400 block">Zone</span>
                                                            <p className="text-slate-900 dark:text-white font-medium text-[15px]">{order.zone_name}</p>
                                                        </div>
                                                    )}
                                                    {order.area_name && (
                                                        <div>
                                                            <span className="text-[13px] text-slate-500 dark:text-slate-400 block">Area</span>
                                                            <p className="text-slate-900 dark:text-white font-medium text-[15px]">{order.area_name}</p>
                                                        </div>
                                                    )}
                                                    {order.weight && (
                                                        <div>
                                                            <span className="text-[13px] text-slate-500 dark:text-slate-400 block">Weight</span>
                                                            <p className="text-slate-900 dark:text-white font-medium text-[15px]">{order.weight} kg</p>
                                                        </div>
                                                    )}
                                                    {order.courier_delivery_fee && (
                                                        <div>
                                                            <span className="text-[13px] text-slate-500 dark:text-slate-400 block">Delivery Fee</span>
                                                            <p className="text-indigo-600 dark:text-indigo-400 font-medium text-[15px]">Rs. {order.courier_delivery_fee}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Truck className="text-indigo-500 dark:text-indigo-600 shrink-0 ml-4" size={24} />
                                        </div>
                                    </div>
                                )}

                                {order.courier_consignment_id && (
                                    <div className="md:col-span-2 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 mt-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <label className="text-[13px] font-bold text-slate-400 dark:text-slate-500 uppercase block mb-1">
                                                    Logistics Info ({order.courier_provider === 'ncm' ? 'NCM' : 'Pathao'})
                                                </label>
                                                <p className="text-indigo-600 dark:text-indigo-400 font-mono tracking-wide">{order.courier_consignment_id}</p>
                                                {courierSyncInfo && (
                                                    <p className="text-[15px] text-slate-600 dark:text-slate-300 mt-1">Status: <span className="text-slate-900 dark:text-white font-semibold">{courierSyncInfo.order_status || courierSyncInfo.status || 'Unknown'}</span></p>
                                                )}
                                            </div>
                                            <Truck className="text-slate-400 dark:text-slate-600" size={24} />
                                        </div>
                                    </div>
                                )}

                                {order.courier_provider === 'local' && (
                                    <div className="md:col-span-2 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-500/30 mt-2">
                                        <div className="flex justify-between items-start">
                                            <div className="w-full">
                                                <label className="text-[13px] font-bold text-emerald-600 dark:text-emerald-500 uppercase block mb-2">Local Logistics</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="text-[13px] text-slate-500 dark:text-slate-400 block">Logistic Name</span>
                                                        <p className="text-slate-900 dark:text-white font-medium text-[15px]">{order.logistic_name}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] text-slate-500 dark:text-slate-400 block">Branch</span>
                                                        <p className="text-slate-900 dark:text-white font-medium text-[15px]">{order.delivery_branch}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[13px] text-slate-500 dark:text-slate-400 block">Est Cost</span>
                                                        <p className="text-emerald-600 dark:text-emerald-400 font-medium text-[15px]">Rs. {order.courier_delivery_fee || 0}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <Truck className="text-emerald-500 dark:text-emerald-600 shrink-0 ml-4" size={24} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                            <h2 className="text-[19px] font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                                <Package size={18} className="text-indigo-500" />
                                Order Items
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[15px] text-slate-600 dark:text-slate-400">
                                    <thead className="bg-gray-50 dark:bg-slate-900/50 text-[13px] uppercase font-semibold text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Product</th>
                                            <th className="px-4 py-3 text-center">Qty</th>
                                            <th className="px-4 py-3 text-right">Unit Price</th>
                                            <th className="px-4 py-3 text-right rounded-r-lg">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                        {order.items?.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.product_name}</td>
                                                <td className="px-4 py-3 text-center">{item.qty}</td>
                                                <td className="px-4 py-3 text-right">Rs. {item.amount}</td>
                                                <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">Rs. {item.qty * item.amount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="border-t border-gray-100 dark:border-slate-700 mt-4 pt-4 space-y-2">
                                <div className="flex justify-between text-[15px]">
                                    <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                                    <span className="text-slate-700 dark:text-slate-200">Rs. {(order.total_amount - (order.delivery_charge || 0)).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[15px]">
                                    <span className="text-slate-500 dark:text-slate-400">Delivery Charge</span>
                                    <span className="text-slate-700 dark:text-slate-200">Rs. {order.delivery_charge || 0}</span>
                                </div>
                                <div className="flex justify-between text-[19px] font-bold pt-2 border-t border-gray-100 dark:border-slate-700">
                                    <span className="text-slate-900 dark:text-white">Total</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">Rs. {order.total_amount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Audit Trail & Meta */}
                    <div className="space-y-4">

                        {/* Platform Info */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm">
                            <h2 className="text-[15px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-3">Platform Info</h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[13px] text-slate-500 block">Platform</label>
                                    <p className="text-slate-900 dark:text-white capitalize">{order.platform || 'Direct'}</p>
                                </div>
                                <div>
                                    <label className="text-[13px] text-slate-500 block">Page/Account</label>
                                    <p className="text-slate-900 dark:text-white font-medium break-all">
                                        {order.page_name ? order.page_name : order.platform_account}
                                    </p>
                                    {order.page_name && order.platform_account && order.page_name !== order.platform_account && (
                                        <p className="text-[13px] text-slate-500 font-mono mt-0.5">ID: {order.platform_account}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[13px] text-slate-500 block">Order ID (Internal)</label>
                                    <p className="text-slate-500 dark:text-slate-400 font-mono text-[13px]">{order.id}</p>
                                </div>
                            </div>
                        </div>

                        {/* Audit Trail - Scrollable with auto-scroll */}
                        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col max-h-[500px]">
                            <h2 className="text-[19px] font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 flex-shrink-0">
                                <History size={18} className="text-orange-500" />
                                Audit Trail
                            </h2>
                            <div
                                ref={auditTrailRef}
                                className="flex-1 overflow-y-auto pr-2 custom-scrollbar"
                                style={{ scrollBehavior: 'smooth' }}
                            >
                                <div className="relative border-l-2 border-gray-100 dark:border-slate-700 ml-3 space-y-4 pl-6 py-2">
                                    {order.status_history && order.status_history.length > 0 ? (
                                        order.status_history.map((h: any, idx: number) => {
                                            let label = h.status;
                                            if (h.status === 'New Order') label = 'Created';
                                            else if (h.status === 'Confirmed Order') label = 'Confirmed';
                                            else if (h.status === 'Ready to Ship') label = 'Ready to Ship';
                                            else if (h.status === 'Packed') label = 'Packed';
                                            else if (h.status === 'Shipped') label = 'Shipped';
                                            else if (h.status === 'Arrived at Branch') label = 'Arrived at Branch';
                                            else if (h.status === 'Delivered') label = 'Delivered';

                                            return (
                                                <div key={h.id || idx} className="relative">
                                                    <div className="absolute -left-[31px] bg-white dark:bg-slate-800 p-1">
                                                        <div className={`w-3 h-3 ${idx === order.status_history.length - 1 ? 'bg-indigo-600 dark:bg-indigo-500 ring-2 ring-indigo-500/20' : 'bg-gray-300 dark:bg-slate-600'} rounded-full`}></div>
                                                    </div>
                                                    <h4 className="text-[15px] font-semibold text-slate-900 dark:text-white">{h.status}</h4>
                                                    <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                        {label} by <span className="text-slate-700 dark:text-slate-300 font-medium">{h.changed_by || 'System'}</span>
                                                    </p>
                                                    {h.remarks && (
                                                        <p className="text-[12px] text-indigo-500 dark:text-indigo-400 italic bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10 mt-1">
                                                            {h.remarks}
                                                        </p>
                                                    )}
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-1">
                                                        {new Date(h.changed_at).toLocaleString()}
                                                    </p>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        /* Fallback for older orders without history */
                                        <div className="relative">
                                            <div className="absolute -left-[31px] bg-white dark:bg-slate-800 p-1">
                                                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                            </div>
                                            <h4 className="text-[15px] font-semibold text-slate-900 dark:text-white">Order Created</h4>
                                            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                                                By <span className="text-slate-700 dark:text-slate-300 font-medium">{order.created_by || 'System'}</span>
                                            </p>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                                                {order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>


                {/* Edit Modal */}
                <EditOrderModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    order={order}
                    user={user}
                    onSaveSuccess={() => {
                        fetchOrderDetails(); // Refresh data
                        setIsEditModalOpen(false);
                    }}
                />
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #334155;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #475569;
                }
            `}</style>
        </div>
    );
}
