'use server';

import { getInvSupabaseAdminClient } from '@/lib/inv-supabase';
import { GetProductsParams, GetProductsResponse, Product } from '@/services/inv-product-service';

export async function getProductsAction(params: GetProductsParams = {}): Promise<GetProductsResponse> {
    const { page = 1, limit = 50, search = '', productType = 'all', syncFilter = 'all' } = params;

    const supabase = getInvSupabaseAdminClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('products')
        .select('*, product_combos!product_combos_parent_product_id_fkey(id, child_product_id, quantity)', { count: 'exact' })
        .eq('is_deleted', false);

    if (productType !== 'all') {
        query = query.eq('product_type', productType);
    }

    if (syncFilter === 'website_pending') {
        query = query.eq('website_sync_status', 'Pending');
    } else if (syncFilter === 'marketplace_pending') {
        query = query.eq('marketplace_sync_status', 'Pending');
    } else if (syncFilter === 'variation_product') {
        const { data: combos } = await supabase
            .from('product_combos')
            .select('parent_product_id');

        const counts: Record<string, number> = {};
        combos?.forEach((c: any) => {
            if (c.parent_product_id) {
                counts[c.parent_product_id] = (counts[c.parent_product_id] || 0) + 1;
            }
        });
        const variationParentIds = Object.keys(counts).filter((id) => counts[id] === 1);

        if (variationParentIds.length > 0) {
            query = query.in('id', variationParentIds);
        } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
    }

    if (search.trim()) {
        const cleanSearch = search.trim();
        const searchNumber = parseInt(cleanSearch, 10);
        if (!isNaN(searchNumber)) {
            query = query.or(`product_name.ilike.%${cleanSearch}%,seller_sku1.ilike.%${cleanSearch}%,seller_sku2.ilike.%${cleanSearch}%,seller_sku3.ilike.%${cleanSearch}%,seller_sku4.ilike.%${cleanSearch}%,product_id.eq.${searchNumber}`);
        } else {
            query = query.or(`product_name.ilike.%${cleanSearch}%,seller_sku1.ilike.%${cleanSearch}%,seller_sku2.ilike.%${cleanSearch}%,seller_sku3.ilike.%${cleanSearch}%,seller_sku4.ilike.%${cleanSearch}%`);
        }
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data: products, count, error } = await query;
    if (error) throw new Error(error.message);

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
        products: (products as Product[]) || [],
        totalCount,
        page,
        limit,
        totalPages,
    };
}

export async function getProductByIdAction(productId: string): Promise<Product> {
    const supabase = getInvSupabaseAdminClient();

    const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('is_deleted', false)
        .single();

    if (productError) throw new Error(productError.message);
    if (!product) throw new Error('Product not found');

    let comboItems: any[] = [];
    if (product.product_type === 'combo') {
        const { data: combos, error: comboError } = await supabase
            .from('product_combos')
            .select(`
                id,
                quantity,
                child:products!product_combos_child_product_id_fkey(
                    id,
                    product_id,
                    product_name,
                    seller_sku1
                )
            `)
            .eq('parent_product_id', productId);

        if (!comboError && combos) {
            comboItems = combos;
        }
    }

    return {
        ...product,
        product_combos: comboItems,
        combo_items: comboItems,
    };
}

export async function updateProductAction(productId: string, data: any) {
    const supabase = getInvSupabaseAdminClient();

    const { error: updateError } = await supabase
        .from('products')
        .update({
            product_name: data.product_name,
            image_url: data.image_url || null,
            product_type: data.product_type,
            seller_sku1: data.seller_sku1 || null,
            seller_account1: data.seller_account1 || null,
            seller_sku2: data.seller_sku2 || null,
            seller_account2: data.seller_account2 || null,
            seller_sku3: data.seller_sku3 || null,
            seller_account3: data.seller_account3 || null,
            seller_sku4: data.seller_sku4 || null,
            seller_account4: data.seller_account4 || null,
            sales_priority: data.sales_priority ?? false,
            priority_seller_account: data.priority_seller_account || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

    if (updateError) throw new Error(updateError.message);

    if (data.product_type === 'combo') {
        // Delete existing combo items for this parent product
        await supabase.from('product_combos').delete().eq('parent_product_id', productId);

        if (data.combo_items && data.combo_items.length > 0) {
            const comboInserts = data.combo_items.map((item: any) => ({
                parent_product_id: productId,
                child_product_id: item.child_product_id,
                quantity: item.quantity,
            }));

            const { error: comboError } = await supabase.from('product_combos').insert(comboInserts);
            if (comboError) throw new Error(`Failed to update combo components: ${comboError.message}`);
        }
    }
}

export async function deleteProductAction(productId: string) {
    const supabase = getInvSupabaseAdminClient();
    const { error } = await supabase
        .from('products')
        .update({
            is_deleted: true,
            status: 'Inactive',
            updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

    if (error) throw new Error(error.message);
}
