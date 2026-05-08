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
var LogisticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogisticsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const settings_service_1 = require("../settings/settings.service");
const supabase_service_1 = require("../supabase/supabase.service");
const orders_service_1 = require("../orders/orders.service");
let LogisticsService = LogisticsService_1 = class LogisticsService {
    settingsService;
    ordersService;
    logger = new common_1.Logger(LogisticsService_1.name);
    areaCache = null;
    tokenCache = null;
    CACHE_TTL = 24 * 60 * 60 * 1000;
    isFetchingAreas = false;
    constructor(settingsService, ordersService) {
        this.settingsService = settingsService;
        this.ordersService = ordersService;
    }
    async onModuleInit() {
        this.logger.log('LogisticsService initialized. Starting background area cache warming...');
        this.getAllAreas().catch(err => {
            this.logger.error('Failed to warm Pathao area cache in background:', err.message);
        });
    }
    async getCredentials() {
        const settings = await this.settingsService.getCourierSettings('pathao');
        if (!settings)
            throw new Error('Pathao settings not found');
        return settings;
    }
    async getAccessToken() {
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
            return this.tokenCache.token;
        }
        const creds = await this.getCredentials();
        this.logger.log(`Attempting Pathao login for ${creds.username}...`);
        try {
            const response = await axios_1.default.post(`${creds.base_url}/aladdin/api/v1/issue-token`, {
                client_id: creds.client_id,
                client_secret: creds.client_secret,
                username: creds.username,
                password: creds.password,
                grant_type: 'password'
            });
            const token = response.data.access_token || response.data.data?.access_token;
            const expiresIn = response.data.expires_in || response.data.data?.expires_in || 3600;
            this.tokenCache = {
                token,
                expiresAt: Date.now() + expiresIn * 1000
            };
            this.logger.log('Pathao token issued and cached successfully');
            return token;
        }
        catch (error) {
            this.logger.error('Failed to get Pathao access token', error.response?.data || error.message);
            throw new Error(`Pathao Auth Failed: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }
    async getCities() {
        try {
            const token = await this.getAccessToken();
            const creds = await this.getCredentials();
            this.logger.log(`Fetching cities from ${creds.base_url}/aladdin/api/v1/city-list`);
            const response = await axios_1.default.post(`${creds.base_url}/aladdin/api/v1/city-list`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.logger.log(`Pathao city-list response (POST): ${JSON.stringify(response.data)}`);
            if (response.data?.error) {
                throw new Error(response.data.message || 'Unauthorized');
            }
            const cities = response.data?.data?.data || response.data?.data || [];
            this.logger.log(`Fetched ${cities.length} cities`);
            return cities;
        }
        catch (error) {
            this.logger.warn('Failed to fetch cities via POST, trying GET...', error.message);
            try {
                const token = await this.getAccessToken();
                const creds = await this.getCredentials();
                const response = await axios_1.default.get(`${creds.base_url}/aladdin/api/v1/city-list`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                this.logger.log(`Pathao city-list response (GET): ${JSON.stringify(response.data)}`);
                if (response.data?.error) {
                    throw new Error(response.data.message || 'Unauthorized');
                }
                return response.data?.data?.data || response.data?.data || [];
            }
            catch (getError) {
                this.logger.error('Failed to fetch cities via both POST and GET', getError.response?.data || getError.message);
                throw getError;
            }
        }
    }
    async getZones(cityId) {
        const token = await this.getAccessToken();
        const creds = await this.getCredentials();
        try {
            const response = await axios_1.default.get(`${creds.base_url}/aladdin/api/v1/cities/${cityId}/zone-list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data?.data?.data || [];
        }
        catch (error) {
            if (error.response?.status !== 429) {
                this.logger.error(`Failed to fetch zones for city ${cityId}: ${error.message}`);
            }
            throw error;
        }
    }
    async getAreas(zoneId) {
        const token = await this.getAccessToken();
        const creds = await this.getCredentials();
        try {
            const response = await axios_1.default.get(`${creds.base_url}/aladdin/api/v1/zones/${zoneId}/area-list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data?.data?.data || [];
        }
        catch (error) {
            if (error.response?.status !== 429) {
                this.logger.error(`Failed to fetch areas for zone ${zoneId}: ${error.message}`);
            }
            throw error;
        }
    }
    async retryWithBackoff(fn, maxRetries = 3, initialDelay = 2000) {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                return await fn();
            }
            catch (error) {
                const isRateLimited = error.response?.status === 429 ||
                    error.message?.includes('429') ||
                    (error.response?.data && JSON.stringify(error.response.data).includes('429'));
                if (isRateLimited && retries < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, retries);
                    this.logger.warn(`Pathao API Rate Limited (429). Retrying in ${delay / 1000}s... (Attempt ${retries + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    retries++;
                    continue;
                }
                throw error;
            }
        }
        throw new Error(`Max retries reached for Pathao API call`);
    }
    async getAllAreas() {
        if (this.areaCache && (Date.now() - this.areaCache.timestamp) < this.CACHE_TTL) {
            return this.areaCache.data;
        }
        if (this.isFetchingAreas) {
            this.logger.log('Pathao areas are currently being fetched. Returning partial cache...');
            return this.areaCache?.data || [];
        }
        this.isFetchingAreas = true;
        try {
            this.logger.log('Fetching Pathao areas in background (this may take a few minutes)...');
            const cities = await this.getCities();
            if (!this.areaCache) {
                this.areaCache = { data: [], timestamp: Date.now() };
            }
            for (const city of cities) {
                try {
                    const zones = await this.retryWithBackoff(() => this.getZones(city.city_id));
                    const newCityAreas = [];
                    if (zones.length === 0) {
                        newCityAreas.push({
                            city_id: city.city_id,
                            city_name: city.city_name,
                            zone_id: null,
                            zone_name: null,
                            area_id: null,
                            area_name: null,
                            display_name: city.city_name
                        });
                    }
                    else {
                        for (const zone of zones) {
                            try {
                                const areas = await this.retryWithBackoff(() => this.getAreas(zone.zone_id));
                                if (areas.length === 0) {
                                    newCityAreas.push({
                                        city_id: city.city_id,
                                        city_name: city.city_name,
                                        zone_id: zone.zone_id,
                                        zone_name: zone.zone_name,
                                        area_id: zone.zone_id,
                                        area_name: zone.zone_name,
                                        display_name: `${zone.zone_name} (${city.city_name})`
                                    });
                                }
                                else {
                                    for (const area of areas) {
                                        newCityAreas.push({
                                            city_id: city.city_id,
                                            city_name: city.city_name,
                                            zone_id: zone.zone_id,
                                            zone_name: zone.zone_name,
                                            area_id: area.area_id,
                                            area_name: area.area_name,
                                            display_name: `${area.area_name} (${city.city_name})`
                                        });
                                    }
                                }
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                            catch (e) {
                                this.logger.warn(`Failed to fetch areas for zone ${zone.zone_id} in ${city.city_name} after retries: ${e.message}`);
                                newCityAreas.push({
                                    city_id: city.city_id,
                                    city_name: city.city_name,
                                    zone_id: zone.zone_id,
                                    zone_name: zone.zone_name,
                                    area_id: zone.zone_id,
                                    area_name: zone.zone_name,
                                    display_name: `${zone.zone_name} (${city.city_name})`
                                });
                            }
                        }
                    }
                    if (newCityAreas.length > 0) {
                        this.areaCache.data = [...this.areaCache.data, ...newCityAreas];
                        this.areaCache.timestamp = Date.now();
                        const cityIndex = cities.indexOf(city);
                        if (cityIndex % 10 === 0 || cityIndex === cities.length - 1) {
                            this.logger.log(`Logistics Cache: ${this.areaCache.data.length} areas loaded (${cityIndex + 1}/${cities.length} cities)...`);
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                catch (e) {
                    this.logger.warn(`Failed to fetch zones for city ${city.city_id} (${city.city_name}) after retries: ${e.message}`);
                    const partialCityAreas = [{
                            city_id: city.city_id,
                            city_name: city.city_name,
                            zone_id: city.city_id,
                            zone_name: city.city_name,
                            area_id: city.city_id,
                            area_name: city.city_name,
                            display_name: city.city_name
                        }];
                    this.areaCache.data = [...this.areaCache.data, ...partialCityAreas];
                    this.areaCache.timestamp = Date.now();
                }
            }
            this.logger.log(`Completed fetching Pathao areas. Final total: ${this.areaCache.data.length}`);
            return this.areaCache.data;
        }
        finally {
            this.isFetchingAreas = false;
        }
    }
    async calculatePrice(payload) {
        const token = await this.getAccessToken();
        const creds = await this.getCredentials();
        let storeId = 0;
        try {
            const storesRes = await axios_1.default.get(`${creds.base_url}/aladdin/api/v1/stores`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (storesRes.data?.data?.data?.length > 0) {
                storeId = storesRes.data.data.data[0].store_id;
            }
        }
        catch (e) {
            this.logger.warn('Failed to fetch stores for store_id', e.message);
        }
        try {
            this.logger.log(`Calculating price with store_id: ${storeId}, payload: ${JSON.stringify(payload)}`);
            const response = await axios_1.default.post(`${creds.base_url}/aladdin/api/v1/merchant/price-plan`, {
                ...payload,
                store_id: storeId,
                item_type: 2,
                delivery_type: 48
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.logger.log(`Price calculation response: ${JSON.stringify(response.data)}`);
            return response.data.data;
        }
        catch (error) {
            this.logger.error('Failed to calculate price', error.response?.data || error.message);
            throw error;
        }
    }
    async createOrder(orderId) {
        const { data: order, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        if (error || !order)
            throw new Error('Order not found');
        const creds = await this.getCredentials();
        const token = await this.getAccessToken();
        let storeId = 0;
        try {
            const storesRes = await axios_1.default.get(`${creds.base_url}/aladdin/api/v1/stores`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (storesRes.data?.data?.data?.length > 0) {
                storeId = storesRes.data.data.data[0].store_id;
            }
        }
        catch (e) {
            this.logger.warn('Failed to fetch stores for store_id', e.message);
        }
        const payload = {
            store_id: storeId,
            merchant_order_id: order.order_number,
            sender_name: creds.contact_name || 'Store',
            sender_phone: creds.contact_number || '',
            recipient_name: order.customer_name,
            recipient_phone: order.phone_number,
            recipient_address: order.address,
            recipient_city: order.city_id,
            recipient_zone: order.zone_id,
            recipient_area: order.area_id,
            delivery_type: 48,
            item_type: 2,
            special_instruction: order.remarks,
            item_quantity: 1,
            item_weight: order.weight || 0.5,
            amount_to_collect: order.total_amount,
            item_description: order.items.map((i) => `${i.product_name} x${i.qty}`).join(', ')
        };
        try {
            this.logger.log(`Creating Pathao order for ${order.order_number}`);
            const response = await axios_1.default.post(`${creds.base_url}/aladdin/api/v1/orders`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            const result = response.data;
            if (result.type === 'success' || result.data?.consignment_id) {
                const consignment_id = result.data.consignment_id;
                await supabase_service_1.supabaseService.getSupabaseClient()
                    .from('orders')
                    .update({
                    courier_consignment_id: consignment_id,
                    order_status: 'Ready to Ship',
                    updated_at: new Date().toISOString()
                })
                    .eq('id', orderId);
                await this.ordersService.recordStatusHistory(orderId, 'Ready to Ship', 'system', `Pathao Shipment Created (Consignment ID: ${consignment_id})`);
                return { success: true, data: result.data };
            }
            else {
                throw new Error(result.message || JSON.stringify(result.errors));
            }
        }
        catch (error) {
            this.logger.error('Failed to create order in Pathao', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message);
        }
    }
    async getPathaoOrderInfo(orderId) {
        const { data: order, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('id, courier_consignment_id, order_status')
            .eq('id', orderId)
            .single();
        if (error || !order || !order.courier_consignment_id) {
            throw new Error('Order not found or not shipped via Pathao');
        }
        const creds = await this.getCredentials();
        const token = await this.getAccessToken();
        try {
            const response = await axios_1.default.get(`${creds.base_url}/aladdin/api/v1/orders/${order.courier_consignment_id}/info`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const pathaoData = response.data?.data;
            if (pathaoData && pathaoData.order_status) {
                let newStatus = order.order_status;
                if (pathaoData.order_status === 'Completed')
                    newStatus = 'Delivered';
                else if (pathaoData.order_status === 'Cancelled')
                    newStatus = 'Cancel';
                else if (pathaoData.order_status === 'Pickup Cancel')
                    newStatus = 'Pickup Cancel';
                let updateData = {};
                if (order.order_status !== newStatus) {
                    updateData.order_status = newStatus;
                }
                if (pathaoData.delivery_fee) {
                    updateData.courier_delivery_fee = pathaoData.delivery_fee;
                }
                if (Object.keys(updateData).length > 0) {
                    await supabase_service_1.supabaseService.getSupabaseClient()
                        .from('orders')
                        .update(updateData)
                        .eq('id', orderId);
                }
            }
            return pathaoData;
        }
        catch (error) {
            this.logger.error(`Failed to fetch Pathao info for ${order.courier_consignment_id}`, error.message);
            throw new Error('Failed to fetch info from Pathao');
        }
    }
    async handleWebhook(payload, headers) {
        this.logger.log(`Received Pathao webhook: ${JSON.stringify(payload)}`);
        const secretHeader = headers['x-pathao-merchant-webhook-integration-secret'] || headers['x-pathao-signature'];
        const expectedSecret = process.env.PATHAO_WEBHOOK_SECRET || 'f3992ecc-59da-4cbe-a049-a13da2018d51';
        if (secretHeader !== expectedSecret) {
            this.logger.warn(`Invalid Pathao webhook secret: ${secretHeader}`);
        }
        if (payload.event === 'webhook_integration') {
            this.logger.log('Pathao webhook integration verification request received.');
            return { message: 'Integration verified' };
        }
        const consignmentId = payload.consignment_id;
        const merchantOrderId = payload.merchant_order_id;
        if (!consignmentId) {
            return { message: 'No consignment_id ignored' };
        }
        const { data: order, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('courier_consignment_id', consignmentId)
            .single();
        if (error || !order) {
            this.logger.warn(`Order not found for consignment ${consignmentId}`);
            return { message: 'Order not found' };
        }
        let newStatus = order.order_status;
        let updateData = {};
        switch (payload.event) {
            case 'order.created':
            case 'order.updated':
            case 'order.pickup-requested':
            case 'order.assigned-for-pickup':
            case 'order.pickup-failed':
                newStatus = 'Ready to Ship';
                break;
            case 'order.pickup-cancelled':
                newStatus = 'Cancelled';
                updateData.status_reason = payload.reason;
                break;
            case 'order.picked':
            case 'order.in-transit':
            case 'order.at-the-sorting-hub':
            case 'order.received-at-last-mile-hub':
                newStatus = 'Shipped';
                if (!order.shipped_at) {
                    updateData.shipped_at = new Date().toISOString();
                }
                break;
            case 'order.assigned-for-delivery':
                newStatus = 'Delivery Process';
                break;
            case 'order.delivered':
                newStatus = 'Delivered';
                if (payload.delivery_fee)
                    updateData.courier_delivery_fee = payload.delivery_fee;
                break;
            case 'order.partial-delivery':
                newStatus = 'Delivered';
                updateData.status_reason = payload.reason;
                break;
            case 'order.delivery-failed':
                newStatus = 'Delivery Failed';
                updateData.status_reason = payload.reason;
                break;
            case 'order.returned':
            case 'order.paid-return':
                newStatus = 'Return Delivered';
                updateData.status_reason = payload.reason;
                break;
            case 'order.on-hold':
                newStatus = 'Hold';
                updateData.status_reason = payload.reason;
                break;
            case 'order.exchanged':
                newStatus = 'Delivered';
                updateData.status_reason = 'Exchanged';
                break;
            case 'order.paid':
            case 'store.created':
            case 'store.updated':
                break;
            default:
                this.logger.warn(`Pathao: UNMAPPED event '${payload.event}' — full payload: ${JSON.stringify(payload)}`);
                break;
        }
        if (newStatus !== order.order_status) {
            updateData.order_status = newStatus;
        }
        updateData.updated_at = new Date().toISOString();
        if (Object.keys(updateData).length > 1) {
            await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .update(updateData)
                .eq('id', order.id);
            await this.ordersService.recordStatusHistory(order.id, newStatus, 'Pathao', `Pathao Webhook: ${payload.event}${payload.reason ? ` (${payload.reason})` : ''}`);
            this.logger.log(`Updated order ${order.order_number} status to ${newStatus}`);
        }
        return { success: true };
    }
    async getSettlements(logisticId) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('logistic_cod_settlements')
            .select('*, created_at')
            .eq('logistic_id', logisticId)
            .order('date', { ascending: false });
        if (error)
            throw error;
        return data;
    }
    async updateSettlement(id, payload) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('logistic_cod_settlements')
            .update({
            amount: payload.amount,
            date: payload.date,
            remarks: payload.remarks,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async addSettlement(payload) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('logistic_cod_settlements')
            .insert([{
                logistic_id: payload.logisticId,
                amount: payload.amount,
                date: payload.date,
                remarks: payload.remarks
            }])
            .select()
            .single();
        if (error)
            throw error;
        return data;
    }
    async getOrderChangelogs(logisticId) {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('order_changelogs')
            .select(`
                *,
                orders (
                    order_number,
                    customer_name,
                    phone_number,
                    delivery_branch,
                    city_name,
                    total_amount,
                    courier_delivery_fee,
                    delivery_charge
                )
            `)
            .eq('logistic_id', logisticId)
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data;
    }
};
exports.LogisticsService = LogisticsService;
exports.LogisticsService = LogisticsService = LogisticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService,
        orders_service_1.OrdersService])
], LogisticsService);
//# sourceMappingURL=logistics.service.js.map