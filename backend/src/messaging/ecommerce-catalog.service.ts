import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SettingsService } from '../settings/settings.service';

export interface EcommerceProductMatch {
    id: string;
    name: string;
    slug: string;
    price: number;
    category?: string;
    description?: string;
    url: string;
    images?: string[];
}

@Injectable()
export class EcommerceCatalogService {
    private readonly logger = new Logger(EcommerceCatalogService.name);
    private cachedClient: SupabaseClient | null = null;
    private cachedUrl: string | null = null;
    private cachedKey: string | null = null;

    // Default configuration from the Ecommerce-Website project
    private readonly DEFAULT_WEBSITE_URL = 'https://www.bagmati.shop';
    private readonly DEFAULT_SUPABASE_URL = 'https://cukcxhvfgzaayjypykny.supabase.co';
    private readonly DEFAULT_SUPABASE_KEY =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1a2N4aHZmZ3phYXlqeXB5a255Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYyNTk0MCwiZXhwIjoyMDk0MjAxOTQwfQ.Rm4kJ88_hn5VkN09_EolseHMHT9lqeuTYlEGORDeZG8';

    constructor(private readonly settingsService: SettingsService) { }

    /**
     * Get e-commerce configuration (Website Base URL, Supabase URL, Key)
     */
    async getConfig(): Promise<{ websiteUrl: string; supabaseUrl: string; supabaseKey: string }> {
        const websiteUrl = (await this.settingsService.getSetting('ECOMMERCE_WEBSITE_URL')) || this.DEFAULT_WEBSITE_URL;
        const supabaseUrl = (await this.settingsService.getSetting('ECOMMERCE_SUPABASE_URL')) || this.DEFAULT_SUPABASE_URL;
        const supabaseKey = (await this.settingsService.getSetting('ECOMMERCE_SUPABASE_KEY')) || this.DEFAULT_SUPABASE_KEY;

        const cleanWebsiteUrl = websiteUrl.trim().replace(/\/+$/, '');
        return {
            websiteUrl: cleanWebsiteUrl,
            supabaseUrl: supabaseUrl.trim(),
            supabaseKey: supabaseKey.trim()
        };
    }

    /**
     * Get or create Supabase client for Ecommerce DB
     */
    private async getClient(): Promise<{ client: SupabaseClient; websiteUrl: string }> {
        const { websiteUrl, supabaseUrl, supabaseKey } = await this.getConfig();

        if (!this.cachedClient || this.cachedUrl !== supabaseUrl || this.cachedKey !== supabaseKey) {
            this.cachedClient = createClient(supabaseUrl, supabaseKey, {
                auth: { persistSession: false }
            });
            this.cachedUrl = supabaseUrl;
            this.cachedKey = supabaseKey;
        }

        return { client: this.cachedClient, websiteUrl };
    }

    /**
     * Test connection to the e-commerce database
     */
    async testConnection(): Promise<{ success: boolean; message: string; sampleProducts?: any[]; count?: number }> {
        try {
            const { client, websiteUrl } = await this.getClient();
            const { data, error, count } = await client
                .from('ecommerce_products')
                .select('id, display_name, slug, price, category, images, description', { count: 'exact' })
                .limit(4);

            if (error) {
                return { success: false, message: `Database error: ${error.message}` };
            }

            const formatted = (data || []).map(p => ({
                id: p.id,
                name: p.display_name,
                slug: p.slug,
                price: Number(p.price) || 0,
                category: p.category,
                url: `${websiteUrl}/products/${p.slug}`,
                image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null
            }));

            return {
                success: true,
                message: `Successfully connected to E-commerce website database (${websiteUrl})! Found ${count ?? data?.length ?? 0} active products.`,
                sampleProducts: formatted,
                count: count ?? data?.length ?? 0
            };
        } catch (err: any) {
            this.logger.error(`testConnection failed: ${err.message}`);
            return { success: false, message: `Connection failed: ${err.message}` };
        }
    }

    /**
     * Extract relevant search keywords from customer inquiry
     */
    private extractKeywords(text: string): string[] {
        if (!text) return [];

        // Words to filter out (Nepali & English filler words, conversational greetings, price inquiry words)
        const stopWords = new Set([
            'hajur', 'namaste', 'hello', 'hi', 'bhai', 'dai', 'bro', 'sir', 'madam',
            'kati', 'ho', 'ko', 'price', 'rate', 'cost', 'kasto', 'cha', 'chaina', 'chha',
            'chahiyo', 'chahiye', 'aauxa', 'milcha', 'mildaina', 'huncha', 'discount',
            'delivery', 'photo', 'picture', 'link', 'website', 'online', 'details', 'detail',
            'what', 'is', 'the', 'of', 'for', 'in', 'and', 'or', 'a', 'an', 'please', 'tell',
            'me', 'show', 'send', 'specs', 'specification', 'features', 'available'
        ]);

        const rawTokens = text
            .toLowerCase()
            .replace(/[^\w\s\u0900-\u097F]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length >= 2 && !stopWords.has(token) && isNaN(Number(token)));

        return Array.from(new Set(rawTokens));
    }

    /**
     * Search products matching the customer query
     */
    async searchProducts(query: string, limit = 5): Promise<{ websiteUrl: string; products: EcommerceProductMatch[] }> {
        try {
            const { client, websiteUrl } = await this.getClient();
            const keywords = this.extractKeywords(query);

            if (keywords.length === 0) {
                return { websiteUrl, products: [] };
            }

            // Build search conditions: try matching any of the identified keywords
            let req = client
                .from('ecommerce_products')
                .select('id, display_name, slug, price, category, description, images');

            const orConditions: string[] = [];
            for (const kw of keywords) {
                orConditions.push(`display_name.ilike.%${kw}%`);
                orConditions.push(`slug.ilike.%${kw}%`);
            }

            req = req.or(orConditions.join(','));

            const { data, error } = await req.limit(limit);

            if (error) {
                this.logger.warn(`Search error: ${error.message}`);
                return { websiteUrl, products: [] };
            }

            const products: EcommerceProductMatch[] = (data || []).map(item => ({
                id: item.id,
                name: item.display_name,
                slug: item.slug,
                price: Number(item.price) || 0,
                category: item.category,
                description: item.description ? item.description.replace(/<[^>]+>/g, ' ').slice(0, 300).trim() : '',
                url: `${websiteUrl}/products/${item.slug}`,
                images: item.images || []
            }));

            return { websiteUrl, products };
        } catch (err: any) {
            this.logger.error(`Error searching ecommerce products: ${err.message}`);
            return { websiteUrl: this.DEFAULT_WEBSITE_URL, products: [] };
        }
    }
}
