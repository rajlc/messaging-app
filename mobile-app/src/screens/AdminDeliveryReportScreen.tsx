import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../theme/theme';
import { ChevronRight, User, Wallet, RefreshCw, Package } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';
import axios from 'axios';

export default function AdminDeliveryReportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRiderSummaries = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/settlements/pending-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort by net pending settlement descending
      const sortedData = (res.data || []).sort((a: any, b: any) => b.net_pending_settlement - a.net_pending_settlement);
      setRiders(sortedData);
    } catch (error) {
      console.error('Failed to fetch rider summaries', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRiderSummaries();
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRiderSummaries();
  }, []);

  const renderRiderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.riderCard}
      onPress={() => navigation.navigate('AdminRiderDetail', { rider: item })}
    >
      <View style={styles.riderInfo}>
        <View style={styles.avatarContainer}>
          <User size={24} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.riderName}>{item.rider_name}</Text>
          <View style={styles.countsRow}>
            {item.pending_orders_count > 0 && (
              <View style={[styles.countBadge, { backgroundColor: '#FFF7ED' }]}>
                <RefreshCw size={12} color="#F59E0B" />
                <Text style={[styles.countText, { color: '#C2410C' }]}>{item.pending_orders_count}</Text>
              </View>
            )}
            {item.assigned_stock_count > 0 && (
              <View style={[styles.countBadge, { backgroundColor: '#F0F9FF' }]}>
                <Package size={12} color={Colors.secondary} />
                <Text style={[styles.countText, { color: '#0369A1' }]}>{item.assigned_stock_count}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      <View style={styles.settlementContainer}>
        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Pending</Text>
          <Text style={[styles.amountValue, { color: item.net_pending_settlement > 0 ? '#F59E0B' : '#10B981' }]}>
            Rs. {item.net_pending_settlement.toLocaleString()}
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rider Reports</Text>
          <Text style={styles.headerSubtitle}>Manage settlements & stock</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <RefreshCw size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && !isRefreshing ? (
        <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
      ) : (
        <FlatList
          data={riders}
          renderItem={renderRiderItem}
          keyExtractor={(item) => item.rider_id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <User size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No riders found with pending settlements.</Text>
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
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  headerSubtitle: { fontSize: 14, color: Colors.textSecondary },
  refreshButton: { padding: Spacing.s },
  loader: { marginTop: Spacing.xl },
  listContainer: { padding: Spacing.m, paddingBottom: 100 },
  riderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.m,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  riderInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.m },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderName: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  countsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.s },
  countText: { fontSize: 12, fontWeight: 'bold' },
  settlementContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  amountBox: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 10, fontWeight: 'bold', color: Colors.textSecondary, textTransform: 'uppercase' },
  amountValue: { fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: Spacing.m, fontSize: 16, color: Colors.textSecondary, textAlign: 'center' },
});
