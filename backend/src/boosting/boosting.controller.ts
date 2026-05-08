import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BoostingService } from './boosting.service';

@Controller('api/boosting-costs')
export class BoostingController {
    constructor(private readonly boostingService: BoostingService) { }

    @Get()
    async findAll() {
        try {
            const data = await this.boostingService.findAll();
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    @Post()
    async create(@Body() body: any) {
        try {
            const data = await this.boostingService.create(body);
            return { success: true, data };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
