import { ConfigService } from '@nestjs/config';
export declare class FacebookService {
    private configService;
    private readonly defaultPageAccessToken;
    private readonly defaultPageId;
    private readonly apiVersion;
    constructor(configService: ConfigService);
    private getPageAccessToken;
    validatePageToken(pageId: string, accessToken: string): Promise<boolean>;
    getPageName(pageId: string, accessToken: string): Promise<string>;
    sendMessage(recipientId: string, text: string, pageId?: string, imageUrl?: string, tag?: string, replyToMid?: string): Promise<any>;
    getUserProfile(userId: string, pageId?: string): Promise<any>;
}
