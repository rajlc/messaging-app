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
    async addPage(@Body() body: { pageId: string; accessToken?: string; platform?: string; pageName?: string }) {
        if (!body.pageId) {
            throw new HttpException('Page ID is required', HttpStatus.BAD_REQUEST);
        }

        const platform = body.platform || 'facebook';
        const isFacebookPage = platform === 'facebook';

        if (isFacebookPage && !body.accessToken) {
            throw new HttpException('Access Token is required for Facebook Pages', HttpStatus.BAD_REQUEST);
        }

        let pageName = body.pageName || 'Social Account';

        if (isFacebookPage) {
            const isValid = await this.facebookService.validatePageToken(body.pageId, body.accessToken!);
            if (!isValid) {
                throw new HttpException('Invalid Facebook Page ID or Access Token', HttpStatus.BAD_REQUEST);
            }

            if (!body.pageName) {
                try {
                    pageName = await this.facebookService.getPageName(body.pageId, body.accessToken!);
                } catch (error) {
                    console.warn('Could not fetch page name, using default');
                }
            }
        } else if (!body.pageName) {
            pageName = `${platform.charAt(0).toUpperCase() + platform.slice(1)} Account (${body.pageId})`;
        }

        const page = await supabaseService.createPage({
            platform: platform,
            pageName: pageName,
            pageId: body.pageId,
            accessToken: body.accessToken || 'none'
        });

        return page;
    }

    @Delete(':id')
    async removePage(@Param('id') id: string) {
        return await supabaseService.deletePage(id);
    }

    @Patch(':id')
    async updatePage(@Param('id') id: string, @Body() body: { is_ai_enabled?: boolean; custom_prompt?: string; cutoff_messages?: string }) {
        return await supabaseService.updatePage(id, body);
    }
}
