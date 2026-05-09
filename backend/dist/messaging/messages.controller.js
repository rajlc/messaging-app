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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesController = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const facebook_service_1 = require("./facebook.service");
const messaging_gateway_1 = require("../socket/messaging.gateway");
let MessagesController = class MessagesController {
    facebookService;
    messagingGateway;
    constructor(facebookService, messagingGateway) {
        this.facebookService = facebookService;
        this.messagingGateway = messagingGateway;
    }
    async saveMessage(messageData) {
        try {
            const conversation = await supabase_service_1.supabaseService.getOrCreateConversation({
                customerId: messageData.customerId,
                customerName: messageData.customerId,
                platform: messageData.platform,
                pageId: messageData.pageId,
            });
            const message = await supabase_service_1.supabaseService.saveMessage({
                conversationId: conversation.id,
                text: messageData.text,
                sender: messageData.sender,
                platform: messageData.platform,
                pageId: messageData.pageId,
            });
            return {
                success: true,
                message: message,
            };
        }
        catch (error) {
            console.error('Failed to save message:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    async sendMessage(body) {
        try {
            console.log('📤 Send message request:', body);
            let actualRecipientId = body.recipientId;
            let conversationId = body.recipientId;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(body.recipientId)) {
                console.log(`🔍 Resolving UUID ${body.recipientId} to PSID...`);
                const { data: conv } = await supabase_service_1.supabaseService.getClient()
                    .from('conversations')
                    .select('customer_id, id')
                    .eq('id', body.recipientId)
                    .single();
                if (conv && conv.customer_id) {
                    actualRecipientId = conv.customer_id;
                    conversationId = conv.id;
                    console.log(`✅ Resolved to PSID: ${actualRecipientId}`);
                }
                else {
                    console.warn(`⚠️ Could not resolve UUID ${body.recipientId} to PSID. Using as is.`);
                }
            }
            else {
                const { data: conv } = await supabase_service_1.supabaseService.getClient()
                    .from('conversations')
                    .select('id')
                    .eq('customer_id', body.recipientId)
                    .single();
                if (conv) {
                    conversationId = conv.id;
                }
            }
            const imageIds = Array.isArray(body.imageUrl) ? body.imageUrl : (body.imageUrl ? [body.imageUrl] : []);
            let lastFbMessageId = undefined;
            if (body.platform === 'facebook') {
                if (imageIds.length > 0) {
                    if (body.text) {
                        const res = await this.facebookService.sendMessage(actualRecipientId, body.text, body.pageId, undefined, body.tag, body.replyToMid);
                        lastFbMessageId = res?.message_id;
                    }
                    for (const url of imageIds) {
                        const res = await this.facebookService.sendMessage(actualRecipientId, '', body.pageId, url, body.tag, body.replyToMid);
                        lastFbMessageId = res?.message_id;
                    }
                }
                else {
                    const res = await this.facebookService.sendMessage(actualRecipientId, body.text, body.pageId, undefined, body.tag, body.replyToMid);
                    lastFbMessageId = res?.message_id;
                }
            }
            const conversation = await supabase_service_1.supabaseService.getOrCreateConversation({
                customerId: actualRecipientId,
                customerName: actualRecipientId,
                platform: body.platform,
                pageId: body.pageId,
            });
            const savedMessage = await supabase_service_1.supabaseService.saveMessage({
                conversationId: conversation.id,
                text: imageIds.length > 0 ? (body.text || `📷 Sent ${imageIds.length} image(s)`) : body.text,
                sender: 'agent',
                platform: body.platform,
                messageId: lastFbMessageId,
                pageId: body.pageId,
                imageUrl: imageIds.length > 0 ? imageIds[0] : undefined,
                fileType: imageIds.length > 0 ? 'image' : 'text',
                replyToMid: body.replyToMid,
                replyToText: body.replyToText,
                replyToSender: body.replyToSender,
                metadata: { source: 'webapp' }
            });
            this.messagingGateway.broadcastIncomingMessage(body.platform, {
                ...savedMessage,
                isOwnMessage: true,
                senderId: body.pageId || 'agent',
                recipientId: actualRecipientId,
                conversationId: conversation.id,
                tempId: body.tempId,
            });
            return {
                success: true,
                message: 'Message sent successfully',
                data: savedMessage
            };
        }
        catch (error) {
            console.error('❌ Failed to send message:', error);
            return {
                success: false,
                error: error.message || 'Failed to send message'
            };
        }
    }
};
exports.MessagesController = MessagesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "saveMessage", null);
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MessagesController.prototype, "sendMessage", null);
exports.MessagesController = MessagesController = __decorate([
    (0, common_1.Controller)('api/messages'),
    __metadata("design:paramtypes", [facebook_service_1.FacebookService,
        messaging_gateway_1.MessagingGateway])
], MessagesController);
//# sourceMappingURL=messages.controller.js.map