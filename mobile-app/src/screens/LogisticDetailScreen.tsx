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
  Modal,
  TextInput,
  SafeAreaView,
  Platform
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
  Calendar,
  Search,
  ChevronDown,
  Plus,
  Edit,
  X,
  Package,
  RefreshCw,
  Clock
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

export default function LogisticDetailScreen({ route, navigation }: any) {
  const { token } = useAuth();
  const { logistic } = route.params;

  const [orders, setOrders] = useState<Order[]>([]);
  const [allSettlements, setAllSettlements] = useState<Record<string, Settlement[]>>({});
  const [allPendingSummaries, setAllPendingSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detail View States
  const [activeTab, setActiveTab] = useState<'orders' | 'cod' | 'changelogs'>('orders');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [orderListPage, setOrderListPage] = useState(1);
  const ordersPerPage = 15;

  // Modal States
  const [isAddCodOpen, setIsAddCodOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null);
  const [isEditSettlementOpen, setIsEditSettlementOpen] = useState(false);
  const [newCod, setNewCod] = useState({ amount: '', date: new Date().toISOString().split('T')[0], remarks: '' });

  // Self Delivery specific states
  const [pendingSummaries, setPendingSummaries] = useState<any[]>([]);
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [riderStock, setRiderStock] = useState<any[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  const [completedSettlements, setCompletedSettlements] = useState<any[]>([]);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementForm, setSettlementForm] = useState({ riderId: '', amount: '', date: new Date().toISOString().split('T')[0] });
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState({ riderId: '', productName: '', quantity: '', amount: '' });

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

      // 2. Fetch partner settlements via Axios
      const headers = { 'Authorization': `Bearer ${token}` };
      let url = `${API_URL}/api/logistics/cod-settlements/${logistic.id}`;
      if (logistic.id === 'self') {
        url = `${API_URL}/api/settlements`;
        const pendingRes = await axios.get(`${API_URL}/api/settlements/pending-summary`, { headers });
        setAllPendingSummaries(pendingRes.data || []);
      }
      const res = await axios.get(url, { headers });

      if (logistic.id === 'self') {
        setAllSettlements({ [logistic.id]: res.data || [] });
      } else if (res.data.success) {
        setAllSettlements({ [logistic.id]: res.data.data || [] });
      }
    } catch (err) {
      console.error('Error fetching partner details:', err);
      Alert.alert('Error', 'Failed to fetch partner details');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  const fetchSelfDeliveryData = async (showLoading = true) => {
    if (logistic.id !== 'self') return;
    if (showLoading) setIsLoadingLogs(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [pendingRes, ordersRes, ridersRes, stockRes, invRes, compRes] = await Promise.all([
        axios.get(`${API_URL}/api/settlements/pending-summary`, { headers }),
        axios.get(`${API_URL}/api/orders/admin/delivery-list`, { headers }),
        axios.get(`${API_URL}/api/settlements/riders`, { headers }),
        axios.get(`${API_URL}/api/rider-inventory/all`, { headers }),
        axios.get(`${API_URL}/api/orders/inventory-products`, { headers }),
        axios.get(`${API_URL}/api/settlements`, { headers })
      ]);

      setPendingSummaries(pendingRes.data || []);
      setAdminOrders(ordersRes.data || []);
      setRiders(ridersRes.data || []);
      setRiderStock(stockRes.data || []);
      setInventoryProducts(invRes.data || []);
      setCompletedSettlements(compRes.data || []);
    } catch (error) {
      console.error('Failed to fetch self delivery data:', error);
      Alert.alert('Error', 'Failed to load self delivery details');
    } finally {
      if (showLoading) setIsLoadingLogs(false);
    }
  };

  const fetchChangelogs = async (logisticId: string) => {
    setIsLoadingLogs(true);
    try {
      const res = await axios.get(`${API_URL}/api/logistics/order-changelogs/${logisticId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.data.success) {
        setChangelogs(res.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch changelogs:', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (logistic.id === 'self') {
      fetchSelfDeliveryData();
    } else if (activeTab === 'changelogs') {
      fetchChangelogs(logistic.id);
    }
  }, [logistic, activeTab]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData(false);
    if (logistic.id === 'self') {
      await fetchSelfDeliveryData(false);
    } else if (activeTab === 'changelogs') {
      await fetchChangelogs(logistic.id);
    }
    setIsRefreshing(false);
  };

  // Calculations
  const detailCalculations = useMemo(() => {
    const excludedStatuses = ['new order', 'confirmed order', 'confirm order', 'packed', 'cancelled', 'cancel', 'canceled'];
    const logOrders = orders.filter(
      o => (o.courier_provider === logistic.id || o.courier_provider === logistic.providerKey) &&
           !excludedStatuses.includes(o.order_status?.toLowerCase())
    );

    const orderValue = logOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const deliveredOrders = logOrders.filter(o => o.order_status?.toLowerCase() === 'delivered');
    const deliveredValueTotalAmt = deliveredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const returnDeliveredValue = logOrders
      .filter(o => o.order_status?.toLowerCase() === 'return delivered')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const pendingStatuses = ['shipped', 'arrived at branch', 'delivery process', 'delivery failed', 'hold', 'return process'];
    const pendingValue = logOrders
      .filter(o => pendingStatuses.includes(o.order_status?.toLowerCase()))
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const pendingQty = logOrders.filter(o => pendingStatuses.includes(o.order_status?.toLowerCase())).length;

    const totalDeliveryCharges = logOrders
      .filter(o => o.order_status?.toLowerCase() === 'delivered')
      .reduce((sum, o) => sum + Number(o.courier_delivery_fee || o.delivery_charge || 0), 0);

    const deliveredValue = deliveredValueTotalAmt - totalDeliveryCharges;

    let lastCodDate = 'N/A';
    let lastCodAmount = 0;
    const settlements = allSettlements[logistic.id] || [];

    if (settlements.length > 0) {
      const sorted = [...settlements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestDate = sorted[0].date;
      lastCodDate = new Date(latestDate).toLocaleDateString();
      lastCodAmount = sorted
        .filter(s => s.date === latestDate)
        .reduce((sum, s) => sum + Number(s.amount || 0), 0);
    }

    let pendingCod = 0;
    if (logistic.id === 'self') {
      pendingCod = pendingSummaries.reduce((sum, r) => sum + Number(r.net_pending_settlement || 0), 0);
    } else {
      pendingCod = deliveredValue - settlements.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    }

    const packedOrders = orders.filter(
      o => (o.courier_provider === logistic.id || o.courier_provider === logistic.providerKey) &&
           o.order_status?.toLowerCase() === 'packed'
    );
    const packedValue = packedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

    const nonDeliveredEstCharge = logOrders
      .filter(o => o.order_status?.toLowerCase() !== 'delivered' && o.order_status?.toLowerCase() !== 'return delivered')
      .reduce((sum, o) => sum + Number(o.courier_delivery_fee || o.delivery_charge || 0), 0);

    // Today's stats calculation
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

    let todayOrders = 0;
    let todayDeliveredOrders = 0;
    let todayDeliveredAmount = 0;
    let todayDeliveryCharge = 0;
    let todayRtvOrders = 0;

    logOrders.forEach(order => {
      const history = order.order_status_history || [];
      history.forEach((h: any) => {
        const changeTime = new Date(h.changed_at).getTime();
        if (changeTime >= startOfToday && changeTime < endOfToday) {
          const status = h.status?.toLowerCase();
          if (status === 'shipped') {
            todayOrders++;
          } else if (status === 'delivered') {
            todayDeliveredOrders++;
            todayDeliveredAmount += Number(order.total_amount || 0);
            todayDeliveryCharge += Number(order.courier_delivery_fee || order.delivery_charge || 0);
          } else if (status === 'return delivered') {
            todayRtvOrders++;
          }
        }
      });
    });

    return {
      orderValue,
      deliveredValue,
      returnDeliveredValue,
      pendingValue,
      lastCodDate,
      lastCodAmount,
      pendingCod,
      totalDeliveryCharges,
      packedValue,
      nonDeliveredEstCharge,
      todayOrders,
      todayDeliveredOrders,
      todayDeliveredAmount,
      todayDeliveryCharge,
      netAmount: todayDeliveredAmount - todayDeliveryCharge,
      todayRtvOrders,
      pendingQty
    };
  }, [orders, allSettlements, logistic, pendingSummaries]);

  // Orders list sub-tab filtering
  const filteredOrders = useMemo(() => {
    const excludedStatuses = ['new order', 'confirmed order', 'confirm order', 'packed', 'cancelled', 'cancel', 'canceled'];
    let logOrders = orders.filter(
      o => (o.courier_provider === logistic.id || o.courier_provider === logistic.providerKey) &&
           !excludedStatuses.includes(o.order_status?.toLowerCase())
    );

    if (statusFilter !== 'ALL') {
      logOrders = logOrders.filter(o => o.order_status?.toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      logOrders = logOrders.filter(
        o => o.order_number?.toLowerCase().includes(q) ||
             o.customer_name?.toLowerCase().includes(q) ||
             o.phone_number?.includes(q)
      );
    }

    return logOrders;
  }, [orders, logistic, statusFilter, searchQuery]);

  const paginatedOrders = useMemo(() => {
    const endIdx = orderListPage * ordersPerPage;
    return filteredOrders.slice(0, endIdx);
  }, [filteredOrders, orderListPage]);

  // Actions
  const handleSaveCod = async () => {
    if (!newCod.amount || !newCod.date) {
      Alert.alert('Error', 'Amount and Date are required');
      return;
    }
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      await axios.post(`${API_URL}/api/logistics/cod-settlements`, {
        logisticId: logistic.id,
        amount: parseFloat(newCod.amount),
        date: newCod.date,
        remarks: newCod.remarks
      }, { headers });

      setIsAddCodOpen(false);
      setNewCod({ amount: '', date: new Date().toISOString().split('T')[0], remarks: '' });
      Alert.alert('Success', 'COD Settlement added successfully');
      fetchData(false);
    } catch (error) {
      console.error('Failed to save COD settlement:', error);
      Alert.alert('Error', 'Failed to save settlement');
    }
  };

  const handleUpdateCod = async () => {
    if (!editingSettlement) return;
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      await axios.put(`${API_URL}/api/logistics/cod-settlements/${editingSettlement.id}`, {
        amount: parseFloat(editingSettlement.amount as any),
        date: editingSettlement.date,
        remarks: editingSettlement.remarks
      }, { headers });

      setIsEditSettlementOpen(false);
      setEditingSettlement(null);
      Alert.alert('Success', 'COD Settlement updated successfully');
      fetchData(false);
    } catch (error) {
      console.error('Failed to update COD settlement:', error);
      Alert.alert('Error', 'Failed to update settlement');
    }
  };

  const handleApproveReturn = async (orderId: string) => {
    Alert.alert(
      'Confirm Action',
      'Mark this order as Returned Delivered (Received in Warehouse)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const headers = { 'Authorization': `Bearer ${token}` };
              await axios.post(`${API_URL}/api/orders/${orderId}/delivery-status`,
                { status: 'Returned Delivered' },
                { headers }
              );
              Alert.alert('Success', 'Order marked as Returned Delivered');
              fetchSelfDeliveryData(false);
            } catch (error) {
              console.error('Failed to approve return', error);
              Alert.alert('Error', 'Failed to approve return');
            }
          }
        }
      ]
    );
  };

  const handleAddSettlement = async () => {
    if (!settlementForm.riderId || !settlementForm.amount || !settlementForm.date) {
      Alert.alert('Error', 'All fields are required');
      return;
    }
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      await axios.post(`${API_URL}/api/settlements`,
        {
          riderId: settlementForm.riderId,
          amount: parseFloat(settlementForm.amount),
          date: settlementForm.date
        },
        { headers }
      );
      setIsSettlementModalOpen(false);
      Alert.alert('Success', 'Settlement recorded successfully');
      fetchSelfDeliveryData(false);
    } catch (error) {
      console.error('Failed to add settlement', error);
      Alert.alert('Error', 'Failed to record rider settlement');
    }
  };

  const handleAssignStock = async () => {
    if (!stockForm.riderId || !stockForm.productName || !stockForm.quantity) {
      Alert.alert('Error', 'Rider, Product and Quantity are required');
      return;
    }
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      await axios.post(`${API_URL}/api/rider-inventory/assign`,
        {
          rider_id: stockForm.riderId,
          product_name: stockForm.productName,
          quantity: parseInt(stockForm.quantity),
          amount: parseFloat(stockForm.amount || '0')
        },
        { headers }
      );
      setIsStockModalOpen(false);
      setStockForm({ riderId: '', productName: '', quantity: '', amount: '' });
      Alert.alert('Success', 'Stock assigned successfully');
      fetchSelfDeliveryData(false);
    } catch (error) {
      console.error('Failed to assign stock', error);
      Alert.alert('Error', 'Failed to assign stock');
    }
  };

  const canEditSettlement = (createdAt?: string) => {
    if (!createdAt) return false;
    const createdDate = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffHours = (now - createdDate) / (1000 * 60 * 60);
    return diffHours <= 24;
  };

  const getStatusBadgeStyle = (status: string) => {
    if (!status) return styles.statusDefault;
    switch (status.toLowerCase()) {
      case 'delivered': return styles.statusDelivered;
      case 'shipped': return styles.statusShipped;
      case 'arrived at branch': return styles.statusArrivedBranch;
      case 'delivery failed': return styles.statusFailed;
      case 'hold': return styles.statusHold;
      case 'return process': return styles.statusReturnProcess;
      case 'return delivered': return styles.statusReturnDelivered;
      default: return styles.statusDefault;
    }
  };

  const renderMetricLine = (label: string, value: string | number, color = Colors.text, subValue?: string) => {
    return (
      <View style={styles.metricLineContainer}>
        <Text style={styles.metricLineLabel}>{label}</Text>
        <View style={styles.metricLineValCol}>
          <Text style={[styles.metricLineValue, { color }]}>{value}</Text>
          {subValue ? <Text style={styles.metricLineSubValue}>{subValue}</Text> : null}
        </View>
      </View>
    );
  };

  if (isLoading && orders.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        style={styles.detailScrollView}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {detailCalculations && (
          <View style={styles.compartmentContainer}>
            {/* Value Compartment */}
            <View style={styles.compartmentCard}>
              <View style={styles.compartmentHeader}>
                <Wallet size={16} color={Colors.primary} />
                <Text style={styles.compartmentTitle}>Value</Text>
              </View>
              <View style={styles.compartmentBody}>
                {renderMetricLine(
                  'Order Value =',
                  `Rs. ${detailCalculations.orderValue.toLocaleString()}`,
                  Colors.text,
                  detailCalculations.packedValue > 0 ? `(Packed: Rs. ${detailCalculations.packedValue.toLocaleString()})` : undefined
                )}
                {renderMetricLine(
                  'Delivered Value =',
                  `Rs. ${detailCalculations.deliveredValue.toLocaleString()}`,
                  '#4CAF50'
                )}
                {renderMetricLine(
                  'Returned Value =',
                  `Rs. ${detailCalculations.returnDeliveredValue.toLocaleString()}`,
                  '#F44336'
                )}
                {renderMetricLine(
                  'Pending Value =',
                  `Rs. ${detailCalculations.pendingValue.toLocaleString()}`,
                  '#FF9800',
                  `(Pending Qty: ${detailCalculations.pendingQty})`
                )}
              </View>
            </View>

            {/* COD Info Compartment */}
            <View style={styles.compartmentCard}>
              <View style={styles.compartmentHeader}>
                <CreditCard size={16} color="#4CAF50" />
                <Text style={styles.compartmentTitle}>COD Info</Text>
              </View>
              <View style={styles.compartmentBody}>
                {logistic.id !== 'self' && (
                  <>
                    {renderMetricLine('Last Cod Date =', detailCalculations.lastCodDate)}
                    {renderMetricLine('Last Cod Amount =', `Rs. ${detailCalculations.lastCodAmount.toLocaleString()}`, Colors.primary)}
                  </>
                )}
                {renderMetricLine('Pending Cod =', `Rs. ${detailCalculations.pendingCod.toLocaleString()}`, '#FF9800')}
                {renderMetricLine(
                  'Total Delivery Charges =',
                  `Rs. ${detailCalculations.totalDeliveryCharges.toLocaleString()}`,
                  '#F44336',
                  detailCalculations.nonDeliveredEstCharge > 0 ? `(Other: Rs. ${detailCalculations.nonDeliveredEstCharge.toLocaleString()})` : undefined
                )}
              </View>
            </View>

            {/* Today Details Compartment */}
            <View style={styles.compartmentCard}>
              <View style={styles.compartmentHeader}>
                <Clock size={16} color="#2196F3" />
                <Text style={styles.compartmentTitle}>Today Details</Text>
              </View>
              <View style={styles.compartmentBody}>
                {renderMetricLine('Today\'s Order =', detailCalculations.todayOrders)}
                {renderMetricLine('Today\'s Delivered Orders =', detailCalculations.todayDeliveredOrders, '#4CAF50')}
                {renderMetricLine('Today\'s Delivered Amount =', `Rs. ${detailCalculations.todayDeliveredAmount.toLocaleString()}`, '#4CAF50')}
                {renderMetricLine('Today\'s Delivery Charge =', `Rs. ${detailCalculations.todayDeliveryCharge.toLocaleString()}`, '#F44336')}
                {renderMetricLine('Net Amount =', `Rs. ${detailCalculations.netAmount.toLocaleString()}`, '#009688', '(Delivered - Deliv Charge)')}
                {renderMetricLine('Today\'s RTV Delivered Orders =', detailCalculations.todayRtvOrders, '#9C27B0')}
              </View>
            </View>
          </View>
        )}

        {/* Segmented Sub Tabs */}
        <View style={styles.subTabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('orders')}
            style={[styles.subTabButton, activeTab === 'orders' && styles.subTabActive]}
          >
            <Text style={[styles.subTabText, activeTab === 'orders' ? styles.subTabTextActive : null]}>Order List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('cod')}
            style={[styles.subTabButton, activeTab === 'cod' && styles.subTabActive]}
          >
            <Text style={[styles.subTabText, activeTab === 'cod' ? styles.subTabTextActive : null]}>
              {logistic.id === 'self' ? 'Rider Settlement' : 'COD Details'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('changelogs')}
            style={[styles.subTabButton, activeTab === 'changelogs' && styles.subTabActive]}
          >
            <Text style={[styles.subTabText, activeTab === 'changelogs' ? styles.subTabTextActive : null]}>Changelogs</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Contents */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'orders' && (
            <View style={styles.ordersTabWrapper}>
              {/* Filters Row */}
              <View style={styles.searchFilterRow}>
                <View style={styles.searchBar}>
                  <Search size={16} color={Colors.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search order no, customer..."
                    placeholderTextColor={Colors.textSecondary}
                    style={styles.searchInput}
                  />
                </View>
                <View style={styles.pickerWrapper}>
                  <ChevronDown size={14} color={Colors.textSecondary} style={styles.pickerArrow} />
                  <View style={styles.pickerInner}>
                    <TouchableOpacity
                      style={styles.pickerTouch}
                      onPress={() => {
                        Alert.alert('Filter by Status', 'Select order status:', [
                          { text: 'ALL Status', onPress: () => setStatusFilter('ALL') },
                          { text: 'Shipped', onPress: () => setStatusFilter('Shipped') },
                          { text: 'Arrived at Branch', onPress: () => setStatusFilter('Arrived at Branch') },
                          { text: 'Delivery Process', onPress: () => setStatusFilter('Delivery Process') },
                          { text: 'Delivered', onPress: () => setStatusFilter('Delivered') },
                          { text: 'Delivery Failed', onPress: () => setStatusFilter('Delivery Failed') },
                          { text: 'Hold', onPress: () => setStatusFilter('Hold') },
                          { text: 'Return Process', onPress: () => setStatusFilter('Return Process') },
                          { text: 'Return Delivered', onPress: () => setStatusFilter('Return Delivered') }
                        ]);
                      }}
                    >
                      <Text style={styles.pickerText}>{statusFilter}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* List of Orders */}
              {logistic.id === 'self' ? (
                // Self Delivery Order layout
                <View style={styles.ordersListContainer}>
                  {adminOrders
                    .filter(o => statusFilter === 'ALL' || o.order_status?.toLowerCase() === statusFilter.toLowerCase())
                    .filter(o => searchQuery === '' || o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) || o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((order) => (
                      <View key={order.id} style={styles.orderItemCard}>
                        <View style={styles.orderItemHeader}>
                          <Text style={styles.orderItemNum}>#{order.order_number}</Text>
                          <View style={[styles.badgeStyle, getStatusBadgeStyle(order.order_status)]}>
                            <Text style={[styles.badgeText, { color: getStatusBadgeStyle(order.order_status).color }]}>{order.order_status}</Text>
                          </View>
                        </View>
                        <View style={styles.orderItemBody}>
                          <Text style={styles.orderItemInfoText}><Text style={styles.boldLabel}>Date:</Text> {new Date(order.created_at).toLocaleDateString()}</Text>
                          <Text style={styles.orderItemInfoText}><Text style={styles.boldLabel}>Customer:</Text> {order.customer_name}</Text>
                          <Text style={styles.orderItemInfoText}>
                            <Text style={styles.boldLabel}>Rider:</Text> {order.assigned_rider?.full_name || 'Unassigned'}
                          </Text>
                          <Text style={styles.orderItemInfoText}><Text style={styles.boldLabel}>Amount:</Text> Rs. {Number(order.total_amount || 0).toLocaleString()}</Text>
                        </View>

                        {['Return Process', 'Delivery Failed', 'Hold', 'Returning to Seller'].includes(order.order_status) && (
                          <TouchableOpacity
                            onPress={() => handleApproveReturn(order.id)}
                            style={styles.approveReturnButton}
                          >
                            <Text style={styles.approveReturnBtnText}>Approve Return</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                  {adminOrders.length === 0 && (
                    <Text style={styles.noDataText}>No orders found.</Text>
                  )}
                </View>
              ) : (
                // Regular Logistics Order list layout
                <View style={styles.ordersListContainer}>
                  {paginatedOrders.map((order, idx) => {
                    const estCharge = order.courier_delivery_fee || order.delivery_charge || 0;
                    const balance = (order.total_amount || 0) - estCharge;

                    return (
                      <View key={order.id} style={styles.orderItemCard}>
                        <View style={styles.orderItemHeader}>
                          <Text style={styles.orderItemNum}>#{order.order_number}</Text>
                          <View style={[styles.badgeStyle, getStatusBadgeStyle(order.order_status)]}>
                            <Text style={[styles.badgeText, { color: getStatusBadgeStyle(order.order_status).color }]}>{order.order_status}</Text>
                          </View>
                        </View>
                        <View style={styles.orderItemBody}>
                          <Text style={styles.orderItemInfoText}><Text style={styles.boldLabel}>Date:</Text> {new Date(order.created_at).toLocaleDateString()}</Text>
                          <Text style={styles.orderItemInfoText}><Text style={styles.boldLabel}>Branch:</Text> {order.delivery_branch || order.city_name || 'N/A'}</Text>
                          <Text style={styles.orderItemInfoText}><Text style={styles.boldLabel}>Customer:</Text> {order.customer_name} ({order.phone_number})</Text>
                          <View style={styles.orderItemAmtRow}>
                            <Text style={styles.amtLabel}>Amt: Rs. {Number(order.total_amount || 0).toLocaleString()}</Text>
                            <Text style={styles.amtLabel}>Charge: Rs. {estCharge.toLocaleString()}</Text>
                            <Text style={[styles.amtLabel, { color: '#4CAF50' }]}>Bal: Rs. {balance.toLocaleString()}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                  {filteredOrders.length > paginatedOrders.length && (
                    <TouchableOpacity
                      onPress={() => setOrderListPage(prev => prev + 1)}
                      style={styles.loadMoreBtn}
                    >
                      <Text style={styles.loadMoreText}>Load More Orders</Text>
                    </TouchableOpacity>
                  )}
                  {filteredOrders.length === 0 && (
                    <Text style={styles.noDataText}>No orders found.</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {activeTab === 'cod' && (
            <View style={styles.codTabWrapper}>
              {logistic.id === 'self' ? (
                // Self Delivery - Riders Panel
                <View>
                  <View style={styles.riderActionsRow}>
                    <TouchableOpacity
                      onPress={() => {
                        if (riders.length === 0) {
                          Alert.alert('Info', 'No riders loaded yet.');
                          return;
                        }
                        setSettlementForm({
                          riderId: riders[0]?.id || '',
                          amount: '',
                          date: new Date().toISOString().split('T')[0]
                        });
                        setIsSettlementModalOpen(true);
                      }}
                      style={styles.actionIconButton}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Record Rider Settlement</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        if (riders.length === 0) {
                          Alert.alert('Info', 'No riders loaded yet.');
                          return;
                        }
                        setStockForm({
                          riderId: riders[0]?.id || '',
                          productName: inventoryProducts[0]?.name || '',
                          quantity: '',
                          amount: ''
                        });
                        setIsStockModalOpen(true);
                      }}
                      style={[styles.actionIconButton, { backgroundColor: '#009688' }]}
                    >
                      <Plus size={16} color="#FFFFFF" />
                      <Text style={styles.actionBtnText}>Assign Rider Stock</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Rider Cards */}
                  {pendingSummaries.map((rider) => {
                    const riderPendingOrders = adminOrders.filter(
                      o => o.assigned_rider_id === rider.rider_id &&
                           !['Delivered', 'delivered', 'Returned Delivered'].includes(o.order_status)
                    );

                    return (
                      <View key={rider.rider_id} style={styles.riderCard}>
                        <View style={styles.riderCardHeader}>
                          <View style={styles.avatarBox}>
                            <Text style={styles.avatarText}>{rider.rider_name?.charAt(0)}</Text>
                          </View>
                          <View style={styles.riderNameWrapper}>
                            <Text style={styles.riderNameText}>{rider.rider_name}</Text>
                            <Text style={styles.riderSubtitle}>Rider Professional</Text>
                          </View>
                        </View>

                        <View style={styles.riderPendingBox}>
                          <Text style={styles.riderPendingLabel}>Net Pending Settlement</Text>
                          <Text style={styles.riderPendingValue}>Rs. {Number(rider.net_pending_settlement || 0).toLocaleString()}</Text>
                        </View>

                        <View style={styles.riderCountRow}>
                          <View style={styles.riderCountCol}>
                            <Text style={styles.riderCountLabel}>Pending Orders</Text>
                            <Text style={styles.riderCountValue}>{rider.pending_orders_count}</Text>
                          </View>
                          <View style={styles.riderCountCol}>
                            <Text style={styles.riderCountLabel}>Assigned Stock</Text>
                            <Text style={styles.riderCountValue}>{rider.assigned_stock_count}</Text>
                          </View>
                        </View>

                        {/* Recent Activity list */}
                        {riderPendingOrders.length > 0 ? (
                          <View style={styles.riderActivityWrapper}>
                            <Text style={styles.activityTitle}>Pending Rider Orders</Text>
                            {riderPendingOrders.map((o) => (
                              <View key={o.id} style={styles.activityItemRow}>
                                <View style={styles.activityLeft}>
                                  <Text style={styles.activityOrderNum}>#{o.order_number}</Text>
                                  <Text style={styles.activityCustomer}>{o.customer_name}</Text>
                                </View>
                                <View style={styles.activityRight}>
                                  <Text style={styles.activityAmount}>Rs. {o.total_amount}</Text>
                                  {['Return Process', 'Delivery Failed', 'Hold'].includes(o.order_status) && (
                                    <TouchableOpacity
                                      onPress={() => handleApproveReturn(o.id)}
                                      style={styles.confirmReturnBtn}
                                    >
                                      <Text style={styles.confirmReturnBtnText}>Confirm Return</Text>
                                    </TouchableOpacity>
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                  {pendingSummaries.length === 0 && (
                    <Text style={styles.noDataText}>No rider statistics found.</Text>
                  )}
                </View>
              ) : (
                // Regular Logistics Settlements Panel
                <View>
                  <TouchableOpacity
                    onPress={() => setIsAddCodOpen(true)}
                    style={[styles.actionIconButton, { alignSelf: 'flex-start', marginBottom: 16 }]}
                  >
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Add COD Settlement</Text>
                  </TouchableOpacity>

                  {/* Settlement Items */}
                  {(allSettlements[logistic.id] || []).map((settlement, idx) => {
                    const editable = canEditSettlement(settlement.created_at);

                    return (
                      <View key={settlement.id} style={styles.settlementItemCard}>
                        <View style={styles.settlementLeft}>
                          <Text style={styles.settlementIdx}>#{idx + 1}</Text>
                          <View>
                            <Text style={styles.settlementDate}>{new Date(settlement.date).toLocaleDateString()}</Text>
                            <Text style={styles.settlementRemarks}>{settlement.remarks || 'No remarks'}</Text>
                          </View>
                        </View>
                        <View style={styles.settlementRight}>
                          <Text style={styles.settlementAmt}>Rs. {Number(settlement.amount).toLocaleString()}</Text>
                          {editable ? (
                            <TouchableOpacity
                              onPress={() => {
                                setEditingSettlement(settlement);
                                setNewCod({
                                  amount: settlement.amount.toString(),
                                  date: settlement.date,
                                  remarks: settlement.remarks || ''
                                });
                                setIsEditSettlementOpen(true);
                              }}
                              style={styles.editCodBtn}
                            >
                              <Edit size={16} color={Colors.primary} />
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.lockedText}>Locked</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {(allSettlements[logistic.id] || []).length === 0 && (
                    <Text style={styles.noDataText}>No COD Settlements found.</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {activeTab === 'changelogs' && (
            <View style={styles.changelogsTabWrapper}>
              {isLoadingLogs ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 24 }} />
              ) : (
                changelogs.map((log, idx) => (
                  <View key={log.id} style={styles.changelogItem}>
                    <View style={styles.changelogHeader}>
                      <Text style={styles.changelogIndex}>#{idx + 1}</Text>
                      <Text style={styles.changelogDate}>{new Date(log.created_at).toLocaleString()}</Text>
                    </View>
                    <View style={styles.changelogDetails}>
                      <Text style={styles.changelogText}><Text style={styles.boldLabel}>Order:</Text> #{log.orders?.order_number || 'N/A'}</Text>
                      <Text style={styles.changelogText}><Text style={styles.boldLabel}>Customer:</Text> {log.orders?.customer_name || 'N/A'}</Text>
                      <View style={styles.changelogDeltaRow}>
                        <Text style={[styles.changelogDelta, { color: '#4CAF50' }]}>COD (New): Rs. {Number(log.new_cod || 0).toLocaleString()}</Text>
                        <Text style={[styles.changelogDelta, { color: '#F44336' }]}>Charge (New): Rs. {Number(log.new_delivery_charge || 0).toLocaleString()}</Text>
                      </View>
                      {log.remarks ? <Text style={styles.changelogRemarks}>{log.remarks}</Text> : null}
                    </View>
                  </View>
                ))
              )}
              {!isLoadingLogs && changelogs.length === 0 && (
                <Text style={styles.noDataText}>No changelogs recorded.</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ============================================================== */}
      {/* MODALS */}
      {/* ============================================================== */}

      {/* Add COD Settlement Modal */}
      <Modal
        visible={isAddCodOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddCodOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add COD Settlement</Text>
              <TouchableOpacity onPress={() => setIsAddCodOpen(false)}>
                <X size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Amount (Rs.)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="Enter settlement amount"
                value={newCod.amount}
                onChangeText={(text) => setNewCod(prev => ({ ...prev, amount: text }))}
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                value={newCod.date}
                onChangeText={(text) => setNewCod(prev => ({ ...prev, date: text }))}
              />

              <Text style={styles.inputLabel}>Remarks</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter optional remarks"
                value={newCod.remarks}
                onChangeText={(text) => setNewCod(prev => ({ ...prev, remarks: text }))}
              />

              <TouchableOpacity onPress={handleSaveCod} style={styles.modalSubmitButton}>
                <Text style={styles.modalSubmitText}>Confirm Settlement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit COD Settlement Modal */}
      <Modal
        visible={isEditSettlementOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsEditSettlementOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit COD Settlement</Text>
              <TouchableOpacity onPress={() => setIsEditSettlementOpen(false)}>
                <X size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Amount (Rs.)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="Enter settlement amount"
                value={newCod.amount}
                onChangeText={(text) => setNewCod(prev => ({ ...prev, amount: text }))}
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                value={newCod.date}
                onChangeText={(text) => setNewCod(prev => ({ ...prev, date: text }))}
              />

              <Text style={styles.inputLabel}>Remarks</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter remarks"
                value={newCod.remarks}
                onChangeText={(text) => setNewCod(prev => ({ ...prev, remarks: text }))}
              />

              <TouchableOpacity onPress={handleUpdateCod} style={[styles.modalSubmitButton, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.modalSubmitText}>Update Settlement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settle Rider Modal */}
      <Modal
        visible={isSettlementModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsSettlementModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rider Settlement</Text>
              <TouchableOpacity onPress={() => setIsSettlementModalOpen(false)}>
                <X size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Rider</Text>
              <View style={styles.pickerWrapperModal}>
                <ChevronDown size={14} color={Colors.textSecondary} style={styles.pickerArrowModal} />
                <TouchableOpacity
                  style={styles.pickerTouchModal}
                  onPress={() => {
                    Alert.alert(
                      'Select Rider',
                      'Choose rider:',
                      riders.map(r => ({
                        text: r.full_name,
                        onPress: () => setSettlementForm(prev => ({ ...prev, riderId: r.id }))
                      }))
                    );
                  }}
                >
                  <Text style={styles.pickerTextModal}>
                    {riders.find(r => r.id === settlementForm.riderId)?.full_name || 'Choose a rider...'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Settlement Amount (Rs.)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                placeholder="Enter amount"
                value={settlementForm.amount}
                onChangeText={(text) => setSettlementForm(prev => ({ ...prev, amount: text }))}
              />

              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="YYYY-MM-DD"
                value={settlementForm.date}
                onChangeText={(text) => setSettlementForm(prev => ({ ...prev, date: text }))}
              />

              <TouchableOpacity onPress={handleAddSettlement} style={styles.modalSubmitButton}>
                <Text style={styles.modalSubmitText}>Confirm Settlement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Stock Modal */}
      <Modal
        visible={isStockModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsStockModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Stock to Rider</Text>
              <TouchableOpacity onPress={() => setIsStockModalOpen(false)}>
                <X size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Rider</Text>
              <View style={styles.pickerWrapperModal}>
                <ChevronDown size={14} color={Colors.textSecondary} style={styles.pickerArrowModal} />
                <TouchableOpacity
                  style={styles.pickerTouchModal}
                  onPress={() => {
                    Alert.alert(
                      'Select Rider',
                      'Choose rider:',
                      riders.map(r => ({
                        text: r.full_name,
                        onPress: () => setStockForm(prev => ({ ...prev, riderId: r.id }))
                      }))
                    );
                  }}
                >
                  <Text style={styles.pickerTextModal}>
                    {riders.find(r => r.id === stockForm.riderId)?.full_name || 'Select Rider'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Product</Text>
              <View style={styles.pickerWrapperModal}>
                <ChevronDown size={14} color={Colors.textSecondary} style={styles.pickerArrowModal} />
                <TouchableOpacity
                  style={styles.pickerTouchModal}
                  onPress={() => {
                    Alert.alert(
                      'Select Product',
                      'Choose product:',
                      inventoryProducts.map(p => ({
                        text: `${p.name} (Stock: ${p.stock_quantity})`,
                        onPress: () => setStockForm(prev => ({ ...prev, productName: p.name }))
                      }))
                    );
                  }}
                >
                  <Text style={styles.pickerTextModal}>
                    {stockForm.productName || 'Select Product'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="Qty"
                    value={stockForm.quantity}
                    onChangeText={(text) => setStockForm(prev => ({ ...prev, quantity: text }))}
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Price/Unit</Text>
                  <TextInput
                    style={styles.modalInput}
                    keyboardType="numeric"
                    placeholder="Price"
                    value={stockForm.amount}
                    onChangeText={(text) => setStockForm(prev => ({ ...prev, amount: text }))}
                  />
                </View>
              </View>

              <TouchableOpacity onPress={handleAssignStock} style={[styles.modalSubmitButton, { backgroundColor: '#009688' }]}>
                <Text style={styles.modalSubmitText}>Assign Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  detailScrollView: {
    flex: 1
  },
  compartmentContainer: {
    padding: Spacing.m,
    gap: Spacing.m
  },
  compartmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.m,
    elevation: 1,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.02,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  compartmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 10,
    marginBottom: 10
  },
  compartmentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text
  },
  compartmentBody: {
    gap: Spacing.s
  },
  metricLineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 6
  },
  metricLineLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary
  },
  metricLineValCol: {
    alignItems: 'flex-end'
  },
  metricLineValue: {
    fontSize: 14,
    fontWeight: '700'
  },
  metricLineSubValue: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 1
  },
  subTabBar: {
    flexDirection: 'row',
    marginHorizontal: Spacing.m,
    backgroundColor: '#EBEBEB',
    padding: 4,
    borderRadius: Radius.m,
    marginBottom: Spacing.s
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radius.s
  },
  subTabActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary
  },
  subTabTextActive: {
    color: Colors.primary,
    fontWeight: '800'
  },
  tabContentContainer: {
    paddingHorizontal: Spacing.m,
    paddingBottom: 40
  },
  ordersTabWrapper: {
    gap: Spacing.m
  },
  searchFilterRow: {
    flexDirection: 'row',
    gap: Spacing.s,
    marginTop: Spacing.s
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.m,
    paddingHorizontal: Spacing.s
  },
  searchIcon: {
    marginRight: 6
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 12,
    color: Colors.text
  },
  pickerWrapper: {
    width: 120,
    height: 42,
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.m
  },
  pickerArrow: {
    position: 'absolute',
    right: 10,
    top: 13
  },
  pickerInner: {
    flex: 1,
    justifyContent: 'center'
  },
  pickerTouch: {
    paddingLeft: 12,
    paddingRight: 24,
    justifyContent: 'center',
    height: '100%'
  },
  pickerText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '700'
  },
  ordersListContainer: {
    gap: Spacing.s
  },
  orderItemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.m,
    padding: Spacing.s,
    gap: Spacing.xs
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 6
  },
  orderItemNum: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace'
  },
  orderItemBody: {
    gap: 3
  },
  orderItemInfoText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '400'
  },
  boldLabel: {
    fontWeight: '700',
    color: Colors.textSecondary
  },
  orderItemAmtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 6,
    borderRadius: Radius.s,
    marginTop: 4
  },
  amtLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text
  },
  approveReturnButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: Radius.s,
    alignItems: 'center',
    marginTop: 6
  },
  approveReturnBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  loadMoreBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: Radius.m,
    alignItems: 'center',
    marginTop: Spacing.s
  },
  loadMoreText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '800'
  },
  noDataText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 20
  },

  // ============================================
  // COD DETAILS TAB
  // ============================================
  codTabWrapper: {
    gap: Spacing.m
  },
  actionIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.m,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  settlementItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.m,
    marginBottom: Spacing.s
  },
  settlementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s
  },
  settlementIdx: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary
  },
  settlementDate: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text
  },
  settlementRemarks: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2
  },
  settlementRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s
  },
  settlementAmt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4CAF50'
  },
  editCodBtn: {
    padding: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: Radius.s
  },
  lockedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#BDBDBD',
    textTransform: 'uppercase'
  },

  // ============================================
  // SELF DELIVERY RIDERS PANEL
  // ============================================
  riderActionsRow: {
    flexDirection: 'column',
    gap: Spacing.s,
    marginBottom: Spacing.m
  },
  riderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 }
  },
  riderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 10,
    marginBottom: 10
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
  riderNameWrapper: {
    flex: 1
  },
  riderNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text
  },
  riderSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: 1
  },
  riderPendingBox: {
    backgroundColor: '#263238',
    borderRadius: Radius.m,
    padding: Spacing.m,
    alignItems: 'center',
    marginBottom: 12
  },
  riderPendingLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B0BEC5',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  riderPendingValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF'
  },
  riderCountRow: {
    flexDirection: 'row',
    gap: Spacing.s,
    marginBottom: 12
  },
  riderCountCol: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    padding: 10,
    alignItems: 'center'
  },
  riderCountLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  riderCountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text
  },
  riderActivityWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 10,
    marginTop: 4
  },
  activityTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8
  },
  activityItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: Radius.s,
    padding: 8,
    marginBottom: 6
  },
  activityLeft: {
    gap: 2
  },
  activityOrderNum: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary
  },
  activityCustomer: {
    fontSize: 10,
    color: Colors.textSecondary
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  activityAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text
  },
  confirmReturnBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4
  },
  confirmReturnBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase'
  },

  // ============================================
  // CHANGELOGS TAB
  // ============================================
  changelogsTabWrapper: {
    gap: Spacing.s
  },
  changelogItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.s,
    gap: 4
  },
  changelogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 4,
    marginBottom: 4
  },
  changelogIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary
  },
  changelogDate: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500'
  },
  changelogDetails: {
    gap: 2
  },
  changelogText: {
    fontSize: 11,
    color: Colors.text
  },
  changelogDeltaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9FA',
    padding: 4,
    borderRadius: 4,
    marginTop: 2
  },
  changelogDelta: {
    fontSize: 9,
    fontWeight: '700'
  },
  changelogRemarks: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2
  },

  // ============================================
  // MODALS GENERAL
  // ============================================
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.xl,
    padding: Spacing.m,
    elevation: 10,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
    marginBottom: 14
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    textTransform: 'uppercase'
  },
  modalBody: {
    gap: Spacing.s
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 2
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.m,
    height: 44,
    paddingHorizontal: Spacing.s,
    fontSize: 13,
    color: Colors.text,
    backgroundColor: '#F9F9F9'
  },
  modalSubmitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: Radius.m,
    alignItems: 'center',
    marginTop: Spacing.s,
    elevation: 1
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  // Picker modal elements
  pickerWrapperModal: {
    height: 44,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.m,
    position: 'relative',
    justifyContent: 'center'
  },
  pickerArrowModal: {
    position: 'absolute',
    right: 12,
    top: 15
  },
  pickerTouchModal: {
    paddingLeft: 12,
    paddingRight: 30,
    height: '100%',
    justifyContent: 'center'
  },
  pickerTextModal: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '700'
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.s
  },
  inputCol: {
    flex: 1
  },

  // Status Colors
  statusDefault: {
    backgroundColor: '#F5F5F5',
    color: Colors.textSecondary
  },
  statusDelivered: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32'
  },
  statusShipped: {
    backgroundColor: '#E3F2FD',
    color: '#1565C0'
  },
  statusArrivedBranch: {
    backgroundColor: '#E8EAF6',
    color: '#283593'
  },
  statusFailed: {
    backgroundColor: '#FFEBEE',
    color: '#C62828'
  },
  statusHold: {
    backgroundColor: '#FFF8E1',
    color: '#FF8F00'
  },
  statusReturnProcess: {
    backgroundColor: '#F3E5F5',
    color: '#6A1B9A'
  },
  statusReturnDelivered: {
    backgroundColor: '#ECEFF1',
    color: '#37474F'
  },
  badgeStyle: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase'
  }
});
