import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Package, Truck, Search } from 'lucide-react';

interface OrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerName?: string;
    customerId?: string;
    pageName?: string;
    pageId?: string;
    platform?: string;
    phone?: string;
    address?: string;
    mode?: 'create' | 'view' | 'edit';
    initialOrder?: any;
    onOrderUpdate?: () => void;
    backdrop?: boolean;
    isCentered?: boolean;
}

export default function OrderModal({
    isOpen,
    onClose,
    customerName = '',
    customerId = '',
    pageName = '',
    pageId = '',
    platform = '',
    phone: initialPhone = '',
    address: initialAddress = '',
    mode = 'create',
    initialOrder = null,
    onOrderUpdate,
    backdrop = false,
    isCentered = false
}: OrderModalProps) {
    const [currentMode, setCurrentMode] = useState<'create' | 'view' | 'edit'>(mode);
    const [loading, setLoading] = useState(false);

    // Form State
    const [phone, setPhone] = useState(initialPhone);
    const [altPhone, setAltPhone] = useState('');
    const [address, setAddress] = useState(initialAddress);
    const [orderStatus, setOrderStatus] = useState('New Order');
    const [deliveryCharge, setDeliveryCharge] = useState(0);
    const [weight, setWeight] = useState(0.5);
    const [items, setItems] = useState<any[]>([
        { product_name: '', qty: '', amount: 0, total_amount: 0, product_id: '' }
    ]);

    // Customer Name State (Editable)
    const [orderCustomerName, setOrderCustomerName] = useState(customerName);

    // Platform & Page State (New)
    const [orderPlatform, setOrderPlatform] = useState(platform);
    const [orderPageName, setOrderPageName] = useState(pageName);
    const [orderPageId, setOrderPageId] = useState(pageId);
    const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>([]);
    const [allowedAccounts, setAllowedAccounts] = useState<string[]>([]);
    const [userRole, setUserRole] = useState<string>('');
    const [isDirty, setIsDirty] = useState(false);
    const [remarks, setRemarks] = useState('');

    // Logistics State
    const [courierProvider, setCourierProvider] = useState('');

    // Pick & Drop State
    const [pickdropBranches, setPickdropBranches] = useState<any[]>([]);
    const [selectedPickdropBranch, setSelectedPickdropBranch] = useState<string>('');
    const [pickdropBranchSearch, setPickdropBranchSearch] = useState<string>('');
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [pickdropCityArea, setPickdropCityArea] = useState<string>('');
    const [pickdropDeliveryCost, setPickdropDeliveryCost] = useState<number>(0);
    const [pickdropTrackingUrl, setPickdropTrackingUrl] = useState<string>('');
    const [isShipping, setIsShipping] = useState(false);

    // NCM State
    const [ncmBranches, setNcmBranches] = useState<any[]>([]);
    const [ncmFromBranch, setNcmFromBranch] = useState<string>('NAYA BUSPARK');
    const [ncmToBranch, setNcmToBranch] = useState<string>('');
    const [ncmDeliveryType, setNcmDeliveryType] = useState<string>('Door2Door');
    const [ncmBranchSearch, setNcmBranchSearch] = useState<string>('');
    const [isNcmBranchDropdownOpen, setIsNcmBranchDropdownOpen] = useState(false);
    const [ncmDeliveryCost, setNcmDeliveryCost] = useState<number>(0);
    const [ncmToBranchAreas, setNcmToBranchAreas] = useState<string>('');
    const [packageDescription, setPackageDescription] = useState('');



    const handleClose = () => {
        if (isDirty) {
            if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
                setIsDirty(false); // Reset dirty
                onClose();
            }
        } else {
            onClose();
        }
    };

    // Helper to set dirty
    const setDirty = (fn: any) => {
        setIsDirty(true);
        fn();
    };
    const [cities, setCities] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [areas, setAreas] = useState<any[]>([]);
    const [pathaoAreas, setPathaoAreas] = useState<any[]>([]);

    const [selectedCity, setSelectedCity] = useState<{ id: number; name: string } | null>(null);
    const [selectedZone, setSelectedZone] = useState<{ id: number; name: string } | null>(null);
    const [selectedArea, setSelectedArea] = useState<{ id: number; name: string } | null>(null);

    const [totalDeliveryCost, setTotalDeliveryCost] = useState(0);

    // Initial Data Fetching
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

    // Populate data regarding mode

    // Mock Page Mapping (Should ideally be fetched from API)
    const PAGE_MAPPING: { [key: string]: string } = {
        '104508142519049': 'Sasto Online Shopping',
        '107953682325493': 'Online Shopping Bagmati',
        'Others': 'Others'
    };

    const PAGE_PLATFORM_MAPPING: { [key: string]: string } = {
        '104508142519049': 'Facebook',
        '107953682325493': 'Facebook',
        'Others': 'Others'
    };

    useEffect(() => {
        if (isOpen) {
            setCurrentMode(mode);
            fetchInventoryProducts();
            fetchCities();
            fetchPathaoAreas();

            // Load User Permissions & Setup Options
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    setUserRole(user.role);

                    if (user.role === 'admin' || user.role === 'editor') {
                        // Admin/Editor: See All + Others
                        setAllowedPlatforms(['Facebook', 'Instagram', 'Tiktok', 'Others']);
                        // All known pages + Others
                        const allPageIds = Object.keys(PAGE_MAPPING).filter(k => k !== 'Others');
                        setAllowedAccounts([...allPageIds, 'Others']);
                    } else {
                        // User: Allowed + Others
                        const userPlatforms = user.platforms || [];
                        const userAccounts = user.accounts || [];
                        setAllowedPlatforms([...userPlatforms, 'Others']);
                        setAllowedAccounts([...userAccounts, 'Others']);
                    }

                    // Default to 'Others' if creating manually (no context)
                    if (mode === 'create' && !platform && !pageId && !pageName) {
                        setOrderPlatform('Others');
                        setOrderPageName('Others');
                        setOrderPageId('Others');
                    } else if (mode === 'create' && user.role !== 'admin') {
                        // Auto-select single option logic (preserved but aware of 'Others')
                        // Only auto-select if "Others" is the ONLY option (which implies empty real permissions)
                        // OR if we want to prioritize real permissions? 
                        // Requirement: "initially show Others". So defaulting to Others above handles it for manual.
                    }
                }
            } catch (e) {
                console.error("Error parsing user", e);
            }

            if ((mode === 'view' || mode === 'edit') && initialOrder) {
                // Populate fields from order
                setOrderCustomerName(initialOrder.customer_name || '');
                setPhone(initialOrder.phone_number || '');
                setAltPhone(initialOrder.alternative_phone || '');
                setAddress(initialOrder.address || '');
                setOrderStatus(initialOrder.order_status || 'New Order');
                setDeliveryCharge(initialOrder.delivery_charge || 0);
                setWeight(initialOrder.weight || 0.5);
                setItems(initialOrder.items || []);
                setCourierProvider('');
                setRemarks(initialOrder.remarks || '');

                // Local Logistics Init
                setLogisticName(initialOrder.logistic_name || '');
                setDeliveryBranch(initialOrder.delivery_branch || '');

                // Pick & Drop Init
                setSelectedPickdropBranch(initialOrder.pickdrop_destination_branch || '');
                setPickdropBranchSearch(initialOrder.pickdrop_destination_branch || '');
                // City area: use saved value, or fall back to order address
                setPickdropCityArea(initialOrder.pickdrop_city_area || initialOrder.address || '');
                setPickdropTrackingUrl(initialOrder.pickdrop_tracking_url || '');

                // Logistics
                if (initialOrder.city_id) setSelectedCity({ id: initialOrder.city_id, name: initialOrder.city_name });
                if (initialOrder.zone_id) setSelectedZone({ id: initialOrder.zone_id, name: initialOrder.zone_name });
                if (initialOrder.area_id) setSelectedArea({ id: initialOrder.area_id, name: initialOrder.area_name });
                setTotalDeliveryCost(initialOrder.courier_delivery_fee || 0);

                // Platform & Page (populate from order)
                if (initialOrder.platform) setOrderPlatform(initialOrder.platform);
                if (initialOrder.page_name) setOrderPageName(initialOrder.page_name);
                if (initialOrder.platform_account) setOrderPageId(initialOrder.platform_account);

                setPackageDescription(initialOrder.package_description || '');

                // NCM Init
                if (initialOrder.courier_provider === 'ncm') {
                    setNcmFromBranch(initialOrder.ncm_from_branch || 'NAYA BUSPARK');
                    setNcmToBranch(initialOrder.ncm_to_branch || '');
                    setNcmBranchSearch(initialOrder.ncm_to_branch || '');
                    setNcmDeliveryType(initialOrder.ncm_delivery_type || 'Door2Door');
                    if (initialOrder.ncm_to_branch) {
                        fetchNcmDeliveryRate(initialOrder.ncm_to_branch, initialOrder.ncm_from_branch || 'NAYA BUSPARK', initialOrder.ncm_delivery_type || 'Door2Door');
                    }
                }

                // Fetch dependent logistics data if needed (zones/areas)
                if (initialOrder.city_id) {
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/zones/${initialOrder.city_id}`)
                        .then(res => setZones(res.data || [])).catch(console.error);
                }
                if (initialOrder.zone_id) {
                    axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/areas/${initialOrder.zone_id}`)
                        .then(res => setAreas(res.data || [])).catch(console.error);
                }
            } else {
                // Reset for create
                setOrderCustomerName(''); // User requested to remove autofill
                setPhone(''); // User requested to remove autofill
                setAddress(initialAddress || '');
                setRemarks('');
                setItems([{ product_name: '', qty: 1, amount: 0, total_amount: 0, product_id: '' }]);
                setOrderStatus('New Order');
                setDeliveryCharge(0);
                setWeight(0.5);
                setSelectedCity(null);
                setSelectedZone(null);
                setSelectedArea(null);
                setTotalDeliveryCost(0);

                // Reset Local
                setLogisticName('');
                setDeliveryBranch('');

                // Reset Pick & Drop
                setSelectedPickdropBranch('');
                setPickdropBranchSearch('');
                setPickdropCityArea(initialAddress || '');
                setPickdropDeliveryCost(0);
                setPickdropTrackingUrl('');

                // Reset NCM
                setNcmFromBranch('NAYA BUSPARK');
                setNcmToBranch('');
                setNcmBranchSearch('');
                setNcmDeliveryType('Door2Door');
                setNcmDeliveryCost(0);
                setPackageDescription('');
                setCourierProvider('');
            }


            // Auto-fill from props (context-aware)
            if (platform) setOrderPlatform(platform);
            if (pageName) setOrderPageName(pageName);
            if (pageId) setOrderPageId(pageId);
        }
    }, [isOpen, initialOrder, mode, platform, pageName, pageId]);

    // Helper to get Page Name from ID
    const getPageName = (idOrName: string) => {
        return PAGE_MAPPING[idOrName] || idOrName;
    };

    // Helper to filter pages by platform
    const getFilteredPages = () => {
        if (orderPlatform === 'Others') return ['Others'];
        if (!orderPlatform) return allowedAccounts; // Show all if no platform selected? Or none?

        return allowedAccounts.filter(acc => {
            if (acc === 'Others') return true; // Always show Others? Requirement says "show selected plateform pages and also show Others"
            // If we don't know the platform for an account, maybe show it to be safe?
            // Or strict: PAGE_PLATFORM_MAPPING[acc] === orderPlatform
            // For now, assume unmapped accounts match nothing (except maybe legacy names?)
            // If 'acc' is a Name (legacy), we can't easily map it. 
            // BUT we are standardizing on IDs.
            const p = PAGE_PLATFORM_MAPPING[acc];
            return p === orderPlatform;
        });
    };

    // Auto-select 'Others' page if Platform is 'Others'
    useEffect(() => {
        if (orderPlatform === 'Others') {
            setOrderPageName('Others');
            setOrderPageId('Others');
        }
    }, [orderPlatform]);

    // Auto-populate Package Description from items (REMOVED as per user request)

    // Searchable City State
    const [citySearch, setCitySearch] = useState('');
    const [zoneSearch, setZoneSearch] = useState('');
    const [areaSearch, setAreaSearch] = useState('');
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
    const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);

    // Local Logistics State
    const [logisticName, setLogisticName] = useState('');
    const [deliveryBranch, setDeliveryBranch] = useState('');

    useEffect(() => {
        setCitySearch(selectedCity?.name || '');
    }, [selectedCity]);

    useEffect(() => {
        setZoneSearch(selectedZone?.name || '');
    }, [selectedZone]);

    useEffect(() => {
        setAreaSearch(selectedArea?.name || '');
    }, [selectedArea]);

    // Fetch Inventory
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

    // Logistics API Call Helpers
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
        if (pickdropBranches.length > 0) return; // Already loaded
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/branches`);
            if (res.data?.success) setPickdropBranches(res.data.data || []);
        } catch (error) {
            console.error('Failed to load Pick & Drop branches', error);
        }
    };

    const fetchNcmBranches = async () => {
        if (ncmBranches.length > 0) return;
        try {
            const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/branches`);
            if (res.data?.success) {
                // Formatting branches to include district if available
                const formatted = (res.data.data || []).map((b: any) => ({
                    ...b,
                    full_name: b.district_name ? `${b.name || b.branch_name} - ${b.district_name}` : (b.name || b.branch_name)
                }));
                setNcmBranches(formatted);
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
            console.log('NCM Delivery Rate Response:', res.data);
            if (res.data?.success) {
                const data = res.data.data;
                if (data?.error) {
                    console.error('NCM API Error:', data.error);
                    setNcmDeliveryCost(-1); // Use -1 to indicate error
                    return;
                }
                const rate = data?.rate || data?.amount || data?.total || data?.delivery_charge || data?.delivery_cost || data?.charge || 0;
                const numericRate = typeof rate === 'string' ? parseFloat(rate) : Number(rate);

                setNcmDeliveryCost(numericRate);
                // Removed setDeliveryCharge(numericRate) to keep them independent
            } else {
                setNcmDeliveryCost(-1);
            }
        } catch (error) {
            console.error('Failed to fetch NCM delivery rate', error);
        }
    };

    const handleNcmShip = async () => {
        if (!initialOrder?.id) return;
        if (!ncmFromBranch || !ncmToBranch) {
            alert('Please select both From and To branches for NCM');
            return;
        }

        setIsShipping(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/ncm/ship`,
                {
                    orderId: initialOrder.id,
                    fromBranch: ncmFromBranch,
                    toBranch: ncmToBranch,
                    deliveryType: ncmDeliveryType
                },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.success) {
                alert('Order shipped via NCM successfully! Tracking ID: ' + response.data.orderId);
                if (onOrderUpdate) onOrderUpdate();
                onClose();
            } else {
                alert('NCM Shipping Failed: ' + (response.data.error || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('NCM ship error', error);
            alert('Error: ' + error.message);
        } finally {
            setIsShipping(false);
        }
    };

    const fetchPickDropDeliveryRate = async (branch: string, cityArea: string, w: number) => {
        if (!branch || !cityArea) return;
        try {
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/delivery-rate`, {
                destination_branch: branch,
                city_area: cityArea,
                package_weight: w || 1
            });
            if (res.data?.success) setPickdropDeliveryCost(res.data.data?.total || res.data.data?.delivery_amount || 0);
        } catch (error) {
            console.error('Failed to fetch Pick & Drop delivery rate', error);
        }
    };

    const handlePickDropShip = async () => {
        if (!initialOrder?.id) { alert('Please save the order first before shipping.'); return; }
        if (!selectedPickdropBranch) { alert('Please select a Destination Branch.'); return; }
        if (window.confirm('Ship this order via Pick & Drop?')) {
            setIsShipping(true);
            try {
                const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/pickdrop/ship`, { orderId: initialOrder.id });
                if (res.data?.success) {
                    const d = res.data.data;
                    alert(`✅ Shipped! PND Order ID: ${d.pndOrderId}\nTracking: ${d.trackingUrl}`);
                    setPickdropTrackingUrl(d.trackingUrl || '');
                    setOrderStatus('Shipped');
                    if (onOrderUpdate) onOrderUpdate();
                } else {
                    alert('Failed: ' + (res.data?.error || 'Unknown error'));
                }
            } catch (e: any) {
                alert('Error: ' + e.message);
            } finally {
                setIsShipping(false);
            }
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

        // 2. Fetch dependent lists in background so dropdowns work if opened again
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
    };

    // Fetch Pick & Drop branches when provider switches
    useEffect(() => {
        if (courierProvider === 'pickdrop') fetchPickDropBranches();
    }, [courierProvider]);

    // Auto-fetch Pick & Drop delivery rate
    useEffect(() => {
        if (courierProvider === 'pickdrop' && selectedPickdropBranch && pickdropCityArea) {
            fetchPickDropDeliveryRate(selectedPickdropBranch, pickdropCityArea, weight);
        }
    }, [selectedPickdropBranch, pickdropCityArea, weight, courierProvider]);

    // Price Calculation
    useEffect(() => {
        const canCalculate = currentMode !== 'view' &&
            (orderStatus === 'Confirmed Order' || orderStatus === 'Ready to Ship') &&
            courierProvider === 'pathao' &&
            selectedCity?.id &&
            selectedZone?.id;

        console.log('Price calculation check:', {
            canCalculate,
            city: selectedCity?.id,
            zone: selectedZone?.id,
            weight,
            status: orderStatus
        });

        if (canCalculate) {
            calculateDeliveryCost();
        }
        // In view mode, we trust the saved cost, unless edited
    }, [selectedCity?.id, selectedZone?.id, weight, courierProvider, orderStatus, currentMode]);

    const calculateDeliveryCost = async () => {
        try {
            console.log('Triggering calculatePrice for:', { city: selectedCity?.id, zone: selectedZone?.id, weight });
            const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/logistics/price-plan`, {
                recipient_city: selectedCity?.id,
                recipient_zone: selectedZone?.id,
                item_weight: weight
            });
            console.log('Price API response:', res.data);
            if (res.data && typeof res.data.final_price !== 'undefined') {
                const cost = parseFloat(res.data.final_price);
                setTotalDeliveryCost(cost);
            }
        } catch (error: any) {
            console.error('Failed to calculate price', error.response?.data || error.message);
        }
    };

    // Keep deliveryCharge in sync with totalDeliveryCost for most providers
    // DECOUPLED: Removed setDeliveryCharge(totalDeliveryCost) to allow manual override
    useEffect(() => {
        if (['pathao', 'pickdrop', 'local', 'self'].includes(courierProvider)) {
            // setDeliveryCharge(totalDeliveryCost); 
        }
    }, [totalDeliveryCost, courierProvider]);

    // Update courier_delivery_fee when NCM cost changes
    // DECOUPLED: Removed setDeliveryCharge(ncmDeliveryCost) to allow manual override
    useEffect(() => {
        if (courierProvider === 'ncm' && ncmDeliveryCost > 0) {
            setTotalDeliveryCost(ncmDeliveryCost);
            // setDeliveryCharge(ncmDeliveryCost); 
        }
    }, [ncmDeliveryCost, courierProvider]);

    // Item Management
    const addItem = () => setItems([...items, { product_name: '', qty: '', amount: 0, total_amount: 0, product_id: '' }]);
    const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        (newItems[index] as any)[field] = value;
        if (field === 'qty' || field === 'amount') {
            newItems[index].total_amount = newItems[index].qty * newItems[index].amount;
        }
        setItems(newItems);
    };

    const handleProductSelect = (index: number, product: any) => {
        const newItems = [...items];
        newItems[index].product_name = product.product_name;
        newItems[index].product_id = product.product_id;
        // Do not auto-populate amount as per user request
        setItems(newItems);
        setActiveSearchIndex(null);
    };

    // Totals
    const itemsTotal = items.reduce((sum, item) => sum + (item.qty * item.amount), 0);
    // Use deliveryCharge for actual amount, but totalDeliveryCost could be a fallback if desired
    const totalAmount = itemsTotal + parseFloat(deliveryCharge.toString());

    // Submit
    const handleSubmit = async () => {
        // Validation Logic
        const missingFields = [];

        // Common Required Fields
        if (!items.every(i => i.product_name)) missingFields.push("Product Name");
        if (!phone) missingFields.push("Phone Number");

        if (orderStatus === 'Confirmed Order' || orderStatus === 'Ready to Ship') {
            if (!address) missingFields.push("Address");
            if (totalAmount <= 0) missingFields.push("Amount"); // Assuming total amount > 0

            // Local Logistics Validation
            if (courierProvider === 'local') {
                if (!logisticName) missingFields.push("Logistic Name");
                if (!deliveryBranch) missingFields.push("Delivery Branch");
            }

            // Revised Validation: Check Estimated Delivery Cost for all logistics partners
            // We allow manual 'Delivery Charge' to be 0 (free shipping), 
            // but we require 'Est Delivery Cost' to be calculated/entered.
            if (courierProvider) {
                let estCost = 0;
                if (courierProvider === 'pathao' || courierProvider === 'local' || courierProvider === 'self') {
                    estCost = totalDeliveryCost;
                } else if (courierProvider === 'pickdrop') {
                    estCost = pickdropDeliveryCost;
                } else if (courierProvider === 'ncm') {
                    estCost = ncmDeliveryCost;
                }

                if (estCost <= 0) {
                    missingFields.push("Est Delivery Cost");
                }
            }
        }

        // Package Description Validation
        if (orderStatus !== 'New Order' && !packageDescription) {
            missingFields.push("Package Description");
        }

        if (missingFields.length > 0) {
            alert(`Please fill in the following required fields: ${missingFields.join(', ')}`);
            return;
        }

        setLoading(true);
        try {
            const orderData = {
                customer_name: orderCustomerName,
                customer_id: customerId,
                phone_number: phone,
                alternative_phone: altPhone,
                address: address,
                platform: orderPlatform,
                page_name: orderPageName,
                // Ensure platform_account is set (using ID if available or falling back to Name/ID from user selection)
                platform_account: userRole === 'admin' ? (orderPageId || orderPageName) : orderPageName,
                order_status: orderStatus,
                delivery_charge: deliveryCharge,
                total_amount: totalAmount,
                weight: weight,
                items: items.map(item => ({
                    ...item,
                    total_amount: item.qty * item.amount
                })),
                remarks: remarks,
                courier_provider: courierProvider,

                // Local Logistics Fields
                logistic_name: courierProvider === 'local' ? logisticName : null,
                delivery_branch: courierProvider === 'local' ? deliveryBranch : null,

                // Pick & Drop Fields
                pickdrop_destination_branch: courierProvider === 'pickdrop' ? selectedPickdropBranch : null,
                pickdrop_city_area: courierProvider === 'pickdrop' ? pickdropCityArea : null,

                // NCM Fields
                ncm_from_branch: courierProvider === 'ncm' ? ncmFromBranch : null,
                ncm_to_branch: courierProvider === 'ncm' ? ncmToBranch : null,
                ncm_delivery_type: courierProvider === 'ncm' ? ncmDeliveryType : null,
                package_description: packageDescription,

                city_id: selectedCity?.id,
                city_name: selectedCity?.name,
                zone_id: selectedZone?.id,
                zone_name: selectedZone?.name,
                area_id: selectedArea?.id,
                area_name: selectedArea?.name,
                courier_delivery_fee: courierProvider === 'pickdrop' ? pickdropDeliveryCost : totalDeliveryCost,
                // New fields if creating, ignored if updating usually (unless allowed)
                order_date: initialOrder?.order_date || new Date().toISOString().split('T')[0],
                order_number: initialOrder?.order_number || `WEB-${Math.floor(1000 + Math.random() * 9000)}`,
                tracking_number: initialOrder?.tracking_number || `TRK-${Date.now()}`,
                status: 'Pending'
            };

            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/orders`;

            const config = {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            };

            let response;
            if (currentMode === 'edit' && initialOrder && initialOrder.id) {
                // UPDATE
                response = await axios.put(`${url}/${initialOrder.id}`, orderData, config);
            } else {
                // CREATE
                response = await axios.post(url, orderData, config);
            }

            if (response.data.success) {
                alert(currentMode === 'edit' ? 'Order updated successfully!' : 'Order created & synced successfully!');
                if (onOrderUpdate) onOrderUpdate(); // Refresh parent list
                onClose();
            } else {
                alert('Failed: ' + (response.data.error || 'Unknown error'));
            }
        } catch (error: any) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper to determine if fields are disabled
    const isReadOnly = currentMode === 'view';

    // Filter Cities
    const filteredCities = cities.filter(c => c.city_name.toLowerCase().includes(citySearch.toLowerCase()));
    const filteredZones = zones.filter(z => z.zone_name.toLowerCase().includes(zoneSearch.toLowerCase()));
    const filteredAreas = areas.filter(a => (a.area_name || '').toLowerCase().includes(areaSearch.toLowerCase()));

    const backdropClasses = isCentered
        ? "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto"
        : (backdrop
            ? "fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-end pointer-events-auto"
            : "fixed inset-0 bg-black/10 z-50 flex items-center justify-end pointer-events-none");

    const containerClasses = isCentered
        ? "bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[95vh] shadow-2xl flex flex-col rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        : (backdrop
            ? "bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-700 animate-in slide-in-from-right duration-300"
            : "bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-slate-700 animate-in slide-in-from-right duration-300 pointer-events-auto");

    return (
        <div className={backdropClasses}>
            <div className={containerClasses}>

                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                    <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                        <Package size={20} className="text-indigo-600 dark:text-indigo-400" />
                        <h2 className="font-bold">
                            {currentMode === 'create' ? 'Create New Order' : (currentMode === 'edit' ? 'Edit Order' : 'Order Details')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
                </div>

                {/* Body (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Row 0: Platform & Page (Vital for Visibility) */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Platform {!isReadOnly && <span className="text-red-500">*</span>}</label>
                            {/* Always show Select if we have allowed platforms (which we now do for Admin too) */}
                            {allowedPlatforms.length > 0 ? (
                                <select
                                    value={orderPlatform}
                                    onChange={(e) => {
                                        setDirty(() => {
                                            setOrderPlatform(e.target.value);
                                            if (e.target.value !== 'Others') {
                                                setOrderPageId('');
                                                setOrderPageName('');
                                            }
                                        });
                                    }}
                                    disabled={isReadOnly}
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="">Select Platform</option>
                                    {allowedPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={orderPlatform}
                                    onChange={(e) => setOrderPlatform(e.target.value)}
                                    readOnly={isReadOnly}
                                    placeholder="Facebook, Instagram..."
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none"
                                />
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Page Name {!isReadOnly && <span className="text-red-500">*</span>}</label>
                            {allowedAccounts.length > 0 ? (
                                <select
                                    value={orderPlatform === 'Others' ? 'Others' : (orderPageId || orderPageName)} // Force Others if platform is Others
                                    onChange={(e) => {
                                        const selectedId = e.target.value;
                                        setDirty(() => {
                                            setOrderPageId(selectedId);
                                            setOrderPageName(getPageName(selectedId));
                                        });
                                    }}
                                    disabled={isReadOnly || orderPlatform === 'Others'} // Disable if Platform is Others? "show only Others" implies selection, but if logic forces it, maybe lock it.
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none"
                                >
                                    <option value="">Select Page</option>
                                    {getFilteredPages().map(account => (
                                        <option key={account} value={account}>
                                            {getPageName(account)}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={orderPageName}
                                    onChange={(e) => setOrderPageName(e.target.value)}
                                    readOnly={isReadOnly}
                                    placeholder="Page Name"
                                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none"
                                />
                            )}
                        </div>
                    </div>

                    {/* Row 1: Customer Name */}
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Customer Name {!isReadOnly && <span className="text-red-500">*</span>}</label>
                        <input
                            type="text"
                            value={orderCustomerName}
                            onChange={(e) => setDirty(() => setOrderCustomerName(e.target.value))}
                            readOnly={isReadOnly}
                            className={`w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none ${!isReadOnly ? 'focus:border-indigo-500' : ''}`}
                            placeholder="Customer Name"
                        />
                    </div>

                    {/* Row 2: Phone, Alt Phone */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Phone Number {!isReadOnly && <span className="text-red-500">*</span>}</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setDirty(() => setPhone(e.target.value))}
                                readOnly={isReadOnly}
                                className={`w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none ${!isReadOnly ? 'focus:border-indigo-500' : ''}`}
                                placeholder="98XXXXXXXX"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Alt. Phone</label>
                            <input
                                type="text"
                                value={altPhone}
                                onChange={(e) => setAltPhone(e.target.value)}
                                readOnly={isReadOnly}
                                className={`w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none ${!isReadOnly ? 'focus:border-indigo-500' : ''}`}
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    {/* Row 3: Address */}
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Address {(orderStatus === 'Confirmed Order' || orderStatus === 'Ready to Ship') && !isReadOnly && <span className="text-red-500">*</span>}</label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setDirty(() => setAddress(e.target.value))}
                            readOnly={isReadOnly}
                            className={`w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none ${!isReadOnly ? 'focus:border-indigo-500' : ''}`}
                            placeholder="Full delivery address"
                        />
                    </div>

                    {/* New Row: Remarks */}
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Remarks</label>
                        <textarea
                            value={remarks}
                            onChange={(e) => setDirty(() => setRemarks(e.target.value))}
                            readOnly={isReadOnly}
                            className={`w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none h-20 resize-none ${!isReadOnly ? 'focus:border-indigo-500' : ''}`}
                            placeholder="Add any internal remarks here..."
                        />
                    </div>

                    {/* Row 4: Order Items */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Order Items {!isReadOnly && <span className="text-red-500">*</span>}</label>
                            {!isReadOnly && (
                                <button onClick={addItem} className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                                    <Plus size={14} /> Add Item
                                </button>
                            )}
                        </div>
                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded border border-gray-200 dark:border-slate-700/50 relative group">
                                    <div className="mb-2" ref={activeSearchIndex === index ? searchDropdownRef : null}>
                                        <input
                                            type="text"
                                            placeholder="Product Name"
                                            value={item.product_name}
                                            onChange={(e) => {
                                                updateItem(index, 'product_name', e.target.value);
                                                setActiveSearchIndex(index);
                                            }}
                                            onClick={() => {
                                                if (!isReadOnly) {
                                                    if (!inventoryProducts.length) fetchInventoryProducts();
                                                    setActiveSearchIndex(index);
                                                }
                                            }}
                                            onFocus={() => {
                                                if (!isReadOnly) {
                                                    if (!inventoryProducts.length) fetchInventoryProducts();
                                                    setActiveSearchIndex(index);
                                                }
                                            }}
                                            readOnly={isReadOnly}
                                            className={`w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none ${!isReadOnly ? 'focus:border-indigo-500' : ''}`}
                                        />
                                        {/* Product Suggestions */}
                                        {!isReadOnly && activeSearchIndex === index && (
                                            <div className="absolute z-20 w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded mt-1 shadow-xl max-h-40 overflow-y-auto">
                                                {inventoryProducts
                                                    .filter(p => !item.product_name || p.product_name.toLowerCase().includes(item.product_name.toLowerCase()))
                                                    .slice(0, 10)
                                                    .map(product => (
                                                        <div
                                                            key={product.id}
                                                            onClick={() => handleProductSelect(index, product)}
                                                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 cursor-pointer text-sm text-slate-900 dark:text-slate-200"
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
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] text-slate-500 mb-0.5 block">Quantity</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.qty}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                                                    updateItem(index, 'qty', val);
                                                }}
                                                readOnly={isReadOnly}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-500 mb-0.5 block">Amount</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.amount}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0);
                                                    updateItem(index, 'amount', val);
                                                }}
                                                readOnly={isReadOnly}
                                                className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                    </div>
                                    {!isReadOnly && items.length > 1 && (
                                        <button
                                            onClick={() => removeItem(index)}
                                            className="absolute -right-2 -top-2 bg-red-500/10 text-red-400 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row 5: Delivery Charge, Order Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Delivery Charge</label>
                            <input
                                type="number"
                                min="0"
                                value={deliveryCharge}
                                onChange={(e) => setDeliveryCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                                readOnly={isReadOnly}
                                className={`w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!isReadOnly ? 'focus:border-indigo-500' : ''}`}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Order Status</label>
                            <select
                                value={orderStatus}
                                onChange={(e) => setDirty(() => setOrderStatus(e.target.value))}
                                disabled={isReadOnly}
                                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-indigo-500 outline-none appearance-none disabled:opacity-70"
                            >
                                <option value="New Order">New Order</option>
                                <option value="Confirmed Order">Confirmed Order</option>
                                <option value="Ready to Ship">Ready to Ship</option>
                                {mode !== 'create' && (
                                    <>
                                        <option value="Shipped">Shipped</option>
                                        <option value="Delivery Process">Delivery Process</option>
                                        <option value="Delivered">Delivered</option>
                                        <option value="Delivery Failed">Delivery Failed</option>
                                        <option value="Hold">Hold</option>
                                        <option value="Return Process">Return Process</option>
                                        <option value="Return Delivered">Return Delivered</option>
                                        <option value="Follow up again">Follow up again</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">
                            Package Description {orderStatus !== 'New Order' && !isReadOnly && <span className="text-red-500">*</span>}
                        </label>
                        <input
                            type="text"
                            value={packageDescription}
                            onChange={(e) => setDirty(() => setPackageDescription(e.target.value))}
                            readOnly={isReadOnly}
                            placeholder="e.g. Clothes, Electronics..."
                            className={`w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 ${!isReadOnly && orderStatus !== 'New Order' && !packageDescription ? 'border-red-300' : ''}`}
                        />
                        {orderStatus !== 'New Order' && !packageDescription && !isReadOnly && (
                            <p className="text-[9px] text-red-500 mt-0.5">Package description is required</p>
                        )}
                    </div>

                    {/* Row 6: Logistic Dropdown */}
                    <div>
                        <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Logistic Partner</label>
                            <select
                                value={courierProvider}
                                onChange={(e) => setCourierProvider(e.target.value)}
                                disabled={isReadOnly}
                                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-slate-900 dark:text-white focus:border-indigo-500 outline-none appearance-none disabled:opacity-70"
                            >
                                <option value="">Select Logistic Partner</option>
                                <option value="pathao">Pathao Parcel</option>
                                <option value="pickdrop">Pick & Drop</option>
                            <option value="ncm">Nepal Can Move (NCM)</option>
                            <option value="local">Local</option>
                            <option value="self">Self Delivered</option>
                        </select>
                    </div>

                    {/* Conditional Fields */}
                    {(orderStatus === 'Confirmed Order' || orderStatus === 'Ready to Ship') && courierProvider === 'pathao' && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* Unified Delivery Area Search */}
                            <div className="relative">
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Delivery Area {!isReadOnly && <span className="text-red-500">*</span>}</label>
                                <div className={`flex flex-wrap gap-1 items-center w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded p-1.5 text-sm text-slate-900 dark:text-white outline-none ${!isReadOnly ? 'focus-within:border-indigo-500' : ''}`}>
                                    {selectedCity && (
                                        <div className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded text-[11px] font-medium border border-indigo-100 dark:border-indigo-800/50">
                                            {selectedCity.name}
                                            {selectedZone && <span> &gt; {selectedZone.name}</span>}
                                            {selectedArea && <span> &gt; {selectedArea.name}</span>}
                                            {!isReadOnly && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedCity(null);
                                                        setSelectedZone(null);
                                                        setSelectedArea(null);
                                                        setAreaSearch('');
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
                                        onFocus={() => { if (!isReadOnly) setIsAreaDropdownOpen(true); }}
                                        onBlur={() => setTimeout(() => setIsAreaDropdownOpen(false), 200)}
                                        readOnly={isReadOnly}
                                        placeholder={selectedCity ? "" : "Search Area (e.g. Kathmandu, Newroad...)"}
                                        className="flex-1 bg-transparent border-none outline-none min-w-[120px]"
                                    />
                                </div>
                                {!isReadOnly && isAreaDropdownOpen && (() => {
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

                            {/* Row 9: Weight, COD Amount */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold text-[10px]">Weight (KG)</label>
                                    <select
                                        value={weight}
                                        onChange={(e) => setWeight(parseFloat(e.target.value))}
                                        disabled={isReadOnly}
                                        className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none disabled:opacity-50"
                                    >
                                        <option value={0.5}>0.5 KG</option>
                                        <option value={1}>1.0 KG</option>
                                        <option value={1.5}>1.5 KG</option>
                                        <option value={2}>2.0 KG</option>
                                        <option value={3}>3.0 KG</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 font-bold text-[10px] uppercase">COD Amount</label>
                                    <input
                                        type="number"
                                        value={totalAmount}
                                        readOnly
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-500 dark:text-slate-400 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Row 10: Total Delivery Cost */}
                            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-slate-700">
                                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Est. Delivery Cost (API)</span>
                                <span className="font-bold text-green-600 dark:text-green-400 text-sm">Rs. {totalDeliveryCost}</span>
                            </div>
                        </div>
                    )}

                    {/* Pick & Drop Fields */}
                    {(orderStatus === 'Confirmed Order' || orderStatus === 'Ready to Ship') && courierProvider === 'pickdrop' && (
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-500/30 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck size={14} className="text-orange-500" />
                                <span className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400">Pick & Drop Logistics</span>
                            </div>

                            {/* Destination Branch */}
                            <div className="relative">
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Destination Branch {!isReadOnly && <span className="text-red-500">*</span>}</label>
                                <div className={`flex items-center w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 gap-1 ${!isReadOnly ? 'focus-within:border-orange-500' : ''}`}>
                                    <Search size={12} className="text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        value={pickdropBranchSearch}
                                        onChange={(e) => { setPickdropBranchSearch(e.target.value); setIsBranchDropdownOpen(true); }}
                                        onFocus={() => { if (!isReadOnly) { setIsBranchDropdownOpen(true); fetchPickDropBranches(); } }}
                                        onBlur={() => setTimeout(() => setIsBranchDropdownOpen(false), 200)}
                                        readOnly={isReadOnly}
                                        placeholder="Search branch (e.g. Kathmandu)..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white"
                                    />
                                    {selectedPickdropBranch && !isReadOnly && (
                                        <button type="button" onClick={() => { setSelectedPickdropBranch(''); setPickdropBranchSearch(''); setPickdropCityArea(''); setPickdropDeliveryCost(0); }} className="text-slate-400 hover:text-red-400">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                                {!isReadOnly && isBranchDropdownOpen && (() => {
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
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Area &amp; City {!isReadOnly && <span className="text-red-500">*</span>}</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={pickdropCityArea}
                                        onChange={(e) => setPickdropCityArea(e.target.value)}
                                        readOnly={isReadOnly}
                                        placeholder="e.g. Kathmandu, Lalitpur..."
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-orange-500"
                                    />
                                    {/* Branch area suggestions */}
                                    {!isReadOnly && selectedPickdropBranch && (() => {
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

                            {/* Tracking URL (if already shipped) */}
                            {pickdropTrackingUrl && (
                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                    Tracking: <a href={pickdropTrackingUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">{pickdropTrackingUrl}</a>
                                </div>
                            )}

                            {/* Ship Button */}
                            {!isReadOnly && initialOrder?.id && (
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

                    {/* NCM (Nepal Can Move) Fields */}
                    {['Confirmed Order', 'Ready to Ship', 'Shipped', 'Delivery Process', 'Delivered', 'Delivery Failed', 'Hold', 'Return Process', 'Return Delivered'].includes(orderStatus) && courierProvider === 'ncm' && (
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
                                        disabled={isReadOnly}
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
                                        disabled={isReadOnly}
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none"
                                    >
                                        <option value="Door2Door">Door to Door</option>
                                        <option value="BranchPickup">Branch Pickup</option>
                                    </select>
                                </div>
                            </div>

                            {/* Destination Branch Search */}
                            <div className="relative">
                                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold">Destination Branch {!isReadOnly && <span className="text-red-500">*</span>}</label>
                                <div className={`flex items-center w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 gap-1 ${!isReadOnly ? 'focus-within:border-green-500' : ''}`}>
                                    <Search size={12} className="text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        value={ncmBranchSearch}
                                        onChange={(e) => { setNcmBranchSearch(e.target.value); setIsNcmBranchDropdownOpen(true); }}
                                        onFocus={() => { if (!isReadOnly) { setIsNcmBranchDropdownOpen(true); fetchNcmBranches(); } }}
                                        onBlur={() => setTimeout(() => setIsNcmBranchDropdownOpen(false), 200)}
                                        readOnly={isReadOnly}
                                        placeholder="Search district or branch..."
                                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-900 dark:text-white"
                                    />
                                </div>
                                {!isReadOnly && isNcmBranchDropdownOpen && (() => {
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
                            {!isReadOnly && initialOrder?.id && (
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

                    {/* Self Delivered Fields */}
                    {['Confirmed Order', 'Ready to Ship', 'Shipped', 'Delivery Process', 'Delivered', 'Hold'].includes(orderStatus) && courierProvider === 'self' && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 mb-1">
                                <Truck size={14} className="text-emerald-500" />
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Self Delivered Info</span>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1 uppercase font-bold text-[10px]">Est Delivery Charge <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={totalDeliveryCost}
                                    onChange={(e) => setTotalDeliveryCost(parseFloat(e.target.value) || 0)}
                                    readOnly={isReadOnly}
                                    placeholder="0"
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-emerald-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Local Logistics Fields */}
                    {(orderStatus === 'Confirmed Order' || orderStatus === 'Ready to Ship') && courierProvider === 'local' && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Logistic Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={logisticName}
                                        onChange={(e) => setLogisticName(e.target.value)}
                                        readOnly={isReadOnly}
                                        placeholder="e.g. Local Bus"
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Delivery Branch <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={deliveryBranch}
                                        onChange={(e) => setDeliveryBranch(e.target.value)}
                                        readOnly={isReadOnly}
                                        placeholder="e.g. Kalanki Branch"
                                        className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Est Delivery Cost <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={totalDeliveryCost}
                                    onChange={(e) => setTotalDeliveryCost(parseFloat(e.target.value) || 0)}
                                    readOnly={isReadOnly}
                                    placeholder="0"
                                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded p-2 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Row 11: Total Amount */}
                    <div className="p-4 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">TOTAL AMOUNT</span>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">Rs. {totalAmount}</span>
                    </div>

                </div>

                {/* Footer: Buttons */}
                <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex gap-3">
                    {/* View Mode Footer */}
                    {currentMode === 'view' && (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 text-slate-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-semibold"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => setCurrentMode('edit')}
                                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold"
                            >
                                Edit Order
                            </button>
                        </>
                    )}

                    {/* Create/Edit Mode Footer */}
                    {(currentMode === 'create' || currentMode === 'edit') && (
                        <>
                            <button
                                onClick={() => {
                                    if (currentMode === 'edit' && mode === 'view') {
                                        // If switching back to view, verify dirty
                                        if (isDirty) {
                                            if (window.confirm("Discard changes?")) {
                                                setIsDirty(false);
                                                setCurrentMode('view');
                                            }
                                        } else {
                                            setCurrentMode('view');
                                        }
                                    } else {
                                        handleClose();
                                    }
                                }}
                                className="flex-1 py-3 text-slate-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-bold disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : (currentMode === 'edit' ? 'Update Order' : 'Confirm & Sync')}
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}
