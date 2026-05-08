"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Package, Plus, Search, Filter, Eye, Check, X, Truck, Calendar, List, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import OrderModal from './OrderModal';

export default function OrdersView() {
    // State Refactor: activeTab is main view, todaySubTab is filter for 'todayOrder'
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'todayOrder' | 'orderList'>('todayOrder');
    const [todaySubTab, setTodaySubTab] = useState<'pending' | 'confirmed'>('pending');
    const [orderListSubTab, setOrderListSubTab] = useState<'all' | 'shipped' | 'delivered'>('all');

    // Filter State
    const [logisticsFilter, setLogisticsFilter] = useState<'all' | 'local' | 'pathao'>('all');
    // Advanced Filter State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [branchFilter, setBranchFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Selection State
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Derived State: Unique Branches
    // Note: Assuming orders have 'delivery_branch' or 'city'. Filter logic will depend on how branch is stored.
    // 'delivery_branch' seems to be the field for Local.
    const uniqueBranches = useMemo(() => {
        const branches = new Set<string>();
        orders.forEach(order => {
            if (order.delivery_branch) branches.add(order.delivery_branch);
        });
        return Array.from(branches).sort();
    }, [orders]);


    // View Modal State (Existing) - REMOVED VIEW MODAL FOR PAGE VIEW
    // const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    // const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

    // Create Order Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Edit Order Modal State (New for Confirm action)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<any>(null);

    // Cancel Action State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<string | null>(null);

    // Reset selection and filter when tabs change
    useEffect(() => {
        setSelectedOrders(new Set());
        setLogisticsFilter('all');
    }, [activeTab, todaySubTab]);

    // Load orders on mount or tab change (optimization: fetch once and filter locally?)
    // Current pattern fetches on mount.
    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setOrders(response.data || []);
        } catch (error) {
            console.error('Failed to fetch orders', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders/${orderId}`, {
                order_status: newStatus
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Refresh orders to reflect change
            fetchOrders();
            // Close cancel modal if it was open
            if (isCancelModalOpen) setIsCancelModalOpen(false);
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Failed to update status');
        }
    };

    const handleConfirmAction = (order: any) => {
        // Prepare order object with status set to Confirmed Order for the modal
        // This ensures the modal opens in a state where validation for Confirmed Order applies
        const orderToEdit = { ...order, order_status: 'Confirmed Order' };
        setSelectedOrderForEdit(orderToEdit);
        setIsEditModalOpen(true);
    };

    const handleCancelAction = (orderId: string) => {
        setSelectedOrderForCancel(orderId);
        setIsCancelModalOpen(true);
    };

    const handleShipOrder = async (orderId: string) => {
        if (!window.confirm('Are you sure you want to ship this order via Pathao?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/logistics/ship`, { orderId }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                alert('Order shipped successfully! Consignment ID: ' + response.data.data.consignment_id);
                fetchOrders();
            }
        } catch (error: any) {
            console.error('Failed to ship order', error);
            alert('Failed to ship order: ' + (error.response?.data?.message || error.message));
        }
    };

    // Reset filters when tabs change
    useEffect(() => {
        setStartDate('');
        setEndDate('');
        setBranchFilter('all');
        setStatusFilter('all');
        setLogisticsFilter('all');
        setSearchQuery('');
        setSelectedOrders(new Set());
    }, [activeTab, todaySubTab, orderListSubTab]);

    const getDisplayOrders = () => {
        const today = new Date();

        if (activeTab === 'todayOrder') {
            return orders.filter(order => {
                const orderDate = new Date(order.created_at || order.order_date);
                const isToday = orderDate.getDate() === today.getDate() &&
                    orderDate.getMonth() === today.getMonth() &&
                    orderDate.getFullYear() === today.getFullYear();

                if (todaySubTab === 'pending') {
                    // Logic: Status is "New Order" OR "Follow up again", date DOES NOT matter
                    // These must ALWAYS be created today (per existing logic implication, though 'isToday' variable existed but wasn't strictly enforced in the *pending* block? 
                    // Wait, previous code: return order.order_status === 'New Order' || ...; 
                    // It actually DID NOT check isToday for pending! It just checked status. 
                    // But wait, the 'todayOrder' tab implies it IS today. 
                    // If the user wants strictly Today's new orders, I should probably enforce isToday for Pending too?
                    // Reviewing previous code: 
                    /*
                    if (todaySubTab === 'pending') {
                         return order.order_status === 'New Order' || order.order_status === 'Follow up again';
                    }
                    */
                    // It seems the previous logic relied on the fact that filtering happens inside 'todayOrder' tab, but it didn't use 'isToday' variable for pending. 
                    // Actually, if I look really closely at the previous code (lines 126-128), it ignores 'isToday'.
                    // So any 'New Order' appears in 'Today Order' -> 'Pending'. This might be intentional (all pending tasks).
                    // I will leave 'pending' logic AS IS to avoids regressions.

                    return order.order_status === 'New Order' || order.order_status === 'Follow up again';
                } else if (todaySubTab === 'confirmed') {
                    // Logic: Status is "Confirmed Order" AND date is Today
                    // OR: Status is "Shipped" AND Shipped Date is Today

                    const isCreatedTodayAndConfirmed = isToday && order.order_status === 'Confirmed Order';

                    let isShippedToday = false;
                    if (order.order_status === 'Shipped' && order.shipped_at) {
                        const shippedDate = new Date(order.shipped_at);
                        isShippedToday = shippedDate.getDate() === today.getDate() &&
                            shippedDate.getMonth() === today.getMonth() &&
                            shippedDate.getFullYear() === today.getFullYear();
                    }

                    const isConfirmed = isCreatedTodayAndConfirmed || isShippedToday;

                    if (!isConfirmed) return false;

                    // Apply Logistics Filter
                    if (logisticsFilter === 'all') return true;
                    if (logisticsFilter === 'local') return order.courier_provider === 'local';
                    if (logisticsFilter === 'pathao') return order.courier_provider === 'pathao';
                    return true;
                }
                return false;
            }).sort((a, b) => {
                if (todaySubTab === 'confirmed') {
                    if (a.order_status === 'Confirmed Order' && b.order_status !== 'Confirmed Order') return -1;
                    if (a.order_status !== 'Confirmed Order' && b.order_status === 'Confirmed Order') return 1;
                }
                // Default sort (newest first) - assuming original array was sorted or we iterate creation date
                return new Date(b.created_at || b.order_date).getTime() - new Date(a.created_at || a.order_date).getTime();
            });
        }

        // Active Tab: Order List
        let orderList = orders;

        // 1. Sub-Tab Filter
        if (orderListSubTab === 'shipped') {
            orderList = orderList.filter(order => order.order_status === 'Shipped');
        } else if (orderListSubTab === 'delivered') {
            orderList = orderList.filter(order => order.order_status === 'Delivered');
        }

        // Advanced Filters

        // A. Branch Filter
        if (branchFilter !== 'all') {
            orderList = orderList.filter(order => order.delivery_branch === branchFilter);
        }

        // B. Logistic Filter
        if (logisticsFilter !== 'all') {
            if (logisticsFilter === 'local') {
                orderList = orderList.filter(order => order.courier_provider === 'local');
            } else if (logisticsFilter === 'pathao') {
                orderList = orderList.filter(order => order.courier_provider === 'pathao');
            }
        }

        // Filters only for "All" sub-tab (though technically user could want them elsewhere, user specificied specific layouts)
        // However, standard UX is that filters apply if visible. The UI hides them for shipped/delivered.
        // But for safety, I will apply them generally if they are set (which they shouldn't be if hidden and cleared).

        // C. Status Filter
        if (statusFilter !== 'all') {
            orderList = orderList.filter(order => order.order_status === statusFilter);
        }

        // D. Date Range
        if (startDate) {
            orderList = orderList.filter(order => {
                const orderDate = new Date(order.created_at || order.order_date);
                // Reset time part for comparison
                const checkDate = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
                const start = new Date(startDate);
                // Fix timezone offset issue by treating input as local date
                // Actually start date string from input is YYYY-MM-DD.
                const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());

                return checkDate >= startLocal;
            });
        }
        if (endDate) {
            orderList = orderList.filter(order => {
                const orderDate = new Date(order.created_at || order.order_date);
                const checkDate = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
                const end = new Date(endDate);
                const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate());

                return checkDate <= endLocal;
            });
        }

        // E. Search Filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            orderList = orderList.filter(order => {
                return (
                    (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
                    (order.address && order.address.toLowerCase().includes(query)) ||
                    (order.order_number && String(order.order_number).toLowerCase().includes(query)) ||
                    (order.items && order.items.some((item: any) => item.product_name.toLowerCase().includes(query)))
                );
            });
        }

        return orderList;
    };

    const displayOrders = getDisplayOrders();

    // Selection Handlers
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(displayOrders.map(o => o.id));
            setSelectedOrders(allIds);
        } else {
            setSelectedOrders(new Set());
        }
    };

    const handleSelectRow = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedOrders);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedOrders(newSelected);
    };

    // Bulk Actions
    const handleBulkLocalShip = async () => {
        if (!window.confirm(`Are you sure you want to mark ${selectedOrders.size} local orders as Shipped?`)) return;
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const orderId of selectedOrders) {
            try {
                const token = localStorage.getItem('token');
                await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders/${orderId}`, {
                    order_status: 'Shipped'
                }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to update order ${orderId}`, error);
                failCount++;
            }
        }
        setLoading(false);
        alert(`Bulk Action Complete:\nSuccessfully Shipped: ${successCount}\nFailed: ${failCount}`);
        setSelectedOrders(new Set());
        fetchOrders(); // Refresh
    };

    const handleBulkPathaoShip = async () => {
        const eligibleOrders = displayOrders.filter(o =>
            selectedOrders.has(o.id) &&
            o.courier_provider === 'pathao' &&
            !o.courier_consignment_id
        );

        if (eligibleOrders.length === 0) {
            alert("No eligible Pathao orders selected for shipping (Orders must be Pathao and not already shipped).");
            return;
        }

        if (!window.confirm(`Attempting to ship ${eligibleOrders.length} orders via Pathao. Continue?`)) return;

        setLoading(true);
        const results: string[] = [];
        let successCount = 0;

        for (const order of eligibleOrders) {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/logistics/ship`, { orderId: order.id }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.data.success) {
                    successCount++;
                    results.push(`Order #${order.order_number}: Success (ID: ${response.data.data.consignment_id})`);
                }
            } catch (error: any) {
                const reason = error.response?.data?.message || error.message;
                results.push(`Order #${order.order_number}: Failed (${reason})`);
            }
        }

        setLoading(false);
        alert(`Bulk Pathao Shipping Complete:\nSuccess: ${successCount}/${eligibleOrders.length}\n\nDetails:\n${results.join('\n')}`);
        setSelectedOrders(new Set());
        fetchOrders();
    };

    // Helper to get order details for render
    const cancelOrderDetails = selectedOrderForCancel ? orders.find(o => o.id === selectedOrderForCancel) : null;

    return (
        <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 h-full relative">
            {/* Header */}
            <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-6 flex-shrink-0">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Package className="text-blue-500" />
                    Order Details
                </h2>
            </div>

            {/* Content Container - Reduced padding and margin as requested */}
            <div className="flex-1 overflow-hidden flex flex-col p-4 pt-2">

                <div className="flex flex-col h-full bg-slate-900 text-slate-200">
                    {/* Main Header Area */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-700">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Package className="text-blue-500" />
                                Orders
                            </h2>

                            {/* Main Tabs */}
                            <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                                <button
                                    onClick={() => setActiveTab('todayOrder')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'todayOrder'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Today's Orders
                                </button>
                                <button
                                    onClick={() => setActiveTab('orderList')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'orderList'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    Order List
                                </button>
                            </div>
                        </div>

                        {/* Right Side Actions (Create Order) */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} />
                                Create Order
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex flex-col gap-3">
                        {/* Sub Tabs / Filters Row */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                {/* Today's Orders Sub Tabs */}
                                {activeTab === 'todayOrder' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setTodaySubTab('pending')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 border ${todaySubTab === 'pending'
                                                ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                                                : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                                                }`}
                                        >
                                            <Clock size={12} />
                                            Pending
                                            <span className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[10px] ml-1">{todayStats.pending}</span>
                                        </button>
                                        <button
                                            onClick={() => setTodaySubTab('confirmed')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 border ${todaySubTab === 'confirmed'
                                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                                : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                                                }`}
                                        >
                                            <CheckCircle2 size={12} />
                                            Confirmed
                                            <span className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[10px] ml-1">{todayStats.confirmed}</span>
                                        </button>
                                    </div>
                                )}

                                {/* Order List Sub Buttons */}
                                {activeTab === 'orderList' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setOrderListSubTab('all')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'all'
                                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                                : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                                                }`}
                                        >
                                            <List size={12} />
                                            All
                                        </button>
                                        <button
                                            onClick={() => setOrderListSubTab('shipped')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'shipped'
                                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                                : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                                                }`}
                                        >
                                            <Truck size={12} />
                                            Shipped
                                        </button>
                                        <button
                                            onClick={() => setOrderListSubTab('delivered')}
                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'delivered'
                                                ? 'bg-green-500/20 text-green-300 border-green-500/30'
                                                : 'bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                                                }`}
                                        >
                                            <CheckCircle2 size={12} />
                                            Delivered
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Today Orders Filters (Simple Local/Pathao/All)  */}
                            {activeTab === 'todayOrder' && (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <select
                                            value={logisticsFilter}
                                            onChange={(e) => setLogisticsFilter(e.target.value as any)}
                                            className="appearance-none bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Logistics</option>
                                            <option value="local">Local Logistics</option>
                                            <option value="pathao">Pathao</option>
                                        </select>
                                        <Filter className="absolute right-2.5 top-2 text-slate-500 pointer-events-none" size={12} />
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2 text-slate-500" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search orders..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg pl-9 pr-4 py-1.5 w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Order List Advanced Filters Row */}
                        {activeTab === 'orderList' && (
                            <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-top-1 duration-300 pt-1 border-t border-slate-700/50">
                                {/* All: Start | End | Branch | Status | Logistic | Search | Clear */}
                                {orderListSubTab === 'all' && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 w-32"
                                            />
                                            <span className="text-slate-500 text-xs">to</span>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 w-32"
                                            />
                                        </div>

                                        <select
                                            value={branchFilter}
                                            onChange={(e) => setBranchFilter(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Branches</option>
                                            {uniqueBranches.map(branch => (
                                                <option key={branch} value={branch}>{branch}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Status</option>
                                            {['New Order', 'Confirmed Order', 'Shipped', 'Delivered', 'Cancelled', 'Follow up again', 'Arrived', 'Returning to Seller', 'Fail Delivered'].map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={logisticsFilter}
                                            onChange={(e) => setLogisticsFilter(e.target.value as any)}
                                            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Logistics</option>
                                            <option value="local">Local</option>
                                            <option value="pathao">Pathao</option>
                                        </select>

                                        <div className="relative flex-1 max-w-xs">
                                            <Search className="absolute left-3 top-2 text-slate-500" size={12} />
                                            <input
                                                type="text"
                                                placeholder="Search customer, product, address..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg pl-8 pr-4 py-1.5 w-full focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                                            />
                                        </div>

                                        <button
                                            onClick={() => {
                                                setStartDate('');
                                                setEndDate('');
                                                setBranchFilter('all');
                                                setStatusFilter('all');
                                                setLogisticsFilter('all');
                                                setSearchQuery('');
                                            }}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                        >
                                            <X size={12} />
                                            Clear
                                        </button>
                                    </>
                                )}

                                {/* Shipped / Delivered Filters: Branch | Logistic | Clear */}
                                {['shipped', 'delivered'].includes(orderListSubTab) && (
                                    <>
                                        <select
                                            value={branchFilter}
                                            onChange={(e) => setBranchFilter(e.target.value)}
                                            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Branches</option>
                                            {uniqueBranches.map(branch => (
                                                <option key={branch} value={branch}>{branch}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={logisticsFilter}
                                            onChange={(e) => setLogisticsFilter(e.target.value as any)}
                                            className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Logistics</option>
                                            <option value="local">Local</option>
                                            <option value="pathao">Pathao</option>
                                        </select>

                                        <button
                                            onClick={() => {
                                                setBranchFilter('all');
                                                setLogisticsFilter('all');
                                            }}
                                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                        >
                                            <X size={12} />
                                            Clear
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Table Header */}
                    <div className="grid grid-cols-[auto_auto_1fr_1.2fr_1.5fr_2fr_1.5fr_1fr_1fr_auto] gap-3 p-4 text-xs font-semibold text-slate-400 uppercase border-b border-slate-700 bg-slate-800/50 items-center">
                        <div className="w-5">
                            <input
                                type="checkbox"
                                checked={displayOrders.length > 0 && selectedOrders.size === displayOrders.length}
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-900/50 text-indigo-500 focus:ring-indigo-500/50"
                            />
                        </div>
                        <div className="w-8 text-center">#</div>
                        <div>Date</div>
                        <div>Order ID</div>
                        <div>Customer</div>
                        <div>Products</div>
                        <div>{todaySubTab === 'pending' ? 'Address' : 'Branch / City'}</div>
                        <div className="text-left">Amount</div>
                        <div className="text-center">Status</div>
                        <div className="text-right">Action</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : displayOrders.length > 0 ? (
                            displayOrders.map((order, index) => (
                                <div key={order.id} className="grid grid-cols-[auto_auto_1fr_1.2fr_1.5fr_2fr_1.5fr_1fr_1fr_auto] gap-3 p-4 text-sm border-b border-slate-700 items-center hover:bg-slate-700/50 transition-colors group">
                                    <div className="w-5">
                                        <input
                                            type="checkbox"
                                            checked={selectedOrders.has(order.id)}
                                            onChange={(e) => handleSelectRow(order.id, e.target.checked)}
                                            className="rounded border-slate-600 bg-slate-900/50 text-indigo-500 focus:ring-indigo-500/50"
                                        />
                                    </div>
                                    <div className="w-8 text-center text-slate-500 text-xs font-mono">{index + 1}</div>
                                    <div className="text-slate-400 text-xs">{new Date(order.created_at || order.order_date).toLocaleDateString()}</div>
                                    <div className="flex flex-col">
                                        <span className="font-mono text-slate-300 text-xs">#{order.order_number}</span>
                                        {/* Show Logistic Partner Tag */}
                                        {['Confirmed Order', 'Shipped', 'Delivered', 'Arrived', 'Returning to Seller', 'Fail Delivered'].includes(order.order_status) && (
                                            <>
                                                {order.courier_provider === 'local' ? (
                                                    <span className="text-[10px] text-emerald-400 uppercase font-bold mt-0.5">
                                                        {order.logistic_name || 'Local'}
                                                    </span>
                                                ) : order.courier_provider === 'pathao' ? (
                                                    <span className="text-[10px] text-red-400 uppercase font-bold mt-0.5">
                                                        Pathao
                                                    </span>
                                                ) : null}
                                            </>
                                        )}
                                    </div>
                                    <div className="font-semibold text-white truncate text-xs text-left">{order.customer_name}</div>

                                    {/* Products Column */}
                                    <div className="relative group/product cursor-help text-left">
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-300 truncate max-w-[150px] inline-block" title={order.items?.[0]?.product_name}>
                                                {order.items?.[0]?.product_name || 'No Items'}
                                            </span>
                                            {order.items && order.items.length > 1 && (
                                                <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                    +{order.items.length - 1} more
                                                </span>
                                            )}
                                        </div>
                                        {/* Hover Tooltip - Positioned Below (top-full) and high z-index */}
                                        {order.items && order.items.length > 0 && (
                                            <div className="absolute left-0 top-full mt-2 w-72 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 hidden group-hover/product:block z-[100] max-h-60 overflow-y-auto pointer-events-none">
                                                <div className="relative z-[101]"> {/* Inner wrapper for extra safety */}
                                                    <p className="text-xs font-bold text-slate-400 mb-2 uppercase border-b border-slate-700 pb-1">Order Items</p>
                                                    <ul className="space-y-1.5">
                                                        {order.items.map((item: any, idx: number) => (
                                                            <li key={idx} className="flex justify-between items-start text-xs text-slate-200 gap-2">
                                                                <span className="flex-1 break-words leading-tight">{item.product_name}</span>
                                                                <span className="text-slate-400 min-w-[24px] text-right font-mono bg-slate-900/50 px-1 rounded">x{item.qty}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Branch / City / Address Column - Conditional */}
                                    <div className="text-xs text-slate-300 text-left">
                                        {todaySubTab === 'pending' ? (
                                            <span className="text-slate-400 truncate max-w-[150px] inline-block" title={order.address}>{order.address}</span>
                                        ) : (
                                            <>
                                                {order.courier_provider === 'local' ? (
                                                    <span className="text-emerald-300">{order.delivery_branch || '-'}</span>
                                                ) : order.courier_provider === 'pathao' ? (
                                                    <span className="text-red-300">{order.city_name || order.city || 'Kathmandu'}</span>
                                                ) : (
                                                    order.order_status === 'Fail Delivered' ? 'bg-red-900/30 text-red-200 border-red-700' :
                                                        order.order_status === 'Cancel' ? 'bg-gray-900/30 text-gray-200 border-gray-700' :
                                                            order.order_status === 'Pickup Cancel' ? 'bg-red-950/50 text-red-300 border-red-800' :
                                                                order.order_status === 'Follow up again' ? 'bg-yellow-900/30 text-yellow-200 border-yellow-700' :
                                                                    'bg-slate-700 text-slate-300 border-slate-600'
                                            }`}>
                                                {order.order_status}
                                            </span>
                                    </div>
                                    <div className="text-right flex items-center justify-end gap-2">
                                        {/* Allow actions for New Order AND Follow up */}
                                        {(order.order_status === 'New Order' || order.order_status === 'Follow up again') && (
                                            <>
                                                <button
                                                    onClick={() => handleConfirmAction(order)}
                                                    className="text-green-400 hover:text-green-300 transition-colors mr-1"
                                                    title="Confirm Order"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleCancelAction(order.id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors mr-2"
                                                    title="Cancel Order"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </>
                                        )}
                                        {/* Ship with Pathao Button - Hidden for Local */}
                                        {order.order_status === 'Confirmed Order' && !order.courier_consignment_id && order.courier_provider !== 'local' && (
                                            <button
                                                onClick={() => handleShipOrder(order.id)}
                                                className="text-orange-400 hover:text-orange-300 transition-colors mr-1"
                                                title="Ship with Pathao"
                                            >
                                                <Truck size={16} />
                                            </button>
                                        )}
                                        {/* View Button */}
                                        <button
                                            onClick={() => router.push(`/orders/${order.id}`)}
                                            className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <Package size={48} className="mb-2 opacity-20" />
                                <p>{activeTab === 'orderList' ? "No orders found" : `No ${todaySubTab} orders for today`}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals */}
                <OrderModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    mode="create"
                    onOrderUpdate={fetchOrders}
                />

                {isEditModalOpen && selectedOrderForEdit && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <OrderModal
                            isOpen={isEditModalOpen}
                            onClose={() => {
                                setIsEditModalOpen(false);
                                setSelectedOrderForEdit(null);
                            }}
                            initialOrder={selectedOrderForEdit}
                            mode="edit"
                            onOrderUpdate={() => {
                                fetchOrders();
                                setIsEditModalOpen(false);
                                setSelectedOrderForEdit(null);
                            }}
                        />
                    </div>
                )}

                {isCancelModalOpen && selectedOrderForCancel && cancelOrderDetails && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm p-6 border border-slate-700 animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold text-white mb-4">Select Action</h3>
                            <p className="text-slate-400 mb-6">Choose an action for this order. {cancelOrderDetails.order_status !== 'Follow up again' ? '"Follow Up" keeps it active for later, ' : ''}"Cancel" marks it as cancelled.</p>

                            <div className="flex flex-col gap-3">
                                {cancelOrderDetails.order_status !== 'Follow up again' && (
                                    <button
                                        onClick={() => handleStatusUpdate(selectedOrderForCancel, 'Follow up again')}
                                        className="w-full py-3 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 hover:text-yellow-400 border border-yellow-600/50 rounded-lg transition-colors font-bold flex items-center justify-center gap-2"
                                    >
                                        <Clock size={18} />
                                        Follow Up
                                    </button>
                                )}
                                <button
                                    onClick={() => handleStatusUpdate(selectedOrderForCancel, 'Cancel')}
                                    className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-500 hover:text-red-400 border border-red-600/50 rounded-lg transition-colors font-bold flex items-center justify-center gap-2"
                                >
                                    <X size={18} />
                                    Cancel Order
                                </button>
                                <button
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="w-full py-2 text-slate-400 hover:text-white mt-2 font-medium"
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
