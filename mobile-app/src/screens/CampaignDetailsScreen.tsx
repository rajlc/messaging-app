import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft,
    FileText,
    BarChart3,
    TrendingUp,
    ShoppingBag,
    Package,
    ArrowUpRight,
    Search
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { API_URL } from '../api/config';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function CampaignDetailsScreen({ route, navigation }: any) {
    const insets = useSafeAreaInsets();
    const { token } = useAuth();
    const { campaignId, campaignName } = route.params;
    const [isLoading, setIsLoading] = useState(true);
    const [details, setDetails] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'orders' | 'analysis'>('orders');

    const fetchDetails = async () => {
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const res = await axios.get(`${API_URL}/api/ads-management/campaigns/${campaignId}/details`, { headers });
            if (res.data.success) {
                setDetails(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch campaign details:', error);
            Alert.alert('Error', 'Failed to load campaign details');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [campaignId]);

    const renderOrderItem = ({ item }: { item: any }) => (
        <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
                <Text style={styles.orderNumber}>#{item.order_number}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'Delivered' ? '#E8F5E9' : item.status === 'Shipped' ? '#E3F2FD' : '#F3F4F6' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.status === 'Delivered' ? '#4CAF50' : item.status === 'Shipped' ? '#2196F3' : '#666' }
                    ]}>
                        {item.status}
                    </Text>
                </View>
            </View>
            <View style={styles.orderBody}>
                <Text style={styles.productNames} numberOfLines={2}>{item.product_names}</Text>
                <View style={styles.orderMetrics}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Price</Text>
                        <Text style={styles.metricValue}>Rs. {item.sales_price?.toLocaleString()}</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>Profit</Text>
                        <Text style={[styles.metricValue, { color: item.profit > 0 ? '#4CAF50' : '#F44336' }]}>
                            {item.profit !== 0 ? `Rs. ${item.profit?.toLocaleString()}` : 'TBD'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    if (isLoading && !details) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Campaign Details</Text>
                    <View style={{ width: 24 }} />
                </View>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{campaignName}</Text>
                <TouchableOpacity onPress={fetchDetails} style={styles.backButton}>
                    <BarChart3 size={20} color={Colors.secondary} />
                </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
                {activeTab === 'orders' ? (
                    <View style={styles.tabContent}>
                        <View style={styles.listHeader}>
                            <Text style={styles.listHeaderTitle}>Order List of {campaignName}</Text>
                            <View style={styles.badgeCount}>
                                <Text style={styles.badgeCountText}>{(details?.orders || []).length} Orders</Text>
                            </View>
                        </View>
                        {(details?.orders || []).length === 0 ? (
                            <Text style={styles.emptyText}>No orders found</Text>
                        ) : (
                            (details?.orders || []).map((item: any) => (
                                <View key={item.order_number}>{renderOrderItem({ item })}</View>
                            ))
                        )}
                    </View>
                ) : (
                    <View style={styles.tabContent}>
                        {/* Summary Section */}
                        <View style={styles.summaryContainer}>
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryIconContainer}>
                                    <TrendingUp size={24} color="#4CAF50" />
                                </View>
                                <View>
                                    <Text style={styles.summaryLabel}>Total Profit</Text>
                                    <Text style={[styles.summaryValue, { color: (details?.total_profit || 0) >= 0 ? '#4CAF50' : '#F44336' }]}>
                                        Rs. {(details?.total_profit || 0).toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.summaryCard, { backgroundColor: '#F0F4FF' }]}>
                                <View style={[styles.summaryIconContainer, { backgroundColor: '#E3F2FD' }]}>
                                    <ShoppingBag size={24} color="#2196F3" />
                                </View>
                                <View>
                                    <Text style={styles.summaryLabel}>Total Orders</Text>
                                    <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
                                        {(details?.orders || []).length}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Ads Management Stats */}
                        <View style={styles.adsStatsContainer}>
                            <Text style={styles.sectionTitle}>Ads Management</Text>
                            <View style={styles.statsGrid}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Ads Amount</Text>
                                    <Text style={styles.statValue}>Rs. {(details?.ads_management?.total_ads_amount || 0).toLocaleString()}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Ads Orders</Text>
                                    <Text style={styles.statValue}>{details?.ads_management?.ads_orders || 0}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Ads Spend</Text>
                                    <Text style={styles.statValue}>Rs. {(details?.ads_management?.ads_spend || 0).toLocaleString()}</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Product Ads Metrics</Text>
                        {(details?.metrics || []).map((m: any, idx: number) => (
                            <View key={idx} style={styles.analysisCard}>
                                <View style={styles.analysisHeader}>
                                    <Package size={16} color={Colors.secondary} />
                                    <Text style={styles.productNameMetric}>{m.product_name}</Text>
                                </View>
                                <View style={styles.analysisGrid}>
                                    <View style={styles.analysisItem}>
                                        <Text style={styles.analysisLabel}>Shipped</Text>
                                        <Text style={styles.analysisValue}>{m.shipped_qty}</Text>
                                    </View>
                                    <View style={styles.analysisItem}>
                                        <Text style={styles.analysisLabel}>Delivered</Text>
                                        <Text style={styles.analysisValue}>{m.delivered_qty}</Text>
                                    </View>
                                    <View style={styles.analysisItem}>
                                        <Text style={styles.analysisLabel}>Est. Ads Cost</Text>
                                        <Text style={styles.analysisValue}>Rs. {m.est_ads_cost?.toFixed(1)}</Text>
                                    </View>
                                    <View style={styles.analysisItem}>
                                        <Text style={styles.analysisLabel}>Actual Ads</Text>
                                        <Text style={styles.analysisValue}>Rs. {m.actual_ads_cost?.toFixed(1)}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Footer Navigation */}
            <View style={[styles.footerNav, { paddingBottom: insets.bottom > 0 ? insets.bottom : 15 }]}>
                <TouchableOpacity
                    style={[styles.footerTab, activeTab === 'orders' && styles.activeFooterTab]}
                    onPress={() => setActiveTab('orders')}
                >
                    <FileText size={20} color={activeTab === 'orders' ? Colors.secondary : Colors.textSecondary} />
                    <Text style={[styles.footerTabText, activeTab === 'orders' && styles.activeFooterTabText]}>Order List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.footerTab, activeTab === 'analysis' && styles.activeFooterTab]}
                    onPress={() => setActiveTab('analysis')}
                >
                    <BarChart3 size={20} color={activeTab === 'analysis' ? Colors.secondary : Colors.textSecondary} />
                    <Text style={[styles.footerTabText, activeTab === 'analysis' && styles.activeFooterTabText]}>Ads Analysis</Text>
                </TouchableOpacity>
            </View>
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
        paddingVertical: Spacing.s,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, flex: 1, marginHorizontal: 10 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryContainer: {
        flexDirection: 'row',
        gap: Spacing.m,
        marginBottom: Spacing.m,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#E8F5E9',
        padding: 15,
        borderRadius: Radius.l,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    summaryIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryLabel: { fontSize: 10, fontWeight: 'bold', color: Colors.textSecondary, textTransform: 'uppercase' },
    summaryValue: { fontSize: 16, fontWeight: '800' },
    adsStatsContainer: {
        padding: Spacing.m,
        backgroundColor: Colors.white,
        borderRadius: Radius.l,
        marginBottom: Spacing.m,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: Colors.text, marginBottom: 12 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { alignItems: 'center' },
    statLabel: { fontSize: 10, color: Colors.textSecondary, marginBottom: 4 },
    statValue: { fontSize: 13, fontWeight: 'bold', color: Colors.text },
    activeTabText: {
        color: Colors.secondary,
    },
    // Footer Navigation Styles
    footerNav: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 10,
    },
    footerTab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    activeFooterTab: {
        // Optional active style
    },
    footerTabText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    activeFooterTabText: {
        color: Colors.secondary,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    listHeaderTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    badgeCount: {
        backgroundColor: '#F0F4FF',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    badgeCountText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    tabContent: { padding: Spacing.m },
    orderCard: {
        backgroundColor: Colors.white,
        borderRadius: Radius.m,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    orderNumber: { fontSize: 14, fontWeight: 'bold', color: Colors.secondary },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold' },
    orderBody: {},
    productNames: { fontSize: 13, color: Colors.text, marginBottom: 8 },
    orderMetrics: { flexDirection: 'row', gap: 20 },
    metricItem: {},
    metricLabel: { fontSize: 10, color: Colors.textSecondary },
    metricValue: { fontSize: 12, fontWeight: 'bold', color: Colors.text },
    analysisCard: {
        backgroundColor: Colors.white,
        borderRadius: Radius.m,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
    productNameMetric: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
    analysisGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    analysisItem: { width: '50%', marginBottom: 8 },
    analysisLabel: { fontSize: 10, color: Colors.textSecondary },
    analysisValue: { fontSize: 12, fontWeight: 'bold', color: Colors.text },
    emptyText: { textAlign: 'center', padding: 40, color: Colors.textSecondary, fontStyle: 'italic' }
});
