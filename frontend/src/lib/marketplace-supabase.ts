import { createClient } from '@supabase/supabase-js';

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

export interface ProductItem {
    id: string;
    description: string;
    category: string;
    condition: string;
    location: string;
    images: string[];
    profile_data: Record<string, {
        title: string;
        price: number | string;
        final_description?: string;
    }>;
    status_map: Record<string, 'pending' | 'completed'>;
    created_at?: string;
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
    const payload = {
        description: product.description || '',
        category: product.category || 'General',
        condition: product.condition || 'New',
        location: product.location || 'Kathmandu',
        images: product.images || [],
        profile_data: product.profile_data || {},
        status_map: product.status_map || {},
        updated_at: new Date().toISOString()
    };

    if (product.id && !product.id.startsWith('mp-temp')) {
        const { data, error } = await marketplaceSupabase
            .from('marketplace_products')
            .update(payload)
            .eq('id', product.id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as ProductItem;
    } else {
        const { data, error } = await marketplaceSupabase
            .from('marketplace_products')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as ProductItem;
    }
}

export async function deleteMarketplaceProduct(id: string): Promise<boolean> {
    const { error } = await marketplaceSupabase
        .from('marketplace_products')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
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
