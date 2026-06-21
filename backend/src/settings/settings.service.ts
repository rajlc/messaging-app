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
            .order('product_name', { ascending: true });

        if (error) {
            // Handle table not existing gracefully
            if (error.code === '42P01') {
                console.warn('[Supabase] marketplace_products table does not exist in Supabase.');
                return [];
            }
            throw error;
        }
        return data || [];
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
}
