import { Controller, Get, Post, Body, Query, Param, Req, Res, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MessagingGateway } from '../socket/messaging.gateway';
import { supabaseService } from '../supabase/supabase.service';
import { CommentsService } from '../comments/comments.service';
import { FacebookService } from './facebook.service';
import { SettingsService } from '../settings/settings.service';
import { AutoReplyService } from '../auto-reply/auto-reply.service';
import axios from 'axios';

@Controller('webhooks')
export class WebhooksController {
    constructor(
        private configService: ConfigService,
        private messagingGateway: MessagingGateway,
        private commentsService: CommentsService,
        private facebookService: FacebookService,
        private settingsService: SettingsService,
        private autoReplyService: AutoReplyService,
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
        console.log('='.repeat(80));
        console.log('--- Incoming Meta Webhook ---');
        console.log('Received at:', new Date().toISOString());
        console.log(JSON.stringify(body, null, 2));

        if (body.object === 'page') {
            body.entry.forEach((entry: any) => {
                console.log(`\n📋 Processing entry for Page ID: ${entry.id}`);
                console.log(`   - Has messaging events: ${!!entry.messaging}`);
                console.log(`   - Has changes (feed) events: ${!!entry.changes}`);

                if (entry.messaging) {
                    console.log(`   ✉️ Found ${entry.messaging.length} messaging event(s)`);
                    entry.messaging.forEach((messagingEvent: any) => {
                        console.log('Processing messaging event:', JSON.stringify(messagingEvent, null, 2));
                        // Process both regular messages and echoes (messages sent from other devices)
                        if (messagingEvent.message) {
                            const isEcho = messagingEvent.message.is_echo;
                            const messageId = messagingEvent.message.mid;
                            
                            // For echoes, sender is the Page and recipient is the Customer
                            // For normal messages, sender is the Customer and recipient is the Page
                            const senderId = isEcho ? messagingEvent.recipient.id : messagingEvent.sender.id;
                            const pageId = isEcho ? messagingEvent.sender.id : messagingEvent.recipient.id;
                            const senderRole = isEcho ? 'agent' : 'customer';

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

                            console.log(`[FACEBOOK] ${isEcho ? 'Echo (Agent Reply)' : 'Message'} from ${senderId} to Page ${pageId}: ${text}`);

                            // Save to Supabase (async, don't block)
                            (async () => {
                                try {
                                    // Fetch user profile from Facebook
                                    const userProfile = await this.facebookService.getUserProfile(senderId, pageId);
                                    const customerName = userProfile
                                        ? (userProfile.name || `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim())
                                        : senderId;

                                    // Get or create conversation
                                    const conversation = await supabaseService.getOrCreateConversation({
                                        customerId: senderId,
                                        customerName: customerName,
                                        platform: 'facebook',
                                        pageId: pageId,
                                        lastMessage: text,
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

                                    // If this is a regular message (not an echo), handle AutoReply and AI
                                    if (!isEcho) {
                                        // --- AUTO-REPLY LOGIC ---
                                        try {
                                            const matchingRule = await this.settingsService.findMatchingAutoReply(text);
                                            if (matchingRule) {
                                                console.log(`[AutoReply] Match found for "${text}": "${matchingRule.reply_text}"`);
                                                
                                                // 1. Send to Facebook
                                                await this.facebookService.sendMessage(senderId, matchingRule.reply_text, pageId);

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
                                                    recipientId: senderId,
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
                                                    console.log('[AI] processing...');
                                                    const history = await supabaseService.getMessages(conversation.id, 5);
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
                                                                model: 'gpt-4o',
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
                                                        await this.facebookService.sendMessage(senderId, replyText, pageId);
                                                        await supabaseService.saveMessage({ conversationId: conversation.id, text: replyText, sender: 'agent', platform: 'facebook', pageId: pageId });
                                                        this.messagingGateway.broadcastIncomingMessage('facebook', {
                                                            text: replyText, senderId: pageId, recipientId: senderId, pageId: pageId, conversationId: conversation.id, timestamp: Date.now(), isOwnMessage: true, customerName: customerName, customerProfilePic: userProfile?.profile_pic
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
