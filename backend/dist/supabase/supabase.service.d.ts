import { SupabaseClient } from '@supabase/supabase-js';
export declare class SupabaseService {
    private supabase;
    getClient(): SupabaseClient;
    private hasPhoneNumber;
    getOrCreateConversation(data: {
        customerId: string;
        customerName: string;
        platform: string;
        pageId?: string;
        pageName?: string;
        customerProfilePic?: string;
    }): Promise<any>;
    saveMessage(data: {
        conversationId: string;
        text: string;
        sender: 'customer' | 'agent';
        platform: string;
        messageId?: string;
        pageId?: string;
        imageUrl?: string;
        fileType?: string;
        replyToMid?: string;
        replyToText?: string;
        replyToSender?: string;
        metadata?: any;
    }): Promise<any>;
    getConversations(limit?: number, offset?: number, customerId?: string, user?: any): Promise<any[]>;
    getMessages(conversationId: string, limit?: number, offset?: number): Promise<any[]>;
    getPages(): Promise<any[]>;
    createPage(data: {
        platform: string;
        pageName: string;
        pageId: string;
        accessToken: string;
    }): Promise<any>;
    deletePage(id: string): Promise<boolean>;
    updatePage(id: string, data: {
        is_ai_enabled?: boolean;
        custom_prompt?: string;
        cutoff_messages?: string;
    }): Promise<any>;
    getPageByFacebookId(pageId: string): Promise<any>;
    markConversationAsRead(id: string): Promise<boolean>;
    uploadFile(file: Buffer, fileName: string, mimeType: string, bucket?: string): Promise<string>;
    getSupabaseClient(): SupabaseClient<any, "public", "public", any, any>;
}
export declare const supabaseService: SupabaseService;
