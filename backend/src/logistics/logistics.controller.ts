import { Controller, Get, Post, Put, Param, Body, Query, Headers, Res } from '@nestjs/common';
import * as express from 'express';
import { LogisticsService } from './logistics.service';
import { PickDropService } from './pick-drop.service';
import { NcmService } from './ncm.service';
import { supabaseService } from '../supabase/supabase.service';

@Controller('api/logistics')
export class LogisticsController {
    constructor(
        private readonly logisticsService: LogisticsService,
        private readonly pickDropService: PickDropService,
        private readonly ncmService: NcmService
    ) { }

    // ─── Pathao Parcel Endpoints ─────────────────────────────────────────────────

    @Get('cities')
    async getCities() {
        return this.logisticsService.getCities();
    }

    @Get('zones/:cityId')
    async getZones(@Param('cityId') cityId: string) {
        return this.logisticsService.getZones(parseInt(cityId));
    }

    @Get('areas/:zoneId')
    async getAreas(@Param('zoneId') zoneId: string) {
        return this.logisticsService.getAreas(parseInt(zoneId));
    }

    @Get('all-areas')
    async getAllAreas() {
        return this.logisticsService.getAllAreas();
    }

    @Post('price-plan')
    async calculatePrice(@Body() body: any) {
        return this.logisticsService.calculatePrice(body);
    }

    @Post('ship')
    async shipOrder(@Body('orderId') orderId: string) {
        return this.logisticsService.createOrder(orderId);
    }

    @Get('orders/:orderId/pathao-info')
    async getPathaoInfo(@Param('orderId') orderId: string) {
        return this.logisticsService.getPathaoOrderInfo(orderId);
    }

    @Post('webhook')
    async handleWebhook(@Body() payload: any, @Headers() headers: any, @Res() res: express.Response) {
        const result = await this.logisticsService.handleWebhook(payload, headers);

        if (result && result.message === 'Integration verified') {
            const secret = process.env.PATHAO_WEBHOOK_SECRET || 'f3992ecc-59da-4cbe-a049-a13da2018d51';
            res.setHeader('X-Pathao-Merchant-Webhook-Integration-Secret', secret);
            return res.status(202).json(result);
        }

        return res.status(200).json(result);
    }

    // ─── Pick & Drop Endpoints ───────────────────────────────────────────────────

    @Get('pickdrop/branches')
    async getPickDropBranches() {
        try {
            const branches = await this.pickDropService.getBranches();
            return { success: true, data: branches };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('pickdrop/delivery-rate')
    async getPickDropDeliveryRate(@Body() body: any) {
        try {
            const rate = await this.pickDropService.getDeliveryRate(body);
            return { success: true, data: rate };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('pickdrop/ship')
    async shipPickDropOrder(@Body('orderId') orderId: string) {
        try {
            const result = await this.pickDropService.createOrder(orderId);
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Put('pickdrop/cancel')
    async cancelPickDropOrder(@Body('pndOrderId') pndOrderId: string) {
        try {
            const result = await this.pickDropService.cancelOrder(pndOrderId);
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Get('pickdrop/order-details')
    async getPickDropOrderDetails(@Query('orderId') orderId: string) {
        try {
            const result = await this.pickDropService.getOrderDetails(orderId);
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('pickdrop/status-sync')
    async syncPickDropOrder(@Body('orderId') orderId: string) {
        try {
            const result = await this.pickDropService.syncOrder(orderId);
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Get('pickdrop/webhook')
    async verifyPickDropWebhook() {
        return {
            message: 'Pick & Drop webhook endpoint is reachable',
            expectedPath: '/api/logistics/pickdrop/webhook',
            method: 'POST'
        };
    }

    @Post('pickdrop/webhook')
    async handlePickDropWebhook(@Body() payload: any, @Headers() headers: any, @Res() res: express.Response) {
        console.log(`[PickDrop Webhook] Incoming request from ${headers['x-forwarded-for'] || 'unknown'}`);
        console.log(`[PickDrop Webhook] Headers: ${JSON.stringify(headers)}`);

        try {
            const result = await this.pickDropService.handleWebhook(payload, headers);
            return res.status(200).json(result);
        } catch (e) {
            console.error(`[PickDrop Webhook Error] ${e.message}`);
            return res.status(500).json({ success: false, error: e.message });
        }
    }

    // ─── NCM (Nepal Can Move) Endpoints ─────────────────────────────────────────

    @Get('ncm/branches')
    async getNcmBranches() {
        try {
            const branches = await this.ncmService.getBranches();
            return { success: true, data: branches };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('ncm/shipping-rate')
    async getNcmShippingRate(@Body() body: any) {
        try {
            const { creation, destination, type } = body;
            const rate = await this.ncmService.calculateShippingRate(creation, destination, type);
            return { success: true, data: rate };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('ncm/ship')
    async handleNcmShip(@Body() body: any) {
        try {
            const { orderId, fromBranch, toBranch, deliveryType } = body;
            // Fetch order from DB to get latest details
            const { data: order, error: fetchError } = await supabaseService.getSupabaseClient()
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (fetchError || !order) throw new Error('Order not found');

            // Merge override fields if provided from frontend
            const orderWithOverrides = {
                ...order,
                ncm_from_branch: fromBranch || order.ncm_from_branch || order.from_branch,
                ncm_to_branch: toBranch || order.ncm_to_branch || order.delivery_branch,
                ncm_delivery_type: deliveryType || order.ncm_delivery_type || order.delivery_type
            };

            const result = await this.ncmService.createOrder(orderWithOverrides);

            if (result.success) {
                const { error: updateError } = await supabaseService.getSupabaseClient()
                    .from('orders')
                    .update({
                        courier_provider: 'ncm',
                        courier_consignment_id: result.orderId.toString(),
                        ncm_from_branch: orderWithOverrides.ncm_from_branch,
                        ncm_to_branch: orderWithOverrides.ncm_to_branch,
                        ncm_delivery_type: orderWithOverrides.ncm_delivery_type,
                        order_status: 'Packed',
                        logistic_name: 'Nepal Can Move (NCM)'
                    })
                    .eq('id', orderId);

                if (updateError) throw updateError;

                // Record status history for "Packed"
                await supabaseService.getSupabaseClient()
                    .from('order_status_history')
                    .insert([{
                        order_id: orderId,
                        status: 'Packed',
                        changed_by: 'system',
                        remarks: `Initial NCM Shipment (Created NCM Order ID: ${result.orderId})`
                    }]);
            }

            return result;
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('ncm/webhook')
    async handleNcmWebhook(@Body() payload: any) {
        console.log(`[NCM Webhook] Incoming payload: ${JSON.stringify(payload)}`);
        try {
            await this.ncmService.handleWebhook(payload);
            return { success: true };
        } catch (e) {
            console.error(`[NCM Webhook Error] ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    @Post('ncm/register-webhook')
    async registerNcmWebhook(@Body('url') url: string) {
        try {
            if (!url) throw new Error('URL is required');
            const result = await this.ncmService.registerWebhook(url);
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('ncm/status-sync')
    async syncNcmStatus(@Body() body: { orderId: string }) {
        try {
            const result = await this.ncmService.syncOrderStatus(body.orderId);
            return result;
        } catch (e) {
            console.error(`[NCM Sync Error] ${e.message}`);
            return { success: false, error: e.message };
        }
    }

    // ─── COD Settlement Endpoints ───────────────────────────────────────────────

    @Get('cod-settlements/:logisticId')
    async getCodSettlements(@Param('logisticId') logisticId: string) {
        try {
            const data = await this.logisticsService.getSettlements(logisticId);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('cod-settlements')
    async addCodSettlement(@Body() body: { logisticId: string, amount: number, date: string, remarks: string }) {
        try {
            const result = await this.logisticsService.addSettlement(body);
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Put('cod-settlements/:id')
    async updateCodSettlement(@Param('id') id: string, @Body() body: { amount: number, date: string, remarks: string }) {
        try {
            const result = await this.logisticsService.updateSettlement(id, body);
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Get('order-changelogs/:logisticId')
    async getOrderChangelogs(@Param('logisticId') logisticId: string) {
        try {
            const data = await this.logisticsService.getOrderChangelogs(logisticId);
            return { success: true, data };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}
