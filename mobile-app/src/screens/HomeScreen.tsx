import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Alert,
    RefreshControl,
    Dimensions,
    Image,
    StatusBar,
    FlatList,
    Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
    ShoppingBag,
    MessageCircle,
    TrendingUp,
    Plus,
    DollarSign,
    Megaphone,
    FileText,
    ChevronRight,
    Bell,
    ArrowUpRight,
    Package,
    Truck,
    Phone,
    CheckCircle2,
    XCircle,
    X
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { API_URL } from '../api/config';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../api/supabase';
import axios from 'axios';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { user, token } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
        todaySales: 0,
        shippedTodayCount: 0,
        confirmedOrders: 0,
        todayMessages: 0,
        adSpend: 0
    });
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
    const [riderOrders, setRiderOrders] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    const RIDER_CACHE_KEY = `@rider_orders_${user?.id}`;
    const SYNC_QUEUE_KEY = `@sync_queue_${user?.id}`;

    const fetchData = async () => {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayStr = todayStart.toISOString().split('T')[0];
            
            // 1. Fetch Orders (Backend doesn't support date filter, so we filter locally)
            let allOrders = [];
            try {
                const ordersRes = await axios.get(`${API_URL}/api/orders`, { headers });
                allOrders = ordersRes.data.data || [];
            } catch (e) {
                console.log('Offline: Loading orders from cache');
                const cached = await AsyncStorage.getItem('@all_orders_cache');
                if (cached) allOrders = JSON.parse(cached);
            }
            
            // Filter orders created today for sales/confirmed
            const todayOrders = allOrders.filter((o: any) => o.created_at?.startsWith(todayStr));
            
            // Filter orders SHIPPED today (using shipped_at field if available)
            const shippedToday = allOrders.filter((o: any) => 
                o.order_status === 'Shipped' && o.shipped_at?.startsWith(todayStr)
            );

            // Save to cache for next offline use
            await AsyncStorage.setItem('@all_orders_cache', JSON.stringify(allOrders));

            // 2. Fetch Ad Spend for today
            let totalAdSpend = 0;
            try {
                const spendRes = await axios.get(`${API_URL}/api/ads-management/spends?date=${todayStr}`, { headers });
                const todaySpends = spendRes.data.data || [];
                totalAdSpend = todaySpends.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
            } catch (e) {}

            // 3. Fetch Active Campaigns
            let activeCamps = [];
            try {
                const campaignsRes = await axios.get(`${API_URL}/api/ads-management/campaigns`, { headers });
                activeCamps = (campaignsRes.data.data || []).filter((c: any) => c.status === 'On').slice(0, 3);
            } catch (e) {}

            // 4. Fetch Message Count for Today from Supabase
            let msgCount = 0;
            try {
                const { count } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', todayStart.toISOString());
                msgCount = count || 0;
            } catch (e) {}

            // 5. Fetch Recent Chats
            let convs = [];
            try {
                const { data } = await supabase
                    .from('conversations')
                    .select('*')
                    .order('last_message_at', { ascending: false })
                    .limit(3);
                convs = data || [];
            } catch (e) {}

            // 6. Fetch Rider Assigned Orders
            try {
                const riderRes = await axios.get(`${API_URL}/api/orders/rider/assigned`, { headers });
                const assigned = (riderRes.data || []).filter((o: any) => {
                    return ['Assigned', 'Packed', 'Shipped', 'Out for Delivery', 'Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status);
                });
                setRiderOrders(assigned);
                await AsyncStorage.setItem(RIDER_CACHE_KEY, JSON.stringify(assigned));
            } catch (e) {
                console.log('Error fetching rider orders, loading cache:', e);
                const cached = await AsyncStorage.getItem(RIDER_CACHE_KEY);
                if (cached) setRiderOrders(JSON.parse(cached));
            }

            setStats({
                todaySales: todayOrders.reduce((sum: number, o: any) => sum + Number(o.sales_price || 0), 0),
                shippedTodayCount: shippedToday.length,
                confirmedOrders: todayOrders.filter((o: any) => o.order_status === 'Confirmed Order').length,
                todayMessages: msgCount,
                adSpend: totalAdSpend
            });
            setRecentChats(convs);
            setActiveCampaigns(activeCamps);

            // 7. Try to sync pending updates if online
            processSyncQueue();

        } catch (error) {
            console.error('Home Screen fetch error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
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
                    console.log(`Sync failed for item ${item.orderId}, keeping in queue`);
                    remainingQueue.push(item);
                }
            }

            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
            if (remainingQueue.length === 0) {
                console.log('Sync complete!');
                fetchData(); // Refresh UI after successful sync
            }
        } catch (error) {
            console.error('Sync queue processing error:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const updateStatus = async (orderId: string, status: string) => {
        try {
            await axios.post(`${API_URL}/api/orders/${orderId}/delivery-status`,
                { status },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDeliveryModalVisible(false);
            fetchData();
        } catch (error) {
            console.log('Update status failed, queueing for offline sync');
            
            // 1. Update UI locally
            const updatedOrders = riderOrders.map(o => o.id === orderId ? { ...o, order_status: status } : o);
            setRiderOrders(updatedOrders);
            await AsyncStorage.setItem(RIDER_CACHE_KEY, JSON.stringify(updatedOrders));

            // 2. Add to sync queue
            const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
            const queue = queueStr ? JSON.parse(queueStr) : [];
            queue.push({ type: 'status_update', orderId, status, timestamp: new Date().toISOString() });
            await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

            setDeliveryModalVisible(false);
            Alert.alert('Offline', 'Update saved locally and will sync when online.');
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        Alert.alert('Return Order', 'Are you sure you want to mark this order for return process?', [
            { text: 'No' },
            {
                text: 'Yes', onPress: async () => {
                    try {
                        await axios.post(`${API_URL}/api/orders/${orderId}/cancel-assignment`, {}, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setDeliveryModalVisible(false);
                        fetchData();
                    } catch (error) {
                        console.log('Cancel failed, queueing for offline sync');
                        
                        // 1. Update UI locally (Remove from list as it's being returned)
                        const updatedOrders = riderOrders.filter(o => o.id !== orderId);
                        setRiderOrders(updatedOrders);
                        await AsyncStorage.setItem(RIDER_CACHE_KEY, JSON.stringify(updatedOrders));

                        // 2. Add to sync queue
                        const queueStr = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
                        const queue = queueStr ? JSON.parse(queueStr) : [];
                        queue.push({ type: 'cancel', orderId, timestamp: new Date().toISOString() });
                        await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));

                        setDeliveryModalVisible(false);
                        Alert.alert('Offline', 'Cancellation saved locally and will sync when online.');
                    }
                }
            }
        ]);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered': return '#10b981';
            case 'Packed': return '#f59e0b';
            case 'Shipped': return '#3b82f6';
            case 'Delivery Failed': return '#ef4444';
            case 'Return Process': return '#f97316';
            case 'Confirmed Order': return '#6366f1';
            default: return Colors.textSecondary;
        }
    };

    const renderStatCard = (title: string, value: string | number, icon: any, color: string, bgColor: string, onPress?: () => void) => (
        <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: Colors.white }]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
                {icon}
            </View>
            <View>
                <Text style={styles.statLabel}>{title}</Text>
                <Text style={[styles.statValue, { color: Colors.text }]}>{value}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderQuickAction = (title: string, icon: any, color: string, onPress: () => void) => (
        <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
                {icon}
            </View>
            <Text style={styles.actionText}>{title}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greetingText}>Welcome back,</Text>
                    <Text style={styles.userNameText}>{user?.full_name?.split(' ')[0] || 'User'}</Text>
                </View>
                <TouchableOpacity style={styles.notificationButton}>
                    <Bell size={24} color={Colors.text} />
                    <View style={styles.notificationBadge} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Stats Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Overview</Text>
                        <Text style={styles.dateText}>{new Date().toDateString()}</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
                        {renderStatCard('Today Messages', stats.todayMessages, <MessageCircle size={20} color="#9C27B0" />, "#9C27B0", "#F3E5F5", () => navigation.navigate('Messages'))}
                        {renderStatCard('Shipped Order', stats.shippedTodayCount, <Truck size={20} color="#4CAF50" />, "#4CAF50", "#E8F5E9", () => navigation.navigate('Orders'))}
                        {renderStatCard('Confirmed', stats.confirmedOrders, <Package size={20} color="#2196F3" />, "#2196F3", "#E3F2FD")}
                        {renderStatCard('Today Sales', `Rs. ${stats.todaySales.toLocaleString()}`, <DollarSign size={20} color="#4CAF50" />, "#4CAF50", "#E8F5E9")}
                        {renderStatCard('Ad Spend', `Rs. ${stats.adSpend.toLocaleString()}`, <Megaphone size={20} color="#FF9800" />, "#FF9800", "#FFF3E0")}
                    </ScrollView>
                </View>

                {/* My Deliveries (Rider Specific) */}
                {riderOrders.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>My Deliveries ({riderOrders.length})</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('RiderTabs')}>
                                <Text style={styles.seeAllText}>Manage All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.riderOrdersScroll}>
                            {riderOrders.map((order) => (
                                <TouchableOpacity 
                                    key={order.id} 
                                    style={styles.riderOrderCard}
                                    onPress={() => {
                                        setSelectedOrder(order);
                                        setDeliveryModalVisible(true);
                                    }}
                                >
                                    <View style={styles.riderOrderHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.riderOrderNum}>#{order.order_number}</Text>
                                            <Text style={styles.riderCustomerName} numberOfLines={1}>{order.customer_name}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(order.order_status) + '15' }]}>
                                                <Text style={[styles.miniStatusText, { color: getStatusColor(order.order_status) }]}>{order.order_status}</Text>
                                            </View>
                                            <Text style={styles.viewText}>View</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.riderAddress} numberOfLines={1}>{order.address}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {renderQuickAction('Create Order', <Plus size={24} color={Colors.secondary} />, Colors.secondary, () => navigation.navigate('CreateOrder'))}
                        {renderQuickAction('Add Spend', <DollarSign size={24} color="#FF9800" />, "#FF9800", () => navigation.navigate('AdsManagement'))}
                        {renderQuickAction('Logistics', <FileText size={24} color="#2196F3" />, "#2196F3", () => navigation.navigate('AdminDeliveryReport'))}
                        {renderQuickAction('Campaigns', <TrendingUp size={24} color="#4CAF50" />, "#4CAF50", () => navigation.navigate('ProfitManagement'))}
                    </View>
                </View>

                {/* Active Campaigns */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Active Campaigns</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AdsManagement')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {activeCampaigns.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No active campaigns</Text>
                        </View>
                    ) : (
                        activeCampaigns.map((camp) => (
                            <TouchableOpacity 
                                key={camp.id} 
                                style={styles.campaignCard}
                                onPress={() => navigation.navigate('CampaignDetails', { campaignId: camp.id, campaignName: camp.name })}
                            >
                                <View style={styles.campaignInfo}>
                                    <View style={styles.campaignIcon}>
                                        <TrendingUp size={18} color={Colors.secondary} />
                                    </View>
                                    <View>
                                        <Text style={styles.campaignName}>{camp.name}</Text>
                                        <Text style={styles.campaignDetails}>Spend: Rs. {Number(camp.total_spend || 0).toLocaleString()}</Text>
                                    </View>
                                </View>
                                <ChevronRight size={20} color={Colors.border} />
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Recent Conversations */}
                <View style={[styles.section, { marginBottom: 30 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Chats</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {recentChats.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No recent chats</Text>
                        </View>
                    ) : (
                        recentChats.map((chat) => (
                            <TouchableOpacity 
                                key={chat.id} 
                                style={styles.chatCard}
                                onPress={() => navigation.navigate('Messages', { screen: 'ChatDetail', params: { conversationId: chat.id, customerName: chat.customer_name } })}
                            >
                                <Image 
                                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.customer_name)}&background=random` }} 
                                    style={styles.chatAvatar} 
                                />
                                <View style={styles.chatInfo}>
                                    <View style={styles.chatHeader}>
                                        <Text style={styles.chatName}>{chat.customer_name}</Text>
                                        <Text style={styles.chatTime}>
                                            {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.chatSnippet} numberOfLines={1}>{chat.last_message || 'No messages'}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Delivery Action Modal */}
            <Modal
                visible={deliveryModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDeliveryModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Order #{selectedOrder?.order_number}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <View style={[styles.miniStatusBadge, { backgroundColor: getStatusColor(selectedOrder?.order_status) + '15' }]}>
                                        <Text style={[styles.miniStatusText, { color: getStatusColor(selectedOrder?.order_status) }]}>{selectedOrder?.order_status}</Text>
                                    </View>
                                    {isSyncing ? (
                                        <ActivityIndicator size="small" color={Colors.secondary} />
                                    ) : (
                                        <TouchableOpacity onPress={processSyncQueue} style={styles.syncBtn}>
                                            <TrendingUp size={12} color={Colors.secondary} />
                                            <Text style={styles.syncBtnText}>Sync Now</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setDeliveryModalVisible(false)}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>

                        {selectedOrder && (
                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <View style={styles.modalDetailSection}>
                                    <Text style={styles.modalLabel}>Customer</Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <View>
                                            <Text style={styles.modalValue}>{selectedOrder.customer_name}</Text>
                                            <Text style={styles.modalValue}>{selectedOrder.phone_number}</Text>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={() => Linking.openURL(`tel:${selectedOrder.phone_number}`)}
                                            style={styles.miniCallBtn}
                                        >
                                            <Phone size={16} color={Colors.white} />
                                            <Text style={styles.miniCallText}>Call</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.modalDetailSection}>
                                    <Text style={styles.modalLabel}>Delivery Address</Text>
                                    <Text style={[styles.modalValue, { fontWeight: 'bold' }]}>{selectedOrder.address}</Text>
                                </View>

                                <View style={styles.modalItemsSection}>
                                    <Text style={styles.modalLabel}>Products</Text>
                                    {(selectedOrder.items || []).map((item: any, idx: number) => (
                                        <View key={idx} style={styles.modalItemRow}>
                                            <Text style={styles.modalItemName}>{item.product_name}</Text>
                                            <Text style={styles.modalItemQty}>x{item.qty}</Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.modalTotalSummary}>
                                    <View style={styles.modalSummaryRow}>
                                        <Text style={styles.modalSummaryLabel}>Product Cost</Text>
                                        <Text style={styles.modalSummaryValue}>Rs. {Number(selectedOrder.total_amount - (selectedOrder.delivery_charge || 0)).toLocaleString()}</Text>
                                    </View>
                                    {selectedOrder.delivery_charge > 0 && (
                                        <View style={styles.modalSummaryRow}>
                                            <Text style={styles.modalSummaryLabel}>Delivery Charge</Text>
                                            <Text style={styles.modalSummaryValue}>Rs. {Number(selectedOrder.delivery_charge).toLocaleString()}</Text>
                                        </View>
                                    )}
                                    <View style={[styles.modalSummaryRow, { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, marginTop: 4 }]}>
                                        <Text style={[styles.modalSummaryLabel, { fontWeight: 'bold', color: Colors.text }]}>Total Amount</Text>
                                        <Text style={[styles.modalSummaryValue, { fontWeight: 'bold', color: Colors.primary, fontSize: 18 }]}>Rs. {Number(selectedOrder.total_amount).toLocaleString()}</Text>
                                    </View>
                                </View>

                                <View style={styles.modalActionsRow}>
                                    {selectedOrder.order_status === 'Packed' ? (
                                        <>
                                            <TouchableOpacity onPress={() => updateStatus(selectedOrder.id, 'Shipped')} style={[styles.modalActionBtn, { backgroundColor: Colors.secondary }]}>
                                                <CheckCircle2 size={18} color={Colors.white} />
                                                <Text style={styles.modalActionText}>Complete</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleCancelOrder(selectedOrder.id)} style={[styles.modalActionBtn, { backgroundColor: Colors.danger }]}>
                                                <XCircle size={18} color={Colors.white} />
                                                <Text style={styles.modalActionText}>Cancel</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <TouchableOpacity onPress={() => updateStatus(selectedOrder.id, 'Delivered')} style={[styles.modalActionBtn, { backgroundColor: Colors.primary }]}>
                                                <CheckCircle2 size={18} color={Colors.white} />
                                                <Text style={styles.modalActionText}>Delivered</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => updateStatus(selectedOrder.id, 'Return Process')} style={[styles.modalActionBtn, { backgroundColor: Colors.danger }]}>
                                                <XCircle size={18} color={Colors.white} />
                                                <Text style={styles.modalActionText}>Failed</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scrollContent: { paddingHorizontal: Spacing.m, paddingBottom: 40 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.m,
        paddingVertical: Spacing.m,
    },
    greetingText: { fontSize: 14, color: Colors.textSecondary },
    userNameText: { fontSize: 24, fontWeight: '800', color: Colors.text },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    notificationBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.danger,
        borderWidth: 2,
        borderColor: Colors.white,
    },
    section: { marginTop: 24 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    dateText: { fontSize: 12, color: Colors.textSecondary },
    seeAllText: { fontSize: 14, color: Colors.secondary, fontWeight: '600' },
    statsScroll: { marginHorizontal: -Spacing.m, paddingHorizontal: Spacing.m },
    riderOrdersScroll: { marginHorizontal: -Spacing.m, paddingHorizontal: Spacing.m },
    riderOrderCard: {
        width: 220,
        backgroundColor: Colors.white,
        padding: 10,
        borderRadius: Radius.l,
        marginRight: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    riderOrderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    riderOrderNum: { fontSize: 12, fontWeight: 'bold', color: Colors.primary },
    miniStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 4 },
    miniStatusText: { fontSize: 8, fontWeight: 'bold' },
    viewText: { fontSize: 12, color: Colors.secondary, fontWeight: 'bold', textDecorationLine: 'underline' },
    riderCustomerName: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 2 },
    riderAddress: { fontSize: 11, color: Colors.textSecondary },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    modalBody: { marginBottom: 20 },
    modalDetailSection: { marginBottom: 15 },
    modalLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4, fontWeight: 'bold', textTransform: 'uppercase' },
    modalValue: { fontSize: 14, color: Colors.text },
    miniCallBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.secondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.s, gap: 4 },
    miniCallText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
    syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.secondary + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    syncBtnText: { fontSize: 11, color: Colors.secondary, fontWeight: 'bold' },
    modalItemsSection: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: Radius.m, marginBottom: 15 },
    modalItemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    modalItemName: { fontSize: 13, color: Colors.text, flex: 1 },
    modalItemQty: { fontSize: 13, fontWeight: 'bold', color: Colors.textSecondary },
    modalTotalSummary: { marginBottom: 20, padding: 12, backgroundColor: '#F0F4FF', borderRadius: Radius.m },
    modalSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    modalSummaryLabel: { fontSize: 13, color: Colors.textSecondary },
    modalSummaryValue: { fontSize: 14, color: Colors.text, fontWeight: '600' },
    modalActionsRow: { flexDirection: 'row', gap: 12 },
    modalActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Radius.m, gap: 8 },
    modalActionText: { color: Colors.white, fontSize: 14, fontWeight: 'bold' },

    statCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: Radius.l,
        marginRight: 12,
        minWidth: 160,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
    statValue: { fontSize: 16, fontWeight: '800' },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
    },
    actionItem: {
        width: (width - Spacing.m * 2 - 12) / 2,
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: Radius.l,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: Radius.m,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: { fontSize: 14, fontWeight: '600', color: Colors.text },
    campaignCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 16,
        borderRadius: Radius.l,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    campaignInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    campaignIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F0F4FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    campaignName: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
    campaignDetails: { fontSize: 12, color: Colors.textSecondary },
    chatCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        padding: 12,
        borderRadius: Radius.l,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    chatAvatar: { width: 44, height: 44, borderRadius: 22 },
    chatInfo: { flex: 1, marginLeft: 12 },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    chatName: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
    chatTime: { fontSize: 10, color: Colors.textSecondary },
    chatSnippet: { fontSize: 13, color: Colors.textSecondary },
    emptyCard: { padding: 30, alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.l, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.border },
    emptyText: { color: Colors.textSecondary, fontStyle: 'italic' },
});
