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
        productName?: string;
        productPrice?: string;
        referralSource?: string;
        referralPostId?: string;
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
    getLastMessages(conversationId: string, limit?: number): Promise<any[]>;
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
        ai_max_message_count?: number;
        ai_cutoff_time_minutes?: number;
    }): Promise<any>;
    checkAndUpdateAiCutoff(conversationId: string, pageId?: string): Promise<{
        isCutoff: boolean;
        cutoffUntil?: undefined;
        replyCount?: undefined;
    } | {
        isCutoff: boolean;
        cutoffUntil: any;
        replyCount: any;
    } | {
        isCutoff: boolean;
        replyCount: any;
        cutoffUntil?: undefined;
    }>;
    incrementAiReplyCount(conversationId: string, pageId: string): Promise<{
        reachedLimit: boolean;
        newCount: any;
        cutoffUntil: string;
    } | {
        reachedLimit: boolean;
        newCount: any;
        cutoffUntil: null;
    }>;
    getPageByFacebookId(pageId: string): Promise<any>;
    markConversationAsRead(id: string): Promise<boolean>;
    uploadFile(file: Buffer, fileName: string, mimeType: string, bucket?: string): Promise<string>;
    getSupabaseClient(): SupabaseClient<any, "public", "public", any, any>;
    extractCustomerNameFromMessage(text: string): string | null;
    autoFixCustomerNames(): Promise<void>;
    autoFixPhoneNumbers(): Promise<void>;
    getOrdersByCustomerId(customerId: string): Promise<{
        id: any;
        order_number: any;
        order_status: any;
        total_amount: any;
        delivery_charge: any;
        created_at: any;
        customer_name: any;
        phone_number: any;
        address: any;
        items: {
            product_name: any;
            qty: any;
            amount: any;
            total_amount: any;
        }[];
    }[]>;
    getPostConfigByPostId(postId: string): Promise<any>;
    getPostConfigsByPageId(pageId: string): Promise<any[]>;
    createPostConfig(data: {
        pageId: string;
        postId: string;
        label?: string;
        aiInstructions: string;
    }): Promise<any>;
    updatePostConfig(id: string, data: {
        label?: string;
        postId?: string;
        aiInstructions?: string;
        isActive?: boolean;
    }): Promise<any>;
    deletePostConfig(id: string): Promise<boolean>;
}
export declare const supabaseService: SupabaseService;
