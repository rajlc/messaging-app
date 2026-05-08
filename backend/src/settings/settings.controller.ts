import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';

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
}
