import { Controller, Get, Post, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { FacebookGraphService } from '../facebook/facebook-graph.service';
import { ConfigService } from '@nestjs/config';

@Controller('api/comments')
export class CommentsController {
    constructor(
        private readonly commentsService: CommentsService,
        private readonly facebookGraphService: FacebookGraphService,
        private readonly configService: ConfigService
    ) { }

    @Get()
    async getAllComments() {
        return this.commentsService.getAllComments();
    }

    @Get(':id')
    async getComment(@Param('id') id: string) {
        const comment = await this.commentsService.getCommentById(id);
        if (!comment) {
            throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
        }
        return comment;
    }

    @Get('customer/:customerId')
    async getCommentsByCustomer(@Param('customerId') customerId: string) {
        return this.commentsService.getCommentsByCustomer(customerId);
    }

    @Post(':id/reply')
    async replyToComment(
        @Param('id') id: string,
        @Body() body: { message: string }
    ) {
        const comment = await this.commentsService.getCommentById(id);
        if (!comment) {
            throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
        }

        // Get access token from backend config
        const accessToken = this.configService.get<string>('META_PAGE_ACCESS_TOKEN');
        if (!accessToken) {
            throw new HttpException('Page access token not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Reply to comment on Facebook
        await this.facebookGraphService.replyToComment(
            comment.comment_id,
            body.message,
            accessToken
        );

        // Mark as replied
        await this.commentsService.markAsReplied(id);

        return { success: true, message: 'Reply posted successfully' };
    }

    @Post(':id/reply-private')
    async replyPrivately(
        @Param('id') id: string,
        @Body() body: { message: string }
    ) {
        const comment = await this.commentsService.getCommentById(id);
        if (!comment) {
            throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
        }

        // Get access token from backend config
        const accessToken = this.configService.get<string>('META_PAGE_ACCESS_TOKEN');
        if (!accessToken) {
            throw new HttpException('Page access token not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Get page ID from comment
        const pageId = comment.page_id;
        if (!pageId) {
            throw new HttpException('Page ID not found in comment', HttpStatus.BAD_REQUEST);
        }

        // Send private message to commenter
        await this.facebookGraphService.sendPrivateMessage(
            comment.customer_id,
            body.message,
            accessToken,
            pageId
        );

        // Mark as replied
        await this.commentsService.markAsReplied(id);

        return { success: true, message: 'Private message sent successfully' };
    }

    @Post(':id/hide')
    async hideComment(
        @Param('id') id: string
    ) {
        const comment = await this.commentsService.getCommentById(id);
        if (!comment) {
            throw new HttpException('Comment not found', HttpStatus.NOT_FOUND);
        }

        // Get access token from backend config
        const accessToken = this.configService.get<string>('META_PAGE_ACCESS_TOKEN');
        if (!accessToken) {
            throw new HttpException('Page access token not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Hide comment on Facebook
        await this.facebookGraphService.hideComment(
            comment.comment_id,
            accessToken
        );

        // Mark as hidden
        await this.commentsService.markAsHidden(id);

        return { success: true, message: 'Comment hidden successfully' };
    }

    @Delete(':id')
    async deleteComment(@Param('id') id: string) {
        await this.commentsService.deleteComment(id);
        return { success: true, message: 'Comment deleted successfully' };
    }
}
