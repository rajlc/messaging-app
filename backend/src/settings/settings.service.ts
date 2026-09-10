import { Injectable } from '@nestjs/common';
import { supabaseService } from '../supabase/supabase.service';
import * as XLSX from 'xlsx';

@Injectable()
export class SettingsService {

    async getSetting(key: string): Promise<string | null> {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error) return null;
        return data?.value || null;
    }

    async setSetting(key: string, value: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('settings')
            .upsert({
                key,
                value,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getAllSettings() {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('settings')
            .select('*');

        if (error) throw error;
        return data.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
            }, {});
    }

    // --- Courier Settings ---

    async getCourierSettings(provider: string) {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('courier_api_settings')
            .select('*')
            .eq('provider', provider)
            .single();

        if (error) return null;
        return data;
    }

    async saveCourierSettings(payload: any) {
        // Ensure provider exists
        if (!payload.provider) throw new Error('Provider is required');

        const { data, error } = await supabaseService.getSupabaseClient()
            .from('courier_api_settings')
            .upsert({
                provider: payload.provider,
                base_url: payload.base_url || '',
                client_id: payload.client_id || '',
                client_secret: payload.client_secret || '',
                username: payload.username || '',
                password: payload.password || '',
                updated_at: new Date().toISOString()
            }, { onConflict: 'provider' })
            .select()
            .single();

        if (error) {
            throw error;
        }
        return data;
    }

    // --- Marketplace Products Catalog ---

    async getMarketplaceProducts() {
        const { data, error } = await supabaseService.getSupabaseClient()
            .from('marketplace_products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // Handle table not existing gracefully
            if (error.code === '42P01') {
                console.warn('[Supabase] marketplace_products table does not exist in Supabase.');
                return [];
            }
            throw error;
        }

        return (data || []).map((row: any) => {
            let resolvedName = row.product_name || row.title;
            let resolvedPrice = row.price;

            if ((!resolvedName || resolvedPrice === null || resolvedPrice === undefined) && row.profile_data) {
                const values = Object.values(row.profile_data);
                const found = values.find((v: any) => typeof v === 'object' && v !== null && (v.title || v.price !== undefined)) as any;
                if (found) {
                    if (!resolvedName && found.title) resolvedName = found.title;
                    if ((resolvedPrice === null || resolvedPrice === undefined) && found.price !== undefined) resolvedPrice = found.price;
                }
            }

            return {
                ...row,
                product_name: resolvedName || 'Unnamed Product',
                price: resolvedPrice !== null && resolvedPrice !== undefined ? resolvedPrice : 0,
            };
        });
    }

    async deleteMarketplaceProduct(id: string) {
        const { error } = await supabaseService.getSupabaseClient()
            .from('marketplace_products')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }

    async clearMarketplaceProducts() {
        const { error } = await supabaseService.getSupabaseClient()
            .from('marketplace_products')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            if (error.code === '42P01') {
                console.warn('[Supabase] marketplace_products table does not exist.');
                return true;
            }
            throw error;
        }
        return true;
    }

    async importMarketplaceProducts(buffer: Buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);
        if (!rawRows || rawRows.length === 0) {
            throw new Error('Spreadsheet is empty or could not be parsed.');
        }

        const productsToUpsert = rawRows.map(row => {
            const productNameKey = Object.keys(row).find(k => 
                k.toLowerCase().replace(/[\s_-]/g, '') === 'productname' || 
                k.toLowerCase().replace(/[\s_-]/g, '') === 'product' ||
                k.toLowerCase().replace(/[\s_-]/g, '') === 'name'
            );
            
            const priceKey = Object.keys(row).find(k => 
                k.toLowerCase().replace(/[\s_-]/g, '') === 'price' || 
                k.toLowerCase().replace(/[\s_-]/g, '') === 'rate' ||
                k.toLowerCase().replace(/[\s_-]/g, '') === 'cost' ||
                k.toLowerCase().replace(/[\s_-]/g, '') === 'amount'
            );

            if (!productNameKey) {
                throw new Error('Spreadsheet must contain a column named "Product Name" or "Product".');
            }
            if (!priceKey) {
                throw new Error('Spreadsheet must contain a column named "Price" or "Rate".');
            }

            const productName = String(row[productNameKey]).trim();
            const price = parseFloat(String(row[priceKey]).replace(/[^\d.]/g, ''));

            if (!productName) {
                throw new Error('Product Name column cannot have empty rows.');
            }
            if (isNaN(price)) {
                throw new Error(`Invalid price value for product "${productName}": ${row[priceKey]}`);
            }

            return {
                product_name: productName,
                price: price
            };
        });

        // Delete current products to perform a full overwrite
        await this.clearMarketplaceProducts();

        const { data, error } = await supabaseService.getSupabaseClient()
            .from('marketplace_products')
            .insert(productsToUpsert)
            .select();

        if (error) throw error;
        return data;
    }

    // ─── Page Post Configs (Per-post AI instructions) ────────────────────────────

    async getPostConfigsByPageId(pageId: string) {
        return supabaseService.getPostConfigsByPageId(pageId);
    }

    async createPostConfig(data: { pageId: string; postId: string; label?: string; aiInstructions: string }) {
        return supabaseService.createPostConfig(data);
    }

    async updatePostConfig(id: string, data: { label?: string; postId?: string; aiInstructions?: string; isActive?: boolean }) {
        return supabaseService.updatePostConfig(id, data);
    }

    async deletePostConfig(id: string) {
        return supabaseService.deletePostConfig(id);
    }

    // ─── Messages Retention & Auto-Deletion ───────────────────────────────────────

    async getMessageRetentionSettings() {
        const [autoDeleteEnabled, autoDeleteDays, fixedCutoffDate, lastCleanupAt] = await Promise.all([
            this.getSetting('msg_auto_delete_enabled'),
            this.getSetting('msg_auto_delete_days'),
            this.getSetting('msg_fixed_cutoff_date'),
            this.getSetting('msg_last_cleanup_at')
        ]);

        const { count } = await supabaseService.getSupabaseClient()
            .from('messages')
            .select('*', { count: 'exact', head: true });

        return {
            auto_delete_enabled: autoDeleteEnabled === 'true',
            auto_delete_days: autoDeleteDays ? parseInt(autoDeleteDays, 10) : 30,
            fixed_cutoff_date: fixedCutoffDate || null,
            last_cleanup_at: lastCleanupAt || null,
            total_messages: count || 0
        };
    }

    async saveMessageRetentionSettings(data: { auto_delete_enabled: boolean; auto_delete_days: number }) {
        await Promise.all([
            this.setSetting('msg_auto_delete_enabled', data.auto_delete_enabled ? 'true' : 'false'),
            this.setSetting('msg_auto_delete_days', (data.auto_delete_days || 30).toString())
        ]);

        let cleanupResult: any = null;
        if (data.auto_delete_enabled && data.auto_delete_days > 0) {
            cleanupResult = await this.cleanupMessagesByDays(data.auto_delete_days);
        }

        const currentSettings = await this.getMessageRetentionSettings();
        return {
            ...currentSettings,
            cleanupResult
        };
    }

    async cleanupMessagesByDays(days: number) {
        const cutoffMs = Date.now() - (days * 24 * 60 * 60 * 1000);
        const cutoffIso = new Date(cutoffMs).toISOString();

        console.log(`[Message Retention] Running rolling cleanup: deleting messages older than ${days} days (before ${cutoffIso})`);

        // Find how many messages match before deleting
        const { count: matchCount } = await supabaseService.getSupabaseClient()
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', cutoffIso);

        const { error } = await supabaseService.getSupabaseClient()
            .from('messages')
            .delete()
            .lt('created_at', cutoffIso);

        if (error) {
            console.error('[Message Retention] Error deleting messages by days:', error);
            throw error;
        }

        const nowIso = new Date().toISOString();
        await this.setSetting('msg_last_cleanup_at', nowIso);

        console.log(`[Message Retention] Successfully deleted ${matchCount || 0} messages before ${cutoffIso}`);
        return {
            success: true,
            deletedCount: matchCount || 0,
            cutoffIso,
            executedAt: nowIso
        };
    }

    async cleanupMessagesBeforeDate(dateStr: string) {
        // e.g. dateStr = "2026-08-05" -> delete everything strictly before 2026-08-05T00:00:00.000Z
        const cutoffIso = new Date(dateStr).toISOString();

        console.log(`[Message Retention] Running fixed date cleanup: deleting messages before ${cutoffIso}`);

        const { count: matchCount } = await supabaseService.getSupabaseClient()
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', cutoffIso);

        const { error } = await supabaseService.getSupabaseClient()
            .from('messages')
            .delete()
            .lt('created_at', cutoffIso);

        if (error) {
            console.error('[Message Retention] Error deleting messages before date:', error);
            throw error;
        }

        const nowIso = new Date().toISOString();
        await Promise.all([
            this.setSetting('msg_fixed_cutoff_date', dateStr),
            this.setSetting('msg_last_cleanup_at', nowIso)
        ]);

        console.log(`[Message Retention] Successfully deleted ${matchCount || 0} messages before ${cutoffIso}`);
        return {
            success: true,
            deletedCount: matchCount || 0,
            cutoffIso,
            cutoffDate: dateStr,
            executedAt: nowIso
        };
    }
}

