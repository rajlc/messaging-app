import { Controller, Get, Post, Delete, Body, Param, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('api/settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getSettings() {
        return this.settingsService.getAllSettings();
    }

    @Post()
    async updateSettings(@Body() body: { [key: string]: string }) {
        const results = {};
        for (const [key, value] of Object.entries(body)) {
            results[key] = await this.settingsService.setSetting(key, value);
        }
        return { success: true, results };
    }

    // ─── Pathao Parcel ────────────────────────────────────────────────────────────

    @Get('courier')
    async getCourierSettings() {
        const settings = await this.settingsService.getCourierSettings('pathao');
        return settings || {};
    }

    @Post('courier')
    async saveCourierSettings(@Body() body: any) {
        try {
            const result = await this.settingsService.saveCourierSettings({ ...body, provider: 'pathao' });
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // ─── Pick & Drop ──────────────────────────────────────────────────────────────

    @Get('courier/pickdrop')
    async getPickDropSettings() {
        const settings = await this.settingsService.getCourierSettings('pickdrop');
        return settings || {};
    }

    @Post('courier/pickdrop')
    async savePickDropSettings(@Body() body: any) {
        try {
            const result = await this.settingsService.saveCourierSettings({ ...body, provider: 'pickdrop' });
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // ─── Nepal Can Move (NCM) ──────────────────────────────────────────────────────

    @Get('courier/ncm')
    async getNcmSettings() {
        const settings = await this.settingsService.getCourierSettings('ncm');
        return settings || {};
    }

    @Post('courier/ncm')
    async saveNcmSettings(@Body() body: any) {
        try {
            const result = await this.settingsService.saveCourierSettings({ ...body, provider: 'ncm' });
            return { success: true, data: result };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    // ─── Marketplace Products Catalog ──────────────────────────────────────────────

    @Get('marketplace-products')
    async getMarketplaceProducts() {
        return this.settingsService.getMarketplaceProducts();
    }

    @Delete('marketplace-products/:id')
    async deleteMarketplaceProduct(@Param('id') id: string) {
        try {
            await this.settingsService.deleteMarketplaceProduct(id);
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('marketplace-products/clear')
    async clearMarketplaceProducts() {
        try {
            await this.settingsService.clearMarketplaceProducts();
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    @Post('marketplace-products/upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadMarketplaceProducts(@UploadedFile() file: any) {
        if (!file) {
            return { success: false, error: 'No file uploaded' };
        }
        try {
            const result = await this.settingsService.importMarketplaceProducts(file.buffer);
            return { success: true, count: result?.length || 0 };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }
}
