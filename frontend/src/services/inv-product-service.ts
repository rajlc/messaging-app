import { getInvSupabaseClient } from '@/lib/inv-supabase';
import { getProductsAction, getProductByIdAction, updateProductAction, deleteProductAction } from '@/app/actions/inv-actions';

export interface ProductCombo {
    id?: string;
    parent_product_id?: string;
    child_product_id?: string;
    child_product_name?: string;
    quantity: number;
}

export interface Product {
    id: string;
    product_id: number;
    product_name: string;
    product_type?: 'single' | 'combo' | string;
    category_name?: string;
    daraz_category_name?: string;
    website_category_name?: string;
    selling_price?: number;
    wholesale_price?: number;
    quantity?: number;
    seller_sku1?: string;
    seller_sku2?: string;
    seller_sku3?: string;
    seller_sku4?: string;
    seller_account1?: string;
    seller_account2?: string;
    seller_account3?: string;
    seller_account4?: string;
    priority_seller_account?: string | null;
    sales_priority?: boolean;
    approval_status?: 'Pending' | 'Approved' | 'Rejected' | string;
    marketplace_sync_status?: 'Pending' | 'Done' | string;
    website_sync_status?: 'Pending' | 'Done' | string;
    status?: 'Active' | 'Inactive' | string;
    is_new_pushed?: boolean;
    pushed_at?: string;
    is_deleted?: boolean;
    images?: string[];
    image_url?: string;
    created_at?: string;
    updated_at?: string;
    product_combos?: ProductCombo[];
}

export interface GetProductsParams {
    page?: number;
    limit?: number;
    search?: string;
    productType?: 'single' | 'combo' | 'all';
    syncFilter?: 'all' | 'website_pending' | 'marketplace_pending' | 'variation_product';
}

export interface GetProductsResponse {
    products: Product[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
}

export async function getProducts(params: GetProductsParams = {}): Promise<GetProductsResponse> {
    return getProductsAction(params);
}

export async function createProduct(data: {
    product_name: string;
    image_url?: string;
    product_type: 'single' | 'combo';
    seller_sku1?: string;
    seller_account1?: string;
    seller_sku2?: string;
    seller_account2?: string;
    seller_sku3?: string;
    seller_account3?: string;
    seller_sku4?: string;
    seller_account4?: string;
    combo_items?: Array<{ child_product_id: string; quantity: number }>;
    sales_priority?: boolean;
    priority_seller_account?: string | null;
}) {
    const supabase = getInvSupabaseClient();

    if (!data.product_name || !data.product_name.trim()) {
        throw new Error('Product name is required');
    }

    if (data.product_type === 'combo' && (!data.combo_items || data.combo_items.length === 0)) {
        throw new Error('Combo products must have at least one component');
    }

    const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
            product_name: data.product_name.trim(),
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
            status: 'Active',
            is_deleted: false,
            approval_status: 'Approved',
            marketplace_sync_status: 'Pending',
            website_sync_status: 'Pending'
        })
        .select()
        .single();

    if (productError) throw new Error(productError.message);

    if (data.product_type === 'combo' && data.combo_items && data.combo_items.length > 0) {
        const comboInserts = data.combo_items.map((item) => ({
            parent_product_id: product.id,
            child_product_id: item.child_product_id,
            quantity: item.quantity,
        }));

        const { error: comboError } = await supabase
            .from('product_combos')
            .insert(comboInserts);

        if (comboError) {
            await supabase.from('products').delete().eq('id', product.id);
            throw new Error(`Failed to create combo items: ${comboError.message}`);
        }
    }

    return product;
}

export async function updateProduct(
    productId: string,
    data: any
) {
    return updateProductAction(productId, data);
}

export async function approveProduct(productId: string) {
    const supabase = getInvSupabaseClient();
    const { error } = await supabase
        .from('products')
        .update({
            approval_status: 'Approved',
            updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

    if (error) throw new Error(error.message);
}

export async function rejectProduct(productId: string) {
    const supabase = getInvSupabaseClient();
    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

    if (error) throw new Error(error.message);
}

export async function deleteProduct(productId: string) {
    return deleteProductAction(productId);
}

export async function updateSyncStatuses(
    productId: string,
    marketplaceSyncStatus: string,
    websiteSyncStatus: string
) {
    const supabase = getInvSupabaseClient();
    const { error } = await supabase
        .from('products')
        .update({
            marketplace_sync_status: marketplaceSyncStatus,
            website_sync_status: websiteSyncStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

    if (error) throw new Error(error.message);
}

export async function toggleProductStatus(productId: string, currentStatus: string) {
    const supabase = getInvSupabaseClient();
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

    const { error } = await supabase
        .from('products')
        .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
        })
        .eq('id', productId);

    if (error) throw new Error(error.message);
}

export async function exportProducts(filter: 'all' | 'marketplace_pending' | 'website_pending' = 'all') {
    const supabase = getInvSupabaseClient();

    let query = supabase
        .from('products')
        .select('product_id, product_name, seller_sku1, seller_sku2, selling_price, wholesale_price, quantity, category_name, marketplace_sync_status, website_sync_status, approval_status')
        .eq('is_deleted', false);

    if (filter === 'marketplace_pending') {
        query = query.eq('marketplace_sync_status', 'Pending');
    } else if (filter === 'website_pending') {
        query = query.eq('website_sync_status', 'Pending');
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getProductById(productId: string): Promise<Product> {
    return getProductByIdAction(productId);
}
