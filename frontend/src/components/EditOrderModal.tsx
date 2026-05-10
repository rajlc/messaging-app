"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Package, Trash2, Plus, Save, Truck, Search } from 'lucide-react';
import axios from 'axios';

interface EditOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any;
    user?: any;
    onSaveSuccess: () => void;
}

export default function EditOrderModal({ isOpen, onClose, order, user, onSaveSuccess }: EditOrderModalProps) {
    const [editedOrder, setEditedOrder] = useState<any>(order ? { ...order } : null);
    const [loading, setLoading] = useState(false);

    // Permission Logic
    const isRestricted = user?.role === 'user' && order?.courier_provider === 'local' && order?.order_status === 'Shipped';

    // Logistics State
    const [courierProvider, setCourierProvider] = useState('pathao');
    const [cities, setCities] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [pathaoAreas, setPathaoAreas] = useState<any[]>([]);
    const [selectedCity, setSelectedCity] = useState<any>(null);
    const [selectedZone, setSelectedZone] = useState<any>(null);
    const [selectedArea, setSelectedArea] = useState<any>(null);

    // Searchable City State
    const [citySearch, setCitySearch] = useState('');
    const [zoneSearch, setZoneSearch] = useState('');
    const [areaSearch, setAreaSearch] = useState('');
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
    const filteredCities = cities.filter(c => c.city_name.toLowerCase().includes(citySearch.toLowerCase()));
    const filteredZones = zones.filter(z => z.zone_name.toLowerCase().includes(zoneSearch.toLowerCase()));
    const filteredAreas = areas.filter(a => (a.area_name || '').toLowerCase().includes(areaSearch.toLowerCase()));

    // Inventory State
    const [inventoryProducts, setInventoryProducts] = useState<any[]>([]);
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
    const searchDropdownRef = useRef<HTMLDivElement>(null);

    // Click outside handler for product search dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
                setActiveSearchIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Pick & Drop Logistics State
    const [pickdropBranches, setPickdropBranches] = useState<any[]>([]);
    const [selectedPickdropBranch, setSelectedPickdropBranch] = useState('');
    const [pickdropBranchSearch, setPickdropBranchSearch] = useState('');
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [pickdropCityArea, setPickdropCityArea] = useState('');
    const [pickdropDeliveryCost, setPickdropDeliveryCost] = useState(0);
    const [pickdropTrackingUrl, setPickdropTrackingUrl] = useState('');
    const [isShipping, setIsShipping] = useState(false);

    // NCM Logistics State
    const [ncmBranches, setNcmBranches] = useState<any[]>([]);
    const [ncmFromBranch, setNcmFromBranch] = useState('NAYA BUSPARK');
    const [ncmToBranch, setNcmToBranch] = useState('');
    const [ncmBranchSearch, setNcmBranchSearch] = useState('');
    const [isNcmBranchDropdownOpen, setIsNcmBranchDropdownOpen] = useState(false);
    const [ncmDeliveryType, setNcmDeliveryType] = useState('Door2Door');
    const [ncmDeliveryCost, setNcmDeliveryCost] = useState(0);
    const [ncmToBranchAreas, setNcmToBranchAreas] = useState('');
    const [packageDescription, setPackageDescription] = useState('');

    useEffect(() => {
        if (order) {
            setEditedOrder({ ...order });
            // Initialize Logistics
            if (order.courier_provider) setCourierProvider(order.courier_provider);

            // Fetch dependent logistics data if needed
            fetchCities();

            if (order.city_id) {
                // Set initial city ref (name might be missing in order obj, trust ID matches list later or use provided name)
                setSelectedCity({ id: order.city_id, name: order.city_name });
                setCitySearch(order.city_name || '');

                axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/zones/${order.city_id}`)
                    .then(res => setZones(res.data || [])).catch(console.error);
            }
            fetchPathaoAreas();
            if (order.zone_id) {
                setSelectedZone({ id: order.zone_id, name: order.zone_name });
                axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/areas/${order.zone_id}`)
                    .then(res => setAreas(res.data || [])).catch(console.error);
            }
            if (order.area_id) {
                setSelectedArea({ id: order.area_id, name: order.area_name });
            }

            // Pick & Drop Initialize
            setSelectedPickdropBranch(order.pickdrop_destination_branch || '');
            setPickdropBranchSearch(order.pickdrop_destination_branch || '');
            setPickdropCityArea(order.pickdrop_city_area || order.address || '');
            setPickdropTrackingUrl(order.tracking_url || '');
            if (order.courier_delivery_fee && order.courier_provider === 'pickdrop') {
                setPickdropDeliveryCost(order.courier_delivery_fee);
            }

            setPackageDescription(order.package_description || '');

            // NCM Initialize
            if (order.courier_provider === 'ncm') {
                setNcmFromBranch(order.ncm_from_branch || 'NAYA BUSPARK');
                setNcmToBranch(order.ncm_to_branch || '');
                setNcmBranchSearch(order.ncm_to_branch || '');
                setNcmDeliveryType(order.ncm_delivery_type || 'Door2Door');
                if (order.courier_delivery_fee) setNcmDeliveryCost(order.courier_delivery_fee);
                // We'll need to fetch the branch name from full list to get areas_covered if we want it immediately
                // but since we fetch all branches on focus, maybe it's fine or we fetch once here
                fetchNcmBranches();
            }
        }
    }, [order, isOpen]);

    // Fetch Pick & Drop branches when provider switches
    useEffect(() => {
        if (courierProvider === 'pickdrop') fetchPickDropBranches();
    }, [courierProvider]);

    // Calculate Pick & Drop rate when relevant fields change
    useEffect(() => {
        if (courierProvider === 'pickdrop' && selectedPickdropBranch && pickdropCityArea) {
            const timer = setTimeout(() => {
                fetchPickDropRate();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [selectedPickdropBranch, pickdropCityArea, editedOrder?.items]);

    useEffect(() => {
        setCitySearch(selectedCity?.name || '');
    }, [selectedCity]);

    useEffect(() => {
        setZoneSearch(selectedZone?.name || '');
    }, [selectedZone]);

    useEffect(() => {
        setAreaSearch(selectedArea?.name || '');
    }, [selectedArea]);

    // Keep delivery_charge in sync with totalDeliveryCost for relevant providers
    // DECOUPLED: Removed auto-sync to allow independent management of Est Delivery Charge and Delivery Charge
    /*
    useEffect(() => {
        if (['pathao', 'pickdrop', 'local', 'self'].includes(courierProvider)) {
            setEditedOrder((prev: any) => ({ ...prev, delivery_charge: editedOrder.courier_delivery_fee || 0 }));
        }
    }, [editedOrder.courier_delivery_fee, courierProvider]);
    */

    // Update from NCM fee specifically
    useEffect(() => {
        if (courierProvider === 'ncm' && ncmDeliveryCost > 0) {
            setEditedOrder((prev: any) => ({ ...prev, courier_delivery_fee: ncmDeliveryCost, delivery_charge: ncmDeliveryCost }));
        }
    }, [ncmDeliveryCost, courierProvider]);
    // Auto-populate Package Description from items (REMOVED as per user request)

    // Logistics Handlers
    const fetchCities = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/cities`);
            setCities(res.data || []);
        } catch (error) {
            console.error('Failed to load cities', error);
        }
    };

    const fetchPathaoAreas = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/all-areas`);
            setPathaoAreas(res.data || []);
        } catch (error) {
            console.error('Failed to load Pathao areas', error);
        }
    };

    const fetchPickDropBranches = async () => {
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/branches`);
            setPickdropBranches(res.data || []);
        } catch (err) {
            console.error('Failed to fetch Pick & Drop branches', err);
        }
    };

    const fetchNcmBranches = async () => {
        if (ncmBranches.length > 0) return;
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/branches`);
            if (res.data?.success) {
                const formatted = (res.data.data || []).map((b: any) => ({
                    ...b,
                    full_name: b.district_name ? `${b.name || b.branch_name} - ${b.district_name}` : (b.name || b.branch_name)
                }));
                setNcmBranches(formatted);

                // If we already have a toBranch selected (from initialOrder), set its areas_covered
                if (ncmToBranch) {
                    const currentBr = formatted.find((fb: any) => fb.name === ncmToBranch || fb.branch_name === ncmToBranch);
                    if (currentBr) setNcmToBranchAreas(currentBr.areas_covered || '');
                }
            }
        } catch (error) {
            console.error('Failed to load NCM branches', error);
        }
    };

    const fetchNcmDeliveryRate = async (toBr: string, fromBr: string, type: string) => {
        if (!toBr || !fromBr) return;
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/shipping-rate`, {
                creation: fromBr,
                destination: toBr,
                type: type
            });
            if (res.data?.success) {
                const data = res.data.data;
                const rate = data?.rate || data?.amount || data?.total || data?.delivery_charge || data?.delivery_cost || data?.charge || 0;
                setNcmDeliveryCost(Number(rate));
            } else {
                setNcmDeliveryCost(-1);
            }
        } catch (error) {
            console.error('Failed to fetch NCM delivery rate', error);
            setNcmDeliveryCost(-1);
        }
    };

    const handleNcmShip = async () => {
        if (!editedOrder?.id || !ncmFromBranch || !ncmToBranch) {
            alert('Please select branches first');
            return;
        }
        setIsShipping(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/ship`,
                {
                    orderId: editedOrder.id,
                    fromBranch: ncmFromBranch,
                    toBranch: ncmToBranch,
                    deliveryType: ncmDeliveryType
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.data?.success) {
                alert('🚀 Shipped via NCM! Order ID: ' + res.data.orderId);
                onSaveSuccess();
                onClose();
            } else {
                alert('Shipment failed: ' + (res.data?.error || 'Unknown error'));
            }
        } catch (err: any) {
            console.error('NCM Ship Error', err);
            alert('Shipment failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsShipping(false);
        }
    };

    const fetchPickDropRate = async () => {
        try {
            const itemsTotal = editedOrder.items.reduce((sum: number, item: any) => sum + (item.qty * item.amount), 0);
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/rate`, {
                destination: selectedPickdropBranch,
                city_area: pickdropCityArea,
                totalAmount: itemsTotal
            });
            if (res.data?.success) {
                setPickdropDeliveryCost(res.data.rate);
            }
        } catch (err) {
            console.error('Failed to fetch PND rate', err);
        }
    };

    const handlePickDropShip = async () => {
        if (!selectedPickdropBranch || !pickdropCityArea) {
            alert('Please select a branch and area first');
            return;
        }
        setIsShipping(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/ship`,
                { orderId: editedOrder.id },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.data?.success) {
                alert('🚀 Shipped via Pick & Drop!');
                setPickdropTrackingUrl(res.data.data.trackingUrl);
                onSaveSuccess();
                onClose();
            } else {
                alert('Shipment failed: ' + (res.data?.error || 'Unknown error'));
            }
        } catch (err: any) {
            console.error('PND Ship Error', err);
            alert('Shipment failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsShipping(false);
        }
    };

    const handleGlobalAreaSelect = async (area: any) => {
        // 1. Set states immediately for UI feedback
        setSelectedCity({ id: area.city_id, name: area.city_name });
        setSelectedZone({ id: area.zone_id, name: area.zone_name });
        setSelectedArea({ id: area.area_id, name: area.area_name });

        setCitySearch(area.city_name);
        setZoneSearch(area.zone_name);
        setAreaSearch(area.area_name);

        setIsCityDropdownOpen(false);
        setIsZoneDropdownOpen(false);
        setIsAreaDropdownOpen(false);

        // Update editedOrder
        setEditedOrder((prev: any) => ({
            ...prev,
            city_id: area.city_id, city_name: area.city_name,
            zone_id: area.zone_id, zone_name: area.zone_name,
            area_id: area.area_id, area_name: area.area_name
        }));

        // 2. Fetch dependent lists in background
        try {
            const zonesRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/zones/${area.city_id}`);
            setZones(zonesRes.data || []);

            const areasRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/areas/${area.zone_id}`);
            setAreas(areasRes.data || []);
        } catch (error) {
            console.error('Failed to sync dependent logistics lists', error);
        }
    };

    const handleCityChange = async (cityId: number) => {
        const city = cities.find(c => c.city_id === cityId);
        setSelectedCity(city ? { id: city.city_id, name: city.city_name } : null);
        setSelectedZone(null);
        setSelectedArea(null);
        setZones([]);
        setAreas([]);
        setZoneSearch('');
        setAreaSearch('');

        setEditedOrder((prev: any) => ({
            ...prev,
            city_id: cityId, city_name: city?.city_name,
            zone_id: null, zone_name: null,
            area_id: null, area_name: null
        }));

        if (cityId) {
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/zones/${cityId}`);
                setZones(res.data || []);
            } catch (error) {
                console.error('Failed to load zones', error);
            }
        }
    };

    const handleZoneChange = async (zoneId: number) => {
        const zone = zones.find(z => z.zone_id === zoneId);
        setSelectedZone(zone ? { id: zone.zone_id, name: zone.zone_name } : null);
        setSelectedArea(null);
        setAreas([]);
        setAreaSearch('');

        setEditedOrder((prev: any) => ({
            ...prev,
            zone_id: zoneId, zone_name: zone?.zone_name,
            area_id: null, area_name: null
        }));

        if (zoneId) {
            try {
                const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/areas/${zoneId}`);
                setAreas(res.data || []);
            } catch (error) {
                console.error('Failed to load areas', error);
            }
        }
    };

    const handleAreaChange = (areaId: number) => {
        const area = areas.find(a => a.area_id === areaId);
        setSelectedArea(area ? { id: area.area_id, name: area.area_name } : null);
        setEditedOrder((prev: any) => ({ ...prev, area_id: areaId, area_name: area?.area_name }));
    };

    // Inventory Handlers
    const fetchInventoryProducts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/inventory-products?search=`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setInventoryProducts(response.data.data);
            } else if (Array.isArray(response.data)) {
                setInventoryProducts(response.data);
            }
        } catch (error) {
            console.error('Failed to load inventory products', error);
        }
    };

    const handleProductSelect = (index: number, product: any) => {
        const newItems = [...editedOrder.items];
        newItems[index].product_name = product.product_name;
        // newItems[index].product_id = product.product_id; // If needed backend wise
        // Do not auto-populate amount as per user request
        setEditedOrder((prev: any) => ({ ...prev, items: newItems }));
        setActiveSearchIndex(null);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Validation
            if (courierProvider && (editedOrder.courier_delivery_fee || 0) <= 0) {
                throw new Error("Est Delivery Cost is required");
            }

            if (editedOrder.order_status !== 'New Order' && !packageDescription) {
                throw new Error("Package Description is required");
            }

            const token = localStorage.getItem('token');
            // Recalculate total amount to ensure consistency
            const itemsTotal = editedOrder.items.reduce((sum: number, item: any) => sum + (item.qty * item.amount), 0);
            const finalTotal = itemsTotal + (editedOrder.delivery_charge || 0);

            const payload = {
                ...editedOrder,
                total_amount: finalTotal,
                courier_provider: courierProvider,

                // Local Logistics
                logistic_name: courierProvider === 'local' ? editedOrder.logistic_name : null,
                delivery_branch: courierProvider === 'local' ? editedOrder.delivery_branch : null,
                area_name: selectedArea?.name,

                // Pick & Drop Logistics
                pickdrop_destination_branch: courierProvider === 'pickdrop' ? selectedPickdropBranch : null,
                pickdrop_city_area: courierProvider === 'pickdrop' ? pickdropCityArea : null,

                ncm_from_branch: courierProvider === 'ncm' ? ncmFromBranch : null,
                ncm_to_branch: courierProvider === 'ncm' ? ncmToBranch : null,
                ncm_delivery_type: courierProvider === 'ncm' ? ncmDeliveryType : null,
                package_description: packageDescription,

                // Logistics Common
                courier_delivery_fee: courierProvider === 'pickdrop'
                    ? pickdropDeliveryCost
                    : (courierProvider === 'ncm' ? (ncmDeliveryCost > 0 ? ncmDeliveryCost : (editedOrder.courier_delivery_fee || 0)) : (editedOrder.courier_delivery_fee || 0)),
            };
            await axios.put(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders/${editedOrder.id}`, payload, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            alert('Order updated successfully!');
            onSaveSuccess();
            onClose();
        } catch (error: any) {
            alert('Failed to update order: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...editedOrder.items];
        (newItems[index] as any)[field] = value;
        if (field === 'qty' || field === 'amount') {
            newItems[index].total_amount = newItems[index].qty * newItems[index].amount;
        }
        setEditedOrder({ ...editedOrder, items: newItems });
    };

    const addItem = () => {
        setEditedOrder({
            ...editedOrder,
            items: [...editedOrder.items, { product_name: '', qty: '', amount: 0, total_amount: 0 }]
        });
    };

    const removeItem = (index: number) => {
        setEditedOrder({
            ...editedOrder,
            items: editedOrder.items.filter((_: any, i: number) => i !== index)
        });
    };

    if (!isOpen || !editedOrder) return null;

    const totalAmount = editedOrder.items?.reduce((sum: number, item: any) => sum + (item.qty * item.amount), 0) + (editedOrder.delivery_charge || 0);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
                <div className="pb-4 p-6 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Package className="text-indigo-600 dark:text-indigo-400" />
                        Edit Order #{editedOrder.order_number}
                    </h2>
                    <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Row 1: Customer Name */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Customer Name</label>
                        <input
                            type="text"
                            value={editedOrder.customer_name}
                            disabled={isRestricted}
                            onChange={(e) => setEditedOrder({ ...editedOrder, customer_name: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Row 2: Phone Number and Alternative Phone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Phone Number</label>
                            <input
                                type="text"
                                value={editedOrder.phone_number}
                                disabled={isRestricted}
                                onChange={(e) => setEditedOrder({ ...editedOrder, phone_number: e.target.value })}
                                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Alternative Phone</label>
                            <input
                                type="text"
                                value={editedOrder.alternative_phone || ''}
                                disabled={isRestricted}
                                onChange={(e) => setEditedOrder({ ...editedOrder, alternative_phone: e.target.value })}
                                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Row 3: Address */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Address</label>
                        <input
                            type="text"
                            value={editedOrder.address}
                            disabled={isRestricted}
                            onChange={(e) => setEditedOrder({ ...editedOrder, address: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>

                    {/* Row: Remarks */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Remarks</label>
                        <textarea
                            value={editedOrder.remarks || ''}
                            disabled={isRestricted}
                            onChange={(e) => setEditedOrder({ ...editedOrder, remarks: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none h-20 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Add your remarks here..."
                        />
                    </div>

                    {/* Row 4: Order Items */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Order Items</label>
                            <button
                                type="button"
                                onClick={addItem}
                                disabled={isRestricted}
                                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus size={14} /> Add Item
                            </button>
                        </div>
                        <div className="space-y-3">
                            {editedOrder.items?.map((item: any, index: number) => (
                                <div key={index} className="bg-gray-50 dark:bg-slate-900/50 p-3 rounded-lg space-y-2 border border-gray-200 dark:border-slate-700">
                                    {/* Product Name - Full Width */}
                                    <div className="relative" ref={activeSearchIndex === index ? searchDropdownRef : null}>
                                        <input
                                            type="text"
                                            placeholder="Product Name"
                                            value={item.product_name}
                                            onChange={(e) => {
                                                updateItem(index, 'product_name', e.target.value);
                                                setActiveSearchIndex(index);
                                            }}
                                            onClick={() => {
                                                if (!inventoryProducts.length) fetchInventoryProducts();
                                                setActiveSearchIndex(index);
                                            }}
                                            onFocus={() => {
                                                if (!inventoryProducts.length) fetchInventoryProducts();
                                                setActiveSearchIndex(index);
                                            }}
                                            disabled={isRestricted}
                                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        {/* Suggestions */}
                                        {activeSearchIndex === index && (
                                            <div className="absolute z-20 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded mt-1 shadow-xl max-h-40 overflow-y-auto">
                                                {inventoryProducts
                                                    .filter(p => !item.product_name || p.product_name.toLowerCase().includes(item.product_name.toLowerCase()))
                                                    .slice(0, 10)
                                                    .map(product => (
                                                        <div
                                                            key={product.id}
                                                            onClick={() => handleProductSelect(index, product)}
                                                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-800 dark:text-slate-200"
                                                        >
                                                            {product.product_name}
                                                        </div>
                                                    ))}
                                                {inventoryProducts.length === 0 && (
                                                    <div className="p-2 text-xs text-slate-500">No products found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Quantity and Amount - Same Row */}
                                    <div className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Qty"
                                                value={item.qty}
                                                disabled={isRestricted}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                                                    updateItem(index, 'qty', val);
                                                }}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Amount</label>
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Price"
                                                value={item.amount}
                                                disabled={isRestricted}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                                                    updateItem(index, 'amount', val);
                                                }}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            disabled={isRestricted || editedOrder.items.length === 1}
                                            className="mt-5 p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Delivery Charge */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Delivery Charge</label>
                        <input
                            type="number"
                            min="0"
                            value={editedOrder.delivery_charge || 0}
                            disabled={isRestricted}
                            onChange={(e) => setEditedOrder({ ...editedOrder, delivery_charge: Math.max(0, parseFloat(e.target.value) || 0) })}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>

                    {/* Order Status (Moved up) */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Order Status</label>
                        <select
                            value={editedOrder.order_status}
                            onChange={(e) => setEditedOrder({ ...editedOrder, order_status: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                            <option value="New Order">New Order</option>
                            <option value="Confirmed Order">Confirmed Order</option>
                            <option value="Ready to Ship">Ready to Ship</option>
                            <option value="Shipped">Shipped</option>
                            <option value="Delivery Process">Delivery Process</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Delivery Failed">Delivery Failed</option>
                            <option value="Hold">Hold</option>
                            <option value="Return Process">Return Process</option>
                            <option value="Return Delivered">Return Delivered</option>
                            <option value="Follow up again">Follow up again</option>
                            <option value="Cancel">Cancel</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">
                            Package Description {editedOrder.order_status !== 'New Order' && !isRestricted && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="text"
                            value={packageDescription}
                            onChange={(e) => {
                                setPackageDescription(e.target.value);
                                setEditedOrder((prev: any) => ({ ...prev, package_description: e.target.value }));
                            }}
                            readOnly={isRestricted}
                            placeholder="e.g. Clothes, Electronics..."
                            className={`w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none ${!isRestricted && editedOrder.order_status !== 'New Order' && !packageDescription ? 'border-red-300' : ''}`}
                        />
                        {editedOrder.order_status !== 'New Order' && !packageDescription && !isRestricted && (
                            <p className="text-[9px] text-red-500 mt-0.5">Package description is required</p>
                        )}
                    </div>

                    {/* Logistic Partner (Moved here) */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Logistic Partner</label>
                        <select
                            value={courierProvider}
                            disabled={isRestricted}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCourierProvider(val);
                                if (val === 'self') {
                                    setEditedOrder((prev: any) => ({
                                        ...prev,
                                        courier_delivery_fee: 100
                                    }));
                                }
                            }}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <option value="pathao">Pathao Parcel</option>
                            <option value="pickdrop">Pick & Drop</option>
                            <option value="ncm">Nepal Can Move (NCM)</option>
                            <option value="local">Local</option>
                            <option value="self">Self Delivered</option>
                        </select>
                    </div>

                    {/* Self Delivered Fields */}
                    {['Confirmed Order', 'Ready to Ship', 'Shipped', 'Delivery Process', 'Delivered', 'Hold'].includes(editedOrder.order_status) && courierProvider === 'self' && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck size={14} className="text-emerald-500" />
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Self Delivered Info</span>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold text-[10px]">Est Delivery Charge <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={editedOrder.courier_delivery_fee || 0}
                                    onChange={(e) => setEditedOrder({ ...editedOrder, courier_delivery_fee: parseFloat(e.target.value) || 0 })}
                                    readOnly={isRestricted}
                                    placeholder="0"
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-emerald-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Local Logistics Fields */}
                    {/* NCM (Nepal Can Move) Fields */}
                    {(editedOrder.order_status === 'Confirmed Order' || editedOrder.order_status === 'Ready to Ship') && courierProvider === 'ncm' && (
                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-500/30 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck size={14} className="text-green-500" />
                                <span className="text-[10px] uppercase font-bold text-green-600 dark:text-green-400">Nepal Can Move (NCM)</span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">From Branch</label>
                                    <select
                                        value={ncmFromBranch}
                                        onChange={(e) => {
                                            setNcmFromBranch(e.target.value);
                                            fetchNcmDeliveryRate(ncmToBranch, e.target.value, ncmDeliveryType);
                                        }}
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="NAYA BUSPARK">Naya Buspark</option>
                                        <option value="TINKUNE">Tinkune (Main)</option>
                                        <option value="CHABAHIL">Chabahil</option>
                                        <option value="KALANKI">Kalanki</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Delivery Type</label>
                                    <select
                                        value={ncmDeliveryType}
                                        onChange={(e) => {
                                            setNcmDeliveryType(e.target.value);
                                            fetchNcmDeliveryRate(ncmToBranch, ncmFromBranch, e.target.value);
                                        }}
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="Door2Door">Door to Door</option>
                                        <option value="BranchPickup">Branch Pickup</option>
                                    </select>
                                </div>
                            </div>

                            {/* Destination Branch Search */}
                            <div className="relative">
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Destination Branch <span className="text-red-500">*</span></label>
                                <div className="flex items-center w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 gap-1 focus-within:border-green-500">
                                    <Search size={12} className="text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        value={ncmBranchSearch}
                                        onChange={(e) => { setNcmBranchSearch(e.target.value); setIsNcmBranchDropdownOpen(true); }}
                                        onFocus={() => { setIsNcmBranchDropdownOpen(true); fetchNcmBranches(); }}
                                        onBlur={() => setTimeout(() => setIsNcmBranchDropdownOpen(false), 200)}
                                        placeholder="Search district or branch..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                                {isNcmBranchDropdownOpen && (() => {
                                    const filtered = ncmBranches.filter(b =>
                                        !ncmBranchSearch ||
                                        (b.name || b.branch_name || '').toLowerCase().includes(ncmBranchSearch.toLowerCase()) ||
                                        (b.district_name || '').toLowerCase().includes(ncmBranchSearch.toLowerCase())
                                    );
                                    return (
                                        <div className="absolute z-30 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded mt-1 shadow-2xl max-h-48 overflow-y-auto">
                                            {filtered.length === 0 && ncmBranches.length === 0 && <div className="p-3 text-xs text-slate-500 text-center italic">Loading branches...</div>}
                                            {filtered.length === 0 && ncmBranches.length > 0 && <div className="p-3 text-xs text-slate-500 text-center italic">No branches found</div>}
                                            {filtered.map((b: any) => (
                                                <div
                                                    key={b.branch_name || b.name}
                                                    onMouseDown={() => {
                                                        const branchName = b.branch_name || b.name;
                                                        const displayName = b.full_name || branchName;
                                                        setNcmToBranch(branchName);
                                                        setNcmBranchSearch(displayName);
                                                        setNcmToBranchAreas(b.areas_covered || '');
                                                        setIsNcmBranchDropdownOpen(false);
                                                        fetchNcmDeliveryRate(branchName, ncmFromBranch, ncmDeliveryType);
                                                    }}
                                                    className="p-2 hover:bg-green-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-50 dark:border-slate-700 last:border-0"
                                                >
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{b.name || b.branch_name}</div>
                                                    {b.district_name && <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{b.district_name} District</div>}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>



                            {/* Areas Covered Display */}
                            {ncmToBranchAreas && (
                                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/30 rounded p-2 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">Areas Covered</div>
                                    <div className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed italic">
                                        {ncmToBranchAreas}
                                    </div>
                                </div>
                            )}

                            {/* Est. Delivery Cost */}
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-slate-700">
                                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Est. Delivery Cost</span>
                                <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                                    {ncmDeliveryCost > 0 ? `Rs. ${ncmDeliveryCost}` : (ncmDeliveryCost === -1 ? <span className="text-red-500">Error fetching rate</span> : (ncmToBranch ? 'Calculating...' : '—'))}
                                </span>
                            </div>

                            {/* Ship Button */}
                            {editedOrder.id && (
                                <button
                                    type="button"
                                    onClick={handleNcmShip}
                                    disabled={isShipping || !ncmToBranch}
                                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm"
                                >
                                    <Truck size={15} />
                                    {isShipping ? 'Shipping...' : '🚀 Ship via NCM'}
                                </button>
                            )}
                        </div>
                    )}

                    {(editedOrder.order_status === 'Confirmed Order' || editedOrder.order_status === 'Ready to Ship') && courierProvider === 'local' && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-3 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Logistic Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editedOrder.logistic_name || ''}
                                        disabled={isRestricted}
                                        onChange={(e) => setEditedOrder({ ...editedOrder, logistic_name: e.target.value })}
                                        placeholder="e.g. Local Bus"
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Delivery Branch <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={editedOrder.delivery_branch || ''}
                                        disabled={isRestricted}
                                        onChange={(e) => setEditedOrder({ ...editedOrder, delivery_branch: e.target.value })}
                                        placeholder="e.g. Kalanki Branch"
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 block">Est Delivery Cost <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={editedOrder.courier_delivery_fee || 0}
                                    disabled={isRestricted}
                                    onChange={(e) => setEditedOrder({ ...editedOrder, courier_delivery_fee: parseFloat(e.target.value) || 0 })}
                                    placeholder="0"
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>
                    )}

                    {/* Pick & Drop Fields - Conditional */}
                    {(editedOrder.order_status === 'Confirmed Order' || editedOrder.order_status === 'Ready to Ship') && courierProvider === 'pickdrop' && (
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/30 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck size={14} className="text-orange-500" />
                                <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400">Pick & Drop Logistics</span>
                            </div>

                            {/* Destination Branch */}
                            <div className="relative">
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Destination Branch {!isRestricted && <span className="text-red-500">*</span>}</label>
                                <div className={`flex items-center w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 gap-1 ${!isRestricted ? 'focus-within:border-orange-500' : ''}`}>
                                    <Search size={12} className="text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        value={pickdropBranchSearch}
                                        onChange={(e) => { setPickdropBranchSearch(e.target.value); setIsBranchDropdownOpen(true); }}
                                        onFocus={() => { if (!isRestricted) { setIsBranchDropdownOpen(true); fetchPickDropBranches(); } }}
                                        onBlur={() => setTimeout(() => setIsBranchDropdownOpen(false), 200)}
                                        readOnly={isRestricted}
                                        placeholder="Search branch (e.g. Kathmandu)..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white"
                                    />
                                    {selectedPickdropBranch && !isRestricted && (
                                        <button type="button" onClick={() => { setSelectedPickdropBranch(''); setPickdropBranchSearch(''); setPickdropCityArea(''); setPickdropDeliveryCost(0); }} className="text-slate-400 hover:text-red-400">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                {!isRestricted && isBranchDropdownOpen && (() => {
                                    const filtered = pickdropBranches.filter(b =>
                                        !pickdropBranchSearch || (b.branch_name || b.name || '').toLowerCase().includes(pickdropBranchSearch.toLowerCase())
                                    );
                                    return (
                                        <div className="absolute z-30 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded mt-1 shadow-2xl max-h-48 overflow-y-auto">
                                            {filtered.length === 0 && pickdropBranches.length === 0 && <div className="p-3 text-xs text-slate-500 text-center italic">Loading branches...</div>}
                                            {filtered.length === 0 && pickdropBranches.length > 0 && <div className="p-3 text-xs text-slate-500 text-center italic">No branches found</div>}
                                            {filtered.map((b: any) => (
                                                <div
                                                    key={b.name || b.branch_name}
                                                    onMouseDown={() => {
                                                        const branchName = b.name || b.branch_name;
                                                        setSelectedPickdropBranch(branchName);
                                                        setPickdropBranchSearch(branchName);
                                                        setIsBranchDropdownOpen(false);
                                                    }}
                                                    className="p-2 hover:bg-orange-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-50 dark:border-slate-700 last:border-0"
                                                >
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{b.branch_name || b.name}</div>
                                                    {b.area && b.area.length > 0 && <div className="text-[10px] text-slate-500 dark:text-slate-400">{b.area.slice(0, 3).join(', ')}{b.area.length > 3 ? '...' : ''}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* City / Area */}
                            <div>
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Area &amp; City {!isRestricted && <span className="text-red-500">*</span>}</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={pickdropCityArea}
                                        onChange={(e) => setPickdropCityArea(e.target.value)}
                                        readOnly={isRestricted}
                                        placeholder="e.g. Kathmandu, Lalitpur..."
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg p-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-orange-500"
                                    />
                                    {!isRestricted && selectedPickdropBranch && (() => {
                                        const branchAreas = (pickdropBranches.find(b => (b.name || b.branch_name) === selectedPickdropBranch)?.area || []);
                                        if (branchAreas.length === 0) return null;
                                        return (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 self-center">Suggest:</span>
                                                {branchAreas.slice(0, 6).map((a: string) => (
                                                    <button
                                                        key={a}
                                                        type="button"
                                                        onClick={() => setPickdropCityArea(a)}
                                                        className="text-[10px] px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700/40 rounded hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                                    >
                                                        {a}
                                                    </button>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Est. Delivery Cost */}
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-slate-700">
                                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Est. Delivery Cost</span>
                                <span className="font-bold text-orange-600 dark:text-orange-400 text-sm">
                                    {pickdropDeliveryCost > 0 ? `Rs. ${pickdropDeliveryCost}` : (selectedPickdropBranch && pickdropCityArea ? 'Calculating...' : '—')}
                                </span>
                            </div>

                            {/* Tracking URL */}
                            {pickdropTrackingUrl && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Tracking: <a href={pickdropTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">{pickdropTrackingUrl}</a>
                                </div>
                            )}

                            {/* Ship Button */}
                            {!isRestricted && editedOrder?.id && (
                                <button
                                    type="button"
                                    onClick={handlePickDropShip}
                                    disabled={isShipping || !selectedPickdropBranch}
                                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm"
                                >
                                    <Truck size={15} />
                                    {isShipping ? 'Shipping...' : '🚚 Ship via Pick & Drop'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Pathao Logistics Fields - Conditional */}
                    {(editedOrder.order_status === 'Confirmed Order' || editedOrder.order_status === 'Ready to Ship') && courierProvider === 'pathao' && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-3 space-y-3">
                            {/* Unified Delivery Area Search */}
                            <div className="relative">
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Delivery Area {!isRestricted && <span className="text-red-500">*</span>}</label>
                                <div className={`flex flex-wrap gap-1 items-center w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded p-1.5 text-sm text-slate-900 dark:text-white outline-none ${!isRestricted ? 'focus-within:border-indigo-500' : ''}`}>
                                    {selectedCity && (
                                        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px] font-medium border border-indigo-100 dark:border-indigo-800/50">
                                            {selectedCity.name}
                                            {selectedZone && <span> &gt; {selectedZone.name}</span>}
                                            {selectedArea && <span> &gt; {selectedArea.name}</span>}
                                            {!isRestricted && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCity(null);
                                                        setSelectedZone(null);
                                                        setSelectedArea(null);
                                                        setAreaSearch('');
                                                        setEditedOrder((prev: any) => ({
                                                            ...prev,
                                                            city_id: null, city_name: null,
                                                            zone_id: null, zone_name: null,
                                                            area_id: null, area_name: null
                                                        }));
                                                    }}
                                                    className="ml-1 hover:text-red-500"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        value={areaSearch}
                                        onChange={(e) => {
                                            setAreaSearch(e.target.value);
                                            setIsAreaDropdownOpen(true);
                                        }}
                                        onFocus={() => { if (!isRestricted) setIsAreaDropdownOpen(true); }}
                                        onBlur={() => setTimeout(() => setIsAreaDropdownOpen(false), 200)}
                                        readOnly={isRestricted}
                                        placeholder={selectedCity ? "" : "Search Area (e.g. Kathmandu, Newroad...)"}
                                        className="flex-1 bg-transparent border-none outline-none min-w-[120px]"
                                    />
                                </div>
                                {!isRestricted && isAreaDropdownOpen && (() => {
                                    const searchLower = areaSearch.toLowerCase();
                                    const results = pathaoAreas.filter(a => {
                                        if (!searchLower) return true;
                                        return (a.area_name || '').toLowerCase().includes(searchLower) ||
                                            (a.zone_name || '').toLowerCase().includes(searchLower) ||
                                            (a.city_name || '').toLowerCase().includes(searchLower) ||
                                            (a.display_name || '').toLowerCase().includes(searchLower);
                                    });

                                    return (
                                        <div className="absolute z-30 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded mt-1 shadow-2xl max-h-60 overflow-y-auto">
                                            {results.slice(0, 50).map(a => (
                                                <div
                                                    key={`${a.city_id}-${a.zone_id}-${a.area_id}`}
                                                    onMouseDown={() => handleGlobalAreaSelect(a)}
                                                    className="p-2 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-50 dark:border-slate-700 last:border-0"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                                            {a.area_name || a.zone_name}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                            {a.city_name} {a.zone_name && ` > ${a.zone_name}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {pathaoAreas.length === 0 && (
                                                <div className="p-3 text-xs text-slate-500 text-center italic">Loading delivery areas...</div>
                                            )}
                                            {pathaoAreas.length > 0 && results.length === 0 && (
                                                <div className="p-3 text-xs text-slate-500 text-center italic">No matching areas found</div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Total Amount */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-slate-700">
                        <p className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400">Total Amount</p>
                        <p className="text-lg font-black text-slate-900 dark:text-white">Rs. {totalAmount.toLocaleString()}</p>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex gap-2 bg-gray-50 dark:bg-slate-900/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700 transition-all font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg text-sm text-white font-bold transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
