import { Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { FacebookService } from './facebook.service';

@Controller('api/facebook')
export class FacebookController {
    constructor(
        private configService: ConfigService,
        private facebookService: FacebookService,
    ) { }

    @Get('page-info')
    async getPageInfo() {
        const pageAccessToken = this.configService.get<string>('META_PAGE_ACCESS_TOKEN');

        if (!pageAccessToken) {
            return {
                connected: false,
                message: 'No page access token configured'
            };
        }

        try {
            // Fetch page info from Facebook Graph API
            const response = await axios.get(`https://graph.facebook.com/v18.0/me`, {
                params: {
                    fields: 'id,name,username',
                    access_token: pageAccessToken
                }
            });

            return {
                connected: true,
                pageId: response.data.id,
                pageName: response.data.name,
                username: response.data.username
            };
        } catch (error) {
            console.error('Error fetching page info:', error.response?.data || error.message);
            return {
                connected: false,
                error: 'Failed to fetch page information'
            };
        }
    }

    @Get('user/:userId')
    async getUserProfile(@Param('userId') userId: string) {
        try {
            const profile = await this.facebookService.getUserProfile(userId);
            return profile;
        } catch (error) {
            return {
                error: 'Failed to fetch user profile',
                message: error.message
            };
        }
    }
}
