import { TemplatesService } from './templates.service';
export declare class TemplatesController {
    private readonly templatesService;
    constructor(templatesService: TemplatesService);
    getTemplates(): Promise<any[]>;
    upsertTemplate(body: {
        status: string;
        template: string;
        is_active?: boolean;
    }): Promise<any>;
    getQuickReplyTemplates(): Promise<import("./templates.service").QuickReplyTemplate[]>;
    getQuickReplyTemplate(id: string): Promise<import("./templates.service").QuickReplyTemplate | null>;
    createQuickReplyTemplate(body: {
        title: string;
        message: string;
    }): Promise<import("./templates.service").QuickReplyTemplate>;
    updateQuickReplyTemplate(id: string, body: {
        title?: string;
        message?: string;
    }): Promise<import("./templates.service").QuickReplyTemplate>;
    deleteQuickReplyTemplate(id: string): Promise<{
        success: boolean;
    }>;
}
