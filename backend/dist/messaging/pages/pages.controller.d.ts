import { FacebookService } from '../facebook.service';
export declare class PagesController {
    private facebookService;
    constructor(facebookService: FacebookService);
    getPages(): Promise<any[]>;
    addPage(body: {
        pageId: string;
        accessToken: string;
        platform?: string;
    }): Promise<any>;
    removePage(id: string): Promise<boolean>;
    updatePage(id: string, body: {
        is_ai_enabled?: boolean;
        custom_prompt?: string;
    }): Promise<any>;
}
