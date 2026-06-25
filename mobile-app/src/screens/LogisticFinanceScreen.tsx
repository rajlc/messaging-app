import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  SafeAreaView
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';
import { supabase } from '../api/supabase';
import { Colors, Spacing, Radius } from '../theme/theme';
import {
  Truck,
  Wallet,
  DollarSign,
  CreditCard,
  ChevronRight,
  RefreshCw
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface Order {
  id: string;
  order_number: string;
  order_status: string;
  total_amount: number;
  courier_provider: string;
  logistic_name?: string;
  courier_delivery_fee?: number;
  delivery_charge?: number;
  created_at: string;
  delivery_branch?: string;
  city_name?: string;
  customer_name?: string;
  phone_number?: string;
  price_changelog?: any[];
  order_status_history?: any[];
}

interface Settlement {
  id: string;
  logistic_id: string;
  amount: number;
  date: string;
  remarks: string;
  created_at?: string;
}

const LOGISTICS = [
  { id: 'ncm', name: 'Nepal Can Move', color: 'blue', providerKey: 'ncm', badgeColor: '#2196F3' },
  { id: 'pathao', name: 'Pathao', color: 'red', providerKey: 'pathao', badgeColor: '#F44336' },
  { id: 'pickdrop', name: 'Pick & Drop', color: 'orange', providerKey: 'pickdrop', badgeColor: '#FF9800' },
  { id: 'local', name: 'Local', color: 'emerald', providerKey: 'local', badgeColor: '#4CAF50' },
  { id: 'self', name: 'Self Delivery', color: 'teal', providerKey: 'self', badgeColor: '#009688' }
];

export default function LogisticFinanceScreen({ navigation }: any) {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [allSettlements, setAllSettlements] = useState<Record<string, Settlement[]>>({});
  const [allPendingSummaries, setAllPendingSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // 1. Fetch Orders from Supabase
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_status_history(*)')
        .not('order_status', 'in', '("New Order","Follow up again","Confirmed Order","Ready to Ship","Cancelled")');

      if (error) throw error;
      setOrders((data as Order[]) || []);

      // 2. Fetch settlements & summaries via Axios
      const results: Record<string, Settlement[]> = {};
      const headers = { 'Authorization': `Bearer ${token}` };

      try {
        const pendingRes = await axios.get(`${API_URL}/api/settlements/pending-summary`, { headers });
        setAllPendingSummaries(pendingRes.data || []);
      } catch (e) {
        console.error('Failed to fetch pending summaries', e);
      }

      await Promise.all(LOGISTICS.map(async (log) => {
        try {
          let url = `${API_URL}/api/logistics/cod-settlements/${log.id}`;
          if (log.id === 'self') {
            url = `${API_URL}/api/settlements`;
          }
          const res = await axios.get(url, { headers });
          if (log.id === 'self') {
            results[log.id] = res.data || [];
          } else if (res.data.success) {
            results[log.id] = res.data.data || [];
          }
        } catch (err) {
          console.error(`Failed to fetch settlement for ${log.id}`, err);
        }
      }));

      setAllSettlements(results);
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
      Alert.alert('Error', 'Failed to fetch statistics');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(false);
    setIsRefreshing(false);
  };

  // Dashboard Stats Calculations
  const logisticStats = useMemo(() => {
    const stats: Record<string, any> = {};
    const pendingStatuses = ['shipped', 'arrived at branch', 'delivery process', 'delivery failed', 'hold', 'return process'];

    LOGISTICS.forEach((log) => {
      const logOrders = orders.filter(
        o => o.courier_provider === log.id || o.courier_provider === log.providerKey
      );

      // 1. Pending Value
      const pendingValue = logOrders
        .filter(o => pendingStatuses.includes(o.order_status?.toLowerCase()))
        .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

      // 2. Delivery Charges
      const deliveryCharges = logOrders
        .filter(o => o.order_status?.toLowerCase() === 'delivered')
        .reduce((sum, o) => sum + Number(o.courier_delivery_fee || o.delivery_charge || 0), 0);

      // 3. Last COD Amount
      const settlements = allSettlements[log.id] || [];
      let lastCodAmount = 0;
      if (settlements.length > 0) {
        const sorted = [...settlements].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latestDate = sorted[0].date;
        lastCodAmount = sorted
          .filter(s => s.date === latestDate)
          .reduce((sum, s) => sum + Number(s.amount || 0), 0);
      }

      // 4. Pending COD
      let pendingCod = 0;
      if (log.id === 'self') {
        pendingCod = allPendingSummaries.reduce((sum, r) => sum + Number(r.net_pending_settlement || 0), 0);
      } else {
        const deliveredOrdersAmt = logOrders
          .filter(o => o.order_status?.toLowerCase() === 'delivered')
          .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
        pendingCod = (deliveredOrdersAmt - deliveryCharges) - settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
      }

      stats[log.id] = {
        pendingValue,
        pendingCod,
        deliveryCharges,
        lastCodAmount
      };
    });

    return stats;
  }, [orders, allSettlements, allPendingSummaries]);

  const highestPendingLogistic = useMemo(() => {
    let maxVal = -1;
    let maxId = '';
    LOGISTICS.forEach((log) => {
      const val = logisticStats[log.id]?.pendingValue || 0;
      if (val > maxVal) {
        maxVal = val;
        maxId = log.id;
      }
    });
    return maxId;
  }, [logisticStats]);

  const sortedLogistics = useMemo(() => {
    return [...LOGISTICS].sort(
      (a, b) => (logisticStats[b.id]?.pendingCod || 0) - (logisticStats[a.id]?.pendingCod || 0)
    );
  }, [logisticStats]);

  if (isLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Logistic Finance...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        <View style={styles.dashboardSummarySection}>
          {sortedLogistics.map((log) => {
            const stats = logisticStats[log.id] || { pendingValue: 0, pendingCod: 0, deliveryCharges: 0, lastCodAmount: 0 };
            const isHighest = log.id === highestPendingLogistic;

            return (
              <View
                key={log.id}
                style={[
                  styles.logisticCard,
                  isHighest && styles.highestPendingCard
                ]}
              >
                <View style={styles.logisticCardHeader}>
                  <View style={styles.logisticTitleContainer}>
                    <View style={[styles.avatarBox, { backgroundColor: log.badgeColor + '15' }]}>
                      <Text style={[styles.avatarText, { color: log.badgeColor }]}>{log.name.charAt(0)}</Text>
                    </View>
                    <View>
                      <View style={styles.nameBadgeRow}>
                        <Text style={styles.logisticCardName}>{log.name}</Text>
                        {isHighest && (
                          <View style={styles.topPendingBadge}>
                            <Text style={styles.topPendingBadgeText}>Top Pending</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.logisticCardSubText}>Performance & Settlements</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      navigation.navigate('LogisticDetail', { logistic: log });
                    }}
                    style={styles.viewMoreBtn}
                  >
                    <Text style={styles.viewMoreBtnText}>View Details</Text>
                    <ChevronRight size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* 2 Rows of 2 Metrics Cards to ensure symmetric alignment */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricRow}>
                    <View style={styles.miniMetricCard}>
                      <View style={styles.miniIconBg}>
                        <Wallet size={14} color="#2196F3" />
                      </View>
                      <Text style={styles.miniMetricLabel}>Pending Value</Text>
                      <Text style={styles.miniMetricValue}>Rs. {stats.pendingValue.toLocaleString()}</Text>
                    </View>

                    <View style={styles.miniMetricCard}>
                      <View style={styles.miniIconBg}>
                        <DollarSign size={14} color="#FF9800" />
                      </View>
                      <Text style={styles.miniMetricLabel}>Pending COD</Text>
                      <Text style={[styles.miniMetricValue, { color: '#E65100' }]}>Rs. {stats.pendingCod.toLocaleString()}</Text>
                    </View>
                  </View>

                  <View style={styles.metricRow}>
                    <View style={styles.miniMetricCard}>
                      <View style={styles.miniIconBg}>
                        <Truck size={14} color="#F44336" />
                      </View>
                      <Text style={styles.miniMetricLabel}>Deliv. Charges</Text>
                      <Text style={styles.miniMetricValue}>Rs. {stats.deliveryCharges.toLocaleString()}</Text>
                    </View>

                    <View style={styles.miniMetricCard}>
                      <View style={styles.miniIconBg}>
                        <CreditCard size={14} color="#4CAF50" />
                      </View>
                      <Text style={styles.miniMetricLabel}>Last COD Amt</Text>
                      <Text style={styles.miniMetricValue}>
                        {log.id === 'self' ? 'N/A' : `Rs. ${stats.lastCodAmount.toLocaleString()}`}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA'
  },
  loadingText: {
    marginTop: Spacing.s,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600'
  },
  scrollContent: {
    padding: Spacing.m
  },
  dashboardSummarySection: {
    gap: Spacing.m
  },
  logisticCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.m,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 }
  },
  highestPendingCard: {
    borderColor: '#2196F3',
    borderWidth: 1.5,
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4
  },
  logisticCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 12,
    marginBottom: 12
  },
  logisticTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.m,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    elevation: 1
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.primary
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap'
  },
  logisticCardName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text
  },
  topPendingBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full
  },
  topPendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  logisticCardSubText: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '400',
    marginTop: 1
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F8E9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.s
  },
  viewMoreBtnText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '700',
    marginRight: 2
  },
  metricsGrid: {
    flexDirection: 'column',
    gap: Spacing.xs
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.s,
    marginBottom: Spacing.xs
  },
  miniMetricCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 10,
    gap: 3
  },
  miniIconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2
  },
  miniMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase'
  },
  miniMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text
  }
});
