import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { SettingsService } from '../settings/settings.service';
import { supabaseService } from '../supabase/supabase.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class NcmService {
    private readonly logger = new Logger(NcmService.name);
    private readonly provider = 'ncm';
    private branchCache: any[] = [];
    private lastCacheUpdate: number = 0;
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    constructor(
        private readonly settingsService: SettingsService,
        private readonly ordersService: OrdersService
    ) { }

    private async getCredentials() {
        try {
            const settings = await this.settingsService.getCourierSettings(this.provider);
            const baseUrl = (settings?.base_url || 'https://portal.nepalcanmove.com').trim().replace(/\/+$/, '');
            const token = (settings?.client_secret || settings?.client_id || settings?.password || settings?.api_key || '9a4bd394bd80ebddcc8c269e0c9a7d617998de7c').trim();
            return { baseUrl, token };
        } catch (_) {
            return {
                baseUrl: 'https://portal.nepalcanmove.com',
                token: '9a4bd394bd80ebddcc8c269e0c9a7d617998de7c'
            };
        }
    }

    private async getHeaders() {
        const { token } = await this.getCredentials();
        return {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
        };
    }

    async getBranches() {
        const masterBranches = [
            { name: 'NAYA BUSPARK', branch_name: 'NAYA BUSPARK', district_name: 'Kathmandu', full_name: 'Naya Buspark (Kathmandu)', areas_covered: 'Gongabu, Samakhusi, Balaju, Machhapokhari' },
            { name: 'TINKUNE', branch_name: 'TINKUNE', district_name: 'Kathmandu', full_name: 'Tinkune Main Branch (Kathmandu)', areas_covered: 'Tinkune, Koteshwor, Baneshwor, Sinamangal' },
            { name: 'CHABAHIL', branch_name: 'CHABAHIL', district_name: 'Kathmandu', full_name: 'Chabahil Branch (Kathmandu)', areas_covered: 'Chabahil, Bouddha, Jorpati, Gaushala' },
            { name: 'KALANKI', branch_name: 'KALANKI', district_name: 'Kathmandu', full_name: 'Kalanki Branch (Kathmandu)', areas_covered: 'Kalanki, Balkhu, Kirtipur, Naikap, Thankot' },
            { name: 'LALITPUR', branch_name: 'LALITPUR', district_name: 'Lalitpur', full_name: 'Lalitpur Branch (Lagankhel)', areas_covered: 'Pulchowk, Jawalakhel, Satdobato, Kupandole, Gwarko' },
            { name: 'BHAKTAPUR', branch_name: 'BHAKTAPUR', district_name: 'Bhaktapur', full_name: 'Bhaktapur Branch (Thimi)', areas_covered: 'Bhaktapur, Suryabinayak, Thimi, Lokanthali' },
            { name: 'TRISHULI', branch_name: 'TRISHULI', district_name: 'Nuwakot', full_name: 'Trishuli / Nuwakot Branch', areas_covered: 'INARPATI, MAJHITAR, PETROL PUMP, COLONY, BAGHTAR, BIDUR, BATTAR, DHIKURE BAZAR, PIPALTAR, DEVIGHAT BAZAR' },
            { name: 'DHADING BESI', branch_name: 'DHADING BESI', district_name: 'Dhading', full_name: 'Dhading Besi Branch', areas_covered: 'Nilkantha, Dhading Besi, Charaudi, Dharke, Gajuri, Malekhu' },
            { name: 'POKHARA', branch_name: 'POKHARA', district_name: 'Kaski', full_name: 'Pokhara Branch', areas_covered: 'Lakeside, Mahendrapool, Prithvi Chowk, Chipledhunga, Lekhnath' },
            { name: 'BUTWAL', branch_name: 'BUTWAL', district_name: 'Rupandehi', full_name: 'Butwal Branch', areas_covered: 'Traffic Chowk, Rajmarg Chauraha, Devinagar, Golpark' },
            { name: 'BHAIRAHAWA', branch_name: 'BHAIRAHAWA', district_name: 'Rupandehi', full_name: 'Bhairahawa Branch', areas_covered: 'Siddharthanagar, Lumbini Road' },
            { name: 'PALPA', branch_name: 'PALPA', district_name: 'Palpa', full_name: 'Palpa (Tansen) Branch', areas_covered: 'Tansen, Rampur' },
            { name: 'BIRATNAGAR', branch_name: 'BIRATNAGAR', district_name: 'Morang', full_name: 'Biratnagar Branch', areas_covered: 'Trafic Chowk, Bargachhi, Main Road' },
            { name: 'DHARAN', branch_name: 'DHARAN', district_name: 'Sunsari', full_name: 'Dharan Branch', areas_covered: 'Bhanu Chowk, Mahendra Path' },
            { name: 'ITAHARI', branch_name: 'ITAHARI', district_name: 'Sunsari', full_name: 'Itahari Branch', areas_covered: 'Main Chowk, Dharan Line, Biratnagar Line' },
            { name: 'BIRTAMODE', branch_name: 'BIRTAMODE', district_name: 'Jhapa', full_name: 'Birtamode Branch', areas_covered: 'Muktichowk, Bhadrapur Road' },
            { name: 'BHADRAPUR', branch_name: 'BHADRAPUR', district_name: 'Jhapa', full_name: 'Bhadrapur Branch', areas_covered: 'Bhadrapur, Chandragadhi' },
            { name: 'DAMAK', branch_name: 'DAMAK', district_name: 'Jhapa', full_name: 'Damak Branch', areas_covered: 'Damak, Thana Chowk' },
            { name: 'ILAM', branch_name: 'ILAM', district_name: 'Ilam', full_name: 'Ilam Branch', areas_covered: 'Ilam, Fikkal' },
            { name: 'CHITWAN', branch_name: 'CHITWAN', district_name: 'Chitwan', full_name: 'Chitwan (Narayangarh) Branch', areas_covered: 'Narayangarh, Bharatpur, Parsa, Tandi, Gaindakot' },
            { name: 'HETAUDA', branch_name: 'HETAUDA', district_name: 'Makwanpur', full_name: 'Hetauda Branch', areas_covered: 'Seeman Chowk, Hetauda, School Road' },
            { name: 'NEPALGUNJ', branch_name: 'NEPALGUNJ', district_name: 'Banke', full_name: 'Nepalgunj Branch', areas_covered: 'BP Chowk, Dhamambhoji, Kohalpur' },
            { name: 'BIRGUNJ', branch_name: 'BIRGUNJ', district_name: 'Parsa', full_name: 'Birgunj Branch', areas_covered: 'Adarshnagar, Ghantaghar, Dryport' },
            { name: 'JANAKPUR', branch_name: 'JANAKPUR', district_name: 'Dhanusha', full_name: 'Janakpur Branch', areas_covered: 'Station Road, Ramanand Chowk' },
            { name: 'LAHAN', branch_name: 'LAHAN', district_name: 'Siraha', full_name: 'Lahan Branch', areas_covered: 'Hospital Chowk, Lahan' },
            { name: 'RAJBARAJ', branch_name: 'RAJBARAJ', district_name: 'Saptari', full_name: 'Rajbiraj Branch', areas_covered: 'Rajbiraj, Kanchanpur' },
            { name: 'DANG', branch_name: 'DANG', district_name: 'Dang', full_name: 'Dang (Ghorahi/Tulsipur) Branch', areas_covered: 'Ghorahi, Tulsipur, Lamahi' },
            { name: 'DHANGADHI', branch_name: 'DHANGADHI', district_name: 'Kailali', full_name: 'Dhangadhi Branch', areas_covered: 'Chauraha, Main Road, Tikapur' },
            { name: 'SURKHET', branch_name: 'SURKHET', district_name: 'Surkhet', full_name: 'Surkhet (Birendranagar) Branch', areas_covered: 'Birendranagar, Surkhet' },
            { name: 'MAHENDRANAGAR', branch_name: 'MAHENDRANAGAR', district_name: 'Kanchanpur', full_name: 'Mahendranagar Branch', areas_covered: 'Bhimdatta, Mahendranagar' },
            { name: 'BANEPA', branch_name: 'BANEPA', district_name: 'Kavre', full_name: 'Banepa Branch', areas_covered: 'Banepa, Dhulikhel, Panauti' },
            { name: 'CHARIKOT', branch_name: 'CHARIKOT', district_name: 'Dolakha', full_name: 'Charikot Branch', areas_covered: 'Charikot, Jiri' },
            { name: 'SINDHULI', branch_name: 'SINDHULI', district_name: 'Sindhuli', full_name: 'Sindhuli Branch', areas_covered: 'Sindhulimadi, Kamalamai' },
            { name: 'GORKHA', branch_name: 'GORKHA', district_name: 'Gorkha', full_name: 'Gorkha Branch', areas_covered: 'Gorkha, Haramtari' },
            { name: 'LAMJUNG', branch_name: 'LAMJUNG', district_name: 'Lamjung', full_name: 'Lamjung (Besisahar) Branch', areas_covered: 'Besisahar, Lamjung' },
            { name: 'BAGLUNG', branch_name: 'BAGLUNG', district_name: 'Baglung', full_name: 'Baglung Branch', areas_covered: 'Baglung' },
            { name: 'BENI', branch_name: 'BENI', district_name: 'Myagdi', full_name: 'Beni Branch', areas_covered: 'Beni, Myagdi' },
            { name: 'KUSMA', branch_name: 'KUSMA', district_name: 'Parbat', full_name: 'Kusma Branch', areas_covered: 'Kusma, Parbat' },
            { name: 'SYANGJA', branch_name: 'SYANGJA', district_name: 'Syangja', full_name: 'Syangja Branch', areas_covered: 'Putalibazar, Waling' }
        ];

        try {
            const { baseUrl } = await this.getCredentials();
            const headers = await this.getHeaders();
            const response = await axios.get(`${baseUrl}/api/v2/branches`, { headers, timeout: 8000 });

            const liveData = response.data;
            const arr = Array.isArray(liveData) ? liveData : (liveData?.results || liveData?.data || []);

            if (arr.length > 0) {
                return arr.map((b: any) => {
                    const nameStr = typeof b === 'string' ? b : (b.name || b.branch_name || b.branch || '');
                    const district = b.district_name || b.district || '';
                    const rawAreas = b.areas_covered || b.covered_areas || b.areas || '';
                    const areaStr = Array.isArray(rawAreas) ? rawAreas.join(', ') : String(rawAreas);
                    return {
                        ...b,
                        name: nameStr.trim().toUpperCase(),
                        branch_name: nameStr.trim().toUpperCase(),
                        district_name: district,
                        full_name: district ? `${nameStr.trim().toUpperCase()} - ${district.toUpperCase()}` : nameStr.trim().toUpperCase(),
                        areas_covered: areaStr,
                        covered_areas: areaStr
                    };
                });
            }
        } catch (error: any) {
            this.logger.warn(`Failed to fetch live NCM branches: ${error.message}`);
        }
        return masterBranches;
    }

    async calculateShippingRate(pickupBranch: string, destinationBranch: string, type: string = 'Door2Door') {
        const cleanPickup = (pickupBranch || 'NAYA BUSPARK').trim().toUpperCase().split(/[\-\/]/)[0].trim();
        const cleanDestination = (destinationBranch || '').trim().toUpperCase();

        if (!cleanDestination) {
            return { success: false, charge: 0, error: 'Destination branch is required' };
        }

        const targetDestination = cleanDestination.split(/[\-\/]/)[0].trim() || cleanDestination;

        const isValley = ['KATHMANDU', 'LALITPUR', 'BHAKTAPUR', 'TINKUNE', 'NAYA BUSPARK', 'CHABAHIL', 'KALANKI'].includes(targetDestination);
        let fallbackRate = isValley ? 100 : 150;
        if (type === 'Door2Branch' || type === 'Branch2Branch' || type === 'D2B' || type === 'B2B') {
            fallbackRate = Math.max(50, fallbackRate - 50);
        }

        try {
            const { baseUrl } = await this.getCredentials();
            const headers = await this.getHeaders();

            const typeMap: Record<string, string> = {
                'Door2Door': 'Pickup/Collect',
                'BranchPickup': 'D2B',
                'Door2Branch': 'D2B',
                'Branch2Door': 'Send',
                'Branch2Branch': 'B2B',
                'Pickup/Collect': 'Pickup/Collect',
                'Send': 'Send',
                'D2B': 'D2B',
                'B2B': 'B2B'
            };
            const ncmType = typeMap[type] || 'Pickup/Collect';

            const url = `${baseUrl}/api/v1/shipping-rate`;
            const params = {
                creation: cleanPickup,
                destination: targetDestination,
                type: ncmType
            };

            const response = await axios.get(url, { headers, params, timeout: 5000 });

            if (response.data && typeof response.data === 'object') {
                const chargeVal = response.data.charge || response.data.rate || response.data.total || response.data.delivery_charge;
                const num = parseFloat(chargeVal);
                if (!isNaN(num) && num > 0) {
                    return { success: true, charge: num, rate: num, total: num };
                }
            }
        } catch (error: any) {
            this.logger.warn(`Failed to calculate NCM shipping rate via API: ${error.message}. Using fallback rate ${fallbackRate}`);
        }

        return { success: true, charge: fallbackRate, rate: fallbackRate, total: fallbackRate };
    }

    async createOrder(orderData: any) {
        try {
            const { baseUrl } = await this.getCredentials();
            const headers = await this.getHeaders();

            const payload = {
                name: (orderData.customer_name || '').trim(),
                phone: (orderData.phone_number || '').trim(),
                phone2: (orderData.alternative_phone || '').trim(),
                cod_charge: String(Math.round(Number(orderData.total_amount || 0))), // Ensure integer string
                address: (orderData.address || '').trim(),
                fbranch: (orderData.ncm_from_branch || orderData.from_branch || 'TINKUNE').trim(),
                branch: (orderData.ncm_to_branch || orderData.delivery_branch || '').trim(),
                package: (orderData.package_description || orderData.items?.map((i: any) => i.product_name).join(', ') || 'General Package').trim(),
                vref_id: orderData.order_number || orderData.id.toString(),
                instruction: (orderData.remarks || '').trim(),
                delivery_type: orderData.ncm_delivery_type || orderData.delivery_type || 'Door2Door',
                weight: String(orderData.weight || '1')
            };

            const response = await axios.post(`${baseUrl}/api/v1/order/create`, payload, { headers });

            if (response.data && response.data.orderid) {
                return {
                    success: true,
                    orderId: response.data.orderid,
                    message: response.data.Message
                };
            }
            return {
                success: false,
                error: response.data.Error || 'Unknown error'
            };
        } catch (error: any) {
            const errorMsg = error.response?.data ? (typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)) : error.message;
            this.logger.error(`Failed to create NCM order: ${error.message}. Response: ${errorMsg}`);
            return {
                success: false,
                error: (error.response?.data?.Error || error.response?.data?.message || errorMsg)
            };
        }
    }

    async getOrderStatus(orderId: string) {
        try {
            const { baseUrl } = await this.getCredentials();
            const headers = await this.getHeaders();
            const response = await axios.get(`${baseUrl}/api/v1/order/status?id=${orderId}`, { headers });
            return response.data; // List of statuses
        } catch (error: any) {
            this.logger.error(`Failed to get NCM order status: ${error.message}`);
            throw error;
        }
    }

    async handleWebhook(payload: any) {
        this.logger.log(`Received NCM webhook: ${JSON.stringify(payload)}`);

        // Handle test webhooks
        if (payload.test === true || payload.event === 'order.status.changed' && payload.order_id?.startsWith('TEST-')) {
            this.logger.log('Test webhook received and acknowledged');
            return;
        }

        // NCM Webhook format: supports single or bulk
        const orderIds = payload.order_ids || (payload.order_id ? [payload.order_id] : []);
        const status = payload.status;
        const event = payload.event;
        const remarks = payload.remarks || payload.comment || '';

        if (orderIds.length === 0 || (!status && !event)) {
            this.logger.warn(`Invalid NCM webhook payload received (missing ID, status, or event): ${JSON.stringify(payload)}`);
            return;
        }

        this.logger.log(`Processing NCM webhook for Orders: ${orderIds.join(', ')}, Status: ${status}, Event: ${event}`);

        // Map status/event to internal status
        const internalStatus = this.mapStatus(event || status);

        for (const consignmentId of orderIds) {
            try {
                // Fetch order to get its current status, amount, and delivery charge
                const { data: order, error: fetchError } = await supabaseService.getSupabaseClient()
                    .from('orders')
                    .select('id, order_status, order_number, total_amount, courier_delivery_fee, delivery_charge')
                    .eq('courier_consignment_id', consignmentId.toString())
                    .single();

                if (fetchError || !order) {
                    this.logger.error(`Order not found for NCM consignment ${consignmentId}`);
                    continue;
                }

                this.logger.log(`Order ${order.id} found. Current internal status: ${order.order_status}. New mapped status: ${internalStatus}`);

                // Check for amount or delivery charge changes
                const newAmount = payload.cod !== undefined ? Number(payload.cod) : undefined;
                const newCharge = payload.charge !== undefined ? Number(payload.charge) :
                    (payload.delivery_charge !== undefined ? Number(payload.delivery_charge) : undefined);

                let isModified = false;
                const updateData: any = {
                    updated_at: new Date().toISOString()
                };

                if (newAmount !== undefined && newAmount !== Number(order.total_amount)) {
                    this.logger.log(`Order ${order.order_number} amount changed: ${order.total_amount} -> ${newAmount}`);

                    const changelogEntry = `Amount (COD) changed from Rs. ${order.total_amount} to Rs. ${newAmount} by NCM.`;

                    // Record Changelog
                    await supabaseService.getSupabaseClient()
                        .from('order_changelogs')
                        .insert({
                            order_id: order.id,
                            logistic_id: 'ncm',
                            old_amount: order.total_amount,
                            new_amount: newAmount,
                            log_details: changelogEntry
                        });

                    updateData.total_amount = newAmount;
                    updateData.price_changelog = changelogEntry;
                    isModified = true;

                    // Also record in status history as a note
                    await this.ordersService.recordStatusHistory(
                        order.id,
                        order.order_status,
                        'Nepal Can Move',
                        `NCM Webhook: ${changelogEntry}`
                    );
                }

                if (newCharge !== undefined && newCharge !== Number(order.courier_delivery_fee || order.delivery_charge)) {
                    const oldCharge = Number(order.courier_delivery_fee || order.delivery_charge || 0);
                    this.logger.log(`Order ${order.order_number} delivery charge changed: ${oldCharge} -> ${newCharge}`);

                    const chargeLogEntry = `Delivery Charge changed from Rs. ${oldCharge} to Rs. ${newCharge} by NCM.`;

                    // Record Changelog
                    await supabaseService.getSupabaseClient()
                        .from('order_changelogs')
                        .insert({
                            order_id: order.id,
                            logistic_id: 'ncm',
                            old_delivery_charge: oldCharge,
                            new_delivery_charge: newCharge,
                            log_details: chargeLogEntry
                        });

                    updateData.courier_delivery_fee = newCharge;
                    updateData.delivery_charge = newCharge;

                    if (!updateData.price_changelog) {
                        updateData.price_changelog = chargeLogEntry;
                    } else {
                        updateData.price_changelog += ` | ${chargeLogEntry}`;
                    }

                    isModified = true;

                    // Also record in status history as a note
                    await this.ordersService.recordStatusHistory(
                        order.id,
                        order.order_status,
                        'Nepal Can Move',
                        `NCM Webhook: ${chargeLogEntry}`
                    );
                }

                // Update order status if it changed
                if (internalStatus !== order.order_status) {
                    updateData.courier_status = status || event;

                    const { error: updateError } = await supabaseService.getSupabaseClient()
                        .from('orders')
                        .update(updateData)
                        .eq('id', order.id);

                    if (updateError) {
                        this.logger.error(`Failed to update order ${order.id} status/data via NCM webhook: ${updateError.message}`);
                        continue;
                    }

                    // Update status and trigger syncs/hooks
                    await this.ordersService.updateDeliveryStatus(
                        order.id,
                        internalStatus,
                        'Nepal Can Move',
                        `NCM Webhook (${event || 'status update'}): ${status || event}${remarks ? ` (${remarks})` : ''}`
                    );

                    this.logger.log(`Updated order ${order.order_number} (Consignment: ${consignmentId}) status to ${internalStatus} (NCM: ${status || event})`);
                } else if (isModified) {
                    // Update only modified fields if status didn't change
                    const { error: updateError } = await supabaseService.getSupabaseClient()
                        .from('orders')
                        .update(updateData)
                        .eq('id', order.id);

                    if (updateError) {
                        this.logger.error(`Failed to update order ${order.id} data via NCM webhook: ${updateError.message}`);
                    }
                } else {
                    // Even if internal status hasn't changed, update courier_status for detailed tracking
                    this.logger.log(`Internal status for order ${order.id} is already ${internalStatus}. Updating courier_status only.`);
                    await supabaseService.getSupabaseClient()
                        .from('orders')
                        .update({
                            courier_status: status || event,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', order.id);
                }
            } catch (err: any) {
                this.logger.error(`Error processing consignment ${consignmentId}: ${err.message}`);
            }
        }
    }

    private mapStatus(ncmValue: string): string {
        if (!ncmValue) return 'Shipped';

        // Event-based mapping (robust)
        const eventMap: Record<string, string> = {
            'pickup_completed': 'Shipped',
            'sent_for_delivery': 'Delivery Process',
            'order_dispatched': 'Shipped',
            'order_arrived': 'Arrived at Branch',
            'delivery_completed': 'Delivered'
        };

        if (eventMap[ncmValue]) return eventMap[ncmValue];

        // Status-based mapping (fallback)
        if (ncmValue.startsWith('Dispatched to')) return 'Shipped';
        if (ncmValue.startsWith('Arrived at')) return 'Arrived at Branch';

        const statusMap: Record<string, string> = {
            'Pickup Order Created': 'Packed',
            'Pending': 'Ready to Ship',
            'Ready to Ship': 'Ready to Ship',
            'Order Confirmed': 'Confirmed Order',
            'Drop off Order Created': 'Ready to Ship',
            'Sent for Pickup': 'Packed',
            'Pickup Complete': 'Shipped',
            'Pickup Done': 'Shipped',
            'Dispatched': 'Shipped',
            'Arrived': 'Arrived at Branch',
            'Arrived at Branch': 'Arrived at Branch',
            'Sent for Delivery': 'Delivery Process',
            'Out for Delivery': 'Delivery Process',
            'In Transit': 'Delivery Process',
            'Delivered': 'Delivered',
            'Cancelled': 'Cancelled',
            'Returned': 'Return Delivered',
            'Return Process': 'Return Process',
            'Hold': 'Hold',
            'Exchange': 'Return Process'
        };

        return statusMap[ncmValue] || 'Shipped';
    }

    async syncOrderStatus(orderId: string) {
        this.logger.log(`Manually syncing NCM status for order: ${orderId}`);

        try {
            // Fetch order to get consignment ID
            const { data: order, error: fetchError } = await supabaseService.getSupabaseClient()
                .from('orders')
                .select('id, order_status, courier_consignment_id, courier_provider')
                .eq('id', orderId)
                .single();

            if (fetchError || !order) {
                throw new Error(`Order ${orderId} not found in database`);
            }

            if (order.courier_provider !== 'ncm' || !order.courier_consignment_id) {
                throw new Error(`Order ${orderId} is not an NCM order or missing consignment ID`);
            }

            const consignmentId = order.courier_consignment_id;
            const { baseUrl } = await this.getCredentials();
            const headers = await this.getHeaders();

            this.logger.log(`Fetching latest status for NCM consignment ${consignmentId} (Order ${orderId})`);

            // NCM Order Status API: GET /api/v1/order/status?id=ORDERID
            const response = await axios.get(`${baseUrl}/api/v1/order/status?id=${consignmentId}`, { headers });

            const statusHistory = response.data;

            if (!Array.isArray(statusHistory) || statusHistory.length === 0) {
                this.logger.warn(`No status history found for NCM consignment ${consignmentId}`);
                return { success: true, message: 'No status information found from NCM.' };
            }

            const latestNcmStatus = statusHistory[0].status;
            const internalStatus = this.mapStatus(latestNcmStatus);

            this.logger.log(`Latest NCM status for ${consignmentId}: ${latestNcmStatus} -> Mapped: ${internalStatus}`);

            if (internalStatus !== order.order_status) {
                this.logger.log(`Status changed for order ${orderId}. Updating...`);

                // Update status and trigger syncs/hooks
                await this.ordersService.updateDeliveryStatus(
                    orderId,
                    internalStatus,
                    'Nepal Can Move',
                    `NCM Sync: ${latestNcmStatus}`
                );

                return {
                    success: true,
                    newStatus: internalStatus,
                    message: 'Status updated successfully'
                };
            }

            return {
                success: true,
                message: 'Status is already up to date',
                currentStatus: internalStatus
            };

        } catch (error: any) {
            this.logger.error(`Failed to sync NCM status for order ${orderId}: ${error.message}`);
            throw error;
        }
    }

    async registerWebhook(webhookUrl: string) {
        try {
            const { baseUrl } = await this.getCredentials();
            const headers = await this.getHeaders();
            const response = await axios.post(`${baseUrl}/api/v2/vendor/webhook`, {
                webhook_url: webhookUrl
            }, { headers });

            this.logger.log(`NCM Webhook registered to ${webhookUrl}: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            this.logger.error(`Failed to register NCM webhook: ${errorMsg}`);
            throw new Error(`NCM Webhook Registration Failed: ${errorMsg}`);
        }
    }
}
