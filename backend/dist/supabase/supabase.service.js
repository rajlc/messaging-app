"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseService = exports.SupabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class SupabaseService {
    supabase = null;
    getClient() {
        if (!this.supabase) {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseKey) {
                throw new Error('Missing Supabase credentials in environment variables');
            }
            if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                console.log('✅ Supabase initialized with SERVICE_ROLE_KEY');
            }
            else {
                console.warn('⚠️ Supabase initialized with ANON_KEY (Service Role Key missing)');
            }
            this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        }
        return this.supabase;
    }
    hasPhoneNumber(text) {
        if (!text)
            return false;
        const phoneRegex = /(?:\b9[78]\d{8}\b)|(?:\b\d{10}\b)/;
        return phoneRegex.test(text);
    }
    async getOrCreateConversation(data) {
        const { data: existing, error: fetchError } = await this.getClient()
            .from('conversations')
            .select('*')
            .eq('customer_id', data.customerId)
            .eq('platform', data.platform)
            .eq('page_id', data.pageId)
            .single();
        if (existing) {
            const updates = {};
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
                Object.assign(existing, updates);
            }
            return existing;
        }
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
    async saveMessage(data) {
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
            ignoreDuplicates: true
        })
            .select()
            .single();
        if (error) {
            console.error('Error saving message:', error);
            throw error;
        }
        console.log(`[Supabase] Message saved. Updating conversation ${data.conversationId}...`);
        const isCustomer = data.sender === 'customer';
        const { error: updateError } = await this.getClient()
            .rpc('increment_unread_count', {
            conv_id: data.conversationId,
            is_customer: isCustomer,
            last_msg: data.text
        });
        if (updateError) {
            console.warn(`[Supabase] RPC increment_unread_count failed: ${updateError.message}. Falling back to manual update.`);
            const updates = {
                last_message: data.text,
                last_message_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            if (data.sender === 'customer' && this.hasPhoneNumber(data.text)) {
                updates.has_phone_number = true;
            }
            await this.getClient()
                .from('conversations')
                .update(updates)
                .eq('id', data.conversationId);
        }
        else {
            console.log(`[Supabase] Conversation ${data.conversationId} updated successfully (RPC).`);
        }
        return message;
    }
    async getConversations(limit = 1000, offset = 0, customerId, user) {
        let query = this.getClient()
            .from('conversations')
            .select('*')
            .order('last_message_at', { ascending: false });
        if (customerId) {
            query = query.eq('customer_id', customerId);
        }
        if (user && user.role === 'user') {
            const allowedPlatforms = user.platforms || [];
            const allowedAccounts = user.accounts || [];
            console.log(`[RBAC Debug] Filtering for user ${user.id || 'unknown'}: Platforms=${JSON.stringify(allowedPlatforms)}, Accounts=${JSON.stringify(allowedAccounts)}`);
            if (allowedPlatforms.length === 0 && allowedAccounts.length === 0) {
                console.warn('[RBAC] Restricted user has no permissions. Returning empty results.');
                return [];
            }
            if (allowedPlatforms.length > 0) {
                query = query.in('platform', allowedPlatforms);
            }
            if (allowedAccounts.length > 0) {
                query = query.in('page_id', allowedAccounts);
            }
        }
        const { data: conversations, error } = await query.range(offset, offset + limit - 1);
        if (error) {
            console.error('Error fetching conversations:', error);
            throw error;
        }
        const customerIds = conversations.map(c => c.customer_id).filter(Boolean);
        let allOrders = [];
        let orderCounts = {};
        if (customerIds.length > 0) {
            const { data: ordersData } = await this.getClient()
                .from('orders')
                .select('customer_id, order_status, order_number, created_at')
                .in('customer_id', customerIds)
                .order('created_at', { ascending: false });
            allOrders = ordersData || [];
            allOrders.forEach(o => {
                orderCounts[o.customer_id] = (orderCounts[o.customer_id] || 0) + 1;
            });
        }
        const enrichedConversations = conversations.map((conv) => {
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
    async getMessages(conversationId, limit = 10000, offset = 0) {
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
    async createPage(data) {
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
    async deletePage(id) {
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
    async updatePage(id, data) {
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
    async getPageByFacebookId(pageId) {
        const { data, error } = await this.getClient()
            .from('pages')
            .select('*')
            .eq('page_id', pageId)
            .single();
        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching page by ID:', error);
        }
        return data;
    }
    async markConversationAsRead(id) {
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
    async uploadFile(file, fileName, mimeType, bucket = 'content') {
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
        const { data: publicUrlData } = this.getClient()
            .storage
            .from(bucket)
            .getPublicUrl(data.path);
        return publicUrlData.publicUrl;
    }
    getSupabaseClient() {
        return this.getClient();
    }
}
exports.SupabaseService = SupabaseService;
exports.supabaseService = new SupabaseService();
//# sourceMappingURL=supabase.service.js.map