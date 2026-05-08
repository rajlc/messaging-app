"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const supabase_service_1 = require("../supabase/supabase.service");
const facebook_service_1 = require("../messaging/facebook.service");
const templates_service_1 = require("../templates/templates.service");
const messaging_gateway_1 = require("../socket/messaging.gateway");
const users_service_1 = require("../users/users.service");
const settings_service_1 = require("../settings/settings.service");
let OrdersService = OrdersService_1 = class OrdersService {
    configService;
    facebookService;
    templatesService;
    messagingGateway;
    settingsService;
    usersService;
    logger = new common_1.Logger(OrdersService_1.name);
    PAGE_MAPPING = {
        '104508142519049': 'Sasto Online Shopping',
        '107953682325493': 'Online Shopping Bagmati'
    };
    constructor(configService, facebookService, templatesService, messagingGateway, settingsService, usersService) {
        this.configService = configService;
        this.facebookService = facebookService;
        this.templatesService = templatesService;
        this.messagingGateway = messagingGateway;
        this.settingsService = settingsService;
        this.usersService = usersService;
    }
    async getInventoryConfig() {
        const dbUrl = await this.settingsService.getSetting('INV_APP_URL');
        const dbKey = await this.settingsService.getSetting('INV_APP_API_KEY');
        if (dbUrl && dbKey) {
            return { url: dbUrl, key: dbKey };
        }
        return {
            url: this.configService.get('INV_APP_URL') || 'http://localhost:5000',
            key: this.configService.get('INV_APP_API_KEY')
        };
    }
    async getInventoryProducts(search) {
        const { url, key } = await this.getInventoryConfig();
        if (!url || !key)
            return [];
        const cleanUrl = url.replace(/\/+$/, '');
        try {
            this.logger.log(`Fetching inventory from: ${cleanUrl}`);
            this.logger.log(`Using API Key (last 4 chars): ...${key.slice(-4)}`);
            const apiUrl = search
                ? `${cleanUrl}/api/inventory/public?search=${encodeURIComponent(search)}`
                : `${cleanUrl}/api/inventory/public`;
            const response = await axios_1.default.get(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${key}`
                }
            });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to fetch inventory products: ${error.message}`);
            if (error.response) {
                this.logger.error(`Status: ${error.response.status}`);
                this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
            }
            return [];
        }
    }
    async createExternalOrder(orderData) {
        try {
            this.logger.log(`Saving order to database: ${orderData.order_number}`);
            const savedOrder = await this.saveOrderToDatabase(orderData);
            this.logger.log(`✅ Order saved to Supabase with ID: ${savedOrder.id}`);
            if (savedOrder.order_status === 'Confirmed Order') {
                await this.syncToInventory(savedOrder);
            }
            return { success: true, data: savedOrder };
        }
        catch (dbError) {
            this.logger.error(`Failed to save order to database: ${dbError.message}`);
            return {
                success: false,
                error: `Failed to save order: ${dbError.message}`,
            };
        }
    }
    async saveOrderToDatabase(orderData) {
        const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
        if (!orderData.conversation_id && orderData.customer_id) {
            if (isUuid(orderData.customer_id)) {
                this.logger.log(`Auto-mapping customer_id UUID ${orderData.customer_id} to conversation_id`);
                orderData.conversation_id = orderData.customer_id;
            }
            else {
                this.logger.log(`Looking up conversation UUID for PSID: ${orderData.customer_id}`);
                const { data: conv, error: convError } = await supabase_service_1.supabaseService.getSupabaseClient()
                    .from('conversations')
                    .select('id')
                    .eq('customer_id', orderData.customer_id)
                    .maybeSingle();
                if (conv) {
                    this.logger.log(`✅ Found conversation UUID ${conv.id} for PSID ${orderData.customer_id}`);
                    orderData.conversation_id = conv.id;
                }
                else if (convError) {
                    this.logger.error(`Error looking up conversation for PSID: ${convError.message}`);
                }
                else {
                    this.logger.warn(`No conversation found for PSID: ${orderData.customer_id}. Order won't be linked to a chat.`);
                }
            }
        }
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .insert({
            order_number: orderData.order_number,
            customer_name: orderData.customer_name,
            phone_number: orderData.phone_number,
            alternative_phone: orderData.alternative_phone,
            address: orderData.address,
            platform: orderData.platform,
            page_name: orderData.page_name,
            order_status: orderData.order_status || 'New Order',
            delivery_charge: orderData.delivery_charge || 0,
            total_amount: orderData.total_amount,
            items: orderData.items,
            customer_id: orderData.customer_id,
            conversation_id: orderData.conversation_id,
            courier_provider: orderData.courier_provider || 'pathao',
            city_name: orderData.city_name,
            city_id: orderData.city_id,
            zone_name: orderData.zone_name,
            zone_id: orderData.zone_id,
            area_name: orderData.area_name,
            area_id: orderData.area_id,
            weight: orderData.weight,
            courier_delivery_fee: orderData.courier_delivery_fee,
            logistic_name: orderData.logistic_name,
            delivery_branch: orderData.delivery_branch,
            pickdrop_destination_branch: orderData.pickdrop_destination_branch,
            pickdrop_city_area: orderData.pickdrop_city_area,
            created_by: orderData.created_by,
            platform_account: orderData.platform_account || orderData.page_name,
            remarks: orderData.remarks,
            ncm_from_branch: orderData.ncm_from_branch,
            ncm_to_branch: orderData.ncm_to_branch,
            ncm_delivery_type: orderData.ncm_delivery_type,
            package_description: orderData.package_description
        })
            .select()
            .single();
        if (error) {
            throw error;
        }
        await this.recordStatusHistory(data.id, data.order_status, data.created_by || 'System');
        return data;
    }
    async recordStatusHistory(orderId, status, changedBy, remarks) {
        try {
            const { error } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('order_status_history')
                .insert({
                order_id: orderId,
                status: status,
                changed_by: changedBy,
                remarks: remarks || null,
                changed_at: new Date().toISOString()
            });
            if (error) {
                this.logger.error(`Failed to record status history for order ${orderId}: ${error.message}`);
            }
            else {
                this.logger.log(`✅ Status history recorded for order ${orderId}: ${status} by ${changedBy}`);
            }
        }
        catch (error) {
            this.logger.error(`Exception recording status history for order ${orderId}: ${error.message}`);
        }
    }
    getCaseVariations(values) {
        if (!values)
            return [];
        const variations = new Set();
        values.forEach(v => {
            variations.add(v);
            variations.add(v.toLowerCase());
            variations.add(v.toUpperCase());
            if (v.length > 0) {
                variations.add(v.charAt(0).toUpperCase() + v.slice(1).toLowerCase());
            }
        });
        return Array.from(variations);
    }
    async getAllOrders(limit = 50, offset = 0, user) {
        let query = supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('*');
        if (user && user.role === 'rider') {
            this.logger.log(`DEBUG: Fetching assigned orders for Rider ${user.id}`);
            query = query.eq('assigned_rider_id', user.id);
        }
        else if (user && user.role === 'user') {
            this.logger.log(`DEBUG: Fetching orders for User ${user.id} (${user.email})`);
            let freshUser = user;
            try {
                freshUser = await this.usersService.findById(user.id);
            }
            catch (e) {
                this.logger.warn(`Could not fetch fresh user data for ${user.id}, using token data.`);
            }
            const platforms = this.getCaseVariations(freshUser.platforms || []);
            const accounts = this.getCaseVariations(freshUser.accounts || []);
            this.logger.log(`DEBUG: Expanded Platforms: ${JSON.stringify(platforms)}`);
            this.logger.log(`DEBUG: Expanded Accounts: ${JSON.stringify(accounts)}`);
            if (platforms.length === 0 && accounts.length === 0) {
                this.logger.warn(`User ${user.id} has no platform/account permissions. Returning empty.`);
                return [];
            }
            const name = freshUser.full_name ? `"${freshUser.full_name}"` : '""';
            const email = freshUser.email ? `"${freshUser.email}"` : '""';
            const othersCondition = `and(platform.eq.Others,page_name.eq.Others,or(created_by.eq.${name},created_by.eq.${email}))`;
            if (accounts.length > 0) {
                const validAccounts = [...accounts];
                accounts.forEach(acc => {
                    const name = this.PAGE_MAPPING[acc];
                    if (name)
                        validAccounts.push(name);
                });
                const finalAccounts = this.getCaseVariations(validAccounts);
                const accountList = finalAccounts.map(a => `"${a}"`).join(',');
                query = query.or(`platform_account.in.(${accountList}),page_name.in.(${accountList}),${othersCondition}`);
            }
            else if (platforms.length > 0) {
                const platformList = platforms.map(p => `"${p}"`).join(',');
                query = query.or(`platform.in.(${platformList}),${othersCondition}`);
            }
            else {
                query = query.or(othersCondition);
            }
        }
        const { data, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) {
            this.logger.error(`Failed to fetch orders: ${error.message}`);
            throw error;
        }
        if (data && data.length > 0) {
            const orderIds = data.map(o => o.id);
            const { data: histories } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('order_status_history')
                .select('*')
                .in('order_id', orderIds)
                .order('changed_at', { ascending: true });
            if (histories) {
                this.logger.log(`DEBUG: Found ${histories.length} history records for ${orderIds.length} orders.`);
                const historyMap = histories.reduce((acc, h) => {
                    if (!acc[h.order_id])
                        acc[h.order_id] = [];
                    acc[h.order_id].push(h);
                    return acc;
                }, {});
                const result = data.map(o => ({
                    ...o,
                    status_history: historyMap[o.id] || []
                }));
                this.logger.log(`DEBUG: Returning ${result.length} orders with potential history.`);
                return result;
            }
            else {
                this.logger.warn(`DEBUG: Histories fetch returned null/undefined for ${orderIds.length} orders.`);
            }
        }
        return data;
    }
    async getOrdersByCustomer(customerId, user) {
        let query = supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('customer_id', customerId);
        if (user && user.role === 'user') {
            let freshUser = user;
            try {
                freshUser = await this.usersService.findById(user.id);
            }
            catch (e) {
                this.logger.warn(`Could not fetch fresh user data for ${user.id}, using token data.`);
            }
            const platforms = this.getCaseVariations(freshUser.platforms || []);
            const accounts = this.getCaseVariations(freshUser.accounts || []);
            const othersCondition = `and(platform.eq.Others,page_name.eq.Others,created_by.eq."${freshUser.full_name}")`;
            if (accounts.length > 0) {
                const validAccounts = [...accounts];
                accounts.forEach(acc => {
                    const name = this.PAGE_MAPPING[acc];
                    if (name)
                        validAccounts.push(name);
                });
                const finalAccounts = this.getCaseVariations(validAccounts);
                const accountList = finalAccounts.map(a => `"${a}"`).join(',');
                query = query.or(`platform_account.in.(${accountList}),page_name.in.(${accountList}),${othersCondition}`);
            }
            else if (platforms.length > 0) {
                const platformList = platforms.map(p => `"${p}"`).join(',');
                query = query.or(`platform.in.(${platformList}),${othersCondition}`);
            }
            else {
                query = query.or(othersCondition);
            }
        }
        const { data, error } = await query
            .order('created_at', { ascending: false });
        if (error) {
            this.logger.error(`Failed to fetch orders for customer: ${error.message}`);
            throw error;
        }
        if (data && data.length > 0) {
            const orderIds = data.map(o => o.id);
            const { data: histories } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('order_status_history')
                .select('*')
                .in('order_id', orderIds)
                .order('changed_at', { ascending: true });
            if (histories) {
                const historyMap = histories.reduce((acc, h) => {
                    if (!acc[h.order_id])
                        acc[h.order_id] = [];
                    acc[h.order_id].push(h);
                    return acc;
                }, {});
                return data.map(o => ({
                    ...o,
                    status_history: historyMap[o.id] || []
                }));
            }
        }
        return data;
    }
    async getOrderById(id, user) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            this.logger.error(`Failed to fetch order ${id}: ${error.message}`);
            throw error;
        }
        if (user && user.role !== 'admin') {
            let freshUser = user;
            try {
                freshUser = await this.usersService.findById(user.id);
            }
            catch (e) { }
            const platforms = this.getCaseVariations(freshUser.platforms || []);
            const accounts = this.getCaseVariations(freshUser.accounts || []);
            let authorized = false;
            if (accounts.length > 0) {
                const validAccounts = [...accounts];
                accounts.forEach(acc => {
                    const name = this.PAGE_MAPPING[acc];
                    if (name)
                        validAccounts.push(name);
                });
                authorized = validAccounts.includes(data.platform_account) || validAccounts.includes(data.page_name);
            }
            else if (platforms.length > 0) {
                authorized = platforms.includes(data.platform);
            }
            else {
                authorized = false;
            }
            if (!authorized && data.platform === 'Others' && data.page_name === 'Others') {
                if (data.created_by && (data.created_by === freshUser.full_name || data.created_by === freshUser.email)) {
                    authorized = true;
                }
            }
            if (!authorized) {
                this.logger.warn(`User ${user.id} attempted to access unauthorized order ${id}`);
                throw new Error('Unauthorized to view this order');
            }
        }
        const { data: history, error: historyError } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('order_status_history')
            .select('*')
            .eq('order_id', id)
            .order('changed_at', { ascending: true });
        if (!historyError) {
            data.status_history = history;
        }
        return data;
    }
    async updateOrder(id, orderData, user) {
        const { data: currentOrder, error: fetchError } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('id', id)
            .single();
        if (fetchError) {
            this.logger.error(`Failed to fetch current order for update: ${fetchError.message}`);
            throw fetchError;
        }
        if (user && user.role !== 'admin') {
            const canEdit = await this.canUserEditOrder(currentOrder, user);
            if (!canEdit) {
                throw new Error('You do not have permission to edit this order');
            }
        }
        const updatePayload = {
            customer_name: orderData.customer_name,
            phone_number: orderData.phone_number,
            alternative_phone: orderData.alternative_phone,
            address: orderData.address,
            order_status: orderData.order_status,
            delivery_charge: orderData.delivery_charge,
            total_amount: orderData.total_amount,
            items: orderData.items,
            remarks: orderData.remarks,
            courier_provider: orderData.courier_provider,
            city_name: orderData.city_name,
            city_id: orderData.city_id,
            zone_name: orderData.zone_name,
            zone_id: orderData.zone_id,
            area_name: orderData.area_name,
            area_id: orderData.area_id,
            weight: orderData.weight,
            courier_delivery_fee: orderData.courier_delivery_fee,
            logistic_name: orderData.logistic_name,
            delivery_branch: orderData.delivery_branch,
            pickdrop_destination_branch: orderData.pickdrop_destination_branch,
            pickdrop_city_area: orderData.pickdrop_city_area,
            ncm_from_branch: orderData.ncm_from_branch,
            ncm_to_branch: orderData.ncm_to_branch,
            ncm_delivery_type: orderData.ncm_delivery_type,
            package_description: orderData.package_description,
            updated_by: user?.full_name || 'System'
        };
        if (orderData.order_status === 'Confirmed Order' && currentOrder.order_status !== 'Confirmed Order') {
            updatePayload.confirmed_at = new Date().toISOString();
            updatePayload.confirmed_by = user?.full_name || 'System';
        }
        if (orderData.order_status === 'Shipped' && currentOrder.order_status !== 'Shipped') {
            updatePayload.shipped_at = new Date().toISOString();
            updatePayload.shipped_by = user?.full_name || user?.email || 'System';
        }
        if (orderData.order_status === 'Packed' && currentOrder.order_status !== 'Packed') {
            updatePayload.packed_at = new Date().toISOString();
            updatePayload.packed_by = user?.full_name || user?.email || 'System';
        }
        if (orderData.order_status === 'Arrived at Branch' && currentOrder.order_status !== 'Arrived at Branch') {
            updatePayload.arrived_at_branch_at = new Date().toISOString();
            updatePayload.arrived_at_branch_by = user?.full_name || user?.email || 'System';
        }
        if (orderData.order_status === 'Delivered' && currentOrder.order_status !== 'Delivered') {
            updatePayload.delivered_at = new Date().toISOString();
            updatePayload.delivered_by = user?.full_name || user?.email || 'System';
        }
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .update(updatePayload)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            this.logger.error(`Failed to update order: ${error.message}`);
            throw error;
        }
        const oldStatus = (currentOrder.order_status || '').trim();
        const newStatus = (data.order_status || '').trim();
        this.logger.log(`DEBUG: Comparing status for order ${id}: "${oldStatus}" vs "${newStatus}"`);
        if (oldStatus !== newStatus) {
            this.logger.log(`DEBUG: Status changed. Recording history for order ${id}`);
            let actor = user?.full_name || user?.email || 'System';
            await this.recordStatusHistory(id, data.order_status, actor);
            this.handleStatusChange(data).catch(err => {
                this.logger.error(`Background auto-message failed: ${err.message}`);
            });
            this.handleInventorySync(data, currentOrder.order_status).catch(err => {
                this.logger.error(`Background inventory sync failed: ${err.message}`);
            });
        }
        else {
            this.logger.log(`DEBUG: Status NOT changed for order ${id}. Skipping history recording.`);
        }
        return { success: true, data };
    }
    async canUserEditOrder(order, user) {
        if (!user)
            return false;
        if (user.role === 'admin')
            return true;
        let freshUser = user;
        try {
            freshUser = await this.usersService.findById(user.id);
        }
        catch (e) {
            this.logger.warn(`Could not fetch fresh user data for ${user.id}, using token data.`);
        }
        const platforms = this.getCaseVariations(freshUser.platforms || []);
        const accounts = this.getCaseVariations(freshUser.accounts || []);
        if (accounts.length > 0) {
            const validAccounts = [...accounts];
            accounts.forEach(acc => {
                const name = this.PAGE_MAPPING[acc];
                if (name)
                    validAccounts.push(name);
            });
            return validAccounts.includes(order.platform_account) || validAccounts.includes(order.page_name);
        }
        else if (platforms.length > 0) {
            return platforms.includes(order.platform);
        }
        return false;
    }
    async handleInventorySync(order, previousStatus) {
        if (order.order_status === 'Confirmed Order' && previousStatus !== 'Confirmed Order') {
            await this.syncToInventory(order);
            return;
        }
        const relevantStatuses = ['Shipped', 'Delivered', 'Cancelled'];
        if (relevantStatuses.includes(order.order_status)) {
            await this.updateInventoryStatus(order);
        }
    }
    async syncToInventory(order) {
        const { url, key } = await this.getInventoryConfig();
        if (!url || !key) {
            this.logger.warn('Inventory sync skipped: Missing Config');
            return;
        }
        try {
            this.logger.log(`Pushing order ${order.order_number} to inventory...`);
            const mappedItems = order.items.map((item) => ({
                product_id: null,
                product_name: item.product_id
                    ? `${item.product_name} (ID: ${item.product_id})`
                    : item.product_name,
                quantity: item.qty || item.quantity,
                price: item.amount
            }));
            const orderDate = order.created_at
                ? new Date(order.created_at).toISOString().split('T')[0]
                : new Date().toISOString().split('T')[0];
            const payload = {
                messaging_app_order_id: order.id,
                order_number: order.order_number,
                order_date: orderDate,
                customer_name: order.customer_name,
                phone_number: order.phone_number,
                alternative_phone: order.alternative_phone,
                address: order.address,
                platform: order.platform,
                page_name: order.page_name,
                items: mappedItems,
                total_amount: order.total_amount,
                delivery_charge: order.delivery_charge,
                order_status: order.order_status,
                courier_provider: order.courier_provider,
                logistic_name: order.logistic_name,
                delivery_branch: order.delivery_branch,
                courier_consignment_id: order.courier_consignment_id,
                city: order.city_name,
                branch_charge: order.courier_delivery_fee || 0,
                confirmed_at: order.confirmed_at,
                confirmed_by: order.confirmed_by,
                shipped_at: order.shipped_at,
                shipped_by: order.shipped_by
            };
            this.logger.log(`Sync payload: ${JSON.stringify(payload, null, 2)}`);
            const targetUrl = `${url}/api/sales/messenger`;
            this.logger.log(`🚀 SENDING TO: ${targetUrl}`);
            this.logger.log(`🔑 USING KEY: ...${key.slice(-4)}`);
            await axios_1.default.post(targetUrl, payload, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            this.logger.log(`✅ Order synced to inventory system.`);
        }
        catch (error) {
            this.logger.error(`Failed to sync order to inventory: ${error.message}`);
            if (error.response) {
                this.logger.error(`Response status: ${error.response.status}`);
                this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
            }
        }
    }
    async updateInventoryStatus(order) {
        const { url, key } = await this.getInventoryConfig();
        if (!url || !key)
            return;
        try {
            this.logger.log(`Updating order status ${order.order_number} in inventory...`);
            await axios_1.default.put(`${url}/api/sales/messenger/status`, {
                order_number: order.order_number,
                status: order.order_status
            }, {
                headers: { 'Authorization': `Bearer ${key}` }
            });
            this.logger.log(`✅ Inventory status updated.`);
        }
        catch (error) {
            this.logger.error(`Failed to update inventory status: ${error.message}`);
        }
    }
    async handleStatusChange(order) {
        try {
            this.logger.log(`Order ${order.order_number} status changed to ${order.order_status}. Checking for templates...`);
            const isAutoMessageEnabled = await this.settingsService.getSetting('AUTO_MESSAGE_ENABLED');
            if (isAutoMessageEnabled === 'false') {
                this.logger.log(`Global auto-messaging is DISABLED. Skipping.`);
                return;
            }
            if (order.order_status === 'Follow up again') {
                this.logger.log(`Skipping auto-message for status: ${order.order_status}`);
                return;
            }
            const templates = await this.templatesService.getAllTemplates();
            if (!templates)
                return;
            const templateObj = templates.find((t) => t.status === order.order_status);
            if (!templateObj || !templateObj.template) {
                this.logger.log(`No template found for status: ${order.order_status}`);
                return;
            }
            if (templateObj.is_active === false || templateObj.is_active === 'false') {
                this.logger.log(`Template for status "${order.order_status}" is DEACTIVATED. Skipping message.`);
                return;
            }
            let message = templateObj.template;
            message = message.replace(/{{customer_name}}/g, order.customer_name || 'Customer');
            message = message.replace(/{{order_number}}/g, order.order_number || '');
            message = message.replace(/{{total_amount}}/g, order.total_amount || '0');
            message = message.replace(/{{order_status}}/g, order.order_status || '');
            if (order.customer_id) {
                this.logger.log(`Sending auto-message to ${order.customer_id}: ${message}`);
                await this.facebookService.sendMessage(order.customer_id, message);
                let conversationId = order.conversation_id;
                if (!conversationId) {
                    const { data: conv } = await supabase_service_1.supabaseService.getSupabaseClient()
                        .from('conversations')
                        .select('id')
                        .eq('customer_id', order.customer_id)
                        .single();
                    conversationId = conv?.id;
                }
                if (conversationId) {
                    await supabase_service_1.supabaseService.saveMessage({
                        conversationId: conversationId,
                        text: message,
                        sender: 'agent',
                        platform: 'facebook',
                    });
                    this.logger.log(`✅ Auto-message saved to database for conversation ${conversationId}`);
                    this.messagingGateway.broadcastIncomingMessage('facebook', {
                        text: message,
                        senderId: order.customer_id,
                        pageId: order.page_id,
                        timestamp: new Date(),
                        sender: 'agent'
                    });
                }
                else {
                    this.logger.warn(`Could not save auto-message to DB: No conversation found for customer ${order.customer_id}`);
                }
            }
            else {
                this.logger.warn(`Cannot send auto-message: Order ${order.order_number} has no customer_id`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to handle status change auto-message: ${error.message}`);
        }
    }
    async testAutoMessage(orderId, targetStatus) {
        const logs = [];
        const log = (msg) => {
            this.logger.log(`[Debug] ${msg}`);
            logs.push(msg);
        };
        try {
            log(`Starting debug for Order ID: ${orderId}, Status: ${targetStatus}`);
            const { data: order, error } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();
            if (error || !order) {
                log(`Failed to fetch order: ${error?.message || 'Order not found'}`);
                return { success: false, logs };
            }
            log(`Order found. Number: ${order.order_number}, CustomerID: ${order.customer_id}`);
            const templates = await this.templatesService.getAllTemplates();
            log(`Fetched ${templates?.length || 0} templates.`);
            const templateObj = templates?.find((t) => t.status === targetStatus);
            if (!templateObj) {
                log(`No template found for status '${targetStatus}'. Available: ${templates?.map((t) => t.status).join(', ')}`);
                return { success: false, logs };
            }
            log(`Template found: "${templateObj.template}"`);
            let message = templateObj.template;
            message = message.replace(/{{customer_name}}/g, order.customer_name || 'Customer');
            message = message.replace(/{{order_number}}/g, order.order_number || '');
            message = message.replace(/{{total_amount}}/g, order.total_amount || '0');
            message = message.replace(/{{order_status}}/g, targetStatus || '');
            log(`Compiled message: "${message}"`);
            if (!order.customer_id) {
                log('❌ Order has NO customer_id. Cannot send.');
                return { success: false, logs };
            }
            log(`Attempting to send to Facebook user: ${order.customer_id}`);
            const result = await this.facebookService.sendMessage(order.customer_id, message);
            log(`✅ Facebook API Response: ${JSON.stringify(result)}`);
            return { success: true, logs };
        }
        catch (error) {
            log(`❌ Exception: ${error.message}`);
            return { success: false, logs };
        }
    }
    async updateStatusFromInventory(orderNumber, newStatus) {
        try {
            this.logger.log(`Received status update from inventory: Order ${orderNumber} -> ${newStatus}`);
            const { data: orders, error: fetchError } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .select('*')
                .eq('order_number', orderNumber)
                .limit(1);
            if (fetchError) {
                this.logger.error(`Error fetching order: ${fetchError.message}`);
                return { success: false, error: fetchError.message };
            }
            if (!orders || orders.length === 0) {
                this.logger.warn(`Order ${orderNumber} not found`);
                return { success: false, error: 'Order not found' };
            }
            const order = orders[0];
            const { error: updateError } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .update({
                order_status: newStatus,
                updated_at: new Date().toISOString()
            })
                .eq('id', order.id);
            if (updateError) {
                this.logger.error(`Error updating order status: ${updateError.message}`);
                return { success: false, error: updateError.message };
            }
            await this.recordStatusHistory(order.id, newStatus, 'Inventory System');
            this.logger.log(`✅ Order ${orderNumber} status updated to: ${newStatus}`);
            this.messagingGateway.server.emit('orderUpdated', {
                orderId: order.id,
                orderNumber: orderNumber,
                newStatus
            });
            return { success: true, message: 'Status updated successfully' };
        }
        catch (error) {
            this.logger.error(`Failed to update status from inventory: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async assignToRider(orderId, riderId, adminName) {
        try {
            const rider = await this.usersService.findById(riderId);
            if (!rider)
                throw new Error('Rider not found');
            const timestamp = new Date();
            const auditMessage = `Assigned to Rider ${rider.full_name} at ${timestamp.toLocaleString()} by ${adminName}`;
            const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .update({
                order_status: 'Packed',
                assigned_rider_id: riderId,
                assigned_at: timestamp.toISOString(),
                assigned_by: adminName,
                updated_at: timestamp.toISOString()
            })
                .eq('id', orderId)
                .select()
                .single();
            if (error)
                throw error;
            await this.recordStatusHistory(orderId, 'Packed', adminName, auditMessage);
            this.messagingGateway.server.emit('orderUpdated', {
                orderId: orderId,
                newStatus: 'Packed',
                assignedRider: rider.full_name
            });
            return { success: true, data };
        }
        catch (error) {
            this.logger.error(`Failed to assign rider: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async getRiderOrders(riderId) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .select(`
                    *,
                    status_history:order_status_history(*)
                `)
                .eq('assigned_rider_id', riderId)
                .gte('assigned_at', sevenDaysAgo.toISOString())
                .order('assigned_at', { ascending: false });
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            this.logger.error(`Failed to fetch rider orders: ${error.message}`);
            return [];
        }
    }
    async cancelAssignment(orderId, actorName) {
        try {
            const timestamp = new Date();
            const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .update({
                order_status: 'Return Process',
                updated_at: timestamp.toISOString()
            })
                .eq('id', orderId)
                .select()
                .single();
            if (error)
                throw error;
            await this.recordStatusHistory(orderId, 'Return Process', actorName, `Marked for return by rider ${actorName}`);
            this.messagingGateway.server.emit('orderUpdated', {
                orderId: orderId,
                newStatus: 'Return Process'
            });
            return { success: true, data };
        }
        catch (error) {
            this.logger.error(`Failed to cancel assignment: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async updateDeliveryStatus(orderId, status, actorName) {
        try {
            const timestamp = new Date();
            const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .update({
                order_status: status,
                updated_at: timestamp.toISOString()
            })
                .eq('id', orderId)
                .select()
                .single();
            if (error)
                throw error;
            await this.recordStatusHistory(orderId, status, actorName, `Delivery status updated to ${status} by ${actorName}`);
            this.messagingGateway.server.emit('orderUpdated', {
                orderId: orderId,
                newStatus: status
            });
            return { success: true, data };
        }
        catch (error) {
            this.logger.error(`Failed to update delivery status: ${error.message}`);
            return { success: false, error: error.message };
        }
    }
    async getAdminDeliveryOrders() {
        try {
            const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .select(`
                    *,
                    assigned_rider:users!assigned_rider_id (
                        full_name
                    )
                `)
                .eq('courier_provider', 'self')
                .order('updated_at', { ascending: false });
            if (error)
                throw error;
            return data;
        }
        catch (error) {
            this.logger.error(`Failed to fetch admin delivery orders: ${error.message}`);
            return [];
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        facebook_service_1.FacebookService,
        templates_service_1.TemplatesService,
        messaging_gateway_1.MessagingGateway,
        settings_service_1.SettingsService,
        users_service_1.UsersService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map