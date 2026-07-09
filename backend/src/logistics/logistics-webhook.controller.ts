import { Controller, Get, Post, Body, Headers, Res } from '@nestjs/common';
import * as express from 'express';
import { LogisticsService } from './logistics.service';
import { PickDropService } from './pick-drop.service';
import { NcmService } from './ncm.service';

@Controller('api/logistics')
export class LogisticsWebhookController {
    constructor(
        private readonly logisticsService: LogisticsService,
        private readonly pickDropService: PickDropService,
        private readonly ncmService: NcmService
    ) { }

    @Post('webhook')
    async handlePathaoWebhook(@Body() payload: any, @Headers() headers: any, @Res() res: express.Response) {
        const result = await this.logisticsService.handleWebhook(payload, headers);

        if (result && result.message === 'Integration verified') {
            const secret = process.env.PATHAO_WEBHOOK_SECRET || 'f3992ecc-59da-4cbe-a049-a13da2018d51';
            res.setHeader('X-Pathao-Merchant-Webhook-Integration-Secret', secret);
            return res.status(202).json(result);
        }

        return res.status(200).json(result);
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
}
