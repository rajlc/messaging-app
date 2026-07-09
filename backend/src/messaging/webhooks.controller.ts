import { Controller, Get, Post, Body, Query, Param, Req, Res, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MessagingGateway } from '../socket/messaging.gateway';
import { supabaseService } from '../supabase/supabase.service';
import { CommentsService } from '../comments/comments.service';
import { FacebookService } from './facebook.service';
import { SettingsService } from '../settings/settings.service';
import { AutoReplyService } from '../auto-reply/auto-reply.service';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';

@Controller(['webhooks', 'api/webhooks'])
export class WebhooksController {

    /**
     * IN-MEMORY REPLY CACHE — the single source of truth for duplicate prevention.
     * Key:   `profileId:customerId:normalizedMessageText`
     * Value: timestamp (ms) when a reply was last sent for this key.
     * TTL:   5 minutes (300,000 ms)
     *
     * Why static? So it lives for the entire server lifetime and is shared
     * across all concurrent requests (no Supabase replication lag).
     * The lock is SET before we send the reply, so concurrent duplicate calls
     * that arrive within milliseconds are blocked immediately.
     */
    private static readonly replyCache = new Map<string, number>();
    private static readonly REPLY_CACHE_TTL_MS = 10 * 1000; // 10 seconds for duplicate prevention

    /** Build the dedup cache key for a marketplace reply */
    private static buildReplyCacheKey(profileId: string, customerId: string, messageText: string): string {
        return `${profileId}:${customerId}:${messageText.trim().toLowerCase()}`;
    }

    /** Purge expired entries (called opportunistically) */
    private static purgeExpiredCacheEntries(): void {
        const now = Date.now();
        for (const [key, ts] of WebhooksController.replyCache.entries()) {
            if (now - ts > WebhooksController.REPLY_CACHE_TTL_MS) {
                WebhooksController.replyCache.delete(key);
            }
        }
    }

    constructor(
        private configService: ConfigService,
        private messagingGateway: MessagingGateway,
        private commentsService: CommentsService,
        private facebookService: FacebookService,
        private settingsService: SettingsService,
        private autoReplyService: AutoReplyService,
        private jwtService: JwtService,
    ) { }

    // Meta (Facebook & Instagram) Webhook verification
    @Get('meta')
    verifyMetaWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response
    ) {
        const verifyToken = this.configService.get<string>('META_VERIFY_TOKEN');
        if (mode === 'subscribe' && token === verifyToken) {
            console.log('META_WEBHOOK_VERIFIED');
            return res.status(HttpStatus.OK).send(challenge);
        }
        return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
    }

    // Meta Webhook receiver
    @Post('meta')
    async handleMetaWebhook(@Body() body: any) {
        console.log(`[${new Date().toISOString()}] Meta Webhook received: object=${body?.object}`);

        if (body?.object === 'page') {
            body.entry.forEach((entry: any) => {
                if (entry.messaging) {
                    entry.messaging.forEach((messagingEvent: any) => {
                        const pageId = entry.id; // The ID of the Page receiving the webhook
                        const isFromPage = messagingEvent.sender.id === pageId;
                        const isEcho = messagingEvent.message?.is_echo;
                        const customerId = isFromPage ? messagingEvent.recipient.id : messagingEvent.sender.id;
                        
                        console.log(`[FACEBOOK WEBHOOK] Page ID: ${pageId} | Customer: ${customerId} | Echo: ${!!isEcho}`);

                        // Process messaging events
                        if (messagingEvent.message) {
                            // Determine who is the customer and who is the agent
                            const senderRole = isFromPage ? 'agent' : 'customer';
                            const messageId = messagingEvent.message.mid;

                            // Handling for messages with attachments (e.g. images, stickers)
                            let text = messagingEvent.message.text;
                            let imageUrl: string | undefined = undefined;
                            let fileType = 'text';

                            if (messagingEvent.message.attachments && messagingEvent.message.attachments.length > 0) {
                                const attachment = messagingEvent.message.attachments[0];
                                fileType = attachment.type;
                                if (attachment.payload && attachment.payload.url) {
                                    imageUrl = attachment.payload.url;
                                }

                                // Set descriptive text for the conversation list snippet
                                if (!text) {
                                    if (fileType === 'image') text = '📷 Sent an image';
                                    else if (fileType === 'sticker') text = '✨ Sent a sticker';
                                    else text = `📎 Sent an attachment: ${fileType}`;
                                }
                            }

                            // Fallback if still empty
                            if (!text) text = '[Content not supported]';

                            console.log(`[FACEBOOK] ${isFromPage ? (isEcho ? 'Echo (Agent Reply)' : 'Agent Message') : 'Customer Message'} | User: ${customerId} | Text: ${text}`);

                            // Save to Supabase (async, don't block)
                            (async () => {
                                try {
                                    // Fetch user profile from Facebook (always fetch the customer's profile)
                                    const userProfile = await this.facebookService.getUserProfile(customerId, pageId);
                                    const customerName = userProfile
                                        ? (userProfile.name || `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim())
                                        : customerId;

                                    // Get or create conversation
                                    const conversation = await supabaseService.getOrCreateConversation({
                                        customerId: customerId,
                                        customerName: customerName,
                                        platform: 'facebook',
                                        pageId: pageId,
                                        customerProfilePic: userProfile?.profile_pic
                                    });

                                    // Save message to database
                                    const savedMessage = await supabaseService.saveMessage({
                                        conversationId: conversation.id,
                                        text: text,
                                        sender: senderRole,
                                        platform: 'facebook',
                                        messageId: messageId,
                                        pageId: pageId,
                                        imageUrl: imageUrl,
                                        fileType: fileType
                                    });

                                    // If this is a regular message from a customer, handle AutoReply and AI
                                    if (!isFromPage) {
                                        // --- AUTO-REPLY LOGIC ---
                                        try {
                                            const matchingRule = await this.autoReplyService.findMatchingRule(pageId, text);
                                            if (matchingRule) {
                                                console.log(`[AutoReply] Match found for "${text}": "${matchingRule.reply_text}"`);
                                                
                                                // 1. Send to Facebook
                                                await this.facebookService.sendMessage(customerId, matchingRule.reply_text, pageId);

                                                // 2. Save Agent Reply to DB
                                                await supabaseService.saveMessage({
                                                    conversationId: conversation.id,
                                                    text: matchingRule.reply_text,
                                                    sender: 'agent',
                                                    platform: 'facebook',
                                                    pageId: pageId,
                                                });

                                                // 3. Broadcast to frontend
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

                                                // Broadcast original message to frontend before returning
                                                this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                    ...savedMessage,
                                                    isOwnMessage: false,
                                                    senderId: customerId,
                                                    recipientId: pageId,
                                                    conversationId: conversation.id,
                                                    customerName: customerName,
                                                    customerProfilePic: userProfile?.profile_pic
                                                });
                                                return;
                                            }
                                        } catch (arError) {
                                            console.error('[AutoReply] Error finding/sending reply:', arError);
                                        }

                                        // --- AI AGENT LOGIC ---
                                        try {
                                            const isGlobalEnabled = await this.settingsService.getSetting('is_ai_global_enabled');
                                            if (isGlobalEnabled === 'true') {
                                                const page = await supabaseService.getPageByFacebookId(pageId);
                                                if (page && page.is_ai_enabled) {
                                                    // --- CUT-OFF MESSAGES CHECK ---
                                                    if (page.cutoff_messages) {
                                                        const cutoffList = page.cutoff_messages.split(',').map(m => m.trim().toLowerCase());
                                                        if (cutoffList.includes(text.trim().toLowerCase())) {
                                                            console.log(`[AI] Cut-off message detected: "${text}". Skipping AI reply.`);
                                                            
                                                            // Broadcast original message before returning
                                                            this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                                ...savedMessage,
                                                                isOwnMessage: false,
                                                                senderId: customerId,
                                                                recipientId: pageId,
                                                                conversationId: conversation.id,
                                                                customerName: customerName,
                                                                customerProfilePic: userProfile?.profile_pic
                                                            });
                                                            return;
                                                        }
                                                    }

                                                    console.log('[AI] processing...');
                                                    const history = await supabaseService.getLastMessages(conversation.id, 5);
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
                                                            const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                                                                model: 'gpt-4o-mini',
                                                                messages: messages,
                                                                max_tokens: 300
                                                            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                                                            replyText = aiResponse.data.choices[0]?.message?.content;
                                                        }
                                                    } else if (aiProvider === 'gemini') {
                                                        const geminiKey = await this.settingsService.getSetting('gemini_api_key');
                                                        if (geminiKey) {
                                                            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
                                                            const aiResponse = await axios.post(url, {
                                                                contents: messages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })).filter(msg => msg.role !== 'system'),
                                                                systemInstruction: { parts: [{ text: systemPrompt }] }
                                                            });
                                                            replyText = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;
                                                        }
                                                    }

                                                    if (replyText) {
                                                        await this.facebookService.sendMessage(customerId, replyText, pageId);
                                                        await supabaseService.saveMessage({ conversationId: conversation.id, text: replyText, sender: 'agent', platform: 'facebook', pageId: pageId });
                                                        this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                            text: replyText, senderId: pageId, recipientId: customerId, pageId: pageId, conversationId: conversation.id, timestamp: Date.now(), isOwnMessage: true, customerName: customerName, customerProfilePic: userProfile?.profile_pic
                                                        });
                                                    }
                                                }
                                            }
                                        } catch (aiError) {
                                            console.error('[AI] Error:', aiError.message);
                                        }
                                    }

                                    // Broadcast the original message (or echo) to frontend
                                    this.messagingGateway.broadcastIncomingMessage('facebook', {
                                        ...savedMessage,
                                        isOwnMessage: isEcho, // If it's an echo, it's our own message (agent)
                                        senderId: isEcho ? pageId : customerId,
                                        recipientId: isEcho ? customerId : pageId,
                                        conversationId: conversation.id,
                                        customerName: customerName,
                                        customerProfilePic: userProfile?.profile_pic
                                    });
                                } catch (error) {
                                    console.error('❌ Error saving message to Supabase:', error);
                                }
                            })();
                        } else {
                            console.log('Skipping event: No message content');
                        }
                    });
                }

                // Process feed events (comments)
                if (entry.changes) {
                    console.log(`   🔄 Found ${entry.changes.length} change/feed event(s)`);
                    entry.changes.forEach((change: any) => {
                        console.log('Processing feed change event:', JSON.stringify(change, null, 2));
                        console.log(`      - Field: ${change.field}`);
                        console.log(`      - Item: ${change.value?.item}`);
                        console.log(`      - Verb: ${change.value?.verb}`);

                        if (change.field === 'feed' && change.value) {
                            const value = change.value;

                            // Handle comment_add event
                            if (value.item === 'comment' && value.verb === 'add') {
                                const commentId = value.comment_id;
                                const postId = value.post_id;
                                const senderId = value.from?.id;
                                const senderName = value.from?.name;
                                const commentText = value.message;
                                const pageId = entry.id;

                                console.log(`[FACEBOOK] New comment from ${senderName} (${senderId}) on post ${postId}: ${commentText}`);

                                 // Save comment to database (async)
                                 (async () => {
                                     try {
                                         // Fetch user profile from Facebook
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

                                        // Emit WebSocket event for real-time update
                                        this.messagingGateway.server.emit('new-comment', {
                                            comment,
                                            customerId: senderId
                                        });
                                    } catch (error) {
                                        console.error('❌ Error saving comment:', error);
                                    }
                                })();
                            }

                            // Handle comment edited
                            if (value.item === 'comment' && value.verb === 'edited') {
                                console.log('[FACEBOOK] Comment edited:', value.comment_id);
                            }

                            // Handle comment removed
                            if (value.item === 'comment' && value.verb === 'remove') {
                                console.log('[FACEBOOK] Comment removed:', value.comment_id);
                            }
                        }
                    });
                } else {
                    console.log('No messaging events or changes found in entry');
                }
            });
        } else {
            console.log(`Received non-page event: ${body.object}`);
        }

        console.log('='.repeat(80));
        console.log('✅ Webhook processing complete\n');
        return 'OK';
    }

    // TikTok Webhook receiver
    @Post('tiktok')
    async handleTikTokWebhook(@Body() body: any) {
        console.log('Incoming TikTok Webhook:', JSON.stringify(body, null, 2));
        // TODO: Process TikTok message and broadcast
        return 'OK';
    }

    // Marketplace Webhook receiver (called by Chrome Extension)
    @Post('marketplace')
    async handleMarketplaceWebhook(@Req() req: any, @Body() body: any, @Res() res: Response) {
        console.log('--- Incoming Marketplace Webhook ---');
        console.log(JSON.stringify(body, null, 2));

        // 1. Authenticate Request
        const authHeader = req.headers['authorization'];
        let isAuthenticated = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (token === process.env.INVENTORY_APP_API_KEY) {
                isAuthenticated = true;
            } else {
                try {
                    const secret = this.configService.get<string>('JWT_SECRET') || 'fallback_secret';
                    this.jwtService.verify(token, { secret });
                    isAuthenticated = true;
                } catch (e) {
                    console.warn('JWT verification failed for marketplace webhook:', e.message);
                }
            }
        }

        if (!isAuthenticated) {
            console.warn('Unauthorized attempt to POST to marketplace webhook');
            return res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
        }

        const {
            profileId,
            profileName,
            customerId,
            customerName,
            messageText,
            messageTexts,
            productName,
            productPrice,
        } = body;

        if (!profileId || !customerId || !messageText) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'profileId, customerId, and messageText are required' });
        }

        try {
            // 2. Auto-register Marketplace Profile/Page if it doesn't exist
            let page = await supabaseService.getPageByFacebookId(profileId);
            if (!page) {
                console.log(`Auto-registering marketplace profile: ${profileName || profileId}`);
                page = await supabaseService.createPage({
                    platform: 'facebook_marketplace',
                    pageName: profileName || `Marketplace Account (${profileId})`,
                    pageId: profileId,
                    accessToken: 'none'
                });
            }

            // 3. Get or Create Conversation
            const conversation = await supabaseService.getOrCreateConversation({
                customerId: customerId,
                customerName: customerName,
                platform: 'facebook_marketplace',
                pageId: profileId,
                pageName: page.page_name,
                productName: productName,
                productPrice: productPrice,
            });

            // 4. IN-MEMORY DUPLICATE GUARD — checked BEFORE saving to DB.
            // This is the primary protection against the extension firing the webhook
            // 2-3 times for the same customer message within milliseconds.
            // It uses a static Map so no DB query is needed and there is zero replication lag.
            const replyCacheKey = WebhooksController.buildReplyCacheKey(profileId, customerId, messageText);
            const lastRepliedAt = WebhooksController.replyCache.get(replyCacheKey) || 0;
            const nowMs = Date.now();
            if ((nowMs - lastRepliedAt) < WebhooksController.REPLY_CACHE_TTL_MS) {
                console.log(`[Marketplace Guard] ⚡ IN-MEMORY HIT — already replied to "${messageText.substring(0, 50)}" for customer ${customerId} ${Math.round((nowMs - lastRepliedAt) / 1000)}s ago. Skipping.`);
                return res.status(HttpStatus.OK).json({ replyText: null, skipped: true, reason: 'in_memory_cache_hit' });
            }

            // Lock the cache key immediately to prevent duplicate saves from concurrent processing of the same message
            WebhooksController.replyCache.set(replyCacheKey, nowMs);

            // Purge stale entries occasionally to avoid memory growth
            if (Math.random() < 0.05) WebhooksController.purgeExpiredCacheEntries();

            // Check if the last message in this conversation is already the exact same customer message
            try {
                const lastMessages = await supabaseService.getLastMessages(conversation.id, 2);
                if (lastMessages && lastMessages.length > 0) {
                    const lastMsg = lastMessages[0];
                    
                    // Case 1: Latest message in DB is already this customer message
                    if (lastMsg.sender === 'customer' && lastMsg.text === messageText) {
                        console.log(`[Marketplace Guard] 🛡️ Duplicate customer message detected (latest in DB) for conversation ${conversation.id}. Skipping duplicate.`);
                        return res.status(HttpStatus.OK).json({ replyText: null, skipped: true, reason: 'duplicate_message_db' });
                    }
                    
                    // Case 2: Latest message in DB is an agent reply saved very recently (within 45s), and the message before it is this customer message
                    if (lastMsg.sender === 'agent' && lastMessages.length > 1) {
                        const secondLastMsg = lastMessages[1];
                        const ageMs = Date.now() - new Date(lastMsg.created_at).getTime();
                        if (secondLastMsg.sender === 'customer' && secondLastMsg.text === messageText && ageMs < 45000) {
                            console.log(`[Marketplace Guard] 🛡️ Duplicate customer message detected (recently replied in DB, age ${Math.round(ageMs/1000)}s) for conversation ${conversation.id}. Skipping duplicate.`);
                            return res.status(HttpStatus.OK).json({ replyText: null, skipped: true, reason: 'duplicate_recent_reply_db' });
                        }
                    }
                }
            } catch (dbErr: any) {
                console.error('[Marketplace Guard] Error checking for duplicate message:', dbErr.message);
            }

            // 5. Save Customer Message to DB (always, so it appears in chat history)
            const savedMessage = await supabaseService.saveMessage({
                conversationId: conversation.id,
                text: messageText,
                sender: 'customer',
                platform: 'facebook_marketplace',
                pageId: profileId,
            });

            // 6. Broadcast Customer Message to Frontend (always)
            this.messagingGateway.broadcastIncomingMessage('facebook_marketplace', {
                ...savedMessage,
                isOwnMessage: false,
                conversationId: conversation.id,
                customerName: customerName,
                productName: conversation.product_name,
                productPrice: conversation.product_price,
            });

            // 7. Check templates (Auto-Reply Rules)
            const textsArray: string[] = (Array.isArray(messageTexts) && messageTexts.length > 0)
                ? messageTexts
                : [messageText];

            const matchedReplies: string[] = [];
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
                let combinedReply = matchedReplies.join('\n\n');

                // Dynamic templating replacement for Product Name and Price
                const replName = productName || conversation.product_name || '';
                const replPrice = productPrice || conversation.product_price || '';

                combinedReply = combinedReply
                    .replace(/\{\{\s*Product\s*Name\s*\}\}/gi, replName)
                    .replace(/\{\{\s*Price\s*\}\}/gi, replPrice);

                console.log(`[Marketplace Template] Match found for ${JSON.stringify(textsArray)}: "${combinedReply}"`);

                // LOCK the cache key RIGHT NOW before any async operation.
                // This ensures concurrent duplicate requests see the lock immediately.
                WebhooksController.replyCache.set(replyCacheKey, Date.now());
                console.log(`[Marketplace Guard] 🔒 Cache key locked for customer ${customerId}: "${messageText.substring(0, 50)}"`);

                // Save Agent Reply
                await supabaseService.saveMessage({
                    conversationId: conversation.id,
                    text: combinedReply,
                    sender: 'agent',
                    platform: 'facebook_marketplace',
                    pageId: profileId,
                });

                // Broadcast Agent Reply
                this.messagingGateway.broadcastIncomingMessage('facebook_marketplace', {
                    text: combinedReply,
                    senderId: profileId,
                    recipientId: customerId,
                    pageId: profileId,
                    conversationId: conversation.id,
                    timestamp: Date.now(),
                    isOwnMessage: true,
                    customerName: customerName,
                    productName: conversation.product_name,
                    productPrice: conversation.product_price,
                });

                return res.status(HttpStatus.OK).json({ replyText: combinedReply });
            }

            // 7. Check Cut-off Messages
            let cutoffMessages = page?.cutoff_messages;
            if (!cutoffMessages && profileId !== 'facebook_marketplace') {
                try {
                    const genericPage = await supabaseService.getPageByFacebookId('facebook_marketplace');
                    cutoffMessages = genericPage?.cutoff_messages;
                } catch (err) {
                    console.error('Failed to load fallback cutoff messages:', err.message);
                }
            }

            if (cutoffMessages) {
                const cutoffList = cutoffMessages.split(',').map((m: string) => m.trim().toLowerCase());
                if (cutoffList.includes(messageText.trim().toLowerCase())) {
                    console.log(`[Marketplace AI] Cutoff matched: "${messageText}". Stopping AI response.`);
                    return res.status(HttpStatus.OK).json({ replyText: null });
                }
            }

            // 8. Check AI Setting & Respond
            const isAiMarketplaceEnabled = await this.settingsService.getSetting('is_ai_marketplace_enabled');
            
            let isAiEnabled = page?.is_ai_enabled;
            let customPrompt = page?.custom_prompt;

            if (profileId !== 'facebook_marketplace') {
                try {
                    const genericPage = await supabaseService.getPageByFacebookId('facebook_marketplace');
                    if (genericPage) {
                        if (isAiEnabled === undefined || isAiEnabled === null || !page) {
                            isAiEnabled = genericPage.is_ai_enabled;
                        }
                        if (!customPrompt) {
                            customPrompt = genericPage.custom_prompt;
                        }
                    }
                } catch (err) {
                    console.error('Failed to load fallback page settings:', err.message);
                }
            }

            if (isAiMarketplaceEnabled === 'true' && isAiEnabled) {
                console.log(`[Marketplace AI] Processing message for profile ${profileId}`);

                // Get message history
                const history = await supabaseService.getLastMessages(conversation.id, 5);

                // Get customer's orders to feed into AI context
                let ordersContext = '';
                try {
                    const { data: customerOrders } = await supabaseService.getClient()
                        .from('orders')
                        .select('order_number, order_status, total_amount, courier_provider, tracking_number, created_at')
                        .eq('customer_id', customerId)
                        .order('created_at', { ascending: false });
                    
                    if (customerOrders && customerOrders.length > 0) {
                        ordersContext = "\n\nCustomer's Order History:\n" + customerOrders.map(o => 
                            `- Order #${o.order_number}: Status=${o.order_status || 'New'}, Courier=${o.courier_provider || 'N/A'}, Tracking=${o.tracking_number || 'N/A'}, Amount=Rs ${o.total_amount}, Created=${o.created_at?.split('T')[0] || 'N/A'}`
                        ).join('\n') + '\n';
                    }
                } catch (orderErr) {
                    console.error('Failed to load customer orders for AI context:', orderErr.message);
                }

                // Extract keywords to search in catalog
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
                    .map((w: string) => w.trim())
                    .filter((w: string) => w.length >= 2 && !stopWords.has(w));

                const listingKeywords = conversation.product_name
                    ? conversation.product_name
                        .toLowerCase()
                        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
                        .split(/\s+/)
                        .map((w: string) => w.trim())
                        .filter((w: string) => w.length >= 2 && !stopWords.has(w))
                    : [];

                const allKeywords = Array.from(new Set([...cleanWords, ...listingKeywords]));

                let catalogContext = '';
                if (allKeywords.length > 0) {
                    try {
                        const orQuery = allKeywords.map(word => `product_name.ilike.%${word}%`).join(',');
                        const { data: matchedCatalog, error: catalogError } = await supabaseService.getSupabaseClient()
                            .from('marketplace_products')
                            .select('product_name, price')
                            .or(orQuery)
                            .limit(10);

                        if (catalogError) {
                            if (catalogError.code === '42P01') {
                                console.warn('[Supabase] marketplace_products table does not exist. Skipping catalog query.');
                            } else {
                                console.error('Failed to query marketplace products catalog:', catalogError.message);
                            }
                        } else if (matchedCatalog && matchedCatalog.length > 0) {
                            catalogContext = "\n\nAvailable Products from Catalog:\n" +
                                matchedCatalog.map(p => `- ${p.product_name}: Rs ${p.price}`).join('\n') + '\n' +
                                `If the customer asks about any of these items, refer to the exact prices and names listed above. Avoid suggesting other products unless relevant.`;
                        }
                    } catch (dbErr: any) {
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
                        const aiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
                            model: 'gpt-4o-mini',
                            messages: messages,
                            max_tokens: 300
                        }, { headers: { 'Authorization': `Bearer ${apiKey}` } });
                        replyText = aiResponse.data.choices[0]?.message?.content;
                    }
                } else if (aiProvider === 'gemini') {
                    const geminiKey = await this.settingsService.getSetting('gemini_api_key');
                    if (geminiKey) {
                        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`;
                        const aiResponse = await axios.post(url, {
                            contents: messages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })).filter(msg => msg.role !== 'system'),
                            systemInstruction: { parts: [{ text: systemPrompt }] }
                        });
                        replyText = aiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;
                    }
                }

                if (replyText) {
                    // Save Agent Reply
                    await supabaseService.saveMessage({
                        conversationId: conversation.id,
                        text: replyText,
                        sender: 'agent',
                        platform: 'facebook_marketplace',
                        pageId: profileId,
                    });

                    // Broadcast Agent Reply
                    this.messagingGateway.broadcastIncomingMessage('facebook_marketplace', {
                        text: replyText,
                        senderId: profileId,
                        recipientId: customerId,
                        pageId: profileId,
                        conversationId: conversation.id,
                        timestamp: Date.now(),
                        isOwnMessage: true,
                        customerName: customerName,
                        productName: conversation.product_name,
                        productPrice: conversation.product_price,
                    });

                    return res.status(HttpStatus.OK).json({ replyText });
                }
            }

            return res.status(HttpStatus.OK).json({ replyText: null });
        } catch (error: any) {
            console.error('Error in handleMarketplaceWebhook:', error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: error.message });
        }
    }

    @Get('debug-profile/:id')
    async debugProfile(@Param('id') id: string) {
        // Use default token for debug
        const profile = await this.facebookService.getUserProfile(id);
        return {
            id,
            profile,
            token_configured: true
        };
    }
}
