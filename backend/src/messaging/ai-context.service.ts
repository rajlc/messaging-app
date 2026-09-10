import { supabaseService } from '../supabase/supabase.service';
import { EcommerceCatalogService } from './ecommerce-catalog.service';
import { SettingsService } from '../settings/settings.service';

const settingsService = new SettingsService();
const ecommerceCatalogService = new EcommerceCatalogService(settingsService);

/**
 * AI Context Service
 * Composes a multi-layer system prompt for every customer message:
 *   1. Page-level instructions (always included as base)
 *   2. Post/Ad-level instructions (highest priority — if customer came via a post/ad)
 *   3. Live E-commerce Website Catalog (when page has "AI For Ecommerce" enabled)
 *   4. Customer order context (auto-injected when customer has orders)
 *   5. Conversation memory & continuity rules
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
            '=== CUSTOMER ORDER HISTORY (DATABASE) ===',
            'The customer has the following recorded order(s) in our system database. Use this data to answer questions about their orders accurately.',
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
                    const name = item.product_name || item.name || item.title || 'Product';
                    const qty = item.qty || item.quantity || 1;
                    const price = item.total_amount || item.price || item.unit_price || 0;
                    lines.push(`    - ${name} × ${qty} = Rs. ${Number(price).toLocaleString()}`);
                });
            }
            lines.push('');
        });

        lines.push('=== END ORDER HISTORY ===');
        return lines.join('\n');
    }

    /**
     * Build the final composed system prompt for the AI.
     * Priority: Post/Ad instructions → Page instructions → Ecommerce Catalog (if enabled) → Order context + Memory rules
     */
    async buildSystemPrompt(params: {
        pagePrompt: string;
        customerId: string;
        conversationId?: string;
        referralPostId?: string;
        customerMessage: string;
        isEcommerceAiEnabled?: boolean;
    }): Promise<string> {
        const { pagePrompt, customerId, conversationId, referralPostId, customerMessage, isEcommerceAiEnabled } = params;

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

        // ─── Layer 3: Live E-commerce Website Catalog (when enabled for this page) ───
        if (isEcommerceAiEnabled) {
            try {
                const { websiteUrl, products } = await ecommerceCatalogService.searchProducts(customerMessage);
                if (products && products.length > 0) {
                    sections.push('=== LIVE E-COMMERCE PRODUCT CATALOG (DATABASE VERIFIED) ===');
                    sections.push(`Our Store Website: ${websiteUrl}`);
                    sections.push('The following real-time products were matched from our website inventory for the customer inquiry:');
                    sections.push('');

                    products.forEach((prod, idx) => {
                        sections.push(`Product ${idx + 1}:`);
                        sections.push(`  - Name        : ${prod.name}`);
                        sections.push(`  - Exact Price : Rs. ${prod.price.toLocaleString()}`);
                        sections.push(`  - Website Link: ${prod.url}`);
                        if (prod.category) sections.push(`  - Category    : ${prod.category}`);
                        if (prod.description) sections.push(`  - Details/Spec: ${prod.description}`);
                        sections.push('');
                    });

                    sections.push('=== STRICT E-COMMERCE INSTRUCTIONS ===');
                    sections.push('1. EXACT PRICE GUARANTEE: Quote the exact price from the database above (e.g., "Rs. 1,200"). NEVER guess, estimate, or make up a price.');
                    sections.push('2. MULTIPLE MATCHES HANDLING: If the customer asked about a general product (like "blender", "cctv", "toy") and multiple options are listed above, list all the available models with their names and prices, and politely ask the customer which specific model they would like.');
                    sections.push('3. PRODUCT SPECS & INQUIRIES: When the customer asks about features, warranty, usage, or specifications, use the Details/Spec provided above to give an accurate, helpful answer.');
                    sections.push('4. SEND PRODUCT LINK: Always provide the direct Website Link so the customer can view more photos, read full details, or order directly on our website.');
                    sections.push('5. PRICE FIXED: If customer tries to bargain or ask for discounts, politely explain that prices are fixed and affordable.');
                    sections.push('6. UNAVAILABLE PRODUCTS: If customer asks for an item not found in the catalog, politely say that this item is currently unavailable in our store.');
                    sections.push('');
                }
            } catch (catalogErr: any) {
                console.error('[AIContext] Error fetching ecommerce catalog:', catalogErr.message);
            }
        }

        // ─── Layer 4: Customer order context (auto-injected from DB) ──────────────
        // Fetch orders using both customerId and conversationId
        try {
            const orders = await supabaseService.getOrdersByCustomerId(customerId, conversationId);
            if (orders && orders.length > 0) {
                const orderContext = this.formatOrderContext(orders);
                sections.push(orderContext);
                sections.push('');

                if (this.isOrderRelated(customerMessage)) {
                    sections.push('NOTE: The customer is asking about their order. Refer directly to the CUSTOMER ORDER HISTORY above to give specific details regarding their order number, items, price, or delivery status.');
                    sections.push('');
                }
            }
        } catch (err: any) {
            console.error('[AIContext] Error fetching customer orders:', err.message);
        }

        // ─── Layer 4: Conversation Memory & Order Continuity Rules (CRITICAL) ─────
        sections.push('=== CONVERSATION MEMORY & CONTINUITY RULES (CRITICAL) ===');
        sections.push('1. READ PRIOR CHAT HISTORY: You have access to previous chat messages in this conversation. Always examine earlier user and agent messages carefully.');
        sections.push('2. NEVER ASK FOR DETAILS ALREADY PROVIDED:');
        sections.push('   - If the customer already provided their phone number, delivery address, city, or product choice earlier in this conversation, NEVER ask them for it again!');
        sections.push('   - If the customer asks "what is my order?" or "mero saman k ho?", check the previous messages: find the product they asked for, their phone number, and address that was discussed.');
        sections.push('3. ORDER STATUS & DELIVERY QUESTIONS:');
        sections.push('   - If the order exists in the CUSTOMER ORDER HISTORY table above, quote the exact order number, items, and status.');
        sections.push('   - If the order was just discussed and confirmed in the chat history, reassure the customer with the product name and details they agreed to (e.g. "Hajur, tapai ko [Product Name] ko order confirm bhayeko xa. Voli/2-3 din bhitra delivery hunecha.").');
        sections.push('   - Never claim you do not know their order or product if they already mentioned or confirmed it earlier in the chat.');
        sections.push('4. PRODUCT IN CONTEXT: Keep the conversation centered on the product the customer inquired about or came from, unless they specifically ask for another item.');
        sections.push('');

        // ─── Final instruction ─────────────────────────────────────────────────────
        sections.push('=== RESPONSE GUIDELINES ===');
        sections.push('- Always respond in the same language the customer used (Nepali, Roman Nepali, or English).');
        sections.push('- Be concise, polite, natural, and helpful.');
        sections.push('- Never reveal that you are an AI unless directly asked.');
        sections.push('- If customer has placed an order or given details, confirm them warmly.');

        return sections.join('\n');
    }
}

export const aiContextService = new AiContextService();
