import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Modal,
    TextInput,
    Alert,
    ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ChevronLeft,
    Plus,
    Megaphone,
    DollarSign,
    Calendar,
    Clock,
    CheckCircle2,
    Edit3,
    Search,
    X,
    Check
} from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { API_URL } from '../api/config';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function AdsManagementScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { token } = useAuth();
    const [activeTab, setActiveTab] = useState<'spend' | 'campaign'>('spend');
    const [isLoading, setIsLoading] = useState(true);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [spends, setSpends] = useState<any[]>([]);

    // Modal states
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [isSpendModalOpen, setIsSpendModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            if (activeTab === 'campaign') {
                const res = await axios.get(`${API_URL}/api/ads-management/campaigns`, { headers });
                if (res.data.success) setCampaigns(res.data.data);
            } else {
                const res = await axios.get(`${API_URL}/api/ads-management/spends`, { headers });
                if (res.data.success) setSpends(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch ads management data:', error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const isEditable = (createdAt: string) => {
        const created = new Date(createdAt).getTime();
        const now = new Date().getTime();
        return (now - created) / (1000 * 60 * 60) <= 24;
    };

    const handleToggleStatus = async (campaign: any) => {
        if (campaign.is_virtual) return;
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const newStatus = campaign.status === 'On' ? 'Off' : 'On';
            const res = await axios.put(`${API_URL}/api/ads-management/campaigns/${campaign.id}`, {
                status: newStatus
            }, { headers });

            if (res.data.success) {
                setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: newStatus } : c));
            }
        } catch (error) {
            console.error('Failed to toggle status:', error);
        }
    };

    const renderSpendItem = ({ item }: { item: any }) => {
        const editable = isEditable(item.created_at);
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Calendar size={14} color={Colors.textSecondary} />
                        <Text style={styles.cardDate}>{item.date}</Text>
                    </View>
                    {editable ? (
                        <TouchableOpacity 
                            style={styles.editButton}
                            onPress={() => { setEditingItem(item); setIsSpendModalOpen(true); }}
                        >
                            <Edit3 size={14} color={Colors.secondary} />
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.lockedBadge}>
                            <CheckCircle2 size={12} color="#9CA3AF" />
                            <Text style={styles.lockedText}>Locked</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.campaignName}>{item.ads_campaigns?.name || 'Unknown'}</Text>
                <View style={styles.cardFooter}>
                    <Text style={styles.amountText}>Rs. {Number(item.amount).toLocaleString()}</Text>
                    <Text style={styles.remarksText} numberOfLines={1}>{item.remarks || '-'}</Text>
                </View>
            </View>
        );
    };

    const renderCampaignItem = ({ item }: { item: any }) => {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                        <Megaphone size={14} color={Colors.textSecondary} />
                        <Text style={styles.cardDate}>{item.start_date}</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => handleToggleStatus(item)}
                        style={[
                            styles.statusBadge,
                            { backgroundColor: item.status === 'On' ? '#E8F5E9' : '#FFEBEE' }
                        ]}
                    >
                        <Text style={[
                            styles.statusText,
                            { color: item.status === 'On' ? '#4CAF50' : '#F44336' }
                        ]}>
                            {item.status}
                        </Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.campaignName}>{item.name}</Text>
                <View style={styles.productContainer}>
                    {item.product_names?.map((p: string, idx: number) => (
                        <View key={idx} style={styles.productBadge}>
                            <Text style={styles.productBadgeText}>{p}</Text>
                        </View>
                    ))}
                </View>
                <View style={styles.cardFooter}>
                    <View>
                        <Text style={styles.labelSmall}>Total Spend</Text>
                        <Text style={styles.amountTextSmall}>Rs. {Number(item.total_spend || 0).toLocaleString()}</Text>
                    </View>
                </View>
            </View>
        );
    };


    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ads Management</Text>
                <View style={{ width: 24 }} />
            </View>




            {isLoading ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'spend' ? spends : campaigns}
                    renderItem={activeTab === 'spend' ? renderSpendItem : renderCampaignItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshing={isLoading}
                    onRefresh={fetchData}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No {activeTab === 'spend' ? 'spend records' : 'campaigns'} found</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Add Button */}
            {activeTab === 'spend' && (
                <View style={[styles.floatingActionContainer, { bottom: 85 + (insets.bottom > 0 ? insets.bottom : 0) }]}>
                    <TouchableOpacity 
                        style={styles.floatingAddButton}
                        onPress={() => {
                            setEditingItem(null);
                            setIsSpendModalOpen(true);
                        }}
                        activeOpacity={0.9}
                    >
                        <Plus size={28} color={Colors.white} />
                        <Text style={styles.floatingAddText}>Add Spend</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Footer Navigation */}
            <View style={[styles.footerNav, { paddingBottom: insets.bottom > 0 ? insets.bottom : 15 }]}>
                <TouchableOpacity
                    style={[styles.footerTab, activeTab === 'spend' && styles.activeFooterTab]}
                    onPress={() => setActiveTab('spend')}
                >
                    <DollarSign size={20} color={activeTab === 'spend' ? Colors.secondary : Colors.textSecondary} />
                    <Text style={[styles.footerTabText, activeTab === 'spend' && styles.activeFooterTabText]}>Ads Spend</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.footerTab, activeTab === 'campaign' && styles.activeFooterTab]}
                    onPress={() => setActiveTab('campaign')}
                >
                    <Megaphone size={20} color={activeTab === 'campaign' ? Colors.secondary : Colors.textSecondary} />
                    <Text style={[styles.footerTabText, activeTab === 'campaign' && styles.activeFooterTabText]}>Ads Campaign</Text>
                </TouchableOpacity>
            </View>


            {/* Modals will be implemented next */}
            <AddAdsCampaignModal 
                visible={isCampaignModalOpen}
                onClose={() => setIsCampaignModalOpen(false)}
                onSuccess={() => { fetchData(); setIsCampaignModalOpen(false); }}
                editingCampaign={editingItem}
            />
            <AddAdsSpendModal 
                visible={isSpendModalOpen}
                onClose={() => setIsSpendModalOpen(false)}
                onSuccess={() => { fetchData(); setIsSpendModalOpen(false); }}
                editingSpend={editingItem}
            />
        </View>
    );
}

// Sub-components (Modals)
function AddAdsCampaignModal({ visible, onClose, onSuccess, editingCampaign }: any) {
    const { token } = useAuth();
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
    const [allProducts, setAllProducts] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [status, setStatus] = useState<'On' | 'Off'>('On');
    const [showProductPicker, setShowProductPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchProducts();
            if (editingCampaign) {
                setName(editingCampaign.name);
                setStartDate(editingCampaign.start_date || new Date().toISOString().split('T')[0]);
                setEndDate(editingCampaign.end_date || '');
                setSelectedProducts(editingCampaign.product_names || []);
                setStatus(editingCampaign.status || 'On');
            } else {
                setName('');
                setStartDate(new Date().toISOString().split('T')[0]);
                setEndDate('');
                setSelectedProducts([]);
                setStatus('On');
            }
        }
    }, [visible, editingCampaign]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/orders/inventory-products?search=`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.success) {
                setAllProducts(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    const handleSubmit = async () => {
        if (!name) return Alert.alert('Error', 'Please enter campaign name');
        setIsSubmitting(true);
        try {
            const url = `${API_URL}/api/ads-management/campaigns${editingCampaign ? `/${editingCampaign.id}` : ''}`;
            const method = editingCampaign ? 'put' : 'post';
            const res = await axios[method](url, {
                name,
                start_date: startDate,
                end_date: endDate || null,
                product_names: selectedProducts,
                status
            }, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.data.success) onSuccess();
            else Alert.alert('Error', res.data.error || 'Failed to save');
        } catch (error) {
            Alert.alert('Error', 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}><X size={24} color={Colors.text} /></TouchableOpacity>
                    <Text style={styles.modalTitle}>{editingCampaign ? 'Edit Campaign' : 'Add Campaign'}</Text>
                    <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalContent}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Campaign Name</Text>
                        <TextInput 
                            style={styles.textInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter campaign name"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Start Date</Text>
                        <TextInput 
                            style={styles.textInput}
                            value={startDate}
                            onChangeText={setStartDate}
                            placeholder="YYYY-MM-DD"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Status</Text>
                        <View style={styles.statusToggleContainer}>
                            <TouchableOpacity 
                                style={[styles.statusToggle, status === 'On' && styles.statusToggleActive]}
                                onPress={() => setStatus('On')}
                            >
                                <Text style={[styles.statusToggleText, status === 'On' && styles.statusToggleTextActive]}>On</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.statusToggle, status === 'Off' && styles.statusToggleActive]}
                                onPress={() => {
                                    setStatus('Off');
                                    setEndDate(new Date().toISOString().split('T')[0]);
                                }}
                            >
                                <Text style={[styles.statusToggleText, status === 'Off' && styles.statusToggleTextActive]}>Off</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>End Date (Optional)</Text>
                        <TextInput 
                            style={styles.textInput}
                            value={endDate}
                            onChangeText={setEndDate}
                            placeholder="YYYY-MM-DD"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Products</Text>
                        <TouchableOpacity style={styles.productPickerTrigger} onPress={() => setShowProductPicker(true)}>
                            <Text style={styles.productPickerText}>
                                {selectedProducts.length > 0 ? selectedProducts.join(', ') : 'Select Products'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <Modal visible={showProductPicker} animationType="fade" transparent>
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerContent}>
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Select Products</Text>
                                <TouchableOpacity onPress={() => setShowProductPicker(false)}><X size={20} color={Colors.text} /></TouchableOpacity>
                            </View>
                            <TextInput 
                                style={styles.searchBar}
                                placeholder="Search products..."
                                value={productSearch}
                                onChangeText={setProductSearch}
                            />
                            <FlatList 
                                data={allProducts.filter(p => p.product_name.toLowerCase().includes(productSearch.toLowerCase()))}
                                keyExtractor={item => item.product_id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={styles.pickerItem}
                                        onPress={() => {
                                            if (selectedProducts.includes(item.product_name)) {
                                                setSelectedProducts(selectedProducts.filter(p => p !== item.product_name));
                                            } else {
                                                setSelectedProducts([...selectedProducts, item.product_name]);
                                            }
                                        }}
                                    >
                                        <Text style={styles.pickerItemText}>{item.product_name}</Text>
                                        {selectedProducts.includes(item.product_name) && <Check size={18} color={Colors.primary} />}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
            </View>
        </Modal>
    );
}

function AddAdsSpendModal({ visible, onClose, onSuccess, editingSpend }: any) {
    const { token } = useAuth();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [campaignId, setCampaignId] = useState('');
    const [amount, setAmount] = useState('');
    const [remarks, setRemarks] = useState('');
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCampaignPicker, setShowCampaignPicker] = useState(false);

    useEffect(() => {
        if (visible) {
            fetchCampaigns();
            if (editingSpend) {
                setDate(editingSpend.date);
                setCampaignId(editingSpend.campaign_id);
                setAmount(editingSpend.amount.toString());
                setRemarks(editingSpend.remarks || '');
            } else {
                setDate(new Date().toISOString().split('T')[0]);
                setCampaignId('');
                setAmount('');
                setRemarks('');
            }
        }
    }, [visible, editingSpend]);

    const fetchCampaigns = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/ads-management/campaigns`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data.success) {
                setCampaigns(res.data.data.filter((c: any) => c.status === 'On' && c.name !== 'No Ads Cost Campaign'));
            }

        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        }
    };

    const handleSubmit = async () => {
        if (!campaignId || !amount || !date) return Alert.alert('Error', 'Please fill all required fields');
        setIsSubmitting(true);
        try {
            const url = `${API_URL}/api/ads-management/spends${editingSpend ? `/${editingSpend.id}` : ''}`;
            const method = editingSpend ? 'put' : 'post';
            const res = await axios[method](url, {
                campaign_id: campaignId,
                date,
                amount: parseFloat(amount),
                remarks
            }, { headers: { 'Authorization': `Bearer ${token}` } });

            if (res.data.success) onSuccess();
            else Alert.alert('Error', res.data.error || 'Failed to save');
        } catch (error) {
            Alert.alert('Error', 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedCampaign = campaigns.find(c => c.id === campaignId);

    return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}><X size={24} color={Colors.text} /></TouchableOpacity>
                    <Text style={styles.modalTitle}>{editingSpend ? 'Edit Spend' : 'Add Spend'}</Text>
                    <TouchableOpacity onPress={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalContent}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date</Text>
                        <TextInput 
                            style={styles.textInput}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Amount (Rs.)</Text>
                        <TextInput 
                            style={styles.textInput}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Campaign</Text>
                        <TouchableOpacity style={styles.productPickerTrigger} onPress={() => setShowCampaignPicker(true)}>
                            <Text style={styles.productPickerText}>
                                {selectedCampaign ? selectedCampaign.name : 'Select Campaign'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Remarks</Text>
                        <TextInput 
                            style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                            value={remarks}
                            onChangeText={setRemarks}
                            placeholder="Add any details..."
                            multiline
                        />
                    </View>
                </ScrollView>

                <Modal visible={showCampaignPicker} animationType="fade" transparent>
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerContent}>
                            <View style={styles.pickerHeader}>
                                <Text style={styles.pickerTitle}>Select Campaign</Text>
                                <TouchableOpacity onPress={() => setShowCampaignPicker(false)}><X size={20} color={Colors.text} /></TouchableOpacity>
                            </View>
                            <FlatList 
                                data={campaigns}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={styles.pickerItem}
                                        onPress={() => {
                                            setCampaignId(item.id);
                                            setShowCampaignPicker(false);
                                        }}
                                    >
                                        <Text style={styles.pickerItemText}>{item.name}</Text>
                                        {campaignId === item.id && <Check size={18} color={Colors.primary} />}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
            </View>
        </Modal>
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
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    addButton: {
        backgroundColor: Colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        padding: Spacing.s,
        margin: Spacing.m,
        borderRadius: Radius.l,
        gap: Spacing.s,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: Radius.m,
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#F0F4FF',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    activeTabText: {
        color: Colors.secondary,
    },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: Spacing.m, paddingBottom: 100 },
    card: {
        backgroundColor: Colors.white,
        borderRadius: Radius.l,
        padding: Spacing.m,
        marginBottom: Spacing.m,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardDate: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
    editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F4FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    editButtonText: { fontSize: 11, fontWeight: 'bold', color: Colors.secondary },
    lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    lockedText: { fontSize: 11, fontWeight: 'bold', color: '#9CA3AF' },
    campaignName: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    amountText: { fontSize: 16, fontWeight: '800', color: Colors.secondary },
    remarksText: { fontSize: 12, color: Colors.textSecondary, flex: 1, textAlign: 'right', marginLeft: 10 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    productContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    productBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    productBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.textSecondary },
    labelSmall: { fontSize: 10, color: Colors.textSecondary, marginBottom: 2 },
    amountTextSmall: { fontSize: 14, fontWeight: '800', color: Colors.text },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic' },
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
    floatingActionContainer: {
        position: 'absolute',
        right: 20,
        alignItems: 'center',
    },
    floatingAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.secondary,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: Radius.xl,
        shadowColor: Colors.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        gap: 8,
    },
    floatingAddText: {
        color: Colors.white,
        fontWeight: 'bold',
        fontSize: 14,
    },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: Colors.white },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.m,
        paddingVertical: Spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text },
    saveText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
    modalContent: { flex: 1, padding: Spacing.m },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: 'bold', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
    textInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 52,
        fontSize: 15,
        color: Colors.text,
    },
    statusToggleContainer: { flexDirection: 'row', gap: 10 },
    statusToggle: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    statusToggleActive: {
        backgroundColor: Colors.primaryLite,
        borderColor: Colors.primary,
    },
    statusToggleText: { fontSize: 14, fontWeight: 'bold', color: Colors.textSecondary },
    statusToggleTextActive: { color: Colors.primary },
    productPickerTrigger: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 12,
        minHeight: 52,
        justifyContent: 'center',
    },
    productPickerText: { fontSize: 14, color: Colors.text },
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    pickerContent: { backgroundColor: Colors.white, borderRadius: Radius.l, maxHeight: '80%', padding: Spacing.m },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    pickerTitle: { fontSize: 16, fontWeight: 'bold' },
    searchBar: {
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
        marginBottom: 10,
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    pickerItemText: { fontSize: 14, color: Colors.text },
});
