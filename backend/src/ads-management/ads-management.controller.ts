import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AdsManagementService } from './ads-management.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/ads-management')
@UseGuards(AuthGuard('jwt'))
export class AdsManagementController {
    constructor(private readonly adsManagementService: AdsManagementService) { }

    // Campaigns
    @Get('campaigns')
    async findAllCampaigns() {
        try {
            const data = await this.adsManagementService.findAllCampaigns();
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @Post('campaigns')
    async createCampaign(@Body() body: any) {
        try {
            const data = await this.adsManagementService.createCampaign(body);
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @Put('campaigns/:id')
    async updateCampaign(@Param('id') id: string, @Body() body: any) {
        try {
            const data = await this.adsManagementService.updateCampaign(id, body);
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @Get('campaigns/:id/details')
    async findCampaignDetails(@Param('id') id: string) {
        try {
            const data = await this.adsManagementService.findCampaignDetails(id);
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Spends
    @Get('spends')
    async findAllSpends() {
        try {
            const data = await this.adsManagementService.findAllSpends();
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @Post('spends')
    async createSpend(@Body() body: any) {
        try {
            const data = await this.adsManagementService.createSpend(body);
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @Put('spends/:id')
    async updateSpend(@Param('id') id: string, @Body() body: any) {
        try {
            const data = await this.adsManagementService.updateSpend(id, body);
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    // Product Metrics
    @Get('product-metrics')
    async findAllProductMetrics() {
        try {
            const data = await this.adsManagementService.findAllProductMetrics();
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @Post('product-metrics')
    async upsertProductMetric(@Body() body: any) {
        try {
            const { product_name, est_purchase_cost } = body;
            const data = await this.adsManagementService.upsertProductMetric(product_name, est_purchase_cost);
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @Get('daily-profit-analysis')
    async getDailyProfitAnalysis() {
        try {
            const data = await this.adsManagementService.getDailyProfitAnalysis();
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
