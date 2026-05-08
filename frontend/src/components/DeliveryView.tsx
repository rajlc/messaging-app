"use client";

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
    Package, Truck, Clock, CheckCircle2, User, RefreshCw, 
    Search, XCircle, ChevronRight, Filter, FileText, Wallet, Plus, Calendar, DollarSign, Download
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type TabType = 'my-orders' | 'my-settlement' | 'my-report' | 'admin-orders' | 'admin-settlement' | 'admin-report' | 'admin-stock';
type AdminSubTab = 'pending' | 'delivered' | 'all';
type SettlementSubTab = 'pending' | 'complete';
type AdminReportSubTab = 'daily' | 'rider';
type RiderSubTab = 'today' | 'all';

export default function DeliveryView() {
    const { user } = useAuth();
    const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'editor';
    
    const [activeTab, setActiveTab] = useState<TabType>(isAdmin ? 'admin-orders' : 'my-orders');
    const [adminSubTab, setAdminSubTab] = useState<AdminSubTab>('pending');
    const [settlementSubTab, setSettlementSubTab] = useState<SettlementSubTab>('pending');
    const [adminReportSubTab, setAdminReportSubTab] = useState<AdminReportSubTab>('daily');
    const [riderSubTab, setRiderSubTab] = useState<RiderSubTab>('today');
    
    const [orders, setOrders] = useState<any[]>([]);
    const [adminOrders, setAdminOrders] = useState<any[]>([]);
    const [settlements, setSettlements] = useState<any[]>([]);
    const [pendingSummaries, setPendingSummaries] = useState<any[]>([]);
    const [riders, setRiders] = useState<any[]>([]);
    const [mySummary, setMySummary] = useState<any>(null);
    const [myStock, setMyStock] = useState<any[]>([]);
    const [myReportData, setMyReportData] = useState<any[]>([]);
    const [reportData, setReportData] = useState<any[]>([]);
    const [riderStock, setRiderStock] = useState<any[]>([]);
    const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [stockForm, setStockForm] = useState({
        riderId: '',
        productName: '',
        quantity: '',
        amount: ''
    });
    
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Filters for Report
    const [reportFilters, setReportFilters] = useState({
        startDate: '',
        endDate: '',
        riderId: ''
    });

    // Modal state for "Complete" action
    const [completingOrderId, setCompletingOrderId] = useState<string | null>(null);
    
    // Settlement Modal state
    const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
    const [settlementForm, setSettlementForm] = useState({
        riderId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (activeTab === 'my-orders') {
            fetchAssignedOrders();
        } else if (activeTab === 'my-settlement') {
            fetchMySummary();
        } else if (activeTab === 'my-report') {
            fetchMyReport();
        } else if (activeTab === 'admin-orders') {
            fetchAdminDeliveryOrders();
        } else if (activeTab === 'admin-settlement') {
            if (settlementSubTab === 'complete') {
                fetchSettlements();
            } else {
                fetchPendingSummaries();
            }
        } else if (activeTab === 'admin-report') {
            if (adminReportSubTab === 'daily') {
                fetchRiders();
                fetchReport();
            } else {
                fetchRiders();
                fetchPendingSummaries();
                fetchAdminDeliveryOrders();
                fetchRiderStock();
                fetchInventoryProducts();
            }
        } else if (activeTab === 'admin-stock') {
            fetchRiders();
            fetchRiderStock();
            fetchInventoryProducts();
        }
    }, [activeTab, settlementSubTab, reportFilters, adminReportSubTab]);

    const fetchAssignedOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/rider/assigned`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setOrders(res.data || []);
        } catch (error) {
            console.error('Failed to fetch assigned orders', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMySummary = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settlements/my-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMySummary(res.data);
            fetchMyStock(); // Also fetch stock
        } catch (error) {
            console.error('Failed to fetch my summary', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyReport = async () => {
        try {
            const token = localStorage.getItem('token');
            // Last 30 days
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 30);
            
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settlements/my-delivery-report`, {
                params: {
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0]
                },
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMyReportData(res.data || []);
        } catch (error) {
            console.error('Failed to fetch my report', error);
        }
    };

    const fetchAdminDeliveryOrders = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/admin/delivery-list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setAdminOrders(res.data || []);
        } catch (error) {
            console.error('Failed to fetch admin delivery orders', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyStock = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/rider-inventory/my-stock`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setMyStock(res.data || []);
        } catch (error) {
            console.error('Failed to fetch my stock', error);
        }
    };

    const fetchSettlements = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settlements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setSettlements(res.data || []);
        } catch (error) {
            console.error('Failed to fetch settlements', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingSummaries = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settlements/pending-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPendingSummaries(res.data || []);
        } catch (error) {
            console.error('Failed to fetch pending summaries', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRiders = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settlements/riders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setRiders(res.data || []);
        } catch (error) {
            console.error('Failed to fetch riders', error);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const params = new URLSearchParams();
            if (reportFilters.startDate) params.append('startDate', reportFilters.startDate);
            if (reportFilters.endDate) params.append('endDate', reportFilters.endDate);
            if (reportFilters.riderId) params.append('riderId', reportFilters.riderId);

            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settlements/delivery-report?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setReportData(res.data || []);
        } catch (error) {
            console.error('Failed to fetch report', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRiderStock = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/rider-inventory/all`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setRiderStock(res.data || []);
        } catch (error) {
            console.error('Failed to fetch rider stock', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventoryProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/inventory-products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setInventoryProducts(res.data || []);
        } catch (error) {
            console.error('Failed to fetch inventory products', error);
        }
    };

    const handleAssignStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockForm.riderId || !stockForm.productName || !stockForm.quantity) {
            alert('Please fill all fields');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/rider-inventory/assign`, 
                {
                    rider_id: stockForm.riderId,
                    product_name: stockForm.productName,
                    quantity: parseInt(stockForm.quantity),
                    amount: parseFloat(stockForm.amount)
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setIsStockModalOpen(false);
            setStockForm({ riderId: '', productName: '', quantity: '', amount: '' });
            fetchRiderStock();
        } catch (error) {
            console.error('Failed to assign stock', error);
            alert('Failed to assign stock');
        }
    };

    const handleAddSettlement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settlementForm.riderId || !settlementForm.amount || !settlementForm.date) {
            alert('Please fill all fields');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settlements`, 
                {
                    riderId: settlementForm.riderId,
                    amount: parseFloat(settlementForm.amount),
                    date: settlementForm.date
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setIsSettlementModalOpen(false);
            setSettlementForm({ riderId: '', amount: '', date: new Date().toISOString().split('T')[0] });
            fetchSettlements();
        } catch (error) {
            console.error('Failed to add settlement', error);
            alert('Failed to add settlement');
        }
    };

    const handleCancelAssignment = async (orderId: string) => {
        if (!confirm('Are you sure you want to cancel this assignment?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${orderId}/cancel-assignment`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchAssignedOrders();
            if (activeTab === 'admin-orders') fetchAdminDeliveryOrders();
        } catch (error) {
            console.error('Failed to cancel assignment', error);
        }
    };

    const handleApproveReturn = async (orderId: string) => {
        if (!confirm('Mark this order as Returned Delivered (Received in Warehouse)?')) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${orderId}/delivery-status`, 
                { status: 'Returned Delivered' },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            fetchAdminDeliveryOrders();
            fetchPendingSummaries();
        } catch (error) {
            console.error('Failed to approve return', error);
            alert('Failed to approve return');
        }
    };

    const handleInitialComplete = async (orderId: string) => {
        try {
            const token = localStorage.getItem('token');
            // First change status to Shipped
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${orderId}/delivery-status`, 
                { status: 'Shipped' }, 
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            // Then show options for Delivered/Failed
            setCompletingOrderId(orderId);
            fetchAssignedOrders();
        } catch (error) {
            console.error('Failed to update status', error);
        }
    };

    const handleFinalStatus = async (status: 'Delivered' | 'Delivery Failed') => {
        if (!completingOrderId) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${completingOrderId}/delivery-status`, 
                { status }, 
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            setCompletingOrderId(null);
            fetchAssignedOrders();
        } catch (error) {
            console.error('Failed to update final status', error);
        }
    };

    const handleReturnStock = async (stockId: string) => {
        if (!confirm('Are you sure you want to return this stock to warehouse?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/rider-inventory/${stockId}/status`, 
                { status: 'return_pending' },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            fetchMyStock();
        } catch (error) {
            console.error('Failed to return stock', error);
            alert('Failed to return stock');
        }
    };

    const handleApproveStockReturn = async (stockId: string, approve: boolean) => {
        const newStatus = approve ? 'returned' : 'assigned';
        if (!confirm(`Are you sure you want to ${approve ? 'approve' : 'decline'} this stock return?`)) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/rider-inventory/${stockId}/status`, 
                { status: newStatus },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            fetchRiderStock();
        } catch (error) {
            console.error('Failed to update stock return status', error);
            alert('Failed to update stock return status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
            case 'Packed': return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
            case 'Shipped': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
            case 'Delivery Failed': return 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400';
            case 'Return Process': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
            case 'Returned Delivered': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400';
            case 'Confirmed Order': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400';
            default: return 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    const filteredRiderOrders = useMemo(() => {
        const today = new Date().toLocaleDateString();
        
        let filtered = orders.filter(o => 
            o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        if (riderSubTab === 'today') {
            filtered = filtered.filter(o => {
                const today = new Date().toLocaleDateString();
                const isDeliveredToday = o.status_history?.some((h: any) => 
                    h.status === 'Delivered' && new Date(h.changed_at).toLocaleDateString() === today
                );
                return ['Packed', 'Shipped', 'Return Process'].includes(o.order_status) || isDeliveredToday;
            });

            // Sorting: Packed -> Shipped -> Delivered
            const statusOrder: any = { 'Packed': 1, 'Shipped': 2, 'Delivered': 3 };
            filtered.sort((a, b) => (statusOrder[a.order_status] || 99) - (statusOrder[b.order_status] || 99));
        }

        return filtered;
    }, [orders, riderSubTab, searchQuery]);

    const renderRiderOrders = () => {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={() => setRiderSubTab('today')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${riderSubTab === 'today' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
                    >
                        Today Order
                    </button>
                    <button 
                        onClick={() => setRiderSubTab('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${riderSubTab === 'all' 
                            ? 'bg-slate-600 text-white shadow-lg shadow-slate-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
                    >
                        All Order (Last 7 Days)
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-4 py-4">Date</th>
                                    <th className="px-4 py-4">Order ID</th>
                                    <th className="px-4 py-4">Customer</th>
                                    <th className="px-4 py-4">Phone</th>
                                    <th className="px-4 py-4">Products</th>
                                    <th className="px-4 py-4 text-center">Qty</th>
                                    <th className="px-4 py-4 text-right">Amount</th>
                                    <th className="px-4 py-4 text-center">Status</th>
                                    <th className="px-4 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {filteredRiderOrders.map((order) => {
                                    const totalQty = order.items?.reduce((sum: number, i: any) => sum + (i.qty || 0), 0) || 0;
                                    return (
                                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[13px]">
                                            <td className="px-4 py-4 text-slate-500 whitespace-nowrap">
                                                {new Date(order.assigned_at || order.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                #{order.order_number}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                                                {order.customer_name}
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                                                {order.phone_number}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                    {order.items?.map((item: any, i: number) => (
                                                        <span key={i} className="text-[10px] bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 truncate">
                                                            {item.product_name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-medium">{totalQty}</td>
                                            <td className="px-4 py-4 text-right font-black">Rs. {order.total_amount}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(order.order_status)}`}>
                                                    {order.order_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-center gap-2">
                                                    {order.order_status === 'Packed' ? (
                                                        <>
                                                            <button 
                                                                onClick={() => handleInitialComplete(order.id)}
                                                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                                                            >
                                                                Complete
                                                            </button>
                                                            <button 
                                                                onClick={() => handleCancelAssignment(order.id)}
                                                                className="px-3 py-1 bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors border border-red-200 dark:border-red-500/20"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : order.order_status === 'Shipped' ? (
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => { setCompletingOrderId(order.id); handleFinalStatus('Delivered'); }}
                                                                className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[10px] font-black uppercase"
                                                            >
                                                                Delivered
                                                            </button>
                                                            <button 
                                                                onClick={() => { setCompletingOrderId(order.id); handleFinalStatus('Delivery Failed'); }}
                                                                className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-black uppercase"
                                                            >
                                                                Failed
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-[11px]">No actions</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredRiderOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500 italic bg-gray-50/50 dark:bg-slate-900/10">
                                            No assigned orders found matching your search.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderAdminOrders = () => {
        const filtered = adminOrders.filter(o => {
            const matchesSearch = o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 o.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (adminSubTab === 'pending') {
                return matchesSearch && (
                    o.order_status === 'Packed' || 
                    o.order_status === 'Shipped' || 
                    o.order_status === 'Ready to Ship' ||
                    o.order_status === 'Ready To Ship' ||
                    o.order_status === 'Delivery Process' ||
                    o.order_status === 'Confirmed Order' ||
                    o.order_status === 'Return Process'
                );
            } else if (adminSubTab === 'delivered') {
                return matchesSearch && (
                    o.order_status === 'Delivered' || 
                    o.order_status === 'delivered'
                );
            } else {
                // 'all' sub-tab
                return matchesSearch;
            }
        });

        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={() => setAdminSubTab('pending')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${adminSubTab === 'pending' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
                    >
                        Pending Deliveries
                    </button>
                    <button 
                        onClick={() => setAdminSubTab('delivered')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${adminSubTab === 'delivered' 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
                    >
                        Successfully Delivered
                    </button>
                    <button 
                        onClick={() => setAdminSubTab('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${adminSubTab === 'all' 
                            ? 'bg-slate-600 text-white shadow-lg shadow-slate-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
                    >
                        All Order
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-4 py-4">Date</th>
                                    <th className="px-4 py-4">Order ID</th>
                                    <th className="px-4 py-4">Customer</th>
                                    <th className="px-4 py-4">Assigned Rider</th>
                                    <th className="px-4 py-4 text-right">Amount</th>
                                    <th className="px-4 py-4 text-center">Status</th>
                                    <th className="px-4 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {filtered.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[13px]">
                                        <td className="px-4 py-4 text-slate-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                            #{order.order_number}
                                        </td>
                                        <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">
                                            {order.customer_name}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] text-blue-600 font-bold">
                                                    {order.assigned_rider?.full_name?.charAt(0) || '?'}
                                                </div>
                                                <span className="text-slate-600 dark:text-slate-300 font-medium">
                                                    {order.assigned_rider?.full_name || 'Unassigned'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-black">Rs. {order.total_amount}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${getStatusColor(order.order_status)}`}>
                                                {order.order_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {['Return Process', 'Delivery Failed', 'Hold', 'Returning to Seller'].includes(order.order_status) && (
                                                <button 
                                                    onClick={() => handleApproveReturn(order.id)}
                                                    className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-black uppercase hover:bg-indigo-700 transition-colors shadow-sm"
                                                >
                                                    Approve Return
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-slate-500 italic bg-gray-50/50 dark:bg-slate-900/10">
                                            No orders found for this category.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderAdminSettlements = () => {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setSettlementSubTab('pending')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settlementSubTab === 'pending' 
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
                        >
                            Pending
                        </button>
                        <button 
                            onClick={() => setSettlementSubTab('complete')}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${settlementSubTab === 'complete' 
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50'}`}
                        >
                            Complete
                        </button>
                    </div>

                    {settlementSubTab === 'complete' && (
                        <button 
                            onClick={() => { fetchRiders(); setIsSettlementModalOpen(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Plus size={16} /> Add Settlement
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        {settlementSubTab === 'pending' ? (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                        <th className="px-4 py-4">Delivery Person</th>
                                        <th className="px-4 py-4 text-right">Total Amount</th>
                                        <th className="px-4 py-4 text-right">Returned Order Amount</th>
                                        <th className="px-4 py-4 text-right">Settled Amount</th>
                                        <th className="px-4 py-4 text-right">Pending Settlement Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                    {pendingSummaries.map((s, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[13px]">
                                            <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">{s.rider_name}</td>
                                            <td className="px-4 py-4 text-right font-medium">Rs. {s.pending_amount}</td>
                                            <td className="px-4 py-4 text-right font-medium text-red-500">Rs. {s.returned_amount}</td>
                                            <td className="px-4 py-4 text-right font-medium text-emerald-500">Rs. {s.settled_amount}</td>
                                            <td className="px-4 py-4 text-right font-black text-indigo-600 dark:text-indigo-400">Rs. {s.net_pending_settlement}</td>
                                        </tr>
                                    ))}
                                    {pendingSummaries.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-12 text-center text-slate-500 italic">No pending settlements found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                        <th className="px-4 py-4">Date</th>
                                        <th className="px-4 py-4">Rider</th>
                                        <th className="px-4 py-4 text-right">Amount</th>
                                        <th className="px-4 py-4">Recorded By</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                    {settlements.map((s) => (
                                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[13px]">
                                            <td className="px-4 py-4 text-slate-500">
                                                {new Date(s.settlement_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">
                                                {s.rider?.full_name}
                                            </td>
                                            <td className="px-4 py-4 text-right font-black">Rs. {s.amount}</td>
                                            <td className="px-4 py-4 text-slate-500 italic text-[11px]">
                                                {s.created_by}
                                            </td>
                                        </tr>
                                    ))}
                                    {settlements.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-slate-500 italic">No settlement history found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderMySettlement = () => {
        if (!mySummary) return null;
        
        return (
            <div className="flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-4 py-4">Delivery Person</th>
                                    <th className="px-4 py-4 text-right">Pending Settlement Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[15px]">
                                    <td className="px-4 py-6 font-bold text-slate-900 dark:text-white">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black">
                                                {mySummary.rider_name?.charAt(0) || 'R'}
                                            </div>
                                            {mySummary.rider_name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-6 text-right font-black text-2xl text-indigo-600 dark:text-indigo-400">
                                        Rs. {mySummary.net_pending_settlement}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <p className="text-xs font-black text-slate-500 uppercase mb-2">Total Amount</p>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">Rs. {mySummary.pending_amount}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Includes Packed, Shipped, Delivered & Failed</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <p className="text-xs font-black text-slate-500 uppercase mb-2">Returned Amount</p>
                        <p className="text-xl font-bold text-red-500">Rs. {mySummary.returned_amount}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Failed deliveries</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                        <p className="text-xs font-black text-slate-500 uppercase mb-2">Already Settled</p>
                        <p className="text-xl font-bold text-emerald-500">Rs. {mySummary.settled_amount}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Paid to you</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-center gap-4">
                    <button 
                        onClick={() => setIsReturnModalOpen(true)}
                        className="flex items-center gap-2 px-8 py-4 bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-600/30 active:scale-95"
                    >
                        <RefreshCw size={20} />
                        Pending Return Orders ({orders.filter(o => ['Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status)).length})
                    </button>
                </div>

                {/* My Stock Section */}
                <div className="mt-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Truck size={20} className="text-emerald-500" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">My Stock</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                        <th className="px-6 py-4">Product Name</th>
                                        <th className="px-6 py-4 text-center">Quantity</th>
                                        <th className="px-6 py-4 text-center">Price / Unit</th>
                                        <th className="px-6 py-4 text-center">Assigned Date</th>
                                        <th className="px-6 py-4 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                    {myStock.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[13px]">
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                {item.product_name}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 rounded-lg font-black">
                                                    {item.quantity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-emerald-600">
                                                Rs. {item.amount || 0}
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-500">
                                                {new Date(item.assigned_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {item.status === 'return_pending' ? (
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                                        Pending Approval
                                                    </span>
                                                ) : (
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                // Future Quick Sale implementation
                                                                alert('Quick Sale for Web coming soon!');
                                                            }}
                                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all"
                                                        >
                                                            Quick Sale
                                                        </button>
                                                        <button
                                                            onClick={() => handleReturnStock(item.id)}
                                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all"
                                                        >
                                                            Back to Warehouse
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {myStock.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                                                No stock assigned to you.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        );
    };

    const renderMyReport = () => {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                    <FileText size={20} className="text-blue-500" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">My Delivery Report (Last 30 Days)</h3>
                </div>
                
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-4">Delivery Date</th>
                                    <th className="px-6 py-4 text-center">Parcel Qty (Delivered)</th>
                                    <th className="px-6 py-4 text-right">Delivery Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {myReportData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[13px]">
                                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                                            {new Date(row.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg font-black">
                                                {row.parcel_qty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                            Rs. {row.delivery_amount?.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {myReportData.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center text-slate-500 italic">
                                            No delivery records found for the last 30 days.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {myReportData.length > 0 && (
                                <tfoot className="bg-gray-50/80 dark:bg-slate-900/80 font-black">
                                    <tr className="text-slate-900 dark:text-white border-t border-gray-200 dark:border-slate-700">
                                        <td className="px-6 py-4 text-right uppercase tracking-widest text-[10px]">Total</td>
                                        <td className="px-6 py-4 text-center text-blue-600 dark:text-blue-400">
                                            {myReportData.reduce((sum, r) => sum + r.parcel_qty, 0)} Parcels
                                        </td>
                                        <td className="px-6 py-4 text-right text-emerald-600 dark:text-emerald-400">
                                            Rs. {myReportData.reduce((sum, r) => sum + (r.delivery_amount || 0), 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderAdminRiderReport = () => {
        const sortedRiders = [...pendingSummaries].sort((a, b) => b.net_pending_settlement - a.net_pending_settlement);

        return (
            <div className="flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {sortedRiders.map((rider, idx) => {
                        const riderPendingOrders = adminOrders.filter(o => 
                            o.assigned_rider_id === rider.rider_id && 
                            o.order_status !== 'Delivered' && 
                            o.order_status !== 'delivered' &&
                            o.order_status !== 'Returned Delivered'
                        );
                        const assignedStock = riderStock.filter(s => s.rider_id === rider.rider_id && (s.status === 'assigned' || s.status === 'return_pending'));

                        return (
                            <div key={idx} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm flex flex-col">
                                <div className="p-6 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-black text-xl">
                                            {rider.rider_name?.charAt(0) || 'R'}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{rider.rider_name}</h3>
                                            <p className="text-xs text-slate-500 font-medium">Rider Performance</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Pending Settlement</p>
                                        <p className={`text-2xl font-black ${rider.net_pending_settlement > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            Rs. {rider.net_pending_settlement}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 border-b border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 divide-x divide-gray-100 dark:divide-slate-700">
                                    <div className="p-4 text-center hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">Rs. {rider.pending_amount}</p>
                                    </div>
                                    <div className="p-4 text-center bg-red-50/30 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Returned</p>
                                        <p className="text-sm font-bold text-red-500">Rs. {rider.returned_amount}</p>
                                    </div>
                                    <div className="p-4 text-center bg-emerald-50/30 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Settled</p>
                                        <p className="text-sm font-bold text-emerald-500">Rs. {rider.settled_amount}</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50/50 dark:bg-slate-900/30 flex gap-3 border-b border-gray-100 dark:border-slate-700">
                                    <button 
                                        onClick={() => {
                                            setSettlementForm({ ...settlementForm, riderId: rider.rider_id });
                                            setIsSettlementModalOpen(true);
                                        }}
                                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20"
                                    >
                                        <Wallet size={14} className="text-emerald-50" /> Add Settlement
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setStockForm({ ...stockForm, riderId: rider.rider_id });
                                            setIsStockModalOpen(true);
                                        }}
                                        className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20"
                                    >
                                        <Package size={14} className="text-indigo-50" /> Assign Stock
                                    </button>
                                </div>

                                <div className="p-6 space-y-6 flex-1">
                                    <div>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <RefreshCw size={12} /> Pending Orders ({riderPendingOrders.length})
                                        </h4>
                                        {riderPendingOrders.length > 0 ? (
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                                {riderPendingOrders.map((o) => (
                                                    <div key={o.id} className={`p-3 border rounded-xl flex justify-between items-center group ${['Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status) ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' : 'bg-gray-50 dark:bg-slate-900/30 border-gray-100 dark:border-slate-700'}`}>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-xs font-bold text-slate-900 dark:text-white">#{o.order_number}</p>
                                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${['Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status) ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                    {o.order_status}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">{o.customer_name}</p>
                                                            {o.items && o.items.length > 0 && (
                                                                <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1" title={o.items.map((i: any) => `${i.product_name || 'Product'} (x${i.quantity || i.qty || 1})`).join(', ')}>
                                                                    {o.items.map((i: any) => `${i.product_name || 'Product'} (x${i.quantity || i.qty || 1})`).join(', ')}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-black text-slate-900 dark:text-white">Rs. {o.total_amount}</span>
                                                            {['Return Process', 'Delivery Failed', 'Hold', 'Returning to Seller'].includes(o.order_status) && (
                                                                <button
                                                                    onClick={() => handleApproveReturn(o.id)}
                                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all"
                                                                >
                                                                    Approve Return
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-gray-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-center">
                                                <p className="text-xs text-slate-500 italic">No pending orders</p>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Package size={12} /> Assigned Stock ({assignedStock.length})
                                        </h4>
                                        {assignedStock.length > 0 ? (
                                            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl overflow-hidden">
                                                <table className="w-full text-left">
                                                    <thead className="bg-gray-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase">
                                                        <tr>
                                                            <th className="px-3 py-2">Product</th>
                                                            <th className="px-3 py-2 text-center">Qty</th>
                                                            <th className="px-3 py-2 text-right">Value/Unit</th>
                                                            <th className="px-3 py-2 text-center">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                                        {assignedStock.map((s) => (
                                                            <tr key={s.id} className="text-xs">
                                                                <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">{s.product_name}</td>
                                                                <td className="px-3 py-2 text-center font-bold text-indigo-600 dark:text-indigo-400">{s.quantity}</td>
                                                                <td className="px-3 py-2 text-right font-medium">Rs. {s.amount}</td>
                                                                <td className="px-3 py-2 text-center">
                                                                    {s.status === 'return_pending' ? (
                                                                        <div className="flex justify-center gap-1">
                                                                            <button
                                                                                onClick={() => handleApproveStockReturn(s.id, true)}
                                                                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[9px] font-black uppercase shadow-sm transition-all"
                                                                            >
                                                                                Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleApproveStockReturn(s.id, false)}
                                                                                className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[9px] font-black uppercase shadow-sm transition-all"
                                                                            >
                                                                                Decline
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-slate-400 italic text-[10px]">Assigned</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-gray-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 text-center">
                                                <p className="text-xs text-slate-500 italic">No assigned stock</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {sortedRiders.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-500 italic bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl">
                            No riders found.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderAdminReport = () => {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setAdminReportSubTab('daily')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${adminReportSubTab === 'daily' 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50 border border-gray-200 dark:border-slate-700'}`}
                        >
                            <Calendar size={16} /> Daily Report
                        </button>
                        <button 
                            onClick={() => setAdminReportSubTab('rider')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${adminReportSubTab === 'rider' 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-gray-50 border border-gray-200 dark:border-slate-700'}`}
                        >
                            <User size={16} /> Rider Report
                        </button>
                    </div>

                    {adminReportSubTab === 'daily' && (
                        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 px-2 border-r border-gray-100 dark:border-slate-700">
                                <Filter size={14} className="text-slate-400" />
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Filters</span>
                            </div>
                            <input 
                                type="date" 
                                value={reportFilters.startDate}
                                onChange={(e) => setReportFilters({...reportFilters, startDate: e.target.value})}
                                className="px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <span className="text-slate-400 text-xs">to</span>
                            <input 
                                type="date" 
                                value={reportFilters.endDate}
                                onChange={(e) => setReportFilters({...reportFilters, endDate: e.target.value})}
                                className="px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <select
                                value={reportFilters.riderId}
                                onChange={(e) => setReportFilters({...reportFilters, riderId: e.target.value})}
                                className="px-3 py-1.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 max-w-[150px]"
                            >
                                <option value="">All Riders</option>
                                {riders.map(r => (
                                    <option key={r.id} value={r.id}>{r.full_name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={() => setReportFilters({startDate: '', endDate: '', riderId: ''})}
                                className="p-1.5 hover:bg-gray-100 dark:bg-slate-700 text-slate-500 rounded-xl transition-colors"
                                title="Clear Filters"
                            >
                                <XCircle size={16} />
                            </button>
                            <button 
                                onClick={fetchReport}
                                className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                            >
                                <Filter size={14} /> Generate
                            </button>
                        </div>
                    )}
                </div>

                {adminReportSubTab === 'daily' ? (
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col flex-1 shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-4">Delivery Date</th>
                                    <th className="px-6 py-4 text-center">Parcel Qty (Delivered)</th>
                                    <th className="px-6 py-4 text-right">Delivery Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {reportData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[13px]">
                                        <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                                            {new Date(row.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg font-black text-[11px]">
                                                {row.parcel_qty}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                                            Rs. {row.delivery_amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {reportData.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic bg-gray-50/50 dark:bg-slate-900/10">
                                            No delivery data found for the selected period.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {reportData.length > 0 && (
                                <tfoot className="bg-gray-50/80 dark:bg-slate-900/80 font-black">
                                    <tr className="text-slate-900 dark:text-white border-t border-gray-200 dark:border-slate-700">
                                        <td colSpan={2} className="px-6 py-4 text-right uppercase tracking-widest text-[11px]">Total Summary</td>
                                        <td className="px-6 py-4 text-center">
                                            {reportData.reduce((sum, r) => sum + r.parcel_qty, 0)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400">
                                            Rs. {reportData.reduce((sum, r) => sum + r.delivery_amount, 0).toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>
                ) : (
                    renderAdminRiderReport()
                )}
            </div>
        );
    };


    const renderAdminStock = () => {
        return (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Rider Stock Assignment</h3>
                    <button 
                        onClick={() => setIsStockModalOpen(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={16} /> Assign Stock
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-4 py-4">Rider</th>
                                    <th className="px-4 py-4">Product Name</th>
                                    <th className="px-4 py-4 text-center">Quantity</th>
                                    <th className="px-4 py-4 text-center">Amount (Rs)</th>
                                    <th className="px-4 py-4 text-center">Status</th>
                                    <th className="px-4 py-4 text-center">Assigned At</th>
                                    <th className="px-4 py-4">Assigned By</th>
                                    <th className="px-4 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                                {riderStock.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/20 transition-colors text-[13px]">
                                        <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">
                                            {s.users?.full_name || 'Unknown Rider'}
                                        </td>
                                        <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-300">
                                            {s.product_name}
                                        </td>
                                        <td className="px-4 py-4 text-center font-black">
                                            {s.quantity}
                                        </td>
                                        <td className="px-4 py-4 text-center font-bold text-indigo-600">
                                            Rs. {s.amount || 0}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                s.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                                s.status === 'return_pending' ? 'bg-amber-100 text-amber-700' :
                                                s.status === 'sold' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {s.status === 'return_pending' ? 'Pending Approval' : s.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center text-slate-500">
                                            {new Date(s.assigned_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-4 text-slate-500 italic text-[11px]">
                                            {s.assigned_by}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {s.status === 'return_pending' && (
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleApproveStockReturn(s.id, true)}
                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleApproveStockReturn(s.id, false)}
                                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-black uppercase shadow-sm transition-all"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {riderStock.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-slate-500 italic">No rider stock assignments found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>


            </div>
        );
    };

    return (
        <div className="p-6 h-full flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
            {/* Main Header */}
            <div className="mb-6 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Truck className="text-blue-500" />
                            Logistics Hub
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Delivery tracking and settlements</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search orders..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                if (activeTab === 'my-orders') fetchAssignedOrders();
                                else if (activeTab === 'my-settlement') fetchMySummary();
                                else if (activeTab === 'my-report') fetchMyReport();
                                else if (activeTab === 'admin-orders') fetchAdminDeliveryOrders();
                                else if (activeTab === 'admin-settlement') {
                                    if (settlementSubTab === 'complete') fetchSettlements();
                                    else fetchPendingSummaries();
                                } else if (activeTab === 'admin-report') {
                                    if (adminReportSubTab === 'daily') fetchReport();
                                    else { fetchPendingSummaries(); fetchAdminDeliveryOrders(); fetchRiderStock(); }
                                }
                            }}
                            className="p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex gap-2 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 w-fit">
                    <button 
                        onClick={() => setActiveTab('my-orders')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'my-orders' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Package size={16} /> My Order List
                    </button>
                    <button 
                        onClick={() => setActiveTab('my-settlement')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'my-settlement' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <Wallet size={16} /> My Settlement
                    </button>
                    <button 
                        onClick={() => setActiveTab('my-report')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'my-report' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <FileText size={16} /> My Report
                    </button>
                    
                    {isAdmin && (
                        <>
                            <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1 self-center" />
                            <button 
                                onClick={() => setActiveTab('admin-orders')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'admin-orders' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <Truck size={16} /> Order List
                            </button>
                            <button 
                                onClick={() => setActiveTab('admin-settlement')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'admin-settlement' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <Wallet size={16} /> Settlement
                            </button>
                            <button 
                                onClick={() => setActiveTab('admin-report')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'admin-report' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <FileText size={16} /> Report
                            </button>
                            <button 
                                onClick={() => setActiveTab('admin-stock')}
                                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'admin-stock' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                <Package size={16} /> Rider Stock
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        {activeTab === 'my-orders' && renderRiderOrders()}
                        {activeTab === 'my-settlement' && renderMySettlement()}
                        {activeTab === 'my-report' && renderMyReport()}
                        {activeTab === 'admin-orders' && renderAdminOrders()}
                        {activeTab === 'admin-settlement' && renderAdminSettlements()}
                        {activeTab === 'admin-report' && renderAdminReport()}
                        {activeTab === 'admin-stock' && renderAdminStock()}
                    </>
                )}
            </div>

            {/* Modals */}
            {isSettlementModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record New Settlement</h3>
                            <button onClick={() => setIsSettlementModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddSettlement} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Select Rider</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <select 
                                        value={settlementForm.riderId}
                                        onChange={(e) => setSettlementForm({...settlementForm, riderId: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                                        required
                                    >
                                        <option value="">Choose a rider...</option>
                                        {riders.map(r => (
                                            <option key={r.id} value={r.id}>{r.full_name} ({r.email})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Settlement Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input 
                                        type="date"
                                        value={settlementForm.date}
                                        onChange={(e) => setSettlementForm({...settlementForm, date: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">Amount Settled</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input 
                                        type="number"
                                        placeholder="0.00"
                                        value={settlementForm.amount}
                                        onChange={(e) => setSettlementForm({...settlementForm, amount: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsSettlementModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Save Settlement
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Assign Stock Modal */}
            {isStockModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-700 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Assign Stock to Rider</h3>
                            <button onClick={() => setIsStockModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAssignStock} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Rider</label>
                                <select 
                                    required
                                    value={stockForm.riderId}
                                    onChange={(e) => setStockForm({...stockForm, riderId: e.target.value})}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select Rider</option>
                                    {riders.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Product</label>
                                <input 
                                    type="text"
                                    required
                                    list="inventory-products-list"
                                    value={stockForm.productName}
                                    onChange={(e) => setStockForm({...stockForm, productName: e.target.value})}
                                    placeholder="Search or select product..."
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <datalist id="inventory-products-list">
                                    {inventoryProducts.map((p, i) => (
                                        <option key={i} value={p.product_name} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Quantity</label>
                                <input 
                                    type="number"
                                    required
                                    min="1"
                                    value={stockForm.quantity}
                                    onChange={(e) => setStockForm({...stockForm, quantity: e.target.value})}
                                    placeholder="Enter quantity"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Sales Amount per unit (Rs)</label>
                                <input 
                                    type="number"
                                    required
                                    min="0"
                                    value={stockForm.amount}
                                    onChange={(e) => setStockForm({...stockForm, amount: e.target.value})}
                                    placeholder="Enter price per unit"
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button 
                                type="submit"
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                            >
                                Confirm Assignment
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Pending Return Orders Modal */}
            {isReturnModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-slate-700">
                        <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-amber-50 dark:bg-amber-500/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-500/10 rounded-xl text-amber-600">
                                    <RefreshCw size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Pending Return Orders</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Orders waiting for warehouse confirmation</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsReturnModalOpen(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <XCircle size={24} className="text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {orders.filter(o => ['Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status)).length > 0 ? (
                                <div className="space-y-3">
                                    {orders.filter(o => ['Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status)).map((order) => (
                                        <div key={order.id} className="p-4 bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 rounded-2xl flex justify-between items-center hover:border-amber-200 dark:hover:border-amber-500/30 transition-all group">
                                            <div>
                                                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">#{order.order_number}</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{order.customer_name}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                                                    <Clock size={10} /> 
                                                    Marked return: {new Date(order.updated_at).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-black text-slate-900 dark:text-white mb-1">Rs. {order.total_amount}</p>
                                                <span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 rounded-lg font-black text-[10px] uppercase tracking-wider">
                                                    Pending Warehouse
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 italic">No pending return orders.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/30">
                            <button 
                                onClick={() => setIsReturnModalOpen(false)}
                                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg active:scale-95"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
