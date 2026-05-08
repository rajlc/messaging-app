import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { supabaseService } from '../supabase/supabase.service';

@Injectable()
export class FacebookService {
    private readonly defaultPageAccessToken: string;
    private readonly defaultPageId: string;
    private readonly apiVersion = 'v21.0';

    constructor(private configService: ConfigService) {
        this.defaultPageAccessToken = this.configService.get<string>('META_PAGE_ACCESS_TOKEN') || '';
        this.defaultPageId = this.configService.get<string>('META_PAGE_ID') || '';

        if (!this.defaultPageAccessToken) {
            console.warn('⚠️ META_PAGE_ACCESS_TOKEN is not configured');
        }
        if (!this.defaultPageId) {
            console.warn('⚠️ META_PAGE_ID is not configured');
        }
    }

    private async getPageAccessToken(pageId?: string): Promise<string> {
        // If no specific page ID, try default
        if (!pageId) return this.defaultPageAccessToken;

        // If it matches default env var, return that
        if (pageId === this.defaultPageId) return this.defaultPageAccessToken;

        // Otherwise loop up in DB
        const page = await supabaseService.getPageByFacebookId(pageId);
        if (page && page.access_token) {
            return page.access_token;
        }

        console.warn(`Could not find access token for page ${pageId}, falling back to default if available`);
        return this.defaultPageAccessToken;
    }

    async validatePageToken(pageId: string, accessToken: string): Promise<boolean> {
        try {
            // Verify by making a simple call to get page info
            const url = `https://graph.facebook.com/${this.apiVersion}/${pageId}`;
            await axios.get(url, {
                params: { access_token: accessToken }
            });
            return true;
        } catch (error) {
            console.error('Token validation failed:', error.response?.data || error.message);
            return false;
        }
    }

    async getPageName(pageId: string, accessToken: string): Promise<string> {
        try {
            const url = `https://graph.facebook.com/${this.apiVersion}/${pageId}`;
            const response = await axios.get(url, {
                params: {
                    fields: 'name',
                    access_token: accessToken
                }
            });
            return response.data.name;
        } catch (error) {
            console.error('Failed to get page name:', error);
            throw error;
        }
    }

    async sendMessage(recipientId: string, text: string, pageId?: string, imageUrl?: string, tag?: string, replyToMid?: string): Promise<any> {
        const accessToken = await this.getPageAccessToken(pageId);
        const sendingPageId = pageId || this.defaultPageId;

        if (!accessToken) {
            throw new Error('No access token available for sending message');
        }

        const url = `https://graph.facebook.com/${this.apiVersion}/${sendingPageId}/messages`;

        let payload: any = {
            recipient: {
                id: recipientId,
            },
            // Use MESSAGE_TAG type when a tag is provided (bypasses 24hr window)
            // Otherwise use RESPONSE (standard reply within 24hr window)
            messaging_type: tag ? 'MESSAGE_TAG' : 'RESPONSE',
        };

        if (tag) {
            payload.tag = tag;
        }

        if (replyToMid) {
            payload.recipient.comment_id = undefined; // Ensure we don't mix comment/message reply logic if any
            payload.message = {
                text: text,
                reply_to: {
                    message_id: replyToMid
                }
            };
        } else if (imageUrl) {
            payload.message = {
                attachment: {
                    type: 'image',
                    payload: {
                        url: imageUrl,
                        is_reusable: true
                    }
                }
            };
        } else {
            payload.message = {
                text: text,
            };
        }


        try {
            console.log(`📤 Sending message to user ${recipientId} from page ${sendingPageId}`);

            const response = await axios.post(url, payload, {
                params: {
                    access_token: accessToken,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('✅ Message sent successfully');
            return response.data;
        } catch (error) {
            console.error('❌ Error sending message to Facebook:');
            if (error.response) {
                console.error('Status:', error.response.status);
                const fbError = error.response.data?.error;
                if (fbError) {
                    console.error(`❌ FB Error: ${fbError.message} (Type: ${fbError.type}, Code: ${fbError.code})`);
                } else {
                    console.error('Error details:', JSON.stringify(error.response.data, null, 2));
                }

                // Check for common errors
                if (error.response.data?.error?.code === 10) {
                    console.error('\n⚠️ PERMISSION ERROR: (Code 10) User may not have messaged recently.');
                } else if (error.response.data?.error?.code === 200) {
                    console.error('\n⚠️ PERMISSION ERROR: (Code 200) Missing pages_messaging permission.');
                }
            } else {
                console.error('Error message:', error.message);
            }
            throw error;
        }
    }

    async getUserProfile(userId: string, pageId?: string): Promise<any> {
        try {
            const accessToken = await this.getPageAccessToken(pageId);
            if (!accessToken) {
                console.warn('No Page Access Token available for fetching profile');
                return null;
            }

            console.log(`📥 Fetching profile for Facebook user ${userId} using ${this.apiVersion} (Page: ${pageId || 'Default'})`);

            const url = `https://graph.facebook.com/${this.apiVersion}/${userId}`;
            const response = await axios.get(url, {
                params: {
                    fields: 'name,first_name,last_name,profile_pic',
                    access_token: accessToken,
                },
            });

            if (response.data) {
                console.log('✅ User profile fetched successfully');
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('❌ Error fetching user profile:', error.response?.data || error.message);
            // Don't throw, return null so we can proceed with just ID
            return null;
        }
    }
}
