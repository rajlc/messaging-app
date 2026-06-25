'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
    Package, Plus, Search, Filter, Check, X, Truck, List, Clock, CheckCircle2, FileText, ChevronDown, RefreshCw,
    ArrowLeftRight, ArrowLeft, User, UserMinus, Hash, Printer
} from 'lucide-react';
import OrderModal from './OrderModal';
import RiderAssignmentModal from './RiderAssignmentModal';

const getStatusBadgeStyle = (status: string) => {
    switch (status) {
        case 'Confirmed Order': return 'bg-[#ECFDF3] text-[#027A48]';
        case 'New Order':
        case 'Follow up again':
        case 'Pending': return 'bg-[#FEF3C7] text-[#D97706]';
        case 'Ready to Ship':
        case 'Packed': return 'bg-[#EEF2FF] text-[#4338CA]';
        case 'Shipped':
        case 'Arrived at Branch':
        case 'Delivery Process': return 'bg-[#EFF6FF] text-[#2563EB]';
        case 'Cancel':
        case 'Cancelled':
        case 'Delivery Failed': return 'bg-[#FEF2F2] text-[#EF4444]';
        case 'Delivered': return 'bg-[#ECFDF3] text-[#059669]';
        case 'Hold':
        case 'Return Process': return 'bg-[#FFF7ED] text-[#EA580C]';
        case 'Returned Delivered': return 'bg-[#F3F4F6] text-[#4B5563]';
        default: return 'bg-gray-100 text-gray-700';
    }
};

const getStatusLeftBarColor = (status: string) => {
    switch (status) {
        case 'Confirmed Order': return 'bg-[#22C55E]';
        case 'New Order':
        case 'Follow up again':
        case 'Pending': return 'bg-[#F59E0B]';
        case 'Ready to Ship':
        case 'Packed': return 'bg-[#6366F1]';
        case 'Shipped':
        case 'Arrived at Branch':
        case 'Delivery Process': return 'bg-[#3B82F6]';
        case 'Cancel':
        case 'Cancelled':
        case 'Delivery Failed': return 'bg-[#EF4444]';
        case 'Delivered': return 'bg-[#10B981]';
        case 'Hold':
        case 'Return Process': return 'bg-[#F97316]';
        case 'Returned Delivered': return 'bg-[#6B7280]';
        default: return 'bg-[#9CA3AF]';
    }
};

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
    const [todaySubTab, setTodaySubTab] = useState<'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('ordersTodaySubTab') as any) || 'pending';
        }
        return 'pending';
    });
    const [deliveredOption, setDeliveredOption] = useState<'all' | 'shipped_delivered' | 'delivered_only'>('all');
    const [deliveredDropdownOpen, setDeliveredDropdownOpen] = useState(false);
    const [orderListSubTab, setOrderListSubTab] = useState<'all' | 'shipped' | 'delivered' | 'returnProcess' | 'returned'>(() => {
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
    const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());

    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);

    // Print States
    const [storeName, setStoreName] = useState('Bagmati Online');
    const [printLayout, setPrintLayout] = useState<'6' | '9'>('6');

    // Fetch store name on mount
    useEffect(() => {
        const fetchStoreSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/settings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.data && res.data.store_name) {
                    setStoreName(res.data.store_name);
                }
            } catch (err) {
                console.error('Failed to fetch general settings store name:', err);
            }
        };
        fetchStoreSettings();
    }, []);

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
        'Returned Delivered',
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
            const savedDeliveredOption = localStorage.getItem('ordersDeliveredOption');

            if (savedActiveTab) setActiveTab(savedActiveTab as any);
            if (savedTodaySubTab) setTodaySubTab(savedTodaySubTab as any);
            if (savedOrderListSubTab) setOrderListSubTab(savedOrderListSubTab as any);
            if (savedSummaryReportView) setSummaryReportView(savedSummaryReportView as any);
            if (savedSelectedDate) setSelectedDateForReport(savedSelectedDate);
            if (savedReportFilter) setReportDetailStatusFilter(savedReportFilter);
            if (savedDeliveredOption) setDeliveredOption(savedDeliveredOption as any);
        }
        fetchOrders();
    }, []);

    useEffect(() => {
        localStorage.setItem('ordersActiveTab', activeTab);
        localStorage.setItem('ordersTodaySubTab', todaySubTab);
        localStorage.setItem('ordersListSubTab', orderListSubTab);
        localStorage.setItem('ordersSummaryReportView', summaryReportView);
        localStorage.setItem('ordersDeliveredOption', deliveredOption);
        if (selectedDateForReport) {
            localStorage.setItem('selectedDateForReport', selectedDateForReport);
        } else {
            localStorage.removeItem('selectedDateForReport');
        }
        localStorage.setItem('reportDetailStatusFilter', reportDetailStatusFilter);
    }, [activeTab, todaySubTab, orderListSubTab, summaryReportView, selectedDateForReport, reportDetailStatusFilter, deliveredOption]);


    // Click outside to close status menu
    useEffect(() => {
        const handleClickOutside = () => {
            if (statusMenuOrderId) setStatusMenuOrderId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [statusMenuOrderId]);

    // Reset selection and filter when tabs change
    useEffect(() => {
        setSelectedOrders(new Set());
        setLogisticsFilter('all');
        setStartDate('');
        setEndDate('');
        setBranchFilter('all');
        setStatusFilter('all');
        setSearchQuery('');
        setDeliveredDropdownOpen(false);
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

    const handleBulkPrint = async () => {
        if (selectedOrders.size === 0) return;
        
        // Trigger window print dialog
        setTimeout(async () => {
            window.print();
            
            // Mark all selected orders as invoice printed
            const token = localStorage.getItem('token');
            const orderIds = Array.from(selectedOrders);
            
            try {
                await Promise.all(
                    orderIds.map(id => {
                        const order = orders.find(o => o.id === id);
                        if (!order) return Promise.resolve();
                        return axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${id}`, {
                            ...order,
                            invoice_printed: true
                        }, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                    })
                );
                
                // Clear selection and refresh orders
                setSelectedOrders(new Set());
                fetchOrders();
            } catch (err) {
                console.error('Failed to update invoice print status:', err);
                alert('Invoices printed, but failed to update print status in backend database.');
            }
        }, 300);
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

    const handleSyncLogisticOrder = async (orderId: string, provider: string) => {
        if (userRole !== 'admin' && userRole !== 'editor') {
            alert('You do not have permission to sync orders.');
            return;
        }

        setSyncingOrderId(orderId);
        try {
            const token = localStorage.getItem('token');
            let response;
            
            if (provider === 'pickdrop') {
                response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/status-sync`,
                    { orderId }, { headers: { 'Authorization': `Bearer ${token}` } }
                );
            } else if (provider === 'ncm') {
                response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/status-sync`,
                    { orderId }, { headers: { 'Authorization': `Bearer ${token}` } }
                );
            } else if (provider === 'pathao') {
                response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/orders/${orderId}/pathao-info`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                alert('✅ Sync complete for Pathao!');
                fetchOrders();
                return;
            }

            if (response?.data?.success || response?.data?.status) {
                const data = response.data.data || response.data;
                if (data.newStatus) {
                    alert(`✅ Sync complete! Status updated to: ${data.newStatus}`);
                    fetchOrders();
                } else {
                    alert('ℹ️ Status is already up to date.');
                }
            } else {
                alert('❌ Sync failed: ' + (response?.data?.error || response?.data?.message || 'Unknown error'));
            }
        } catch (error: any) {
            console.error(`Failed to sync ${provider} order`, error);
            alert('❌ Failed to sync order: ' + (error.response?.data?.message || error.message));
        } finally {
            setSyncingOrderId(null);
        }
    };

    const handleUnassignRider = async (orderId: string, riderName: string) => {
        if (!window.confirm(`Are you sure you want to unassign this order from rider ${riderName}?`)) return;

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
                if (todaySubTab === 'pending') {
                    // Show all "New Order" regardless of date
                    return order.order_status === 'New Order' || order.order_status === 'Follow up again';
                } else if (todaySubTab === 'confirmed') {
                    // Show all "Confirmed Order" regardless of date
                    return order.order_status === 'Confirmed Order';
                } else if (todaySubTab === 'packed') {
                    // Show all "Packed" or "Ready to Ship" regardless of date
                    return order.order_status === 'Ready to Ship' || order.order_status === 'Packed';
                } else if (todaySubTab === 'shipped') {
                    const allowedShippedStatuses = ['Shipped', 'Arrived at Branch', 'Delivery Process', 'Hold', 'Delivery Failed', 'Return Process'];
                    if (!allowedShippedStatuses.includes(order.order_status)) return false;

                    // For Shipped: show ONLY if it was shipped today
                    if (order.shipped_at) {
                        const shippedDate = new Date(order.shipped_at);
                        if (shippedDate.getDate() === today.getDate() &&
                            shippedDate.getMonth() === today.getMonth() &&
                            shippedDate.getFullYear() === today.getFullYear()) return true;
                    }
                    
                    // Check status_history for 'Shipped' status changed today (fallback if shipped_at missing)
                    return (order.status_history || []).some((h: any) => {
                        if (h.status.trim() !== 'Shipped') return false;
                        const actionDate = new Date(h.changed_at);
                        return actionDate.getDate() === today.getDate() &&
                            actionDate.getMonth() === today.getMonth() &&
                            actionDate.getFullYear() === today.getFullYear();
                    });
                } else if (todaySubTab === 'delivered') {
                    const isSameDay = (d1: Date, d2: Date) =>
                        d1.getDate() === d2.getDate() &&
                        d1.getMonth() === d2.getMonth() &&
                        d1.getFullYear() === d2.getFullYear();

                    // 1. Delivered today check
                    let deliveredToday = false;
                    if (order.delivered_at) {
                        if (isSameDay(new Date(order.delivered_at), today)) {
                            deliveredToday = true;
                        }
                    } else {
                        deliveredToday = (order.status_history || []).some((h: any) => {
                            if (h.status.trim() !== 'Delivered') return false;
                            return isSameDay(new Date(h.changed_at), today);
                        });
                    }

                    if (!deliveredToday) return false;

                    // 2. Shipped today check
                    let shippedToday = false;
                    if (order.shipped_at) {
                        if (isSameDay(new Date(order.shipped_at), today)) {
                            shippedToday = true;
                        }
                    } else {
                        shippedToday = (order.status_history || []).some((h: any) => {
                            if (h.status.trim() !== 'Shipped') return false;
                            return isSameDay(new Date(h.changed_at), today);
                        });
                    }

                    if (deliveredOption === 'all') {
                        return true;
                    } else if (deliveredOption === 'shipped_delivered') {
                        return shippedToday;
                    } else if (deliveredOption === 'delivered_only') {
                        return !shippedToday;
                    }
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
            orderList = orderList.filter(order => 
                order.order_status === 'Shipped' || 
                order.order_status === 'Arrived at Branch' || 
                order.order_status === 'Delivery Process'
            );
        } else if (orderListSubTab === 'returnProcess') {
            orderList = orderList.filter(order => 
                order.order_status === 'Hold' || 
                order.order_status === 'Delivery Failed' || 
                order.order_status === 'Return Process'
            ).sort((a, b) => {
                const priority: Record<string, number> = { 'Hold': 1, 'Delivery Failed': 2, 'Return Process': 3 };
                return (priority[a.order_status] || 99) - (priority[b.order_status] || 99);
            });
        } else if (orderListSubTab === 'returned') {
            orderList = orderList.filter(order => order.order_status === 'Returned Delivered');
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
        let deliveredCount = 0;

        orders.forEach(order => {
            // Pending: All "New Order" or "Follow up again"
            if (order.order_status === 'New Order' || order.order_status === 'Follow up again') {
                pendingCount++;
            }
            // Confirmed: All "Confirmed Order"
            if (order.order_status === 'Confirmed Order') {
                confirmedCount++;
            }
            // Packed: All "Ready to Ship" or "Packed"
            if (order.order_status === 'Ready to Ship' || order.order_status === 'Packed') {
                packedCount++;
            }
            // Shipped: ONLY if shipped today and status is one of the allowed shipped statuses
            const allowedShippedStatuses = ['Shipped', 'Arrived at Branch', 'Delivery Process', 'Hold', 'Delivery Failed', 'Return Process'];
            if (allowedShippedStatuses.includes(order.order_status)) {
                if (order.shipped_at) {
                    const shippedDate = new Date(order.shipped_at);
                    if (isSameDay(shippedDate, today)) shippedCount++;
                } else {
                    // Fallback: check status_history for 'Shipped' change today
                    const wasShippedToday = (order.status_history || []).some((h: any) => {
                        if (h.status.trim() !== 'Shipped') return false;
                        return isSameDay(new Date(h.changed_at), today);
                    });
                    if (wasShippedToday) shippedCount++;
                }
            }
            // Delivered: ONLY if delivered today
            if (order.delivered_at) {
                const deliveredDate = new Date(order.delivered_at);
                if (isSameDay(deliveredDate, today)) deliveredCount++;
            } else {
                // Fallback: check status_history for 'Delivered' change today
                const wasDeliveredToday = (order.status_history || []).some((h: any) => {
                    if (h.status.trim() !== 'Delivered') return false;
                    return isSameDay(new Date(h.changed_at), today);
                });
                if (wasDeliveredToday) deliveredCount++;
            }
        });
        return { pending: pendingCount, confirmed: confirmedCount, packed: packedCount, shipped: shippedCount, delivered: deliveredCount };
    }, [orders]);

    // Calculate Order List Stats
    const listStats = useMemo(() => {
        const allCount = orders.length;
        const shippedCount = orders.filter(o => 
            o.order_status === 'Shipped' || 
            o.order_status === 'Arrived at Branch' || 
            o.order_status === 'Delivery Process'
        ).length;
        const returnProcessCount = orders.filter(o => 
            o.order_status === 'Hold' || 
            o.order_status === 'Delivery Failed' || 
            o.order_status === 'Return Process'
        ).length;
        const returnedCount = orders.filter(o => o.order_status === 'Returned Delivered').length;
        const deliveredCount = orders.filter(o => o.order_status === 'Delivered').length;
        return { all: allCount, shipped: shippedCount, returnProcess: returnProcessCount, returned: returnedCount, delivered: deliveredCount };
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

                if (status === 'Returned Delivered') {
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
                    return ['Confirmed Order', 'Ready to Ship', 'Packed', 'Shipped', 'Delivered', 'Returned Delivered'].includes(status);
                }

                const filterMap: Record<string, string[]> = {
                    'Confirm Order': ['Confirmed Order'],
                    'Packed': ['Ready to Ship', 'Packed'],
                    'Shipped': ['Shipped'],
                    'Delivered': ['Delivered'],
                    'Returned Delivered': ['Returned Delivered']
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
                                        <div className="relative">
                                            <button
                                                onClick={() => {
                                                    if (todaySubTab !== 'delivered') {
                                                        setTodaySubTab('delivered');
                                                        setDeliveredOption('all');
                                                        setDeliveredDropdownOpen(true);
                                                    } else {
                                                        setDeliveredDropdownOpen(!deliveredDropdownOpen);
                                                    }
                                                }}
                                                className={`px-5 py-2 rounded-full text-[15px] font-semibold transition-colors flex items-center gap-2 border ${todaySubTab === 'delivered'
                                                    ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-500/30'
                                                    : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                    }`}
                                            >
                                                <CheckCircle2 size={14} />
                                                <span>Delivered{todaySubTab === 'delivered' && `: ${deliveredOption === 'all' ? 'All Orders' : deliveredOption === 'shipped_delivered' ? 'Today Shipped Delivered' : 'Today Delivered Order'}`}</span>
                                                <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-xs ml-1 shadow-sm">{todayStats.delivered}</span>
                                                <ChevronDown size={14} className={`transition-transform ${deliveredDropdownOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {deliveredDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setDeliveredDropdownOpen(false)} />
                                                    <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                                                        <button
                                                            onClick={() => {
                                                                setDeliveredOption('all');
                                                                setDeliveredDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between ${deliveredOption === 'all' ? 'text-green-600 dark:text-green-400 font-bold bg-green-50/50 dark:bg-green-500/5' : 'text-slate-700 dark:text-slate-200'}`}
                                                        >
                                                            <span>All Orders</span>
                                                            {deliveredOption === 'all' && <Check size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDeliveredOption('shipped_delivered');
                                                                setDeliveredDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between ${deliveredOption === 'shipped_delivered' ? 'text-green-600 dark:text-green-400 font-bold bg-green-50/50 dark:bg-green-500/5' : 'text-slate-700 dark:text-slate-200'}`}
                                                        >
                                                            <span>Today Shipped Delivered</span>
                                                            {deliveredOption === 'shipped_delivered' && <Check size={14} />}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setDeliveredOption('delivered_only');
                                                                setDeliveredDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between ${deliveredOption === 'delivered_only' ? 'text-green-600 dark:text-green-400 font-bold bg-green-50/50 dark:bg-green-500/5' : 'text-slate-700 dark:text-slate-200'}`}
                                                        >
                                                            <span>Today Delivered Order</span>
                                                            {deliveredOption === 'delivered_only' && <Check size={14} />}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
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
                                            onClick={() => setOrderListSubTab('shipped')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'shipped'
                                                ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <Truck size={12} />
                                            Shipped
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-[11px] ml-1 shadow-sm font-bold opacity-80">{listStats.shipped}</span>
                                        </button>
                                        <button
                                            onClick={() => setOrderListSubTab('returnProcess')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'returnProcess'
                                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <RefreshCw size={12} />
                                            Return Process
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-[11px] ml-1 shadow-sm font-bold opacity-80">{listStats.returnProcess}</span>
                                        </button>
                                        <button
                                            onClick={() => setOrderListSubTab('returned')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'returned'
                                                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <ArrowLeftRight size={12} />
                                            Returned
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-[11px] ml-1 shadow-sm font-bold opacity-80">{listStats.returned}</span>
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
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-[11px] ml-1 shadow-sm font-bold opacity-80">{listStats.delivered}</span>
                                        </button>
                                        <button
                                            onClick={() => setOrderListSubTab('all')}
                                            className={`px-4 py-1.5 rounded-full text-[14px] font-semibold transition-colors flex items-center gap-1.5 border ${orderListSubTab === 'all'
                                                ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
                                                : 'bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200'
                                                }`}
                                        >
                                            <List size={12} />
                                            All
                                            <span className="bg-white dark:bg-slate-900/50 px-2 py-0.5 rounded text-[11px] ml-1 shadow-sm font-bold opacity-80">{listStats.all}</span>
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
                                            {orderStatuses.map(status => (
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
                        <div className="flex items-center justify-between p-3 mb-2 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 shadow-sm">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={displayOrders.length > 0 && selectedOrders.size === displayOrders.length}
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                    className="rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer"
                                />
                                <span className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">Select All ({selectedOrders.size})</span>
                            </div>

                            {selectedOrders.size > 0 && activeTab === 'todayOrder' && (todaySubTab === 'packed' || todaySubTab === 'shipped') && (
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Layout:</span>
                                        <select
                                            value={printLayout}
                                            onChange={(e) => setPrintLayout(e.target.value as any)}
                                            className="bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none"
                                        >
                                            <option value="6">6 per A4 page</option>
                                            <option value="9">9 per A4 page</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleBulkPrint}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-green-500/10 active:scale-95 cursor-pointer"
                                    >
                                        <Printer size={14} />
                                        Print Invoices ({selectedOrders.size})
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Table Body / Content replaced with Card View */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 bg-[#F5F7FA] dark:bg-slate-900 pb-10 pt-2">
                        {activeTab !== 'orderSummary' ? (
                            loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : displayOrders.length > 0 ? (
                                <div className="flex flex-col gap-[10px]">
                                    {displayOrders.map((order, index) => (
                                        <div 
                                            key={order.id} 
                                            className="relative bg-white dark:bg-slate-800 rounded-[16px] min-h-[180px] p-[16px_18px] flex flex-col md:flex-row md:items-start gap-4 transition-all duration-200 ease-in hover:-translate-y-[1px] hover:shadow-[0_6px_18px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-slate-700/50"
                                        >
                                            {/* Status Line Indicator */}
                                            <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${getStatusLeftBarColor(order.order_status)}`}></div>

                                            {/* Section 1: LEFT SIDE (26%) - Customer Identity */}
                                            <div className="flex flex-col w-full md:w-[26%] pl-2 shrink-0 border-b md:border-b-0 border-gray-100 pb-3 md:pb-0">
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrders.has(order.id)}
                                                        onChange={(e) => handleSelectRow(order.id, e.target.checked)}
                                                        className="rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500 w-[18px] h-[18px] cursor-pointer"
                                                    />
                                                    <span 
                                                        onClick={() => window.open(`/orders/${order.id}`, '_blank')}
                                                        className="text-[12px] font-[600] text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                                                    >
                                                        Order No. {order.order_number}
                                                    </span>
                                                    {order.platform === 'Website' && (
                                                        <span className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">
                                                            Website
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-1.5 ml-[26px]">
                                                    <div className="text-[13px] text-[#667085] dark:text-slate-400">
                                                        {new Date(order.created_at || order.order_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    <div className="text-[14px] font-[500] text-slate-800 dark:text-slate-200">
                                                        {order.customer_name}
                                                    </div>
                                                    <div className="text-[18px] font-[700] text-[#111827] dark:text-white mt-0.5 tracking-tight">
                                                        {order.phone_number}
                                                        {order.alternative_phone && (
                                                            <span className="text-[11px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded ml-2 font-bold align-middle">ALT</span>
                                                        )}
                                                    </div>
                                                    <div className="text-[14px] font-[600] leading-[1.4] text-slate-700 dark:text-slate-300 mt-1 line-clamp-2" title={order.address}>
                                                        <span className="opacity-80">📍</span> {order.address}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 2: PRODUCT SECTION (34%) */}
                                            <div className="flex flex-col w-full md:w-[34%] shrink-0 pr-0 md:pr-4">
                                                {/* Header Row */}
                                                <div className="grid grid-cols-[1fr_50px_80px] gap-2 mb-2 text-[12px] font-[600] text-[#667085] dark:text-slate-400 uppercase tracking-wide">
                                                    <div>Product Name</div>
                                                    <div className="text-center">Qty</div>
                                                    <div className="text-right">Amount</div>
                                                </div>
                                                
                                                {/* Product List */}
                                                <div className="flex flex-col gap-[4px]">
                                                    {order.items && order.items.length > 0 ? (
                                                        order.items.map((item: any, idx: number) => (
                                                            <div key={idx} className="grid grid-cols-[1fr_50px_80px] gap-2 items-center">
                                                                <div className="text-[14px] font-[500] leading-[1.3] text-slate-800 dark:text-slate-200 break-words line-clamp-2">
                                                                    {item.product_name}
                                                                </div>
                                                                <div className="flex justify-center">
                                                                    <div className="bg-[#EEF2FF] text-[#4338CA] dark:bg-indigo-900/30 dark:text-indigo-300 h-[28px] min-w-[28px] px-2 rounded-[8px] text-[13px] font-[700] flex items-center justify-center">
                                                                        {item.qty}
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-end">
                                                                    <div className="bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-900/30 dark:text-blue-300 py-[6px] px-[10px] rounded-[8px] text-[13px] font-[700] whitespace-nowrap">
                                                                        Rs. {item.total_amount || (item.price * item.qty) || order.total_amount}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-slate-400 italic text-[13px]">No products listed</div>
                                                    )}
                                                </div>

                                                {/* Package Description (Only if exists) */}
                                                {order.package_description && (
                                                    <div className="mt-3 bg-[#F8FAFC] dark:bg-slate-700/50 border border-[#E2E8F0] dark:border-slate-600 p-[10px_12px] rounded-[10px]">
                                                        <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">Package Description</div>
                                                        <div className={`text-[13px] text-[#475467] dark:text-slate-300 ${expandedDescriptions.has(order.id) ? '' : 'line-clamp-2'}`} title={expandedDescriptions.has(order.id) ? '' : order.package_description}>
                                                            {order.package_description}
                                                        </div>
                                                        {order.package_description.length > 80 && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const next = new Set(expandedDescriptions);
                                                                    if (next.has(order.id)) next.delete(order.id);
                                                                    else next.add(order.id);
                                                                    setExpandedDescriptions(next);
                                                                }}
                                                                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 mt-1 uppercase"
                                                            >
                                                                {expandedDescriptions.has(order.id) ? 'View Less' : 'View More'}
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Remarks */}
                                                {order.remarks && (
                                                    <div className="mt-2 text-[13px] font-[700] text-[#B42318] dark:text-red-400 line-clamp-2" title={order.remarks}>
                                                        Remarks: {order.remarks}
                                                    </div>
                                                )}
                                                
                                                {order.status_reason && (
                                                    <div className="mt-1 text-[12px] font-medium text-red-500 line-clamp-2">
                                                        Reason: {order.status_reason}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Section 3: TOTAL + SHIPPING (17%) */}
                                            <div className="flex flex-col w-full md:w-[17%] shrink-0 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700/50 pt-3 md:pt-0 md:pl-4 justify-center md:justify-start">
                                                <div className="text-[12px] text-[#667085] dark:text-slate-400 uppercase font-semibold">Grand Total</div>
                                                <div className="text-[34px] font-[800] tracking-[-0.02em] text-[#111827] dark:text-white leading-none mt-1">
                                                    Rs. {order.total_amount}
                                                </div>
                                                
                                                <div className="h-[1px] bg-[#EAECF0] dark:bg-slate-700 my-[14px]"></div>
                                                
                                                <div className="flex flex-col gap-2 text-[14px] font-[600] text-[#344054] dark:text-slate-300">
                                                    {order.courier_provider === 'local' ? (
                                                        <>
                                                            <div className="flex items-center gap-2"><Truck size={16} className="text-slate-400" /> {order.logistic_name || 'Local'}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="opacity-70 text-[16px]">📍</span> 
                                                                <span>{order.delivery_branch || '-'}</span>
                                                                {order.courier_delivery_fee && (
                                                                    <span className="text-[12px] font-[700] text-emerald-600 dark:text-emerald-400 ml-1.5 whitespace-nowrap">
                                                                        (Est: Rs. {order.courier_delivery_fee})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : order.courier_provider === 'pathao' ? (
                                                        <>
                                                            <div className="flex items-center gap-2"><Truck size={16} className="text-red-500" /> Pathao</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="opacity-70 text-[16px]">📍</span> 
                                                                <span>{order.city_name || order.city || 'Kathmandu'}</span>
                                                                {order.courier_delivery_fee && (
                                                                    <span className="text-[12px] font-[700] text-emerald-600 dark:text-emerald-400 ml-1.5 whitespace-nowrap">
                                                                        (Est: Rs. {order.courier_delivery_fee})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {order.courier_consignment_id && (
                                                                <div className="flex items-center gap-2 mt-0.5 text-[12px] font-[500] text-slate-500 dark:text-slate-400">
                                                                    <Hash size={14} className="text-slate-400" /> {order.courier_consignment_id}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : order.courier_provider === 'pickdrop' ? (
                                                        <>
                                                            <div className="flex items-center gap-2"><Truck size={16} className="text-orange-500" /> Pick & Drop</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="opacity-70 text-[16px]">📍</span> 
                                                                <span>{order.pickdrop_destination_branch || '-'}</span>
                                                                {order.courier_delivery_fee && (
                                                                    <span className="text-[12px] font-[700] text-emerald-600 dark:text-emerald-400 ml-1.5 whitespace-nowrap">
                                                                        (Est: Rs. {order.courier_delivery_fee})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {(order.courier_consignment_id || order.pickdrop_order_id) && (
                                                                <div className="flex items-center gap-2 mt-0.5 text-[12px] font-[500] text-slate-500 dark:text-slate-400">
                                                                    <Hash size={14} className="text-slate-400" /> {order.courier_consignment_id || order.pickdrop_order_id}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : order.courier_provider === 'ncm' ? (
                                                        <>
                                                            <div className="flex items-center gap-2"><Truck size={16} className="text-blue-500" /> NCM</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="opacity-70 text-[16px]">📍</span> 
                                                                <span>{order.ncm_to_branch || order.city_name || '-'}</span>
                                                                {order.courier_delivery_fee && (
                                                                    <span className="text-[12px] font-[700] text-emerald-600 dark:text-emerald-400 ml-1.5 whitespace-nowrap">
                                                                        (Est: Rs. {order.courier_delivery_fee})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {order.courier_consignment_id && (
                                                                <div className="flex items-center gap-2 mt-0.5 text-[12px] font-[500] text-slate-500 dark:text-slate-400">
                                                                    <Hash size={14} className="text-slate-400" /> {order.courier_consignment_id}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : order.courier_provider === 'self' ? (
                                                        <>
                                                            <div className="flex items-center gap-2"><Truck size={16} className="text-emerald-500" /> Self Delivered</div>
                                                        </>
                                                    ) : (
                                                        <div className="text-slate-400 font-normal italic text-[13px]">Unassigned Courier</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Section 4: ACTIONS (17%) */}
                                            <div className="flex flex-col w-full md:w-[17%] shrink-0 pt-3 md:pt-0 items-start md:items-end justify-between min-h-[148px] md:pr-2">
                                                {/* Status Badge & Print Icon Row */}
                                                <div className="flex items-center gap-2 self-start md:self-end">
                                                    <Printer 
                                                        size={16} 
                                                        className={order.invoice_printed ? "text-green-500" : "text-slate-400 dark:text-slate-500"} 
                                                    />
                                                    <div className={`h-[32px] px-[14px] rounded-full text-[13px] font-[700] flex items-center justify-center whitespace-nowrap ${getStatusBadgeStyle(order.order_status)}`}>
                                                        <div className="flex items-center gap-1.5">
                                                            {order.order_status === 'Confirmed Order' && <CheckCircle2 size={14} />}
                                                            {order.order_status === 'Ready to Ship' ? 'Packed' : order.order_status}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex flex-col gap-2 w-full mt-auto pt-4 relative">
                                                    {/* Primary Button */}
                                                    {(order.order_status === 'New Order' || order.order_status === 'Follow up again') && (
                                                        <button
                                                            onClick={() => handleConfirmAction(order)}
                                                            className="h-[38px] bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-[12px] text-[13px] font-[600] transition-colors w-full flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <Check size={16} />
                                                            Confirm Order
                                                        </button>
                                                    )}
                                                    
                                                    {order.order_status === 'Confirmed Order' && order.courier_provider === 'pathao' && !order.courier_consignment_id && (
                                                        <button
                                                            onClick={() => handleShipOrder(order.id)}
                                                            className="h-[38px] bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-[12px] text-[13px] font-[600] transition-colors w-full flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <Truck size={16} />
                                                            Ship Pathao
                                                        </button>
                                                    )}

                                                    {order.order_status === 'Confirmed Order' && order.courier_provider === 'pickdrop' && !order.pickdrop_order_id && (
                                                        <button
                                                            onClick={() => handlePickDropShip(order.id)}
                                                            className="h-[38px] bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-[12px] text-[13px] font-[600] transition-colors w-full flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <Truck size={16} />
                                                            Ship Pick & Drop
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
                                                            className="h-[38px] bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-[12px] text-[13px] font-[600] transition-colors w-full flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <Truck size={16} />
                                                            Ship NCM
                                                        </button>
                                                    )}
                                                    
                                                    {order.order_status === 'Confirmed Order' && order.courier_provider === 'self' && (
                                                        <button
                                                            onClick={() => setAssigningOrder(order)}
                                                            className="h-[38px] bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#92400E] rounded-[12px] text-[13px] font-[700] transition-colors w-full flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <User size={16} />
                                                            Assign Rider
                                                        </button>
                                                    )}

                                                    {/* Sync Status Buttons (Primary when Shipped/Packed) */}
                                                    {['Packed', 'Ready to Ship', 'Shipped', 'Arrived at Branch', 'Delivery Process', 'Delivery Failed', 'Hold', 'Return Process'].includes(order.order_status) && 
                                                     ['ncm', 'pickdrop', 'pathao'].includes(order.courier_provider) && (
                                                        <button
                                                            onClick={() => handleSyncLogisticOrder(order.id, order.courier_provider)}
                                                            disabled={syncingOrderId === order.id}
                                                            className="h-[38px] bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-[12px] text-[13px] font-[600] transition-colors w-full flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                                                        >
                                                            <RefreshCw size={16} className={syncingOrderId === order.id ? 'animate-spin' : ''} />
                                                            Sync Status
                                                        </button>
                                                    )}

                                                    {['Packed', 'Ready to Ship'].includes(order.order_status) && order.courier_provider === 'self' && (
                                                        <button
                                                            onClick={() => handleUnassignRider(order.id, order.assigned_rider?.full_name || 'Rider')}
                                                            className="h-[38px] bg-red-500 hover:bg-red-600 text-white rounded-[12px] text-[13px] font-[600] transition-colors w-full flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            <UserMinus size={16} />
                                                            Unassign Rider
                                                        </button>
                                                    )}

                                                    {/* Secondary "More" Dropdown */}
                                                    <div className="relative w-full">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStatusMenuOrderId(statusMenuOrderId === order.id ? null : order.id);
                                                            }}
                                                            className="h-[38px] w-full border border-[#D0D5DD] dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-[12px] text-[13px] font-[600] transition-colors flex items-center justify-center gap-2 shadow-sm"
                                                        >
                                                            More <ChevronDown size={16} />
                                                        </button>

                                                        {statusMenuOrderId === order.id && (
                                                            <div 
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-[9999] py-1 animate-in fade-in zoom-in duration-200"
                                                            >
                                                                
                                                                <button
                                                                    onClick={() => window.open(`/orders/${order.id}`, '_blank')}
                                                                    className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200 flex items-center gap-2"
                                                                >
                                                                    <FileText size={14} /> View Order
                                                                </button>

                                                                {(order.order_status === 'New Order' || order.order_status === 'Follow up again' || order.order_status === 'Packed') && (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (order.order_status === 'Packed') {
                                                                                onManualStatusChange(order.id, 'Cancelled');
                                                                            } else {
                                                                                handleCancelAction(order.id);
                                                                            }
                                                                        }}
                                                                        className="w-full text-left px-4 py-2.5 text-[14px] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400 flex items-center gap-2 border-t border-gray-100 dark:border-slate-700"
                                                                    >
                                                                        <X size={14} /> Cancel Order
                                                                    </button>
                                                                )}

                                                                {['local', 'self'].includes(order.courier_provider) &&
                                                                    ['Confirmed Order', 'Ready to Ship', 'Packed', 'Shipped'].includes(order.order_status) && 
                                                                    !(order.courier_provider === 'self' && order.order_status === 'Packed') && (
                                                                    <>
                                                                        <div className="px-3 py-1.5 mt-1 text-[11px] font-bold text-slate-400 uppercase border-y border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
                                                                            Change Status
                                                                        </div>
                                                                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                                                            {orderStatuses.map(status => (
                                                                                <button
                                                                                    key={status}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        onManualStatusChange(order.id, status);
                                                                                    }}
                                                                                    className={`w-full text-left px-4 py-2 text-[13px] hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors ${order.order_status === status ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50/50' : 'text-slate-700 dark:text-slate-200'
                                                                                        }`}
                                                                                >
                                                                                    {status}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                                    <Package size={48} className="mb-3 opacity-20 text-slate-400" />
                                    <p className="text-[15px] font-medium text-slate-600">{activeTab === 'orderList' ? "No orders found" : `No ${todaySubTab} orders for today`}</p>
                                    <p className="text-[13px] text-slate-400 mt-1">Try adjusting your filters or search query.</p>
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
                                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 bg-gray-50/30 dark:bg-slate-900/10">
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

            {/* Print Section */}
            {typeof window !== 'undefined' && createPortal(
                <div id="print-section" className={printLayout === '9' ? 'layout-9' : 'layout-6'}>
                    {displayOrders.filter(order => selectedOrders.has(order.id)).map(order => {
                        const logisticId = order.courier_consignment_id || order.pickdrop_order_id || '-';
                        const logisticName = order.courier_provider === 'local' ? (order.logistic_name || 'Local') 
                                          : order.courier_provider === 'pathao' ? 'Pathao'
                                          : order.courier_provider === 'pickdrop' ? 'Pick & Drop'
                                          : order.courier_provider === 'ncm' ? 'Nepal Can Move'
                                          : order.courier_provider === 'self' ? 'Self'
                                          : 'Courier';

                        const branchName = order.courier_provider === 'local' ? (order.delivery_branch || '-')
                                         : order.courier_provider === 'pickdrop' ? (order.pickdrop_destination_branch || '-')
                                         : order.courier_provider === 'ncm' ? (order.ncm_to_branch || '-')
                                         : order.city_name || '-';

                        return (
                            <div key={order.id} className="print-card">
                                <div className="print-header">
                                    <div className="store-name">{storeName}</div>
                                </div>
                                <div className="print-row border-b pb-1 mb-1.5 flex justify-between">
                                    <span className="logistic-name font-bold uppercase">{logisticName}</span>
                                    <span className="logistic-id font-bold">{logisticId}</span>
                                </div>
                                <div className="print-body flex gap-3 overflow-hidden my-1">
                                    {/* Left Column: Customer Details */}
                                    <div className="flex flex-col flex-1 gap-1 min-w-[52%]">
                                        <div className="text-[10px] leading-tight">
                                            <span className="branch-label font-semibold">Branch:</span> {branchName}
                                        </div>
                                        <div className="customer-name font-bold text-[13px] leading-tight">
                                            {order.customer_name}
                                        </div>
                                        <div className="font-bold text-[12px] leading-none">
                                            {order.phone_number}
                                        </div>
                                        <div className="text-[10px] text-gray-700 italic leading-snug break-words">
                                            {order.address}
                                        </div>
                                    </div>
                                    
                                    {/* Right Column: Full Package Description utilizing blank space */}
                                    <div className="flex-1 text-right text-[9.5px] text-gray-700 italic leading-[1.25] overflow-hidden break-words font-semibold flex flex-col justify-start">
                                        {order.package_description || ''}
                                    </div>
                                </div>
                                <div className="print-footer pt-1.5 border-t border-dashed flex justify-between items-center">
                                    <span className="text-[10px] text-gray-400 font-normal uppercase">Total Amt</span>
                                    <span className="grand-total font-normal text-[15px]">Rs. {order.total_amount}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>,
                document.body
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                #print-section {
                    display: none !important;
                }
                @media print {
                    body > *:not(#print-section) {
                        display: none !important;
                    }
                    html, body {
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    #print-section {
                        display: grid !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        padding: 5mm !important;
                        box-sizing: border-box !important;
                        background: white !important;
                    }
                    #print-section.layout-6 {
                        grid-template-columns: 100mm 100mm !important;
                        grid-auto-rows: 95mm !important;
                        gap: 2mm !important;
                    }
                    #print-section.layout-9 {
                        grid-template-columns: 66mm 66mm 66mm !important;
                        grid-auto-rows: 95mm !important;
                        gap: 1mm !important;
                    }
                    .print-card {
                        border: 1px dashed #94a3b8 !important;
                        padding: 10px !important;
                        box-sizing: border-box !important;
                        display: flex !important;
                        flex-direction: column !important;
                        height: 100% !important;
                        overflow: hidden !important;
                        background: white !important;
                        color: black !important;
                        font-family: 'Inter', sans-serif !important;
                        font-size: 11px !important;
                        page-break-inside: avoid !important;
                    }
                    .print-header {
                        text-align: center !important;
                        margin-bottom: 6px !important;
                    }
                    .store-name {
                        font-size: 14px !important;
                        font-weight: 900 !important;
                        text-transform: uppercase !important;
                        border-bottom: 2px solid black !important;
                        padding-bottom: 2px !important;
                        letter-spacing: 0.5px !important;
                    }
                    .logistic-name {
                        font-weight: 800 !important;
                        font-size: 12px !important;
                    }
                    .logistic-id {
                        font-weight: 800 !important;
                        font-size: 12px !important;
                    }
                    .grand-total {
                        font-size: 16px !important;
                        font-weight: normal !important;
                    }
                    @page {
                        size: A4 portrait;
                        margin: 0 !important;
                    }
                }
            `}} />
        </div>
    );
}
