import { FacebookService } from '../facebook.service';
export declare class PagesController {
    private facebookService;
    constructor(facebookService: FacebookService);
    getPages(): Promise<any[]>;
    addPage(body: {
        pageId: string;
        accessToken?: string;
        platform?: string;
        pageName?: string;
    }): Promise<any>;
    removePage(id: string): Promise<boolean>;
    updatePage(id: string, body: {
        is_ai_enabled?: boolean;
        custom_prompt?: string;
        cutoff_messages?: string;
    }): Promise<any>;
    static onlineMarketplaceProfiles: Map<string, number>;
    static pendingMarketplaceSends: Map<string, {
        recipientId: string;
        text: string;
        messageId: string;
    }[]>;
    static isProfileOnline(profileId: string): boolean;
    registerHeartbeat(body: {
        pageId: string;
        platform: string;
    }): Promise<{
        success: boolean;
        status: string;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        status?: undefined;
    }>;
    getPendingMessages(pageId: string): {
        recipientId: string;
        text: string;
        messageId: string;
    }[];
    markMessageSent(body: {
        pageId: string;
        messageId: string;
    }): {
        success: boolean;
    };
}
