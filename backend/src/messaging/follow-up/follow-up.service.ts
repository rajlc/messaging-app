import { Injectable, Logger, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { supabaseService } from '../../supabase/supabase.service';
import { SettingsService } from '../../settings/settings.service';
import { AiService } from '../ai.service';
import { FacebookService } from '../facebook.service';
import { MessagingGateway } from '../../socket/messaging.gateway';

export interface FollowUpTemplate {
    status: string;
    instruction: string;
    delay_hours: number;
    is_active: boolean;
    updated_at?: string;
}

export const DEFAULT_FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
    {
        status: 'Delivery Failed',
        delay_hours: 8,
        is_active: true,
        instruction: `You are a warm, courteous customer care executive for our online store. 
The courier partner reported that delivery was unsuccessful for order #{{order_number}}.
Details:
- Product(s): {{product_name}}
- Total Amount: Rs. {{total_amount}}
- Delivery Branch: {{delivery_branch}}
- Courier Remarks: {{courier_remarks}}
- Delivery History Analysis: {{delivery_attempt_summary}}

Your objective:
1. Explain gently to the customer that our courier rider attempted delivery but was unable to reach them or complete the delivery.
2. If this is the first attempt or the parcel just arrived at branch, reassure them that the parcel is safe at their local branch.
3. If the courier remarks mention a specific reason (e.g., unreachable phone, rescheduled by customer, door closed), acknowledge that context politely.
4. Ask them when is the best date/time for a re-delivery attempt or if they need to update an alternative phone number.
5. If the customer already sent a message before, be sure to address what they said.
Keep the tone polite, helpful, and reassuring in conversational Nepali/English mix.`
    },
    {
        status: 'Hold',
        delay_hours: 4,
        is_active: true,
        instruction: `You are a helpful customer care coordinator.
Order #{{order_number}} is currently on HOLD at the courier branch.
Details:
- Product(s): {{product_name}}
- Total Amount: Rs. {{total_amount}}
- Delivery Branch: {{delivery_branch}}
- Courier Remarks: {{courier_remarks}}

Your objective:
1. Inquire warmly with the customer regarding the reason for the hold.
2. Ask if they requested to hold the package until a certain date, or if they need any assistance.
3. Offer to arrange doorstep delivery on their preferred day.
Keep the message concise, respectful, and friendly.`
    },
    {
        status: 'Return Process',
        delay_hours: 2,
        is_active: true,
        instruction: `You are an urgent customer care specialist.
Order #{{order_number}} has been marked for RETURN to warehouse.
Details:
- Product(s): {{product_name}}
- Total Amount: Rs. {{total_amount}}
- Delivery Branch: {{delivery_branch}}
- Courier Remarks: {{courier_remarks}}

Your objective:
1. Politely and urgently inform the customer that their package is about to be sent back to our warehouse.
2. Ask if there was any problem or miscommunication with the delivery rider.
3. Inform them that if they still want their parcel, we can halt the return immediately and coordinate a re-delivery.
4. Request a quick reply so we can take action before the parcel leaves the branch.`
    }
];

@Injectable()
export class FollowUpService implements OnModuleInit {
    private readonly logger = new Logger(FollowUpService.name);
    private checkInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly settingsService: SettingsService,
        private readonly aiService: AiService,
        private readonly facebookService: FacebookService,
        @Inject(forwardRef(() => MessagingGateway))
        private readonly messagingGateway: MessagingGateway
    ) { }

    onModuleInit() {
        // Run initial scan after 10 seconds of startup, then every 5 minutes
        setTimeout(() => {
            this.processPendingRiskOrders().catch(err => 
                this.logger.error(`Error in initial follow-up scan: ${err.message}`)
            );
        }, 10000);

        this.checkInterval = setInterval(() => {
            this.processPendingRiskOrders().catch(err =>
                this.logger.error(`Error in periodic follow-up scan: ${err.message}`)
            );
        }, 5 * 60 * 1000);
    }

    /**
     * Get all follow-up templates (merged with defaults)
     */
    async getTemplates(): Promise<FollowUpTemplate[]> {
        try {
            const raw = await this.settingsService.getSetting('FOLLOW_UP_TEMPLATES');
            let savedTemplates: FollowUpTemplate[] = [];
            if (raw) {
                try {
                    savedTemplates = JSON.parse(raw);
                } catch (e) {
                    this.logger.error('Failed to parse saved follow-up templates JSON', e);
                }
            }

            // Merge with defaults
            const resultMap = new Map<string, FollowUpTemplate>();
            DEFAULT_FOLLOW_UP_TEMPLATES.forEach(t => resultMap.set(t.status, { ...t }));
            savedTemplates.forEach(t => resultMap.set(t.status, { ...t }));

            return Array.from(resultMap.values());
        } catch (error: any) {
            this.logger.error(`Failed to get follow-up templates: ${error.message}`);
            return DEFAULT_FOLLOW_UP_TEMPLATES;
        }
    }

    /**
     * Save/update a single template
     */
    async saveTemplate(dto: { status: string; instruction: string; delay_hours: number; is_active: boolean }): Promise<FollowUpTemplate> {
        const templates = await this.getTemplates();
        const index = templates.findIndex(t => t.status === dto.status);

        const updatedTemplate: FollowUpTemplate = {
            status: dto.status,
            instruction: dto.instruction,
            delay_hours: Number(dto.delay_hours) || 0,
            is_active: dto.is_active,
            updated_at: new Date().toISOString()
        };

        if (index >= 0) {
            templates[index] = updatedTemplate;
        } else {
            templates.push(updatedTemplate);
        }

        await this.settingsService.setSetting('FOLLOW_UP_TEMPLATES', JSON.stringify(templates));
        this.logger.log(`✅ Saved follow-up template for status: ${dto.status} (active: ${dto.is_active}, delay: ${dto.delay_hours}h)`);
        return updatedTemplate;
    }

    /**
     * Check if an order qualifies for AI Follow-up and trigger it
     */
    async triggerFollowUpForOrder(orderId: string, force: boolean = false): Promise<{ success: boolean; reason?: string; message?: string }> {
        try {
            const supabase = supabaseService.getSupabaseClient();

            // 1. Fetch order details
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .select('*')
                .eq('id', orderId)
                .single();

            if (orderErr || !order) {
                return { success: false, reason: 'Order not found' };
            }

            // 2. Must have a risk status
            const riskStatuses = ['Delivery Failed', 'Hold', 'Return Process'];
            if (!riskStatuses.includes(order.order_status)) {
                return { success: false, reason: `Status '${order.order_status}' is not a risk status` };
            }

            // 3. Find template for this status
            const templates = await this.getTemplates();
            const template = templates.find(t => t.status === order.order_status);

            if (!template || (!template.is_active && !force)) {
                return { success: false, reason: `Template for status '${order.order_status}' is inactive or not found` };
            }

            // 4. Must have customer chat contact (customer_id)
            if (!order.customer_id) {
                this.logger.log(`Order #${order.order_number} has no customer_id (placed via call or website guest). Skipping follow-up.`);
                return { success: false, reason: 'No customer_id associated (direct call / guest)' };
            }

            // 5. Fetch order status history for audit trail & remarks
            const { data: histories } = await supabase
                .from('order_status_history')
                .select('*')
                .eq('order_id', orderId)
                .order('changed_at', { ascending: false });

            const historyList = histories || [];

            // Check if AI follow-up was already sent for the current status change
            if (!force) {
                const latestStatusChange = historyList.find(h => h.status === order.order_status);
                const statusChangeTime = latestStatusChange ? new Date(latestStatusChange.changed_at).getTime() : new Date(order.updated_at).getTime();

                const existingAiFollowUp = historyList.find(h => 
                    (h.changed_by === 'AI Recovery Agent' || (h.remarks && h.remarks.includes('AI Follow-up Sent'))) &&
                    new Date(h.changed_at).getTime() >= statusChangeTime
                );

                if (existingAiFollowUp) {
                    this.logger.log(`Order #${order.order_number} already received an AI follow-up for this status.`);
                    return { success: false, reason: 'AI follow-up already sent for current status' };
                }
            }

            // 6. Analyze audit trail & courier remarks
            const courierRemarks = historyList
                .filter(h => h.remarks && !h.remarks.includes('AI Follow-up Sent'))
                .map(h => `${new Date(h.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${h.status}: ${h.remarks}`)
                .slice(0, 5)
                .join('; ') || order.remarks || order.courier_status || 'No specific courier remarks recorded';

            const failedCount = historyList.filter(h => h.status === 'Delivery Failed').length;
            const deliveryAttemptSummary = failedCount <= 1
                ? 'This is the first reported delivery issue for this order.'
                : `Delivery has been reported unsuccessful ${failedCount} times so far.`;

            // 7. Parse product names
            let productNames = 'Item';
            try {
                if (Array.isArray(order.items)) {
                    productNames = order.items.map((i: any) => `${i.product_name || i.name} (Qty: ${i.qty || i.quantity || 1})`).join(', ');
                }
            } catch (e) {
                // fallback
            }

            // 8. Fetch conversation history for chat context
            let recentCustomerMessages: string[] = [];
            let conversationId = order.conversation_id;

            if (!conversationId) {
                const { data: conv } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('customer_id', order.customer_id)
                    .single();
                conversationId = conv?.id;
            }

            if (conversationId) {
                const { data: msgList } = await supabase
                    .from('messages')
                    .select('sender, text, created_at')
                    .eq('conversation_id', conversationId)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (msgList && msgList.length > 0) {
                    recentCustomerMessages = msgList.reverse().map(m => `[${m.sender}]: ${m.text}`);
                }
            }

            // 9. Build Prompt & Generate AI Message
            let promptInstruction = template.instruction;
            promptInstruction = promptInstruction.replace(/{{customer_name}}/g, order.customer_name || 'Customer');
            promptInstruction = promptInstruction.replace(/{{order_number}}/g, order.order_number || '');
            promptInstruction = promptInstruction.replace(/{{total_amount}}/g, String(order.total_amount || '0'));
            promptInstruction = promptInstruction.replace(/{{product_name}}/g, productNames);
            promptInstruction = promptInstruction.replace(/{{delivery_branch}}/g, order.delivery_branch || order.city_name || 'your local branch');
            promptInstruction = promptInstruction.replace(/{{courier_remarks}}/g, courierRemarks);
            promptInstruction = promptInstruction.replace(/{{delivery_attempt_summary}}/g, deliveryAttemptSummary);

            const systemPrompt = `You are an automated, empathetic AI Customer Support Agent for an online store in Nepal.
Your goal is to send a clear, helpful message to the customer regarding their order status.

RULES:
- Return ONLY the exact message text you want to send to the customer. No conversational filler, no quotes around the response, no greetings to the developer.
- Keep the message warm, concise, and helpful (max 3-4 sentences).
- If appropriate, use polite Nepali or friendly English/Nepali mix common in Kathmandu e.g., "Namaste {{customer_name}} ji...".
- Address the customer as ${order.customer_name || 'Customer'}.

${promptInstruction}

CONTEXT DETAILS:
Order Number: ${order.order_number}
Customer: ${order.customer_name}
Products: ${productNames}
Total Amount: Rs. ${order.total_amount}
Branch: ${order.delivery_branch || order.city_name || 'Local courier hub'}
Courier Remarks: ${courierRemarks}
Recent Chat History:
${recentCustomerMessages.length > 0 ? recentCustomerMessages.join('\n') : 'No prior customer chat messages.'}
`;

            this.logger.log(`🤖 Generating AI follow-up for order #${order.order_number} (${order.order_status})...`);

            const aiReply = await this.aiService.generateReply({
                systemPrompt,
                history: [],
                userMessage: `Please formulate the follow-up message to the customer for status "${order.order_status}".`
            });

            if (!aiReply || aiReply.trim().length === 0) {
                this.logger.warn(`AI failed to generate a reply for order #${order.order_number}`);
                return { success: false, reason: 'AI generation returned empty response' };
            }

            const finalMessage = aiReply.trim();
            this.logger.log(`🚀 Sending AI Follow-up to customer ${order.customer_id}: "${finalMessage.substring(0, 80)}..."`);

            // 10. Send message via Facebook / Platform
            await this.facebookService.sendMessage(order.customer_id, finalMessage);

            // 11. Save to conversation messages
            if (conversationId) {
                await supabaseService.saveMessage({
                    conversationId: conversationId,
                    text: finalMessage,
                    sender: 'agent',
                    platform: order.platform || 'facebook'
                });

                this.messagingGateway.broadcastIncomingMessage(order.platform || 'facebook', {
                    text: finalMessage,
                    senderId: order.customer_id,
                    pageId: order.page_id,
                    timestamp: new Date(),
                    sender: 'agent'
                });
            }

            // 12. Record audit trail in order_status_history
            const nowIso = new Date().toISOString();
            await supabase
                .from('order_status_history')
                .insert({
                    order_id: order.id,
                    status: order.order_status,
                    changed_by: 'AI Recovery Agent',
                    remarks: `🤖 AI Follow-up Sent: ${finalMessage}`,
                    changed_at: nowIso
                });

            // Update order updated_at
            await supabase
                .from('orders')
                .update({ updated_at: nowIso })
                .eq('id', order.id);

            // Emit socket event so OrdersView updates without full refresh
            this.messagingGateway.server.emit('orderUpdated', {
                orderId: order.id,
                newStatus: order.order_status,
                aiFollowupSentAt: nowIso
            });

            this.logger.log(`✅ Successfully sent and recorded AI follow-up for order #${order.order_number}`);
            return { success: true, message: finalMessage };

        } catch (error: any) {
            this.logger.error(`Exception in triggerFollowUpForOrder(${orderId}): ${error.message}`);
            return { success: false, reason: error.message };
        }
    }

    /**
     * Periodic worker to scan orders in risk statuses and trigger AI follow-up when delay has elapsed
     */
    async processPendingRiskOrders() {
        try {
            const templates = await this.getTemplates();
            const activeTemplates = templates.filter(t => t.is_active);

            if (activeTemplates.length === 0) {
                return;
            }

            const activeStatuses = activeTemplates.map(t => t.status);
            const supabase = supabaseService.getSupabaseClient();

            // Fetch orders in these statuses updated in the last 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: riskOrders, error } = await supabase
                .from('orders')
                .select('id, order_number, order_status, customer_id, updated_at')
                .in('order_status', activeStatuses)
                .not('customer_id', 'is', null)
                .gte('updated_at', sevenDaysAgo);

            if (error || !riskOrders || riskOrders.length === 0) {
                return;
            }

            const orderIds = riskOrders.map(o => o.id);

            // Fetch histories to check when the status began and if AI message was already sent
            const { data: histories } = await supabase
                .from('order_status_history')
                .select('*')
                .in('order_id', orderIds)
                .order('changed_at', { ascending: false });

            const historyMap = (histories || []).reduce((acc: any, h: any) => {
                if (!acc[h.order_id]) acc[h.order_id] = [];
                acc[h.order_id].push(h);
                return acc;
            }, {});

            const now = Date.now();

            for (const order of riskOrders) {
                const template = activeTemplates.find(t => t.status === order.order_status);
                if (!template) continue;

                const orderHistories: any[] = historyMap[order.id] || [];

                // Find timestamp when this status occurred
                const statusChangeEntry = orderHistories.find(h => h.status === order.order_status);
                const statusChangedAt = statusChangeEntry ? new Date(statusChangeEntry.changed_at).getTime() : new Date(order.updated_at).getTime();

                // Has required delay passed?
                const delayMs = (template.delay_hours || 0) * 60 * 60 * 1000;
                if (now - statusChangedAt < delayMs) {
                    continue; // Still waiting for delay timer
                }

                // Check if already sent
                const alreadySent = orderHistories.some(h => 
                    (h.changed_by === 'AI Recovery Agent' || (h.remarks && h.remarks.includes('AI Follow-up Sent'))) &&
                    new Date(h.changed_at).getTime() >= statusChangedAt
                );

                if (alreadySent) {
                    continue;
                }

                // Eligible! Trigger follow-up
                this.logger.log(`⏰ Delay elapsed for order #${order.order_number} (${order.order_status}, delay: ${template.delay_hours}h). Triggering AI follow-up...`);
                await this.triggerFollowUpForOrder(order.id);
            }

        } catch (error: any) {
            this.logger.error(`Error in processPendingRiskOrders: ${error.message}`);
        }
    }
}
