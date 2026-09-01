import { createClient } from '@supabase/supabase-js';
import { getInvSupabaseClient } from '@/lib/inv-supabase';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jrcluodakvudjkwlrrxi.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyY2x1b2Rha3Z1ZGprd2xycnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODQ3NzgsImV4cCI6MjA4NDc2MDc3OH0.XtZdrmmG1YUAj22GPCZB0E48TtY-CdPlmdIGZYECk0s';

export const marketplaceSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface MarketplaceProfile {
    id: string;
    name: string;
    last_description?: string;
}

export interface MarketplaceCategory {
    id: string;
    name: string;
}

export interface MarketplaceLocation {
    id: string;
    name: string;
}

export interface ImageFolderSetting {
    folder_path: string;
    auto_clean: boolean;
}

export interface ProductItem {
    id: string;
    inventory_id?: string | null;
    description: string;
    category: string;
    condition: string;
    location: string;
    images: string[];
    profile_data: Record<string, any>;
    status_map: Record<string, 'pending' | 'completed'>;
    created_at?: string;
}

export interface InventoryProductRef {
    id: string;
    product_id: number;
    product_name: string;
    special_price?: number;
    regular_price?: number;
    image_url?: string;
    other_images?: string[];
    category_name?: string;
    marketplace_category?: string;
    description?: string;
    marketplace_sync_status?: string;
}

/* ─────────────────── SETTINGS API ─────────────────── */

export async function fetchMarketplaceSettings(): Promise<{
    profiles: MarketplaceProfile[];
    categories: MarketplaceCategory[];
    locations: MarketplaceLocation[];
}> {
    try {
        const [profRes, catRes, locRes] = await Promise.all([
            marketplaceSupabase.from('marketplace_profiles').select('*').order('created_at', { ascending: true }),
            marketplaceSupabase.from('marketplace_categories').select('*').order('name', { ascending: true }),
            marketplaceSupabase.from('marketplace_locations').select('*').order('name', { ascending: true }),
        ]);

        let profiles = (profRes.data || []) as MarketplaceProfile[];
        let categories = (catRes.data || []) as MarketplaceCategory[];
        let locations = (locRes.data || []) as MarketplaceLocation[];

        // If profiles is empty, ensure at least 'Default' exists
        if (profiles.length === 0) {
            const { data } = await marketplaceSupabase.from('marketplace_profiles').insert({
                name: 'Default',
                last_description: ''
            }).select();
            if (data && data.length > 0) {
                profiles = data as MarketplaceProfile[];
            } else {
                profiles = [{ id: 'default', name: 'Default', last_description: '' }];
            }
        }

        return { profiles, categories, locations };
    } catch (e) {
        console.error('[Marketplace Supabase] Error fetching settings:', e);
        return {
            profiles: [{ id: 'default', name: 'Default', last_description: '' }],
            categories: [],
            locations: [{ id: 'loc-1', name: 'Kathmandu' }]
        };
    }
}

export async function addMarketplaceProfile(name: string, last_description: string = ''): Promise<MarketplaceProfile | null> {
    const { data, error } = await marketplaceSupabase
        .from('marketplace_profiles')
        .insert({ name: name.trim(), last_description: last_description.trim() })
        .select()
        .single();

    if (error) {
        console.error('[Marketplace Supabase] Add profile error:', error);
        throw new Error(error.message);
    }
    return data as MarketplaceProfile;
}

export async function updateMarketplaceProfile(id: string, name: string, last_description: string = ''): Promise<boolean> {
    const { error } = await marketplaceSupabase
        .from('marketplace_profiles')
        .update({
            name: name.trim(),
            last_description: last_description.trim(),
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        console.error('[Marketplace Supabase] Update profile error:', error);
        throw new Error(error.message);
    }
    return true;
}

export async function deleteMarketplaceProfile(id: string): Promise<boolean> {
    const { error } = await marketplaceSupabase
        .from('marketplace_profiles')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[Marketplace Supabase] Delete profile error:', error);
        throw new Error(error.message);
    }
    return true;
}

export async function addMarketplaceCategory(name: string): Promise<MarketplaceCategory | null> {
    const { data, error } = await marketplaceSupabase
        .from('marketplace_categories')
        .insert({ name: name.trim() })
        .select()
        .single();

    if (error) {
        console.error('[Marketplace Supabase] Add category error:', error);
        throw new Error(error.message);
    }
    return data as MarketplaceCategory;
}

export async function deleteMarketplaceCategory(id: string): Promise<boolean> {
    const { error } = await marketplaceSupabase
        .from('marketplace_categories')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[Marketplace Supabase] Delete category error:', error);
        throw new Error(error.message);
    }
    return true;
}

export async function addMarketplaceLocation(name: string): Promise<MarketplaceLocation | null> {
    const { data, error } = await marketplaceSupabase
        .from('marketplace_locations')
        .insert({ name: name.trim() })
        .select()
        .single();

    if (error) {
        console.error('[Marketplace Supabase] Add location error:', error);
        throw new Error(error.message);
    }
    return data as MarketplaceLocation;
}

export async function deleteMarketplaceLocation(id: string): Promise<boolean> {
    const { error } = await marketplaceSupabase
        .from('marketplace_locations')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[Marketplace Supabase] Delete location error:', error);
        throw new Error(error.message);
    }
    return true;
}

export async function fetchImageFolderSetting(): Promise<ImageFolderSetting> {
    try {
        const { data, error } = await marketplaceSupabase
            .from('settings')
            .select('value')
            .eq('key', 'MARKETPLACE_IMAGE_FOLDER')
            .maybeSingle();

        if (data && data.value) {
            return JSON.parse(data.value);
        }
    } catch (e) {
        console.error('[Marketplace Supabase] Error loading image folder setting:', e);
    }
    return {
        folder_path: 'C:\\Users\\Bagmati Traders\\Downloads\\Marketplace_Images',
        auto_clean: true
    };
}

export async function saveImageFolderSetting(setting: ImageFolderSetting): Promise<boolean> {
    const { error } = await marketplaceSupabase
        .from('settings')
        .upsert({
            key: 'MARKETPLACE_IMAGE_FOLDER',
            value: JSON.stringify(setting),
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

    if (error) {
        console.error('[Marketplace Supabase] Save image folder error:', error);
        throw new Error(error.message);
    }
    return true;
}

/* ─────────────────── INVENTORY INTEGRATION API ─────────────────── */

export async function searchInventoryProducts(query: string): Promise<InventoryProductRef[]> {
    try {
        const invSupabase = getInvSupabaseClient();
        let req = invSupabase
            .from('products')
            .select('id, product_id, product_name, special_price, regular_price, image_url, other_images, category_name, marketplace_category, description, marketplace_sync_status')
            .eq('is_deleted', false);

        if (query && query.trim()) {
            const clean = query.trim();
            if (!isNaN(Number(clean))) {
                req = req.or(`product_name.ilike.%${clean}%,product_id.eq.${clean}`);
            } else {
                req = req.ilike('product_name', `%${clean}%`);
            }
        }

        const { data, error } = await req.order('created_at', { ascending: false }).limit(30);
        if (error) {
            console.error('[Marketplace Supabase] searchInventoryProducts error:', error);
            return [];
        }
        return (data || []) as InventoryProductRef[];
    } catch (e) {
        console.error('[Marketplace Supabase] searchInventoryProducts exception:', e);
        return [];
    }
}

export async function fetchListedInventoryIds(): Promise<Set<string>> {
    try {
        const { data, error } = await marketplaceSupabase
            .from('marketplace_products')
            .select('*');

        if (error) {
            console.error('[Marketplace Supabase] fetchListedInventoryIds error:', error);
            return new Set();
        }

        const idSet = new Set<string>();
        (data || []).forEach((row: any) => {
            const invId = row.inventory_id || row.profile_data?._inventory_id;
            if (invId) {
                idSet.add(String(invId).trim());
            }
        });
        return idSet;
    } catch (e) {
        console.error('[Marketplace Supabase] fetchListedInventoryIds exception:', e);
        return new Set();
    }
}

export async function fetchPendingInventoryProducts(): Promise<InventoryProductRef[]> {
    try {
        const invSupabase = getInvSupabaseClient();
        const listedIds = await fetchListedInventoryIds();

        const { data, error } = await invSupabase
            .from('products')
            .select('id, product_id, product_name, special_price, regular_price, image_url, other_images, category_name, marketplace_category, description, marketplace_sync_status')
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) {
            console.error('[Marketplace Supabase] fetchPendingInventoryProducts error:', error);
            return [];
        }

        const pending = (data || []).filter((item: any) => {
            const idMatch = listedIds.has(String(item.id).trim());
            const numMatch = item.product_id ? listedIds.has(String(item.product_id).trim()) : false;
            return !idMatch && !numMatch;
        });

        return pending as InventoryProductRef[];
    } catch (e) {
        console.error('[Marketplace Supabase] fetchPendingInventoryProducts exception:', e);
        return [];
    }
}

export async function updateInventoryMarketplaceStatus(inventoryId: string | number, status: 'Done' | 'Pending'): Promise<boolean> {
    try {
        const invSupabase = getInvSupabaseClient();
        let query = invSupabase.from('products').update({ marketplace_sync_status: status });
        const cleanStr = String(inventoryId).trim();

        if (!isNaN(Number(cleanStr))) {
            query = query.eq('product_id', Number(cleanStr));
        } else {
            query = query.eq('id', cleanStr);
        }

        const { error } = await query;
        if (error) console.error('[Marketplace Supabase] updateInventoryMarketplaceStatus error:', error);
        return !error;
    } catch (e) {
        console.error('[Marketplace Supabase] updateInventoryMarketplaceStatus exception:', e);
        return false;
    }
}

/* ─────────────────── PRODUCTS API ─────────────────── */

export async function fetchMarketplaceProducts(): Promise<ProductItem[]> {
    try {
        const { data, error } = await marketplaceSupabase
            .from('marketplace_products')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[Marketplace Supabase] fetchProducts error:', error);
            return [];
        }
        return (data || []).map((row: any) => ({
            id: row.id,
            inventory_id: row.inventory_id || row.profile_data?._inventory_id || null,
            description: row.description || '',
            category: row.category || 'General',
            condition: row.condition || 'New',
            location: row.location || 'Kathmandu',
            images: Array.isArray(row.images) ? row.images : [],
            profile_data: row.profile_data || {},
            status_map: row.status_map || {},
            created_at: row.created_at,
        })) as ProductItem[];
    } catch (e) {
        console.error('[Marketplace Supabase] fetchProducts exception:', e);
        return [];
    }
}

export async function saveMarketplaceProduct(product: Partial<ProductItem>): Promise<ProductItem> {
    const profileData = { ...(product.profile_data || {}) };
    if (product.inventory_id) {
        profileData._inventory_id = String(product.inventory_id);
    }

    const payload: any = {
        description: product.description || '',
        category: product.category || 'General',
        condition: product.condition || 'New',
        location: product.location || 'Kathmandu',
        images: product.images || [],
        profile_data: profileData,
        status_map: product.status_map || {},
        updated_at: new Date().toISOString()
    };

    let savedItem: ProductItem;

    if (product.id && !product.id.startsWith('mp-temp')) {
        const { data, error } = await marketplaceSupabase
            .from('marketplace_products')
            .update(payload)
            .eq('id', product.id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        savedItem = {
            ...data,
            inventory_id: data.inventory_id || data.profile_data?._inventory_id || null
        } as ProductItem;
    } else {
        const { data, error } = await marketplaceSupabase
            .from('marketplace_products')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        savedItem = {
            ...data,
            inventory_id: data.inventory_id || data.profile_data?._inventory_id || null
        } as ProductItem;
    }

    // Auto update inventory status to Done if linked
    if (product.inventory_id) {
        await updateInventoryMarketplaceStatus(product.inventory_id, 'Done');
    }

    return savedItem;
}

export async function deleteMarketplaceProduct(id: string): Promise<boolean> {
    // 1. Check if the product was linked to an inventory item
    let invId: string | null = null;
    try {
        const { data: existing } = await marketplaceSupabase
            .from('marketplace_products')
            .select('id, profile_data')
            .eq('id', id)
            .maybeSingle();

        if (existing?.profile_data?._inventory_id) {
            invId = existing.profile_data._inventory_id;
        }
    } catch (_) {}

    // 2. Delete the marketplace product
    const { error } = await marketplaceSupabase
        .from('marketplace_products')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);

    // 3. Revert inventory marketplace_sync_status to Pending
    if (invId) {
        await updateInventoryMarketplaceStatus(invId, 'Pending');
    }

    return true;
}

export async function batchUpdateProductStatus(productIds: string[], targetProfile: string, status: 'completed' | 'pending', allProfiles: MarketplaceProfile[]): Promise<boolean> {
    const { data: rows, error: fetchErr } = await marketplaceSupabase
        .from('marketplace_products')
        .select('id, status_map')
        .in('id', productIds);

    if (fetchErr || !rows) throw new Error(fetchErr?.message || 'Failed to fetch products');

    for (const row of rows) {
        const nextMap = { ...(row.status_map || {}) };
        if (targetProfile === 'all') {
            allProfiles.forEach(p => { nextMap[p.name] = status; });
        } else {
            nextMap[targetProfile] = status;
        }

        await marketplaceSupabase
            .from('marketplace_products')
            .update({ status_map: nextMap, updated_at: new Date().toISOString() })
            .eq('id', row.id);
    }

    return true;
}
