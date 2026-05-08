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
var PickDropService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PickDropService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
const settings_service_1 = require("../settings/settings.service");
const supabase_service_1 = require("../supabase/supabase.service");
const orders_service_1 = require("../orders/orders.service");
let PickDropService = PickDropService_1 = class PickDropService {
    settingsService;
    ordersService;
    logger = new common_1.Logger(PickDropService_1.name);
    constructor(settingsService, ordersService) {
        this.settingsService = settingsService;
        this.ordersService = ordersService;
    }
    async getCredentials() {
        const { data, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('courier_api_settings')
            .select('*')
            .eq('provider', 'pickdrop')
            .single();
        if (error || !data) {
            this.logger.warn('Pick & Drop credentials not found in DB');
            return null;
        }
        return {
            base_url: data.base_url || 'https://pickndropnepal.com',
            api_key: data.client_id,
            api_secret: data.client_secret
        };
    }
    authHeader(creds) {
        return `token ${creds.api_key}:${creds.api_secret}`;
    }
    async getBranches() {
        const creds = await this.getCredentials();
        if (!creds)
            throw new Error('Pick & Drop credentials not configured');
        const response = await axios_1.default.get(`${creds.base_url}/api/method/logi360.api.get_branches`, { headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' } });
        return response.data?.message?.data?.branches || [];
    }
    async getDeliveryRate(body) {
        const creds = await this.getCredentials();
        if (!creds)
            throw new Error('Pick & Drop credentials not configured');
        let pickupBranch = 'KATHMANDU VALLEY';
        let location = 'Kathmandu';
        try {
            const addrResp = await axios_1.default.get(`${creds.base_url}/api/method/logi360.api.business_address`, { headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' } });
            const addresses = addrResp.data?.message?.data?.addresses || [];
            if (addresses.length > 0)
                location = addresses[0];
        }
        catch (_) { }
        const payload = {
            pickup_branch: pickupBranch,
            destination_branch: body.destination_branch,
            location,
            city_area: body.city_area,
            package_width: 1,
            package_height: 1,
            package_length: 1,
            package_weight: body.package_weight || 1,
            size_uom: 'cm',
            weight_uom: 'kg'
        };
        const response = await axios_1.default.get(`${creds.base_url}/api/method/logi360.api.get_delivery_rate`, {
            headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' },
            data: payload
        });
        const msg = response.data?.message;
        return {
            delivery_amount: msg?.data?.delivery_amount ?? 0,
            surge_price: msg?.surge_price ?? 0,
            total: msg?.total_delivery_sum ?? msg?.data?.delivery_amount ?? 0
        };
    }
    async createOrder(orderId) {
        const creds = await this.getCredentials();
        if (!creds)
            throw new Error('Pick & Drop credentials not configured');
        const { data: order, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        if (error || !order)
            throw new Error('Order not found');
        let orderDescription = order.orderdescription || '';
        if (!orderDescription && order.items) {
            try {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                orderDescription = items
                    .map((i) => `${i.product_name || i.name || 'Item'} * ${i.qty || 1}`)
                    .filter(Boolean)
                    .join(', ');
            }
            catch (_) { }
        }
        if (!orderDescription)
            orderDescription = 'Package';
        const payload = {
            vendorTrackingNumber: order.order_number || orderId,
            customerName: order.customername || order.customer_name || '',
            primaryMobileNo: (order.phone_number || order.phone || order.primarymobileno || '').replace(/\D/g, '').slice(-10),
            secondaryMobileNo: (order.alternative_phone || order.secondarymobileno || '').replace(/\D/g, '').slice(-10) || undefined,
            landmark: order.address || order.landmark || '',
            destinationBranch: order.pickdrop_destination_branch || '',
            destinationCityArea: order.pickdrop_city_area || '',
            codAmount: Number(order.total_amount) || 0,
            orderDescription,
            instruction: order.remarks || order.instruction || '',
            weight: order.weight || 1,
            ref: 'inventory-app',
        };
        if (!payload.secondaryMobileNo)
            delete payload.secondaryMobileNo;
        if (!payload.destinationCityArea)
            delete payload.destinationCityArea;
        if (!payload.instruction)
            delete payload.instruction;
        this.logger.log(`Creating Pick & Drop order for ${order.order_number}: ${JSON.stringify(payload)}`);
        const response = await axios_1.default.post(`${creds.base_url}/api/method/logi360.api.create_order`, payload, { headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' } });
        const result = response.data?.message;
        if (result?.status !== 'success') {
            throw new Error(result?.message || 'Failed to create Pick & Drop order');
        }
        const pndOrderId = result.data?.orderID;
        const trackingUrl = result.data?.tracking_url;
        const deliveryCharge = result.data?.delivery_charge;
        await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .update({
            order_status: 'Ready to Ship',
            pickdrop_order_id: pndOrderId,
            pickdrop_tracking_url: trackingUrl,
            ...(deliveryCharge ? { delivery_charge: deliveryCharge } : {})
        })
            .eq('id', orderId);
        await this.ordersService.recordStatusHistory(orderId, 'Ready to Ship', 'system', `Pick & Drop Shipment Created (ID: ${pndOrderId})`);
        this.logger.log(`Pick & Drop order created: ${pndOrderId}, tracking: ${trackingUrl}`);
        return { success: true, pndOrderId, trackingUrl, deliveryCharge };
    }
    async cancelOrder(pndOrderId) {
        const creds = await this.getCredentials();
        if (!creds)
            throw new Error('Pick & Drop credentials not configured');
        const response = await axios_1.default.put(`${creds.base_url}/api/method/logi360.api.cancel_order`, { orderID: pndOrderId }, { headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' } });
        return response.data?.message;
    }
    async getOrderDetails(pndOrderId) {
        const creds = await this.getCredentials();
        if (!creds)
            throw new Error('Pick & Drop credentials not configured');
        this.logger.log(`Fetching PND details for ${pndOrderId} from ${creds.base_url}...`);
        try {
            const response = await axios_1.default.get(`${creds.base_url}/api/method/logi360.api.get_order_details`, {
                params: { order_id: pndOrderId },
                headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' }
            });
            this.logger.log(`Raw PND response for ${pndOrderId}: ${JSON.stringify(response.data)}`);
            const data = response.data?.message?.data || response.data?.data;
            return Array.isArray(data) ? data[0] : data;
        }
        catch (error) {
            this.logger.error(`Error fetching PND details for ${pndOrderId}: ${error.message}`);
            if (error.response) {
                this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }
    mapPNDStatus(pndStatus) {
        const normalized = (pndStatus || '').toLowerCase();
        const statusMap = {
            package_pickup_assigned: 'Ready to Ship',
            package_pickup_1st_attempt_failed: 'Ready to Ship',
            package_pickup_reattempt_failed: 'Cancelled',
            package_pickup_success: 'Shipped',
            waiting_for_drop_off: 'Ready to Ship',
            package_arrived_at_hub: 'Shipped',
            package_received_at_hub: 'Shipped',
            received_at_lastmile_station: 'Shipped',
            package_ready_to_dispatch_last_mile_station: 'Shipped',
            package_dispatched_to_last_mile_station_transporter: 'Shipped',
            package_stationed_in_from_transporter: 'Shipped',
            ready_for_dispatched_last_mile_hero: 'Shipped',
            out_for_delivery: 'Delivery Process',
            about_to_deliver: 'Delivery Process',
            '1st_attempt_failed': 'Delivery Failed',
            package_redelivery: 'Delivery Process',
            package_reattempts_failed: 'Delivery Failed',
            delivered: 'Delivered',
            delivery_failed_and_cancelled: 'Hold',
            return_at_transit_hub: 'Hold',
            cancelled_by_vendor: 'Cancelled',
            cancelled_by_admin: 'Cancelled',
            cancelled: 'Cancelled',
            order_cancelled: 'Cancelled',
            vendor_cancelled: 'Cancelled',
            package_returned_from_transit_hub_to_transporter: 'Return Process',
            received_from_transporter_to_dispatched_hub: 'Return Process',
            fd_package_ready_to_return_to_shipper: 'Return Process',
            package_returned_from_lastmile_sation_to_transporter: 'Return Process',
            cr_package_ready_to_delivered_to_qcc: 'Return Process',
            package_returned: 'Return Delivered',
        };
        return statusMap[normalized] || null;
    }
    async syncOrder(internalOrderId) {
        this.logger.log(`[SYNC START] Internal Order: ${internalOrderId}`);
        const { data: order, error } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('id', internalOrderId)
            .single();
        if (error || !order) {
            this.logger.error(`[SYNC] Order not found: ${internalOrderId}`);
            throw new Error('Order not found');
        }
        if (!order.pickdrop_order_id) {
            this.logger.warn(`[SYNC] Not a PND order: ${order.order_number}`);
            throw new Error('Not a Pick & Drop order or missing order ID');
        }
        this.logger.log(`[SYNC] Fetching from PND for ${order.order_number} (${order.pickdrop_order_id})...`);
        const pndData = await this.getOrderDetails(order.pickdrop_order_id);
        this.logger.log(`[SYNC] PND Data received for ${order.pickdrop_order_id}: ${JSON.stringify(pndData)}`);
        if (!pndData || (!pndData.status && !pndData.order_status)) {
            const msg = `Could not fetch latest status from Pick & Drop (V2). Received: ${JSON.stringify(pndData)}`;
            this.logger.error(msg);
            throw new Error(msg);
        }
        const rawStatus = pndData.status || pndData.order_status;
        const newStatus = this.mapPNDStatus(rawStatus);
        if (!newStatus) {
            this.logger.warn(`Pick & Drop Sync: UNMAPPED status '${rawStatus}'`);
            return { success: false, message: `Unmapped PND status: ${rawStatus}` };
        }
        if (newStatus !== order.order_status) {
            this.logger.log(`Pick & Drop Sync: Changing status ${order.order_status} -> ${newStatus}`);
            const updateFields = {
                order_status: newStatus,
                updated_at: new Date().toISOString()
            };
            if (newStatus === 'Shipped' && !order.shipped_at) {
                updateFields.shipped_at = new Date().toISOString();
            }
            await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .update(updateFields)
                .eq('id', internalOrderId);
            await this.ordersService.recordStatusHistory(internalOrderId, newStatus, 'system', `Pick & Drop Sync: ${rawStatus}`);
            return { success: true, oldStatus: order.order_status, newStatus };
        }
        return { success: true, message: 'Status is already up to date', status: order.order_status };
    }
    async handleWebhook(payload, headers) {
        this.logger.log(`Received Pick & Drop webhook: ${JSON.stringify(payload)}`);
        const secret = headers['x-pickdrop-webhook-secret'] || headers['x-webhook-secret'];
        const expectedSecret = process.env.PICKDROP_WEBHOOK_SECRET;
        if (expectedSecret && secret !== expectedSecret) {
            this.logger.warn(`Pick & Drop webhook: Invalid secret received: ${secret}`);
        }
        const trackingNumber = payload.tracking_number;
        const pndStatus = payload.status;
        if (!trackingNumber || !pndStatus) {
            return { success: false, message: 'Missing tracking_number or status in payload' };
        }
        const newStatus = this.mapPNDStatus(pndStatus);
        if (!newStatus) {
            this.logger.warn(`Pick & Drop webhook: UNMAPPED status '${pndStatus}' — full payload: ${JSON.stringify(payload)}`);
            return { success: true, message: `No status mapping for '${pndStatus}'` };
        }
        const { data: orders } = await supabase_service_1.supabaseService.getSupabaseClient()
            .from('orders')
            .select('id, order_number, order_status, shipped_at')
            .or(`pickdrop_order_id.eq.${trackingNumber},order_number.eq.${trackingNumber}`);
        if (!orders || orders.length === 0) {
            this.logger.warn(`Pick & Drop webhook: No order found for tracking identifier ${trackingNumber}`);
            return { success: false, message: 'Order not found' };
        }
        const order = orders[0];
        if (newStatus !== order.order_status) {
            this.logger.log(`Pick & Drop Webhook: Updating order ${order.order_number} (${newStatus})`);
            const updateFields = {
                order_status: newStatus,
                updated_at: new Date().toISOString()
            };
            if (newStatus === 'Shipped' && !order.shipped_at) {
                updateFields.shipped_at = new Date().toISOString();
            }
            await supabase_service_1.supabaseService.getSupabaseClient()
                .from('orders')
                .update(updateFields)
                .eq('id', order.id);
            await this.ordersService.recordStatusHistory(order.id, newStatus, 'Pick & Drop', `Pick & Drop Webhook: ${pndStatus}`);
            return { success: true, message: `Updated status to ${newStatus}` };
        }
        return { success: true, message: 'Status already up to date' };
    }
};
exports.PickDropService = PickDropService;
exports.PickDropService = PickDropService = PickDropService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService,
        orders_service_1.OrdersService])
], PickDropService);
//# sourceMappingURL=pick-drop.service.js.map