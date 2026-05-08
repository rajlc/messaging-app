import { CommentsService } from './comments.service';
import { FacebookGraphService } from '../facebook/facebook-graph.service';
import { ConfigService } from '@nestjs/config';
export declare class CommentsController {
    private readonly commentsService;
    private readonly facebookGraphService;
    private readonly configService;
    constructor(commentsService: CommentsService, facebookGraphService: FacebookGraphService, configService: ConfigService);
    getAllComments(): Promise<import("./comments.service").PostComment[]>;
    getComment(id: string): Promise<import("./comments.service").PostComment>;
    getCommentsByCustomer(customerId: string): Promise<import("./comments.service").PostComment[]>;
    replyToComment(id: string, body: {
        message: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    replyPrivately(id: string, body: {
        message: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    hideComment(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteComment(id: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
