import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowUpService } from './follow-up.service';

@UseGuards(AuthGuard('jwt'))
@Controller('api/follow-up-templates')
export class FollowUpController {
    constructor(private readonly followUpService: FollowUpService) { }

    @Get()
    async getTemplates() {
        return this.followUpService.getTemplates();
    }

    @Post()
    async saveTemplate(
        @Body() body: { status: string; instruction: string; delay_hours: number; is_active: boolean }
    ) {
        return this.followUpService.saveTemplate(body);
    }

    @Post('trigger/:orderId')
    async triggerFollowUp(@Param('orderId') orderId: string) {
        return this.followUpService.triggerFollowUpForOrder(orderId, true);
    }
}
