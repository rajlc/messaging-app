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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const messaging_gateway_1 = require("../socket/messaging.gateway");
const supabase_service_1 = require("../supabase/supabase.service");
const comments_service_1 = require("../comments/comments.service");
const facebook_service_1 = require("./facebook.service");
const settings_service_1 = require("../settings/settings.service");
const auto_reply_service_1 = require("../auto-reply/auto-reply.service");
const axios_1 = __importDefault(require("axios"));
let WebhooksController = class WebhooksController {
    configService;
    messagingGateway;
    commentsService;
    facebookService;
    settingsService;
    autoReplyService;
    constructor(configService, messagingGateway, commentsService, facebookService, settingsService, autoReplyService) {
        this.configService = configService;
        this.messagingGateway = messagingGateway;
        this.commentsService = commentsService;
        this.facebookService = facebookService;
        this.settingsService = settingsService;
        this.autoReplyService = autoReplyService;
    }
    verifyMetaWebhook(mode, token, challenge, res) {
        const verifyToken = this.configService.get('META_VERIFY_TOKEN');
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('META_WEBHOOK_VERIFIED');
            return res.status(common_1.HttpStatus.OK).send(challenge);
        }
        return res.status(common_1.HttpStatus.FORBIDDEN).send('Forbidden');
    }
    async handleMetaWebhook(body) {
        console.log('='.repeat(80));
        console.log('--- Incoming Meta Webhook ---');
        console.log('Received at:', new Date().toISOString());
        console.log(JSON.stringify(body, null, 2));
        if (body.object === 'page') {
            body.entry.forEach((entry) => {
                console.log(`\n📋 Processing entry for Page ID: ${entry.id}`);
                console.log(`   - Has messaging events: ${!!entry.messaging}`);
                console.log(`   - Has changes (feed) events: ${!!entry.changes}`);
                if (entry.messaging) {
                    console.log(`   ✉️ Found ${entry.messaging.length} messaging event(s)`);
                    entry.messaging.forEach((messagingEvent) => {
                        console.log('Processing messaging event:', JSON.stringify(messagingEvent, null, 2));
                        if (messagingEvent.message && !messagingEvent.message.is_echo) {
                            const senderId = messagingEvent.sender.id;
                            const pageId = messagingEvent.recipient.id;
                            let text = messagingEvent.message.text;
                            let imageUrl = undefined;
                            let fileType = 'text';
                            if (messagingEvent.message.attachments && messagingEvent.message.attachments.length > 0) {
                                const attachment = messagingEvent.message.attachments[0];
                                fileType = attachment.type;
                                if (attachment.payload && attachment.payload.url) {
                                    imageUrl = attachment.payload.url;
                                }
                                if (!text) {
                                    if (fileType === 'image')
                                        text = '📷 Sent an image';
                                    else if (fileType === 'sticker')
                                        text = '✨ Sent a sticker';
                                    else
                                        text = `📎 Sent an attachment: ${fileType}`;
                                }
                            }
                            if (!text)
                                text = '[Content not supported]';
                            console.log(`[FACEBOOK] Message from ${senderId} to Page ${pageId}: ${text}`);
                            (async () => {
                                try {
                                    const userProfile = await this.facebookService.getUserProfile(senderId, pageId);
                                    const customerName = userProfile
                                        ? (userProfile.name || `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim())
                                        : senderId;
                                    const conversation = await supabase_service_1.supabaseService.getOrCreateConversation({
                                        customerId: senderId,
                                        customerName: customerName,
                                        platform: 'facebook',
                                        pageId: pageId,
                                        customerProfilePic: userProfile?.profile_pic
                                    });
                                    let replyToMid = messagingEvent.message.reply_to?.mid;
                                    let replyToText = undefined;
                                    let replyToSender = undefined;
                                    if (replyToMid) {
                                        console.log(`🔗 Message is a reply to ${replyToMid}. Attempting to resolve context...`);
                                        const { data: originalMsg } = await supabase_service_1.supabaseService.getClient()
                                            .from('messages')
                                            .select('text, sender')
                                            .eq('message_id', replyToMid)
                                            .single();
                                        if (originalMsg) {
                                            replyToText = originalMsg.text;
                                            replyToSender = originalMsg.sender;
                                            console.log(`✅ Resolved reply context: "${replyToText?.substring(0, 20)}..." by ${replyToSender}`);
                                        }
                                    }
                                    const savedMessage = await supabase_service_1.supabaseService.saveMessage({
                                        conversationId: conversation.id,
                                        text: text,
                                        sender: 'customer',
                                        platform: 'facebook',
                                        messageId: messagingEvent.message.mid,
                                        pageId: pageId,
                                        imageUrl: imageUrl,
                                        fileType: fileType,
                                        replyToMid,
                                        replyToText,
                                        replyToSender
                                    });
                                    console.log('✅ Message saved to Supabase');
                                    try {
                                        const matchingRule = await this.autoReplyService.findMatchingRule(pageId, text);
                                        if (matchingRule) {
                                            console.log(`[AutoReply] Match found for "${text}": "${matchingRule.reply_text}"`);
                                            await this.facebookService.sendMessage(senderId, matchingRule.reply_text, pageId);
                                            await supabase_service_1.supabaseService.saveMessage({
                                                conversationId: conversation.id,
                                                text: matchingRule.reply_text,
                                                sender: 'agent',
                                                platform: 'facebook',
                                                pageId: pageId,
                                            });
                                            this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                text: matchingRule.reply_text,
                                                senderId: pageId,
                                                recipientId: senderId,
                                                pageId: pageId,
                                                conversationId: conversation.id,
                                                timestamp: Date.now(),
                                                isOwnMessage: true
                                            });
                                            console.log('[AutoReply] Reply sent and broadcasted. Skipping AI agent.');
                                            this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                ...savedMessage,
                                                isOwnMessage: false,
                                                conversationId: conversation.id,
                                            });
                                            return;
                                        }
                                    }
                                    catch (arError) {
                                        console.error('[AutoReply] Error finding/sending reply:', arError);
                                    }
                                    try {
                                        const isGlobalEnabled = await this.settingsService.getSetting('is_ai_global_enabled');
                                        if (isGlobalEnabled !== 'true') {
                                            console.log('[AI] Global AI is disabled. Skipping.');
                                            return;
                                        }
                                        const page = await supabase_service_1.supabaseService.getPageByFacebookId(pageId);
                                        if (!page || !page.is_ai_enabled) {
                                            console.log(`[AI] AI disabled for Page ${pageId}. Skipping.`);
                                            return;
                                        }
                                        console.log('[AI] preparing response...');
                                        const systemPrompt = page.custom_prompt || "You are a helpful assistant for this business. Reply strictly to the user's question. Be concise and professional.";
                                        const history = await supabase_service_1.supabaseService.getMessages(conversation.id, 5);
                                        const messages = [
                                            { role: 'system', content: systemPrompt },
                                            ...history.map(msg => ({
                                                role: msg.sender === 'customer' ? 'user' : 'assistant',
                                                content: msg.text
                                            })),
                                            { role: 'user', content: text }
                                        ];
                                        const aiProvider = await this.settingsService.getSetting('ai_provider') || 'openai';
                                        console.log(`[AI] Provider: ${aiProvider}`);
                                        let replyText = '';
                                        if (aiProvider === 'openai') {
                                            const apiKey = await this.settingsService.getSetting('openai_api_key');
                                            if (!apiKey) {
                                                console.warn('[AI] No OpenAI API Key found. Skipping.');
                                                return;
                                            }
                                            const aiResponse = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                                                model: 'gpt-4o',
                                                messages: messages,
                                                max_tokens: 300
                                            }, {
                                                headers: {
                                                    'Authorization': `Bearer ${apiKey}`,
                                                    'Content-Type': 'application/json'
                                                }
                                            });
                                            replyText = aiResponse.data.choices[0]?.message?.content;
                                        }
                                        else if (aiProvider === 'gemini') {
                                            const geminiKey = await this.settingsService.getSetting('gemini_api_key');
                                            if (!geminiKey) {
                                                console.warn('[AI] No Gemini API Key found. Skipping.');
                                                return;
                                            }
                                            const geminiContent = {
                                                contents: messages.map(msg => ({
                                                    role: msg.role === 'user' ? 'user' : 'model',
                                                    parts: [{ text: msg.content }]
                                                })).filter(msg => msg.role !== 'system'),
                                                systemInstruction: {
                                                    parts: [{ text: systemPrompt }]
                                                }
                                            };
                                            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
                                            const aiResponse = await axios_1.default.post(url, geminiContent);
                                            replyText = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;
                                        }
                                        if (replyText) {
                                            console.log(`[AI] Replying: "${replyText}"`);
                                            await this.facebookService.sendMessage(senderId, replyText, pageId);
                                            await supabase_service_1.supabaseService.saveMessage({
                                                conversationId: conversation.id,
                                                text: replyText,
                                                sender: 'agent',
                                                platform: 'facebook',
                                                pageId: pageId,
                                            });
                                            console.log('[AI] Broadcasting reply with recipientId:', senderId);
                                            this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                text: replyText,
                                                senderId: pageId,
                                                recipientId: senderId,
                                                pageId: pageId,
                                                conversationId: conversation.id,
                                                timestamp: Date.now(),
                                                isOwnMessage: true
                                            });
                                        }
                                    }
                                    catch (aiError) {
                                        console.error('[AI] Error generating/sending reply:', aiError.response?.data || aiError.message);
                                    }
                                    this.messagingGateway.broadcastIncomingMessage('facebook', {
                                        ...savedMessage,
                                        isOwnMessage: false,
                                        conversationId: conversation.id,
                                        customerName: customerName,
                                        customerProfilePic: userProfile?.profile_pic
                                    });
                                }
                                catch (error) {
                                    console.error('❌ Error saving message to Supabase:', error);
                                }
                            })();
                        }
                        else {
                            console.log('Skipping event: No message or is_echo');
                        }
                    });
                }
                if (entry.changes) {
                    console.log(`   🔄 Found ${entry.changes.length} change/feed event(s)`);
                    entry.changes.forEach((change) => {
                        console.log('Processing feed change event:', JSON.stringify(change, null, 2));
                        console.log(`      - Field: ${change.field}`);
                        console.log(`      - Item: ${change.value?.item}`);
                        console.log(`      - Verb: ${change.value?.verb}`);
                        if (change.field === 'feed' && change.value) {
                            const value = change.value;
                            if (value.item === 'comment' && value.verb === 'add') {
                                const commentId = value.comment_id;
                                const postId = value.post_id;
                                const senderId = value.from?.id;
                                const senderName = value.from?.name;
                                const commentText = value.message;
                                const pageId = entry.id;
                                console.log(`[FACEBOOK] New comment from ${senderName} (${senderId}) on post ${postId}: ${commentText}`);
                                (async () => {
                                    try {
                                        const userProfile = await this.facebookService.getUserProfile(senderId, pageId);
                                        const comment = await this.commentsService.createComment({
                                            comment_id: commentId,
                                            post_id: postId,
                                            customer_id: senderId,
                                            customer_name: senderName || userProfile?.name || senderId,
                                            comment_text: commentText,
                                            platform: 'facebook',
                                            page_id: pageId,
                                            customer_profile_pic: userProfile?.profile_pic
                                        });
                                        console.log('✅ Comment saved to database');
                                        this.messagingGateway.server.emit('new-comment', {
                                            comment,
                                            customerId: senderId
                                        });
                                    }
                                    catch (error) {
                                        console.error('❌ Error saving comment:', error);
                                    }
                                })();
                            }
                            if (value.item === 'comment' && value.verb === 'edited') {
                                console.log('[FACEBOOK] Comment edited:', value.comment_id);
                            }
                            if (value.item === 'comment' && value.verb === 'remove') {
                                console.log('[FACEBOOK] Comment removed:', value.comment_id);
                            }
                        }
                    });
                }
                else {
                    console.log('No messaging events or changes found in entry');
                }
            });
        }
        else {
            console.log(`Received non-page event: ${body.object}`);
        }
        console.log('='.repeat(80));
        console.log('✅ Webhook processing complete\n');
        return 'OK';
    }
    async handleTikTokWebhook(body) {
        console.log('Incoming TikTok Webhook:', JSON.stringify(body, null, 2));
        return 'OK';
    }
    async debugProfile(id) {
        const profile = await this.facebookService.getUserProfile(id);
        return {
            id,
            profile,
            token_configured: true
        };
    }
};
exports.WebhooksController = WebhooksController;
__decorate([
    (0, common_1.Get)('meta'),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], WebhooksController.prototype, "verifyMetaWebhook", null);
__decorate([
    (0, common_1.Post)('meta'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleMetaWebhook", null);
__decorate([
    (0, common_1.Post)('tiktok'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleTikTokWebhook", null);
__decorate([
    (0, common_1.Get)('debug-profile/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "debugProfile", null);
exports.WebhooksController = WebhooksController = __decorate([
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        messaging_gateway_1.MessagingGateway,
        comments_service_1.CommentsService,
        facebook_service_1.FacebookService,
        settings_service_1.SettingsService,
        auto_reply_service_1.AutoReplyService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map