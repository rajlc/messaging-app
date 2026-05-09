"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = __importDefault(require("axios"));
const supabase_service_1 = require("../supabase/supabase.service");
let FacebookService = class FacebookService {
    configService;
    defaultPageAccessToken;
    defaultPageId;
    apiVersion = 'v21.0';
    constructor(configService) {
        this.configService = configService;
        this.defaultPageAccessToken = this.configService.get('META_PAGE_ACCESS_TOKEN') || '';
        this.defaultPageId = this.configService.get('META_PAGE_ID') || '';
        if (!this.defaultPageAccessToken) {
            console.warn('⚠️ META_PAGE_ACCESS_TOKEN is not configured');
        }
        if (!this.defaultPageId) {
            console.warn('⚠️ META_PAGE_ID is not configured');
        }
    }
    async getPageAccessToken(pageId) {
        if (!pageId)
            return this.defaultPageAccessToken;
        if (pageId === this.defaultPageId)
            return this.defaultPageAccessToken;
        const page = await supabase_service_1.supabaseService.getPageByFacebookId(pageId);
        if (page && page.access_token) {
            return page.access_token;
        }
        console.warn(`Could not find access token for page ${pageId}, falling back to default if available`);
        return this.defaultPageAccessToken;
    }
    async validatePageToken(pageId, accessToken) {
        try {
            const url = `https://graph.facebook.com/${this.apiVersion}/${pageId}`;
            await axios_1.default.get(url, {
                params: { access_token: accessToken }
            });
            return true;
        }
        catch (error) {
            console.error('Token validation failed:', error.response?.data || error.message);
            return false;
        }
    }
    async getPageName(pageId, accessToken) {
        try {
            const url = `https://graph.facebook.com/${this.apiVersion}/${pageId}`;
            const response = await axios_1.default.get(url, {
                params: {
                    fields: 'name',
                    access_token: accessToken
                }
            });
            return response.data.name;
        }
        catch (error) {
            console.error('Failed to get page name:', error);
            throw error;
        }
    }
    async sendMessage(recipientId, text, pageId, imageUrl, tag, replyToMid) {
        const accessToken = await this.getPageAccessToken(pageId);
        const sendingPageId = pageId || this.defaultPageId;
        if (!accessToken) {
            throw new Error('No access token available for sending message');
        }
        const url = `https://graph.facebook.com/${this.apiVersion}/${sendingPageId}/messages`;
        let payload = {
            recipient: {
                id: recipientId,
            },
            messaging_type: tag ? 'MESSAGE_TAG' : 'RESPONSE',
        };
        if (tag) {
            payload.tag = tag;
        }
        if (replyToMid) {
            payload.recipient.comment_id = undefined;
            payload.message = {
                text: text,
                reply_to: {
                    message_id: replyToMid
                }
            };
        }
        else if (imageUrl) {
            payload.message = {
                attachment: {
                    type: 'image',
                    payload: {
                        url: imageUrl,
                        is_reusable: true
                    }
                }
            };
        }
        else {
            payload.message = {
                text: text,
            };
        }
        try {
            console.log(`📤 Sending message to user ${recipientId} from page ${sendingPageId}`);
            const response = await axios_1.default.post(url, payload, {
                params: {
                    access_token: accessToken,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            console.log('✅ Message sent successfully');
            return response.data;
        }
        catch (error) {
            console.error('❌ Error sending message to Facebook:');
            if (error.response) {
                console.error('Status:', error.response.status);
                const fbError = error.response.data?.error;
                if (fbError) {
                    console.error(`❌ FB Error: ${fbError.message} (Type: ${fbError.type}, Code: ${fbError.code})`);
                }
                else {
                    console.error('Error details:', JSON.stringify(error.response.data, null, 2));
                }
                if (error.response.data?.error?.code === 10) {
                    console.error('\n⚠️ PERMISSION ERROR: (Code 10) User may not have messaged recently.');
                }
                else if (error.response.data?.error?.code === 200) {
                    console.error('\n⚠️ PERMISSION ERROR: (Code 200) Missing pages_messaging permission.');
                }
            }
            else {
                console.error('Error message:', error.message);
            }
            throw error;
        }
    }
    async getUserProfile(userId, pageId) {
        try {
            const accessToken = await this.getPageAccessToken(pageId);
            if (!accessToken) {
                console.warn('No Page Access Token available for fetching profile');
                return null;
            }
            console.log(`📥 Fetching profile for Facebook user ${userId} using ${this.apiVersion} (Page: ${pageId || 'Default'})`);
            const url = `https://graph.facebook.com/${this.apiVersion}/${userId}`;
            const response = await axios_1.default.get(url, {
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
        }
        catch (error) {
            console.error('❌ Error fetching user profile:', error.response?.data || error.message);
            return null;
        }
    }
};
exports.FacebookService = FacebookService;
exports.FacebookService = FacebookService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FacebookService);
//# sourceMappingURL=facebook.service.js.map