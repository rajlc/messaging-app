import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../theme/theme';
import { Search, Filter, Truck, Calendar, ChevronRight, User, Package } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';
import axios from 'axios';

type SubTabType = 'pending' | 'delivered' | 'all';

export default function AdminDeliveryOrdersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('pending');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/orders/admin/delivery-list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data || []);
    } catch (error) {
      console.error('Failed to fetch admin delivery orders', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         o.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeSubTab === 'pending') {
      return ['Packed', 'Shipped', 'Ready to Ship', 'Ready To Ship', 'Delivery Process', 'Confirmed Order', 'Return Process'].includes(o.order_status);
    } else if (activeSubTab === 'delivered') {
      return ['Delivered', 'delivered'].includes(o.order_status);
    }
    return true; // 'all'
  });

  const handleApproveReturn = async (orderId: string) => {
    Alert.alert('Confirm Return', 'Mark this order as Returned Delivered (Received in Warehouse)?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Returned', onPress: async () => {
        try {
          await axios.post(`${API_URL}/api/orders/${orderId}/delivery-status`, 
            { status: 'Returned Delivered' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          fetchOrders();
        } catch (error) {
          console.error('Failed to approve return', error);
          Alert.alert('Error', 'Failed to update order status');
        }
      }}
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return '#10B981';
      case 'Packed': return '#F59E0B';
      case 'Shipped': return '#3B82F6';
      case 'Delivery Failed': return '#EF4444';
      case 'Return Process': return '#F97316';
      case 'Returned Delivered': return '#8B5CF6';
      case 'Confirmed Order': return '#6366F1';
      default: return Colors.textSecondary;
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.orderNumber}>#{item.order_number}</Text>
          <Text style={styles.orderDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.order_status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.order_status) }]}>{item.order_status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <User size={16} color={Colors.textSecondary} />
          <Text style={styles.infoText}>{item.customer_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Truck size={16} color={Colors.primary} />
          <Text style={styles.infoText}>Rider: <Text style={{ fontWeight: 'bold' }}>{item.assigned_rider?.full_name || 'Unassigned'}</Text></Text>
        </View>
        <View style={styles.infoRow}>
          <Package size={16} color={Colors.secondary} />
          <Text style={styles.infoText}>Amount: <Text style={{ fontWeight: 'black', color: Colors.text }}>Rs. {item.total_amount}</Text></Text>
        </View>
      </View>

      {['Return Process', 'Delivery Failed', 'Hold', 'Returning to Seller'].includes(item.order_status) && (
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleApproveReturn(item.id)}
        >
          <Text style={styles.actionButtonText}>Approve Return (Received)</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery Orders</Text>
        
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textSecondary} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search Order # or Customer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.subTabs}>
          {(['pending', 'delivered', 'all'] as SubTabType[]).map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[styles.subTab, activeSubTab === tab && styles.activeSubTab]}
              onPress={() => setActiveSubTab(tab)}
            >
              <Text style={[styles.subTabText, activeSubTab === tab && styles.activeSubTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !isRefreshing ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No orders found for this category.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginTop: Spacing.m, marginBottom: Spacing.m },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.m,
    paddingHorizontal: 12,
    marginBottom: Spacing.m,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.text, marginLeft: 8 },
  subTabs: { flexDirection: 'row', gap: Spacing.s },
  subTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.s, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeSubTab: { borderBottomColor: Colors.primary },
  subTabText: { fontSize: 13, fontWeight: 'bold', color: Colors.textSecondary },
  activeSubTabText: { color: Colors.primary },
  loader: { marginTop: Spacing.xl },
  listContainer: { padding: Spacing.m, paddingBottom: 100 },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.m,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.m },
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
  orderDate: { fontSize: 11, color: Colors.textSecondary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  cardBody: { gap: 8, marginBottom: Spacing.m },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: Colors.textSecondary },
  actionButton: { backgroundColor: '#F59E0B', paddingVertical: 10, borderRadius: Radius.s, alignItems: 'center' },
  actionButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: Spacing.m, fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
