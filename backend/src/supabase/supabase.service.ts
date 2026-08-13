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
        productName?: string;
        productPrice?: string;
        referralSource?: string;  // e.g. 'POST', 'ADS', 'PAGE', 'SHORTLINK'
        referralPostId?: string;  // Facebook Post ID or Ad ID
    }) {
        // Check if conversation exists by customer_id (since customer_id is a unique key)
        const { data: existing, error: fetchError } = await this.getClient()
            .from('conversations')
            .select('*')
            .eq('customer_id', data.customerId)
            .single();

        if (existing) {
            // Update customer name/metadata if provided and different
            const updates: any = {};
            if (data.customerName && data.customerName !== data.customerId && existing.customer_name !== data.customerName) {
                const isIncomingPlaceholder = data.customerName === 'Customer';
                const hasExistingRealName = existing.customer_name && existing.customer_name !== 'Customer' && existing.customer_name !== existing.customer_id;
                if (!(isIncomingPlaceholder && hasExistingRealName)) {
                    updates.customer_name = data.customerName;
                }
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
            if (data.productName && existing.product_name !== data.productName) {
                updates.product_name = data.productName;
            }
            if (data.productPrice && existing.product_price !== data.productPrice) {
                updates.product_price = data.productPrice;
            }

            if (data.customerName && this.hasPhoneNumber(data.customerName)) {
                updates.has_phone_number = true;
            }

            // Referral: only record the FIRST time (first-message-wins — don't overwrite with direct messages later)
            if (data.referralSource && !existing.referral_source) {
                updates.referral_source = data.referralSource;
            }
            if (data.referralPostId && !existing.referral_post_id) {
                updates.referral_post_id = data.referralPostId;
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await this.getClient()
                    .from('conversations')
                    .update(updates)
                    .eq('id', existing.id);
                
                if (updateError && (updateError.message?.includes('product_name') || updateError.message?.includes('product_price') || updateError.code === '42703')) {
                    console.warn('[Supabase] conversations table lacks product_name/product_price columns. Retrying update without them.');
                    delete updates.product_name;
                    delete updates.product_price;
                    if (Object.keys(updates).length > 0) {
                        await this.getClient()
                            .from('conversations')
                            .update(updates)
                            .eq('id', existing.id);
                    }
                }
                // Merge updates into existing object for return
                Object.assign(existing, updates);
            }
            return existing;
        }

        // Create new conversation
        const insertData: any = {
            customer_id: data.customerId,
            customer_name: data.customerName,
            platform: data.platform,
            page_id: data.pageId,
            page_name: data.pageName,
            customer_profile_pic: data.customerProfilePic,
            has_phone_number: data.customerName ? this.hasPhoneNumber(data.customerName) : false
        };

        if (data.productName) insertData.product_name = data.productName;
        if (data.productPrice) insertData.product_price = data.productPrice;
        if (data.referralSource) insertData.referral_source = data.referralSource;
        if (data.referralPostId) insertData.referral_post_id = data.referralPostId;

        const { data: newConversation, error: createError } = await this.getClient()
            .from('conversations')
            .insert(insertData)
            .select()
            .single();

        if (createError) {
            if (createError.message?.includes('product_name') || createError.message?.includes('product_price') || createError.code === '42703') {
                console.warn('[Supabase] conversations table lacks product_name/product_price columns. Retrying insert without them.');
                delete insertData.product_name;
                delete insertData.product_price;
                const { data: retryConv, error: retryError } = await this.getClient()
                    .from('conversations')
                    .insert(insertData)
                    .select()
                    .single();
                if (retryError) {
                    console.error('Error creating conversation on retry:', retryError);
                    throw retryError;
                }
                return retryConv;
            }
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
        // Deduplication 1: Check if message with same messageId already exists
        if (data.messageId) {
            const { data: existingRows } = await this.getClient()
                .from('messages')
                .select('*')
                .eq('message_id', data.messageId)
                .limit(1);

            if (existingRows && existingRows.length > 0) {
                console.log(`[Supabase] Message with ID ${data.messageId} already exists. Skipping insert.`);
                return { ...existingRows[0], isDuplicate: true };
            }
        }

        // Deduplication 2: For incoming echo agent messages, check if we saved a matching agent message in the last 15 seconds
        if (data.sender === 'agent' && data.text) {
            const fifteenSecAgo = new Date(Date.now() - 15000).toISOString();
            const { data: recentMatches } = await this.getClient()
                .from('messages')
                .select('*')
                .eq('conversation_id', data.conversationId)
                .eq('sender', 'agent')
                .eq('text', data.text)
                .gte('created_at', fifteenSecAgo)
                .order('created_at', { ascending: false })
                .limit(1);

            if (recentMatches && recentMatches.length > 0) {
                const recentMatch = recentMatches[0];
                console.log(`[Supabase] Echo matched recent AI/agent message (${recentMatch.id}). Updating message_id and skipping duplicate insert.`);
                if (data.messageId && !recentMatch.message_id) {
                    await this.getClient()
                        .from('messages')
                        .update({ message_id: data.messageId })
                        .eq('id', recentMatch.id);
                }
                return { ...recentMatch, isDuplicate: true };
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

        if (!updateError && isCustomer && this.hasPhoneNumber(data.text)) {
            await this.getClient()
                .from('conversations')
                .update({ has_phone_number: true })
                .eq('id', data.conversationId);
        }

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

        // If a name was parsed from the system message, update the conversation's customer name
        const extractedName = this.extractCustomerNameFromMessage(data.text);
        if (extractedName) {
            console.log(`[Supabase] Extracted original customer name "${extractedName}" from system message.`);
            try {
                const { data: conv } = await this.getClient()
                    .from('conversations')
                    .select('customer_name')
                    .eq('id', data.conversationId)
                    .single();
                
                if (conv && (conv.customer_name === 'Customer' || conv.customer_name === '' || !conv.customer_name)) {
                    await this.getClient()
                        .from('conversations')
                        .update({ customer_name: extractedName })
                        .eq('id', data.conversationId);
                    console.log(`[Supabase] Auto-updated conversation ${data.conversationId} customer_name to "${extractedName}"`);
                }
            } catch (err: any) {
                console.error('[Supabase] Failed to update customer_name from extracted name:', err.message);
            }
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

        // Trigger auto-fix asynchronously for any 'Customer' conversation records in the fetched list
        const hasCustomerPlaceholder = conversations.some(c => c.customer_name === 'Customer');
        if (hasCustomerPlaceholder) {
            this.autoFixCustomerNames().catch(err => {
                console.error('[Supabase] Error running async auto-fix in getConversations:', err.message);
            });
        }

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
     * Get recent messages for context (in chronological order: oldest first)
     */
    async getLastMessages(conversationId: string, limit = 5) {
        const { data, error } = await this.getClient()
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching last messages:', error);
            throw error;
        }

        return data.reverse();
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
        ai_max_message_count?: number;
        ai_cutoff_time_minutes?: number;
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

    // ─── Per-Customer AI Rate Limiting & Cut-off Methods ─────────────────────────

    /**
     * Check if AI is cut off for a customer conversation.
     * Resets the cut-off state automatically if the timer has expired.
     */
    async checkAndUpdateAiCutoff(conversationId: string, pageId?: string) {
        const { data: conv } = await this.getClient()
            .from('conversations')
            .select('id, ai_reply_count, ai_cutoff_until')
            .eq('id', conversationId)
            .single();

        if (!conv) return { isCutoff: false };

        if (conv.ai_cutoff_until) {
            const cutoffTime = new Date(conv.ai_cutoff_until).getTime();
            const now = Date.now();

            if (now < cutoffTime) {
                // Still in cut-off period
                return { isCutoff: true, cutoffUntil: conv.ai_cutoff_until, replyCount: conv.ai_reply_count };
            } else {
                // Cut-off period expired! Reset counter and clear timer in DB
                console.log(`[AI Cutoff] Timer expired for conversation ${conversationId}. Resetting AI count & clearing cut-off.`);
                await this.getClient()
                    .from('conversations')
                    .update({ ai_reply_count: 0, ai_cutoff_until: null })
                    .eq('id', conversationId);

                return { isCutoff: false, replyCount: 0 };
            }
        }

        return { isCutoff: false, replyCount: conv.ai_reply_count || 0 };
    }

    /**
     * Increment the AI reply count for a conversation after AI sends a reply.
     * Sets ai_cutoff_until if max message count is reached.
     */
    async incrementAiReplyCount(conversationId: string, pageId: string) {
        // Fetch page config for limit & cutoff time
        let maxCount = 5;
        let cutoffMinutes = 60;

        if (pageId) {
            const page = await this.getPageByFacebookId(pageId);
            if (page) {
                if (typeof page.ai_max_message_count === 'number') maxCount = page.ai_max_message_count;
                if (typeof page.ai_cutoff_time_minutes === 'number') cutoffMinutes = page.ai_cutoff_time_minutes;
            }
        }

        // Fetch current conversation
        const { data: conv } = await this.getClient()
            .from('conversations')
            .select('ai_reply_count')
            .eq('id', conversationId)
            .single();

        const currentCount = conv?.ai_reply_count || 0;
        const newCount = currentCount + 1;

        if (maxCount > 0 && newCount >= maxCount) {
            const cutoffUntil = new Date(Date.now() + cutoffMinutes * 60000).toISOString();
            console.log(`[AI Cutoff] Customer conversation ${conversationId} reached max AI reply limit (${newCount}/${maxCount}). Cutting off AI for ${cutoffMinutes} minutes until ${cutoffUntil}.`);

            await this.getClient()
                .from('conversations')
                .update({
                    ai_reply_count: newCount,
                    ai_cutoff_until: cutoffUntil
                })
                .eq('id', conversationId);

            return { reachedLimit: true, newCount, cutoffUntil };
        } else {
            await this.getClient()
                .from('conversations')
                .update({ ai_reply_count: newCount })
                .eq('id', conversationId);

            return { reachedLimit: false, newCount, cutoffUntil: null };
        }
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

    /**
     * Parse system interest or joined messages to extract the customer's true name
     */
    extractCustomerNameFromMessage(text: string): string | null {
        if (!text) return null;
        
        // English matches
        const interestMatch = text.match(/^(.+?)\s+is interested in this listing\b/i);
        if (interestMatch && interestMatch[1]) return interestMatch[1].trim();

        const interestMatchItem = text.match(/^(.+?)\s+is interested in this item\b/i);
        if (interestMatchItem && interestMatchItem[1]) return interestMatchItem[1].trim();

        const joinMatch = text.match(/^(.+?)\s+joined the conversation\b/i);
        if (joinMatch && joinMatch[1]) return joinMatch[1].trim();

        const sendMatch = text.match(/^(.+?)\s+sent a message\b/i);
        if (sendMatch && sendMatch[1]) return sendMatch[1].trim();

        const unsentMatch = text.match(/^(.+?)\s+(?:unsent|deleted|removed)\s+a\s+message\b/i);
        if (unsentMatch && unsentMatch[1]) return unsentMatch[1].trim();

        // Nepali matches
        const interestMatchNe = text.match(/^(.+?)\s+ले यो वस्तुमा चासो राख्नुभयो\b/);
        if (interestMatchNe && interestMatchNe[1]) return interestMatchNe[1].trim();

        const joinMatchNe = text.match(/^(.+?)\s+कुराकानीमा सामेल हुनुभयो\b/);
        if (joinMatchNe && joinMatchNe[1]) return joinMatchNe[1].trim();

        const unsentMatchNe = text.match(/^(.+?)\s+ले सन्देश पठाउन रद्द गर्नुभयो\b/);
        if (unsentMatchNe && unsentMatchNe[1]) return unsentMatchNe[1].trim();

        return null;
    }

    /**
     * Scan conversations with placeholder name 'Customer' and restore original names
     */
    async autoFixCustomerNames() {
        try {
            console.log('[Supabase] Running auto-fix task for "Customer" conversation names...');
            
            const { data: conversations, error } = await this.getClient()
                .from('conversations')
                .select('id, customer_id')
                .eq('customer_name', 'Customer');

            if (error) {
                console.error('[Supabase] Failed to fetch conversations for auto-fix:', error.message);
                return;
            }

            if (!conversations || conversations.length === 0) {
                return;
            }

            console.log(`[Supabase] Found ${conversations.length} conversations named "Customer" to check.`);

            let fixedCount = 0;

            for (const conv of conversations) {
                let realName: string | null = null;

                // A. Check if the customer has an order in the orders table
                const { data: order } = await this.getClient()
                    .from('orders')
                    .select('customer_name')
                    .eq('customer_id', conv.customer_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (order && order.customer_name) {
                    realName = order.customer_name;
                }

                // B. If no order, search messages for system interest/join notes containing the name
                if (!realName) {
                    const { data: messages } = await this.getClient()
                        .from('messages')
                        .select('text')
                        .eq('conversation_id', conv.id)
                        .or('text.ilike.%deleted%,text.ilike.%unsent%,text.ilike.%removed%,text.ilike.%सन्देश%,text.ilike.%सामेल%,text.ilike.%interested%')
                        .order('created_at', { ascending: true });

                    if (messages && messages.length > 0) {
                        for (const msg of messages) {
                            const parsedName = this.extractCustomerNameFromMessage(msg.text);
                            if (parsedName) {
                                realName = parsedName;
                                break;
                            }
                        }
                    }
                }

                // C. Update conversation in DB if name found
                if (realName && realName !== 'Customer') {
                    const { error: updateError } = await this.getClient()
                        .from('conversations')
                        .update({ customer_name: realName })
                        .eq('id', conv.id);

                    if (!updateError) {
                        fixedCount++;
                        console.log(`[Supabase] Auto-fixed conversation ${conv.id}: "Customer" -> "${realName}"`);
                    } else {
                        console.error(`[Supabase] Failed to update name for conversation ${conv.id}:`, updateError.message);
                    }
                }
            }

            if (fixedCount > 0) {
                console.log(`[Supabase] Finished auto-fix: ${fixedCount} names updated successfully.`);
            }

            // Trigger phone numbers auto-fix
            await this.autoFixPhoneNumbers();
        } catch (err: any) {
            console.error('[Supabase] Error running autoFixCustomerNames:', err.message);
        }
    }

    async autoFixPhoneNumbers() {
        try {
            console.log('[Supabase] Running auto-fix task for phone numbers...');
            const { data: conversations, error } = await this.getClient()
                .from('conversations')
                .select('id')
                .or('has_phone_number.eq.false,has_phone_number.is.null');

            if (error) {
                console.error('[Supabase] Failed to fetch conversations for phone number auto-fix:', error.message);
                return;
            }

            if (!conversations || conversations.length === 0) return;

            let fixedCount = 0;
            for (const conv of conversations) {
                const { data: messages } = await this.getClient()
                    .from('messages')
                    .select('text')
                    .eq('conversation_id', conv.id)
                    .eq('sender', 'customer');

                if (messages && messages.length > 0) {
                    const hasPhone = messages.some(m => this.hasPhoneNumber(m.text));
                    if (hasPhone) {
                        await this.getClient()
                            .from('conversations')
                            .update({ has_phone_number: true })
                            .eq('id', conv.id);
                        fixedCount++;
                    }
                }
            }
            if (fixedCount > 0) {
                console.log(`[Supabase] Auto-fix completed: marked ${fixedCount} conversations as containing phone numbers.`);
            }
        } catch (err: any) {
            console.error('[Supabase] Error running autoFixPhoneNumbers:', err.message);
        }
    }

    // ─── AI Context: Order Lookup ─────────────────────────────────────────────────

    /**
     * Get the most recent order and its items for a customer (for AI order context)
     */
    async getOrdersByCustomerId(customerId: string) {
        try {
            const { data: orders, error: ordersErr } = await this.getClient()
                .from('orders')
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .limit(5);

            if (ordersErr || !orders || orders.length === 0) return [];

            const orderIds = orders.map(o => o.id);
            const { data: items } = await this.getClient()
                .from('order_items')
                .select('*')
                .in('order_id', orderIds);

            return orders.map(order => ({
                ...order,
                items: (items || []).filter(item => item.order_id === order.id)
            }));
        } catch (err: any) {
            console.error('[Supabase] Error fetching orders for AI context:', err.message);
            return [];
        }
    }

    // ─── AI Context: Post/Ad Config Lookup ───────────────────────────────────────

    /**
     * Get AI instructions for a specific post/ad ID
     */
    async getPostConfigByPostId(postId: string) {
        if (!postId) return null;
        const { data, error } = await this.getClient()
            .from('page_post_configs')
            .select('*')
            .eq('post_id', postId)
            .eq('is_active', true)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('[Supabase] Error fetching post config:', error.message);
        }
        return data || null;
    }

    /**
     * Get all post/ad configs for a page (for settings UI)
     */
    async getPostConfigsByPageId(pageId: string) {
        const { data, error } = await this.getClient()
            .from('page_post_configs')
            .select('*')
            .eq('page_id', pageId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Supabase] Error fetching post configs:', error.message);
            return [];
        }
        return data || [];
    }

    /**
     * Create a new post/ad config
     */
    async createPostConfig(data: { pageId: string; postId: string; label?: string; aiInstructions: string }) {
        const { data: created, error } = await this.getClient()
            .from('page_post_configs')
            .insert({
                page_id: data.pageId,
                post_id: data.postId,
                label: data.label,
                ai_instructions: data.aiInstructions,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;
        return created;
    }

    /**
     * Update an existing post/ad config
     */
    async updatePostConfig(id: string, data: { label?: string; postId?: string; aiInstructions?: string; isActive?: boolean }) {
        const updates: any = { updated_at: new Date().toISOString() };
        if (data.label !== undefined) updates.label = data.label;
        if (data.postId !== undefined) updates.post_id = data.postId;
        if (data.aiInstructions !== undefined) updates.ai_instructions = data.aiInstructions;
        if (data.isActive !== undefined) updates.is_active = data.isActive;

        const { data: updated, error } = await this.getClient()
            .from('page_post_configs')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return updated;
    }

    /**
     * Delete a post/ad config
     */
    async deletePostConfig(id: string) {
        const { error } = await this.getClient()
            .from('page_post_configs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
}

export const supabaseService = new SupabaseService();

