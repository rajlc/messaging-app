import { Controller, Get, Post, Delete, Patch, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { supabaseService } from '../../supabase/supabase.service';
import { FacebookService } from '../facebook.service';

@Controller('api/pages')
export class PagesController {
    constructor(private facebookService: FacebookService) { }

    @Get()
    async getPages() {
        return await supabaseService.getPages();
    }

    @Post()
    async addPage(@Body() body: { pageId: string; accessToken: string; platform?: string }) {
        if (!body.pageId || !body.accessToken) {
            throw new HttpException('Page ID and Access Token are required', HttpStatus.BAD_REQUEST);
        }

        // Validate token
        const isValid = await this.facebookService.validatePageToken(body.pageId, body.accessToken);
        if (!isValid) {
            throw new HttpException('Invalid Page ID or Access Token', HttpStatus.BAD_REQUEST);
        }

        // Get page name
        let pageName = 'Unknown Page';
        try {
            pageName = await this.facebookService.getPageName(body.pageId, body.accessToken);
        } catch (error) {
            console.warn('Could not fetch page name, using default');
        }

        const page = await supabaseService.createPage({
            platform: body.platform || 'facebook',
            pageName: pageName,
            pageId: body.pageId,
            accessToken: body.accessToken
        });

        return page;
    }

    @Delete(':id')
    async removePage(@Param('id') id: string) {
        return await supabaseService.deletePage(id);
    }

    @Patch(':id')
    async updatePage(@Param('id') id: string, @Body() body: { is_ai_enabled?: boolean; custom_prompt?: string }) {
        return await supabaseService.updatePage(id, body);
    }
}
