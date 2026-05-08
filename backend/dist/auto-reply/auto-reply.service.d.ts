export declare class AutoReplyService {
    createRule(data: {
        page_id: string;
        trigger_type: 'exact' | 'phone';
        trigger_text?: string;
        reply_text: string;
        is_active?: boolean;
    }): Promise<any>;
    getRulesByPage(pageId: string): Promise<any[]>;
    updateRule(id: string, data: Partial<{
        trigger_text: string;
        reply_text: string;
        is_active: boolean;
    }>): Promise<any>;
    deleteRule(id: string): Promise<boolean>;
    findMatchingRule(pageId: string, text: string): Promise<any>;
}
