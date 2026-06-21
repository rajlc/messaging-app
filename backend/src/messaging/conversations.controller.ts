import { Controller, Get, Param, Query, UseGuards, Request, Post, Body } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import { AuthGuard } from '@nestjs/passport';
import { MessagingGateway } from '../socket/messaging.gateway';

@Controller('api/conversations')
export class ConversationsController {
    constructor(private messagingGateway: MessagingGateway) {}

    /**
     * Get all conversations
     */
    @UseGuards(AuthGuard('jwt'))
    @Get()
    async getConversations(
        @Request() req,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('customer_id') customerId?: string,
    ) {
        const limitNum = limit ? parseInt(limit) : 1000;
        const offsetNum = offset ? parseInt(offset) : 0;

        console.log('GET /api/conversations - User:', req.user ? `${req.user.username} (${req.user.role})` : 'No User');
        const conversations = await supabaseService.getConversations(limitNum, offsetNum, customerId, req.user);
        return conversations;
    }

    /**
     * Get messages for a specific conversation
     */
    @Get(':id/messages')
    async getMessages(
        @Param('id') id: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        const limitNum = limit ? parseInt(limit) : 10000;
        const offsetNum = offset ? parseInt(offset) : 0;

        const messages = await supabaseService.getMessages(id, limitNum, offsetNum);
        return messages;
    }

    /**
     * Mark a conversation as read
     */
    @UseGuards(AuthGuard('jwt'))
    @Post(':id/read')
    async markAsRead(@Param('id') id: string) {
        await supabaseService.markConversationAsRead(id);
        return { success: true };
    }

    /**
     * Sync/Update customer name for a conversation
     */
    @UseGuards(AuthGuard('jwt'))
    @Post('sync-name')
    async syncCustomerName(
        @Body() body: { customerId: string; customerName: string },
    ) {
        const { customerId, customerName } = body;
        if (!customerId || !customerName || customerName === 'Customer') {
            return { success: false, error: 'Invalid customer name or ID' };
        }

        try {
            const { data: conv, error: fetchError } = await supabaseService.getClient()
                .from('conversations')
                .select('id, customer_name')
                .eq('customer_id', customerId)
                .single();

            if (fetchError || !conv) {
                return { success: false, error: 'Conversation not found' };
            }

            // Prevent downgrading a real customer name
            if (conv.customer_name && conv.customer_name !== 'Customer' && conv.customer_name !== customerId) {
                return { success: true, message: 'Name already set, skipped update' };
            }

            const { error: updateError } = await supabaseService.getClient()
                .from('conversations')
                .update({ customer_name: customerName })
                .eq('id', conv.id);

            if (updateError) {
                console.error(`[Supabase] Failed to update customer name for ${customerId}:`, updateError.message);
                return { success: false, error: updateError.message };
            }

            console.log(`[Supabase] Synced customer name: ${customerId} -> "${customerName}"`);

            // Broadcast the update to frontend clients
            this.messagingGateway.server.emit('conversationNameUpdated', {
                conversationId: conv.id,
                customerId: customerId,
                customerName: customerName,
            });

            return { success: true };
        } catch (err: any) {
            console.error(`[Supabase] Exception in syncCustomerName:`, err.message);
            return { success: false, error: err.message };
        }
    }
}
