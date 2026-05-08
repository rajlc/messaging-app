export interface Template {
    id: string;
    status: string;
    template: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
export interface QuickReplyTemplate {
    id: string;
    title: string;
    message: string;
    created_at: string;
    updated_at: string;
}
export interface CreateQuickReplyDto {
    title: string;
    message: string;
}
export interface UpdateQuickReplyDto {
    title?: string;
    message?: string;
}
export declare class TemplatesService {
    private readonly logger;
    getAllTemplates(): Promise<any[]>;
    upsertTemplate(status: string, template: string, is_active?: boolean): Promise<any>;
    getAllQuickReplyTemplates(): Promise<QuickReplyTemplate[]>;
    getQuickReplyTemplateById(id: string): Promise<QuickReplyTemplate | null>;
    createQuickReplyTemplate(dto: CreateQuickReplyDto): Promise<QuickReplyTemplate>;
    updateQuickReplyTemplate(id: string, dto: UpdateQuickReplyDto): Promise<QuickReplyTemplate>;
    deleteQuickReplyTemplate(id: string): Promise<void>;
}
