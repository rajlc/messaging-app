import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, Alert, Modal, ScrollView, BackHandler, TextInput, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { Package, Wallet, Phone, CheckCircle2, XCircle, ChevronRight, Truck, X, ChevronLeft, MoreHorizontal, User, FileText } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';
import axios from 'axios';

export default function MyDeliveryScreen({ navigation, route }: any) {
    const insets = useSafeAreaInsets();
    const { token, user } = useAuth();
    const [activeTab, setActiveTab] = useState<'orders' | 'settlement' | 'my-stock' | 'report'>('orders');
    const [reportData, setReportData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [stock, setStock] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);

    const RIDER_CACHE_KEY = `@rider_orders_${user?.id}`;
    const SYNC_QUEUE_KEY = `@sync_queue_${user?.id}`;
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [selectedStockItem, setSelectedStockItem] = useState<any>(null);
    const [saleForm, setSaleForm] = useState({
        customerName: '',
        phoneNumber: '',
        address: '',
        quantity: '1',
        unitPrice: '',
        amount: '' // This will be the Total Amount
    });

    useEffect(() => {
        if (selectedStockItem) {
            const unitPrice = selectedStockItem.amount || 0;
            setSaleForm(prev => ({
                ...prev,
                unitPrice: unitPrice.toString(),
                amount: (unitPrice * parseInt(prev.quantity || '1')).toString()
            }));
        }
    }, [selectedStockItem]);

    // Update total amount when quantity or unit price changes
    useEffect(() => {
        const qty = parseInt(saleForm.quantity) || 0;
        const up = parseFloat(saleForm.unitPrice) || 0;
        setSaleForm(prev => ({
            ...prev,
            amount: (qty * up).toString()
        }));
    }, [saleForm.quantity, saleForm.unitPrice]);

    // Handle initial params or navigation updates
    useEffect(() => {
        if (route.params?.activeTab) {
            setActiveTab(route.params.activeTab);
        }
    }, [route.params]);

    // Handle Hardware Back Button
    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (modalVisible) {
                    setModalVisible(false);
                    return true;
                }
                if (activeTab === 'settlement') {
                    setActiveTab('orders');
                    return true;
                }
                return false; // Let default back behavior happen (go back to previous screen)
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [activeTab, modalVisible])
    );

    useEffect(() => {
        if (activeTab === 'orders') {
            fetchOrders();
        } else if (activeTab === 'settlement') {
            fetchSummary();
            fetchStock();
        } else if (activeTab === 'report') {
            fetchReportData();
        }
    }, [activeTab]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/orders/rider/assigned`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Filter active orders
            const todayOrders = (res.data || []).filter((o: any) => {
                return ['Assigned', 'Packed', 'Shipped', 'Out for Delivery', 'Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status) || 
                       (o.order_status === 'Delivered' && new Date(o.updated_at).toDateString() === new Date().toDateString());
            });
            const statusPriority: { [key: string]: number } = {
                'Packed': 1,
                'Shipped': 2,
                'Delivered': 3,
                'Delivery Failed': 4,
                'Return Process': 5,
                'Returned Delivered': 6
            };

            const sortedOrders = todayOrders.sort((a: any, b: any) => {
                const pA = statusPriority[a.order_status] || 99;
                const pB = statusPriority[b.order_status] || 99;
                return pA - pB;
            });

            setOrders(sortedOrders);
            await AsyncStorage.setItem(RIDER_CACHE_KEY, JSON.stringify(sortedOrders));
            
            // Try to sync pending updates if online
            processSyncQueue();
        } catch (error) {
            console.log('Fetch orders failed, loading cache');
            const cached = await AsyncStorage.getItem(RIDER_CACHE_KEY);
            if (cached) setOrders(JSON.parse(cached));
        } finally {
            setLoading(false);
        }
    };

    const processSyncQueue = async () => {
        if (isSyncing) return;
        try {
            const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
            const queue = queueStr ? JSON.parse(queueStr) : [];
            if (queue.length === 0) return;

            setIsSyncing(true);
            console.log(`Processing sync queue: ${queue.length} items`);

            const remainingQueue = [];
            for (const item of queue) {
                try {
                    if (item.type === 'status_update') {
                        await axios.post(`${API_URL}/api/orders/${item.orderId}/delivery-status`,
                            { status: item.status },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                    } else if (item.type === 'cancel') {
                        await axios.post(`${API_URL}/api/orders/${item.orderId}/cancel-assignment`, {}, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                    }
                } catch (e) {
                    remainingQueue.push(item);
                }
            }

            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
            if (remainingQueue.length === 0) {
                fetchOrders();
            }
        } catch (error) {
            console.error('Sync queue processing error:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/settlements/my-summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data);
        } catch (error) {
            console.error('Failed to fetch summary', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 30);

            const res = await axios.get(`${API_URL}/api/settlements/my-delivery-report`, {
                params: {
                    startDate: start.toISOString().split('T')[0],
                    endDate: end.toISOString().split('T')[0]
                },
                headers: { Authorization: `Bearer ${token}` }
            });
            setReportData(res.data || []);
        } catch (error) {
            console.error('Failed to fetch report data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStock = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/api/rider-inventory/my-stock`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStock(res.data || []);
        } catch (error) {
            console.error('Fetch stock failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phoneNumber: string) => {
        if (!phoneNumber) return;
        Linking.openURL(`tel:${phoneNumber}`);
    };

    const updateStatus = async (orderId: string, status: string) => {
        try {
            await axios.post(`${API_URL}/api/orders/${orderId}/delivery-status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchOrders();
            if (selectedOrder && selectedOrder.id === orderId) {
                setModalVisible(false);
            }
        } catch (error) {
            console.log('Update status failed, queueing for offline sync');
            
            // 1. Update UI locally
            const updatedOrders = orders.map(o => o.id === orderId ? { ...o, order_status: status } : o);
            setOrders(updatedOrders);
            await AsyncStorage.setItem(RIDER_CACHE_KEY, JSON.stringify(updatedOrders));

            // 2. Add to sync queue
            const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
            const queue = queueStr ? JSON.parse(queueStr) : [];
            queue.push({ type: 'status_update', orderId, status, timestamp: new Date().toISOString() });
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

            setModalVisible(false);
            Alert.alert('Offline', 'Update saved locally and will sync when online.');
        }
    };

    const handleCancel = async (orderId: string) => {
        Alert.alert('Return Order', 'Are you sure you want to mark this order for return process?', [
            { text: 'No' },
            {
                text: 'Yes', onPress: async () => {
                    try {
                        await axios.post(`${API_URL}/api/orders/${orderId}/cancel-assignment`, {}, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchOrders();
                        if (selectedOrder && selectedOrder.id === orderId) {
                            setModalVisible(false);
                        }
                    } catch (error) {
                        console.log('Cancel failed, queueing for offline sync');
                        
                        // 1. Update UI locally
                        const updatedOrders = orders.filter(o => o.id !== orderId);
                        setOrders(updatedOrders);
                        await AsyncStorage.setItem(RIDER_CACHE_KEY, JSON.stringify(updatedOrders));

                        // 2. Add to sync queue
                        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
                        const queue = queueStr ? JSON.parse(queueStr) : [];
                        queue.push({ type: 'cancel', orderId, timestamp: new Date().toISOString() });
                        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

                        setModalVisible(false);
                        Alert.alert('Offline', 'Cancellation saved locally and will sync when online.');
                    }
                }
            }
        ]);
    };

    const handleQuickSale = async () => {
        if (!selectedStockItem || !saleForm.quantity || !saleForm.amount) {
            Alert.alert('Error', 'Quantity and Amount are required');
            return;
        }

        try {
            await axios.post(`${API_URL}/api/rider-inventory/quick-sale`, {
                rider_inventory_id: selectedStockItem.id,
                ...saleForm
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSaleModalOpen(false);
            setSaleForm({ customerName: '', phoneNumber: '', address: '', quantity: '1', unitPrice: '', amount: '' });
            fetchStock();
            fetchOrders(); // Refresh today's orders list
            Alert.alert('Success', 'Quick sale recorded successfully!');
        } catch (error) {
            console.error('Quick sale failed', error);
            Alert.alert('Error', 'Failed to record quick sale');
        }
    };

    const handleReturnStock = async (stockId: string) => {
        Alert.alert('Return Stock', 'Are you sure you want to return this stock to warehouse?', [
            { text: 'No' },
            {
                text: 'Yes', onPress: async () => {
                    try {
                        await axios.put(`${API_URL}/api/rider-inventory/${stockId}/status`, 
                            { status: 'return_pending' },
                            { headers: { Authorization: `Bearer ${token}` } }
                        );
                        fetchStock();
                        Alert.alert('Success', 'Stock marked as pending return approval');
                    } catch (error) {
                        console.error('Return stock failed', error);
                        Alert.alert('Error', 'Failed to return stock');
                    }
                }
            }
        ]);
    };

    const openOrderDetails = (order: any) => {
        setSelectedOrder(order);
        setModalVisible(true);
    };

    const renderOrderCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => openOrderDetails(item)}
        >
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.orderNumber}>#{item.order_number}</Text>
                    <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amount}>Rs. {item.total_amount}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.order_status) + '20', marginTop: 4 }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.order_status) }]}>{item.order_status}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardBody}>
                <Text style={styles.customerName}>{item.customer_name}</Text>
                <Text style={styles.address}>{item.address}</Text>

                <View style={styles.phoneRow}>
                    <Text style={styles.phone}>{item.phone_number}</Text>
                    <TouchableOpacity onPress={() => handleCall(item.phone_number)} style={styles.callButton}>
                        <Phone size={14} color={Colors.white} />
                        <Text style={styles.callButtonText}>Call</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {(item.order_status === 'Packed' || item.order_status === 'Shipped') && (
                <View style={styles.cardActionsRow}>
                    {item.order_status === 'Packed' ? (
                        <>
                            <TouchableOpacity onPress={() => updateStatus(item.id, 'Shipped')} style={[styles.fullActionButton, { backgroundColor: Colors.secondary }]}>
                                <Text style={styles.actionButtonText}>Complete</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleCancel(item.id)} style={[styles.fullActionButton, { backgroundColor: Colors.danger }]}>
                                <Text style={styles.actionButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => updateStatus(item.id, 'Delivered')} style={[styles.fullActionButton, { backgroundColor: Colors.primary }]}>
                                <Text style={styles.actionButtonText}>Delivered</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => updateStatus(item.id, 'Return Process')} style={[styles.fullActionButton, { backgroundColor: Colors.danger }]}>
                                <Text style={styles.actionButtonText}>Failed</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered': return '#10b981'; // Emerald/Green
            case 'Packed': return '#f59e0b'; // Amber/Orange
            case 'Shipped': return '#3b82f6'; // Blue
            case 'Delivery Failed': return '#ef4444'; // Red
            case 'Returned Delivered': return '#8b5cf6'; // Violet/Purple
            case 'Return Process': return '#f97316'; // Orange-500
            case 'Confirmed Order': return '#6366f1'; // Indigo
            default: return Colors.textSecondary;
        }
    };

    const renderStockItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.customerName}>{item.product_name}</Text>
                    <Text style={styles.orderDate}>Assigned: {new Date(item.assigned_at).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amount, { color: Colors.primary }]}>Qty: {item.quantity}</Text>
                    <Text style={{ fontSize: 12, color: Colors.textSecondary, fontWeight: 'bold' }}>Rs. {item.amount || 0} / unit</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity 
                    style={[styles.fullActionButton, { backgroundColor: Colors.primary, flex: 1 }]}
                    onPress={() => {
                        setSelectedStockItem(item);
                        setIsSaleModalOpen(true);
                    }}
                >
                    <Text style={styles.actionButtonText}>Quick Sale</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.fullActionButton, { backgroundColor: Colors.danger, flex: 1 }]}
                    onPress={() => handleReturnStock(item.id)}
                >
                    <Text style={styles.actionButtonText}>Back to Warehouse</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const isRider = user?.role?.trim().toLowerCase() === 'rider';

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                {navigation.canGoBack() && !isRider ? (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerLeft}>
                        <ChevronLeft size={28} color={Colors.text} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerLeft} />
                )}
                <Text style={styles.headerTitle}>
                    {activeTab === 'orders' ? 'Today Order' : activeTab === 'settlement' ? 'Settlement' : activeTab === 'report' ? 'My Report' : 'My Stock'}
                </Text>
                <View style={styles.headerRight} />
            </View>


            {loading && <ActivityIndicator style={styles.loader} color={Colors.primary} />}

            <View style={styles.content}>
                {activeTab === 'orders' ? (
                    <FlatList
                        data={orders}
                        renderItem={renderOrderCard}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={<Text style={styles.emptyText}>No orders for today.</Text>}
                        onRefresh={fetchOrders}
                        refreshing={loading}
                    />
                ) : activeTab === 'report' ? (
                    <ScrollView 
                        style={styles.settlementContainer}
                        refreshControl={
                            <RefreshControl refreshing={loading} onRefresh={fetchReportData} colors={[Colors.primary]} />
                        }
                    >
                        <View style={styles.reportCard}>
                            <View style={styles.reportHeader}>
                                <FileText size={20} color={Colors.primary} />
                                <Text style={styles.reportTitle}>Last 30 Days Summary</Text>
                            </View>
                            
                            <View style={styles.reportStatsRow}>
                                <View style={styles.reportStatItem}>
                                    <Text style={styles.reportStatLabel}>Total Parcels</Text>
                                    <Text style={styles.reportStatValue}>
                                        {reportData.reduce((sum, r) => sum + r.parcel_qty, 0)}
                                    </Text>
                                </View>
                                <View style={styles.reportStatDivider} />
                                <View style={styles.reportStatItem}>
                                    <Text style={styles.reportStatLabel}>Total Amount</Text>
                                    <Text style={[styles.reportStatValue, { color: '#10b981' }]}>
                                        Rs. {reportData.reduce((sum, r) => sum + (r.delivery_amount || 0), 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Date</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                                <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Amount</Text>
                            </View>
                            {reportData.map((row, idx) => (
                                <View key={idx} style={styles.tableRow}>
                                    <Text style={[styles.tableCellText, { flex: 2 }]}>
                                        {new Date(row.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })}
                                    </Text>
                                    <Text style={[styles.tableCellText, { flex: 1, textAlign: 'center', fontWeight: 'bold' }]}>
                                        {row.parcel_qty}
                                    </Text>
                                    <Text style={[styles.tableCellText, { flex: 1.5, textAlign: 'right', fontWeight: 'bold', color: Colors.primary }]}>
                                        Rs. {row.delivery_amount?.toLocaleString()}
                                    </Text>
                                </View>
                            ))}
                            {reportData.length === 0 && (
                                <View style={styles.emptyTable}>
                                    <Text style={styles.emptyTableText}>No delivery records found.</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>
                ) : activeTab === 'settlement' ? (
                    <ScrollView 
                        style={styles.settlementContainer} 
                        contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={loading} onRefresh={() => { fetchSummary(); fetchStock(); fetchOrders(); }} colors={[Colors.primary]} />
                        }
                    >
                        {summary ? (
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Total Amount</Text>
                                    <Text style={styles.summaryValue}>Rs. {summary.pending_amount}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Returned</Text>
                                    <Text style={[styles.summaryValue, { color: Colors.danger }]}>Rs. {summary.returned_amount}</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <Text style={styles.summaryLabel}>Settled</Text>
                                    <Text style={[styles.summaryValue, { color: Colors.primary }]}>Rs. {summary.settled_amount}</Text>
                                </View>
                                <View style={[styles.summaryRow, styles.netRow]}>
                                    <Text style={styles.netLabel}>Net Pending</Text>
                                    <Text style={styles.netValue}>Rs. {summary.net_pending_settlement}</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No settlement data.</Text>
                            </View>
                        )}

                        <View style={styles.pendingReturnsContainer}>
                            <Text style={styles.sectionTitle}>Pending Return Orders</Text>
                            {orders.filter(o => ['Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status)).length > 0 ? (
                                orders.filter(o => ['Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status)).map(order => (
                                    <View key={order.id} style={styles.returnItem}>
                                        <View>
                                            <Text style={styles.returnOrderNum}>#{order.order_number}</Text>
                                            <Text style={styles.returnCustomer}>{order.customer_name}</Text>
                                        </View>
                                        <View style={styles.returnStatusBadge}>
                                            <Text style={styles.returnStatusText}>Pending Warehouse</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyReturnsText}>No pending returns.</Text>
                            )}
                        </View>

                        <View style={styles.stockSection}>
                            <Text style={styles.sectionTitle}>My Stock</Text>
                            {stock.length > 0 ? (
                                stock.map(item => (
                                    <View key={item.id} style={styles.stockItemCard}>
                                        <View style={styles.stockItemHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.stockProductName}>{item.product_name}</Text>
                                                <Text style={styles.stockDate}>Assigned: {new Date(item.assigned_at).toLocaleDateString()}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={styles.stockQty}>Qty: {item.quantity}</Text>
                                                <Text style={styles.stockPrice}>Rs. {item.amount || 0} / unit</Text>
                                            </View>
                                        </View>
                                        {item.status === 'return_pending' ? (
                                            <View style={[styles.stockActions, { justifyContent: 'center', backgroundColor: Colors.warning + '20', padding: 10, borderRadius: Radius.m }]}>
                                                <Text style={{ color: Colors.warning, fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' }}>Pending Approval</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.stockActions}>
                                                <TouchableOpacity 
                                                    style={[styles.stockActionBtn, { backgroundColor: Colors.primary }]}
                                                    onPress={() => {
                                                        setSelectedStockItem(item);
                                                        setIsSaleModalOpen(true);
                                                    }}
                                                >
                                                    <Text style={styles.stockActionText}>Quick Sale</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={[styles.stockActionBtn, { backgroundColor: Colors.danger }]}
                                                    onPress={() => handleReturnStock(item.id)}
                                                >
                                                    <Text style={styles.stockActionText}>Back to Warehouse</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyReturnsText}>No stock assigned.</Text>
                            )}
                        </View>
                    </ScrollView>
                ) : null}
            </View>

            {/* Order Details Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Order Details</Text>
                                {isSyncing ? (
                                    <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                                ) : (
                                    <TouchableOpacity onPress={processSyncQueue} style={styles.syncBtn}>
                                        <Text style={styles.syncBtnText}>Sync Pending Updates</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        {selectedOrder && (
                            <ScrollView style={styles.modalBody}>
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Order Number</Text>
                                    <Text style={styles.detailValue}>#{selectedOrder.order_number}</Text>
                                </View>
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Customer</Text>
                                    <View style={styles.modalPhoneRow}>
                                        <View>
                                            <Text style={styles.detailValue}>{selectedOrder.customer_name}</Text>
                                            <Text style={styles.detailValue}>{selectedOrder.phone_number}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleCall(selectedOrder.phone_number)} style={styles.modalCallButton}>
                                            <Phone size={18} color={Colors.white} />
                                            <Text style={styles.callButtonText}>Call Now</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.detailSection}>
                                    <Text style={styles.detailLabel}>Address</Text>
                                    <Text style={[styles.detailValue, { fontWeight: 'bold' }]}>{selectedOrder.address}</Text>
                                </View>

                                <View style={styles.itemsSection}>
                                    <Text style={styles.itemsTitle}>Products</Text>
                                    {(selectedOrder.items || []).map((item: any, idx: number) => (
                                        <View key={idx} style={styles.itemRow}>
                                            <Text style={styles.itemName}>{item.product_name}</Text>
                                            <Text style={styles.itemQty}>x {item.qty}</Text>
                                            <Text style={styles.itemPrice}>Rs. {item.amount * item.qty}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Sub Total</Text>
                                    <Text style={styles.totalValue}>Rs. {selectedOrder.total_amount - (selectedOrder.delivery_charge || 0)}</Text>
                                </View>

                                {selectedOrder.delivery_charge > 0 && (
                                    <View style={styles.deliveryChargeRow}>
                                        <Text style={styles.deliveryChargeLabel}>Delivery Charge</Text>
                                        <Text style={styles.deliveryChargeValue}>Rs. {selectedOrder.delivery_charge}</Text>
                                    </View>
                                )}

                                <View style={[styles.totalRow, { borderTopWidth: 2, marginTop: 10 }]}>
                                    <Text style={[styles.totalLabel, { fontSize: 22 }]}>Total Amount</Text>
                                    <Text style={[styles.totalValue, { fontSize: 24 }]}>Rs. {selectedOrder.total_amount}</Text>
                                </View>

                                {selectedOrder.package_description && (
                                    <View style={styles.detailSection}>
                                        <Text style={styles.detailLabel}>Package Description</Text>
                                        <Text style={styles.detailValue}>{selectedOrder.package_description}</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Quick Sale Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isSaleModalOpen}
                onRequestClose={() => setIsSaleModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Quick Sale</Text>
                            <TouchableOpacity onPress={() => setIsSaleModalOpen(false)}>
                                <XCircle size={28} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView 
                            style={styles.modalBody}
                            contentContainerStyle={{ paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.saleProductLabel}>Product: {selectedStockItem?.product_name}</Text>
                            
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={[styles.inputContainer, { flex: 1.5 }]}>
                                    <Text style={styles.inputLabel}>Customer Name</Text>
                                    <View style={styles.inputWrapper}>
                                        <User size={18} color={Colors.textSecondary} />
                                        <TextInput 
                                            style={styles.input}
                                            placeholder="Name"
                                            placeholderTextColor="#999"
                                            value={saleForm.customerName}
                                            onChangeText={(text: string) => setSaleForm({...saleForm, customerName: text})}
                                        />
                                    </View>
                                </View>

                                <View style={[styles.inputContainer, { flex: 1.2 }]}>
                                    <Text style={styles.inputLabel}>Phone Number</Text>
                                    <View style={styles.inputWrapper}>
                                        <Phone size={18} color={Colors.textSecondary} />
                                        <TextInput 
                                            style={styles.input}
                                            placeholder="Phone"
                                            placeholderTextColor="#999"
                                            keyboardType="phone-pad"
                                            value={saleForm.phoneNumber}
                                            onChangeText={(text: string) => setSaleForm({...saleForm, phoneNumber: text})}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Address</Text>
                                <View style={styles.inputWrapper}>
                                    <Package size={20} color={Colors.textSecondary} />
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="Enter address (Optional)"
                                        placeholderTextColor="#999"
                                        value={saleForm.address}
                                        onChangeText={(text: string) => setSaleForm({...saleForm, address: text})}
                                    />
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={[styles.inputContainer, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>Quantity *</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput 
                                            style={styles.input}
                                            placeholder="Qty"
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            value={saleForm.quantity}
                                            onChangeText={(text: string) => setSaleForm({...saleForm, quantity: text})}
                                        />
                                    </View>
                                </View>

                                <View style={[styles.inputContainer, { flex: 1.5 }]}>
                                    <Text style={styles.inputLabel}>Unit Price *</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput 
                                            style={styles.input}
                                            placeholder="Price"
                                            placeholderTextColor="#999"
                                            keyboardType="numeric"
                                            value={saleForm.unitPrice}
                                            onChangeText={(text: string) => setSaleForm({...saleForm, unitPrice: text})}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.inputContainer, { marginTop: 5 }]}>
                                <Text style={[styles.inputLabel, { color: Colors.primary }]}>Total Amount Collected (Rs) *</Text>
                                <View style={[styles.inputWrapper, { borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '05' }]}>
                                    <TextInput 
                                        style={[styles.input, { fontWeight: 'bold', fontSize: 18, color: Colors.primary }]}
                                        placeholder="Total collected amount"
                                        placeholderTextColor="#999"
                                        keyboardType="numeric"
                                        value={saleForm.amount}
                                        editable={false}
                                    />
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={styles.confirmSaleButton}
                                onPress={handleQuickSale}
                            >
                                <Text style={styles.confirmSaleText}>Confirm Sale & Deliver</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.m,
        paddingBottom: 15,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border
    },
    headerLeft: { width: 40 },
    headerRight: { width: 40 },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: Colors.text, textAlign: 'center' },
    content: { flex: 1 },
    loader: { marginTop: Spacing.l },
    list: { padding: Spacing.m },
    card: { backgroundColor: Colors.white, borderRadius: Radius.m, padding: 12, marginBottom: Spacing.m, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    orderNumber: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
    orderDate: { fontSize: 12, color: Colors.textSecondary },
    statusBadge: { paddingHorizontal: Spacing.s, paddingVertical: 2, borderRadius: Radius.full },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    cardBody: { marginBottom: 10 },
    customerName: { fontSize: 16, fontWeight: 'normal', color: Colors.text, marginBottom: 2 },
    address: { fontSize: 14, color: Colors.text, fontWeight: 'bold', marginBottom: 8 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    phone: { fontSize: 14, fontWeight: '600', color: Colors.secondary },
    callButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.s, gap: 4 },
    callButtonText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
    syncBtn: { alignSelf: 'flex-start', marginTop: 4, backgroundColor: Colors.primary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    syncBtnText: { fontSize: 11, color: Colors.primary, fontWeight: 'bold' },
    amount: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    cardActionsRow: { flexDirection: 'row', gap: Spacing.s, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 5 },
    fullActionButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: Radius.s },
    actionButtonText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },
    emptyText: {
        textAlign: 'center',
        marginTop: Spacing.xl,
        color: Colors.textSecondary,
        fontSize: 16,
    },
    // Report Styles
    reportCard: {
        backgroundColor: Colors.white,
        margin: Spacing.m,
        padding: Spacing.m,
        borderRadius: Radius.m,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: Spacing.m,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    reportStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reportStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    reportStatLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    reportStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    reportStatDivider: {
        width: 1,
        height: 30,
        backgroundColor: Colors.border,
    },
    tableContainer: {
        backgroundColor: Colors.white,
        marginHorizontal: Spacing.m,
        marginBottom: Spacing.xl,
        borderRadius: Radius.m,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        padding: Spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        padding: Spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    tableCellText: {
        fontSize: 13,
        color: Colors.text,
    },
    emptyTable: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyTableText: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    // Top Tabs
    topTabs: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
    topTab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTopTab: { borderBottomColor: Colors.primary },
    topTabText: { fontSize: 13, color: Colors.textSecondary, fontWeight: 'bold' },

    // Footer
    footerTabs: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 12
    },
    footerTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
    activeFooterTab: {},
    footerTabText: { fontSize: 11, color: Colors.textSecondary, fontWeight: '500' },
    activeFooterTabText: { color: Colors.primary, fontWeight: 'bold' },
    settlementContainer: { padding: Spacing.m },
    summaryCard: { backgroundColor: Colors.white, borderRadius: Radius.m, padding: Spacing.m },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.m },
    summaryLabel: { fontSize: 14, color: Colors.textSecondary },
    summaryValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
    netRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.m, marginTop: Spacing.s },
    netLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
    netValue: { fontSize: 20, fontWeight: '900', color: Colors.primary },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.l, borderTopRightRadius: Radius.l, padding: Spacing.m, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.m, marginBottom: Spacing.m },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
    modalBody: { marginBottom: Spacing.xl },
    detailSection: { marginBottom: Spacing.m },
    detailLabel: { fontSize: 12, color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 2 },
    detailValue: { fontSize: 16, color: Colors.text },
    itemsSection: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.m, marginBottom: Spacing.m },
    itemsTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.s },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.s },
    itemName: { flex: 2, fontSize: 14, color: Colors.text },
    itemQty: { flex: 0.5, fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
    itemPrice: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: 'bold', textAlign: 'right' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: Colors.border, paddingTop: Spacing.m, marginTop: Spacing.s },
    totalLabel: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    totalValue: { fontSize: 20, fontWeight: 'bold', color: Colors.primary },

    // Quick Sale Modal
    saleProductLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.primary, marginBottom: 15 },
    inputContainer: { marginBottom: 15 },
    inputLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderBottomColor: '#ddd' },
    input: { flex: 1, height: 45, fontSize: 14, color: Colors.text, paddingLeft: 10 },
    confirmSaleButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
    confirmSaleText: { color: Colors.white, fontSize: 16, fontWeight: 'bold' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 20, minHeight: 150 },

    deliveryChargeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    deliveryChargeLabel: { fontSize: 16, color: Colors.textSecondary },
    deliveryChargeValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text },

    modalPhoneRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalCallButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, paddingHorizontal: 15, paddingVertical: 10, borderRadius: Radius.m, gap: 8 },

    // Pending Returns Styles
    pendingReturnsContainer: { marginTop: Spacing.l, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.m },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: Spacing.m },
    returnItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: Spacing.m, borderRadius: Radius.m, marginBottom: Spacing.s, borderLeftWidth: 4, borderLeftColor: Colors.warning },
    returnOrderNum: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
    returnCustomer: { fontSize: 12, color: Colors.textSecondary },
    returnStatusBadge: { backgroundColor: Colors.warning + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    returnStatusText: { fontSize: 10, color: Colors.warning, fontWeight: 'bold', textTransform: 'uppercase' },
    emptyReturnsText: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: Spacing.s },
    
    stockSection: {
        marginTop: 20,
        marginBottom: 30,
    },
    stockItemCard: {
        backgroundColor: Colors.white,
        borderRadius: 15,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
    },
    stockItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    stockProductName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    stockDate: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    stockQty: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    stockPrice: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    stockActions: {
        flexDirection: 'row',
        gap: 10,
    },
    stockActionBtn: {
        flex: 1,
        height: 38,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stockActionText: {
        color: Colors.white,
        fontSize: 12,
        fontWeight: 'bold',
    }
});
