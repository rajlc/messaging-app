import { Controller, Get, Param, Query, UseGuards, Request, Post } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('api/conversations')
export class ConversationsController {
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
}
