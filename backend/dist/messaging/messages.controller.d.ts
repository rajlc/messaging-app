import { FacebookService } from './facebook.service';
import { MessagingGateway } from '../socket/messaging.gateway';
export declare class MessagesController {
    private facebookService;
    private messagingGateway;
    constructor(facebookService: FacebookService, messagingGateway: MessagingGateway);
    saveMessage(messageData: {
        customerId: string;
        text: string;
        sender: 'customer' | 'agent';
        platform: string;
        pageId?: string;
    }): Promise<{
        success: boolean;
        message: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    }>;
    sendMessage(body: {
        recipientId: string;
        text: string;
        platform: string;
        pageId?: string;
        imageUrl?: string | string[];
        fileType?: string;
        tag?: string;
        replyToMid?: string;
        replyToText?: string;
        replyToSender?: string;
        tempId?: string;
    }): Promise<{
        success: boolean;
        message: string;
        data: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
        data?: undefined;
    }>;
}
