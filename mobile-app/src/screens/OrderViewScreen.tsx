import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft,
    User,
    Phone,
    MapPin,
    Package,
    Truck,
    History,
    Info,
    Edit2,
    CreditCard,
    MessageSquare,
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';

const OrderViewScreen = ({ route, navigation }: any) => {
    const { orderId } = route.params;
    const insets = useSafeAreaInsets();
    const { token, user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const auditScrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*, order_status_history(*)')
                .eq('id', orderId)
                .single();
            if (error) throw error;
            setOrder(data);
        } catch (err: any) {
            Alert.alert('Error', 'Failed to load order details');
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'New Order': return { bg: '#FEF9C3', color: '#854D0E' };
            case 'Confirmed Order': return { bg: '#DBEAFE', color: '#1E40AF' };
            case 'Ready to Ship':
            case 'Packed': return { bg: '#FFEDD5', color: '#92400E' };
            case 'Shipped': return { bg: '#E0E7FF', color: '#4338CA' };
            case 'Delivered': return { bg: '#DCFCE7', color: '#166534' };
            case 'Cancelled': return { bg: '#FEE2E2', color: '#991B1B' };
            default: return { bg: '#F3F4F6', color: '#374151' };
        }
    };

    const formatDate = (d: string) => {
        if (!d) return 'N/A';
        return new Date(d).toLocaleString();
    };

    const canEdit = () => {
        if (!user) return true;
        if (user.role === 'user' && order?.courier_provider === 'pathao') return false;
        return true;
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: Colors.textSecondary, fontSize: 16 }}>Order not found</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
                    <Text style={{ color: Colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const statusStyle = getStatusStyle(order.order_status);
    const items: any[] = order.items || [];
    const subtotal = items.reduce((s: number, i: any) => s + (i.qty * i.amount), 0);
    const history: any[] = order.order_status_history || [];

    const courierLabel = (p: string) => {
        switch (p) {
            case 'pathao': return 'Pathao Parcel';
            case 'pickdrop': return 'Pick & Drop';
            case 'ncm': return 'Nepal Can Move';
            case 'local': return 'Local Delivery';
            case 'self': return 'Self Delivered';
            default: return p || '—';
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        Order #{order.order_number}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {order.order_status}
                    </Text>
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                ref={auditScrollRef}
            >
                {/* Date Placed */}
                <Text style={styles.dateLine}>
                    Placed on {formatDate(order.created_at || order.order_date)}
                </Text>

                {/* ── Customer & Delivery ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <User size={16} color="#6366F1" />
                        <Text style={styles.cardTitle}>Customer & Delivery</Text>
                    </View>

                    <View style={styles.grid2}>
                        <View style={styles.gridItem}>
                            <Text style={styles.fieldLabel}>CUSTOMER NAME</Text>
                            <Text style={styles.fieldValue}>{order.customer_name || '—'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.fieldLabel}>PHONE</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Phone size={13} color={Colors.textSecondary} />
                                <Text style={styles.fieldValue}>{order.phone_number || '—'}</Text>
                            </View>
                            {order.alternative_phone ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                    <Phone size={13} color={Colors.textSecondary} />
                                    <Text style={[styles.fieldValue, { color: Colors.textSecondary }]}>
                                        {order.alternative_phone}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    <View style={{ marginTop: 14 }}>
                        <Text style={styles.fieldLabel}>DELIVERY ADDRESS</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                            <MapPin size={14} color={Colors.textSecondary} style={{ marginTop: 2 }} />
                            <Text style={styles.fieldValue}>
                                {order.address}
                                {order.city ? ` (${order.city})` : ''}
                            </Text>
                        </View>
                    </View>

                    {order.package_description ? (
                        <View style={{ marginTop: 14 }}>
                            <Text style={styles.fieldLabel}>PACKAGE DESCRIPTION</Text>
                            <Text style={styles.fieldValue}>{order.package_description}</Text>
                        </View>
                    ) : null}

                    {(order.courier_delivery_fee > 0) && (
                        <View style={{ marginTop: 14 }}>
                            <Text style={styles.fieldLabel}>EST. DELIVERY CHARGE</Text>
                            <Text style={[styles.fieldValue, { color: '#6366F1', fontWeight: '700', fontSize: 16 }]}>
                                Rs. {order.courier_delivery_fee}
                            </Text>
                        </View>
                    )}

                    {order.price_changelog ? (
                        <View style={styles.changelogBox}>
                            <Text style={styles.changelogLabel}>PRICE CHANGELOG</Text>
                            <Text style={styles.changelogValue}>{order.price_changelog}</Text>
                        </View>
                    ) : null}
                </View>

                {/* ── Logistics Info ── */}
                {order.courier_provider && order.courier_provider !== '' && (
                    <View style={[styles.card, getLogisticCardStyle(order.courier_provider)]}>
                        <View style={styles.cardHeader}>
                            <Truck size={16} color={getLogisticColor(order.courier_provider)} />
                            <Text style={[styles.cardTitle, { color: getLogisticColor(order.courier_provider) }]}>
                                {courierLabel(order.courier_provider)}
                            </Text>
                        </View>

                        {/* Pathao */}
                        {order.courier_provider === 'pathao' && !order.courier_consignment_id && (
                            <View style={styles.grid2}>
                                {order.city_name ? (
                                    <View style={styles.gridItem}>
                                        <Text style={styles.fieldLabel}>CITY</Text>
                                        <Text style={styles.fieldValue}>{order.city_name}</Text>
                                    </View>
                                ) : null}
                                {order.zone_name ? (
                                    <View style={styles.gridItem}>
                                        <Text style={styles.fieldLabel}>ZONE</Text>
                                        <Text style={styles.fieldValue}>{order.zone_name}</Text>
                                    </View>
                                ) : null}
                                {order.area_name ? (
                                    <View style={styles.gridItem}>
                                        <Text style={styles.fieldLabel}>AREA</Text>
                                        <Text style={styles.fieldValue}>{order.area_name}</Text>
                                    </View>
                                ) : null}
                                {order.weight ? (
                                    <View style={styles.gridItem}>
                                        <Text style={styles.fieldLabel}>WEIGHT</Text>
                                        <Text style={styles.fieldValue}>{order.weight} kg</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}

                        {/* Consignment ID (Shipped) */}
                        {order.courier_consignment_id && (
                            <View>
                                <Text style={styles.fieldLabel}>CONSIGNMENT ID</Text>
                                <Text style={[styles.fieldValue, { fontFamily: 'monospace', color: '#6366F1' }]}>
                                    {order.courier_consignment_id}
                                </Text>
                            </View>
                        )}

                        {/* Local */}
                        {order.courier_provider === 'local' && (
                            <View style={styles.grid2}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.fieldLabel}>LOGISTIC NAME</Text>
                                    <Text style={styles.fieldValue}>{order.logistic_name || '—'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.fieldLabel}>BRANCH</Text>
                                    <Text style={styles.fieldValue}>{order.delivery_branch || '—'}</Text>
                                </View>
                            </View>
                        )}

                        {/* Pick & Drop */}
                        {order.courier_provider === 'pickdrop' && (
                            <View style={styles.grid2}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.fieldLabel}>DESTINATION BRANCH</Text>
                                    <Text style={styles.fieldValue}>{order.pickdrop_destination_branch || '—'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.fieldLabel}>CITY AREA</Text>
                                    <Text style={styles.fieldValue}>{order.pickdrop_city_area || '—'}</Text>
                                </View>
                            </View>
                        )}

                        {/* NCM */}
                        {order.courier_provider === 'ncm' && (
                            <View style={styles.grid2}>
                                <View style={styles.gridItem}>
                                    <Text style={styles.fieldLabel}>FROM</Text>
                                    <Text style={styles.fieldValue}>{order.ncm_from_branch || '—'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.fieldLabel}>TO</Text>
                                    <Text style={styles.fieldValue}>{order.ncm_to_branch || '—'}</Text>
                                </View>
                                <View style={styles.gridItem}>
                                    <Text style={styles.fieldLabel}>DELIVERY TYPE</Text>
                                    <Text style={styles.fieldValue}>{order.ncm_delivery_type || '—'}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ── Order Items ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Package size={16} color="#6366F1" />
                        <Text style={styles.cardTitle}>Order Items</Text>
                    </View>

                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, { flex: 3 }]}>PRODUCT</Text>
                        <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>QTY</Text>
                        <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>PRICE</Text>
                        <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'right' }]}>TOTAL</Text>
                    </View>

                    {items.map((item: any, idx: number) => (
                        <View key={idx} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { flex: 3, fontWeight: '600', color: Colors.text }]} numberOfLines={2}>
                                {item.product_name}
                            </Text>
                            <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.qty}</Text>
                            <Text style={[styles.tableCell, { flex: 2, textAlign: 'right' }]}>Rs. {item.amount}</Text>
                            <Text style={[styles.tableCell, { flex: 2, textAlign: 'right', color: Colors.text, fontWeight: '600' }]}>
                                Rs. {(item.qty * item.amount).toLocaleString()}
                            </Text>
                        </View>
                    ))}

                    {/* Totals */}
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalValue}>Rs. {subtotal.toLocaleString()}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Delivery Charge</Text>
                            <Text style={styles.totalValue}>Rs. {order.delivery_charge || 0}</Text>
                        </View>
                        <View style={[styles.totalRow, styles.grandTotalRow]}>
                            <Text style={styles.grandTotalLabel}>Total</Text>
                            <Text style={styles.grandTotalValue}>
                                Rs. {(order.total_amount || 0).toLocaleString()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Remarks ── */}
                {order.remarks ? (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <MessageSquare size={16} color="#6366F1" />
                            <Text style={styles.cardTitle}>Remarks</Text>
                        </View>
                        <Text style={[styles.fieldValue, { lineHeight: 20 }]}>{order.remarks}</Text>
                    </View>
                ) : null}

                {/* ── Platform Info ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Info size={16} color={Colors.textSecondary} />
                        <Text style={[styles.cardTitle, { color: Colors.textSecondary }]}>Platform Info</Text>
                    </View>
                    <View style={styles.grid2}>
                        <View style={styles.gridItem}>
                            <Text style={styles.fieldLabel}>PLATFORM</Text>
                            <Text style={styles.fieldValue}>{order.platform || 'Direct'}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.fieldLabel}>PAGE / ACCOUNT</Text>
                            <Text style={styles.fieldValue} numberOfLines={2}>
                                {order.page_name || order.platform_account || '—'}
                            </Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.fieldLabel}>ORDER ID</Text>
                            <Text style={[styles.fieldValue, { fontSize: 11, color: Colors.textSecondary }]} numberOfLines={1}>
                                {order.id}
                            </Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.fieldLabel}>CREATED BY</Text>
                            <Text style={styles.fieldValue}>{order.created_by || 'System'}</Text>
                        </View>
                    </View>
                </View>

                {/* ── Audit Trail ── */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <History size={16} color="#F97316" />
                        <Text style={[styles.cardTitle, { color: '#F97316' }]}>Audit Trail</Text>
                    </View>

                    <View style={styles.timeline}>
                        {history.length > 0 ? (
                            history.map((h: any, idx: number) => {
                                const isLast = idx === history.length - 1;
                                return (
                                    <View key={h.id || idx} style={styles.timelineItem}>
                                        {/* Dot & Line */}
                                        <View style={styles.timelineDotCol}>
                                            <View style={[
                                                styles.timelineDot,
                                                isLast && styles.timelineDotActive
                                            ]} />
                                            {!isLast && <View style={styles.timelineLine} />}
                                        </View>
                                        {/* Content */}
                                        <View style={styles.timelineContent}>
                                            <Text style={styles.timelineStatus}>{h.status}</Text>
                                            <Text style={styles.timelineBy}>
                                                By{' '}
                                                <Text style={{ fontWeight: '600', color: Colors.text }}>
                                                    {h.changed_by || 'System'}
                                                </Text>
                                            </Text>
                                            {h.remarks ? (
                                                <View style={styles.timelineRemark}>
                                                    <Text style={styles.timelineRemarkText}>{h.remarks}</Text>
                                                </View>
                                            ) : null}
                                            <Text style={styles.timelineDate}>
                                                {formatDate(h.changed_at)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })
                        ) : (
                            <View style={styles.timelineItem}>
                                <View style={styles.timelineDotCol}>
                                    <View style={[styles.timelineDot, styles.timelineDotActive]} />
                                </View>
                                <View style={styles.timelineContent}>
                                    <Text style={styles.timelineStatus}>Order Created</Text>
                                    <Text style={styles.timelineBy}>
                                        By{' '}
                                        <Text style={{ fontWeight: '600', color: Colors.text }}>
                                            {order.created_by || 'System'}
                                        </Text>
                                    </Text>
                                    <Text style={styles.timelineDate}>
                                        {formatDate(order.created_at)}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                {canEdit() && (
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => navigation.navigate('OrderDetails', { orderId: order.id, mode: 'edit' })}
                    >
                        <Edit2 size={18} color={Colors.white} />
                        <Text style={styles.editButtonText}>Edit Order</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

// Helper style functions
const getLogisticColor = (provider: string) => {
    switch (provider) {
        case 'pathao': return '#0284C7';
        case 'pickdrop': return '#EA580C';
        case 'ncm': return '#16A34A';
        case 'local': return '#374151';
        default: return Colors.primary;
    }
};

const getLogisticCardStyle = (provider: string) => {
    switch (provider) {
        case 'pathao': return { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' };
        case 'pickdrop': return { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' };
        case 'ncm': return { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' };
        case 'local': return { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' };
        default: return {};
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    backButton: { padding: 4 },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
    },
    dateLine: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginBottom: 12,
        marginTop: 4,
    },

    // Card
    card: {
        backgroundColor: Colors.white,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },

    // Grid
    grid2: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    gridItem: {
        flex: 1,
        minWidth: '45%',
    },

    // Fields
    fieldLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    fieldValue: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
        lineHeight: 20,
    },

    // Changelog
    changelogBox: {
        marginTop: 14,
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#FEF08A',
    },
    changelogLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#92400E',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    changelogValue: {
        fontSize: 13,
        color: '#78350F',
        fontWeight: '500',
    },

    // Table
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 4,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        alignItems: 'center',
    },
    tableCell: {
        fontSize: 13,
        color: Colors.textSecondary,
    },

    // Totals
    totalsBox: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 8,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    totalLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    totalValue: {
        fontSize: 14,
        color: Colors.text,
        fontWeight: '500',
    },
    grandTotalRow: {
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 10,
        marginTop: 4,
    },
    grandTotalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    grandTotalValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#6366F1',
    },

    // Audit Trail
    timeline: {
        paddingLeft: 4,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    timelineDotCol: {
        alignItems: 'center',
        width: 20,
        marginRight: 12,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#D1D5DB',
    },
    timelineDotActive: {
        backgroundColor: '#6366F1',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: '#E5E7EB',
        marginTop: 4,
    },
    timelineContent: {
        flex: 1,
        paddingBottom: 4,
    },
    timelineStatus: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    timelineBy: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    timelineRemark: {
        marginTop: 6,
        backgroundColor: '#EEF2FF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C7D2FE',
    },
    timelineRemarkText: {
        fontSize: 12,
        color: '#4338CA',
        fontStyle: 'italic',
    },
    timelineDate: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
        fontVariant: ['tabular-nums'],
    },

    // Footer
    footer: {
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingHorizontal: 16,
        paddingTop: 12,
    },
    editButton: {
        backgroundColor: '#6366F1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: Radius.m,
    },
    editButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },
    scroll: { flex: 1 },
});

export default OrderViewScreen;
