import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '../theme/theme';
import { ChevronLeft, Wallet, Package, RefreshCw, X, User, DollarSign, Calendar, Plus, Check, XCircle, Search } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/config';
import axios from 'axios';

export default function AdminRiderDetailScreen({ navigation, route }: any) {
  const { rider } = route.params;
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingReturns, setPendingReturns] = useState<any[]>([]);
  const [assignedStock, setAssignedStock] = useState<any[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
  
  // Modal States
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  
  const [productSearchQuery, setProductSearchQuery] = useState('');
  
  // Form States
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [stockForm, setStockForm] = useState({
    productName: '',
    quantity: '',
    amount: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all orders to filter returns
      const ordersRes = await axios.get(`${API_URL}/api/orders/admin/delivery-list`, { headers });
      const returns = (ordersRes.data || []).filter((o: any) => 
        o.assigned_rider_id === rider.rider_id && 
        o.order_status !== 'Delivered' && 
        o.order_status !== 'delivered' &&
        o.order_status !== 'Returned Delivered'
      );
      setPendingReturns(returns);
      
      // Fetch rider stock
      const stockRes = await axios.get(`${API_URL}/api/rider-inventory/all`, { headers });
      const riderStock = (stockRes.data || []).filter((s: any) => 
        s.rider_id === rider.rider_id && (s.status === 'assigned' || s.status === 'return_pending')
      );
      setAssignedStock(riderStock);
      
      // Fetch inventory products for assignment
      const productsRes = await axios.get(`${API_URL}/api/orders/inventory-products`, { headers });
      setInventoryProducts(productsRes.data || []);
      
    } catch (error) {
      console.error('Failed to fetch rider detail data', error);
      Alert.alert('Error', 'Failed to load rider details');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, []);

  const handleAddSettlement = async () => {
    if (!settlementForm.amount || !settlementForm.date) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/settlements`, 
        {
          riderId: rider.rider_id,
          amount: parseFloat(settlementForm.amount),
          date: settlementForm.date
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsSettlementModalOpen(false);
      setSettlementForm({ amount: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
      Alert.alert('Success', 'Settlement recorded successfully');
    } catch (error) {
      console.error('Failed to add settlement', error);
      Alert.alert('Error', 'Failed to add settlement');
    }
  };

  const handleAssignStock = async () => {
    if (!stockForm.productName || !stockForm.quantity) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/rider-inventory/assign`, 
        {
          rider_id: rider.rider_id,
          product_name: stockForm.productName,
          quantity: parseInt(stockForm.quantity),
          amount: parseFloat(stockForm.amount || '0')
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsStockModalOpen(false);
      setStockForm({ productName: '', quantity: '', amount: '' });
      fetchData();
      Alert.alert('Success', 'Stock assigned successfully');
    } catch (error) {
      console.error('Failed to assign stock', error);
      Alert.alert('Error', 'Failed to assign stock');
    }
  };

  const handleApproveReturn = async (orderId: string) => {
    Alert.alert('Confirm Return', 'Mark this order as Returned Delivered (Received in Warehouse)?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Returned', onPress: async () => {
        try {
          await axios.post(`${API_URL}/api/orders/${orderId}/delivery-status`, 
            { status: 'Returned Delivered' },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          fetchData();
        } catch (error) {
          console.error('Failed to approve return', error);
          Alert.alert('Error', 'Failed to update order status');
        }
      }}
    ]);
  };

  const handleStockReturnAction = async (stockId: string, approve: boolean) => {
    const action = approve ? 'approve' : 'decline';
    const status = approve ? 'returned' : 'assigned';
    
    Alert.alert('Confirm Action', `Are you sure you want to ${action} this stock return?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: approve ? 'Approve' : 'Decline', style: approve ? 'default' : 'destructive', onPress: async () => {
        try {
          await axios.put(`${API_URL}/api/rider-inventory/${stockId}/status`, 
            { status },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          fetchData();
        } catch (error) {
          console.error('Failed to update stock return status', error);
          Alert.alert('Error', 'Failed to update stock status');
        }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={28} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{rider.rider_name}</Text>
          <Text style={styles.headerSubtitle}>Rider Detailed View</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.netPendingRow}>
            <Text style={styles.netLabel}>Net Pending Settlement</Text>
            <Text style={[styles.netValue, { color: rider.net_pending_settlement > 0 ? '#F59E0B' : '#10B981' }]}>
              Rs. {rider.net_pending_settlement.toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Amount</Text>
              <Text style={styles.statValue}>Rs. {rider.pending_amount.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: Colors.danger }]}>Returned</Text>
              <Text style={[styles.statValue, { color: Colors.danger }]}>Rs. {rider.returned_amount.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: '#10B981' }]}>Settled</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>Rs. {rider.settled_amount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => setIsSettlementModalOpen(true)}
          >
            <Wallet size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Add Settlement</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: Colors.secondary }]}
            onPress={() => setIsStockModalOpen(true)}
          >
            <Package size={20} color={Colors.white} />
            <Text style={styles.actionButtonText}>Assign Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Returns Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <RefreshCw size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Pending Orders ({pendingReturns.length})</Text>
          </View>
          
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : pendingReturns.length > 0 ? (
            pendingReturns.map((item) => (
              <View key={item.id} style={[styles.returnCard, item.order_status !== 'Return Process' && { borderLeftColor: Colors.primary, backgroundColor: '#F0F9FF' }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={styles.returnId}>#{item.order_number}</Text>
                    <View style={{ backgroundColor: item.order_status === 'Return Process' ? '#FEE2E2' : '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: item.order_status === 'Return Process' ? '#DC2626' : '#2563EB', textTransform: 'uppercase' }}>
                        {item.order_status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.returnCustomer}>{item.customer_name}</Text>
                  {item.items && item.items.length > 0 && (
                    <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 2, marginBottom: 4 }} numberOfLines={2}>
                      {item.items.map((i: any) => `${i.product_name || 'Product'} (x${i.quantity || i.qty || 1})`).join(', ')}
                    </Text>
                  )}
                  <Text style={styles.returnAmount}>Rs. {item.total_amount}</Text>
                </View>
                {['Return Process', 'Delivery Failed', 'Hold', 'Returning to Seller'].includes(item.order_status) && (
                  <TouchableOpacity 
                    style={styles.markReturnedBtn}
                    onPress={() => handleApproveReturn(item.id)}
                  >
                    <Text style={styles.markReturnedBtnText}>Approve Return</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No pending orders for this rider.</Text>
            </View>
          )}
        </View>

        {/* Assigned Stock Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={20} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Assigned Stock ({assignedStock.length})</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
          ) : assignedStock.length > 0 ? (
            <View style={styles.stockTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 2 }]}>Product</Text>
                <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.tableHeaderText, { flex: 2, textAlign: 'center' }]}>Action</Text>
              </View>
              {assignedStock.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={[styles.tableCellText, { flex: 2 }]} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={[styles.tableCellText, { flex: 1, textAlign: 'center', fontWeight: 'bold' }]}>{item.quantity}</Text>
                  <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', justifyContent: 'center', gap: 12 }]}>
                    {item.status === 'return_pending' ? (
                      <>
                        <TouchableOpacity 
                          style={[styles.smallActionBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => handleStockReturnAction(item.id, true)}
                        >
                          <Check size={14} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.smallActionBtn, { backgroundColor: Colors.danger }]}
                          onPress={() => handleStockReturnAction(item.id, false)}
                        >
                          <X size={14} color={Colors.white} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.assignedLabel}>Assigned</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyBoxText}>No stock assigned to this rider.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Settlement Modal */}
      <Modal visible={isSettlementModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Settlement</Text>
              <TouchableOpacity onPress={() => setIsSettlementModalOpen(false)}>
                <XCircle size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Amount (Rs)</Text>
              <View style={styles.inputWrapper}>
                <DollarSign size={18} color={Colors.textSecondary} />
                <TextInput 
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={settlementForm.amount}
                  onChangeText={(text) => setSettlementForm({...settlementForm, amount: text})}
                />
              </View>
              
              <Text style={styles.inputLabel}>Date</Text>
              <View style={styles.inputWrapper}>
                <Calendar size={18} color={Colors.textSecondary} />
                <TextInput 
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={settlementForm.date}
                  onChangeText={(text) => setSettlementForm({...settlementForm, date: text})}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleAddSettlement}>
                <Text style={styles.submitBtnText}>Record Settlement</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Stock Modal */}
      <Modal visible={isStockModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Stock</Text>
              <TouchableOpacity onPress={() => setIsStockModalOpen(false)}>
                <XCircle size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Select Product</Text>
              <TouchableOpacity 
                style={styles.inputWrapper}
                onPress={() => setIsProductSearchOpen(true)}
              >
                <Package size={18} color={Colors.textSecondary} />
                <Text style={[styles.input, { paddingVertical: 12, color: stockForm.productName ? Colors.text : '#999' }]}>
                  {stockForm.productName || 'Click to select product...'}
                </Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput 
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={stockForm.quantity}
                      onChangeText={(text) => setStockForm({...stockForm, quantity: text})}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Unit Amount</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput 
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="numeric"
                      value={stockForm.amount}
                      onChangeText={(text) => setStockForm({...stockForm, amount: text})}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: Colors.secondary }]} onPress={handleAssignStock}>
                <Text style={styles.submitBtnText}>Assign Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Search Modal */}
      <Modal visible={isProductSearchOpen} transparent animationType="fade">
        <View style={styles.searchModalOverlay}>
          <View style={styles.searchModalContent}>
            <View style={[styles.modalHeader, { paddingTop: insets.top + 10 }]}>
              <TouchableOpacity onPress={() => setIsProductSearchOpen(false)}>
                <ChevronLeft size={28} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Product</Text>
              <View style={{ width: 28 }} />
            </View>

            <View style={styles.searchBarContainer}>
              <Search size={20} color={Colors.textSecondary} />
              <TextInput 
                style={styles.searchBarInput}
                placeholder="Search products..."
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
                autoFocus
              />
              {productSearchQuery !== '' && (
                <TouchableOpacity onPress={() => setProductSearchQuery('')}>
                  <XCircle size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={inventoryProducts.filter(p => p.product_name.toLowerCase().includes(productSearchQuery.toLowerCase()))}
              keyExtractor={(item, idx) => idx.toString()}
              contentContainerStyle={{ padding: Spacing.m }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.productSearchItem}
                  onPress={() => {
                    setStockForm({...stockForm, productName: item.product_name});
                    setIsProductSearchOpen(false);
                    setProductSearchQuery('');
                  }}
                >
                  <Package size={20} color={Colors.textSecondary} />
                  <Text style={styles.productSearchItemText}>{item.product_name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={{ color: Colors.textSecondary }}>No products found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { padding: 5, marginRight: Spacing.s },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  headerSubtitle: { fontSize: 12, color: Colors.textSecondary },
  content: { flex: 1, padding: Spacing.m },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.l,
    padding: Spacing.l,
    marginBottom: Spacing.l,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  netPendingRow: { alignItems: 'center', marginBottom: Spacing.l, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.m },
  netLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  netValue: { fontSize: 32, fontWeight: 'bold' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, fontWeight: 'bold', color: Colors.textSecondary, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  actionButtonsRow: { flexDirection: 'row', gap: Spacing.m, marginBottom: Spacing.xl },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.m,
    elevation: 2,
  },
  actionButtonText: { color: Colors.white, fontWeight: 'bold', fontSize: 13 },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.m },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, textTransform: 'uppercase' },
  returnCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.m,
    padding: Spacing.m,
    marginBottom: Spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: Colors.danger,
  },
  returnId: { fontSize: 14, fontWeight: 'bold', color: Colors.primary },
  returnCustomer: { fontSize: 14, color: Colors.text },
  returnAmount: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary },
  markReturnedBtn: { backgroundColor: Colors.danger, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.s },
  markReturnedBtnText: { color: Colors.white, fontSize: 11, fontWeight: 'bold' },
  stockTable: { backgroundColor: Colors.white, borderRadius: Radius.m, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 10 },
  tableHeaderText: { fontSize: 10, fontWeight: 'bold', color: Colors.textSecondary, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'center' },
  tableCellText: { fontSize: 13, color: Colors.text },
  tableCell: { alignItems: 'center' },
  smallActionBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  assignedLabel: { fontSize: 10, color: Colors.textSecondary, fontStyle: 'italic' },
  emptyBox: { padding: 20, backgroundColor: '#F1F5F9', borderRadius: Radius.m, alignItems: 'center' },
  emptyBoxText: { fontSize: 12, color: Colors.textSecondary, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: Radius.l, borderTopRightRadius: Radius.l, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.l, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
  modalBody: { padding: Spacing.l },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: Radius.m,
    paddingHorizontal: 12,
    marginBottom: Spacing.m,
  },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: Colors.text, marginLeft: 8 },
  submitBtn: { backgroundColor: '#10B981', paddingVertical: 15, borderRadius: Radius.m, alignItems: 'center', marginTop: Spacing.m },
  submitBtnText: { color: Colors.white, fontWeight: 'bold', fontSize: 16 },
  productChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: '#F1F5F9', marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  activeProductChip: { backgroundColor: '#E3F2FD', borderColor: Colors.secondary },
  productChipText: { fontSize: 12, color: Colors.textSecondary },
  activeProductChipText: { color: Colors.secondary, fontWeight: 'bold' },
  searchModalOverlay: { flex: 1, backgroundColor: Colors.white },
  searchModalContent: { flex: 1 },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    margin: Spacing.m,
    paddingHorizontal: 12,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBarInput: { flex: 1, paddingVertical: 12, marginLeft: 10, fontSize: 16, color: Colors.text },
  productSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  productSearchItemText: { fontSize: 16, color: Colors.text },
});
