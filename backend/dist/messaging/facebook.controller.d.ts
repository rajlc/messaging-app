import { ConfigService } from '@nestjs/config';
import { FacebookService } from './facebook.service';
export declare class FacebookController {
    private configService;
    private facebookService;
    constructor(configService: ConfigService, facebookService: FacebookService);
    getPageInfo(): Promise<{
        connected: boolean;
        message: string;
        pageId?: undefined;
        pageName?: undefined;
        username?: undefined;
        error?: undefined;
    } | {
        connected: boolean;
        pageId: any;
        pageName: any;
        username: any;
        message?: undefined;
        error?: undefined;
    } | {
        connected: boolean;
        error: string;
        message?: undefined;
        pageId?: undefined;
        pageName?: undefined;
        username?: undefined;
    }>;
    getUserProfile(userId: string): Promise<any>;
}
