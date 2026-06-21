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
var WebhooksController_1;
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
const jwt_1 = require("@nestjs/jwt");
const axios_1 = __importDefault(require("axios"));
let WebhooksController = class WebhooksController {
    static { WebhooksController_1 = this; }
    configService;
    messagingGateway;
    commentsService;
    facebookService;
    settingsService;
    autoReplyService;
    jwtService;
    static replyCache = new Map();
    static REPLY_CACHE_TTL_MS = 10 * 1000;
    static buildReplyCacheKey(profileId, customerId, messageText) {
        return `${profileId}:${customerId}:${messageText.trim().toLowerCase()}`;
    }
    static purgeExpiredCacheEntries() {
        const now = Date.now();
        for (const [key, ts] of WebhooksController_1.replyCache.entries()) {
            if (now - ts > WebhooksController_1.REPLY_CACHE_TTL_MS) {
                WebhooksController_1.replyCache.delete(key);
            }
        }
    }
    constructor(configService, messagingGateway, commentsService, facebookService, settingsService, autoReplyService, jwtService) {
        this.configService = configService;
        this.messagingGateway = messagingGateway;
        this.commentsService = commentsService;
        this.facebookService = facebookService;
        this.settingsService = settingsService;
        this.autoReplyService = autoReplyService;
        this.jwtService = jwtService;
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
                        if (messagingEvent.message) {
                            const pageId = entry.id;
                            const isFromPage = messagingEvent.sender.id === pageId;
                            const isEcho = messagingEvent.message.is_echo;
                            const customerId = isFromPage ? messagingEvent.recipient.id : messagingEvent.sender.id;
                            const senderRole = isFromPage ? 'agent' : 'customer';
                            const messageId = messagingEvent.message.mid;
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
                            console.log(`[FACEBOOK] ${isFromPage ? (isEcho ? 'Echo (Agent Reply)' : 'Agent Message') : 'Customer Message'} | User: ${customerId} | Text: ${text}`);
                            (async () => {
                                try {
                                    const userProfile = await this.facebookService.getUserProfile(customerId, pageId);
                                    const customerName = userProfile
                                        ? (userProfile.name || `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim())
                                        : customerId;
                                    const conversation = await supabase_service_1.supabaseService.getOrCreateConversation({
                                        customerId: customerId,
                                        customerName: customerName,
                                        platform: 'facebook',
                                        pageId: pageId,
                                        customerProfilePic: userProfile?.profile_pic
                                    });
                                    const savedMessage = await supabase_service_1.supabaseService.saveMessage({
                                        conversationId: conversation.id,
                                        text: text,
                                        sender: senderRole,
                                        platform: 'facebook',
                                        messageId: messageId,
                                        pageId: pageId,
                                        imageUrl: imageUrl,
                                        fileType: fileType
                                    });
                                    if (!isFromPage) {
                                        try {
                                            const matchingRule = await this.autoReplyService.findMatchingRule(pageId, text);
                                            if (matchingRule) {
                                                console.log(`[AutoReply] Match found for "${text}": "${matchingRule.reply_text}"`);
                                                await this.facebookService.sendMessage(customerId, matchingRule.reply_text, pageId);
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
                                                    recipientId: customerId,
                                                    pageId: pageId,
                                                    conversationId: conversation.id,
                                                    timestamp: Date.now(),
                                                    isOwnMessage: true,
                                                    customerName: customerName,
                                                    customerProfilePic: userProfile?.profile_pic
                                                });
                                                console.log('[AutoReply] Reply sent and broadcasted. Skipping AI agent.');
                                                this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                    ...savedMessage,
                                                    isOwnMessage: false,
                                                    conversationId: conversation.id,
                                                    customerName: customerName,
                                                    customerProfilePic: userProfile?.profile_pic
                                                });
                                                return;
                                            }
                                        }
                                        catch (arError) {
                                            console.error('[AutoReply] Error finding/sending reply:', arError);
                                        }
                                        try {
                                            const isGlobalEnabled = await this.settingsService.getSetting('is_ai_global_enabled');
                                            if (isGlobalEnabled === 'true') {
                                                const page = await supabase_service_1.supabaseService.getPageByFacebookId(pageId);
                                                if (page && page.is_ai_enabled) {
                                                    if (page.cutoff_messages) {
                                                        const cutoffList = page.cutoff_messages.split(',').map(m => m.trim().toLowerCase());
                                                        if (cutoffList.includes(text.trim().toLowerCase())) {
                                                            console.log(`[AI] Cut-off message detected: "${text}". Skipping AI reply.`);
                                                            this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                                ...savedMessage,
                                                                isOwnMessage: false,
                                                                conversationId: conversation.id,
                                                                customerName: customerName,
                                                                customerProfilePic: userProfile?.profile_pic
                                                            });
                                                            return;
                                                        }
                                                    }
                                                    console.log('[AI] processing...');
                                                    const history = await supabase_service_1.supabaseService.getLastMessages(conversation.id, 5);
                                                    const systemPrompt = page.custom_prompt || "You are a helpful assistant.";
                                                    const messages = [
                                                        { role: 'system', content: systemPrompt },
                                                        ...history.map(msg => ({ role: msg.sender === 'customer' ? 'user' : 'assistant', content: msg.text })),
                                                        { role: 'user', content: text }
                                                    ];
                                                    const aiProvider = await this.settingsService.getSetting('ai_provider') || 'openai';
                                                    let replyText = '';
                                                    if (aiProvider === 'openai') {
                                                        const apiKey = await this.settingsService.getSetting('openai_api_key');
                                                        if (apiKey) {
                                                            const aiResponse = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                                                                model: 'gpt-4o-mini',
                                                                messages: messages,
                                                                max_tokens: 300
                                                            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                                                            replyText = aiResponse.data.choices[0]?.message?.content;
                                                        }
                                                    }
                                                    else if (aiProvider === 'gemini') {
                                                        const geminiKey = await this.settingsService.getSetting('gemini_api_key');
                                                        if (geminiKey) {
                                                            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
                                                            const aiResponse = await axios_1.default.post(url, {
                                                                contents: messages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })).filter(msg => msg.role !== 'system'),
                                                                systemInstruction: { parts: [{ text: systemPrompt }] }
                                                            });
                                                            replyText = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;
                                                        }
                                                    }
                                                    if (replyText) {
                                                        await this.facebookService.sendMessage(customerId, replyText, pageId);
                                                        await supabase_service_1.supabaseService.saveMessage({ conversationId: conversation.id, text: replyText, sender: 'agent', platform: 'facebook', pageId: pageId });
                                                        this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                            text: replyText, senderId: pageId, recipientId: customerId, pageId: pageId, conversationId: conversation.id, timestamp: Date.now(), isOwnMessage: true, customerName: customerName, customerProfilePic: userProfile?.profile_pic
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                        catch (aiError) {
                                            console.error('[AI] Error:', aiError.message);
                                        }
                                    }
                                    this.messagingGateway.broadcastIncomingMessage('facebook', {
                                        ...savedMessage,
                                        isOwnMessage: isEcho,
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
                            console.log('Skipping event: No message content');
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
    async handleMarketplaceWebhook(req, body, res) {
        console.log('--- Incoming Marketplace Webhook ---');
        console.log(JSON.stringify(body, null, 2));
        const authHeader = req.headers['authorization'];
        let isAuthenticated = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token === process.env.INVENTORY_APP_API_KEY) {
                isAuthenticated = true;
            }
            else {
                try {
                    const secret = this.configService.get('JWT_SECRET') || 'fallback_secret';
                    this.jwtService.verify(token, { secret });
                    isAuthenticated = true;
                }
                catch (e) {
                    console.warn('JWT verification failed for marketplace webhook:', e.message);
                }
            }
        }
        if (!isAuthenticated) {
            console.warn('Unauthorized attempt to POST to marketplace webhook');
            return res.status(common_1.HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
        }
        const { profileId, profileName, customerId, customerName, messageText, messageTexts, productName, productPrice, } = body;
        if (!profileId || !customerId || !messageText) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: 'profileId, customerId, and messageText are required' });
        }
        try {
            let page = await supabase_service_1.supabaseService.getPageByFacebookId(profileId);
            if (!page) {
                console.log(`Auto-registering marketplace profile: ${profileName || profileId}`);
                page = await supabase_service_1.supabaseService.createPage({
                    platform: 'facebook_marketplace',
                    pageName: profileName || `Marketplace Account (${profileId})`,
                    pageId: profileId,
                    accessToken: 'none'
                });
            }
            const conversation = await supabase_service_1.supabaseService.getOrCreateConversation({
                customerId: customerId,
                customerName: customerName,
                platform: 'facebook_marketplace',
                pageId: profileId,
                pageName: page.page_name,
                productName: productName,
                productPrice: productPrice,
            });
            const replyCacheKey = WebhooksController_1.buildReplyCacheKey(profileId, customerId, messageText);
            const lastRepliedAt = WebhooksController_1.replyCache.get(replyCacheKey) || 0;
            const nowMs = Date.now();
            if ((nowMs - lastRepliedAt) < WebhooksController_1.REPLY_CACHE_TTL_MS) {
                console.log(`[Marketplace Guard] ⚡ IN-MEMORY HIT — already replied to "${messageText.substring(0, 50)}" for customer ${customerId} ${Math.round((nowMs - lastRepliedAt) / 1000)}s ago. Skipping.`);
                return res.status(common_1.HttpStatus.OK).json({ replyText: null, skipped: true, reason: 'in_memory_cache_hit' });
            }
            if (Math.random() < 0.05)
                WebhooksController_1.purgeExpiredCacheEntries();
            const savedMessage = await supabase_service_1.supabaseService.saveMessage({
                conversationId: conversation.id,
                text: messageText,
                sender: 'customer',
                platform: 'facebook_marketplace',
                pageId: profileId,
            });
            this.messagingGateway.broadcastIncomingMessage('facebook_marketplace', {
                ...savedMessage,
                isOwnMessage: false,
                conversationId: conversation.id,
                customerName: customerName,
            });
            const textsArray = (Array.isArray(messageTexts) && messageTexts.length > 0)
                ? messageTexts
                : [messageText];
            const matchedReplies = [];
            for (const text of textsArray) {
                const rule = await this.autoReplyService.findMatchingRule(profileId, text);
                if (rule && rule.reply_text) {
                    const cleanReply = rule.reply_text.trim();
                    if (!matchedReplies.includes(cleanReply)) {
                        matchedReplies.push(cleanReply);
                    }
                }
            }
            if (matchedReplies.length > 0) {
                const combinedReply = matchedReplies.join('\n\n');
                console.log(`[Marketplace Template] Match found for ${JSON.stringify(textsArray)}: "${combinedReply}"`);
                WebhooksController_1.replyCache.set(replyCacheKey, Date.now());
                console.log(`[Marketplace Guard] 🔒 Cache key locked for customer ${customerId}: "${messageText.substring(0, 50)}"`);
                await supabase_service_1.supabaseService.saveMessage({
                    conversationId: conversation.id,
                    text: combinedReply,
                    sender: 'agent',
                    platform: 'facebook_marketplace',
                    pageId: profileId,
                });
                this.messagingGateway.broadcastIncomingMessage('facebook_marketplace', {
                    text: combinedReply,
                    senderId: profileId,
                    recipientId: customerId,
                    pageId: profileId,
                    conversationId: conversation.id,
                    timestamp: Date.now(),
                    isOwnMessage: true,
                    customerName: customerName,
                });
                return res.status(common_1.HttpStatus.OK).json({ replyText: combinedReply });
            }
            let cutoffMessages = page?.cutoff_messages;
            if (!cutoffMessages && profileId !== 'facebook_marketplace') {
                try {
                    const genericPage = await supabase_service_1.supabaseService.getPageByFacebookId('facebook_marketplace');
                    cutoffMessages = genericPage?.cutoff_messages;
                }
                catch (err) {
                    console.error('Failed to load fallback cutoff messages:', err.message);
                }
            }
            if (cutoffMessages) {
                const cutoffList = cutoffMessages.split(',').map((m) => m.trim().toLowerCase());
                if (cutoffList.includes(messageText.trim().toLowerCase())) {
                    console.log(`[Marketplace AI] Cutoff matched: "${messageText}". Stopping AI response.`);
                    return res.status(common_1.HttpStatus.OK).json({ replyText: null });
                }
            }
            const isAiMarketplaceEnabled = await this.settingsService.getSetting('is_ai_marketplace_enabled');
            let isAiEnabled = page?.is_ai_enabled;
            let customPrompt = page?.custom_prompt;
            if (profileId !== 'facebook_marketplace') {
                try {
                    const genericPage = await supabase_service_1.supabaseService.getPageByFacebookId('facebook_marketplace');
                    if (genericPage) {
                        if (isAiEnabled === undefined || isAiEnabled === null || !page) {
                            isAiEnabled = genericPage.is_ai_enabled;
                        }
                        if (!customPrompt) {
                            customPrompt = genericPage.custom_prompt;
                        }
                    }
                }
                catch (err) {
                    console.error('Failed to load fallback page settings:', err.message);
                }
            }
            if (isAiMarketplaceEnabled === 'true' && isAiEnabled) {
                console.log(`[Marketplace AI] Processing message for profile ${profileId}`);
                const history = await supabase_service_1.supabaseService.getLastMessages(conversation.id, 5);
                let ordersContext = '';
                try {
                    const { data: customerOrders } = await supabase_service_1.supabaseService.getClient()
                        .from('orders')
                        .select('order_number, order_status, total_amount, courier_provider, tracking_number, created_at')
                        .eq('customer_id', customerId)
                        .order('created_at', { ascending: false });
                    if (customerOrders && customerOrders.length > 0) {
                        ordersContext = "\n\nCustomer's Order History:\n" + customerOrders.map(o => `- Order #${o.order_number}: Status=${o.order_status || 'New'}, Courier=${o.courier_provider || 'N/A'}, Tracking=${o.tracking_number || 'N/A'}, Amount=Rs ${o.total_amount}, Created=${o.created_at?.split('T')[0] || 'N/A'}`).join('\n') + '\n';
                    }
                }
                catch (orderErr) {
                    console.error('Failed to load customer orders for AI context:', orderErr.message);
                }
                const stopWords = new Set([
                    'xa', 'ko', 'available', 'kati', 'price', 'dinu', 'vane', 'hai', 'cha', 'chaa', 'ho', 'yo', 'hunxa', 'la', 'le', 'ma', 'ra',
                    'please', 'pls', 'hi', 'hello', 'is', 'the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'with', 'about',
                    'saman', 'product', 'detail', 'details', 'price', 'kati', 'koti', 'rate', 'cost', 'charge', 'delivery',
                    'want', 'buy', 'need', 'interested', 'available', 'stock', 'available_products', 'available_product', 'kati ho', 'katicha', 'nepal'
                ]);
                const cleanWords = messageText
                    .toLowerCase()
                    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
                    .split(/\s+/)
                    .map((w) => w.trim())
                    .filter((w) => w.length >= 2 && !stopWords.has(w));
                const listingKeywords = conversation.product_name
                    ? conversation.product_name
                        .toLowerCase()
                        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
                        .split(/\s+/)
                        .map((w) => w.trim())
                        .filter((w) => w.length >= 2 && !stopWords.has(w))
                    : [];
                const allKeywords = Array.from(new Set([...cleanWords, ...listingKeywords]));
                let catalogContext = '';
                if (allKeywords.length > 0) {
                    try {
                        const orQuery = allKeywords.map(word => `product_name.ilike.%${word}%`).join(',');
                        const { data: matchedCatalog, error: catalogError } = await supabase_service_1.supabaseService.getSupabaseClient()
                            .from('marketplace_products')
                            .select('product_name, price')
                            .or(orQuery)
                            .limit(10);
                        if (catalogError) {
                            if (catalogError.code === '42P01') {
                                console.warn('[Supabase] marketplace_products table does not exist. Skipping catalog query.');
                            }
                            else {
                                console.error('Failed to query marketplace products catalog:', catalogError.message);
                            }
                        }
                        else if (matchedCatalog && matchedCatalog.length > 0) {
                            catalogContext = "\n\nAvailable Products from Catalog:\n" +
                                matchedCatalog.map(p => `- ${p.product_name}: Rs ${p.price}`).join('\n') + '\n' +
                                `If the customer asks about any of these items, refer to the exact prices and names listed above. Avoid suggesting other products unless relevant.`;
                        }
                    }
                    catch (dbErr) {
                        console.error('Error querying marketplace catalog:', dbErr.message);
                    }
                }
                let productContext = '';
                if (conversation.product_name) {
                    productContext = `\nActive Listing Context: Product Name = "${conversation.product_name}"`;
                    if (conversation.product_price) {
                        productContext += `, Price = "${conversation.product_price}"`;
                    }
                    productContext += '\n';
                }
                const systemPrompt = (customPrompt || 'You are a helpful Facebook Marketplace seller assistant.') + productContext + catalogContext + ordersContext;
                const messages = [
                    { role: 'system', content: systemPrompt },
                    ...history.map(msg => ({ role: msg.sender === 'customer' ? 'user' : 'assistant', content: msg.text })),
                    { role: 'user', content: messageText }
                ];
                const aiProvider = await this.settingsService.getSetting('ai_provider') || 'openai';
                let replyText = '';
                if (aiProvider === 'openai') {
                    const apiKey = await this.settingsService.getSetting('openai_api_key');
                    if (apiKey) {
                        const aiResponse = await axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                            model: 'gpt-4o-mini',
                            messages: messages,
                            max_tokens: 300
                        }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                        replyText = aiResponse.data.choices[0]?.message?.content;
                    }
                }
                else if (aiProvider === 'gemini') {
                    const geminiKey = await this.settingsService.getSetting('gemini_api_key');
                    if (geminiKey) {
                        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
                        const aiResponse = await axios_1.default.post(url, {
                            contents: messages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })).filter(msg => msg.role !== 'system'),
                            systemInstruction: { parts: [{ text: systemPrompt }] }
                        });
                        replyText = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;
                    }
                }
                if (replyText) {
                    await supabase_service_1.supabaseService.saveMessage({
                        conversationId: conversation.id,
                        text: replyText,
                        sender: 'agent',
                        platform: 'facebook_marketplace',
                        pageId: profileId,
                    });
                    this.messagingGateway.broadcastIncomingMessage('facebook_marketplace', {
                        text: replyText,
                        senderId: profileId,
                        recipientId: customerId,
                        pageId: profileId,
                        conversationId: conversation.id,
                        timestamp: Date.now(),
                        isOwnMessage: true,
                        customerName: customerName,
                    });
                    return res.status(common_1.HttpStatus.OK).json({ replyText });
                }
            }
            return res.status(common_1.HttpStatus.OK).json({ replyText: null });
        }
        catch (error) {
            console.error('Error in handleMarketplaceWebhook:', error);
            return res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
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
    (0, common_1.Post)('marketplace'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "handleMarketplaceWebhook", null);
__decorate([
    (0, common_1.Get)('debug-profile/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "debugProfile", null);
exports.WebhooksController = WebhooksController = WebhooksController_1 = __decorate([
    (0, common_1.Controller)(['webhooks', 'api/webhooks']),
    __metadata("design:paramtypes", [config_1.ConfigService,
        messaging_gateway_1.MessagingGateway,
        comments_service_1.CommentsService,
        facebook_service_1.FacebookService,
        settings_service_1.SettingsService,
        auto_reply_service_1.AutoReplyService,
        jwt_1.JwtService])
], WebhooksController);
//# sourceMappingURL=webhooks.controller.js.map