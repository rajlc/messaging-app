export declare class ConversationsController {
    getConversations(req: any, limit?: string, offset?: string, customerId?: string): Promise<any[]>;
    getMessages(id: string, limit?: string, offset?: string): Promise<any[]>;
    markAsRead(id: string): Promise<{
        success: boolean;
    }>;
}
