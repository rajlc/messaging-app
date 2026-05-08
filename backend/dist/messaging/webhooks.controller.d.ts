import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MessagingGateway } from '../socket/messaging.gateway';
import { CommentsService } from '../comments/comments.service';
import { FacebookService } from './facebook.service';
import { SettingsService } from '../settings/settings.service';
import { AutoReplyService } from '../auto-reply/auto-reply.service';
export declare class WebhooksController {
    private configService;
    private messagingGateway;
    private commentsService;
    private facebookService;
    private settingsService;
    private autoReplyService;
    constructor(configService: ConfigService, messagingGateway: MessagingGateway, commentsService: CommentsService, facebookService: FacebookService, settingsService: SettingsService, autoReplyService: AutoReplyService);
    verifyMetaWebhook(mode: string, token: string, challenge: string, res: Response): Response<any, Record<string, any>>;
    handleMetaWebhook(body: any): Promise<string>;
    handleTikTokWebhook(body: any): Promise<string>;
    debugProfile(id: string): Promise<{
        id: string;
        profile: any;
        token_configured: boolean;
    }>;
}
