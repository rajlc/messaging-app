 import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Platform,
    Modal,
    FlatList,
    KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, User, Phone, MapPin, Trash2, Search, X, Plus, Truck, ChevronDown, Check } from 'lucide-react-native';
import { Colors, Spacing, Radius } from '../theme/theme';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthContext';

import { API_URL } from '../api/config';

const CreateOrderScreen = ({ route, navigation }: any) => {
    const insets = useSafeAreaInsets();
    const { token } = useAuth();

    // Initial Params from Route (e.g. from Chat)
    const {
        conversationId,
        customerId,
        customerName: initialCustomerName,
        platform,
        pageName,
        phone: extractedPhone,
        address: extractedAddress
    } = route.params || {};

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [customerName, setCustomerName] = useState(initialCustomerName || '');
    const [phone, setPhone] = useState(extractedPhone || '');
    const [altPhone, setAltPhone] = useState('');
    const [address, setAddress] = useState(extractedAddress || '');
    const [items, setItems] = useState<any[]>([
        { product_name: '', qty: 1, amount: 0, total_amount: 0 }
    ]);
    const [deliveryCharge, setDeliveryCharge] = useState('0');
    // Default Status for New Order
    const [orderStatus, setOrderStatus] = useState('New Order');
    const [remarks, setRemarks] = useState('');
    const [packageDescription, setPackageDescription] = useState('');

    // Logistics State
    const [courierProvider, setCourierProvider] = useState(''); // Initially empty
    const [cities, setCities] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [selectedCity, setSelectedCity] = useState<any>(null);
    const [selectedZone, setSelectedZone] = useState<any>(null);
    const [selectedArea, setSelectedArea] = useState<any>(null);

    // Local Logistics State
    const [logisticName, setLogisticName] = useState('');
    const [deliveryBranch, setDeliveryBranch] = useState('');
    const [courierDeliveryFee, setCourierDeliveryFee] = useState('0');

    // Pick & Drop State
    const [pickdropBranches, setPickdropBranches] = useState<any[]>([]);
    const [selectedPickdropBranch, setSelectedPickdropBranch] = useState<any>(null);
    const [pickdropCityArea, setPickdropCityArea] = useState('');
    const [pickdropDeliveryCost, setPickdropDeliveryCost] = useState('0');

    // NCM State
    const [ncmBranches, setNcmBranches] = useState<any[]>([]);
    const [ncmFromBranch, setNcmFromBranch] = useState('NAYA BUSPARK');
    const [ncmToBranch, setNcmToBranch] = useState<any>(null);
    const [ncmDeliveryType, setNcmDeliveryType] = useState('Door2Door');
    const [ncmDeliveryCost, setNcmDeliveryCost] = useState('0');

    // Modals
    const [providerModalVisible, setProviderModalVisible] = useState(false);
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [zoneModalVisible, setZoneModalVisible] = useState(false);
    const [areaModalVisible, setAreaModalVisible] = useState(false);
    const [pickdropBranchModalVisible, setPickdropBranchModalVisible] = useState(false);
    const [ncmBranchModalVisible, setNcmBranchModalVisible] = useState(false);

    // Search Modal State
    const [searchModalVisible, setSearchModalVisible] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
    const [searchLoading, setSearchLoading] = useState(false);

    // Filtered City State
    const [citySearchQuery, setCitySearchQuery] = useState('');
    const [filteredCities, setFilteredCities] = useState<any[]>([]);

    // New Fields State
    const [itemWeight, setItemWeight] = useState('0.5');
    const [pathaoPrice, setPathaoPrice] = useState('0');

    // Status Modal (Only if user wants to change initial status, though usually starts as New)
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const statusOptions = [
        'New Order', 'Confirmed Order', 'Shipped', 'Arrived',
        'Delivered', 'Returning to Seller', 'Fail Delivered',
        'Follow up again', 'Cancel'
    ];

    useEffect(() => {
        fetchCities();
    }, []);

    useEffect(() => {
        if (citySearchQuery.trim() === '') {
            setFilteredCities(cities);
        } else {
            const lowerQ = citySearchQuery.toLowerCase();
            setFilteredCities(cities.filter(c => c.city_name.toLowerCase().includes(lowerQ)));
        }
    }, [citySearchQuery, cities]);

    // Recalculate Totals
    const itemsTotal = items.reduce((sum, item) => sum + (item.qty * item.amount), 0);
    const totalAmount = itemsTotal + (parseFloat(deliveryCharge) || 0);

    // Fetch Pathao Price
    useEffect(() => {
        if (courierProvider === 'pathao' && selectedCity && selectedZone && selectedArea) {
            fetchPathaoPrice();
        }
    }, [selectedCity, selectedZone, selectedArea, itemWeight, courierProvider]);

    const fetchPathaoPrice = async () => {
        if (!selectedCity || !selectedZone) return;
        try {
            const payload = {
                recipient_city: selectedCity.city_id || selectedCity.id,
                recipient_zone: selectedZone.zone_id || selectedZone.id,
                item_weight: parseFloat(itemWeight) || 0.5,
            };

            const response = await fetch(`${API_URL}/api/logistics/price-plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log('Pathao Price API response:', data);
            
            // Handle both 'price' and 'final_price' properties
            const price = data.final_price || data.price || data.total_price || 0;
            if (price) {
                setPathaoPrice(String(price));
            }
        } catch (error) {
            console.error('Failed to fetch Pathao price', error);
        }
    };

    // --- Pathao Helpers ---
    const fetchCities = async () => {
        try {
            const response = await fetch(`${API_URL}/api/logistics/cities`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setCities(data || []);
        } catch (error) {
            console.error('Failed to load cities', error);
        }
    };

    const fetchZones = async (cityId: number) => {
        try {
            const response = await fetch(`${API_URL}/api/logistics/zones/${cityId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setZones(data || []);
        } catch (error) {
            console.error('Failed to load zones', error);
        }
    };

    const fetchAreas = async (zoneId: number) => {
        try {
            const response = await fetch(`${API_URL}/api/logistics/areas/${zoneId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setAreas(data || []);
        } catch (error) {
            console.error('Failed to load areas', error);
        }
    };

    const handleCitySelect = (city: any) => {
        setSelectedCity(city);
        setCityModalVisible(false);
        setSelectedZone(null);
        setSelectedArea(null);
        setZones([]);
        setAreas([]);
        fetchZones(city.city_id);
    };

    const handleZoneSelect = (zone: any) => {
        setSelectedZone(zone);
        setZoneModalVisible(false);
        setSelectedArea(null);
        setAreas([]);
        fetchAreas(zone.zone_id);
    };

    // --- Pick & Drop Helpers ---
    const fetchPickdropBranches = async () => {
        try {
            const response = await fetch(`${API_URL}/api/logistics/pickdrop/branches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) setPickdropBranches(data.data || []);
        } catch (error) {
            console.error('Failed to load Pickdrop branches', error);
        }
    };

    const fetchPickdropRate = async () => {
        if (!selectedPickdropBranch || !pickdropCityArea) return;
        try {
            const response = await fetch(`${API_URL}/api/logistics/pickdrop/delivery-rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    destination_branch: selectedPickdropBranch.branch_name || selectedPickdropBranch.name,
                    city_area: pickdropCityArea,
                    package_weight: parseFloat(itemWeight) || 1
                })
            });
            const data = await response.json();
            console.log('Pickdrop Rate API response:', data);
            if (data.success) {
                const resData = data.data || {};
                const cost = resData.total || resData.delivery_amount || resData.rate || resData.amount || 0;
                setPickdropDeliveryCost(String(cost));
            }
        } catch (error) {
            console.error('Failed to fetch Pickdrop rate', error);
        }
    };

    // --- NCM Helpers ---
    const fetchNcmBranches = async () => {
        try {
            const response = await fetch(`${API_URL}/api/logistics/ncm/branches`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) setNcmBranches(data.data || []);
        } catch (error) {
            console.error('Failed to load NCM branches', error);
        }
    };

    const fetchNcmRate = async () => {
        if (!ncmToBranch) return;
        try {
            const response = await fetch(`${API_URL}/api/logistics/ncm/shipping-rate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    creation: ncmFromBranch,
                    destination: ncmToBranch.branch_name || ncmToBranch.name,
                    type: ncmDeliveryType
                })
            });
            const data = await response.json();
            console.log('NCM Rate API response:', data);
            if (data.success) {
                const resData = data.data || {};
                const rate = resData.rate || resData.amount || resData.total || resData.delivery_charge || resData.delivery_cost || resData.charge || 0;
                setNcmDeliveryCost(String(rate));
            }
        } catch (error) {
            console.error('Failed to fetch NCM rate', error);
        }
    };

    useEffect(() => {
        if (courierProvider === 'pickdrop') fetchPickdropRate();
    }, [selectedPickdropBranch, pickdropCityArea, itemWeight, courierProvider]);

    useEffect(() => {
        if (courierProvider === 'ncm') fetchNcmRate();
    }, [ncmToBranch, ncmFromBranch, ncmDeliveryType, courierProvider]);

    const handleAreaSelect = (area: any) => {
        setSelectedArea(area);
        setAreaModalVisible(false);
    };

    const handlePickdropBranchSelect = (branch: any) => {
        setSelectedPickdropBranch(branch);
        setPickdropBranchModalVisible(false);
    };

    const handleNcmBranchSelect = (branch: any) => {
        setNcmToBranch(branch);
        setNcmBranchModalVisible(false);
    };

    // --- Product Search ---
    const fetchProducts = async (query = '') => {
        setSearchLoading(true);
        try {
            const url = query
                ? `${API_URL}/api/orders/inventory-products?search=${encodeURIComponent(query)}`
                : `${API_URL}/api/orders/inventory-products`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch products');
            const data = await response.json();
            setProducts(data.data || data || []);
        } catch (error: any) {
            console.error('Error fetching products:', error);
            setProducts([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleProductSelect = (product: any) => {
        if (searchingIndex !== null) {
            const newItems = [...items];
            newItems[searchingIndex] = {
                ...newItems[searchingIndex],
                product_name: product.product_name,
                // Do NOT auto-fill price — let user enter manually
            };
            setItems(newItems);
            setSearchModalVisible(false);
            setSearchingIndex(null);
        }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'qty' || field === 'amount') {
            newItems[index].total_amount = (newItems[index].qty || 0) * (newItems[index].amount || 0);
        }
        setItems(newItems);
    };

    const addItem = () => {
        // Check if the last item is valid before adding a new one
        const lastItem = items[items.length - 1];
        if (lastItem && (!lastItem.product_name || !lastItem.qty || !lastItem.amount)) {
            Alert.alert('Incomplete Item', 'Please select a product and enter quantity and price for the current item before adding another.');
            return;
        }
        setItems([...items, { product_name: '', qty: 1, amount: 0, total_amount: 0 }]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    // --- Create Logic ---
    const validateOrder = () => {
        if (!customerName.trim()) {
            Alert.alert('Validation Error', 'Customer Name is required');
            return false;
        }
        if (!phone.trim()) {
            Alert.alert('Validation Error', 'Phone Number is required');
            return false;
        }
        if (!items[0].product_name.trim()) {
            Alert.alert('Validation Error', 'At least one product is required');
            return false;
        }
        // Address check only if Pathao logic strictly requires it, usually good practice
        // if (!address.trim()) {
        //     Alert.alert('Validation Error', 'Address is required');
        //     return false;
        // }

        const currentTotal = items.reduce((sum, item) => sum + (item.qty * item.amount), 0) + (parseFloat(deliveryCharge) || 0);
        if (currentTotal <= 0) {
            Alert.alert('Validation Error', 'Total Price must be greater than 0');
            return false;
        }

        if (orderStatus !== 'New Order' && !packageDescription.trim()) {
            Alert.alert('Validation Error', 'Package Description is required');
            return false;
        }

        if (courierProvider === 'pathao') {
            if (!selectedCity) {
                Alert.alert('Validation Error', 'City is required for Pathao');
                return false;
            }
            if (!selectedZone) {
                Alert.alert('Validation Error', 'Zone is required for Pathao');
                return false;
            }
            if (!selectedArea) {
                Alert.alert('Validation Error', 'Area is required for Pathao');
                return false;
            }
        } else if (courierProvider === 'pickdrop') {
            if (!selectedPickdropBranch) {
                Alert.alert('Validation Error', 'Destination Branch is required for Pick & Drop');
                return false;
            }
            if (!pickdropCityArea.trim()) {
                Alert.alert('Validation Error', 'City Area is required for Pick & Drop');
                return false;
            }
        } else if (courierProvider === 'ncm') {
            if (!ncmToBranch) {
                Alert.alert('Validation Error', 'Destination Branch is required for NCM');
                return false;
            }
        } else if (courierProvider === 'local') {
            if (!logisticName.trim()) {
                Alert.alert('Validation Error', 'Logistic Name is required for Local');
                return false;
            }
            if (!deliveryBranch.trim()) {
                Alert.alert('Validation Error', 'Delivery Branch is required for Local');
                return false;
            }
        }
        return true;
    };

    const handleCreateOrder = async () => {
        if (!validateOrder()) return;

        setSubmitting(true);
        try {
            // Generate Random Order Number
            const orderNumber = `MOB-${Math.floor(100000 + Math.random() * 900000)}`;

            const payload = {
                order_number: orderNumber,
                conversation_id: conversationId,
                customer_id: customerId,
                customer_name: customerName,
                phone_number: phone,
                alternative_phone: altPhone,
                address: address,
                platform: platform || 'manual', // Use passed platform or manual
                page_name: pageName || '',

                items: items,
                delivery_charge: parseFloat(deliveryCharge) || 0,
                total_amount: totalAmount,
                order_status: orderStatus,
                courier_provider: courierProvider,
                remarks: remarks,

                // Pathao
                city_id: selectedCity?.city_id,
                city_name: selectedCity?.city_name,
                zone_id: selectedZone?.zone_id,
                zone_name: selectedZone?.zone_name,
                area_id: selectedArea?.area_id,
                area_name: selectedArea?.area_name,
                weight: parseFloat(itemWeight) || 0.5,
                package_description: packageDescription,

                // Pick & Drop
                pickdrop_destination_branch: selectedPickdropBranch?.branch_name || selectedPickdropBranch?.name || null,
                pickdrop_city_area: pickdropCityArea || null,

                // NCM
                ncm_from_branch: ncmFromBranch || null,
                ncm_to_branch: ncmToBranch?.branch_name || ncmToBranch?.name || null,
                ncm_delivery_type: ncmDeliveryType || null,

                // Local
                logistic_name: courierProvider === 'local' ? logisticName : null,
                delivery_branch: courierProvider === 'local' ? deliveryBranch : null,
                courier_delivery_fee: courierProvider === 'pickdrop' ? (parseFloat(pickdropDeliveryCost) || 0) :
                    courierProvider === 'ncm' ? (parseFloat(ncmDeliveryCost) || 0) :
                        courierProvider === 'pathao' ? (parseFloat(pathaoPrice) || 0) :
                            (parseFloat(courierDeliveryFee) || 0),
            };

            const { data, error } = await supabase
                .from('orders')
                .insert([payload])
                .select();

            if (error) throw error;

            Alert.alert('Success', 'Order created successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error: any) {
            console.error('Error creating order:', error);
            Alert.alert('Error', error.message || 'Failed to create order');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ChevronLeft size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Order</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView style={styles.content} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
                    {/* 1. Customer Details Section */}
                    <Text style={styles.sectionTitle}>Customer Details</Text>
                    
                    <View style={styles.section}>
                        <Text style={styles.label}>Customer Name</Text>
                        <View style={styles.inputContainer}>
                            <User size={18} color={Colors.textSecondary} />
                            <TextInput
                                style={styles.input}
                                value={customerName}
                                onChangeText={setCustomerName}
                                placeholder="Full Name"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>

                    {/* Phone Numbers Row */}
                    <View style={[styles.row, { marginBottom: 20 }]}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Phone Number</Text>
                            <View style={styles.inputContainer}>
                                <Phone size={18} color={Colors.textSecondary} />
                                <TextInput
                                    style={styles.input}
                                    value={phone}
                                    onChangeText={setPhone}
                                    keyboardType="phone-pad"
                                    placeholder="98XXXXXXXX"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Alt Phone</Text>
                            <View style={styles.inputContainer}>
                                <Phone size={18} color={Colors.textSecondary} />
                                <TextInput
                                    style={styles.input}
                                    value={altPhone}
                                    onChangeText={setAltPhone}
                                    keyboardType="phone-pad"
                                    placeholder="Optional"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>Address <Text style={{ color: '#EF4444' }}>*</Text></Text>
                        <View style={[styles.inputContainer, styles.multilineInput]}>
                            <MapPin size={18} color={Colors.textSecondary} style={{ marginTop: 2 }} />
                            <TextInput
                                style={[styles.input, { textAlignVertical: 'top' }]}
                                value={address}
                                onChangeText={setAddress}
                                multiline
                                placeholder="Enter full delivery address"
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>

                    {/* 2. Order Items Section */}
                    <View style={{ marginTop: 10 }}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Order Items</Text>
                            <TouchableOpacity onPress={addItem} style={styles.addItemButton}>
                                <Plus size={16} color={Colors.primary} />
                                <Text style={styles.addItemText}>Add Product</Text>
                            </TouchableOpacity>
                        </View>

                        {items.map((item, index) => (
                            <View key={index} style={styles.itemCard}>
                                <TouchableOpacity
                                    style={styles.productInput}
                                    onPress={() => {
                                        setSearchingIndex(index);
                                        setSearchModalVisible(true);
                                        fetchProducts(item.product_name);
                                    }}
                                >
                                    <Text style={[styles.productInputText, !item.product_name && { color: '#9CA3AF' }]} numberOfLines={1}>
                                        {item.product_name || 'Search & Select Product'}
                                    </Text>
                                    <Search size={16} color={Colors.textSecondary} />
                                </TouchableOpacity>

                                <View style={styles.itemRow}>
                                    <View style={{ flex: 1.2 }}>
                                        <Text style={styles.subLabel}>Qty</Text>
                                        <TextInput
                                            style={[styles.smallInput, { minWidth: 0, width: '100%' }]}
                                            value={String(item.qty)}
                                            onChangeText={(v) => updateItem(index, 'qty', parseInt(v) || 0)}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 2 }}>
                                        <Text style={styles.subLabel}>Price</Text>
                                        <TextInput
                                            style={[styles.smallInput, { textAlign: 'left', minWidth: 0, width: '100%' }]}
                                            value={String(item.amount)}
                                            onChangeText={(v) => updateItem(index, 'amount', parseFloat(v) || 0)}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                    <View style={{ flex: 2.2, alignItems: 'flex-end' }}>
                                        <Text style={styles.subLabel}>Total</Text>
                                        <View style={[styles.smallInput, { minWidth: 0, width: '100%', alignItems: 'flex-end', justifyContent: 'center', backgroundColor: '#F9FAFB' }]}>
                                            <Text style={styles.itemTotalText} numberOfLines={1}>Rs. {((item.qty || 0) * (item.amount || 0)).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(index)} style={[styles.removeButton, { marginTop: 18 }]}>
                                        <Trash2 size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* 3. Shipping Details */}
                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Shipping & Status</Text>
                    <View style={[styles.row, { marginBottom: 20 }]}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.label}>Delivery Charge</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={styles.input}
                                    value={deliveryCharge}
                                    onChangeText={setDeliveryCharge}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor="#9CA3AF"
                                />
                            </View>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Order Status</Text>
                            <TouchableOpacity
                                style={styles.dropdownButton}
                                onPress={() => setStatusModalVisible(true)}
                            >
                                <Text style={styles.input}>{orderStatus}</Text>
                                <ChevronDown size={18} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.label}>
                            Package Description {orderStatus !== 'New Order' && <Text style={{ color: '#EF4444' }}>*</Text>}
                        </Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                value={packageDescription}
                                onChangeText={setPackageDescription}
                                placeholder="e.g. Clothes, Electronics..."
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Logistics Partner</Text>
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setProviderModalVisible(true)}
                        >
                            <Text style={[styles.input, !courierProvider && { color: '#9CA3AF' }]}>
                                {courierProvider === 'pathao' ? 'Pathao Parcel' :
                                    courierProvider === 'pickdrop' ? 'Pick & Drop' :
                                        courierProvider === 'ncm' ? 'Nepal Can Move (NCM)' :
                                            courierProvider === 'local' ? 'Local' :
                                                courierProvider === 'self' ? 'Self Delivered' :
                                                    'Select Partner'}
                            </Text>
                            <ChevronDown size={20} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Logistics Fields */}
                    {courierProvider === 'pathao' && (
                        <View style={[styles.logisticsContainer, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', borderWidth: 1.5 }]}>
                            <View style={styles.logisticsHeader}>
                                <Truck size={18} color="#0284C7" />
                                <Text style={[styles.logisticsHeaderTitle, { color: '#0284C7' }]}>Pathao Parcel</Text>
                            </View>
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.subLabel}>City <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TouchableOpacity style={styles.dropdownButton} onPress={() => setCityModalVisible(true)}>
                                        <Text style={[styles.input, { marginLeft: 0 }]} numberOfLines={1}>
                                            {selectedCity?.city_name || 'City'}
                                        </Text>
                                        <ChevronDown size={16} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.subLabel}>Zone <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TouchableOpacity 
                                        style={[styles.dropdownButton, !selectedCity && styles.disabledButton]} 
                                        onPress={() => selectedCity && setZoneModalVisible(true)}
                                        disabled={!selectedCity}
                                    >
                                        <Text style={[styles.input, { marginLeft: 0 }]} numberOfLines={1}>
                                            {selectedZone?.zone_name || 'Zone'}
                                        </Text>
                                        <ChevronDown size={16} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={{ marginTop: 12 }}>
                                <Text style={styles.subLabel}>Area <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TouchableOpacity 
                                    style={[styles.dropdownButton, !selectedZone && styles.disabledButton]} 
                                    onPress={() => selectedZone && setAreaModalVisible(true)}
                                    disabled={!selectedZone}
                                >
                                    <Text style={[styles.input, { marginLeft: 0 }]} numberOfLines={1}>
                                        {selectedArea?.area_name || 'Select Area'}
                                    </Text>
                                    <ChevronDown size={16} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.row, { marginTop: 12, gap: 8 }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.subLabel}>Weight</Text>
                                    <TextInput style={styles.smallInput} value={itemWeight} onChangeText={setItemWeight} keyboardType="numeric" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.subLabel}>COD Amt</Text>
                                    <Text style={[styles.smallInput, { backgroundColor: '#F3F4F6' }]}>{totalAmount}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.subLabel}>Est. Cost</Text>
                                    <Text style={[styles.smallInput, { color: '#0284C7', fontWeight: '800' }]}>{pathaoPrice}</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {courierProvider === 'pickdrop' && (
                        <View style={[styles.logisticsContainer, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1.5 }]}>
                            <View style={styles.logisticsHeader}>
                                <Truck size={18} color="#EA580C" />
                                <Text style={[styles.logisticsHeaderTitle, { color: '#EA580C' }]}>Pick & Drop</Text>
                            </View>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={styles.subLabel}>Destination Branch <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TouchableOpacity style={styles.dropdownButton} onPress={() => { setPickdropBranchModalVisible(true); if (pickdropBranches.length === 0) fetchPickdropBranches(); }}>
                                    <Text style={[styles.input, { marginLeft: 0 }]} numberOfLines={1}>
                                        {selectedPickdropBranch?.branch_name || selectedPickdropBranch?.name || 'Select Branch'}
                                    </Text>
                                    <Search size={16} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={styles.subLabel}>City Area <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <View style={styles.inputContainer}>
                                    <TextInput style={styles.input} value={pickdropCityArea} onChangeText={setPickdropCityArea} placeholder="e.g. Kathmandu" placeholderTextColor="#9CA3AF" />
                                </View>
                            </View>
                            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA' }]}>
                                <Text style={[styles.subLabel, { marginBottom: 0 }]}>Est. Delivery Cost</Text>
                                <Text style={{ fontWeight: '800', color: '#EA580C', fontSize: 15 }}>Rs. {pickdropDeliveryCost}</Text>
                            </View>
                        </View>
                    )}

                    {courierProvider === 'ncm' && (
                        <View style={[styles.logisticsContainer, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1.5 }]}>
                            <View style={styles.logisticsHeader}>
                                <Truck size={18} color="#16A34A" />
                                <Text style={[styles.logisticsHeaderTitle, { color: '#16A34A' }]}>Nepal Can Move</Text>
                            </View>
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.subLabel}>From</Text>
                                    <TouchableOpacity style={styles.dropdownButton} onPress={() => {
                                        Alert.alert('From Branch', '', [
                                            { text: 'Naya Buspark', onPress: () => setNcmFromBranch('NAYA BUSPARK') },
                                            { text: 'Tinkune', onPress: () => setNcmFromBranch('TINKUNE') },
                                            { text: 'Cancel', style: 'cancel' }
                                        ]);
                                    }}>
                                        <Text style={[styles.input, { marginLeft: 0 }]} numberOfLines={1}>{ncmFromBranch}</Text>
                                        <ChevronDown size={16} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.subLabel}>Type</Text>
                                    <TouchableOpacity style={styles.dropdownButton} onPress={() => {
                                        Alert.alert('Delivery Type', '', [
                                            { text: 'Door to Door', onPress: () => setNcmDeliveryType('Door2Door') },
                                            { text: 'Branch Pickup', onPress: () => setNcmDeliveryType('BranchPickup') },
                                            { text: 'Cancel', style: 'cancel' }
                                        ]);
                                    }}>
                                        <Text style={[styles.input, { marginLeft: 0 }]}>{ncmDeliveryType === 'Door2Door' ? 'D2D' : 'Pickup'}</Text>
                                        <ChevronDown size={16} color={Colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={{ marginTop: 12, marginBottom: 12 }}>
                                <Text style={styles.subLabel}>Destination <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TouchableOpacity style={styles.dropdownButton} onPress={() => { setNcmBranchModalVisible(true); if (ncmBranches.length === 0) fetchNcmBranches(); }}>
                                    <Text style={[styles.input, { marginLeft: 0 }]} numberOfLines={1}>{ncmToBranch?.branch_name || ncmToBranch?.name || 'Select Branch'}</Text>
                                    <Search size={16} color={Colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0' }]}>
                                <Text style={[styles.subLabel, { marginBottom: 0 }]}>Est. Delivery Cost</Text>
                                <Text style={{ fontWeight: '800', color: '#16A34A', fontSize: 15 }}>Rs. {ncmDeliveryCost}</Text>
                            </View>
                        </View>
                    )}

                    {courierProvider === 'local' && (
                        <View style={[styles.logisticsContainer, { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', borderWidth: 1.5 }]}>
                            <View style={styles.logisticsHeader}>
                                <Truck size={18} color={Colors.text} />
                                <Text style={styles.logisticsHeaderTitle}>Local Delivery</Text>
                            </View>
                            <View style={{ marginBottom: 12 }}>
                                <Text style={styles.subLabel}>Logistic Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <View style={styles.inputContainer}>
                                    <TextInput style={styles.input} value={logisticName} onChangeText={setLogisticName} placeholder="e.g. Local Bus" placeholderTextColor="#9CA3AF" />
                                </View>
                            </View>
                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 8 }}>
                                    <Text style={styles.subLabel}>Branch</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput style={styles.input} value={deliveryBranch} onChangeText={setDeliveryBranch} placeholder="e.g. Kalanki" placeholderTextColor="#9CA3AF" />
                                    </View>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.subLabel}>Cost</Text>
                                    <View style={styles.inputContainer}>
                                        <TextInput style={styles.input} value={courierDeliveryFee} onChangeText={setCourierDeliveryFee} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" />
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}

                    {courierProvider === 'self' && (
                        <View style={[styles.logisticsContainer, { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB', borderWidth: 1.5 }]}>
                            <View style={styles.logisticsHeader}>
                                <User size={18} color={Colors.text} />
                                <Text style={styles.logisticsHeaderTitle}>Self Delivered</Text>
                            </View>
                            <Text style={{ fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', lineHeight: 18 }}>
                                No third-party logistics required. Delivered by own staff.
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Additional Info</Text>
                    <View style={styles.section}>
                        <Text style={styles.label}>Remarks</Text>
                        <View style={[styles.inputContainer, styles.multilineInput]}>
                            <TextInput
                                style={[styles.input, { textAlignVertical: 'top' }]}
                                value={remarks}
                                onChangeText={setRemarks}
                                multiline
                                placeholder="Any special instructions..."
                                placeholderTextColor="#9CA3AF"
                            />
                        </View>
                    </View>

                    {/* Total Summary */}
                    <View style={styles.totalSummary}>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>Rs. {totalAmount.toLocaleString()}</Text>
                    </View>

                    {/* Spacer for Footer */}
                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer Buttons */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.updateButton}
                    onPress={handleCreateOrder}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <Text style={styles.updateButtonText}>Create Order</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Product Search Modal */}
            <Modal
                visible={searchModalVisible}
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Product</Text>
                        <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
                            <X size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.searchBar}>
                        <Search size={20} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search products..."
                            onChangeText={(text) => fetchProducts(text)}
                        />
                    </View>
                    {searchLoading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} color={Colors.primary} />
                    ) : (
                        <FlatList
                            data={products}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.productItem}
                                    onPress={() => handleProductSelect(item)}
                                >
                                    <Text style={styles.productItemName}>{item.product_name}</Text>
                                    <Text style={styles.productItemPrice}>Rs. {item.est_price}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            </Modal>

            {/* City Modal */}
            <Modal visible={cityModalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select City</Text>
                        <TouchableOpacity onPress={() => setCityModalVisible(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
                    </View>
                    <View style={styles.searchBar}>
                        <Search size={20} color={Colors.textSecondary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search City..."
                            value={citySearchQuery}
                            onChangeText={setCitySearchQuery}
                        />
                    </View>
                    <FlatList
                        data={filteredCities}
                        keyExtractor={(item) => String(item.city_id)}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.listItem} onPress={() => handleCitySelect(item)}>
                                <Text style={styles.listItemText}>{item.city_name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            {/* Zone Modal */}
            <Modal visible={zoneModalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Zone</Text>
                        <TouchableOpacity onPress={() => setZoneModalVisible(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
                    </View>
                    <FlatList
                        data={zones}
                        keyExtractor={(item) => String(item.zone_id)}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.listItem} onPress={() => handleZoneSelect(item)}>
                                <Text style={styles.listItemText}>{item.zone_name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            {/* Area Modal */}
            <Modal visible={areaModalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Area</Text>
                        <TouchableOpacity onPress={() => setAreaModalVisible(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
                    </View>
                    <FlatList
                        data={areas}
                        keyExtractor={(item) => String(item.area_id)}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.listItem} onPress={() => handleAreaSelect(item)}>
                                <Text style={styles.listItemText}>{item.area_name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            {/* Logistics Provider Modal */}
            <Modal
                visible={providerModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setProviderModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Logistics Partner</Text>
                            <TouchableOpacity onPress={() => setProviderModalVisible(false)}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={[
                                { id: 'pathao', name: 'Pathao Parcel' },
                                { id: 'pickdrop', name: 'Pick & Drop' },
                                { id: 'ncm', name: 'Nepal Can Move (NCM)' },
                                { id: 'local', name: 'Local' },
                                { id: 'self', name: 'Self Delivered' }
                            ]}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between' }}
                                    onPress={() => {
                                        setCourierProvider(item.id);
                                        setProviderModalVisible(false);
                                    }}
                                >
                                    <Text style={[styles.inputText, courierProvider === item.id && { color: Colors.primary, fontWeight: 'bold' }]}>
                                        {item.name}
                                    </Text>
                                    {courierProvider === item.id && <Check size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Pick & Drop Branch Modal */}
            <Modal visible={pickdropBranchModalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select P&D Branch</Text>
                        <TouchableOpacity onPress={() => setPickdropBranchModalVisible(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
                    </View>
                    <FlatList
                        data={pickdropBranches}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.listItem} onPress={() => handlePickdropBranchSelect(item)}>
                                <Text style={styles.listItemText}>{item.branch_name || item.name}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            {/* NCM Branch Modal */}
            <Modal visible={ncmBranchModalVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select NCM Branch</Text>
                        <TouchableOpacity onPress={() => setNcmBranchModalVisible(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
                    </View>
                    <FlatList
                        data={ncmBranches}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.listItem} onPress={() => handleNcmBranchSelect(item)}>
                                <View>
                                    <Text style={styles.listItemText}>{item.branch_name || item.name}</Text>
                                    {item.district_name && <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{item.district_name}</Text>}
                                </View>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>

            {/* Status Selection Modal */}
            <Modal
                visible={statusModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setStatusModalVisible(false)}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '50%' }}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Status</Text>
                            <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                                <X size={24} color={Colors.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={statusOptions}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: 'row', justifyContent: 'space-between' }}
                                    onPress={() => {
                                        setOrderStatus(item);
                                        setStatusModalVisible(false);
                                    }}
                                >
                                    <Text style={[styles.inputText, orderStatus === item && { color: Colors.primary, fontWeight: 'bold' }]}>
                                        {item}
                                    </Text>
                                    {orderStatus === item && <Check size={20} color={Colors.primary} />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    content: {
        flex: 1,
        padding: Spacing.m,
    },
    section: {
        marginBottom: Spacing.m,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB', // Light gray background for the "box"
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 52, // Taller for premium feel
    },
    input: {
        flex: 1,
        marginLeft: 10,
        color: Colors.text,
        fontSize: 15,
        fontWeight: '500',
    },
    multilineInput: {
        height: 80,
        paddingTop: 12,
        alignItems: 'flex-start',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary + '10',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addItemText: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 4,
    },
    itemCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: '#F3F4F6',
        // Subtle shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    productInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    productInputText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        flex: 1,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    smallInput: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'center',
        minWidth: 60,
    },
    itemTotalText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    removeButton: {
        backgroundColor: '#FEE2E2',
        padding: 8,
        borderRadius: 8,
    },
    logisticsContainer: {
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    logisticsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    logisticsHeaderTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.primary,
        marginLeft: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 52,
    },
    disabledButton: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
    },
    dropdownText: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
    },
    totalSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.m,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        marginTop: Spacing.m,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.text,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        padding: Spacing.m,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        flex: 1,
        marginRight: 8,
        paddingVertical: 12,
        borderRadius: Radius.m,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    updateButton: {
        flex: 2,
        marginLeft: 8,
        paddingVertical: 12,
        borderRadius: Radius.m,
        backgroundColor: Colors.primary,
        alignItems: 'center',
    },
    updateButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.white,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        marginTop: 50,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: Spacing.m,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.m,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.text,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.m,
        paddingHorizontal: Spacing.s,
        height: 44,
        marginBottom: Spacing.m,
    },
    searchInput: {
        flex: 1,
        marginLeft: Spacing.s,
        fontSize: 14,
        color: Colors.text,
    },
    productItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    productItemName: {
        fontSize: 16,
        color: Colors.text,
    },
    productItemPrice: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    listItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    listItemText: {
        fontSize: 16,
        color: Colors.text,
    },
});

export default CreateOrderScreen;
