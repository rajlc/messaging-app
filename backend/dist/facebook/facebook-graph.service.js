"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var FacebookGraphService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FacebookGraphService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let FacebookGraphService = FacebookGraphService_1 = class FacebookGraphService {
    logger = new common_1.Logger(FacebookGraphService_1.name);
    graphApiUrl = 'https://graph.facebook.com/v18.0';
    async replyToComment(commentId, message, accessToken) {
        try {
            const response = await axios_1.default.post(`${this.graphApiUrl}/${commentId}/comments`, {
                message: message
            }, {
                params: {
                    access_token: accessToken
                }
            });
            this.logger.log(`Replied to comment ${commentId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to reply to comment ${commentId}:`, error.response?.data || error.message);
            throw error;
        }
    }
    async hideComment(commentId, accessToken) {
        try {
            const response = await axios_1.default.post(`${this.graphApiUrl}/${commentId}`, {
                is_hidden: true
            }, {
                params: {
                    access_token: accessToken
                }
            });
            this.logger.log(`Hid comment ${commentId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to hide comment ${commentId}:`, error.response?.data || error.message);
            throw error;
        }
    }
    async sendPrivateMessage(userId, message, accessToken, pageId) {
        try {
            const response = await axios_1.default.post(`${this.graphApiUrl}/${pageId}/messages`, {
                recipient: { id: userId },
                message: { text: message }
            }, {
                params: {
                    access_token: accessToken
                }
            });
            this.logger.log(`Sent private message to user ${userId}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to send private message to ${userId}:`, error.response?.data || error.message);
            throw error;
        }
    }
    async getCommentDetails(commentId, accessToken) {
        try {
            const response = await axios_1.default.get(`${this.graphApiUrl}/${commentId}`, {
                params: {
                    access_token: accessToken,
                    fields: 'id,message,from,created_time,post,permalink_url'
                }
            });
            return response.data;
        }
        catch (error) {
            this.logger.error(`Failed to get comment details ${commentId}:`, error.response?.data || error.message);
            throw error;
        }
    }
};
exports.FacebookGraphService = FacebookGraphService;
exports.FacebookGraphService = FacebookGraphService = FacebookGraphService_1 = __decorate([
    (0, common_1.Injectable)()
], FacebookGraphService);
//# sourceMappingURL=facebook-graph.service.js.map