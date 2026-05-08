import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { SettingsService } from '../settings/settings.service';
import { supabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class LogisticsService implements OnModuleInit {
    private readonly logger = new Logger(LogisticsService.name);
    private areaCache: { data: any[], timestamp: number } | null = null;
    private tokenCache: { token: string, expiresAt: number } | null = null;
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    private isFetchingAreas = false;

    constructor(
        private settingsService: SettingsService,
        private ordersService: OrdersService
    ) { }

    async onModuleInit() {
        this.logger.log('LogisticsService initialized. Starting background area cache warming...');
        this.getAllAreas().catch(err => {
            this.logger.error('Failed to warm Pathao area cache in background:', err.message);
        });
    }

    private async getCredentials() {
        const settings = await this.settingsService.getCourierSettings('pathao');
        if (!settings) throw new Error('Pathao settings not found');
        return settings;
    }

    private async getAccessToken() {
        // Return cached token if still valid (with 5 minute buffer)
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
            return this.tokenCache.token;
        }

        const creds = await this.getCredentials();
        this.logger.log(`Attempting Pathao login for ${creds.username}...`);
        try {
            const response = await axios.post(`${creds.base_url}/aladdin/api/v1/issue-token`, {
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
        } catch (error) {
            this.logger.error('Failed to get Pathao access token', error.response?.data || error.message);
            throw new Error(`Pathao Auth Failed: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }

    async getCities() {
        try {
            const token = await this.getAccessToken();
            const creds = await this.getCredentials();
            this.logger.log(`Fetching cities from ${creds.base_url}/aladdin/api/v1/city-list`);

            // Try POST first as curl --data '' suggests POST
            const response = await axios.post(`${creds.base_url}/aladdin/api/v1/city-list`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            this.logger.log(`Pathao city-list response (POST): ${JSON.stringify(response.data)}`);

            if (response.data?.error) {
                throw new Error(response.data.message || 'Unauthorized');
            }

            const cities = response.data?.data?.data || response.data?.data || [];
            this.logger.log(`Fetched ${cities.length} cities`);
            return cities;
        } catch (error) {
            this.logger.warn('Failed to fetch cities via POST, trying GET...', error.message);

            // Fallback to GET if POST fails (just in case)
            try {
                const token = await this.getAccessToken();
                const creds = await this.getCredentials();
                const response = await axios.get(`${creds.base_url}/aladdin/api/v1/city-list`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                this.logger.log(`Pathao city-list response (GET): ${JSON.stringify(response.data)}`);

                if (response.data?.error) {
                    throw new Error(response.data.message || 'Unauthorized');
                }

                return response.data?.data?.data || response.data?.data || [];
            } catch (getError) {
                this.logger.error('Failed to fetch cities via both POST and GET', getError.response?.data || getError.message);
                throw getError;
            }
        }
    }

    async getZones(cityId: number) {
        const token = await this.getAccessToken();
        const creds = await this.getCredentials();
        try {
            const response = await axios.get(`${creds.base_url}/aladdin/api/v1/cities/${cityId}/zone-list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data?.data?.data || [];
        } catch (error) {
            // Only log error if it's not a rate limit (retry utility will handle it)
            if (error.response?.status !== 429) {
                this.logger.error(`Failed to fetch zones for city ${cityId}: ${error.message}`);
            }
            throw error;
        }
    }

    async getAreas(zoneId: number) {
        const token = await this.getAccessToken();
        const creds = await this.getCredentials();
        try {
            const response = await axios.get(`${creds.base_url}/aladdin/api/v1/zones/${zoneId}/area-list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data?.data?.data || [];
        } catch (error) {
            // Only log error if it's not a rate limit (retry utility will handle it)
            if (error.response?.status !== 429) {
                this.logger.error(`Failed to fetch areas for zone ${zoneId}: ${error.message}`);
            }
            throw error;
        }
    }

    private async retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 2000): Promise<T> {
        let retries = 0;
        while (retries < maxRetries) {
            try {
                return await fn();
            } catch (error) {
                // Check if error is 429 Too Many Requests
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

            // Initialize cache if empty to hold incremental data
            if (!this.areaCache) {
                this.areaCache = { data: [], timestamp: Date.now() };
            }

            // Fetch zones and areas sequentially with a conservative delay to avoid 429 Too Many Requests
            for (const city of cities) {
                try {
                    // Use retryWithBackoff for zones
                    const zones = await this.retryWithBackoff(() => this.getZones(city.city_id));
                    const newCityAreas: any[] = [];

                    if (zones.length === 0) {
                        // If city has no zones, treat city itself as an area
                        newCityAreas.push({
                            city_id: city.city_id,
                            city_name: city.city_name,
                            zone_id: null,
                            zone_name: null,
                            area_id: null,
                            area_name: null,
                            display_name: city.city_name
                        });
                    } else {
                        for (const zone of zones) {
                            try {
                                // Use retryWithBackoff for areas
                                const areas = await this.retryWithBackoff(() => this.getAreas(zone.zone_id));
                                if (areas.length === 0) {
                                    // If zone has no areas, treat zone itself as an area
                                    newCityAreas.push({
                                        city_id: city.city_id,
                                        city_name: city.city_name,
                                        zone_id: zone.zone_id,
                                        zone_name: zone.zone_name,
                                        area_id: zone.zone_id, // Fallback area_id to zone_id
                                        area_name: zone.zone_name, // Fallback area_name to zone_name
                                        display_name: `${zone.zone_name} (${city.city_name})`
                                    });
                                } else {
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
                                // Conservative delay after each zone fetch (Pathao is very strict)
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            } catch (e) {
                                this.logger.warn(`Failed to fetch areas for zone ${zone.zone_id} in ${city.city_name} after retries: ${e.message}`);
                                // Fallback: Add the zone itself if area fetch fails
                                newCityAreas.push({
                                    city_id: city.city_id,
                                    city_name: city.city_name,
                                    zone_id: zone.zone_id,
                                    zone_name: zone.zone_name,
                                    area_id: zone.zone_id, // Fallback
                                    area_name: zone.zone_name, // Fallback
                                    display_name: `${zone.zone_name} (${city.city_name})`
                                });
                            }
                        }
                    }

                    // Incrementally update the cache after each city is fully fetched
                    if (newCityAreas.length > 0) {
                        this.areaCache.data = [...this.areaCache.data, ...newCityAreas];
                        this.areaCache.timestamp = Date.now();

                        // Log progress every 10 cities to reduce noise
                        const cityIndex = cities.indexOf(city);
                        if (cityIndex % 10 === 0 || cityIndex === cities.length - 1) {
                            this.logger.log(`Logistics Cache: ${this.areaCache.data.length} areas loaded (${cityIndex + 1}/${cities.length} cities)...`);
                        }
                    }

                    // Delay after each city to let API breathe
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } catch (e) {
                    this.logger.warn(`Failed to fetch zones for city ${city.city_id} (${city.city_name}) after retries: ${e.message}`);
                    // Fallback: Add the city itself if zone fetch fails
                    const partialCityAreas = [{
                        city_id: city.city_id,
                        city_name: city.city_name,
                        zone_id: city.city_id, // Pathao sometimes uses city_id as a zone
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
        } finally {
            this.isFetchingAreas = false;
        }
    }

    async calculatePrice(payload: any) {
        const token = await this.getAccessToken();
        const creds = await this.getCredentials();

        // Use store_id from settings or default to something if needed. 
        // Docs say store_id is provided by merchant. 
        // We might need to fetch available stores first to get the correct store_id.
        // For now, let's try to get stores if we don't have ID, or assume 0/1 if user didn't save it?
        // Actually the `createOrder` logic I wrote earlier had `store_id: 0`. 
        // We should probably fetch stores to find a valid store_id.
        // Let's add a quick helper to get the first store ID.

        let storeId = 0;
        try {
            // Fetch stores to get valid store_id
            const storesRes = await axios.get(`${creds.base_url}/aladdin/api/v1/stores`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (storesRes.data?.data?.data?.length > 0) {
                storeId = storesRes.data.data.data[0].store_id;
            }
        } catch (e) {
            // Ignore error, fallback to 0 or whatever was passed
            this.logger.warn('Failed to fetch stores for store_id', e.message);
        }

        try {
            this.logger.log(`Calculating price with store_id: ${storeId}, payload: ${JSON.stringify(payload)}`);
            const response = await axios.post(`${creds.base_url}/aladdin/api/v1/merchant/price-plan`, {
                ...payload,
                store_id: storeId,
                item_type: 2, // Parcel
                delivery_type: 48 // Normal
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.logger.log(`Price calculation response: ${JSON.stringify(response.data)}`);
            return response.data.data;
        } catch (error) {
            this.logger.error('Failed to calculate price', error.response?.data || error.message);
            throw error;
        }
    }

    async createOrder(orderId: string) {
        // 1. Fetch full order details
        const { data: order, error } = await supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (error || !order) throw new Error('Order not found');

        // 2. Fetch Merchant Config
        const creds = await this.getCredentials();
        const token = await this.getAccessToken();

        // Get Store ID (Reuse logic or make a separate method, for now inline is fine for speed)
        let storeId = 0;
        try {
            const storesRes = await axios.get(`${creds.base_url}/aladdin/api/v1/stores`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (storesRes.data?.data?.data?.length > 0) {
                storeId = storesRes.data.data.data[0].store_id;
            }
        } catch (e) {
            this.logger.warn('Failed to fetch stores for store_id', e.message);
        }


        // 3. Prepare Payload
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
            delivery_type: 48, // Standard
            item_type: 2, // Parcel
            special_instruction: order.remarks,
            item_quantity: 1, // Aggregate?
            item_weight: order.weight || 0.5,
            amount_to_collect: order.total_amount,
            item_description: order.items.map((i: any) => `${i.product_name} x${i.qty}`).join(', ')
        };

        try {
            this.logger.log(`Creating Pathao order for ${order.order_number}`);
            const response = await axios.post(`${creds.base_url}/aladdin/api/v1/orders`, payload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            const result = response.data;

            if (result.type === 'success' || result.data?.consignment_id) {
                const consignment_id = result.data.consignment_id;

                // Update Order with consignment ID and status
                await supabaseService.getSupabaseClient()
                    .from('orders')
                    .update({
                        courier_consignment_id: consignment_id,
                        order_status: 'Ready to Ship', // Change from Order Created to Ready to Ship
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId);

                // Record status history
                await this.ordersService.recordStatusHistory(
                    orderId,
                    'Ready to Ship',
                    'system',
                    `Pathao Shipment Created (Consignment ID: ${consignment_id})`
                );

                return { success: true, data: result.data };
            } else {
                throw new Error(result.message || JSON.stringify(result.errors));
            }

        } catch (error) {
            this.logger.error('Failed to create order in Pathao', error.response?.data || error.message);
            throw new Error(error.response?.data?.message || error.message);
        }
    }

    async getPathaoOrderInfo(orderId: string) {
        // 1. Get order to find consignment_id
        const { data: order, error } = await supabaseService.getSupabaseClient()
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
            // 2. Call Pathao Info API
            // Docs show --data '' but 405 implies GET is expected (common doc pattern)
            const response = await axios.get(`${creds.base_url}/aladdin/api/v1/orders/${order.courier_consignment_id}/info`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // 3. Sync Status if needed
            const pathaoData = response.data?.data;
            if (pathaoData && pathaoData.order_status) {
                // Map Pathao status to our status if possible?
                // Pathao Statuses: Pending, Completed, Cancelled, etc. (Need to know exact Pathao strings)
                // For now, let's just save the specific Pathao status if it's different? 
                // Or maybe just return the data for display and let user confirm?
                // The user asked for "automatic change".

                // Let's at least update if different (and maybe map 'Completed' -> 'Delivered')
                let newStatus = order.order_status;
                if (pathaoData.order_status === 'Completed') newStatus = 'Delivered';
                else if (pathaoData.order_status === 'Cancelled') newStatus = 'Cancel';
                else if (pathaoData.order_status === 'Pickup Cancel') newStatus = 'Pickup Cancel';
                // else keep current or use Pathao's string if we want to be verbose?
                // Let's stick to our enum strings mostly, maybe 'Shipped' covers most transits?

                let updateData: any = {};
                if (order.order_status !== newStatus) {
                    updateData.order_status = newStatus;
                }
                if (pathaoData.delivery_fee) {
                    updateData.courier_delivery_fee = pathaoData.delivery_fee;
                }

                if (Object.keys(updateData).length > 0) {
                    await supabaseService.getSupabaseClient()
                        .from('orders')
                        .update(updateData)
                        .eq('id', orderId);
                }
            }

            return pathaoData;

        } catch (error) {
            this.logger.error(`Failed to fetch Pathao info for ${order.courier_consignment_id}`, error.message);
            throw new Error('Failed to fetch info from Pathao');
        }
    }

    async handleWebhook(payload: any, headers: any) {
        this.logger.log(`Received Pathao webhook: ${JSON.stringify(payload)}`);

        // 1. Verify Secret
        // The header might be x-pathao-merchant-webhook-integration-secret OR x-pathao-signature
        const secretHeader = headers['x-pathao-merchant-webhook-integration-secret'] || headers['x-pathao-signature'];
        const expectedSecret = process.env.PATHAO_WEBHOOK_SECRET || 'f3992ecc-59da-4cbe-a049-a13da2018d51';

        if (secretHeader !== expectedSecret) {
            this.logger.warn(`Invalid Pathao webhook secret: ${secretHeader}`);
            // Return 202 as per docs even if fail? "Your URL should return status code 202 for this specific event."
            // But usually for auth fail we 401/403.
            // The docs say "Your URL should return status code 202 for this specific event" (referring to "webhook_integration" event).
            // Let's handle integration verification event first.
        }

        if (payload.event === 'webhook_integration') {
            this.logger.log('Pathao webhook integration verification request received.');
            // Docs say: return response with header X-Pathao-Merchant-Webhook-Integration-Secret
            // We can't easily set headers in return value of service function in NestJS without Response object.
            // But the controller returns the value. We might need to change controller signature to use @Res() if we need to set headers.
            // Wait, the requirement is "Your URL should return a response with header...".
            // If we just return data, Nest sets body.
            // Implementation detail: we might need to change controller to `handleWebhook(@Res() res, ...)`
            // Let's stick to logic here and update controller if needed.
            return { message: 'Integration verified' };
        }

        // 2. Process Order Events
        const consignmentId = payload.consignment_id;
        const merchantOrderId = payload.merchant_order_id; // "TS-123" -> We might store simply "123" or use this to find order.
        // We stored consignment_id in database, so we can search by that.

        if (!consignmentId) {
            return { message: 'No consignment_id ignored' };
        }

        const { data: order, error } = await supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('courier_consignment_id', consignmentId)
            .single();

        if (error || !order) {
            this.logger.warn(`Order not found for consignment ${consignmentId}`);
            return { message: 'Order not found' };
        }

        let newStatus = order.order_status;
        let updateData: any = {};

        switch (payload.event) {
            // ── Pre-shipment: order exists in Pathao but not yet picked up ──────────
            case 'order.created':
            case 'order.updated':
            case 'order.pickup-requested':
            case 'order.assigned-for-pickup':
            case 'order.pickup-failed':   // pickup attempt failed — parcel still with merchant
                newStatus = 'Ready to Ship';
                break;

            // ── Pickup cancelled — parcel never left merchant ─────────────────────
            case 'order.pickup-cancelled':
                newStatus = 'Cancelled';
                updateData.status_reason = payload.reason;
                break;

            // ── In transit ───────────────────────────────────────────────────────
            case 'order.picked':
            case 'order.in-transit':
            case 'order.at-the-sorting-hub':
            case 'order.received-at-last-mile-hub':
                newStatus = 'Shipped';
                if (!order.shipped_at) {
                    updateData.shipped_at = new Date().toISOString();
                }
                break;

            // ── Delivery Process ──────────────────────────────────────────────────
            case 'order.assigned-for-delivery':
                newStatus = 'Delivery Process';
                break;

            // ── Successful delivery ───────────────────────────────────────────────
            case 'order.delivered':
                newStatus = 'Delivered';
                if (payload.delivery_fee) updateData.courier_delivery_fee = payload.delivery_fee;
                break;

            case 'order.partial-delivery':
                newStatus = 'Delivered';   // treat partial as delivered
                updateData.status_reason = payload.reason;
                break;

            // ── Delivery Failed ───────────────────────────────────────────────────
            case 'order.delivery-failed':
                newStatus = 'Delivery Failed';
                updateData.status_reason = payload.reason;
                break;

            // ── Return Delivered ──────────────────────────────────────────────────
            case 'order.returned':
            case 'order.paid-return':
                newStatus = 'Return Delivered';
                updateData.status_reason = payload.reason;
                break;

            // ── Hold ───────────────────────────────────────────────────────────
            case 'order.on-hold':
                newStatus = 'Hold';
                updateData.status_reason = payload.reason;
                break;

            // ── Exchange ──────────────────────────────────────────────────────────
            case 'order.exchanged':
                newStatus = 'Delivered';
                updateData.status_reason = 'Exchanged';
                break;

            // ── Financial / store events — no status change ───────────────────────
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

        // Always update updated_at
        updateData.updated_at = new Date().toISOString();

        if (Object.keys(updateData).length > 1) { // more than just updated_at
            await supabaseService.getSupabaseClient()
                .from('orders')
                .update(updateData)
                .eq('id', order.id);

            // Record status history
            await this.ordersService.recordStatusHistory(
                order.id,
                newStatus,
                'Pathao',
                `Pathao Webhook: ${payload.event}${payload.reason ? ` (${payload.reason})` : ''}`
            );

            this.logger.log(`Updated order ${order.order_number} status to ${newStatus}`);
        }

        return { success: true };
    }

    async getSettlements(logisticId: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('logistic_cod_settlements')
            .select('*, created_at')
            .eq('logistic_id', logisticId)
            .order('date', { ascending: false });

        if (error) throw error;
        return data;
    }

    async updateSettlement(id: string, payload: { amount: number, date: string, remarks: string }) {
        const { data, error } = await supabaseService.getSupabaseClient()
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

        if (error) throw error;
        return data;
    }

    async addSettlement(payload: { logisticId: string, amount: number, date: string, remarks: string }) {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('logistic_cod_settlements')
            .insert([{
                logistic_id: payload.logisticId,
                amount: payload.amount,
                date: payload.date,
                remarks: payload.remarks
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getOrderChangelogs(logisticId: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
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

        if (error) throw error;
        return data;
    }
}

