import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { Edit2, MessageCircle, Filter, ChevronDown, ChevronUp, X } from 'lucide-react-native';
import { supabase } from '../api/supabase';
import { format } from 'date-fns';
interface Conversation {
    id: string;
    customer_name: string;
    last_message: string;
    last_message_at: string;
    platform: string;
    page_name: string;
    unread_count?: number;
    orders?: {
        order_number: string;
        order_status: string;
        created_at: string;
    }[];
}

const ConversationItem = ({ item, navigation }: { item: Conversation, navigation: any }) => {
    const formattedTime = item.last_message_at
        ? format(new Date(item.last_message_at), 'p')
        : '';

    // Avatar placeholder based on platform or name
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.customer_name)}&background=random`;

    const handlePress = () => {
        // Navigate to ChatDetail with params
        // We need navigation prop here or pass it down
        // Navigation is passed to MessagesScreen, so we can use useNavigation or pass it from parent
    };

    // Better to pass navigation/onPress from parent
    return (
        <TouchableOpacity style={styles.messageItem} onPress={() => {
            // @ts-ignore
            navigation.navigate('ChatDetail', {
                conversationId: item.id,
                customerId: item.customer_id,
                customerName: item.customer_name,
                platform: item.platform,
                pageName: item.page_name
            });
        }}>
            <View style={styles.avatarContainer}>
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                <View style={[styles.platformBadge, { backgroundColor: item.platform === 'facebook' ? '#1877F2' : '#E4405F' }]}>
                    <Text style={styles.platformText}>{item.platform[0].toUpperCase()}</Text>
                </View>
            </View>
            <View style={styles.messageContent}>
                <View style={styles.messageHeader}>
                    <View style={styles.nameAndBadge}>
                        <Text style={styles.userName} numberOfLines={1}>{item.customer_name}</Text>
                        {item.orders && item.orders.length > 0 && (
                            <View style={[
                                styles.statusBadge,
                                {
                                    backgroundColor:
                                        item.orders[0].order_status === 'New Order' ? '#FEF9C3' :
                                            item.orders[0].order_status === 'Shipped' ? '#DBEAFE' :
                                                item.orders[0].order_status === 'Delivered' ? '#DCFCE7' :
                                                    item.orders[0].order_status === 'Returned' ? '#FEE2E2' : '#F3F4F6'
                                }
                            ]}>
                                <Text style={[
                                    styles.statusBadgeText,
                                    {
                                        color:
                                            item.orders[0].order_status === 'New Order' ? '#854D0E' :
                                                item.orders[0].order_status === 'Shipped' ? '#1E40AF' :
                                                    item.orders[0].order_status === 'Delivered' ? '#166534' :
                                                        item.orders[0].order_status === 'Returned' ? '#991B1B' : '#374151'
                                    }
                                ]}>
                                    #{item.orders[0].order_number}{item.orders.length > 1 ? ` +${item.orders.length - 1}` : ''}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.timeText}>{formattedTime}</Text>
                </View>
                <View style={styles.messageSubHeader}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.last_message || 'No messages yet'}
                    </Text>
                    <Text style={styles.pageName}>{item.page_name}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default function MessagesScreen({ navigation }: any) {
    const [activeTab, setActiveTab] = useState('Messages');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();

    // Filtering State
    const [showFilters, setShowFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [platformFilter, setPlatformFilter] = useState<string | null>(null);
    const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
    const [availablePageNames, setAvailablePageNames] = useState<string[]>([]);
    const [activeSelector, setActiveSelector] = useState<'status' | 'platform' | null>(null);

    const orderStatuses = ['New Order', 'Confirmed Order', 'Shipped', 'Delivered', 'Returned'];

    const fetchConversations = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .order('last_message_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                const conversationIds = data.map(c => c.id);
                const customerIds = data.map(c => c.customer_id).filter(Boolean);

                // Fetch the latest order status for these conversations
                // Filter by either UUID (conversation_id) or PSID (customer_id)
                console.log('Fetching orders for conversations:', conversationIds);
                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select('conversation_id, customer_id, order_number, order_status, created_at')
                    .or(`conversation_id.in.(${conversationIds.map(id => `"${id}"`).join(',')}),customer_id.in.(${customerIds.map(id => `"${id}"`).join(',')})`)
                    .order('created_at', { ascending: false });

                if (!ordersError && ordersData) {
                    const processed = data.map(conv => {
                        // Get orders for this conversation (Match by UUID OR PSID)
                        const convOrders = ordersData.filter(o =>
                            o.conversation_id === conv.id ||
                            (o.customer_id && o.customer_id === conv.customer_id)
                        );
                        return {
                            ...conv,
                            orders: convOrders
                        };
                    });
                    setConversations(processed);

                    // Extract unique platforms and page names for filtering
                    const platforms = Array.from(new Set(data.map(c => c.platform))).filter(Boolean);
                    const pages = Array.from(new Set(data.map(c => c.page_name))).filter(Boolean);
                    setAvailablePlatforms(platforms);
                    setAvailablePageNames(pages);
                } else {
                    setConversations(data);
                    const platforms = Array.from(new Set(data.map(c => c.platform))).filter(Boolean);
                    const pages = Array.from(new Set(data.map(c => c.page_name))).filter(Boolean);
                    setAvailablePlatforms(platforms);
                    setAvailablePageNames(pages);
                }
            } else {
                setConversations([]);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            Alert.alert('Error', 'Failed to load conversations. Please check your connection.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchConversations();

        // Subscribe to conversation changes
        const convSubscription = supabase
            .channel('conversations_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
                fetchConversations(true);
            })
            .subscribe();

        // Subscribe to order changes to refresh list (for badges)
        const orderSubscription = supabase
            .channel('orders_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
                fetchConversations(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(convSubscription);
            supabase.removeChannel(orderSubscription);
        };
    }, []);

    // Reset filters on screen focus
    useFocusEffect(
        useCallback(() => {
            return () => {
                setStatusFilter(null);
                setPlatformFilter(null);
                setShowFilters(false);
            };
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setStatusFilter(null);
        setPlatformFilter(null);
        fetchConversations(true);
    }, []);

    const filteredConversations = conversations.filter(conv => {
        if (activeTab !== 'Messages') return true; // Only filter messages

        const latestOrder = conv.orders && conv.orders[0];
        const matchesStatus = !statusFilter || latestOrder?.order_status === statusFilter;
        const matchesPlatform = !platformFilter || conv.page_name === platformFilter || conv.platform === platformFilter;

        return matchesStatus && matchesPlatform;
    });

    const FilterModal = ({
        visible,
        onClose,
        title,
        options,
        selectedValue,
        onSelect
    }: {
        visible: boolean;
        onClose: () => void;
        title: string;
        options: string[];
        selectedValue: string | null;
        onSelect: (val: string | null) => void;
    }) => (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalOptions}>
                        <TouchableOpacity
                            style={[styles.optionItem, !selectedValue && styles.activeOptionItem]}
                            onPress={() => { onSelect(null); onClose(); }}
                        >
                            <Text style={[styles.optionText, !selectedValue && styles.activeOptionText]}>All {title.split(' ')[1] || title}</Text>
                        </TouchableOpacity>
                        {options.map((option) => (
                            <TouchableOpacity
                                key={option}
                                style={[styles.optionItem, selectedValue === option && styles.activeOptionItem]}
                                onPress={() => { onSelect(option); onClose(); }}
                            >
                                <Text style={[styles.optionText, selectedValue === option && styles.activeOptionText]}>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={[styles.headerTop, { justifyContent: 'center' }]}>
                    <Text style={styles.headerTitle}>Chats</Text>
                </View>

                {/* Tab Switcher Row */}
                <View style={styles.tabRow}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'Messages' && styles.activeTab]}
                            onPress={() => setActiveTab('Messages')}
                        >
                            <Text style={[styles.tabText, activeTab === 'Messages' && styles.activeTabText]}>Messages</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'Comments' && styles.activeTab]}
                            onPress={() => setActiveTab('Comments')}
                        >
                            <Text style={[styles.tabText, activeTab === 'Comments' && styles.activeTabText]}>Comments</Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'Messages' && (
                        <TouchableOpacity
                            style={[styles.filterButton, showFilters && styles.activeFilterButton]}
                            onPress={() => setShowFilters(!showFilters)}
                        >
                            <Filter size={18} color={showFilters ? Colors.secondary : Colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Compact Filter Panel */}
                {showFilters && activeTab === 'Messages' && (
                    <View style={styles.filterRowCompact}>
                        <TouchableOpacity
                            style={[styles.dropdownButton, statusFilter && styles.activeDropdownButton]}
                            onPress={() => setActiveSelector('status')}
                        >
                            <Text style={[styles.dropdownButtonText, statusFilter && styles.activeDropdownButtonText]} numberOfLines={1}>
                                {statusFilter || 'Order Status'}
                            </Text>
                            <ChevronDown size={16} color={statusFilter ? Colors.secondary : Colors.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.dropdownButton, platformFilter && styles.activeDropdownButton]}
                            onPress={() => setActiveSelector('platform')}
                        >
                            <Text style={[styles.dropdownButtonText, platformFilter && styles.activeDropdownButtonText]} numberOfLines={1}>
                                {platformFilter || 'Platform / Page'}
                            </Text>
                            <ChevronDown size={16} color={platformFilter ? Colors.secondary : Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Selection Modals */}
            <FilterModal
                visible={activeSelector === 'status'}
                onClose={() => setActiveSelector(null)}
                title="Filter Status"
                options={orderStatuses}
                selectedValue={statusFilter}
                onSelect={setStatusFilter}
            />
            <FilterModal
                visible={activeSelector === 'platform'}
                onClose={() => setActiveSelector(null)}
                title="Filter Platform"
                options={availablePageNames}
                selectedValue={platformFilter}
                onSelect={setPlatformFilter}
            />

            {/* Message List */}
            {loading && !refreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredConversations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <ConversationItem item={item} navigation={navigation} />}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MessageCircle size={64} color={Colors.border} />
                            <Text style={styles.emptyText}>No conversations found</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: Spacing.m,
        paddingTop: Spacing.s,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.s,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.text,
        textAlign: 'center',
    },
    tabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.s,
    },
    tabContainer: {
        flexDirection: 'row',
        flex: 1,
    },
    tab: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.m,
        marginRight: Spacing.s,
        borderRadius: Radius.m,
    },
    activeTab: {
        backgroundColor: '#E3F2FD',
    },
    tabText: {
        fontWeight: '600',
        color: Colors.textSecondary,
        fontSize: 15,
    },
    activeTabText: {
        color: Colors.secondary,
    },
    filterButton: {
        width: 36,
        height: 36,
        borderRadius: Radius.m,
        backgroundColor: Colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: Spacing.s,
    },
    activeFilterButton: {
        backgroundColor: '#E3F2FD',
    },
    filterRowCompact: {
        flexDirection: 'row',
        paddingVertical: Spacing.s,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        gap: Spacing.s,
    },
    dropdownButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.m,
        paddingVertical: 8,
        borderRadius: Radius.m,
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    activeDropdownButton: {
        borderColor: Colors.secondary,
        backgroundColor: '#F0F7FF',
    },
    dropdownButtonText: {
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: '500',
        flex: 1,
        marginRight: 4,
    },
    activeDropdownButtonText: {
        color: Colors.secondary,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: Radius.l,
        borderTopRightRadius: Radius.l,
        maxHeight: '70%',
        paddingBottom: Spacing.xl,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    modalOptions: {
        padding: Spacing.s,
    },
    optionItem: {
        paddingVertical: Spacing.m,
        paddingHorizontal: Spacing.m,
        borderRadius: Radius.m,
        marginVertical: 2,
    },
    activeOptionItem: {
        backgroundColor: '#E3F2FD',
    },
    optionText: {
        fontSize: 16,
        color: Colors.text,
    },
    activeOptionText: {
        color: Colors.secondary,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: Spacing.xl,
        flexGrow: 1,
        backgroundColor: Colors.background,
    },
    messageItem: {
        flexDirection: 'row',
        padding: Spacing.m,
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.border,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 55,
        height: 55,
        borderRadius: Radius.full,
        backgroundColor: Colors.border,
    },
    platformBadge: {
        position: 'absolute',
        right: -2,
        bottom: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    platformText: {
        color: Colors.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    messageContent: {
        flex: 1,
        marginLeft: Spacing.m,
    },
    messageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    messageSubHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        maxWidth: '70%',
    },
    nameAndBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
        borderWidth: 0.5,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    timeText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    lastMessage: {
        fontSize: 14,
        color: Colors.textSecondary,
        flex: 1,
        marginRight: Spacing.s,
    },
    pageName: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: '500',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: Spacing.m,
        fontSize: 16,
        color: Colors.textSecondary,
    },
});
