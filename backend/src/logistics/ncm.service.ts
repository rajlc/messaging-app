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
        const settings = await this.settingsService.getCourierSettings(this.provider);
        if (!settings) {
            throw new Error(`NCM credentials not found in settings.`);
        }
        return {
            baseUrl: (settings.base_url || 'https://demo.nepalcanmove.com').trim(),
            token: (settings.password || settings.client_secret || '').trim(),
        };
    }

    private async getHeaders() {
        const { token } = await this.getCredentials();
        return {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
        };
    }

    async getBranches() {
        const now = Date.now();
        if (this.branchCache.length > 0 && (now - this.lastCacheUpdate) < this.CACHE_TTL) {
            return this.branchCache;
        }

        try {
            const { baseUrl } = await this.getCredentials();
            const headers = await this.getHeaders();
            const response = await axios.get(`${baseUrl}/api/v2/branches`, { headers });

            if (response.data) {
                this.branchCache = response.data;
                this.lastCacheUpdate = now;
                return this.branchCache;
            }
            return [];
        } catch (error: any) {
            this.logger.error(`Failed to fetch NCM branches: ${error.message}`);
            return this.branchCache; // Return stale cache if available
        }
    }

    async calculateShippingRate(pickupBranch: string, destinationBranch: string, type: string = 'Door2Door') {
        try {
            const { baseUrl } = await this.getCredentials();
            const headers = await this.getHeaders();

            // Mapping types to NCM internal values if necessary
            // Clean branch names (uppercase and trimmed)
            const cleanPickup = (pickupBranch || '').trim().toUpperCase();
            const cleanDestination = (destinationBranch || '').trim().toUpperCase();

            // Mapping types to NCM internal values
            const typeMap: Record<string, string> = {
                'Door2Door': 'Pickup/Collect',
                'Branch2Door': 'Send',
                'Door2Branch': 'D2B',
                'Branch2Branch': 'B2B'
            };
            const ncmType = typeMap[type] || type;

            const response = await axios.get(`${baseUrl}/api/v1/shipping-rate`, {
                headers,
                params: {
                    creation: cleanPickup,
                    destination: cleanDestination,
                    type: ncmType
                },
                timeout: 10000
            });

            // If we get HTML instead of JSON, it's likely a 500 error page
            if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
                this.logger.error(`NCM API returned HTML instead of JSON for rate: ${response.data.substring(0, 200)}...`);
                return { error: 'NCM API server error (500)', success: false };
            }

            this.logger.log(`NCM Shipping Rate from ${cleanPickup} to ${cleanDestination} (${ncmType}): ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data ? (typeof error.response.data === 'string' ? 'API Error' : JSON.stringify(error.response.data)) : error.message;
            this.logger.error(`Failed to calculate NCM shipping rate: ${errorMsg}`);
            return { error: errorMsg, success: false };
        }
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
                    updateData.order_status = internalStatus;
                    updateData.courier_status = status || event;

                    const { error: updateError } = await supabaseService.getSupabaseClient()
                        .from('orders')
                        .update(updateData)
                        .eq('id', order.id);

                    if (updateError) {
                        this.logger.error(`Failed to update order ${order.id} status/data via NCM webhook: ${updateError.message}`);
                        continue;
                    }

                    // Record status history using OrdersService
                    await this.ordersService.recordStatusHistory(
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

                const { error: updateError } = await supabaseService.getSupabaseClient()
                    .from('orders')
                    .update({
                        order_status: internalStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', orderId);

                if (updateError) {
                    throw new Error(`Failed to update order status: ${updateError.message}`);
                }

                // Record status history using OrdersService
                await this.ordersService.recordStatusHistory(
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
