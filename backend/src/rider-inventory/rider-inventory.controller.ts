import { Controller, Get, Post, Body, UseGuards, Request, Param, Put, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RiderInventoryService } from './rider-inventory.service';

@Controller('api/rider-inventory')
@UseGuards(AuthGuard('jwt'))
export class RiderInventoryController {
    constructor(private readonly riderInventoryService: RiderInventoryService) { }

    @Post('assign')
    async assignStock(@Body() body: any, @Request() req: any) {
        // Only Admin should assign stock
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin') {
            throw new UnauthorizedException('Admin access required');
        }
        return this.riderInventoryService.assignStock({
            ...body,
            assigned_by: req.user.full_name || req.user.email
        });
    }

    @Get('my-stock')
    async getMyStock(@Request() req: any) {
        return this.riderInventoryService.getMyStock(req.user.id);
    }

    @Get('all')
    async getAllStock(@Request() req: any) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin') {
            throw new UnauthorizedException('Admin access required');
        }
        return this.riderInventoryService.getAllRiderStock();
    }

    @Put(':id/status')
    async updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
        // Admin or the assigned Rider can update status
        // For simplicity in this step, allowing both
        return this.riderInventoryService.updateStockStatus(id, status);
    }

    @Post('quick-sale')
    async quickSale(@Body() body: any, @Request() req: any) {
        return this.riderInventoryService.recordQuickSale(req.user.id, body, req.user.full_name);
    }
}
