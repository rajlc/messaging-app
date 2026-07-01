import { Controller, Get, Post, Delete, Patch, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { supabaseService } from '../../supabase/supabase.service';
import { FacebookService } from '../facebook.service';

@Controller('api/pages')
export class PagesController {
    constructor(private facebookService: FacebookService) { }

    @Get()
    async getPages() {
        const pages = await supabaseService.getPages();
        return pages.map(p => ({
            ...p,
            isOnline: PagesController.isProfileOnline(p.page_id)
        }));
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

    // In-memory cache for online marketplace profiles (profileId -> lastActiveTimestamp)
    public static onlineMarketplaceProfiles = new Map<string, number>();
    public static pendingMarketplaceSends = new Map<string, Array<{ recipientId: string; text: string; messageId: string }>>();

    public static isProfileOnline(profileId: string): boolean {
        const lastActive = this.onlineMarketplaceProfiles.get(profileId);
        if (!lastActive) return false;
        // Consider online if active within last 25 seconds
        return (Date.now() - lastActive) < 25000;
    }

    @Post('heartbeat')
    async registerHeartbeat(@Body() body: { pageId: string; platform: string }) {
        if (body.pageId && body.platform === 'facebook_marketplace') {
            PagesController.onlineMarketplaceProfiles.set(body.pageId, Date.now());
            return { success: true, status: 'acknowledged' };
        }
        return { success: false, error: 'Invalid profile or platform' };
    }

    @Get('pending-messages/:pageId')
    getPendingMessages(@Param('pageId') pageId: string) {
        const queue = PagesController.pendingMarketplaceSends.get(pageId) || [];
        return queue;
    }

    @Post('pending-messages/sent')
    markMessageSent(@Body() body: { pageId: string; messageId: string }) {
        const queue = PagesController.pendingMarketplaceSends.get(body.pageId) || [];
        const filtered = queue.filter(m => m.messageId !== body.messageId);
        PagesController.pendingMarketplaceSends.set(body.pageId, filtered);
        return { success: true };
    }
}
