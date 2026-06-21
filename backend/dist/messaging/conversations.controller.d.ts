import { MessagingGateway } from '../socket/messaging.gateway';
export declare class ConversationsController {
    private messagingGateway;
    constructor(messagingGateway: MessagingGateway);
    getConversations(req: any, limit?: string, offset?: string, customerId?: string): Promise<any[]>;
    getMessages(id: string, limit?: string, offset?: string): Promise<any[]>;
    markAsRead(id: string): Promise<{
        success: boolean;
    }>;
    syncCustomerName(body: {
        customerId: string;
        customerName: string;
    }): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        message?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    }>;
}
