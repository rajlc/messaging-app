import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MessagingGateway } from '../socket/messaging.gateway';
import { CommentsService } from '../comments/comments.service';
import { FacebookService } from './facebook.service';
import { SettingsService } from '../settings/settings.service';
import { AutoReplyService } from '../auto-reply/auto-reply.service';
import { JwtService } from '@nestjs/jwt';
export declare class WebhooksController {
    private configService;
    private messagingGateway;
    private commentsService;
    private facebookService;
    private settingsService;
    private autoReplyService;
    private jwtService;
    private static readonly replyCache;
    private static readonly REPLY_CACHE_TTL_MS;
    private static buildReplyCacheKey;
    private static purgeExpiredCacheEntries;
    constructor(configService: ConfigService, messagingGateway: MessagingGateway, commentsService: CommentsService, facebookService: FacebookService, settingsService: SettingsService, autoReplyService: AutoReplyService, jwtService: JwtService);
    verifyMetaWebhook(mode: string, token: string, challenge: string, res: Response): Response<any, Record<string, any>>;
    handleMetaWebhook(body: any): Promise<string>;
    handleTikTokWebhook(body: any): Promise<string>;
    handleMarketplaceWebhook(req: any, body: any, res: Response): Promise<Response<any, Record<string, any>>>;
    debugProfile(id: string): Promise<{
        id: string;
        profile: any;
        token_configured: boolean;
    }>;
}
