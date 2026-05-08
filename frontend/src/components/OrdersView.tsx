'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    Package, Plus, Search, Filter, Check, X, Truck, List, Clock, CheckCircle2, FileText, ChevronDown, RefreshCw,
    ArrowLeftRight, ArrowLeft, User, UserMinus
} from 'lucide-react';
import OrderModal from './OrderModal';
import RiderAssignmentModal from './RiderAssignmentModal';

export default function OrdersView() {
    const router = useRouter();

    // -- Logic from help.md --
    // -- Logic from help.md --
    const [activeTab, setActiveTab] = useState<'todayOrder' | 'orderList' | 'orderSummary'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('ordersActiveTab') as any) || 'todayOrder';
        }
        return 'todayOrder';
    });
    const [todaySubTab, setTodaySubTab] = useState<'pending' | 'confirmed' | 'packed' | 'shipped'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('ordersTodaySubTab') as any) || 'pending';
        }
        return 'pending';
    });
    const [orderListSubTab, setOrderListSubTab] = useState<'all' | 'shipped' | 'delivered'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('ordersListSubTab') as any) || 'all';
        }
        return 'all';
    });
    const [summaryReportView, setSummaryReportView] = useState<'daily' | 'courier'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('ordersSummaryReportView') as any) || 'daily';
        }
        return 'daily';
    });

    // Filter State
    const [logisticsFilter, setLogisticsFilter] = useState<'all' | 'local' | 'pathao' | 'pickdrop' | 'ncm'>('all');
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
    const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

    // Derived State: Unique Branches
    const uniqueBranches = useMemo(() => {
        const branches = new Set<string>();
        orders.forEach(order => {
            if (order.delivery_branch) branches.add(order.delivery_branch);
        });
        return Array.from(branches).sort();
    }, [orders]);

    // Create Order Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Edit Order Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<any>(null);

    // Cancel Action State
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedOrderForCancel, setSelectedOrderForCancel] = useState<string | null>(null);

    // Sales Report Dropdown State
    const [isSalesReportOpen, setIsSalesReportOpen] = useState(false);

    // Status Change Menu State
    const [statusMenuOrderId, setStatusMenuOrderId] = useState<string | null>(null);

    // Rider Assignment State
    const [assigningOrder, setAssigningOrder] = useState<any | null>(null);

    // Detailed Report State
    const [selectedDateForReport, setSelectedDateForReport] = useState<string | null>(null);
    const [reportDetailStatusFilter, setReportDetailStatusFilter] = useState<string>('all');

    const orderStatuses = [
        'New Order',
        'Confirmed Order',
        'Ready to Ship',
        'Packed',
        'Shipped',
        'Arrived at Branch',
        'Delivery Process',
        'Delivered',
        'Delivery Failed',
        'Hold',
        'Return Process',
        'Return Delivered',
        'Cancelled',
        'Follow up again'
    ];

    // Persistence Effects
    useEffect(() => {
        // Load state from localStorage on mount
        if (typeof window !== 'undefined') {
            const savedActiveTab = localStorage.getItem('ordersActiveTab');
            const savedTodaySubTab = localStorage.getItem('ordersTodaySubTab');
            const savedOrderListSubTab = localStorage.getItem('ordersListSubTab');
            const savedSummaryReportView = localStorage.getItem('ordersSummaryReportView');
            const savedSelectedDate = localStorage.getItem('selectedDateForReport');
            const savedReportFilter = localStorage.getItem('reportDetailStatusFilter');

            if (savedActiveTab) setActiveTab(savedActiveTab as any);
            if (savedTodaySubTab) setTodaySubTab(savedTodaySubTab as any);
            if (savedOrderListSubTab) setOrderListSubTab(savedOrderListSubTab as any);
            if (savedSummaryReportView) setSummaryReportView(savedSummaryReportView as any);
            if (savedSelectedDate) setSelectedDateForReport(savedSelectedDate);
            if (savedReportFilter) setReportDetailStatusFilter(savedReportFilter);
        }
        fetchOrders();
    }, []);

    useEffect(() => {
        localStorage.setItem('ordersActiveTab', activeTab);
        localStorage.setItem('ordersTodaySubTab', todaySubTab);
        localStorage.setItem('ordersListSubTab', orderListSubTab);
        localStorage.setItem('ordersSummaryReportView', summaryReportView);
        if (selectedDateForReport) {
            localStorage.setItem('selectedDateForReport', selectedDateForReport);
        } else {
            localStorage.removeItem('selectedDateForReport');
        }
        localStorage.setItem('reportDetailStatusFilter', reportDetailStatusFilter);
    }, [activeTab, todaySubTab, orderListSubTab, summaryReportView, selectedDateForReport, reportDetailStatusFilter]);

    // Reset selection and filter when tabs change
    useEffect(() => {
        setSelectedOrders(new Set());
        setLogisticsFilter('all');
        setStartDate('');
        setEndDate('');
        setBranchFilter('all');
        setStatusFilter('all');
        setSearchQuery('');
        // Do not reset selectedDateForReport and reportDetailStatusFilter here
        // as they are managed by their own persistence and specific UI interactions.
    }, [activeTab, todaySubTab, orderListSubTab]);


    const [userRole, setUserRole] = useState('');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            if (user) setUserRole(user.role);

            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            let fetchedOrders = Array.isArray(response.data) ? response.data : (response.data.data || []);
            console.log('Raw Orders Fetched:', fetchedOrders.length);

            // Role-based filtering
            if (user && user.role !== 'admin' && user.role !== 'editor') {
                console.log('User Role is restricted:', user.role);
                console.log('Filtering for User Name:', user.name, 'or Email:', user.email);

                // Prepare Allowed Pages List based on user.accounts
                const PAGE_MAPPING: { [key: string]: string } = {
                    '104508142519049': 'Sasto Online Shopping',
                    '107953682325493': 'Online Shopping Bagmati',
                    'Others': 'Others'
                };

                const userAccounts = user.accounts || [];
                const allowedPages = new Set<string>(userAccounts);
                // Map IDs to Names
                userAccounts.forEach((acc: string) => {
                    if (PAGE_MAPPING[acc]) allowedPages.add(PAGE_MAPPING[acc]);
                });
                console.log('Allowed Pages:', Array.from(allowedPages));

                fetchedOrders = fetchedOrders.filter((order: any) => {
                    const isCreator = order.created_by === user.name || (user.email && order.created_by === user.email);
                    const isAllowedPage = allowedPages.has(order.page_name) || allowedPages.has(order.platform);
                    return isCreator || isAllowedPage;
                });
            } else {
                console.log('User is Admin/Editor, showing all orders.');
            }

            console.log('Final Display Orders:', fetchedOrders.length);
            setOrders(fetchedOrders);
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
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${orderId}`, {
                order_status: newStatus
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchOrders();
            if (isCancelModalOpen) setIsCancelModalOpen(false);
        } catch (error) {
            console.error('Failed to update status', error);
            alert('Failed to update status');
        }
    };

    const onManualStatusChange = async (orderId: string, newStatus: string) => {
        if (!window.confirm(`Are you sure you want to change the order status to "${newStatus}"?`)) return;
        setLoading(true);
        await handleStatusUpdate(orderId, newStatus);
        setLoading(false);
        setStatusMenuOrderId(null);
    };

    const handleConfirmAction = (order: any) => {
        const orderToEdit = { ...order, order_status: 'Confirmed Order' };
        setSelectedOrderForEdit(orderToEdit);
        setIsEditModalOpen(true);
    };

    const handleCancelAction = (orderId: string) => {
        setSelectedOrderForCancel(orderId);
        setIsCancelModalOpen(true);
    };

    const handleShipOrder = async (orderId: string) => {
        // Restriction: Only Admin/Editor can ship
        if (userRole !== 'admin' && userRole !== 'editor') {
            alert('You do not have permission to ship orders.');
            return;
        }

        if (!window.confirm('Are you sure you want to ship this order via Pathao?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ship`, { orderId }, {
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

    const handlePickDropShip = async (orderId: string) => {
        if (userRole !== 'admin' && userRole !== 'editor') {
            alert('You do not have permission to ship orders.');
            return;
        }
        if (!window.confirm('Ship this order via Pick & Drop?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/ship`, { orderId }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data?.success) {
                const d = res.data.data;
                // Only alert for single ship, bulk has its own progress
                if (typeof orderId === 'string' && !Array.isArray(arguments[0])) {
                    alert(`✅ Shipped via Pick & Drop!\nPND Order ID: ${d.pndOrderId}\nTracking: ${d.trackingUrl}`);
                }
                fetchOrders();
                return true;
            } else {
                alert('Failed: ' + (res.data?.error || 'Unknown error'));
                return false;
            }
        } catch (error: any) {
            console.error('Failed to ship via Pick & Drop', error);
            alert('Failed: ' + (error.response?.data?.message || error.message));
            return false;
        }
    };

    // Bulk Shipping Logic
    const handleBulkShip = async () => {
        const selectedList = orders.filter(o => selectedOrders.has(o.id));
        if (selectedList.length === 0) return;

        const providers = new Set(selectedList.map(o => o.courier_provider));
        if (providers.size > 1) {
            alert('Please select orders from only ONE courier provider (Pathao or Pick & Drop) for bulk shipping.');
            return;
        }

        const provider = Array.from(providers)[0];
        if (provider !== 'pathao' && provider !== 'pickdrop' && provider !== 'ncm') {
            alert('Bulk shipping is only available for Pathao, Pick & Drop, and NCM orders.');
            return;
        }

        if (!window.confirm(`Bulk Ship ${selectedList.length} orders via ${provider === 'pathao' ? 'Pathao' : provider === 'pickdrop' ? 'Pick & Drop' : 'NCM'}?`)) return;

        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const order of selectedList) {
            try {
                const token = localStorage.getItem('token');
                let endpoint = '';
                if (provider === 'pathao') {
                    endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ship`;
                } else if (provider === 'pickdrop') {
                    endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/ship`;
                } else if (provider === 'ncm') {
                    endpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/ship`;
                }

                if (!endpoint) continue;

                const response = await axios.post(endpoint, { orderId: order.id }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.data.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                failCount++;
            }
        }

        setLoading(false);
        alert(`Bulk Process Complete!\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`);
        setSelectedOrders(new Set());
        fetchOrders();
    };

    const handleSyncPickDrop = async (orderId: string) => {
        if (userRole !== 'admin' && userRole !== 'editor') {
            alert('You do not have permission to sync orders.');
            return;
        }

        setSyncingOrderId(orderId);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/status-sync`,
                { orderId },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.success) {
                const data = response.data.data;
                if (data.newStatus) {
                    alert(`✅ Sync complete! Status updated to: ${data.newStatus}`);
                    fetchOrders();
                } else {
                    alert('ℹ️ Status is already up to date.');
                }
            } else {
                alert('❌ Sync failed: ' + (response.data.error || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Failed to sync order', error);
            alert('❌ Failed to sync order: ' + (error.response?.data?.message || error.message));
        } finally {
            setSyncingOrderId(null);
        }
    };

    const handleSyncNcm = async (orderId: string) => {
        if (userRole !== 'admin' && userRole !== 'editor') {
            alert('You do not have permission to sync orders.');
            return;
        }

        setSyncingOrderId(orderId);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/status-sync`,
                { orderId },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.success) {
                if (response.data.newStatus) {
                    alert(`✅ Sync complete! Status updated to: ${response.data.newStatus}`);
                    fetchOrders();
                } else {
                    alert(`ℹ️ ${response.data.message || 'Status is already up to date.'}`);
                }
            } else {
                alert('❌ Sync failed: ' + (response.data.error || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Failed to sync NCM order', error);
            alert('❌ Failed to sync order: ' + (error.response?.data?.message || error.message));
        } finally {
            setSyncingOrderId(null);
        }
    };

    const handleUnassignRider = async (orderId: string) => {
        if (!window.confirm('Are you sure you want to unassign the rider? The order status will revert to Confirmed Order.')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${orderId}/cancel-assignment`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchOrders();
        } catch (error: any) {
            console.error('Failed to unassign rider', error);
            alert('❌ Failed to unassign: ' + (error.response?.data?.message || error.message));
        }
    };

    const getDisplayOrders = () => {
        const today = new Date();

        if (activeTab === 'todayOrder') {
            return orders.filter(order => {
                const orderDate = new Date(order.created_at || order.order_date);
                const isToday = orderDate.getDate() === today.getDate() &&
                    orderDate.getMonth() === today.getMonth() &&
                    orderDate.getFullYear() === today.getFullYear();

                if (todaySubTab === 'pending') {
                    return order.order_status === 'New Order' || order.order_status === 'Follow up again';
                } else if (todaySubTab === 'confirmed') {
                    return order.order_status === 'Confirmed Order';
                } else if (todaySubTab === 'packed') {
                    const isPacked = order.order_status === 'Ready to Ship' || order.order_status === 'Packed';
                    if (!isPacked) return false;
                    // Optimized: check status history for "Ready to Ship" or "Packed" today
                    return (order.status_history || []).some((h: any) => {
                        const hStatus = h.status.trim();
                        if (hStatus !== 'Ready to Ship' && hStatus !== 'Packed') return false;
                        const actionDate = new Date(h.changed_at);
                        return actionDate.getDate() === today.getDate() &&
                            actionDate.getMonth() === today.getMonth() &&
                            actionDate.getFullYear() === today.getFullYear();
                    });
                } else if (todaySubTab === 'shipped') {
                    if (order.order_status !== 'Shipped') return false;
                    // Check shipped_at first (set by courier API)
                    if (order.shipped_at) {
                        const shippedDate = new Date(order.shipped_at);
                        if (shippedDate.getDate() === today.getDate() &&
                            shippedDate.getMonth() === today.getMonth() &&
                            shippedDate.getFullYear() === today.getFullYear()) return true;
                    }
                    // Fallback: check status_history for 'Shipped' status changed today
                    return (order.status_history || []).some((h: any) => {
                        if (h.status.trim() !== 'Shipped') return false;
                        const actionDate = new Date(h.changed_at);
                        return actionDate.getDate() === today.getDate() &&
                            actionDate.getMonth() === today.getMonth() &&
                            actionDate.getFullYear() === today.getFullYear();
                    });
                }
                return false;
            }).filter(order => {
                // Apply logistics filter to today's orders as well
                if (logisticsFilter === 'all') return true;
                if (logisticsFilter === 'local') return order.courier_provider === 'local';
                if (logisticsFilter === 'pathao') return order.courier_provider === 'pathao';
                if (logisticsFilter === 'pickdrop') return order.courier_provider === 'pickdrop';
                if (logisticsFilter === 'ncm') return order.courier_provider === 'ncm';
                if (logisticsFilter === 'self') return order.courier_provider === 'self';
                return true;
            }).sort((a, b) => {
                if (todaySubTab === 'confirmed') {
                    const isPreShip = (s: string) => s === 'Confirmed Order' || s === 'Ready to Ship';
                    if (isPreShip(a.order_status) && !isPreShip(b.order_status)) return -1;
                    if (!isPreShip(a.order_status) && isPreShip(b.order_status)) return 1;
                }
                return new Date(b.created_at || b.order_date).getTime() - new Date(a.created_at || a.order_date).getTime();
            });
        }

        // Active Tab: Order List
        let orderList = orders;

        if (orderListSubTab === 'shipped') {
            orderList = orderList.filter(order => order.order_status === 'Shipped');
        } else if (orderListSubTab === 'delivered') {
            orderList = orderList.filter(order => order.order_status === 'Delivered');
        }

        // Advanced Filters
        if (branchFilter !== 'all') {
            orderList = orderList.filter(order => order.delivery_branch === branchFilter);
        }

        if (logisticsFilter !== 'all') {
            if (logisticsFilter === 'local') {
                orderList = orderList.filter(order => order.courier_provider === 'local');
            } else if (logisticsFilter === 'pathao') {
                orderList = orderList.filter(order => order.courier_provider === 'pathao');
            } else if (logisticsFilter === 'pickdrop') {
                orderList = orderList.filter(order => order.courier_provider === 'pickdrop');
            } else if (logisticsFilter === 'ncm') {
                orderList = orderList.filter(order => order.courier_provider === 'ncm');
            } else if (logisticsFilter === 'self') {
                orderList = orderList.filter(order => order.courier_provider === 'self');
            }
        }

        if (statusFilter !== 'all') {
            orderList = orderList.filter(order => order.order_status === statusFilter);
        }

        if (startDate) {
            orderList = orderList.filter(order => {
                const orderDate = new Date(order.created_at || order.order_date);
                const checkDate = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
                const start = new Date(startDate);
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

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            orderList = orderList.filter(order => {
                return (
                    (order.customer_name && order.customer_name.toLowerCase().includes(query)) ||
                    (order.address && order.address.toLowerCase().includes(query)) ||
                    (order.order_number && String(order.order_number).toLowerCase().includes(query)) ||
                    (order.delivery_branch && order.delivery_branch.toLowerCase().includes(query)) ||
                    (order.ncm_to_branch && order.ncm_to_branch.toLowerCase().includes(query)) ||
                    (order.items && order.items.some((item: any) => item.product_name.toLowerCase().includes(query)))
                );
            });
        }

        return orderList;
    };

    const displayOrders = getDisplayOrders();

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

    // Calculate Today Stats (Inserted logic)
    const todayStats = useMemo(() => {
        const today = new Date();
        const isSameDay = (d1: Date, d2: Date) =>
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();

        let pendingCount = 0;
        let confirmedCount = 0;
        let packedCount = 0;
        let shippedCount = 0;

        orders.forEach(order => {
            // Pending: New Order or Follow up again
            if (order.order_status === 'New Order' || order.order_status === 'Follow up again') {
                pendingCount++;
            }
            // Confirmed: Confirmed Order only
            if (order.order_status === 'Confirmed Order') {
                confirmedCount++;
            }
            // Packed Today: History check for "Ready to Ship"/"Packed" AND current status is Packed
            const isPacked = order.order_status === 'Ready to Ship' || order.order_status === 'Packed';
            if (isPacked) {
                const wasPackedToday = (order.status_history || []).some((h: any) => {
                    const hStatus = h.status.trim();
                    if (hStatus !== 'Ready to Ship' && hStatus !== 'Packed') return false;
                    const actionDate = new Date(h.changed_at);
                    return isSameDay(actionDate, today);
                });
                if (wasPackedToday) {
                    packedCount++;
                }
            }
            // Shipped Today
            if (order.order_status === 'Shipped') {
                let isShippedToday = false;
                if (order.shipped_at) {
                    const shippedDate = new Date(order.shipped_at);
                    isShippedToday = isSameDay(shippedDate, today);
                }
                if (!isShippedToday) {
                    // Fallback: check status_history
                    isShippedToday = (order.status_history || []).some((h: any) => {
                        if (h.status.trim() !== 'Shipped') return false;
                        return isSameDay(new Date(h.changed_at), today);
                    });
                }
                if (isShippedToday) shippedCount++;
            }
        });
        return { pending: pendingCount, confirmed: confirmedCount, packed: packedCount, shipped: shippedCount };
    }, [orders]);


    // --- Daily Report Logic ---
    const dailyReportData = useMemo(() => {
        const report: Record<string, {
            date: string,
            confirmed: number,
            packed: number,
            packedBreakdown: Record<string, number>,
            shipped: number,
            shippedBreakdown: Record<string, number>,
            delivered: number,
            deliveredBreakdown: Record<string, number>,
            returnDelivered: number,
            returnDeliveredBreakdown: Record<string, number>
        }> = {};

        const today = new Date().toLocaleDateString();

        orders.forEach(order => {
            const history = order.status_history || [];
            history.forEach((h: any) => {
                const actionDate = new Date(h.changed_at);
                const dateKey = actionDate.toLocaleDateString();

                if (!report[dateKey]) {
                    report[dateKey] = {
                        date: dateKey,
                        confirmed: 0,
                        packed: 0,
                        packedBreakdown: {},
                        shipped: 0,
                        shippedBreakdown: {},
                        delivered: 0,
                        deliveredBreakdown: {},
                        returnDelivered: 0,
                        returnDeliveredBreakdown: {}
                    };
                }

                const status = h.status.trim();
                if (status === 'Confirmed Order') report[dateKey].confirmed++;

                if (status === 'Ready to Ship' || status === 'Packed') {
                    report[dateKey].packed++;
                    const provider = (order.logistic_name || order.courier_provider || 'Unknown');
                    const label = provider === 'ncm' ? 'Nepal Can Move' : (provider.charAt(0).toUpperCase() + provider.slice(1));
                    report[dateKey].packedBreakdown[label] = (report[dateKey].packedBreakdown[label] || 0) + 1;
                }

                if (status === 'Shipped') {
                    // Shipped logic: check if shipped date matches the history change date
                    // The user said: "if shipped date is today date then count shipped order"
                    // and "check in audit trail".
                    report[dateKey].shipped++;
                    const provider = (order.logistic_name || order.courier_provider || 'Unknown');
                    const label = provider === 'ncm' ? 'Nepal Can Move' : provider === 'self' ? 'Self Delivery' : (provider.charAt(0).toUpperCase() + provider.slice(1));
                    report[dateKey].shippedBreakdown[label] = (report[dateKey].shippedBreakdown[label] || 0) + 1;
                }

                if (status === 'Delivered') {
                    report[dateKey].delivered++;
                    const provider = (order.logistic_name || order.courier_provider || 'Unknown');
                    const label = provider === 'ncm' ? 'Nepal Can Move' : provider === 'self' ? 'Self Delivery' : (provider.charAt(0).toUpperCase() + provider.slice(1));
                    report[dateKey].deliveredBreakdown[label] = (report[dateKey].deliveredBreakdown[label] || 0) + 1;
                }

                if (status === 'Return Delivered') {
                    report[dateKey].returnDelivered++;
                    const provider = (order.logistic_name || order.courier_provider || 'Unknown');
                    const label = provider === 'ncm' ? 'Nepal Can Move' : provider === 'self' ? 'Self Delivery' : (provider.charAt(0).toUpperCase() + provider.slice(1));
                    report[dateKey].returnDeliveredBreakdown[label] = (report[dateKey].returnDeliveredBreakdown[label] || 0) + 1;
                }
            });
        });

        return Object.values(report).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [orders]);

    const detailedReportOrders = useMemo(() => {
        if (!selectedDateForReport) return [];

        return orders.filter(order => {
            const history = order.status_history || [];
            return history.some((h: any) => {
                const actionDate = new Date(h.changed_at).toLocaleDateString();
                const status = h.status.trim();

                if (actionDate !== selectedDateForReport) return false;

                if (reportDetailStatusFilter === 'all') {
                    return ['Confirmed Order', 'Ready to Ship', 'Packed', 'Shipped', 'Delivered', 'Return Delivered'].includes(status);
                }

                const filterMap: Record<string, string[]> = {
                    'Confirm Order': ['Confirmed Order'],
                    'Packed': ['Ready to Ship', 'Packed'],
                    'Shipped': ['Shipped'],
                    'Delivered': ['Delivered'],
                    'Return Delivered': ['Return Delivered']
                };

                return filterMap[reportDetailStatusFilter]?.includes(status);
            });
        });
    }, [orders, selectedDateForReport, reportDetailStatusFilter]);

    // --- Courier Report Logic ---
    const courierReportData = useMemo(() => {
        const providers = ['pathao', 'pickdrop', 'local', 'ncm', 'self'];
        return providers.map(p => {
            const providerOrders = orders.filter(o => (o.courier_provider || '').toLowerCase() === p);

            const stats = {
                provider: p === 'pickdrop' ? 'Pick & Drop' : p === 'ncm' ? 'Nepal Can Move' : p === 'self' ? 'Self Delivery' : p.charAt(0).toUpperCase() + p.slice(1),
                shipped: providerOrders.filter(o => ['Ready to Ship', 'Packed', 'Shipped', 'Arrived at Branch'].includes(o.order_status)).length,
                deliveryProcess: providerOrders.filter(o => o.order_status === 'Delivery Process').length,
                delivered: providerOrders.filter(o => o.order_status === 'Delivered').length,
                deliveryFailed: providerOrders.filter(o => o.order_status === 'Delivery Failed').length,
                hold: providerOrders.filter(o => o.order_status === 'Hold').length,
                returnProcess: providerOrders.filter(o => o.order_status === 'Return Process').length,
                returnDelivered: providerOrders.filter(o => o.order_status === 'Return Delivered').length,
            };

            const pendingInCourier = stats.shipped + stats.deliveryProcess + stats.hold + stats.returnProcess;

            return { ...stats, pendingInCourier };
        });
    }, [orders]);


    const cancelOrderDetails = selectedOrderForCancel ? orders.find(o => o.id === selectedOrderForCancel) : null;

    return (
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-slate-900 text-black dark:text-slate-100 h-full relative">


            {/* Content Container */}
            <div className="flex-1 overflow-hidden flex flex-col p-4 pt-2">

                <div className="flex flex-col h-full bg-white dark:bg-slate-900 text-black dark:text-slate-200 shadow-sm rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                    {/* Main Header Area */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <h2 className="text-[22px] font-bold text-black dark:text-white flex items-center gap-2">
                                <Package className="text-blue-600 dark:text-blue-500" />
                                Orders
                            </h2>

                            {/* Main Tabs */}
                            <div className="flex bg-gray-100 dark:bg-slate-800/50 p-1 rounded-lg border border-gray-200 dark:border-slate-700">
                                <button
                                    onClick={() => setActiveTab('todayOrder')}
                                    className={`px-4 py-1.5 rounded-md text-[16px] font-medium transition-all ${activeTab === 'todayOrder'
                                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm dark:shadow-lg'
                                        : 'text-black dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    Today's Orders
                                </button>
                                <button
                                    onClick={() => setActiveTab('orderList')}
                                    className={`px-4 py-1.5 rounded-md text-[16px] font-medium transition-all ${activeTab === 'orderList'
                                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm dark:shadow-lg'
                                        : 'text-black dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    Order List
                                </button>
                                <button
                                    onClick={() => setActiveTab('orderSummary')}
                                    className={`px-4 py-1.5 rounded-md text-[16px] font-medium transition-all ${activeTab === 'orderSummary'
                                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm dark:shadow-lg'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                >
                                    Order Summary
                                </button>
                            </div>
                        </div>

                        {/* Right Side Actions (Create Order) */}
                        <div className="flex items-center gap-3">
                            {/* Sales Report Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsSalesReportOpen(!isSalesReportOpen)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[16px] font-medium transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    <FileText size={16} />
                                    Sales Report
                                    <ChevronDown size={16} className={`transition-transform ${isSalesReportOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isSalesReportOpen && (
                                    <>
                                        {/* Backdrop to close dropdown */}
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsSalesReportOpen(false)}
                                        />

                                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                            <button
                                                onClick={() => {
                                                    setIsSalesReportOpen(false);
                                                    router.push('/?view=daily-report');
                                                }}
                                                className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 border-b border-gray-100 dark:border-slate-700"
                                            >
                                                <FileText size={16} className="text-blue-500 dark:text-blue-400" />
                                                <span className="font-medium">Daily Reports</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsSalesReportOpen(false);
                                                    router.push('/?view=inventory-report');
                                                }}
                                                className="w-full text-left px-4 py-3 text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                                            >
                                                <Package size={16} className="text-emerald-500 dark:text-emerald-400" />
                                                <span className="font-medium">Inventory Reports</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[17px] font-medium transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <Plus size={18} />
                                Create Order
                            </button>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/30 flex flex-col gap-3">
                        {/* Sub Tabs / Filters Row */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-4">
                                {/* Today's Orders Sub Tabs */}
                                {activeTab === 'todayOrder' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setTodaySubTab('pending')}
                                            className={`px-5 py-2 rounded-full text-[15px] font-semibold transition-colors flex items-center gap-2 border ${todaySubTab === 'pending'
                                                ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <Clock size={14} />
                                            Pending
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-xs ml-1 shadow-sm">{todayStats.pending}</span>
                                        </button>
                                        <button
                                            onClick={() => setTodaySubTab('confirmed')}
                                            className={`px-5 py-2 rounded-full text-[15px] font-semibold transition-colors flex items-center gap-2 border ${todaySubTab === 'confirmed'
                                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <CheckCircle2 size={14} />
                                            Confirmed
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-xs ml-1 shadow-sm">{todayStats.confirmed}</span>
                                        </button>
                                        <button
                                            onClick={() => setTodaySubTab('packed')}
                                            className={`px-5 py-2 rounded-full text-[15px] font-semibold transition-colors flex items-center gap-2 border ${todaySubTab === 'packed'
                                                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <Package size={14} />
                                            Packed
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-xs ml-1 shadow-sm">{todayStats.packed}</span>
                                        </button>
                                        <button
                                            onClick={() => setTodaySubTab('shipped')}
                                            className={`px-5 py-2 rounded-full text-[15px] font-semibold transition-colors flex items-center gap-2 border ${todaySubTab === 'shipped'
                                                ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <Truck size={14} />
                                            Shipped
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-xs ml-1 shadow-sm">{todayStats.shipped}</span>
                                        </button>
                                    </div>
                                )}

                                {/* Bulk Shipped Button (In sub-tab row) */}
                                {activeTab === 'todayOrder' && todaySubTab === 'confirmed' && selectedOrders.size > 0 && (() => {
                                    const selectedList = orders.filter(o => selectedOrders.has(o.id));
                                    const providers = new Set(selectedList.map(o => o.courier_provider));
                                    if (providers.size === 1) {
                                        const provider = Array.from(providers)[0];
                                        if (provider === 'pathao' || provider === 'pickdrop' || provider === 'ncm') {
                                            return (
                                                <button
                                                    onClick={handleBulkShip}
                                                    className={`px-4 py-1.5 text-white rounded-full text-[14px] font-bold transition-all flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 animate-in slide-in-from-left-2 duration-300 ${provider === 'pathao' ? 'bg-red-500 hover:bg-red-600' :
                                                        provider === 'pickdrop' ? 'bg-orange-500 hover:bg-orange-600' :
                                                            'bg-blue-600 hover:bg-blue-700'
                                                        }`}
                                                >
                                                    <Truck size={14} />
                                                    Bulk Ship ({provider === 'pathao' ? 'Pathao' : provider === 'pickdrop' ? 'Pick & Drop' : 'NCM'})
                                                </button>
                                            );
                                        }
                                        if (provider === 'self') {
                                            return (
                                                <button
                                                    onClick={() => setAssigningOrder({ isBulk: true, ids: Array.from(selectedOrders) })}
                                                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[14px] font-bold transition-all flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 animate-in slide-in-from-left-2 duration-300"
                                                >
                                                    <User size={14} />
                                                    Bulk Assign Rider
                                                </button>
                                            );
                                        }
                                    }
                                    return null;
                                })()}

                                {/* Order List Sub Buttons */}
                                {activeTab === 'orderList' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setOrderListSubTab('all')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'all'
                                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <List size={12} />
                                            All
                                        </button>
                                        <button
                                            onClick={() => setOrderListSubTab('shipped')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'shipped'
                                                ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <Truck size={12} />
                                            Shipped
                                        </button>
                                        <button
                                            onClick={() => setOrderListSubTab('delivered')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'delivered'
                                                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <CheckCircle2 size={12} />
                                            Delivered
                                        </button>
                                    </div>
                                )}

                                {/* Order Summary Sub Buttons */}
                                {activeTab === 'orderSummary' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSummaryReportView('daily')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${summaryReportView === 'daily'
                                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <FileText size={12} />
                                            Daily Report
                                        </button>
                                        <button
                                            onClick={() => setSummaryReportView('courier')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${summaryReportView === 'courier'
                                                ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <Truck size={12} />
                                            Courier Report
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
                                            onChange={(e) => {
                                                setLogisticsFilter(e.target.value as any);
                                                setSelectedOrders(new Set());
                                            }}
                                            className="appearance-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-black dark:text-slate-300 text-[14px] rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        >
                                            <option value="all">All Logistics</option>
                                            <option value="local">Local Logistics</option>
                                            <option value="pathao">Pathao</option>
                                            <option value="pickdrop">Pick &amp; Drop</option>
                                            <option value="ncm">Nepal Can Move (NCM)</option>
                                        </select>
                                        <Filter className="absolute right-2.5 top-2 text-slate-400 pointer-events-none" size={12} />
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                                        <input
                                            type="text"
                                            placeholder="Search orders..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setSelectedOrders(new Set());
                                            }}
                                            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-black dark:text-slate-300 text-[17px] rounded-lg pl-9 pr-4 py-1.5 w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                                        />
                                    </div>
                                    {/* Report Button - Only show in Confirmed tab */}
                                    {todaySubTab === 'confirmed' && (
                                        <button
                                            onClick={() => router.push('/?view=report')}
                                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[14px] font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                                        >
                                            <FileText size={14} />
                                            Report
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Order List Advanced Filters Row */}
                        {activeTab === 'orderList' && (
                            <div className="flex items-center gap-3 w-full animate-in fade-in slide-in-from-top-1 duration-300 pt-1 border-t border-gray-200 dark:border-slate-700/50">
                                {/* All: Start | End | Branch | Status | Logistic | Search | Clear */}
                                {orderListSubTab === 'all' && (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => {
                                                    setStartDate(e.target.value);
                                                    setSelectedOrders(new Set());
                                                }}
                                                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-black dark:text-slate-300 text-[14px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 w-32"
                                            />
                                            <span className="text-slate-500 text-[14px]">to</span>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => {
                                                    setEndDate(e.target.value);
                                                    setSelectedOrders(new Set());
                                                }}
                                                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-black dark:text-slate-300 text-[14px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 w-32"
                                            />
                                        </div>


                                        <select
                                            value={statusFilter}
                                            onChange={(e) => {
                                                setStatusFilter(e.target.value);
                                                setSelectedOrders(new Set());
                                            }}
                                            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-black dark:text-slate-300 text-[14px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Status</option>
                                            {['New Order', 'Confirmed Order', 'Ready to Ship', 'Packed', 'Shipped', 'Arrived at Branch', 'Delivery Process', 'Delivered', 'Delivery Failed', 'Hold', 'Return Process', 'Return Delivered', 'Cancelled', 'Follow up again'].map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={logisticsFilter}
                                            onChange={(e) => setLogisticsFilter(e.target.value as any)}
                                            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-black dark:text-slate-300 text-[14px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Logistics</option>
                                            <option value="local">Local</option>
                                            <option value="pathao">Pathao</option>
                                            <option value="pickdrop">Pick &amp; Drop</option>
                                            <option value="ncm">Nepal Can Move</option>
                                        </select>

                                        <div className="relative flex-1 max-w-xs">
                                            <Search className="absolute left-3 top-2 text-slate-400" size={12} />
                                            <input
                                                type="text"
                                                placeholder="Search customer, product, address, branch..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-black dark:text-slate-300 text-[14px] rounded-lg pl-8 pr-4 py-1.5 w-full focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
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
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-[14px] font-medium transition-colors flex items-center gap-1"
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
                                            value={logisticsFilter}
                                            onChange={(e) => setLogisticsFilter(e.target.value as any)}
                                            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-black dark:text-slate-300 text-[14px] rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="all">All Logistics</option>
                                            <option value="local">Local</option>
                                            <option value="pathao">Pathao</option>
                                            <option value="pickdrop">Pick &amp; Drop</option>
                                            <option value="ncm">Nepal Can Move</option>
                                            <option value="self">Self Delivered</option>
                                        </select>

                                        <button
                                            onClick={() => {
                                                setBranchFilter('all');
                                                setLogisticsFilter('all');
                                            }}
                                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-[14px] font-medium transition-colors flex items-center gap-1"
                                        >
                                            <X size={12} />
                                            Clear
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {activeTab !== 'orderSummary' && (
                        <div className="grid grid-cols-[40px_40px_80px_110px_140px_120px_1fr_150px_80px_120px_120px_90px] gap-3 p-4 text-[15px] font-semibold text-slate-500 dark:text-slate-400 uppercase border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 items-center">
                            <div className="w-5">
                                <input
                                    type="checkbox"
                                    checked={displayOrders.length > 0 && selectedOrders.size === displayOrders.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-indigo-600 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="w-8 text-center text-[12px]">#</div>
                            <div>Date</div>
                            <div>Order ID</div>
                            <div>Customer</div>
                            <div>Phone</div>
                            <div>Products</div>
                            <div>{todaySubTab === 'pending' ? 'Address' : 'Branch / City'}</div>
                            <div className="text-left">Amount</div>
                            <div>Remarks</div>
                            <div className="text-center">Status</div>
                            <div className="text-right">Action</div>
                        </div>
                    )}

                    {/* Table Body / Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeTab !== 'orderSummary' ? (
                            loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : displayOrders.length > 0 ? (
                                displayOrders.map((order, index) => (
                                    <div key={order.id} className="grid grid-cols-[40px_40px_80px_110px_140px_120px_1fr_150px_80px_120px_120px_90px] gap-3 p-5 text-[17px] border-b border-gray-100 dark:border-slate-700 items-center hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <div className="w-5">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.has(order.id)}
                                                onChange={(e) => handleSelectRow(order.id, e.target.checked)}
                                                className="rounded border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900/50 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div className="w-8 text-center text-slate-500 text-[14px] font-mono">{index + 1}</div>
                                        <div className="text-slate-600 dark:text-slate-400 text-[14px]">{new Date(order.created_at || order.order_date).toLocaleDateString()}</div>
                                        <div className="flex flex-col">
                                            <span className="font-mono text-black dark:text-slate-300 text-[14px] font-medium">#{order.order_number}</span>
                                            {!['New Order', 'Cancel', 'Cancelled'].includes(order.order_status) && (
                                                <>
                                                    {order.courier_provider === 'local' ? (
                                                        <span className="text-[12px] text-emerald-600 dark:text-emerald-400 uppercase font-bold mt-0.5">
                                                            {order.logistic_name || 'Local'}
                                                        </span>
                                                    ) : order.courier_provider === 'pathao' ? (
                                                        <span className="text-[12px] text-red-600 dark:text-red-400 uppercase font-bold mt-0.5">
                                                            Pathao
                                                        </span>
                                                    ) : order.courier_provider === 'pickdrop' ? (
                                                        <span className="text-[12px] text-orange-600 dark:text-orange-400 uppercase font-bold mt-0.5">
                                                            Pick &amp; Drop
                                                        </span>
                                                    ) : order.courier_provider === 'ncm' ? (
                                                        <span className="text-[12px] text-blue-600 dark:text-blue-400 uppercase font-bold mt-0.5">
                                                            NCM
                                                        </span>
                                                    ) : order.courier_provider === 'self' ? (
                                                        <span className="text-[12px] text-emerald-600 dark:text-emerald-400 uppercase font-bold mt-0.5">
                                                            Self Delivered
                                                        </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </div>
                                        <div className="font-semibold text-slate-800 dark:text-white truncate text-[14px] text-left">{order.customer_name}</div>
                                        <div className="text-[14px] text-slate-600 dark:text-slate-300 text-left flex flex-col">
                                            <span>{order.phone_number}</span>
                                            {order.alternative_phone && (
                                                <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-bold mt-0.5">+Alt Num</span>
                                            )}
                                        </div>

                                        <div className="relative group/product cursor-help text-left">
                                            <div className="flex items-center gap-1.5">
                                                {order.items && order.items.length > 0 && (
                                                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[12px] font-bold min-w-[24px] text-center border border-blue-200 dark:border-blue-800/50" title="Total Quantity">
                                                        {order.items.reduce((sum: number, item: any) => sum + (item.qty || 0), 0)}
                                                    </span>
                                                )}
                                                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[130px] inline-block" title={order.items?.[0]?.product_name}>
                                                    {order.items?.[0]?.product_name || 'No Items'}
                                                </span>
                                                {order.items && order.items.length > 1 && (
                                                    <span className="text-[12px] bg-gray-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                                        +{order.items.length - 1} more
                                                    </span>
                                                )}
                                            </div>
                                            {order.items && order.items.length > 0 && (
                                                <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-xl p-3 hidden group-hover/product:block z-[100] max-h-60 overflow-y-auto pointer-events-none">
                                                    <div className="relative z-[101]">
                                                        <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">Order Items</p>
                                                        <ul className="space-y-1.5">
                                                            {order.items.map((item: any, idx: number) => (
                                                                <li key={idx} className="flex justify-between items-start text-[14px] text-slate-700 dark:text-slate-200 gap-2">
                                                                    <span className="flex-1 break-words leading-tight">{item.product_name}</span>
                                                                    <span className="text-black dark:text-slate-400 min-w-[24px] text-right font-mono bg-gray-100 dark:bg-slate-900/50 px-1 rounded">x{item.qty}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-[14px] text-black dark:text-slate-300 text-left">
                                            {todaySubTab === 'pending' ? (
                                                <span className="text-black dark:text-slate-400 truncate max-w-[150px] inline-block" title={order.address}>{order.address}</span>
                                            ) : (
                                                <>
                                                    {order.courier_provider === 'local' ? (
                                                        <span className="text-emerald-600 dark:text-emerald-300">{order.delivery_branch || '-'}</span>
                                                    ) : order.courier_provider === 'pathao' ? (
                                                        <span className="text-red-600 dark:text-red-300">{order.city_name || order.city || 'Kathmandu'}</span>
                                                    ) : order.courier_provider === 'pickdrop' ? (
                                                        <span className="text-orange-600 dark:text-orange-400 truncate max-w-[120px] inline-block" title={order.pickdrop_city_area || order.address}>{order.pickdrop_destination_branch ? `${order.pickdrop_destination_branch}` : ''}{order.pickdrop_city_area ? ` · ${order.pickdrop_city_area}` : ''}</span>
                                                    ) : order.courier_provider === 'ncm' ? (
                                                        <span className="text-blue-600 dark:text-blue-300">{order.ncm_to_branch || order.city_name || '-'}</span>
                                                    ) : order.courier_provider === 'self' ? (
                                                        <span className="text-emerald-600 dark:text-emerald-300">Self Delivered</span>
                                                    ) : (
                                                        <span className="text-black dark:text-slate-500 truncate max-w-[100px] inline-block" title={order.address}>{order.address}</span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                        <div className="text-black dark:text-slate-300 font-mono text-left text-[14px]">Rs. {order.total_amount}</div>
                                        <div className="text-[13px] text-black dark:text-slate-400 truncate max-w-[120px]" title={order.remarks}>
                                            {(order.order_status === 'New Order' || order.order_status === 'Confirmed Order') ? (order.remarks || '-') : ''}
                                        </div>

                                        <div className="text-center flex flex-col items-center justify-center">
                                            <span className={`text-[12px] px-2 py-0.5 rounded-full border whitespace-nowrap ${order.order_status === 'New Order' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700' :
                                                order.order_status === 'Confirmed Order' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700' :
                                                    order.order_status === 'Ready to Ship' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-700' :
                                                        order.order_status === 'Packed' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 border-orange-200 dark:border-orange-700' :
                                                            order.order_status === 'Shipped' ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700' :
                                                                order.order_status === 'Arrived at Branch' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700' :
                                                                    order.order_status === 'Delivery Process' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-700' :
                                                                        order.order_status === 'Delivered' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200 border-green-200 dark:border-green-700' :
                                                                            order.order_status === 'Delivery Failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 border-red-200 dark:border-red-700' :
                                                                                order.order_status === 'Hold' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-200 border-orange-200 dark:border-orange-700' :
                                                                                    order.order_status === 'Return Process' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-700' :
                                                                                        order.order_status === 'Return Delivered' ? 'bg-slate-100 dark:bg-slate-700 text-black dark:text-slate-300 border-slate-200 dark:border-slate-600' :
                                                                                            order.order_status === 'Cancel' || order.order_status === 'Cancelled' ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700' :
                                                                                                order.order_status === 'Follow up again' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700' :
                                                                                                    'bg-slate-100 dark:bg-slate-700 text-black dark:text-slate-300 border-slate-200 dark:border-slate-600'
                                                }`}>
                                                {order.order_status === 'Ready to Ship' ? 'Packed' : order.order_status}
                                            </span>
                                            {order.status_reason && (
                                                <span className="text-[11px] text-red-500 dark:text-red-300 mt-1 max-w-[120px] leading-tight block break-words">
                                                    {order.status_reason}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right flex items-center justify-end gap-2">
                                            {(order.order_status === 'New Order' || order.order_status === 'Follow up again') && (
                                                <>
                                                    <button
                                                        onClick={() => handleConfirmAction(order)}
                                                        className="text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-colors mr-1"
                                                        title="Confirm Order"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleCancelAction(order.id)}
                                                        className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors mr-2"
                                                        title="Cancel Order"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </>
                                            )}

                                            {/* Manual Status Change for Local/Self */}
                                            {['local', 'self'].includes(order.courier_provider) &&
                                                ['Confirmed Order', 'Ready to Ship', 'Packed', 'Shipped'].includes(order.order_status) && 
                                                !(order.courier_provider === 'self' && order.order_status === 'Packed') && (
                                                    <div className="relative inline-block mr-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStatusMenuOrderId(statusMenuOrderId === order.id ? null : order.id);
                                                            }}
                                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                                                            title="Change Status"
                                                        >
                                                            <ArrowLeftRight size={16} />
                                                        </button>

                                                        {statusMenuOrderId === order.id && (
                                                            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-[150] py-1 animate-in fade-in zoom-in duration-200">
                                                                <div className="px-3 py-2 text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-gray-100 dark:border-slate-700">
                                                                    Change Status
                                                                </div>
                                                                <div className="max-h-60 overflow-y-auto">
                                                                    {orderStatuses.map(status => (
                                                                        <button
                                                                            key={status}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onManualStatusChange(order.id, status);
                                                                            }}
                                                                            className={`w-full text-left px-4 py-2 text-[13px] hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors ${order.order_status === status ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-700 dark:text-slate-200'
                                                                                }`}
                                                                        >
                                                                            {status}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            {order.order_status === 'Confirmed Order' && order.courier_provider === 'pathao' && !order.courier_consignment_id && (
                                                <button
                                                    onClick={() => handleShipOrder(order.id)}
                                                    className="text-red-400 hover:text-red-300 transition-colors mr-1"
                                                    title="Ship with Pathao"
                                                >
                                                    <Truck size={16} />
                                                </button>
                                            )}
                                            {order.order_status === 'Confirmed Order' && order.courier_provider === 'pickdrop' && !order.pickdrop_order_id && (
                                                <button
                                                    onClick={() => handlePickDropShip(order.id)}
                                                    className="text-orange-500 hover:text-orange-400 transition-colors mr-1"
                                                    title="Ship with Pick & Drop"
                                                >
                                                    <Truck size={16} />
                                                </button>
                                            )}
                                            {order.order_status === 'Confirmed Order' && order.courier_provider === 'ncm' && !order.courier_consignment_id && (
                                                <button
                                                    onClick={async () => {
                                                        if (userRole !== 'admin' && userRole !== 'editor') {
                                                            alert('You do not have permission to ship orders.');
                                                            return;
                                                        }
                                                        if (!window.confirm('Ship this order via Nepal Can Move (NCM)?')) return;
                                                        try {
                                                            const token = localStorage.getItem('token');
                                                            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/ship`, { orderId: order.id }, {
                                                                headers: { 'Authorization': `Bearer ${token}` }
                                                            });
                                                            if (res.data?.success) {
                                                                alert(`✅ Shipped via NCM!\nConsignment ID: ${res.data.orderId}`);
                                                                fetchOrders();
                                                            } else {
                                                                alert('❌ Failed: ' + (res.data?.error || 'Unknown error'));
                                                            }
                                                        } catch (error: any) {
                                                            console.error('Failed to ship via NCM', error);
                                                            alert('❌ Failed: ' + (error.response?.data?.message || error.message));
                                                        }
                                                    }}
                                                    className="text-blue-500 hover:text-blue-400 transition-colors mr-1"
                                                    title="Ship with NCM"
                                                >
                                                    <Truck size={16} />
                                                </button>
                                            )}
                                            {order.order_status === 'Ready to Ship' && order.courier_provider === 'pickdrop' && (
                                                <button
                                                    onClick={() => handleSyncPickDrop(order.id)}
                                                    disabled={syncingOrderId === order.id}
                                                    className={`text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 transition-colors mr-2 ${syncingOrderId === order.id ? 'animate-spin' : ''}`}
                                                    title="Sync Pick & Drop Status"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            )}
                                            {order.order_status === 'Shipped' && order.courier_provider === 'ncm' && (
                                                <button
                                                    onClick={() => handleSyncNcm(order.id)}
                                                    disabled={syncingOrderId === order.id}
                                                    className={`text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors mr-2 ${syncingOrderId === order.id ? 'animate-spin' : ''}`}
                                                    title="Sync NCM Status"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            )}
                                            {order.order_status === 'Confirmed Order' && order.courier_provider === 'self' && (
                                                <button
                                                    onClick={() => setAssigningOrder(order)}
                                                    className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 transition-colors mr-1"
                                                    title="Assign to Rider"
                                                >
                                                    <User size={16} />
                                                </button>
                                            )}
                                            {order.order_status === 'Packed' && order.courier_provider === 'self' && (
                                                <button
                                                    onClick={() => handleUnassignRider(order.id)}
                                                    className="text-red-500 hover:text-red-400 transition-colors mr-1"
                                                    title="Unassign Rider"
                                                >
                                                    <UserMinus size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => router.push(`/orders/${order.id}`)}
                                                className="text-blue-400 hover:text-blue-300 text-[14px] font-medium"
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
                            )
                        ) : (
                            <div className="h-full flex flex-col">
                                {/* Order Summary Reports */}
                                {summaryReportView === 'daily' && (
                                    selectedDateForReport ? (
                                        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                                            {/* Detailed View Header */}
                                            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => setSelectedDateForReport(null)}
                                                        className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-600 dark:text-slate-400"
                                                    >
                                                        <ArrowLeft size={20} />
                                                    </button>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Orders: {selectedDateForReport}</h3>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{detailedReportOrders.length} orders tracked on this day</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">View Status:</span>
                                                    <select
                                                        value={reportDetailStatusFilter}
                                                        onChange={(e) => setReportDetailStatusFilter(e.target.value)}
                                                        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200 shadow-sm"
                                                    >
                                                        <option value="all">All Statuses</option>
                                                        <option value="Confirm Order">Confirm Order</option>
                                                        <option value="Packed">Packed</option>
                                                        <option value="Shipped">Shipped</option>
                                                        <option value="Delivered">Delivered</option>
                                                        <option value="Return Delivered">Return Delivered</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-auto">
                                                <table className="w-full text-left border-collapse">
                                                    <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 z-10 border-b border-gray-200 dark:border-slate-700">
                                                        <tr>
                                                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase">Order ID</th>
                                                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase">Customer</th>
                                                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase">Logistics</th>
                                                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase">Branch</th>
                                                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase">Current Status</th>
                                                            <th className="px-6 py-4 text-[13px] font-bold text-slate-500 uppercase text-center">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                        {detailedReportOrders.map((order) => (
                                                            <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                                <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400">
                                                                    #{order.order_number || order.order_id || order.id.slice(0, 8)}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-sm font-bold text-slate-900 dark:text-white">{order.customer_name || 'No Name'}</div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{order.phone_number || order.customer_phone}</div>
                                                                </td>
                                                                <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                    {order.courier_provider === 'ncm' ? 'Nepal Can Move' :
                                                                        order.courier_provider === 'pickdrop' ? 'Pick & Drop' :
                                                                            order.courier_provider === 'self' ? 'Self Delivery' :
                                                                                (order.courier_provider?.charAt(0).toUpperCase() + order.courier_provider?.slice(1))}
                                                                </td>
                                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                                    {order.courier_provider === 'local' ? (
                                                                        <span>{order.delivery_branch || '-'}</span>
                                                                    ) : order.courier_provider === 'pathao' ? (
                                                                        <span>{order.city_name || order.city || 'Kathmandu'}</span>
                                                                    ) : order.courier_provider === 'pickdrop' ? (
                                                                        <span>{order.pickdrop_destination_branch || order.pickdrop_city_area || '-'}</span>
                                                                    ) : order.courier_provider === 'ncm' ? (
                                                                        <span>{order.ncm_to_branch || order.city_name || '-'}</span>
                                                                    ) : (
                                                                        <span>{order.delivery_branch || order.address || '-'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${order.order_status === 'Delivered' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' :
                                                                        order.order_status === 'Shipped' ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400' :
                                                                            order.order_status === 'Ready to Ship' || order.order_status === 'Packed' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' :
                                                                                'bg-gray-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                                        }`}>
                                                                        {order.order_status}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <button
                                                                        onClick={() => router.push(`/orders/${order.id}`)}
                                                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-bold transition-all shadow-sm hover:shadow-md"
                                                                    >
                                                                        View Order
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {detailedReportOrders.length === 0 && (
                                                            <tr>
                                                                <td colSpan={6} className="px-6 py-20 text-center text-slate-400 bg-gray-50/20 dark:bg-slate-900/10">
                                                                    <div className="flex flex-col items-center">
                                                                        <Package size={48} className="opacity-10 mb-3" />
                                                                        <p className="font-medium">No orders found matching the selected filter for this date.</p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 overflow-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-gray-200 dark:border-slate-700 z-10">
                                                    <tr>
                                                        <th className="px-6 py-4">Date</th>
                                                        <th className="px-6 py-4 text-center text-blue-600 dark:text-blue-400">Confirm Order</th>
                                                        <th className="px-6 py-4 text-center text-orange-600 dark:text-orange-400">Packed</th>
                                                        <th className="px-6 py-4 text-center text-cyan-600 dark:text-cyan-400">Shipped</th>
                                                        <th className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400">Delivered</th>
                                                        <th className="px-6 py-4 text-center text-red-600 dark:text-red-400">Return Delivered</th>
                                                        <th className="px-6 py-4 text-center text-slate-500">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                    {dailyReportData.map((row, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                            <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{row.date}</td>
                                                            <td className="px-6 py-4 text-center font-bold text-[16px]">{row.confirmed}</td>
                                                            <td className="px-6 py-4 text-center font-bold text-[16px] relative group/packed">
                                                                <span className="cursor-help border-b border-dotted border-orange-400 pb-0.5">{row.packed}</span>
                                                                {row.packed > 0 && (
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl p-3 hidden group-hover/packed:block z-[100] pointer-events-none text-left">
                                                                        <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">Packed Breakdown</p>
                                                                        <ul className="space-y-1">
                                                                            {Object.entries(row.packedBreakdown).map(([name, count]) => (
                                                                                <li key={name} className="flex justify-between items-center text-[13px] text-slate-700 dark:text-slate-200">
                                                                                    <span>{name}</span>
                                                                                    <span className="font-bold">{count}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-[16px] relative group/shipped">
                                                                <span className="cursor-help border-b border-dotted border-cyan-400 pb-0.5">{row.shipped}</span>
                                                                {row.shipped > 0 && (
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl p-3 hidden group-hover/shipped:block z-[100] pointer-events-none text-left">
                                                                        <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">Shipped Breakdown</p>
                                                                        <ul className="space-y-1">
                                                                            {Object.entries(row.shippedBreakdown).map(([name, count]) => (
                                                                                <li key={name} className="flex justify-between items-center text-[13px] text-slate-700 dark:text-slate-200">
                                                                                    <span>{name}</span>
                                                                                    <span className="font-bold">{count}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-[16px] relative group/delivered">
                                                                <span className="cursor-help border-b border-dotted border-emerald-400 pb-0.5">{row.delivered}</span>
                                                                {row.delivered > 0 && (
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl p-3 hidden group-hover/delivered:block z-[100] pointer-events-none text-left">
                                                                        <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">Delivered Breakdown</p>
                                                                        <ul className="space-y-1">
                                                                            {Object.entries(row.deliveredBreakdown).map(([name, count]) => (
                                                                                <li key={name} className="flex justify-between items-center text-[13px] text-slate-700 dark:text-slate-200">
                                                                                    <span>{name}</span>
                                                                                    <span className="font-bold">{count}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-[16px] relative group/returnDelivered">
                                                                <span className="cursor-help border-b border-dotted border-red-400 pb-0.5">{row.returnDelivered}</span>
                                                                {row.returnDelivered > 0 && (
                                                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl p-3 hidden group-hover/returnDelivered:block z-[100] pointer-events-none text-left">
                                                                        <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase border-b border-gray-100 dark:border-slate-700 pb-1">Return Breakdown</p>
                                                                        <ul className="space-y-1">
                                                                            {Object.entries(row.returnDeliveredBreakdown).map(([name, count]) => (
                                                                                <li key={name} className="flex justify-between items-center text-[13px] text-slate-700 dark:text-slate-200">
                                                                                    <span>{name}</span>
                                                                                    <span className="font-bold">{count}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <button
                                                                    onClick={() => setSelectedDateForReport(row.date)}
                                                                    className="px-3 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-[13px] font-bold border border-blue-100 dark:border-blue-500/20"
                                                                >
                                                                    View
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {dailyReportData.length === 0 && (
                                                        <tr>
                                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400 bg-gray-50/30 dark:bg-slate-900/10">
                                                                No status history recorded yet.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                                )}

                                {summaryReportView === 'courier' && (
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800 text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase border-b border-gray-200 dark:border-slate-700 z-10">
                                                <tr>
                                                    <th className="px-6 py-4">Courier</th>
                                                    <th className="px-6 py-4 text-center">Shipped</th>
                                                    <th className="px-6 py-4 text-center">Delivery Process</th>
                                                    <th className="px-6 py-4 text-center">Delivered</th>
                                                    <th className="px-6 py-4 text-center text-red-600 dark:text-red-400">Failed Delivered</th>
                                                    <th className="px-6 py-4 text-center">Hold</th>
                                                    <th className="px-6 py-4 text-center">Return Process</th>
                                                    <th className="px-6 py-4 text-center">Return Delivered</th>
                                                    <th className="px-6 py-4 text-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">Pending In Courier</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                                {courierReportData.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                            {row.provider === 'ncm' ? 'Nepal Can Move' : row.provider.charAt(0).toUpperCase() + row.provider.slice(1)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center text-cyan-600 dark:text-cyan-400 font-medium">{row.shipped}</td>
                                                        <td className="px-6 py-4 text-center text-blue-600 dark:text-blue-400 font-medium">{row.deliveryProcess}</td>
                                                        <td className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">{row.delivered}</td>
                                                        <td className="px-6 py-4 text-center text-red-500 dark:text-red-400 font-medium">{row.deliveryFailed}</td>
                                                        <td className="px-6 py-4 text-center text-amber-600 dark:text-amber-400 font-medium">{row.hold}</td>
                                                        <td className="px-6 py-4 text-center text-orange-500 dark:text-orange-400 font-medium">{row.returnProcess}</td>
                                                        <td className="px-6 py-4 text-center text-red-700 dark:text-red-300 font-bold">{row.returnDelivered}</td>
                                                        <td className="px-6 py-4 text-center font-black text-[18px] bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400">
                                                            {row.pendingInCourier}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
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
                    backdrop={true}
                    isCentered={true}
                />

                {isEditModalOpen && selectedOrderForEdit && (
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
                        backdrop={true}
                        isCentered={true}
                    />
                )}

                {isCancelModalOpen && selectedOrderForCancel && cancelOrderDetails && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-sm p-6 border border-slate-700 animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-bold text-white mb-4">Select Action</h3>
                            <p className="text-slate-400 mb-6">Choose an action for this order. {cancelOrderDetails.order_status !== 'Follow up again' ? '"Follow Up" keeps it active for later, ' : ''}"Cancel" marks it as cancelled.</p>

                            <div className="flex flex-col gap-3">
                                {cancelOrderDetails.order_status !== 'Follow up again' && (
                                    <button
                                        onClick={() => handleStatusUpdate(selectedOrderForCancel!, 'Follow up again')}
                                        className="w-full py-3 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 hover:text-yellow-400 border border-yellow-600/50 rounded-lg transition-colors font-bold flex items-center justify-center gap-2"
                                    >
                                        <Clock size={18} />
                                        Follow Up
                                    </button>
                                )}
                                <button
                                    onClick={() => handleStatusUpdate(selectedOrderForCancel!, 'Cancel')}
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

            {assigningOrder && (
                <RiderAssignmentModal
                    orderIds={assigningOrder.isBulk ? assigningOrder.ids : [assigningOrder.id]}
                    orderNumber={assigningOrder.isBulk ? undefined : assigningOrder.order_number}
                    onClose={() => setAssigningOrder(null)}
                    onAssigned={() => {
                        fetchOrders();
                        setAssigningOrder(null);
                        if (assigningOrder.isBulk) {
                            setSelectedOrders(new Set());
                        }
                    }}
                />
            )}
        </div>
    );
}
