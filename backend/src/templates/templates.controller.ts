import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { TemplatesService } from './templates.service';

@Controller('api/templates')
export class TemplatesController {
    constructor(private readonly templatesService: TemplatesService) { }

    // Message templates endpoints (existing)
    @Get()
    async getTemplates() {
        return this.templatesService.getAllTemplates();
    }

    @Post()
    async upsertTemplate(@Body() body: { status: string; template: string; is_active?: boolean }) {
        return this.templatesService.upsertTemplate(body.status, body.template, body.is_active);
    }

    // Quick reply templates endpoints (new)
    @Get('quick-reply')
    async getQuickReplyTemplates() {
        return this.templatesService.getAllQuickReplyTemplates();
    }

    @Get('quick-reply/:id')
    async getQuickReplyTemplate(@Param('id') id: string) {
        return this.templatesService.getQuickReplyTemplateById(id);
    }

    @Post('quick-reply')
    async createQuickReplyTemplate(@Body() body: { title: string; message: string }) {
        return this.templatesService.createQuickReplyTemplate(body);
    }

    @Put('quick-reply/:id')
    async updateQuickReplyTemplate(
        @Param('id') id: string,
        @Body() body: { title?: string; message?: string }
    ) {
        return this.templatesService.updateQuickReplyTemplate(id, body);
    }

    @Delete('quick-reply/:id')
    async deleteQuickReplyTemplate(@Param('id') id: string) {
        await this.templatesService.deleteQuickReplyTemplate(id);
        return { success: true };
    }
}

