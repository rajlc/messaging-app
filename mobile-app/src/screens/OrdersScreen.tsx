import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
  RefreshControl,
  BackHandler,
  Alert
} from 'react-native';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';
import RiderAssignmentModal from '../components/RiderAssignmentModal';
import { Colors, Spacing, Radius } from '../theme/theme';
import {
  ShoppingBag, Search, Plus, Calendar, Filter, Truck,
  MapPin, ChevronRight, ChevronLeft, X, User, Phone, ArrowRight,
  LayoutDashboard, List as ListIcon, BarChart3, PackageCheck,
  MessageCircle, Eye, CheckCircle2, ArrowLeftRight, RefreshCw, UserMinus
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../api/supabase';
import { format, startOfDay, endOfDay } from 'date-fns';

type TabType = 'Today' | 'Order' | 'Summary' | 'Logistics';
type SubTabType = 'Pending' | 'Confirmed' | 'Packed' | 'Shipped';
type ViewMode = 'dashboard' | 'list' | 'redirects';

export default function OrdersScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { token, user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [activeTab, setActiveTab] = useState<TabType>('Today');
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('Pending');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dashboard Stats
  const [stats, setStats] = useState({
    pending: 0,
    confirmed: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    totalToday: 0,
    shippedToday: 0,
    deliveredToday: 0,
    redirectCount: 0
  });

  const [logisticsStats, setLogisticsStats] = useState<any[]>([]);

  // Filter States for "Order" tab
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [logisticFilter, setLogisticFilter] = useState('');
  // Branch filter removed

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [tempDate, setTempDate] = useState(new Date());

  // Filter modal states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'status' | 'branch' | 'logistics' | null>(null);

  // Action states
  const [statusMenuOrder, setStatusMenuOrder] = useState<any | null>(null);
  const [assigningOrder, setAssigningOrder] = useState<any | null>(null);
  const [syncingOrderId, setSyncingOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Summary States
  const [summaryMode, setSummaryMode] = useState<'daily' | 'courier'>('daily');
  const [selectedDateForSummary, setSelectedDateForSummary] = useState<string | null>(null);
  const [detailedSummaryStatusFilter, setDetailedSummaryStatusFilter] = useState<string>('all');

  const logistics = ['Pathao', 'Pick & Drop', 'NCM', 'Local', 'Self Delivery'];
  const branches = ['Main Branch', 'Dhaka South', 'Chittagong'];
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
    'Return Delivered',
    'Cancelled',
    'Follow up again'
  ];

  useEffect(() => {
    if (viewMode === 'list' || viewMode === 'redirects') {
      fetchOrders();
      if (activeTab === 'Today') {
        fetchDashboardStats();
      }
    } else {
      fetchDashboardStats();
    }

    const channel = supabase
      .channel('orders_realtime_main')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (viewMode === 'list' || viewMode === 'redirects') {
          fetchOrders();
          if (activeTab === 'Today') fetchDashboardStats();
        } else {
          fetchDashboardStats();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewMode, activeTab, activeSubTab, statusFilter, logisticFilter, startDate, endDate, searchQuery, navigation]);

  useLayoutEffect(() => {
    // Signal tab bar visibility to parent navigator via params
    navigation.setParams({
      hideTabBar: viewMode === 'list' || viewMode === 'redirects' || !!selectedDateForSummary
    });

    return () => {
      navigation.setParams({
        hideTabBar: false
      });
    };
  }, [navigation, viewMode, selectedDateForSummary]);

  // Handle Tab Press
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setViewMode('dashboard');
    });
    return unsubscribe;
  }, [navigation]);


  // Reset Filters logic
  const resetFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setStatusFilter('');
    setLogisticFilter('');
    // We don't need to check activeTab here; clearing filters is safe.
  }, []);

  // Reset Filters on Screen Focus (Navigation Entry)
  useFocusEffect(
    useCallback(() => {
      resetFilters();
    }, [resetFilters])
  );

  // Handle Back Button - Only when focused
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedDateForSummary) {
          setSelectedDateForSummary(null);
          return true;
        }
        if (viewMode === 'list' || viewMode === 'redirects') {
          setViewMode('dashboard');
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [viewMode, selectedDateForSummary])
  );



  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();
      const today = new Date();

      // Fetch orders that were either created or updated today to capture all "work done today"
      const { data: allOrders, error } = await supabase
        .from('orders')
        .select('order_status, created_at, packed_at, shipped_at, delivered_at, order_status_history(*)')
        .or(`created_at.gte.${todayStart},updated_at.gte.${todayStart}`);

      if (error) throw error;

      const filtered = allOrders || [];
      const isSameDay = (d1: Date, d2: Date) =>
        d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();

      const counts = {
        // 1. Today's Orders (Created Today)
        pending: filtered.filter(o => 
          (o.order_status === 'New Order' || o.order_status === 'Follow up again') && 
          isSameDay(new Date(o.created_at), today)
        ).length,
        confirmed: filtered.filter(o => 
          o.order_status === 'Confirmed Order' && 
          isSameDay(new Date(o.created_at), today)
        ).length,
        packed: filtered.filter(o => 
          (o.order_status === 'Packed' || o.order_status === 'Ready to Ship') && 
          isSameDay(new Date(o.created_at), today)
        ).length,
        shipped: filtered.filter(o => 
          o.order_status === 'Shipped' && 
          isSameDay(new Date(o.created_at), today)
        ).length,

        // 2. Work Done Today (Action happened today)
        shippedToday: filtered.filter(o => {
          if (o.shipped_at) return isSameDay(new Date(o.shipped_at), today);
          return (o.order_status_history || []).some((h: any) => 
            h.status?.trim() === 'Shipped' && 
            isSameDay(new Date(h.changed_at), today)
          );
        }).length,
        deliveredToday: filtered.filter(o => {
          if (o.delivered_at) return isSameDay(new Date(o.delivered_at), today);
          return (o.order_status_history || []).some((h: any) => 
            h.status?.trim() === 'Delivered' && 
            isSameDay(new Date(h.changed_at), today)
          );
        }).length,
        
        delivered: filtered.filter(o => 
          o.order_status === 'Delivered' && 
          isSameDay(new Date(o.created_at), today)
        ).length,
        
        totalToday: filtered.filter((o: any) => isSameDay(new Date(o.created_at), today)).length,
        redirectCount: filtered.filter((o: any) => ['Delivery Failed', 'Hold', 'Return Process'].includes(o.order_status)).length
      };
      setStats(counts);

      // Fetch ALL redirects (not just today's) for the badge count to be accurate
      const { data: redirData } = await supabase
        .from('orders')
        .select('id')
        .in('order_status', ['Delivery Failed', 'Hold', 'Return Process']);
      
      if (redirData) {
        setStats(prev => ({ ...prev, redirectCount: redirData.length }));
      }

      // Logistics Stats
      const providers = [
        { id: 'pathao', name: 'Pathao' },
        { id: 'pickdrop', name: 'Pick & Drop' },
        { id: 'ncm', name: 'NCM' },
        { id: 'local', name: 'Local' },
        { id: 'self', name: 'Self Delivery' }
      ];

      // We need a wider fetch for "Pending" as it includes older orders
      const { data: pendingCourierData } = await supabase
        .from('orders')
        .select('courier_provider, courier_consignment_id, pickdrop_order_id, order_status')
        .not('order_status', 'in', '("Delivered","Cancelled","Return Delivered")')
        .or('courier_consignment_id.neq.null,pickdrop_order_id.neq.null');

      const lStats = providers.map(p => {
        // Today's Shipped/Delivered for this provider (from filtered today's orders)
        const shippedToday = filtered.filter((o: any) => 
          (o.courier_provider?.toLowerCase() === p.id) &&
          (o.shipped_at ? isSameDay(new Date(o.shipped_at), today) : 
           (o.order_status_history || []).some((h: any) => h.status?.trim() === 'Shipped' && isSameDay(new Date(h.changed_at), today)))
        ).length;

        const deliveredToday = filtered.filter((o: any) => 
          (o.courier_provider?.toLowerCase() === p.id) &&
          (o.delivered_at ? isSameDay(new Date(o.delivered_at), today) : 
           (o.order_status_history || []).some((h: any) => h.status?.trim() === 'Delivered' && isSameDay(new Date(h.changed_at), today)))
        ).length;

        // Pending in Courier (all-time active)
        const pending = (pendingCourierData || []).filter(o => o.courier_provider?.toLowerCase() === p.id).length;

        return {
          name: p.name,
          shipped: shippedToday,
          delivered: deliveredToday,
          pending: pending
        };
      });
      setLogisticsStats(lStats);

    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Order Summary Logic ---

  const dailyReportData = useMemo(() => {
    const report: Record<string, {
      date: string,
      shipped: number,
      delivered: number,
      returnDelivered: number
    }> = {};

    orders.forEach(order => {
      const history = order.order_status_history || [];
      history.forEach((h: any) => {
        const actionDate = new Date(h.changed_at);
        const dateKey = actionDate.toLocaleDateString();

        if (!report[dateKey]) {
          report[dateKey] = {
            date: dateKey,
            shipped: 0,
            delivered: 0,
            returnDelivered: 0
          };
        }

        const status = (h.status || '').trim();
        if (status === 'Shipped') report[dateKey].shipped++;
        if (status === 'Delivered') report[dateKey].delivered++;
        if (status === 'Return Delivered') report[dateKey].returnDelivered++;
      });
    });

    return Object.values(report).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

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

  const detailedSummaryOrders = useMemo(() => {
    if (!selectedDateForSummary) return [];

    return orders.filter(order => {
      const history = order.order_status_history || [];
      return history.some((h: any) => {
        const actionDate = new Date(h.changed_at).toLocaleDateString();
        const status = (h.status || '').trim();

        if (actionDate !== selectedDateForSummary) return false;

        if (detailedSummaryStatusFilter === 'all') {
          return ['Shipped', 'Delivered', 'Return Delivered'].includes(status);
        }

        const filterMap: Record<string, string[]> = {
          'Shipped': ['Shipped'],
          'Delivered': ['Delivered'],
          'Return Delivered': ['Return Delivered']
        };

        return filterMap[detailedSummaryStatusFilter]?.includes(status);
      });
    });
  }, [orders, selectedDateForSummary, detailedSummaryStatusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase.from('orders').select('*, order_status_history(*)');

      if (viewMode === 'redirects') {
        query = query.in('order_status', ['Delivery Failed', 'Hold', 'Return Process']);
      } else if (activeTab === 'Today') {
        if (activeSubTab === 'Pending') {
          query = query.in('order_status', ['New Order', 'Follow up again']);
        } else if (activeSubTab === 'Confirmed') {
          query = query.eq('order_status', 'Confirmed Order');
        } else if (activeSubTab === 'Packed') {
          query = query.in('order_status', ['Ready to Ship', 'Packed']);
        } else if (activeSubTab === 'Shipped') {
          query = query.eq('order_status', 'Shipped');
        }
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      let finalData = data || [];

      // Local filter for Packed sub-tab (history check)
      if (activeTab === 'Today' && activeSubTab === 'Packed') {
        const today = new Date();
        const isSameDay = (d1: Date, d2: Date) =>
          d1.getDate() === d2.getDate() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getFullYear() === d2.getFullYear();

        finalData = finalData.filter(o => {
          if (o.packed_at) return isSameDay(new Date(o.packed_at), today);
          return (o.order_status_history || []).some((h: any) => {
            const hStatus = (h.status || '').trim();
            return (hStatus === 'Ready to Ship' || hStatus === 'Packed') && isSameDay(new Date(h.changed_at), today);
          });
        });
      }

      // Local filter for Shipped sub-tab — shipped_at OR status_history fallback
      if (activeTab === 'Today' && activeSubTab === 'Shipped') {
        const today = new Date();
        const isSameDay = (d1: Date, d2: Date) =>
          d1.getDate() === d2.getDate() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getFullYear() === d2.getFullYear();

        finalData = finalData.filter(o => {
          // Check shipped_at first (courier API sets this)
          if (o.shipped_at && isSameDay(new Date(o.shipped_at), today)) return true;
          // Fallback: check audit trail for 'Shipped' changed today
          return (o.order_status_history || []).some((h: any) => {
            return (h.status || '').trim() === 'Shipped' && isSameDay(new Date(h.changed_at), today);
          });
        });
      }

      // Client-side filter for Product Name in JSON 'items'
      if (searchQuery && activeTab === 'Order') {
        const lowerQ = searchQuery.toLowerCase();
        finalData = finalData.filter(item => {
          // Check if already matched by server (optimization)
          const matchedServer =
            (item.customer_name?.toLowerCase().includes(lowerQ)) ||
            (item.address?.toLowerCase().includes(lowerQ)) ||
            (item.order_number?.toLowerCase().includes(lowerQ));

          if (matchedServer) return true;

          // Check items array
          const items = item.items || [];
          const productMatch = items.some((i: any) => i.product_name?.toLowerCase().includes(lowerQ));
          return productMatch;
        });
      }

      setOrders(finalData);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const openFilterModal = (type: 'status' | 'branch' | 'logistics') => {
    setFilterType(type);
    setFilterModalVisible(true);
  };

  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase
                .from('orders')
                .update({ order_status: 'Cancelled', updated_at: new Date().toISOString() })
                .eq('id', orderId);

              if (error) throw error;
              // Refresh list
              fetchOrders();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleConfirmOrder = (order: any) => {
    // Navigate to Details for editing/confirmation
    navigation.navigate('OrderDetails', { orderId: order.id, mode: 'edit' });
  };

  const handleViewChat = (order: any) => {
    if (order.conversation_id) {
      navigation.navigate('ChatDetail', {
        conversationId: order.conversation_id,
        customerId: order.customer_id,
        customerName: order.customer_name,
        platform: order.platform,
        pageName: order.page_name
      });
    } else {
      Alert.alert('Manual Order', 'This order was created manually and is not linked to a chat conversation.');
    }
  };

  const handleShipOrder = async (orderId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'editor') {
      Alert.alert('Permission Denied', 'You do not have permission to ship orders.');
      return;
    }

    Alert.alert(
      'Ship Order',
      'Are you sure you want to ship this order via Pathao?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ship Now',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await axios.post(`${API_URL}/api/logistics/ship`, { orderId }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (response.data.success) {
                Alert.alert('Success', 'Order shipped successfully! Consignment ID: ' + response.data.data.consignment_id);
                fetchOrders();
              }
            } catch (error: any) {
              console.error('Failed to ship order', error);
              Alert.alert('Error', 'Failed to ship order: ' + (error.response?.data?.message || error.message));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePickDropShip = async (orderId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'editor') {
      Alert.alert('Permission Denied', 'You do not have permission to ship orders.');
      return;
    }

    Alert.alert(
      'Ship Order',
      'Ship this order via Pick & Drop?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ship Now',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await axios.post(`${API_URL}/api/logistics/pickdrop/ship`, { orderId }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.data?.success) {
                const d = res.data.data;
                Alert.alert('Success', `✅ Shipped via Pick & Drop!\nPND Order ID: ${d.pndOrderId}`);
                fetchOrders();
              } else {
                Alert.alert('Error', 'Failed: ' + (res.data?.error || 'Unknown error'));
              }
            } catch (error: any) {
              console.error('Failed to ship via Pick & Drop', error);
              Alert.alert('Error', 'Failed: ' + (error.response?.data?.message || error.message));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleNCMShip = async (orderId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'editor') {
      Alert.alert('Permission Denied', 'You do not have permission to ship orders.');
      return;
    }

    Alert.alert(
      'Ship Order',
      'Ship this order via Nepal Can Move (NCM)?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ship Now',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await axios.post(`${API_URL}/api/logistics/ncm/ship`, { orderId }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.data?.success) {
                Alert.alert('Success', `✅ Shipped via NCM!\nConsignment ID: ${res.data.orderId}`);
                fetchOrders();
              } else {
                Alert.alert('Error', 'Failed: ' + (res.data?.error || 'Unknown error'));
              }
            } catch (error: any) {
              console.error('Failed to ship via NCM', error);
              Alert.alert('Error', 'Failed: ' + (error.response?.data?.message || error.message));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const onManualStatusChange = async (orderId: string, newStatus: string) => {
    Alert.alert(
      'Change Status',
      `Are you sure you want to change the order status to "${newStatus}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.put(`${API_URL}/api/orders/${orderId}`, {
                order_status: newStatus
              }, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              fetchOrders();
              setStatusMenuOrder(null);
            } catch (error) {
              console.error('Failed to update status', error);
              Alert.alert('Error', 'Failed to update status');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleSyncPickDrop = async (orderId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'editor') return;
    setSyncingOrderId(orderId);
    try {
      const response = await axios.post(`${API_URL}/api/logistics/pickdrop/status-sync`,
        { orderId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.data.success) {
        if (response.data.data.newStatus) {
          Alert.alert('Success', `✅ Sync complete! Status updated to: ${response.data.data.newStatus}`);
          fetchOrders();
        } else {
          Alert.alert('Info', 'ℹ️ Status is already up to date.');
        }
      }
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleSyncNcm = async (orderId: string) => {
    if (user?.role !== 'admin' && user?.role !== 'editor') return;
    setSyncingOrderId(orderId);
    try {
      const response = await axios.post(`${API_URL}/api/logistics/ncm/status-sync`,
        { orderId },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.data.success) {
        if (response.data.newStatus) {
          Alert.alert('Success', `✅ Sync complete! Status updated to: ${response.data.newStatus}`);
          fetchOrders();
        } else {
          Alert.alert('Info', 'ℹ️ Status is already up to date.');
        }
      }
    } catch (error) {
      console.error('Sync failed', error);
    } finally {
      setSyncingOrderId(null);
    }
  };

  const handleUnassignRider = async (orderId: string) => {
    Alert.alert(
      'Unassign Rider',
      'Are you sure you want to unassign the rider? The order status will revert to Confirmed Order.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await axios.post(`${API_URL}/api/orders/${orderId}/cancel-assignment`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              fetchOrders();
            } catch (error: any) {
              console.error('Failed to unassign rider', error);
              Alert.alert('Error', 'Failed to unassign: ' + (error.response?.data?.message || error.message));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      if (prev.includes(orderId)) {
        const next = prev.filter(id => id !== orderId);
        if (next.length === 0) setSelectionMode(false);
        return next;
      } else {
        return [...prev, orderId];
      }
    });
  };

  const handleBulkShip = async () => {
    const selectedList = orders.filter(o => selectedOrderIds.includes(o.id));
    if (selectedList.length === 0) return;

    // Check if all selected orders have the same courier provider
    const providers = new Set(selectedList.map(o => o.courier_provider));
    if (providers.size > 1) {
      Alert.alert('Selection Error', 'Please select orders from only ONE courier provider (Pathao, Pick & Drop, or NCM) for bulk shipping.');
      return;
    }

    const provider = Array.from(providers)[0];
    if (!['pathao', 'pickdrop', 'ncm'].includes(provider)) {
      Alert.alert('Selection Error', 'Bulk shipping is only available for Pathao, Pick & Drop, and NCM orders.');
      return;
    }

    Alert.alert(
      'Bulk Shipping',
      `Are you sure you want to bulk ship ${selectedList.length} orders via ${provider.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ship All',
          onPress: async () => {
            setLoading(true);
            let successCount = 0;
            let failCount = 0;

            for (const order of selectedList) {
              try {
                let endpoint = '';
                if (provider === 'pathao') endpoint = `${API_URL}/api/logistics/ship`;
                else if (provider === 'pickdrop') endpoint = `${API_URL}/api/logistics/pickdrop/ship`;
                else if (provider === 'ncm') endpoint = `${API_URL}/api/logistics/ncm/ship`;

                if (!endpoint) continue;

                const response = await axios.post(endpoint, { orderId: order.id }, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.data.success) successCount++;
                else failCount++;
              } catch (err) {
                failCount++;
              }
            }

            setLoading(false);
            Alert.alert('Bulk Process Complete', `✅ Success: ${successCount}\n❌ Failed: ${failCount}`);
            setSelectedOrderIds([]);
            setSelectionMode(false);
            fetchOrders();
            fetchDashboardStats();
          }
        }
      ]
    );
  };

  const applyFilter = (value: string) => {
    if (filterType === 'status') setStatusFilter(value);
    else if (filterType === 'logistics') setLogisticFilter(value);
    setFilterModalVisible(false);
  };

  const renderDashboard = () => (
    <ScrollView
      style={styles.dashboardContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchDashboardStats().finally(() => setIsRefreshing(false));
          }}
        />
      }
    >
      {/* 1. Today Order Summary (Moved to Top) */}
      <View style={[styles.summarySection, { marginTop: Spacing.m }]}>
        <Text style={styles.sectionHeader}>Today Order Summary</Text>
        <View style={styles.summaryGrid2x2}>
          <SummaryCard 
            label="Pending" 
            count={stats.pending} 
            color="#854D0E" bg="#FEF9C3" 
            style={{ width: '48%' }} 
            onPress={() => { setViewMode('list'); setActiveTab('Today'); setActiveSubTab('Pending'); }}
          />
          <SummaryCard 
            label="Confirmed" 
            count={stats.confirmed} 
            color="#1E40AF" bg="#DBEAFE" 
            style={{ width: '48%' }} 
            onPress={() => { setViewMode('list'); setActiveTab('Today'); setActiveSubTab('Confirmed'); }}
          />
          <SummaryCard 
            label="Packed" 
            count={stats.packed} 
            color="#92400E" bg="#FFEDD5" 
            style={{ width: '48%' }} 
            onPress={() => { setViewMode('list'); setActiveTab('Today'); setActiveSubTab('Packed'); }}
          />
          <SummaryCard 
            label="Shipped" 
            count={stats.shipped} 
            color="#4338CA" bg="#E0E7FF" 
            style={{ width: '48%' }} 
            onPress={() => { setViewMode('list'); setActiveTab('Today'); setActiveSubTab('Shipped'); }}
          />
        </View>
      </View>

      {/* Possible Redirect Box (Kept near summary) */}
      <TouchableOpacity 
        style={styles.redirectBox}
        onPress={() => setViewMode('redirects')}
      >
        <View style={styles.redirectContent}>
          <Text style={styles.redirectLabel}>Possible Redirect</Text>
          <Text style={styles.redirectCount}>{stats.redirectCount || 0}</Text>
        </View>
        <ArrowRight size={24} color={Colors.primary} />
      </TouchableOpacity>

      {/* 2. View Details Button (Below Summary) */}
      <TouchableOpacity
        style={styles.viewDetailsButton}
        onPress={() => setViewMode('list')}
      >
        <Text style={styles.viewDetailsText}>View Order Details</Text>
        <ArrowRight size={20} color={Colors.primary} />
      </TouchableOpacity>

      {/* Today Work Summary (New Section) */}
      <View style={styles.workDoneSection}>
        <View style={[styles.workStatBox, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
          <Text style={styles.workStatLabel}>Today Shipped Order</Text>
          <Text style={[styles.workStatCount, { color: '#0369A1' }]}>{stats.shippedToday}</Text>
        </View>
        <View style={[styles.workStatBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Text style={styles.workStatLabel}>Today Delivered Order</Text>
          <Text style={[styles.workStatCount, { color: '#15803D' }]}>{stats.deliveredToday}</Text>
        </View>
      </View>

      {/* 3. Shortcuts (Below Button) */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionHeader}>Shortcuts</Text>
        <TouchableOpacity
          style={styles.shortcutItem}
          onPress={() => navigation.navigate('CreateOrder', {})}
        >
          <View style={styles.shortcutIconBox}>
            <Plus size={24} color={Colors.white} />
          </View>
          <Text style={styles.shortcutText}>Add Order</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Logistics Summary (Bottom) */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionHeader}>Logistics Summary</Text>
        {logisticsStats.map((item, index) => (
          <View key={index} style={styles.logisticCard}>
            <Text style={styles.logisticName}>{item.name}</Text>
            <View style={styles.logisticStatsRow}>
              <LogisticStat label="Today Ship" count={item.shipped} color="#4338CA" />
              <LogisticStat label="Today Deliver" count={item.delivered} color="#166534" />
              <LogisticStat label="Pending" count={item.pending} color="#991B1B" />
            </View>
          </View>
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderFooterNavigation = () => {
    if (selectedDateForSummary) return null;
    return (
      <View style={[styles.footerNav, { paddingBottom: insets.bottom + 5, height: 60 + insets.bottom }]}>
      {(['Today', 'Order', 'Summary', 'Logistics'] as TabType[]).map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.footerNavItem, isActive && styles.footerNavItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            {tab === 'Today' && <Calendar size={20} color={isActive ? '#16A34A' : Colors.textSecondary} />}
            {tab === 'Order' && <ListIcon size={20} color={isActive ? '#16A34A' : Colors.textSecondary} />}
            {tab === 'Summary' && <BarChart3 size={20} color={isActive ? '#16A34A' : Colors.textSecondary} />}
            {tab === 'Logistics' && <Truck size={20} color={isActive ? '#16A34A' : Colors.textSecondary} />}
            <Text style={[styles.footerNavText, isActive && styles.footerNavTextActive]}>{tab}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    );
  };

  const SummaryCard = ({ label, count, color, bg, style, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.summaryCard, { backgroundColor: bg }, style]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.cardCount, { color }]}>{count}</Text>
      <Text style={[styles.cardLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );

  const LogisticStat = ({ label, count, color }: any) => (
    <View style={[styles.logStatBox, { borderColor: color + '40' }]}>
      <Text style={[styles.logStatCount, { color }]}>{count}</Text>
      <Text style={[styles.logStatLabel, { color }]}>{label}</Text>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select {filterType}</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {(filterType === 'status' ? orderStatuses : logistics).map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.modalItem}
                onPress={() => applyFilter(item)}
              >
                <Text style={[
                  styles.modalItemText,
                  (item === statusFilter || item === logisticFilter) && styles.activeModalItemText
                ]}>{item}</Text>
                {(item === statusFilter || item === logisticFilter) && (
                  <View style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderStatusMenuModal = () => (
    <Modal
      visible={!!statusMenuOrder}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setStatusMenuOrder(null)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setStatusMenuOrder(null)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Change Status</Text>
              <Text style={[styles.modalTitle, { fontSize: 12, color: Colors.textSecondary, fontWeight: 'normal', marginTop: 2 }]}>
                Order #{statusMenuOrder?.order_number}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setStatusMenuOrder(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {orderStatuses.map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.modalItem}
                onPress={() => statusMenuOrder && onManualStatusChange(statusMenuOrder.id, status)}
              >
                <Text style={[
                  styles.modalItemText,
                  status === statusMenuOrder?.order_status && styles.activeModalItemText
                ]}>{status}</Text>
                {status === statusMenuOrder?.order_status && (
                  <CheckCircle2 size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderOrderItem = ({ item }: { item: any }) => {
    // Parse items to get product name
    const itemsList = item.items || [];
    const productName = itemsList.length > 0 ? itemsList[0].product_name : 'No Product';
    const otherItemsCount = itemsList.length - 1;
    const displayProduct = otherItemsCount > 0 ? `${productName} +${otherItemsCount}` : productName;

    const isManual = !item.conversation_id;
    const isConfirmed = item.order_status === 'Confirmed Order';
    const isShipped = item.order_status === 'Shipped';
    const isNew = item.order_status === 'New Order';

    // Total qty across all items
    const totalQty = itemsList.reduce((sum: number, i: any) => sum + (parseInt(i.qty) || 0), 0);

    // Logistic badge: hide only for New Order and Cancel/Cancelled
    const hideLogistic =
      item.order_status === 'New Order' ||
      item.order_status === 'Cancel' ||
      item.order_status === 'Cancelled';
    const provider = item.courier_provider || '';
    const logisticBadge = getLogisticBadge(provider, item.logistic_name);

    const isSelected = selectedOrderIds.includes(item.id);

    return (
      <TouchableOpacity
        style={[styles.orderCard, isSelected && styles.selectedOrderCard]}
        onPress={() => {
          if (selectionMode) {
            toggleOrderSelection(item.id);
          } else {
            navigation.navigate('OrderView', { orderId: item.id });
          }
        }}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            toggleOrderSelection(item.id);
          }
        }}
        activeOpacity={0.9}
      >
        {selectionMode && (
          <View style={styles.selectionOverlay}>
            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
              {isSelected && <CheckCircle2 size={20} color={Colors.white} />}
            </View>
          </View>
        )}
        {/* Row 1: Order # | Date | Status */}
        <View style={styles.orderCardRow}>
          <Text style={styles.orderNumber}>{item.order_number}</Text>
          <View style={styles.dateContainer}>
            <Calendar size={12} color={Colors.textSecondary} />
            <Text style={styles.dateText}>{format(new Date(item.created_at), 'MMM dd, p')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBg(item.order_status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.order_status) }]}>
              {item.order_status}
            </Text>
          </View>
        </View>

        {/* Row 2: Customer Name | Product Name + Qty */}
        <View style={[styles.orderCardRow, { marginTop: 8 }]}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={styles.iconTextRow}>
              <User size={14} color={Colors.textSecondary} />
              <Text style={styles.customerName} numberOfLines={1}>{item.customer_name}</Text>
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={[styles.iconTextRow, { flexWrap: 'wrap', justifyContent: 'flex-end' }]}>
              <ShoppingBag size={14} color={Colors.primary} />
              <Text style={styles.productName} numberOfLines={1}>{displayProduct}</Text>
              {totalQty > 0 && (
                <View style={styles.qtyBadge}>
                  <Text style={styles.qtyBadgeText}>x{totalQty}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Row 3: Phone | Logistic Partner Badge */}
        <View style={[styles.orderCardRow, { marginTop: 6 }]}>
          <View style={styles.iconTextRow}>
            <Phone size={14} color={Colors.textSecondary} />
            <Text style={styles.detailText}>{item.phone_number}</Text>
          </View>
          {!hideLogistic && logisticBadge && (
            <View style={[styles.logisticBadge, { backgroundColor: logisticBadge.bg }]}>
              <Truck size={11} color={logisticBadge.color} />
              <Text style={[styles.logisticBadgeText, { color: logisticBadge.color }]}>
                {logisticBadge.label}
              </Text>
            </View>
          )}
        </View>

        {/* Row 4: Address | Total Amount */}
        <View style={[styles.orderCardRow, { marginTop: 4, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1, marginRight: 8, flexDirection: 'row' }}>
            <MapPin size={14} color={Colors.textSecondary} style={{ marginTop: 2, marginRight: 4 }} />
            <Text style={[styles.detailText, { flex: 1 }]} numberOfLines={2}>
              {item.address || 'No address'}
            </Text>
          </View>
          <Text style={styles.amountText}>NPR {item.total_amount}</Text>
        </View>

        {/* Row 5: Actions */}
        <View style={styles.actionRow}>
          {isNew && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              onPress={() => handleConfirmOrder(item)}
            >
              <CheckCircle2 size={16} color="#166534" />
              <Text style={[styles.actionButtonText, { color: '#166534' }]}>Confirm/Edit</Text>
            </TouchableOpacity>
          )}

          {isConfirmed && (
            <>
              {item.courier_provider === 'pathao' && !item.courier_consignment_id && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
                  onPress={() => handleShipOrder(item.id)}
                >
                  <Truck size={16} color="#B91C1C" />
                  <Text style={[styles.actionButtonText, { color: '#B91C1C' }]}>Ship Pathao</Text>
                </TouchableOpacity>
              )}

              {item.courier_provider === 'pickdrop' && !item.pickdrop_order_id && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}
                  onPress={() => handlePickDropShip(item.id)}
                >
                  <Truck size={16} color="#C2410C" />
                  <Text style={[styles.actionButtonText, { color: '#C2410C' }]}>Ship P&D</Text>
                </TouchableOpacity>
              )}

              {item.courier_provider === 'ncm' && !item.courier_consignment_id && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                  onPress={() => handleNCMShip(item.id)}
                >
                  <Truck size={16} color="#15803D" />
                  <Text style={[styles.actionButtonText, { color: '#15803D' }]}>Ship NCM</Text>
                </TouchableOpacity>
              )}

              {item.courier_provider === 'local' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
                  onPress={() => setStatusMenuOrder(item)}
                >
                  <ArrowLeftRight size={16} color="#4338CA" />
                  <Text style={[styles.actionButtonText, { color: '#4338CA' }]}>Change Status</Text>
                </TouchableOpacity>
              )}

              {item.courier_provider === 'self' && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}
                  onPress={() => setAssigningOrder(item)}
                >
                  <User size={16} color="#059669" />
                  <Text style={[styles.actionButtonText, { color: '#059669' }]}>Assign Rider</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {item.order_status === 'Ready to Ship' && item.courier_provider === 'pickdrop' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FFF7ED' }]}
              onPress={() => handleSyncPickDrop(item.id)}
              disabled={syncingOrderId === item.id}
            >
              <RefreshCw size={16} color="#C2410C" />
              <Text style={[styles.actionButtonText, { color: '#C2410C' }]}>Sync P&D</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'Shipped' && item.courier_provider === 'ncm' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#F0FDF4' }]}
              onPress={() => handleSyncNcm(item.id)}
              disabled={syncingOrderId === item.id}
            >
              <RefreshCw size={16} color="#15803D" />
              <Text style={[styles.actionButtonText, { color: '#15803D' }]}>Sync NCM</Text>
            </TouchableOpacity>
          )}

          {item.order_status === 'Packed' && item.courier_provider === 'self' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FEF2F2' }]}
              onPress={() => handleUnassignRider(item.id)}
            >
              <UserMinus size={16} color="#B91C1C" />
              <Text style={[styles.actionButtonText, { color: '#B91C1C' }]}>Unassign</Text>
            </TouchableOpacity>
          )}

          {(item.order_status === 'Packed' || item.order_status === 'Shipped') && item.courier_provider === 'local' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}
              onPress={() => setStatusMenuOrder(item)}
            >
              <ArrowLeftRight size={16} color="#4338CA" />
              <Text style={[styles.actionButtonText, { color: '#4338CA' }]}>Change Status</Text>
            </TouchableOpacity>
          )}

          {(isNew || isConfirmed) && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
              onPress={() => handleCancelOrder(item.id)}
            >
              <X size={16} color="#991B1B" />
              <Text style={[styles.actionButtonText, { color: '#991B1B' }]}>Cancel</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={() => navigation.navigate('OrderView', { orderId: item.id })}
          >
            <Eye size={16} color="#1E40AF" />
            <Text style={[styles.actionButtonText, { color: '#1E40AF' }]}>View</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'New Order': return '#FEF9C3';
      case 'Confirmed Order': return '#DBEAFE';
      case 'Shipped': return '#E0E7FF';
      case 'Delivered': return '#DCFCE7';
      case 'Returned': return '#FEE2E2';
      default: return '#F3F4F6';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New Order': return '#854D0E';
      case 'Confirmed Order': return '#1E40AF';
      case 'Shipped': return '#4338CA';
      case 'Delivered': return '#166534';
      case 'Returned': return '#991B1B';
      default: return '#374151';
    }
  };

  const getLogisticBadge = (provider: string, logisticName?: string) => {
    switch (provider) {
      case 'pathao':
        return { label: 'Pathao', bg: '#E0F2FE', color: '#0369A1' };
      case 'pickdrop':
        return { label: 'Pick & Drop', bg: '#FFF7ED', color: '#C2410C' };
      case 'ncm':
        return { label: 'NCM', bg: '#DCFCE7', color: '#15803D' };
      case 'local':
        return { label: logisticName ? `Local · ${logisticName}` : 'Local', bg: '#F3F4F6', color: '#374151' };
      case 'self':
        return { label: 'Self Delivery', bg: '#F5F3FF', color: '#7C3AED' };
      default:
        return provider ? { label: provider, bg: '#F3F4F6', color: '#374151' } : null;
    }
  };

  const renderSummary = () => {
    if (selectedDateForSummary) {
      return (
        <View style={styles.reportDetailContainer}>
          <View style={styles.reportDetailHeader}>
            <TouchableOpacity onPress={() => setSelectedDateForSummary(null)} style={styles.backButton}>
              <ArrowRight size={20} color={Colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
            <View>
              <Text style={styles.reportDetailTitle}>Daily Orders: {selectedDateForSummary}</Text>
              <Text style={styles.reportDetailSubtitle}>{detailedSummaryOrders.length} orders tracked</Text>
            </View>
          </View>

          <View style={styles.reportDetailFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['all', 'Shipped', 'Delivered', 'Return Delivered'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, detailedSummaryStatusFilter === status && styles.activeFilterChip]}
                  onPress={() => setDetailedSummaryStatusFilter(status)}
                >
                  <Text style={[styles.filterChipText, detailedSummaryStatusFilter === status && styles.activeFilterChipText]}>
                    {status === 'all' ? 'All Status' : status}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <FlatList
            data={detailedSummaryOrders}
            keyExtractor={(item) => item.id}
            renderItem={renderOrderItem}
            contentContainerStyle={{ padding: Spacing.m }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ShoppingBag size={48} color={Colors.border} />
                <Text style={styles.emptyText}>No orders found for this status</Text>
              </View>
            }
          />
        </View>
      );
    }

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryTabs}>
          <TouchableOpacity
            style={[styles.summaryTab, summaryMode === 'daily' && styles.activeSummaryTab]}
            onPress={() => setSummaryMode('daily')}
          >
            <Text style={[styles.summaryTabText, summaryMode === 'daily' && styles.activeSummaryTabText]}>Daily Report</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.summaryTab, summaryMode === 'courier' && styles.activeSummaryTab]}
            onPress={() => setSummaryMode('courier')}
          >
            <Text style={[styles.summaryTabText, summaryMode === 'courier' && styles.activeSummaryTabText]}>Courier Report</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                fetchOrders().finally(() => setIsRefreshing(false));
              }}
            />
          }
        >
          {summaryMode === 'daily' ? (
            <View style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={[styles.columnHeader, { flex: 1.5 }]}>Date</Text>
                <Text style={styles.columnHeader}>Shipped</Text>
                <Text style={styles.columnHeader}>Deliv.</Text>
                <Text style={styles.columnHeader}>Return</Text>
                <Text style={[styles.columnHeader, { width: 50 }]}>Act.</Text>
              </View>
              {dailyReportData.map((row, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.cellText, { flex: 1.5, fontWeight: 'bold' }]}>{row.date}</Text>
                  <Text style={[styles.cellText, { color: '#0891B2' }]}>{row.shipped}</Text>
                  <Text style={[styles.cellText, { color: '#059669' }]}>{row.delivered}</Text>
                  <Text style={[styles.cellText, { color: '#DC2626' }]}>{row.returnDelivered}</Text>
                  <TouchableOpacity
                    style={styles.eyeActionBtn}
                    onPress={() => setSelectedDateForSummary(row.date)}
                  >
                    <Eye size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.courierReportList}>
              {courierReportData.map((row, idx) => (
                <View key={idx} style={styles.courierReportCard}>
                  <View style={styles.courierCardHeader}>
                    <View style={styles.courierTitleRow}>
                      <Truck size={20} color={Colors.primary} />
                      <Text style={styles.courierCardTitle}>{row.provider}</Text>
                    </View>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeLabel}>PENDING</Text>
                      <Text style={styles.pendingBadgeCount}>{row.pendingInCourier}</Text>
                    </View>
                  </View>

                  <View style={styles.courierStatsGrid}>
                    <View style={styles.courierStatItem}>
                      <Text style={styles.courierStatValue}>{row.shipped}</Text>
                      <Text style={styles.courierStatName}>Shipped</Text>
                    </View>
                    <View style={styles.courierStatItem}>
                      <Text style={[styles.courierStatValue, { color: '#2563EB' }]}>{row.deliveryProcess}</Text>
                      <Text style={styles.courierStatName}>Deliv. Process</Text>
                    </View>
                    <View style={styles.courierStatItem}>
                      <Text style={[styles.courierStatValue, { color: '#059669' }]}>{row.delivered}</Text>
                      <Text style={styles.courierStatName}>Delivered</Text>
                    </View>
                    <View style={styles.courierStatItem}>
                      <Text style={[styles.courierStatValue, { color: '#DC2626' }]}>{row.deliveryFailed}</Text>
                      <Text style={styles.courierStatName}>Failed Deliv.</Text>
                    </View>
                    <View style={styles.courierStatItem}>
                      <Text style={[styles.courierStatValue, { color: '#D97706' }]}>{row.hold}</Text>
                      <Text style={styles.courierStatName}>Hold</Text>
                    </View>
                    <View style={styles.courierStatItem}>
                      <Text style={[styles.courierStatValue, { color: '#EA580C' }]}>{row.returnProcess}</Text>
                      <Text style={styles.courierStatName}>Ret. Process</Text>
                    </View>
                    <View style={styles.courierStatItem}>
                      <Text style={[styles.courierStatValue, { color: '#991B1B' }]}>{row.returnDelivered}</Text>
                      <Text style={styles.courierStatName}>Ret. Delivered</Text>
                    </View>
                  </View>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderRedirectsView = () => {
    const redirectOrders = orders.filter(o => 
      ['Delivery Failed', 'Hold', 'Return Process'].includes(o.order_status)
    );

    return (
      <View style={styles.container}>
        <View style={[styles.listHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setViewMode('dashboard')} style={styles.headerBackButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.listHeaderCenter}>
            <Text style={styles.listHeaderTitle}>Possible Redirects</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <FlatList
          data={redirectOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.orderList}
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchOrders().finally(() => setIsRefreshing(false));
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShoppingBag size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No redirects found</Text>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sticky Dashboard Header */}
      {viewMode === 'dashboard' && (
        <View style={[styles.stickyHeader, { paddingTop: insets.top }]}>
          <View style={styles.centerHeaderBox}>
            <Text style={styles.dashboardTitle}>Order Summary</Text>
          </View>
        </View>
      )}
      {/* List Mode Header */}
      {viewMode === 'list' && (
        <View style={[styles.listHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setViewMode('dashboard')} style={styles.headerBackButton}>
            <ChevronRight size={24} color={Colors.text} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <View style={styles.listHeaderCenter}>
            <Text style={styles.listHeaderTitle}>Order Details</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      )}

      {viewMode === 'dashboard' ? (
        renderDashboard()
      ) : viewMode === 'redirects' ? (
        renderRedirectsView()
      ) : (
        <>


          {activeTab === 'Today' && (
            <View style={styles.subTabsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
                {(['Pending', 'Confirmed', 'Packed', 'Shipped'] as SubTabType[]).map((subTab) => {
                  const count =
                    subTab === 'Pending' ? stats.pending :
                      subTab === 'Confirmed' ? stats.confirmed :
                        subTab === 'Packed' ? stats.packed :
                          stats.shipped;

                  return (
                    <TouchableOpacity
                      key={subTab}
                      style={[styles.subTab, activeSubTab === subTab && styles.activeSubTab]}
                      onPress={() => setActiveSubTab(subTab)}
                    >
                      <Text style={[styles.subTabText, activeSubTab === subTab && styles.activeSubTabText]}>
                        {subTab} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {activeTab === 'Order' && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search product name or address..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={fetchOrders}
                />
                {/* Clear Button - Always show if any filter/search is active */}
                {(searchQuery || startDate || endDate || statusFilter || logisticFilter) ? (
                  <TouchableOpacity onPress={resetFilters}>
                    <X size={20} color={Colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.filtersContainer}>
                {/* Filters Row 1: Dates & Status */}
                <TouchableOpacity style={styles.filterChip} onPress={() => { setDatePickerMode('start'); setShowDatePicker(true); }}>
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.filterChipText}>{startDate ? format(new Date(startDate), 'MMM dd') : 'Start'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.filterChip} onPress={() => { setDatePickerMode('end'); setShowDatePicker(true); }}>
                  <Calendar size={14} color={Colors.textSecondary} />
                  <Text style={styles.filterChipText}>{endDate ? format(new Date(endDate), 'MMM dd') : 'End'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.filterChip, statusFilter && styles.activeFilterChip]} onPress={() => openFilterModal('status')}>
                  <Filter size={14} color={statusFilter ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.filterChipText, statusFilter && styles.activeFilterChipText]}>
                    {statusFilter || 'Status'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.filterChip, logisticFilter && styles.activeFilterChip]} onPress={() => openFilterModal('logistics')}>
                  <Truck size={14} color={logisticFilter ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.filterChipText, logisticFilter && styles.activeFilterChipText]}>
                    {logisticFilter || 'Logistics'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {activeTab === 'Summary' && renderSummary()}

          {activeTab === 'Logistics' && (
            <View style={styles.placeholderContainer}>
              <ShoppingBag size={48} color={Colors.border} />
              <Text style={styles.placeholderTitle}>{activeTab} View</Text>
              <Text style={styles.placeholderSubtitle}>
                The {activeTab} view is currently being optimized for mobile.
                Please check the web dashboard for detailed reports.
              </Text>
            </View>
          )}

          {(activeTab === 'Today' || activeTab === 'Order') && (
            <View style={styles.content}>
              {selectionMode && (
                <View style={styles.selectionModeHeader}>
                  <View style={styles.selectionInfo}>
                    <TouchableOpacity onPress={() => { setSelectionMode(false); setSelectedOrderIds([]); }}>
                      <X size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.selectionCount}>{selectedOrderIds.length} Selected</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(() => {
                      const selectedList = orders.filter(o => selectedOrderIds.includes(o.id));
                      const providers = new Set(selectedList.map(o => o.courier_provider));
                      const provider = Array.from(providers)[0];

                      if (providers.size === 1 && (provider === 'pathao' || provider === 'pickdrop' || provider === 'ncm')) {
                        return (
                          <TouchableOpacity
                            style={[styles.bulkShipButton]}
                            onPress={handleBulkShip}
                          >
                            <Truck size={18} color={Colors.white} />
                            <Text style={styles.bulkShipText}>Bulk Ship</Text>
                          </TouchableOpacity>
                        );
                      }

                      if (providers.size === 1 && provider === 'self') {
                        return (
                          <TouchableOpacity
                            style={[styles.bulkShipButton, { backgroundColor: '#10B981' }]}
                            onPress={() => setAssigningOrder({ isBulk: true, ids: selectedOrderIds })}
                          >
                            <User size={18} color={Colors.white} />
                            <Text style={styles.bulkShipText}>Bulk Assign</Text>
                          </TouchableOpacity>
                        );
                      }

                      return null;
                    })()}
                  </View>
                </View>
              )}
              {loading && !isRefreshing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                </View>
              ) : (
                <FlatList
                  data={orders}
                  keyExtractor={(item) => item.id}
                  renderItem={renderOrderItem}
                  contentContainerStyle={styles.orderList}
                  refreshing={isRefreshing}
                  onRefresh={() => {
                    setIsRefreshing(true);
                    if (activeTab === 'Order') {
                      resetFilters();
                      // We just need to stop refreshing eventually.
                      setTimeout(() => setIsRefreshing(false), 1000);
                    } else {
                      fetchOrders().finally(() => setIsRefreshing(false));
                    }
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <ShoppingBag size={48} color={Colors.border} />
                      <Text style={styles.emptyText}>
                        {activeTab === 'Today' ? `No ${activeSubTab} orders today` : 'No orders found matching filters'}
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          )}
        </>
      )}

      {viewMode === 'list' && activeTab === 'Today' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 80 + insets.bottom }]}
          onPress={() => navigation.navigate('CreateOrder', {})}
        >
          <Plus size={32} color={Colors.white} />
        </TouchableOpacity>
      )}

      {viewMode === 'list' && !selectedDateForSummary && renderFooterNavigation()}
      
      {/* Modals */}
      {renderFilterModal()}
      {renderStatusMenuModal()}

      {assigningOrder && (
        <RiderAssignmentModal
          visible={!!assigningOrder}
          orderIds={assigningOrder.isBulk ? assigningOrder.ids : [assigningOrder.id]}
          orderNumber={assigningOrder.isBulk ? undefined : assigningOrder.order_number}
          token={token}
          onClose={() => setAssigningOrder(null)}
          onAssigned={() => {
            fetchOrders();
            if (assigningOrder.isBulk) {
              setSelectionMode(false);
              setSelectedOrderIds([]);
            }
          }}
        />
      )}

      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setTempDate(selectedDate);
              const dateStr = selectedDate.toISOString();
              if (datePickerMode === 'start') setStartDate(dateStr);
              else setEndDate(dateStr);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dashboardContainer: {
    flex: 1,
    padding: Spacing.m,
  },
  centerHeaderBox: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.m,
    paddingVertical: Spacing.s,
  },
  dashboardHeader: {
    marginBottom: Spacing.m,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  stickyHeader: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 0 : 0, // Placeholder, will set in style object
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    width: '100%',
    gap: 8,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    padding: Spacing.m,
    borderRadius: Radius.m,
    marginBottom: Spacing.l,
    width: '100%',
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  redirectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.m,
    borderRadius: Radius.m,
    marginBottom: Spacing.l,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  redirectContent: {
    flex: 1,
  },
  redirectLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  redirectCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  summarySection: {
    marginBottom: Spacing.l,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.m,
  },
  horizontalScrollContent: {
    paddingHorizontal: Spacing.m,
  },
  summaryContainer: {
    flex: 1,
  },
  summaryTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    margin: Spacing.m,
    padding: 4,
    borderRadius: Radius.m,
  },
  summaryTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.s,
  },
  activeSummaryTab: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeSummaryTabText: {
    color: Colors.primary,
  },
  tableCard: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.m,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  columnHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    textAlign: 'center',
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cellText: {
    fontSize: 13,
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
  },
  eyeActionBtn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportDetailContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  reportDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: Spacing.m,
    padding: 4,
  },
  reportDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  reportDetailSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  reportDetailFilters: {
    padding: Spacing.m,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '31%', // 3 per row
    paddingVertical: Spacing.m,
    paddingHorizontal: 4,
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  logisticCard: {
    backgroundColor: Colors.white,
    padding: Spacing.m,
    borderRadius: Radius.m,
    marginBottom: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logisticName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.s,
  },
  logisticStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logStatBox: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.s,
    paddingVertical: Spacing.s,
    marginHorizontal: 3,
  },
  logStatCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  shortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.m,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'flex-start',
  },
  shortcutIconBox: {
    backgroundColor: '#4ADE80',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.s,
  },
  shortcutText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listHeaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: Spacing.m,
    marginRight: Spacing.l,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.primary,
  },
  subTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.s,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  subTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginRight: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeSubTab: {
    backgroundColor: Colors.primary,
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeSubTabText: {
    color: Colors.white,
  },
  searchContainer: {
    backgroundColor: Colors.white,
    paddingBottom: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginHorizontal: Spacing.m,
    marginVertical: Spacing.s,
    paddingHorizontal: Spacing.s,
    height: 44,
    borderRadius: Radius.m,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.s,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.m,
    marginVertical: Spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    // Margin handled by gap in container, but for safety in older RN:
    marginBottom: 4,
  },
  activeFilterChip: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  activeFilterChipText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  orderList: {
    padding: Spacing.m,
    paddingBottom: 100, // Space for FAB
  },
  orderCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.m,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    backgroundColor: '#4ADE80', // light green (Tailwind green-400)
    width: 60,
    height: 50,
    borderRadius: 15, // rounded rectangle
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    zIndex: 999,
  },
  footerNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  footerNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  footerNavItemActive: {
    backgroundColor: '#F0FDF4', // Light green background hint
  },
  footerNavText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  footerNavTextActive: {
    color: '#16A34A', // Highlight green
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: Spacing.m,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.m,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.s,
    textAlign: 'center',
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
    padding: Spacing.m,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
    paddingBottom: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  activeModalItemText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  checkIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 2,
    borderRadius: Radius.s,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // New Order Card Styles
  orderCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  productName: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.text,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  // Qty badge next to product name
  qtyBadge: {
    marginLeft: 4,
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  qtyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  // Logistic partner badge
  logisticBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  logisticBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Selection Styles
  selectedOrderCard: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectionModeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  bulkShipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  disabledBulkButton: {
    backgroundColor: '#D1D5DB',
  },
  bulkShipText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  // Courier Report Card Styles
  courierReportList: {
    padding: Spacing.m,
  },
  courierReportCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.l,
    padding: Spacing.m,
    marginBottom: Spacing.m,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  courierCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.m,
    paddingBottom: Spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  courierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courierCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  pendingBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.s,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  pendingBadgeLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4338CA',
    letterSpacing: 0.5,
  },
  pendingBadgeCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4338CA',
  },
  courierStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  courierStatItem: {
    width: '30%', // roughly 3 per row
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  courierStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  courierStatName: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  summaryGrid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  workDoneSection: {
    flexDirection: 'row',
    marginHorizontal: Spacing.m,
    marginBottom: Spacing.m,
    gap: 10,
  },
  workStatBox: {
    flex: 1,
    padding: Spacing.m,
    borderRadius: Radius.m,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  workStatCount: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});
