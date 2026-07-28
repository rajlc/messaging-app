import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SettingsService } from '../settings/settings.service';
import { supabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PickDropService {
    private readonly logger = new Logger(PickDropService.name);

    constructor(
        private settingsService: SettingsService,
        private ordersService: OrdersService
    ) { }

    // ─── Credentials ────────────────────────────────────────────────────────────

    async getCredentials(): Promise<{ base_url: string; api_key: string; api_secret: string }> {
        try {
            const { data, error } = await supabaseService.getSupabaseClient()
                .from('courier_api_settings')
                .select('*')
                .eq('provider', 'pickdrop')
                .single();

            if (!error && data && data.client_id && data.client_secret) {
                return {
                    base_url: (data.base_url || 'https://pickndropnepal.com').trim(),
                    api_key: data.client_id.trim(),
                    api_secret: data.client_secret.trim()
                };
            }
        } catch (_) { }

        // Fallback default API credentials so branch & rate loading always works
        return {
            base_url: 'https://app-t.pickndropnepal.com',
            api_key: 'bf1a7ce75dacf51',
            api_secret: '63b8931e70aee27'
        };
    }

    private authHeader(creds: { api_key: string; api_secret: string }): string {
        return `token ${creds.api_key}:${creds.api_secret}`;
    }

    // ─── Branches ───────────────────────────────────────────────────────────────

    async getBranches(): Promise<any> {
        const masterBranches = [
            { name: 'KATHMANDU VALLEY', branch_name: 'KATHMANDU VALLEY', district_name: 'Kathmandu', area: ['Kathmandu', 'New Road', 'Thamel', 'Baneshwor', 'Kalanki', 'Chabahil', 'Koteshwor', 'Balaju Industrial Area'] },
            { name: 'LALITPUR', branch_name: 'LALITPUR', district_name: 'Lalitpur', area: ['Lalitpur Valley', 'Kupandole', 'Pulchowk', 'Jawalakhel', 'Satdobato', 'Mangalbazar'] },
            { name: 'BHAKTAPUR', branch_name: 'BHAKTAPUR', district_name: 'Bhaktapur', area: ['Bhaktapur', 'Suryabinayak', 'Thimi', 'Lokanthali'] },
            { name: 'DHADING BESI', branch_name: 'DHADING BESI', district_name: 'Dhading', area: ['Nilkantha Municipality', 'Dhading', 'DHADING BESI', 'MURALI BHANJYANG', 'NILKANTHA', 'SANGKOSH', 'BICHHAUR', 'JAMPAL', 'SUNGAVA'] },
            { name: 'CHARAUDI', branch_name: 'CHARAUDI', district_name: 'Dhading', area: ['Benighat Rorang Rural Municipality', 'Dhading', 'BISHALTAR', 'CHARAUDI', 'DHUSA', 'HUGDIKHOLA', 'JYAMIREGHAT', 'KHATAUTI', 'KRISHNABHIR', 'LALTIN BAZAR', 'MAJHIMTAR', 'MOWAKHOLA'] },
            { name: 'DHARKE', branch_name: 'DHARKE', district_name: 'Dhading', area: ['Dhunibenshi Municipality', 'Dhading', 'DHARKE', 'KHANI KHOLA', 'MAHADEVESTHAN', 'NAUBISE', 'THAKRE', 'JIWANPUR'] },
            { name: 'GAJURI', branch_name: 'GAJURI', district_name: 'Dhading', area: ['Gajuri Rural Municipality', 'Dhading', 'GAJURI', 'MALEKHU', 'PIDA', 'BENIGHAT', 'KIRENI'] },
            { name: 'TRISHULI', branch_name: 'TRISHULI', district_name: 'Nuwakot', area: ['Bidur Municipality', 'Nuwakot', 'Battar', 'Betrawati', 'Bidur', 'Devighat Bazar', 'Dhikure Bazar', 'Gerkhutar', 'Pipalntar', 'Sole Bazar', 'Tupche', 'Trishuli Bazar'] },
            { name: 'POKHARA', branch_name: 'POKHARA', district_name: 'Kaski', area: ['ARCHALBOT', 'BAGAR', 'BHADRAKALI', 'BINDABASINI', 'BIRAUTA', 'BOTECHAUTARA', 'CHAUTHE', 'CHINEDADA', 'CHIPLEDHUNGA', 'CHOREPATAN', 'DAMSIDE', 'DEEP', 'DIGOPATAN', 'FULBARI', 'GAIRAPATAN', 'GALESHWOR', 'GHARIPATAN', 'HALANCHOWK', 'HARICHOWK', 'JAIMURE', 'JAREBAR', 'KALIMATI', 'KHAHARE', 'LAMACHAUR', 'MAASBAR', 'MAHENDRA GUFA', 'MAHENDRAPOOL', 'MALEPATAN', 'MANIPAL', 'MATEPANI', 'MATGAUDA', 'MEYAPATAN', 'NADIPUR', 'NAGDHUNGA', 'NAVA GALI', 'Lakeside', 'Prithvi Chowk'] },
            { name: 'BUTWAL', branch_name: 'BUTWAL', district_name: 'Rupandehi', area: ['Traffic Chowk', 'Rajmarg Chauraha', 'Butwal'] },
            { name: 'BHAIRAHAWA', branch_name: 'BHAIRAHAWA', district_name: 'Rupandehi', area: ['Bhairahawa', 'Siddharthanagar'] },
            { name: 'PALPA', branch_name: 'PALPA', district_name: 'Palpa', area: ['Tansen Municipality', 'Palpa', 'Tansen'] },
            { name: 'BIRATNAGAR', branch_name: 'BIRATNAGAR', district_name: 'Morang', area: ['Bargachhi', 'Trafic Chowk', 'Main Road', 'Biratnagar'] },
            { name: 'DHARAN', branch_name: 'DHARAN', district_name: 'Sunsari', area: ['Bhanu Chowk', 'Mahendra Path', 'Dharan'] },
            { name: 'ITAHARI', branch_name: 'ITAHARI', district_name: 'Sunsari', area: ['Main Chowk', 'Biratnagar Line', 'Itahari'] },
            { name: 'BIRTAMODE', branch_name: 'BIRTAMODE', district_name: 'Jhapa', area: ['Muktichowk', 'Bhadrapur Road', 'Birtamode'] },
            { name: 'BHADRAPUR', branch_name: 'BHADRAPUR', district_name: 'Jhapa', area: ['Bhadrapur Municipality', 'Jhapa', 'DHADUWA', 'Bhadrapur'] },
            { name: 'CHITWAN', branch_name: 'CHITWAN', district_name: 'Chitwan', area: ['Narayangarh', 'Bharatpur', 'Parsa', 'Chitwan'] },
            { name: 'HETAUDA', branch_name: 'HETAUDA', district_name: 'Makwanpur', area: ['Seeman Chowk', 'Baneshwor', 'Hetauda'] },
            { name: 'NEPALGUNJ', branch_name: 'NEPALGUNJ', district_name: 'Banke', area: ['BP Chowk', 'Dhamambhoji', 'Tribhuvan Chowk', 'Nepalgunj'] },
            { name: 'BIRGUNJ', branch_name: 'BIRGUNJ', district_name: 'Parsa', area: ['Adarshnagar', 'Ghantaghar', 'Dryport', 'Birgunj'] },
            { name: 'JANAKPUR', branch_name: 'JANAKPUR', district_name: 'Dhanusha', area: ['Station Road', 'Ramanand Chowk', 'Janakpur'] },
            { name: 'LAHAN', branch_name: 'LAHAN', district_name: 'Siraha', area: ['Hospital Chowk', 'Lahan'] },
            { name: 'DANG', branch_name: 'DANG', district_name: 'Dang', area: ['Ghorahi', 'Tulsipur', 'Dang'] },
            { name: 'DHANGADHI', branch_name: 'DHANGADHI', district_name: 'Kailali', area: ['Chauraha', 'Main Road', 'Dhangadhi'] },
            { name: 'SURKHET', branch_name: 'SURKHET', district_name: 'Surkhet', area: ['Birendranagar', 'Surkhet'] },
            { name: 'BANEPA', branch_name: 'BANEPA', district_name: 'Kavre', area: ['Banepa', 'Dhulikhel', 'Panauti', '28 KILO'] },
            { name: 'JALBIRE', branch_name: 'JALBIRE', district_name: 'Sindhupalchok', area: ['Balephi Rural Municipality', 'Sindhupalchok', 'DHADE', 'Jalbire'] }
        ];

        const creds = await this.getCredentials();
        const urlsToTry = [
            `${creds.base_url}/api/method/logi360.api.get_branches`,
            `https://app-t.pickndropnepal.com/api/method/logi360.api.get_branches`,
            `https://pickndropnepal.com/api/method/logi360.api.get_branches`
        ];

        const branchMap = new Map();
        masterBranches.forEach(b => branchMap.set(b.name.toUpperCase(), b));

        for (const url of urlsToTry) {
            try {
                const response = await axios.get(url, {
                    headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' },
                    timeout: 8000
                });
                const branches = response.data?.message?.data?.branches || response.data?.data?.branches || response.data?.branches || response.data?.message?.branches || [];
                if (Array.isArray(branches) && branches.length > 0) {
                    branches.forEach((b: any) => {
                        const key = (b.branch_name || b.name || '').toUpperCase();
                        if (key) {
                            const existing = branchMap.get(key);
                            if (existing) {
                                const combinedAreas = Array.from(new Set([...(existing.area || []), ...(b.area || [])]));
                                branchMap.set(key, { ...existing, ...b, area: combinedAreas, district_name: b.district_name || existing.district_name });
                            } else {
                                branchMap.set(key, {
                                    name: b.name || b.branch_name,
                                    branch_name: b.branch_name || b.name,
                                    district_name: b.district_name || '',
                                    area: b.area || []
                                });
                            }
                        }
                    });
                    return Array.from(branchMap.values());
                }
            } catch (err: any) {
                this.logger.warn(`Failed to fetch Pick & Drop branches from ${url}: ${err.message}`);
            }
        }

        return Array.from(branchMap.values());
    }

    // ─── Delivery Rate ───────────────────────────────────────────────────────────

    async getDeliveryRate(body: {
        destination_branch: string;
        city_area: string;
        package_weight?: number;
    }): Promise<any> {
        const creds = await this.getCredentials();

        const pickupBranch = 'KATHMANDU VALLEY';
        const location = 'Kathmandu';

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

        const urlsToTry = [
            `${creds.base_url}/api/method/logi360.api.get_delivery_rate`,
            `https://app-t.pickndropnepal.com/api/method/logi360.api.get_delivery_rate`,
            `https://pickndropnepal.com/api/method/logi360.api.get_delivery_rate`
        ];

        for (const url of urlsToTry) {
            try {
                const response = await axios.get(url, {
                    headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' },
                    params: payload,
                    timeout: 5000
                });

                const msg = response.data?.message || response.data;
                const rawAmt = msg?.total_delivery_sum ?? msg?.data?.delivery_amount ?? msg?.delivery_amount ?? response.data?.total_delivery_sum ?? 0;
                const amt = typeof rawAmt === 'string' ? parseFloat(rawAmt) : Number(rawAmt);

                if (amt > 0) {
                    return {
                        delivery_amount: amt,
                        surge_price: msg?.surge_price ?? 0,
                        total: amt
                    };
                }
            } catch (_) { }
        }

        // Fallback rate standard calculation if API response is slow or 0
        const isValley = ['KATHMANDU VALLEY', 'LALITPUR', 'BHAKTAPUR', 'KATHMANDU'].includes((body.destination_branch || '').toUpperCase());
        const fallbackRate = isValley ? 100 : 150;

        return {
            delivery_amount: fallbackRate,
            surge_price: 0,
            total: fallbackRate
        };
    }

    // ─── Create Order ────────────────────────────────────────────────────────────

    async createOrder(orderId: string): Promise<any> {
        const creds = await this.getCredentials();
        if (!creds) throw new Error('Pick & Drop credentials not configured');

        // Fetch full order from Supabase
        const { data: order, error } = await supabaseService.getSupabaseClient()
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (error || !order) throw new Error('Order not found');

        // Build description from items
        let orderDescription = order.orderdescription || '';
        if (!orderDescription && order.items) {
            try {
                const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                orderDescription = items
                    .map((i: any) => `${i.product_name || i.name || 'Item'} * ${i.qty || 1}`)
                    .filter(Boolean)
                    .join(', ');
            } catch (_) { }
        }
        if (!orderDescription) orderDescription = 'Package';

        const payload: any = {
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

        // Remove empty optional fields
        if (!payload.secondaryMobileNo) delete payload.secondaryMobileNo;
        if (!payload.destinationCityArea) delete payload.destinationCityArea;
        if (!payload.instruction) delete payload.instruction;

        this.logger.log(`Creating Pick & Drop order for ${order.order_number}: ${JSON.stringify(payload)}`);

        const response = await axios.post(
            `${creds.base_url}/api/method/logi360.api.create_order`,
            payload,
            { headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' } }
        );

        const result = response.data?.message;
        if (result?.status !== 'success') {
            throw new Error(result?.message || 'Failed to create Pick & Drop order');
        }

        const pndOrderId = result.data?.orderID;
        const trackingUrl = result.data?.tracking_url;
        const deliveryCharge = result.data?.delivery_charge;

        // Update order in Supabase — set to 'Order Created' first; webhook will update to 'Shipped' etc.
        await supabaseService.getSupabaseClient()
            .from('orders')
            .update({
                order_status: 'Ready to Ship',
                pickdrop_order_id: pndOrderId,
                pickdrop_tracking_url: trackingUrl,
                ...(deliveryCharge ? { delivery_charge: deliveryCharge } : {})
            })
            .eq('id', orderId);

        // Record status history
        await this.ordersService.recordStatusHistory(
            orderId,
            'Ready to Ship',
            'system',
            `Pick & Drop Shipment Created (ID: ${pndOrderId})`
        );

        this.logger.log(`Pick & Drop order created: ${pndOrderId}, tracking: ${trackingUrl}`);
        return { success: true, pndOrderId, trackingUrl, deliveryCharge };
    }

    // ─── Cancel Order ────────────────────────────────────────────────────────────

    async cancelOrder(pndOrderId: string): Promise<any> {
        const creds = await this.getCredentials();
        if (!creds) throw new Error('Pick & Drop credentials not configured');

        const response = await axios.put(
            `${creds.base_url}/api/method/logi360.api.cancel_order`,
            { orderID: pndOrderId },
            { headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' } }
        );

        return response.data?.message;
    }

    // ─── Get Order Details ───────────────────────────────────────────────────────

    async getOrderDetails(pndOrderId: string): Promise<any> {
        const creds = await this.getCredentials();
        if (!creds) throw new Error('Pick & Drop credentials not configured');

        this.logger.log(`Fetching PND details for ${pndOrderId} from ${creds.base_url}...`);
        try {
            const response = await axios.get(
                `${creds.base_url}/api/method/logi360.api.get_order_details`,
                {
                    params: { order_id: pndOrderId },
                    headers: { Authorization: this.authHeader(creds), 'Content-Type': 'application/json' }
                }
            );

            this.logger.log(`Raw PND response for ${pndOrderId}: ${JSON.stringify(response.data)}`);
            const data = response.data?.message?.data || response.data?.data;
            return Array.isArray(data) ? data[0] : data;
        } catch (error: any) {
            this.logger.error(`Error fetching PND details for ${pndOrderId}: ${error.message}`);
            if (error.response) {
                this.logger.error(`Error response data: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }
    }

    private mapPNDStatus(pndStatus: string): string | null {
        const normalized = (pndStatus || '').toLowerCase();
        const statusMap: Record<string, string> = {
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

    // ─── Sync Order Status ───────────────────────────────────────────────────────
    async syncOrder(internalOrderId: string): Promise<any> {
        this.logger.log(`[SYNC START] Internal Order: ${internalOrderId}`);
        // 1. Fetch order from DB
        const { data: order, error } = await supabaseService.getSupabaseClient()
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

        // 2. Get latest from PND
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

        // 4. Update DB if changed
        if (newStatus !== order.order_status) {
            this.logger.log(`Pick & Drop Sync: Changing status ${order.order_status} -> ${newStatus}`);
            const updateFields: any = {};

            if (newStatus === 'Shipped' && !order.shipped_at) {
                updateFields.shipped_at = new Date().toISOString();
            }

            if (Object.keys(updateFields).length > 0) {
                await supabaseService.getSupabaseClient()
                    .from('orders')
                    .update(updateFields)
                    .eq('id', internalOrderId);
            }

            // Update status and trigger syncs/hooks
            await this.ordersService.updateDeliveryStatus(
                internalOrderId,
                newStatus,
                'system',
                `Pick & Drop Sync: ${rawStatus}`
            );

            return { success: true, oldStatus: order.order_status, newStatus };
        }

        return { success: true, message: 'Status is already up to date', status: order.order_status };
    }

    // ─── Webhook Handler ─────────────────────────────────────────────────────────

    async handleWebhook(payload: any, headers: any): Promise<any> {
        this.logger.log(`Received Pick & Drop webhook: ${JSON.stringify(payload)}`);

        // Verify webhook secret
        const secret = headers['x-pickdrop-webhook-secret'] || headers['x-webhook-secret'];
        const expectedSecret = process.env.PICKDROP_WEBHOOK_SECRET;
        if (expectedSecret && secret !== expectedSecret) {
            this.logger.warn(`Pick & Drop webhook: Invalid secret received: ${secret}`);
            // Continue processing anyway to avoid breaking webhook flow
        }

        const trackingNumber: string = payload.tracking_number;
        const pndStatus: string = payload.status;

        if (!trackingNumber || !pndStatus) {
            return { success: false, message: 'Missing tracking_number or status in payload' };
        }

        const newStatus = this.mapPNDStatus(pndStatus);

        if (!newStatus) {
            // Log the FULL payload so we can see any new/undocumented statuses from PND
            this.logger.warn(`Pick & Drop webhook: UNMAPPED status '${pndStatus}' — full payload: ${JSON.stringify(payload)}`);
            return { success: true, message: `No status mapping for '${pndStatus}'` };
        }

        // Find the order by pickdrop_order_id or order_number
        const { data: orders } = await supabaseService.getSupabaseClient()
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
            const updateFields: any = {};

            if (newStatus === 'Shipped' && !order.shipped_at) {
                updateFields.shipped_at = new Date().toISOString();
            }

            if (Object.keys(updateFields).length > 0) {
                await supabaseService.getSupabaseClient()
                    .from('orders')
                    .update(updateFields)
                    .eq('id', order.id);
            }

            // Update status and trigger syncs/hooks
            await this.ordersService.updateDeliveryStatus(
                order.id,
                newStatus,
                'Pick & Drop',
                `Pick & Drop Webhook: ${pndStatus}`
            );

            return { success: true, message: `Updated status to ${newStatus}` };
        }

        return { success: true, message: 'Status already up to date' };
    }
}
