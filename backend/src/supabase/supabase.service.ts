import { createClient, SupabaseClient } from '@supabase/supabase-js';

export class SupabaseService {
    private supabase: SupabaseClient | null = null;

    public getClient(): SupabaseClient {
        if (!this.supabase) {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Missing Supabase credentials in environment variables');
            }

            if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                console.log('✅ Supabase initialized with SERVICE_ROLE_KEY');
            } else {
                console.warn('⚠️ Supabase initialized with ANON_KEY (Service Role Key missing)');
            }

            this.supabase = createClient(supabaseUrl, supabaseKey);
        }
        return this.supabase;
    }

    private hasPhoneNumber(text: string): boolean {
        if (!text) return false;
        const phoneRegex = /(?:\b9[78]\d{8}\b)|(?:\b\d{10}\b)/;
        return phoneRegex.test(text);
    }

    /**
     * Get or create a conversation
     */
    async getOrCreateConversation(data: {
        customerId: string;
        customerName: string;
        platform: string;
        pageId?: string;
        pageName?: string;
        customerProfilePic?: string;
    }) {
        // Check if conversation exists - scope by Customer, Platform AND Page
        const { data: existing, error: fetchError } = await this.getClient()
            .from('conversations')
            .select('*')
            .eq('customer_id', data.customerId)
            .eq('platform', data.platform)
            .eq('page_id', data.pageId)
            .single();

        if (existing) {
            // Update customer name/metadata if provided and different
            const updates: any = {};
            if (data.customerName && data.customerName !== data.customerId && existing.customer_name !== data.customerName) {
                updates.customer_name = data.customerName;
            }
            if (data.pageId && existing.page_id !== data.pageId) {
                updates.page_id = data.pageId;
            }
            if (data.pageName && (!existing.page_name || existing.page_name !== data.pageName)) {
                updates.page_name = data.pageName;
            }
            if (data.platform && existing.platform !== data.platform) {
                updates.platform = data.platform;
            }
            if (data.customerProfilePic && existing.customer_profile_pic !== data.customerProfilePic) {
                updates.customer_profile_pic = data.customerProfilePic;
            }

            if (data.customerName && this.hasPhoneNumber(data.customerName)) {
                updates.has_phone_number = true;
            }

            if (Object.keys(updates).length > 0) {
                await this.getClient()
                    .from('conversations')
                    .update(updates)
                    .eq('id', existing.id);
                // Merge updates into existing object for return
                Object.assign(existing, updates);
            }
            return existing;
        }

        // Create new conversation
        const { data: newConversation, error: createError } = await this.getClient()
            .from('conversations')
            .insert({
                customer_id: data.customerId,
                customer_name: data.customerName,
                platform: data.platform,
                page_id: data.pageId,
                page_name: data.pageName,
                customer_profile_pic: data.customerProfilePic,
                has_phone_number: data.customerName ? this.hasPhoneNumber(data.customerName) : false
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating conversation:', createError);
            throw createError;
        }

        return newConversation;
    }

    /**
     * Save a message to the database
     */
    async saveMessage(data: {
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
    }) {
        // Deduplication: Check if message with same messageId already exists
        if (data.messageId) {
            const { data: existing } = await this.getClient()
                .from('messages')
                .select('*')
                .eq('message_id', data.messageId)
                .single();

            if (existing) {
                console.log(`[Supabase] Message with ID ${data.messageId} already exists. Skipping insert.`);
                return existing;
            }
        }

        const { data: message, error } = await this.getClient()
            .from('messages')
            .upsert({
                conversation_id: data.conversationId,
                text: data.text,
                sender: data.sender,
                platform: data.platform,
                message_id: data.messageId,
                page_id: data.pageId,
                image_url: data.imageUrl,
                file_type: data.fileType || 'text',
                reply_to_mid: data.replyToMid,
                reply_to_text: data.replyToText,
                reply_to_sender: data.replyToSender,
                metadata: data.metadata || {},
            }, {
                onConflict: 'message_id',
                ignoreDuplicates: true // Keep the first one (usually the one with metadata from webapp)
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving message:', error);
            throw error;
        }

        console.log(`[Supabase] Message saved. Updating conversation ${data.conversationId}...`);

        // Update conversation's last message and increment unread_count if it's a customer message
        const isCustomer = data.sender === 'customer';
        const { error: updateError } = await this.getClient()
            .rpc('increment_unread_count', {
                conv_id: data.conversationId,
                is_customer: isCustomer,
                last_msg: data.text
            });

        // Fallback if RPC doesn't exist yet or fails - just update metadata
        if (updateError) {
            console.warn(`[Supabase] RPC increment_unread_count failed: ${updateError.message}. Falling back to manual update.`);
            const updates: any = {
                last_message: data.text,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Track phone number if incoming
            if (data.sender === 'customer' && this.hasPhoneNumber(data.text)) {
                updates.has_phone_number = true;
            }

            await this.getClient()
                .from('conversations')
                .update(updates)
                .eq('id', data.conversationId);
        } else {
            console.log(`[Supabase] Conversation ${data.conversationId} updated successfully (RPC).`);
        }

        return message;
    }

    /**
     * Get all conversations (sorted by last message)
     */
    async getConversations(limit = 1000, offset = 0, customerId?: string, user?: any) {
        let query = this.getClient()
            .from('conversations')
            .select('*')
            .order('last_message_at', { ascending: false });

        if (customerId) {
            query = query.eq('customer_id', customerId);
        }

        // Apply RBAC filtering
        if (user && user.role === 'user') {
            const allowedPlatforms = user.platforms || [];
            const allowedAccounts = user.accounts || [];

            console.log(`[RBAC Debug] Filtering for user ${user.id || 'unknown'}: Platforms=${JSON.stringify(allowedPlatforms)}, Accounts=${JSON.stringify(allowedAccounts)}`);

            if (allowedPlatforms.length === 0 && allowedAccounts.length === 0) {
                console.warn('[RBAC] Restricted user has no permissions. Returning empty results.');
                return [];
            }

            // Filter by Platform (if restricted)
            if (allowedPlatforms.length > 0) {
                query = query.in('platform', allowedPlatforms);
            }

            // Filter by Account/Page (if restricted)
            if (allowedAccounts.length > 0) {
                query = query.in('page_id', allowedAccounts);
            }
        }

        const { data: conversations, error } = await query.range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching conversations:', error);
            throw error;
        }

        // Efficiently fetch latest orders for all customers in ONE query
        const customerIds = conversations.map(c => c.customer_id).filter(Boolean);
        let allOrders: any[] = [];
        let orderCounts: Record<string, number> = {};

        if (customerIds.length > 0) {
            // Get all orders for these customers to count them and find latest
            const { data: ordersData } = await this.getClient()
                .from('orders')
                .select('customer_id, order_status, order_number, created_at')
                .in('customer_id', customerIds)
                .order('created_at', { ascending: false });

            allOrders = ordersData || [];

            // Calculate counts manually to avoid another N queries
            allOrders.forEach(o => {
                orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1;
            });
        }

        const enrichedConversations = conversations.map((conv) => {
            // Find the latest order from the pre-fetched batch
            const latestOrder = allOrders.find(o => o.customer_id === conv.customer_id);
            const count = orderCounts[conv.customer_id] || 0;

            return {
                ...conv,
                has_orders: !!latestOrder,
                latest_order_status: latestOrder ? latestOrder.order_status : null,
                latest_order_number: latestOrder ? latestOrder.order_number : null,
                order_count: count,
                has_phone_number: !!conv.has_phone_number
            };
        });

        return enrichedConversations;
    }

    /**
     * Get messages for a conversation
     */
    async getMessages(conversationId: string, limit = 10000, offset = 0) {
        const { data, error } = await this.getClient()
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching messages:', error);
            throw error;
        }

        return data;
    }

    /**
     * Get all connected pages
     */
    async getPages() {
        const { data, error } = await this.getClient()
            .from('pages')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching pages:', error);
            throw error;
        }

        return data;
    }

    /**
     * Add a new page
     */
    async createPage(data: {
        platform: string;
        pageName: string;
        pageId: string;
        accessToken: string;
    }) {
        const { data: page, error } = await this.getClient()
            .from('pages')
            .insert({
                platform: data.platform,
                page_name: data.pageName,
                page_id: data.pageId,
                access_token: data.accessToken,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating page:', error);
            throw error;
        }

        return page;
    }

    /**
     * Delete a page
     */
    async deletePage(id: string) {
        const { error } = await this.getClient()
            .from('pages')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting page:', error);
            throw error;
        }

        return true;
    }

    /**
     * Update a page
     */
    async updatePage(id: string, data: {
        is_ai_enabled?: boolean;
        custom_prompt?: string;
        cutoff_messages?: string;
    }) {
        const { data: page, error } = await this.getClient()
            .from('pages')
            .update({
                ...data,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating page:', error);
            throw error;
        }

        return page;
    }

    /**
     * Get page by ID (for internal use)
     */
    async getPageByFacebookId(pageId: string) {
        const { data, error } = await this.getClient()
            .from('pages')
            .select('*')
            .eq('page_id', pageId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error('Error fetching page by ID:', error);
        }

        return data;
    }

    /**
     * Mark a conversation as read
     */
    async markConversationAsRead(id: string) {
        const { error } = await this.getClient()
            .from('conversations')
            .update({ unread_count: 0 })
            .eq('id', id);

        if (error) {
            console.error('Error marking conversation as read:', error);
            throw error;
        }

        return true;
    }

    /**
     * Upload a file to Supabase Storage
     */
    async uploadFile(file: Buffer, fileName: string, mimeType: string, bucket = 'content') {
        const { data, error } = await this.getClient()
            .storage
            .from(bucket)
            .upload(fileName, file, {
                contentType: mimeType,
                upsert: true
            });

        if (error) {
            console.error('Error uploading file to Supabase:', error);
            throw error;
        }

        // Get public URL
        const { data: publicUrlData } = this.getClient()
            .storage
            .from(bucket)
            .getPublicUrl(data.path);

        return publicUrlData.publicUrl;
    }

    /**
     * Get Supabase client for direct access
     */
    getSupabaseClient() {
        return this.getClient();
    }
}

export const supabaseService = new SupabaseService();
