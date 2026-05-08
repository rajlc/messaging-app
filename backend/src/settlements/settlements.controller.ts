import { Controller, Post, Get, Body, UseGuards, Request, UnauthorizedException, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SettlementsService } from './settlements.service';

@Controller('api/settlements')
export class SettlementsController {
    constructor(private readonly settlementsService: SettlementsService) {}

    @UseGuards(AuthGuard('jwt'))
    @Get('riders')
    async getRiders() {
        return this.settlementsService.getRiders();
    }

    @UseGuards(AuthGuard('jwt'))
    @Post()
    async createSettlement(@Request() req, @Body() body: { riderId: string; amount: number; date: string }) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin' && role !== 'editor') {
            throw new UnauthorizedException('Admin or Editor access required');
        }
        const actorName = req.user.full_name || req.user.email;
        return this.settlementsService.createSettlement(body.riderId, body.amount, body.date, actorName);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getAllSettlements() {
        return this.settlementsService.getAllSettlements();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('pending-summary')
    async getPendingSummary(@Request() req) {
        const role = req.user.role?.toLowerCase();
        if (role !== 'admin' && role !== 'editor') {
            throw new UnauthorizedException('Admin or Editor access required');
        }
        return this.settlementsService.getPendingSummary();
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my-summary')
    async getMySummary(@Request() req) {
        return this.settlementsService.getMySummary(req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('my-delivery-report')
    async getMyDeliveryReport(
        @Request() req,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.settlementsService.getDeliveryReport(startDate, endDate, req.user.id);
    }

    @UseGuards(AuthGuard('jwt'))
    @Get('delivery-report')
    async getDeliveryReport(
        @Request() req,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('riderId') riderId?: string
    ) {
        const role = req.user.role?.toLowerCase();
        let targetRiderId = riderId;

        // If not admin/editor, force riderId to be the logged-in user's ID
        if (role !== 'admin' && role !== 'editor') {
            targetRiderId = req.user.id;
        }

        return this.settlementsService.getDeliveryReport(startDate, endDate, targetRiderId);
    }
}
