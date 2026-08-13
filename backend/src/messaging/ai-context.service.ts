import { supabaseService } from '../supabase/supabase.service';

/**
 * AI Context Service
 * Composes a 3-layer system prompt for every customer message:
 *   1. Post/Ad-level instructions (highest priority — if customer came via a post/ad)
 *   2. Page-level instructions (always included as base)
 *   3. Customer order context (auto-injected when customer has orders)
 */
export class AiContextService {

    // Keywords that suggest a customer is asking about an order
    private readonly ORDER_KEYWORDS = [
        'order', 'my order', 'where is', 'order status', 'delivery', 'shipped',
        'parcel', 'track', 'tracking', 'arrived', 'deliver', 'package',
        'what did i buy', 'what did i order', 'mero order', 'order kaha',
        'order check', 'order details', 'receipt', 'bill', 'payment',
        'cancel', 'return', 'refund', 'exchange'
    ];

    /**
     * Detect if the customer message is about an order
     */
    private isOrderRelated(message: string): boolean {
        const lower = message.toLowerCase();
        return this.ORDER_KEYWORDS.some(kw => lower.includes(kw));
    }

    /**
     * Format order data into a readable context string for the AI
     */
    private formatOrderContext(orders: any[]): string {
        if (!orders || orders.length === 0) return '';

        const lines: string[] = [
            '=== CUSTOMER ORDER HISTORY ===',
            'The customer has the following order(s) in our system. Use this data to answer questions about their orders accurately.',
            ''
        ];

        orders.forEach((order, idx) => {
            const date = new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
            lines.push(`Order ${idx + 1}:`);
            lines.push(`  Order Number : #${order.order_number}`);
            lines.push(`  Status       : ${order.order_status}`);
            lines.push(`  Total Amount : Rs. ${order.total_amount?.toLocaleString() || 0}`);
            lines.push(`  Delivery Fee : Rs. ${order.delivery_charge || 0}`);
            lines.push(`  Placed On    : ${date}`);
            if (order.customer_name) lines.push(`  Customer     : ${order.customer_name}`);
            if (order.phone_number) lines.push(`  Phone        : ${order.phone_number}`);
            if (order.address) lines.push(`  Address      : ${order.address}`);
            if (order.items && order.items.length > 0) {
                lines.push(`  Items:`);
                order.items.forEach((item: any) => {
                    lines.push(`    - ${item.product_name} × ${item.qty} = Rs. ${item.total_amount?.toLocaleString() || 0}`);
                });
            }
            lines.push('');
        });

        lines.push('=== END ORDER HISTORY ===');
        return lines.join('\n');
    }

    /**
     * Build the final composed system prompt for the AI.
     * Priority: Post/Ad instructions → Page instructions → Order context
     */
    async buildSystemPrompt(params: {
        pagePrompt: string;
        customerId: string;
        referralPostId?: string;
        customerMessage: string;
    }): Promise<string> {
        const { pagePrompt, customerId, referralPostId, customerMessage } = params;

        const sections: string[] = [];

        // ─── Layer 1: Base page instructions (always present) ─────────────────────
        const basePage = pagePrompt?.trim() || 'You are a helpful customer support assistant.';
        sections.push('=== PAGE INSTRUCTIONS ===');
        sections.push(basePage);
        sections.push('');

        // ─── Layer 2: Post/Ad specific instructions (highest priority) ─────────────
        if (referralPostId) {
            try {
                const postConfig = await supabaseService.getPostConfigByPostId(referralPostId);
                if (postConfig && postConfig.ai_instructions) {
                    sections.push('=== POST/AD SPECIFIC INSTRUCTIONS (HIGHEST PRIORITY) ===');
                    sections.push(`The customer reached you by clicking "Send Message" on a specific Facebook post/ad.`);
                    if (postConfig.label) {
                        sections.push(`Post/Ad: ${postConfig.label}`);
                    }
                    sections.push('');
                    sections.push(postConfig.ai_instructions);
                    sections.push('');
                    sections.push('IMPORTANT: Treat the above Post/Ad instructions as the highest priority. If the customer asks about a product, assume it is the product from this post unless they specifically mention another product.');
                    sections.push('');
                }
            } catch (err: any) {
                console.error('[AIContext] Error fetching post config:', err.message);
            }
        }

        // ─── Layer 3: Customer order context (auto-injected) ─────────────────────
        // Always fetch orders but only prominently highlight if message is order-related
        try {
            const orders = await supabaseService.getOrdersByCustomerId(customerId);
            if (orders && orders.length > 0) {
                const orderContext = this.formatOrderContext(orders);
                sections.push(orderContext);
                sections.push('');

                if (this.isOrderRelated(customerMessage)) {
                    sections.push('NOTE: The customer appears to be asking about their order. Please refer to the order history above to provide an accurate, specific answer about their order status, items, or delivery.');
                    sections.push('');
                }
            }
        } catch (err: any) {
            console.error('[AIContext] Error fetching customer orders:', err.message);
        }

        // ─── Final instruction ─────────────────────────────────────────────────────
        sections.push('=== RESPONSE GUIDELINES ===');
        sections.push('- Always respond in the same language the customer used.');
        sections.push('- Be concise, friendly, and helpful.');
        sections.push('- Never reveal that you are an AI unless directly asked.');
        sections.push('- If you do not know the answer, politely ask the customer to wait or contact us directly.');

        return sections.join('\n');
    }
}

export const aiContextService = new AiContextService();
