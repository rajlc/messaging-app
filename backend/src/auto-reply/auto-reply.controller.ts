import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AutoReplyService } from './auto-reply.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/auto-reply')
@UseGuards(AuthGuard('jwt'))
export class AutoReplyController {
    constructor(private readonly autoReplyService: AutoReplyService) { }

    @Post()
    async createRule(@Body() data: any) {
        return this.autoReplyService.createRule(data);
    }

    @Get()
    async getRules(@Query('page_id') pageId: string) {
        return this.autoReplyService.getRulesByPage(pageId);
    }

    @Put(':id')
    async updateRule(@Param('id') id: string, @Body() data: any) {
        return this.autoReplyService.updateRule(id, data);
    }

    @Delete(':id')
    async deleteRule(@Param('id') id: string) {
        return this.autoReplyService.deleteRule(id);
    }
}
