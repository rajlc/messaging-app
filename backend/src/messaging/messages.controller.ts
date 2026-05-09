import { Controller, Post, Body } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import { FacebookService } from './facebook.service';
import { MessagingGateway } from '../socket/messaging.gateway';

@Controller('api/messages')
export class MessagesController {
    constructor(
        private facebookService: FacebookService,
        private messagingGateway: MessagingGateway
    ) { }

    @Post()
    async saveMessage(@Body() messageData: {
        customerId: string;
        text: string;
        sender: 'customer' | 'agent';
        platform: string;
        pageId?: string;
    }) {
        try {
            // Get or create conversation
            const conversation = await supabaseService.getOrCreateConversation({
                customerId: messageData.customerId,
                customerName: messageData.customerId, // Will be updated when we fetch the name
                platform: messageData.platform,
                pageId: messageData.pageId,
            });

            // Save message
            const message = await supabaseService.saveMessage({
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
        } catch (error: any) {
            console.error('Failed to save message:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    @Post('send')
    async sendMessage(@Body() body: {
        recipientId: string;
        text: string;
        platform: string;
        pageId?: string;
        imageUrl?: string | string[];
        fileType?: string;
        tag?: string;  // e.g. 'POST_PURCHASE_UPDATE' to bypass 24hr window
        replyToMid?: string;
        replyToText?: string;
        replyToSender?: string;
        tempId?: string;
    }) {
        try {
            console.log('📤 Send message request:', body);

            let actualRecipientId = body.recipientId;
            let conversationId = body.recipientId;

            // 1. Resolve PSID if recipientId is a UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(body.recipientId)) {
                console.log(`🔍 Resolving UUID ${body.recipientId} to PSID...`);
                const { data: conv } = await supabaseService.getClient()
                    .from('conversations')
                    .select('customer_id, id')
                    .eq('id', body.recipientId)
                    .single();

                if (conv && conv.customer_id) {
                    actualRecipientId = conv.customer_id;
                    conversationId = conv.id;
                    console.log(`✅ Resolved to PSID: ${actualRecipientId}`);
                } else {
                    console.warn(`⚠️ Could not resolve UUID ${body.recipientId} to PSID. Using as is.`);
                }
            } else {
                // If it's already a PSID, we need to find the conversation UUID for DB saving
                const { data: conv } = await supabaseService.getClient()
                    .from('conversations')
                    .select('id')
                    .eq('customer_id', body.recipientId)
                    .single();
                if (conv) {
                    conversationId = conv.id;
                }
            }

            // 2. Send message via platform (Facebook)
            const imageIds = Array.isArray(body.imageUrl) ? body.imageUrl : (body.imageUrl ? [body.imageUrl] : []);
            let lastFbMessageId: string | undefined = undefined;

            if (body.platform === 'facebook') {
                if (imageIds.length > 0) {
                    // Send text first if provided
                    if (body.text) {
                        const res = await this.facebookService.sendMessage(actualRecipientId, body.text, body.pageId, undefined, body.tag, body.replyToMid);
                        lastFbMessageId = res?.message_id;
                    }
                    // Then send images
                    for (const url of imageIds) {
                        const res = await this.facebookService.sendMessage(actualRecipientId, '', body.pageId, url, body.tag, body.replyToMid);
                        lastFbMessageId = res?.message_id;
                    }
                } else {
                    const res = await this.facebookService.sendMessage(actualRecipientId, body.text, body.pageId, undefined, body.tag, body.replyToMid);
                    lastFbMessageId = res?.message_id;
                }
            }

            // 3. Save message to database
            const conversation = await supabaseService.getOrCreateConversation({
                customerId: actualRecipientId,
                customerName: actualRecipientId,
                platform: body.platform,
                pageId: body.pageId,
            });

            // Note: For multi-image, we save a single "sent images" entry or multiple. 
            // To keep it simple, we save one entry representing the action.
            const savedMessage = await supabaseService.saveMessage({
                conversationId: conversation.id,
                text: imageIds.length > 0 ? (body.text || `📷 Sent ${imageIds.length} image(s)`) : body.text,
                sender: 'agent',
                platform: body.platform,
                messageId: lastFbMessageId, // CORRECTED TO messageId (camelCase)
                pageId: body.pageId,
                imageUrl: imageIds.length > 0 ? imageIds[0] : undefined, // Store first image URL as primary
                fileType: imageIds.length > 0 ? 'image' : 'text',
                replyToMid: body.replyToMid,
                replyToText: body.replyToText,
                replyToSender: body.replyToSender,
                metadata: { source: 'webapp' }
            });

            // 4. Broadcast to frontend via Socket.io
            this.messagingGateway.broadcastIncomingMessage(body.platform, {
                ...savedMessage,
                isOwnMessage: true,
                senderId: body.pageId || 'agent', // Page ID is the sender for outgoing
                recipientId: actualRecipientId,
                conversationId: conversation.id,
                tempId: body.tempId, // Include tempId for frontend deduplication
            });

            return {
                success: true,
                message: 'Message sent successfully',
                data: savedMessage
            };
        } catch (error: any) {
            console.error('❌ Failed to send message:', error);
            return {
                success: false,
                error: error.message || 'Failed to send message'
            };
        }
    }
}
