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
        // 1. If pageId is provided, check DB first for the fresh token configured by user
        if (pageId) {
            const page = await supabaseService.getPageByFacebookId(pageId);
            if (page && page.access_token && page.access_token !== 'none') {
                return page.access_token;
            }
        }

        // 2. Fall back to environment variable if pageId matches default or if no pageId provided
        if (!pageId || pageId === this.defaultPageId) {
            if (this.defaultPageAccessToken) {
                return this.defaultPageAccessToken;
            }
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

    async exchangeCodeForAccessToken(code: string, redirectUri: string): Promise<string> {
        const appId = this.configService.get<string>('META_APP_ID');
        const appSecret = this.configService.get<string>('META_APP_SECRET');

        if (!appId || !appSecret) {
            throw new Error('Meta App ID or App Secret is not configured');
        }

        const url = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`;
        const response = await axios.get(url, {
            params: {
                client_id: appId,
                client_secret: appSecret,
                redirect_uri: redirectUri,
                code: code,
            },
        });

        if (response.data && response.data.access_token) {
            return response.data.access_token;
        }
        throw new Error('Failed to retrieve access token from Meta');
    }

    async getUserAccounts(userAccessToken: string): Promise<any[]> {
        const pagesMap = new Map<string, any>();

        // 1. Standard /me/accounts call (Personal & standard managed pages)
        try {
            const url = `https://graph.facebook.com/${this.apiVersion}/me/accounts`;
            const response = await axios.get(url, {
                params: {
                    access_token: userAccessToken,
                    fields: 'id,name,access_token,category,tasks',
                    limit: 100,
                },
            });

            console.log(`[FacebookService] /me/accounts raw count: ${response.data?.data?.length || 0}`);
            if (response.data?.data && Array.isArray(response.data.data)) {
                for (const p of response.data.data) {
                    if (p.id) {
                        pagesMap.set(p.id, p);
                    }
                }
            }
        } catch (error: any) {
            console.warn('[FacebookService] Error calling /me/accounts:', error.response?.data || error.message);
        }

        // 2. Inspect token granular_scopes via /debug_token to discover any pages selected in Login for Business
        const appId = this.configService.get<string>('META_APP_ID');
        const appSecret = this.configService.get<string>('META_APP_SECRET');
        let hasGranularRestrictions = false;
        const allowedPageIds = new Set<string>();
        const allowedInstagramIds = new Set<string>();

        if (appId && appSecret) {
            try {
                const debugUrl = `https://graph.facebook.com/${this.apiVersion}/debug_token`;
                const debugRes = await axios.get(debugUrl, {
                    params: {
                        input_token: userAccessToken,
                        access_token: `${appId}|${appSecret}`,
                    },
                });

                const granularScopes = debugRes.data?.data?.granular_scopes || [];

                for (const gs of granularScopes) {
                    if (gs.scope?.startsWith('pages_') && Array.isArray(gs.target_ids)) {
                        hasGranularRestrictions = true;
                        for (const tid of gs.target_ids) {
                            if (tid) allowedPageIds.add(tid);
                        }
                    }
                    if (gs.scope?.startsWith('instagram_') && Array.isArray(gs.target_ids)) {
                        hasGranularRestrictions = true;
                        for (const tid of gs.target_ids) {
                            if (tid) allowedInstagramIds.add(tid);
                        }
                    }
                }

                // If granular selection exists, fetch missing pages from allowedPageIds
                if (allowedPageIds.size > 0) {
                    const missingPageIds = Array.from(allowedPageIds).filter(id => !pagesMap.has(id));
                    if (missingPageIds.length > 0) {
                        console.log(`[FacebookService] Fetching ${missingPageIds.length} missing pages from granular_scopes:`, missingPageIds);
                        await Promise.all(missingPageIds.map(async (pageId) => {
                            try {
                                const pageUrl = `https://graph.facebook.com/${this.apiVersion}/${pageId}`;
                                const pageRes = await axios.get(pageUrl, {
                                    params: {
                                        access_token: userAccessToken,
                                        fields: 'id,name,access_token,category,tasks',
                                    },
                                });
                                if (pageRes.data?.id) {
                                    pagesMap.set(pageRes.data.id, pageRes.data);
                                }
                            } catch (err: any) {
                                console.warn(`[FacebookService] Could not fetch details for granular page ${pageId}:`, err.response?.data || err.message);
                            }
                        }));
                    }
                }
            } catch (error: any) {
                console.warn('[FacebookService] Error inspecting debug_token:', error.response?.data || error.message);
            }
        }

        // 3. Check /me/businesses only if the user did NOT restrict selection to specific pages
        if (!hasGranularRestrictions) {
            try {
                const bizUrl = `https://graph.facebook.com/${this.apiVersion}/me/businesses`;
                const bizRes = await axios.get(bizUrl, {
                    params: {
                        access_token: userAccessToken,
                        fields: 'id,name',
                        limit: 50,
                    },
                });

                const businesses = bizRes.data?.data || [];
                if (businesses.length > 0) {
                    console.log(`[FacebookService] Found ${businesses.length} businesses for user:`, businesses.map((b: any) => b.name));
                    await Promise.all(businesses.map(async (biz: any) => {
                        // Try owned_pages
                        try {
                            const ownedUrl = `https://graph.facebook.com/${this.apiVersion}/${biz.id}/owned_pages`;
                            const ownedRes = await axios.get(ownedUrl, {
                                params: {
                                    access_token: userAccessToken,
                                    fields: 'id,name,access_token,category,tasks',
                                    limit: 100,
                                },
                            });
                            for (const p of ownedRes.data?.data || []) {
                                if (p.id && !pagesMap.has(p.id)) {
                                    pagesMap.set(p.id, p);
                                }
                            }
                        } catch (err: any) {
                            // Silently handle if permission restricted
                        }

                        // Try client_pages
                        try {
                            const clientUrl = `https://graph.facebook.com/${this.apiVersion}/${biz.id}/client_pages`;
                            const clientRes = await axios.get(clientUrl, {
                                params: {
                                    access_token: userAccessToken,
                                    fields: 'id,name,access_token,category,tasks',
                                    limit: 100,
                                },
                            });
                            for (const p of clientRes.data?.data || []) {
                                if (p.id && !pagesMap.has(p.id)) {
                                    pagesMap.set(p.id, p);
                                }
                            }
                        } catch (err: any) {
                            // Silently handle if permission restricted
                        }
                    }));
                }
            } catch (error: any) {
                // Silently handle
            }
        }

        // 4. Ensure each page has a valid page access_token
        const allPages = Array.from(pagesMap.values());
        await Promise.all(allPages.map(async (p) => {
            if (!p.access_token) {
                try {
                    const tokenUrl = `https://graph.facebook.com/${this.apiVersion}/${p.id}`;
                    const tokenRes = await axios.get(tokenUrl, {
                        params: {
                            access_token: userAccessToken,
                            fields: 'access_token',
                        },
                    });
                    if (tokenRes.data?.access_token) {
                        p.access_token = tokenRes.data.access_token;
                    }
                } catch (e: any) {
                    console.warn(`[FacebookService] Could not resolve page access token for ${p.id}:`, e.message);
                }
            }
        }));

        // 5. Query Instagram business account details if connected
        const accountsWithIg = await Promise.all(allPages.map(async (acc: any) => {
            const tokenToUse = acc.access_token || userAccessToken;
            try {
                const pageUrl = `https://graph.facebook.com/${this.apiVersion}/${acc.id}`;
                const pageRes = await axios.get(pageUrl, {
                    params: {
                        access_token: tokenToUse,
                        fields: 'instagram_business_account{id,name,username,profile_picture_url}',
                    },
                });
                if (pageRes.data && pageRes.data.instagram_business_account) {
                    return {
                        ...acc,
                        instagram_business_account: pageRes.data.instagram_business_account,
                    };
                }
            } catch (err: any) {
                // Not every page has an Instagram business account
            }
            return acc;
        }));

        // 6. If user explicitly restricted pages during Facebook Login, strictly return ONLY the chosen pages
        if (hasGranularRestrictions) {
            console.log(`[FacebookService] Enforcing granular selection filter. Allowed page IDs:`, Array.from(allowedPageIds), `Allowed IG IDs:`, Array.from(allowedInstagramIds));
            const filtered = accountsWithIg.filter((acc: any) => {
                const pageMatches = allowedPageIds.has(acc.id);
                const igMatches = acc.instagram_business_account && allowedInstagramIds.has(acc.instagram_business_account.id);
                return pageMatches || igMatches;
            });
            console.log(`[FacebookService] Filtered down to ${filtered.length} user-selected pages:`, filtered.map((p: any) => `${p.name} (${p.id})`));
            return filtered;
        }

        console.log(`[FacebookService] Final resolved unique pages (${accountsWithIg.length}):`, accountsWithIg.map(p => `${p.name} (${p.id}) [token: ${p.access_token ? 'YES' : 'NO'}]`));
        return accountsWithIg;
    }
}
