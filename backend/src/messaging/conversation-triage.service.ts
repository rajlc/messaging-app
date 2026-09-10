import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { supabaseService } from '../supabase/supabase.service';
import { SettingsService } from '../settings/settings.service';

export interface ImportantPoint {
    type: 'phone' | 'address' | 'order' | 'issue' | 'inquiry' | 'human_help' | 'general';
    label: string;
    value: string;
    urgency?: 'normal' | 'medium' | 'high';
}

export interface OrderAnalysisItem {
    name: string;
    quantity?: number;
    price?: number | string;
    notes?: string;
}

export interface OrderAnalysis {
    phone?: string;
    phones?: string[];
    address?: string;
    confirmed_products?: OrderAnalysisItem[];
    product_price?: number | string;
    ai_quoted_price?: number | string;
    delivery_charge?: string;
    total_amount?: number | string;
    order_notes?: string;
}

export interface ConversationTriageResult {
    status: 'order_confirmed' | 'urgent_issue' | 'item_inquiry' | 'resolved' | 'normal';
    urgency: 'low' | 'medium' | 'high';
    important_points: ImportantPoint[];
    order_analysis?: OrderAnalysis;
    ai_action_summary: string;
    customer_current_intent: string;
    suggested_action: string;
    analyzed_at: string;
}

@Injectable()
export class ConversationTriageService {
    private readonly logger = new Logger(ConversationTriageService.name);

    constructor(private readonly settingsService: SettingsService) { }

    /**
     * Get persisted triage state for a conversation
     */
    async getConversationTriage(conversationId: string): Promise<ConversationTriageResult | null> {
        try {
            const raw = await this.settingsService.getSetting(`conv_triage_${conversationId}`);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    /**
     * Mark a conversation inquiry/issue as solved/done
     */
    async resolveConversation(conversationId: string): Promise<ConversationTriageResult> {
        const existing = await this.getConversationTriage(conversationId);
        const resolvedResult: ConversationTriageResult = {
            status: 'resolved',
            urgency: 'low',
            important_points: existing?.important_points || [],
            order_analysis: existing?.order_analysis,
            ai_action_summary: existing?.ai_action_summary || 'Conversation marked as resolved.',
            customer_current_intent: 'Issue or order inquiry has been handled by the team.',
            suggested_action: 'No further action required unless customer messages again.',
            analyzed_at: new Date().toISOString()
        };

        await this.settingsService.setSetting(`conv_triage_${conversationId}`, JSON.stringify(resolvedResult));
        return resolvedResult;
    }

    /**
     * Fast regex & keyword extraction for contact, address, prices, delivery fee, and urgent damage keywords
     */
    private extractLocalSignals(messages: Array<{ text: string; sender: string }>): {
        phones: string[];
        addresses: string[];
        damageAlerts: string[];
        orderKeywords: string[];
        detectedPrices: string[];
        deliveryCharge: string | null;
        confirmedItems: string[];
    } {
        const phones: string[] = [];
        const addresses: string[] = [];
        const damageAlerts: string[] = [];
        const orderKeywords: string[] = [];
        const detectedPrices: string[] = [];
        let deliveryCharge: string | null = null;
        const confirmedItems: string[] = [];

        const phoneRegex = /(?:\+?977[- ]?)?(?:98\d{8}|97\d{8}|01[- ]?\d{7})/g;
        const priceRegex = /(?:Rs\.?|NPR|रु\.?)\s*([0-9,]+)/gi;
        const addressKeywords = [
            'kathmandu', 'lalitpur', 'bhaktapur', 'pokhara', 'butwal', 'dharan', 'biratnagar',
            'chitwan', 'narayangarh', 'hetauda', 'nepalgunj', 'itahari', 'damak', 'birtamod',
            'tole', 'chowk', 'marga', 'bazar', 'bazaar', 'galli', 'ward', 'balaju', 'koteshwor',
            'baneshwor', 'chabahil', 'kalanki', 'gongabu', 'thamel', 'bouddha', 'satdobato',
            'lagankhel', 'kumaripati', 'thapathali', 'tripureshwor', 'maharajgunj', 'lazimpat',
            'samakhusi', 'balkhu', 'swayambhu', 'jadibuti', 'pepsicola', 'sanothimi', 'suryabinayak',
            'thimi', 'teku', 'kalimati'
        ];
        const damageKeywords = [
            'damage', 'damaze', 'bigreko', 'bigryo', 'broken', 'not working', 'switch on vayena',
            'on nai vayena', 'on bhayena', 'chalena', 'futeko', 'futecha', 'wrong item', 'wrong saman',
            'fernu paryo', 'change gardinu', 'exchange', 'refund', 'return garnu', 'dhilo vayo',
            'dhila vayo', 'aayena', 'kaha pugyo'
        ];
        const cancelKeywords = [
            'cancel', 'cancelled', 'canceled', 'chahiyena', 'pardaina', 'cancel gardinu', 'napaathau', 'arkai saman'
        ];

        // Process from newest to oldest to guarantee top priority for the latest messages
        const reversed = [...messages].reverse();
        let cancellationDetected = false;

        for (const msg of reversed) {
            const text = msg.text || '';
            const lower = text.toLowerCase();

            // Detect if a cancellation occurred in recent messages
            if (msg.sender === 'customer' && cancelKeywords.some(kw => lower.includes(kw))) {
                cancellationDetected = true;
            }

            // Phone extraction
            const foundPhones = text.match(phoneRegex);
            if (foundPhones) {
                for (const p of foundPhones) {
                    let clean = p.replace(/[\s\-\(\)]/g, '');
                    if (clean.startsWith('+977')) clean = clean.slice(4);
                    else if (clean.startsWith('977') && clean.length > 10) clean = clean.slice(3);
                    if (clean && !phones.includes(clean)) {
                        phones.push(clean);
                    }
                }
            }

            // Delivery charge signals (prioritize latest)
            if (!deliveryCharge) {
                if (lower.includes('delivery charge') || lower.includes('delivery fee') || lower.includes('delivery chai')) {
                    if (lower.includes('free') || lower.includes('pardaina') || lower.includes('lagdaina')) {
                        deliveryCharge = 'Free Delivery';
                    } else {
                        const dcMatch = text.match(/(?:delivery|charge|fee)[^\d]*(\d{2,4})/i);
                        if (dcMatch) {
                            deliveryCharge = `Rs. ${dcMatch[1]}`;
                        }
                    }
                } else if (lower.includes('free delivery') || lower.includes('free nai vayo') || lower.includes('free shipping')) {
                    deliveryCharge = 'Free Delivery';
                }
            }

            // Price mentions (latest first)
            let priceMatch: RegExpExecArray | null;
            const priceRegexLocal = /(?:Rs\.?|NPR|रु\.?)\s*([0-9,]+)/gi;
            while ((priceMatch = priceRegexLocal.exec(text)) !== null) {
                const formatted = `Rs. ${priceMatch[1]}`;
                // Avoid treating delivery fee (e.g. Rs. 80, Rs. 100) as product price if it matches delivery charge
                const isDeliveryAmount = deliveryCharge && deliveryCharge.includes(priceMatch[1]);
                if (!isDeliveryAmount && !detectedPrices.includes(formatted)) {
                    detectedPrices.push(formatted);
                }
            }

            // Product highlight detection in markdown **Product** or explicit names
            const boldProductMatches = text.match(/\*\*([^*]+)\*\*/g);
            if (boldProductMatches) {
                for (const bpm of boldProductMatches) {
                    const cleanName = bpm.replace(/\*\*/g, '').trim();
                    if (cleanName.length > 2 && cleanName.length < 65 && !confirmedItems.includes(cleanName)) {
                        // If an order cancellation was said after this product, don't treat it as active
                        if (!cancellationDetected || confirmedItems.length === 0) {
                            confirmedItems.push(cleanName);
                        }
                    }
                }
            }

            // Customer specific signals
            if (msg.sender === 'customer') {
                // Address match
                for (const kw of addressKeywords) {
                    if (lower.includes(kw) && !addresses.some(a => a.toLowerCase().includes(kw))) {
                        const lines = text.split('\n');
                        const matchingLine = lines.find(l => l.toLowerCase().includes(kw));
                        if (matchingLine && matchingLine.trim().length < 80) {
                            addresses.push(matchingLine.trim());
                        } else {
                            addresses.push(kw.charAt(0).toUpperCase() + kw.slice(1));
                        }
                        break;
                    }
                }

                // Damage / Defect match
                for (const dkw of damageKeywords) {
                    if (lower.includes(dkw) && !damageAlerts.includes(dkw)) {
                        damageAlerts.push(text.length < 80 ? text.trim() : `${text.slice(0, 77)}...`);
                        break;
                    }
                }

                // Order confirmation intent
                if (lower.includes('confirm') || lower.includes('pathaidinu') || lower.includes('pathaunu') || lower.includes('order garnu') || lower.includes('linchu') || lower.includes('lignu') || lower.includes('sangai')) {
                    if (!orderKeywords.includes('Customer requested order confirmation')) {
                        orderKeywords.push('Customer requested delivery / confirmed order');
                    }
                }
            }
        }

        return { phones, addresses, damageAlerts, orderKeywords, detectedPrices, deliveryCharge, confirmedItems };
    }

    /**
     * Analyze conversation messages and generate structured intelligence summary
     */
    async analyzeConversation(conversationId: string, messages?: any[]): Promise<ConversationTriageResult> {
        // 1. Fetch recent messages if not provided
        let msgList = messages;
        if (!msgList || msgList.length === 0) {
            msgList = await supabaseService.getLastMessages(conversationId, 25);
        }

        if (!msgList || msgList.length === 0) {
            return {
                status: 'normal',
                urgency: 'low',
                important_points: [],
                ai_action_summary: 'No messages exchanged yet.',
                customer_current_intent: 'Waiting for customer interaction.',
                suggested_action: 'None.',
                analyzed_at: new Date().toISOString()
            };
        }

        // 1.5. Retrieve real customer phone number, address and structured order history
        const pastPhones: string[] = [];
        let pastAddress: string | null = null;
        const activeUnshippedOrders: any[] = [];
        const cancelledOrders: any[] = [];
        const deliveredOrders: any[] = [];

        try {
            const { data: conv } = await supabaseService.getClient()
                .from('conversations')
                .select('customer_id, metadata')
                .or(`id.eq.${conversationId},customer_id.eq.${conversationId}`)
                .limit(1)
                .maybeSingle();

            const customerId = conv?.customer_id;
            let ordersQuery = supabaseService.getClient()
                .from('orders')
                .select('id, order_number, order_status, items, total_amount, phone_number, alternative_phone, address, delivery_address, created_at')
                .order('created_at', { ascending: false })
                .limit(10);

            if (customerId && conversationId && customerId !== conversationId) {
                ordersQuery = ordersQuery.or(`customer_id.eq.${customerId},conversation_id.eq.${conversationId}`);
            } else if (customerId) {
                ordersQuery = ordersQuery.or(`customer_id.eq.${customerId},conversation_id.eq.${customerId}`);
            } else {
                ordersQuery = ordersQuery.or(`conversation_id.eq.${conversationId},customer_id.eq.${conversationId}`);
            }

            const { data: pastOrders } = await ordersQuery;
            if (pastOrders && pastOrders.length > 0) {
                const phoneRegex = /(?:98\d{8}|97\d{8}|01\d{7})/;
                for (const ord of pastOrders) {
                    const status = String(ord.order_status || '').toLowerCase().trim();
                    if (['pending', 'packed', 'ready_to_ship', 'ready to ship', 'new', 'confirmed'].includes(status)) {
                        activeUnshippedOrders.push(ord);
                    } else if (['cancelled', 'canceled', 'rejected'].includes(status)) {
                        cancelledOrders.push(ord);
                    } else if (['delivered', 'completed', 'shipped'].includes(status)) {
                        deliveredOrders.push(ord);
                    }

                    const candidatePhones = [ord.phone_number, ord.alternative_phone];
                    for (const cp of candidatePhones) {
                        if (!cp) continue;
                        const cleanCp = String(cp).trim();
                        const digits = cleanCp.replace(/[\s\-\(\)]/g, '').replace(/^(?:\+?977)/, '');
                        const m = digits.match(phoneRegex);
                        const norm = m ? m[0] : (digits.length >= 8 && digits.length <= 10 ? digits : null);
                        if (norm && !pastPhones.includes(norm)) {
                            pastPhones.push(norm);
                        }
                    }
                    if (!pastAddress && (ord.address || ord.delivery_address)) {
                        pastAddress = ord.address || ord.delivery_address;
                    }
                }
            }
        } catch (dbErr: any) {
            this.logger.warn(`Could not fetch past customer orders for triage: ${dbErr.message}`);
        }

        // Build structured order history context for intelligence prompt
        let orderHistoryContext = '';
        if (activeUnshippedOrders.length > 0) {
            orderHistoryContext += `\n[OPEN / UNSHIPPED ORDERS IN STORE (Pending/Packed/Ready to Ship)]: ` +
                activeUnshippedOrders.map(o => `Order #${o.order_number} (${o.order_status}) - Total: Rs. ${o.total_amount || 0} - Items: ${(o.items || []).map((it: any) => `${it.product_name || it.name} (x${it.qty || 1})`).join(', ')}`).join('\n') +
                `\n(PRIORITY INSTRUCTION: This order is still in our store and NOT yet shipped. If customer wants to add another product, change address, or confirm delivery, PRIORITIZE this active open order!)`;
        }
        if (cancelledOrders.length > 0) {
            orderHistoryContext += `\n[CANCELLED ORDERS - COMPLETELY IGNORE THESE PRODUCTS]: ` +
                cancelledOrders.map(o => `Order #${o.order_number} (Cancelled): ${(o.items || []).map((it: any) => `${it.product_name || it.name}`).join(', ')}`).join('; ') +
                `\n(CRITICAL: The items in cancelled orders are NOT what the customer is buying. NEVER put cancelled products into confirmed_products).`;
        }
        if (deliveredOrders.length > 0) {
            orderHistoryContext += `\n[PAST DELIVERED ORDERS]: ` +
                deliveredOrders.map(o => `Order #${o.order_number} (Delivered): ${(o.items || []).map((it: any) => `${it.product_name || it.name}`).join(', ')}`).join('; ') +
                `\n(NOTE: Only refer to delivered orders if customer reports product damage/defect or asks for refund/exchange. If customer is asking for a new purchase, ignore delivered items and focus 100% on the new item requested).`;
        }

        // 2. Extract deterministic local signals (Phone, Address, Damage keywords, Prices)
        const simplified = msgList.map(m => ({
            sender: m.sender || (m.isOwnMessage ? 'agent' : 'customer'),
            text: m.text || ''
        }));

        const localSignals = this.extractLocalSignals(simplified);

        // 3. Call Fast LLM (Gemini or OpenAI) for intelligence synthesis if enabled in settings
        const isChatSummaryEnabled = (await this.settingsService.getSetting('is_chat_summary_enabled')) !== 'false';

        let triageResult: ConversationTriageResult | null = null;
        if (isChatSummaryEnabled) {
            try {
                triageResult = await this.callAiSummarizer(simplified, localSignals, pastPhones, pastAddress, orderHistoryContext);
            } catch (err: any) {
                this.logger.warn(`AI Summarizer call failed, using fallback rules: ${err.message}`);
            }
        } else {
            this.logger.log(`[Triage] Message Chat Summary is disabled in Global Settings to conserve AI tokens/budget. Skipping AI provider call.`);
        }

        // 4. If AI disabled or failed, use deterministic fallback
        if (!triageResult) {
            triageResult = this.generateDeterministicFallback(localSignals, simplified, pastPhones, pastAddress);
            if (!isChatSummaryEnabled) {
                triageResult.ai_action_summary = 'AI Chat Summary is paused in Global Settings to reduce token consumption. Customer phone, address, and order signals were extracted locally without AI cost.';
            }
        }

        // 4.5. If confirmed product detected, sync to conversation table so UI headers/lists update immediately
        try {
            const latestConfirmedName = triageResult?.order_analysis?.confirmed_products?.[0]?.name;
            const latestPrice = triageResult?.order_analysis?.product_price || triageResult?.order_analysis?.ai_quoted_price;
            if (latestConfirmedName && conversationId) {
                await supabaseService.getClient()
                    .from('conversations')
                    .update({
                        product_name: latestConfirmedName,
                        product_price: latestPrice ? String(latestPrice) : undefined
                    })
                    .or(`id.eq.${conversationId},customer_id.eq.${conversationId}`);
            }
        } catch (syncErr: any) {
            this.logger.warn(`Could not sync updated product_name to conversation: ${syncErr.message}`);
        }

        // 5. Cache result in settings table
        try {
            await this.settingsService.setSetting(`conv_triage_${conversationId}`, JSON.stringify(triageResult));
        } catch (err: any) {
            this.logger.error(`Failed to save triage result: ${err.message}`);
        }

        return triageResult;
    }

    /**
     * Call AI API with structured JSON output for conversation intelligence & order analysis
     */
    private async callAiSummarizer(
        messages: Array<{ sender: string; text: string }>,
        localSignals: ReturnType<typeof this.extractLocalSignals>,
        pastPhones: string[] = [],
        pastAddress: string | null = null,
        orderHistoryContext: string = ''
    ): Promise<ConversationTriageResult | null> {
        const geminiKey = await this.settingsService.getSetting('gemini_api_key');
        const openaiKey = await this.settingsService.getSetting('openai_api_key');

        const transcript = messages.slice(-25).map(m => `${m.sender.toUpperCase()}: ${m.text}`).join('\n');
        const userPromptText = `Transcript of recent messages (earlier to LATEST at bottom):\n${transcript}\n\n` +
            (pastPhones.length > 0 ? `Customer Contact on file: ${pastPhones.join(', ')}\n` : '') +
            (pastAddress ? `Customer Delivery Address on file: ${pastAddress}\n` : '') +
            (orderHistoryContext ? `${orderHistoryContext}\n` : '') +
            `\nREMINDER: Focus heavily on the LATEST messages at the bottom of the transcript. Determine what product the customer wants RIGHT NOW. Do not output cancelled or old order items.`;

        const systemPrompt = `You are an expert e-commerce CRM intelligence assistant for a Nepali online retail store.
Analyze the customer chat transcript and output a JSON object classifying the conversation, summarizing the dialogue, and extracting all order/pricing details.

=== STRICT RECENCY & PRODUCT PRIORITIZATION RULES (HIGHEST PRIORITY) ===
1. LATEST PRODUCT INQUIRY WINS:
   - Customers have continuous chat histories where older products were discussed or bought weeks/days ago.
   - If earlier in the chat the customer inquired about or cancelled Product A (e.g., Electric Jug), and in the LATEST messages the customer is asking about or confirming Product B (e.g., "Drawing book 2 pc"), YOUR ENTIRE OUTPUT MUST FOCUS 100% ON PRODUCT B!
   - "confirmed_products" MUST ONLY contain the latest product (Drawing book 2 pcs). NEVER output the old product.
2. ORDER HISTORY CONTEXT RULES:
   - "Pending", "Packed", or "Ready to Ship" orders: These are open unshipped orders. If the customer wants to add another product to their open order, prioritize this active order and note the addition.
   - "Cancelled" orders: Completely SKIP and IGNORE. Never include cancelled products in "confirmed_products".
   - "Delivered" orders: Only prioritize if the customer is reporting damage, defect, or asking for exchange/refund. If they want to buy something new, treat it as a fresh new purchase and ignore past delivered products.
3. ACCURATE PRICING & SUMMARY:
   - "confirmed_products": Specific product name(s) and quantity customer agreed to buy in the LATEST messages (e.g. Reusable Drawing Book for Kids, quantity: 2).
   - "product_price": Price of the latest item(s) discussed (e.g. Rs. 380 or Rs. 760 for 2 pcs).
   - "ai_quoted_price": The latest price quoted by AI/agent in chat.
   - "delivery_charge": Current delivery charge quoted (e.g. Rs. 80, or Free Delivery).
   - "ai_action_summary": 2-3 sentences strictly describing what was discussed in the LATEST messages, the new product requested/confirmed, and delivery status.
   - "customer_current_intent": 1 sentence describing what the customer wants RIGHT NOW based on their latest messages.

Return valid JSON with this EXACT structure:
{
  "status": "order_confirmed" | "urgent_issue" | "item_inquiry" | "normal",
  "urgency": "low" | "medium" | "high",
  "important_points": [
    {
      "type": "phone" | "address" | "order" | "issue" | "inquiry" | "human_help",
      "label": "Short label (e.g. Phone Number, Delivery Address, Confirmed Items, Defect Reported, Product Inquiry)",
      "value": "Exact captured details or description",
      "urgency": "normal" | "medium" | "high"
    }
  ],
  "order_analysis": {
    "phone": "Extracted customer phone number or null if not mentioned in chat",
    "address": "Extracted delivery location or full address, or null if not mentioned",
    "confirmed_products": [
      {
        "name": "Specific product name customer wants/confirmed in LATEST messages",
        "quantity": 1,
        "price": "Price of this item, e.g. Rs. 380",
        "notes": "Optional notes, e.g. 2 pcs or merge with open order"
      }
    ],
    "product_price": "Subtotal or item price from latest inquiry, e.g. Rs. 380",
    "ai_quoted_price": "Total price quoted by AI/agent in chat, e.g. Rs. 460",
    "delivery_charge": "Delivery fee status or amount mentioned, e.g. Rs. 80 or Free Delivery",
    "total_amount": "Final grand total payable by customer, e.g. Rs. 460",
    "order_notes": "Key logistics or customer instructions (e.g. deliver to Balaju)"
  },
  "ai_action_summary": "Comprehensive 2-3 sentence summary of the LATEST dialogue, current product, and delivery confirmation.",
  "customer_current_intent": "1 sentence summarizing what the customer wants right now.",
  "suggested_action": "1 concrete recommended action for human store staff (e.g. Confirm and pack Drawing Book order for Balaju dispatch)."
}

Classification Rules:
1. "urgent_issue" (HIGHEST PRIORITY): If customer reports damaged goods, defect, wrong product, delivery complaint, asks for refund/exchange, or requests human agent.
2. "order_confirmed": If customer provided contact/address or confirmed they want to purchase/receive an item or merge an existing order.
3. "item_inquiry": If customer is asking for price, product details, or inquiring about an item not in store.
4. "normal": General greetings, chit-chat, or questions already answered with no pending action.`;

        if (geminiKey) {
            const configuredModel = (await this.settingsService.getSetting('gemini_model')) || 'gemini-flash-latest';
            // Models to attempt in order of preference
            const modelsToTry = [...new Set([
                configuredModel,
                'gemini-flash-latest',
                'gemini-2.0-flash',
                'gemini-1.5-flash',
                'gemini-3.5-flash-lite'
            ])];

            for (const modelName of modelsToTry) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
                    const body = {
                        contents: [{ role: 'user', parts: [{ text: userPromptText }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                        generationConfig: {
                            maxOutputTokens: 900,
                            temperature: 0.2,
                            responseMimeType: 'application/json'
                        }
                    };

                    const res = await axios.post(url, body, {
                        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
                        timeout: 12000
                    });

                    const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        return this.validateAndNormalizeTriage(parsed, localSignals, pastPhones, pastAddress);
                    }
                } catch (err: any) {
                    this.logger.warn(`[Triage] Gemini model ${modelName} failed (${err.message}). Trying fallback model if available...`);
                }
            }
        } else if (openaiKey) {
            const res = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPromptText }
                    ],
                    response_format: { type: 'json_object' },
                    max_tokens: 900,
                    temperature: 0.2
                },
                {
                    headers: { Authorization: `Bearer ${openaiKey}` },
                    timeout: 15000
                }
            );

            const raw = res.data?.choices?.[0]?.message?.content;
            if (raw) {
                const parsed = JSON.parse(raw);
                return this.validateAndNormalizeTriage(parsed, localSignals, pastPhones, pastAddress);
            }
        }

        return null;
    }

    /**
     * Validate AI output and merge with high-confidence local regex signals
     */
    private validateAndNormalizeTriage(
        parsed: any,
        localSignals: ReturnType<typeof this.extractLocalSignals>,
        pastPhones: string[] = [],
        pastAddress: string | null = null
    ): ConversationTriageResult {
        const points: ImportantPoint[] = Array.isArray(parsed.important_points) ? parsed.important_points : [];
        let orderAnalysis: OrderAnalysis | undefined = parsed.order_analysis;
        if (!orderAnalysis && (localSignals.phones.length > 0 || localSignals.addresses.length > 0 || localSignals.detectedPrices.length > 0 || pastPhones.length > 0)) {
            orderAnalysis = {};
        }

        // Helper to detect placeholder phone text without real phone numbers
        const isPlaceholderPhone = (val: string): boolean => {
            const lower = val.toLowerCase();
            return (
                (lower.includes('already') || lower.includes('previous') || lower.includes('record') || lower.includes('available') || lower.includes('on file')) &&
                !/(?:98\d{8}|97\d{8}|01\d{7})/.test(val)
            );
        };

        // 1. Gather all phone candidates from AI and local regex
        const candidatePhoneTexts: string[] = [];
        if (orderAnalysis?.phone && !isPlaceholderPhone(String(orderAnalysis.phone))) {
            candidatePhoneTexts.push(String(orderAnalysis.phone));
        }
        if (Array.isArray(orderAnalysis?.phones)) {
            for (const p of orderAnalysis.phones) {
                if (!isPlaceholderPhone(String(p))) candidatePhoneTexts.push(String(p));
            }
        }
        for (const pt of points) {
            if (pt.type === 'phone' && pt.value && !isPlaceholderPhone(String(pt.value))) {
                candidatePhoneTexts.push(String(pt.value));
            }
        }
        candidatePhoneTexts.push(...localSignals.phones);

        // Normalize and extract unique phone numbers
        const distinctPhones: string[] = [];
        const phoneRegex = /(?:98\d{8}|97\d{8}|01\d{7})/g;
        for (const text of candidatePhoneTexts) {
            const cleanText = text.replace(/[\s\-\(\)]/g, '').replace(/^(?:\+?977)/, '');
            const matches = cleanText.match(phoneRegex);
            if (matches) {
                for (const m of matches) {
                    if (!distinctPhones.includes(m)) distinctPhones.push(m);
                }
            } else {
                const digits = text.replace(/\D/g, '');
                const norm = digits.startsWith('977') && digits.length > 10 ? digits.slice(3) : digits;
                if ((norm.length === 10 || norm.length === 9 || norm.length === 8) && !distinctPhones.includes(norm)) {
                    distinctPhones.push(norm);
                }
            }
        }

        // If no phone was extracted from chat messages, but customer has phone number on file from past orders:
        if (distinctPhones.length === 0 && pastPhones.length > 0) {
            for (const p of pastPhones) {
                if (!distinctPhones.includes(p)) distinctPhones.push(p);
            }
        }

        // 2. Format phone points
        const nonPhonePoints = points.filter(p => p.type !== 'phone');
        const phonePoints: ImportantPoint[] = [];

        if (distinctPhones.length === 1) {
            phonePoints.push({
                type: 'phone',
                label: 'Phone Number',
                value: distinctPhones[0],
                urgency: 'normal'
            });
        } else if (distinctPhones.length > 1) {
            distinctPhones.forEach((ph, idx) => {
                phonePoints.push({
                    type: 'phone',
                    label: idx === 0 ? 'Primary Phone Number' : `Alternative Phone (${idx + 1})`,
                    value: ph,
                    urgency: 'normal'
                });
            });
        }

        const finalPoints: ImportantPoint[] = [...phonePoints, ...nonPhonePoints];

        // Ensure detected address is present in points
        if (localSignals.addresses.length > 0 && !finalPoints.some(p => p.type === 'address')) {
            finalPoints.push({
                type: 'address',
                label: 'Delivery Location',
                value: localSignals.addresses[0],
                urgency: 'normal'
            });
        } else if (pastAddress && !finalPoints.some(p => p.type === 'address')) {
            finalPoints.push({
                type: 'address',
                label: 'Delivery Location (on file)',
                value: pastAddress,
                urgency: 'normal'
            });
        }

        // If local signals detected damage, force status to urgent_issue
        let status = parsed.status || 'normal';
        let urgency = parsed.urgency || 'low';

        if (localSignals.damageAlerts.length > 0) {
            status = 'urgent_issue';
            urgency = 'high';
            if (!finalPoints.some(p => p.type === 'issue')) {
                finalPoints.unshift({
                    type: 'issue',
                    label: 'Reported Issue / Defect',
                    value: localSignals.damageAlerts[0],
                    urgency: 'high'
                });
            }
        }

        if (orderAnalysis) {
            if (distinctPhones.length > 0) {
                orderAnalysis.phone = distinctPhones.join(', ');
                orderAnalysis.phones = distinctPhones;
            } else if (pastPhones.length > 0) {
                orderAnalysis.phone = pastPhones.join(', ');
                orderAnalysis.phones = pastPhones;
            } else if (orderAnalysis.phone && isPlaceholderPhone(orderAnalysis.phone)) {
                orderAnalysis.phone = undefined;
                orderAnalysis.phones = undefined;
            }

            if (!orderAnalysis.address) {
                if (localSignals.addresses.length > 0) {
                    orderAnalysis.address = localSignals.addresses[0];
                } else if (pastAddress) {
                    orderAnalysis.address = pastAddress;
                }
            }
            if (!orderAnalysis.delivery_charge && localSignals.deliveryCharge) {
                orderAnalysis.delivery_charge = localSignals.deliveryCharge;
            }
            if (!orderAnalysis.ai_quoted_price && localSignals.detectedPrices.length > 0) {
                orderAnalysis.ai_quoted_price = localSignals.detectedPrices[0];
            }
        }

        return {
            status,
            urgency,
            important_points: finalPoints,
            order_analysis: orderAnalysis,
            ai_action_summary: parsed.ai_action_summary || 'AI answered customer inquiries and quoted product details.',
            customer_current_intent: parsed.customer_current_intent || 'Customer sent messages.',
            suggested_action: parsed.suggested_action || 'Review chat thread.',
            analyzed_at: new Date().toISOString()
        };
    }

    /**
     * Fallback when external AI API is unreachable
     */
    private generateDeterministicFallback(
        localSignals: ReturnType<typeof this.extractLocalSignals>,
        messages: Array<{ sender: string; text: string }>,
        pastPhones: string[] = [],
        pastAddress: string | null = null
    ): ConversationTriageResult {
        const points: ImportantPoint[] = [];

        const distinctPhones: string[] = [];
        for (const p of localSignals.phones) {
            if (!distinctPhones.includes(p)) distinctPhones.push(p);
        }
        if (distinctPhones.length === 0 && pastPhones.length > 0) {
            for (const p of pastPhones) {
                if (!distinctPhones.includes(p)) distinctPhones.push(p);
            }
        }

        if (distinctPhones.length === 1) {
            points.push({
                type: 'phone',
                label: 'Phone Number',
                value: distinctPhones[0]
            });
        } else if (distinctPhones.length > 1) {
            distinctPhones.forEach((p, idx) => {
                points.push({
                    type: 'phone',
                    label: idx === 0 ? 'Primary Phone Number' : `Alternative Phone (${idx + 1})`,
                    value: p
                });
            });
        }

        const resolvedAddress = localSignals.addresses[0] || pastAddress || undefined;
        if (resolvedAddress) {
            points.push({
                type: 'address',
                label: 'Delivery Address',
                value: resolvedAddress
            });
        }

        const fallbackOrderAnalysis: OrderAnalysis = {
            phone: distinctPhones.length > 0 ? distinctPhones.join(', ') : undefined,
            phones: distinctPhones.length > 0 ? distinctPhones : undefined,
            address: resolvedAddress,
            confirmed_products: localSignals.confirmedItems.length > 0
                ? localSignals.confirmedItems.map(item => ({ name: item, quantity: 1 }))
                : undefined,
            product_price: localSignals.detectedPrices.length > 0 ? localSignals.detectedPrices[0] : undefined,
            ai_quoted_price: localSignals.detectedPrices.length > 0 ? localSignals.detectedPrices[0] : undefined,
            delivery_charge: localSignals.deliveryCharge || undefined,
            total_amount: localSignals.detectedPrices.length > 0 ? localSignals.detectedPrices[0] : undefined,
            order_notes: localSignals.orderKeywords.join(', ') || undefined
        };

        if (localSignals.damageAlerts.length > 0) {
            points.unshift({
                type: 'issue',
                label: 'Defect / Complaint Alert',
                value: localSignals.damageAlerts[0],
                urgency: 'high'
            });
            return {
                status: 'urgent_issue',
                urgency: 'high',
                important_points: points,
                order_analysis: fallbackOrderAnalysis,
                ai_action_summary: 'Customer reported an issue, damage, or defect with product. AI flagged for immediate human team inspection.',
                customer_current_intent: 'Customer requested replacement, exchange, or store help.',
                suggested_action: 'Urgent human staff follow-up required.',
                analyzed_at: new Date().toISOString()
            };
        }

        if (localSignals.phones.length > 0 || localSignals.orderKeywords.length > 0 || localSignals.addresses.length > 0) {
            return {
                status: 'order_confirmed',
                urgency: 'medium',
                important_points: points,
                order_analysis: fallbackOrderAnalysis,
                ai_action_summary: `Customer and AI discussed delivery details. Customer specified delivery address (${localSignals.addresses[0] || 'on file'}) and requested order dispatch${localSignals.detectedPrices.length > 0 ? ` at quoted price ${localSignals.detectedPrices[0]}` : ''}.`,
                customer_current_intent: 'Confirming order delivery and items.',
                suggested_action: 'Create and confirm customer order.',
                analyzed_at: new Date().toISOString()
            };
        }

        const lastMsg = messages[messages.length - 1]?.text || '';
        return {
            status: lastMsg.includes('?') || lastMsg.toLowerCase().includes('kati') ? 'item_inquiry' : 'normal',
            urgency: 'low',
            important_points: points,
            order_analysis: fallbackOrderAnalysis,
            ai_action_summary: 'Customer inquired about product pricing and availability. AI provided answers.',
            customer_current_intent: 'Browsing or asking questions about products.',
            suggested_action: 'Monitor conversation.',
            analyzed_at: new Date().toISOString()
        };
    }
}

